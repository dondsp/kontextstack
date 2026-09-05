import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { disposableMysql } from './support/mysql.js';
import { readPlan, migrateLocal, assertLocalTarget } from '../modules/mysql-storage/files/.kontextstack/modules/mysql-storage/kit/templates/migrations.mjs';
import { createMysqlStore } from '../modules/mysql-storage/files/.kontextstack/modules/mysql-storage/kit/templates/mysql-store.mjs';
import { createLocalAuth, hashPassword, verifyPassword } from '../modules/auth-local/files/.kontextstack/modules/auth-local/kit/templates/local-auth.mjs';
import { createMemoryStore } from '../modules/auth-local/files/.kontextstack/modules/auth-local/kit/fixtures/memory-store.mjs';
import { createGoogleAuth } from '../modules/auth-google/files/.kontextstack/modules/auth-google/kit/templates/google-auth.mjs';
const migrations = new URL('../modules/mysql-storage/files/.kontextstack/modules/mysql-storage/kit/templates/migrations/', import.meta.url).pathname;
const localConfig = { mode:'test',host:'127.0.0.1',port:3306,database:'fixture_auth',user:'root' };
const origin = 'https://app.example.com';
const context = {origin,clientKey:'synthetic-loopback',fetchSite:'same-origin'};
const pass = () => randomBytes(24).toString('hex');

async function exercise(store) {
  let clock=Date.now();
  const auth=await createLocalAuth({store,mode:'test',origin,registration:'open',now:()=>clock,idleMs:2000,absoluteMs:6000});
  const password=pass();
  const owner=await auth.bootstrap({email:'owner@example.com',password},'create-first-administrator');
  await assert.rejects(auth.bootstrap({email:'second@example.com',password},'create-first-administrator'),/bootstrap_used/);
  const user=await auth.register(context,{email:'user@example.com',password,role:'admin'});
  assert.equal(user.role,'user');
  const login=await auth.login(context,{email:'user@example.com',password});
  assert.match(login.cookie,/__Host-session=.*HttpOnly.*SameSite=Lax.*Secure/);
  assert.deepEqual(await auth.authenticate(login.token),user);
  await assert.rejects(auth.authorize(login.token,'users:manage'),/forbidden/);
  await assert.rejects(auth.authorize(login.token,'self:read',owner.id),/forbidden/);
  assert.equal((await auth.authorize(login.token,'self:read',user.id)).id,user.id);
  await assert.rejects(auth.logout({...context,...login,csrf:'wrong'}),/csrf_denied/);
  await assert.rejects(auth.logout({...context,...login,origin:'https://wrong.example.com'}),/origin_denied/);
  const rotated=await auth.login({...context,token:login.token},{email:'user@example.com',password});
  await assert.rejects(auth.authenticate(login.token),/unauthorized/);
  await auth.logout({...context,...rotated});
  await assert.rejects(auth.authenticate(rotated.token),/unauthorized/);
  const expiring=await auth.login(context,{email:'user@example.com',password});clock+=2001;
  await assert.rejects(auth.authenticate(expiring.token),/unauthorized/);
  const admin=await auth.login(context,{email:'owner@example.com',password});
  await assert.rejects(auth.updateUser({...context,...admin},owner.id,{status:'disabled'}),/last_admin/);
  const revoked=await auth.login(context,{email:'user@example.com',password});
  await auth.updateUser({...context,...admin},user.id,{status:'disabled'});
  await assert.rejects(auth.authenticate(revoked.token),/unauthorized/);
  await assert.rejects(auth.login(context,{email:'user@example.com',password}),/invalid_credentials/);
  await assert.rejects(auth.login(context,{email:'absent@example.com',password}),/invalid_credentials/);
  await auth.updateUser({...context,...admin},user.id,{status:'active'});
  return {auth,user,password,owner,admin};
}

test('auth service: sessions, authorization, origin, CSRF, revocation and audit',async()=>{await exercise(createMemoryStore());});
test('auth configuration fails closed and passwords are encoded and bounded',async()=>{
  await assert.rejects(createLocalAuth({store:createMemoryStore(),mode:'production',origin}),/unsafe_auth_configuration/);
  await assert.rejects(createLocalAuth({store:createMemoryStore(),mode:'unknown',origin}),/unsafe_auth_configuration/);
  await assert.rejects(createLocalAuth({store:{durable:true,ready:async()=>{throw new Error('schema missing');}},mode:'production',origin}),/schema missing/);
  const value=pass(),encoded=await hashPassword(value);
  assert.equal(await verifyPassword(value,encoded),true);assert.equal(await verifyPassword(pass(),encoded),false);
  await assert.rejects(hashPassword('short'),/password_policy/);
  await assert.rejects(hashPassword('a'.repeat(1025)),/password_policy/);
});
test('closed registration, concurrent bootstrap, rate limit, absolute expiry and password revocation',async()=>{
  let clock=Date.now();const store=createMemoryStore();const auth=await createLocalAuth({store,mode:'test',origin,now:()=>clock,idleMs:2000,absoluteMs:4000});
  const password=pass();await assert.rejects(auth.register(context,{email:'a@example.com',password}),/registration_closed/);
  const attempts=await Promise.allSettled(['a','b'].map(x=>auth.bootstrap({email:x+'@example.com',password},'create-first-administrator')));
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  const email=attempts[0].status==='fulfilled'?'a@example.com':'b@example.com';
  let login=await auth.login(context,{email,password});
  for(let i=0;i<3;i++){clock+=1000;await auth.authenticate(login.token);}clock+=1000;
  await assert.rejects(auth.authenticate(login.token),/unauthorized/);
  login=await auth.login(context,{email,password});
  await auth.changePassword({...context,...login},password,pass());
  await assert.rejects(auth.authenticate(login.token),/unauthorized/);
  let limited=false;for(let i=0;i<12;i++){try{await auth.login(context,{email,password:pass()});}catch(e){if(e.code==='rate_limited'){limited=true;break;}}}assert.equal(limited,true);
});

test('real disposable MySQL: ordered migrations, persistence, failure lock and concurrent writes',async()=>{
  const fixture=await disposableMysql();let pool;let altered;
  try {
    const apply=()=>migrateLocal({directory:migrations,config:localConfig,approval:'fixture_auth',connect:()=>mysql.createConnection(fixture.connection)});
    assert.equal((await apply()).applied,2);assert.equal((await apply()).applied,0);
    const plan=await readPlan(migrations);
    pool=mysql.createPool(fixture.connection);let store=createMysqlStore(pool,plan);await store.ready();
    const {user}=await exercise(store);
    await Promise.all(Array.from({length:10},(_,i)=>store.transaction(async tx=>tx.put('control','parallel-'+i,{i}))));
    await pool.end();pool=mysql.createPool(fixture.connection);store=createMysqlStore(pool,plan);await store.ready();
    assert.equal((await store.transaction(tx=>tx.get('users',user.id))).id,user.id);
    for(let i=0;i<10;i++)assert.deepEqual(await store.transaction(tx=>tx.get('control','parallel-'+i)),{i});
    await googleCases(store);
    await pool.query("UPDATE kit_migrations SET state='failed' WHERE id='0002_auth_records'");
    await assert.rejects(apply(),/recovery required/);await assert.rejects(store.ready(),/recovery required/);
    await pool.query("UPDATE kit_migrations SET state='applied', checksum=REPEAT('0',64) WHERE id='0002_auth_records'");
    await assert.rejects(apply(),/Changed migration history/);
    // A separate fresh database proves an actual DDL failure stays blocked.
    await pool.query('CREATE DATABASE fixture_failure');
    altered=await mkdtemp(path.join(os.tmpdir(),'kit-migration-failure-'));await cp(migrations,altered,{recursive:true});
    const manifest=JSON.parse(await readFile(path.join(altered,'manifest.json'),'utf8'));
    const {checksum}=await import('../modules/mysql-storage/files/.kontextstack/modules/mysql-storage/kit/templates/migrations.mjs');
    const sql='ALTER TABLE nonexistent ADD COLUMN synthetic INT;\n';
    manifest.migrations.push({id:'0003_failure',file:'0003_failure.sql.template',checksum:checksum(sql)});
    await writeFile(path.join(altered,'manifest.json'),JSON.stringify(manifest));await writeFile(path.join(altered,'0003_failure.sql.template'),sql);
    const failed=()=>migrateLocal({directory:altered,config:{...localConfig,database:'fixture_failure'},approval:'fixture_failure',connect:()=>mysql.createConnection({...fixture.connection,database:'fixture_failure'})});
    await assert.rejects(failed(),/Migration failed/);await assert.rejects(failed(),/recovery required/);
  }finally{if(pool)await pool.end();await fixture.close();if(altered)await rm(altered,{recursive:true,force:true});}
});
test('migration local guard rejects wrong mode, host, target and unapproved database before connection',async()=>{
  for(const change of [{mode:'production'},{host:'remote.example.com'},{database:'production'},{port:NaN},{user:'<USER>'}])assert.throws(()=>assertLocalTarget({...localConfig,...change},'fixture_auth'));
  let connected=false;await assert.rejects(migrateLocal({directory:migrations,config:localConfig,approval:'wrong',connect:()=>{connected=true;}}));assert.equal(connected,false);
});

async function googleCases(store) {
  const local=await createLocalAuth({store,mode:'test',origin,registration:'open'});
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='fixture';
  const keys=createLocalJWKSet({keys:[jwk]});const clientId='synthetic-client';let enabled=true,claims={},pending;
  const google=createGoogleAuth({local,store,origin,callback:origin+'/callback',clientId,clientSecret:pass(),enabled:()=>enabled,allowSignup:true,keys,
    exchange:async({verifier})=>{assert.equal(typeof verifier,'string');const authUrl=new URL(pending.url);const time=Math.floor(Date.now()/1000);return new SignJWT({sub:'synthetic-subject',iss:'https://accounts.google.com',aud:clientId,iat:time,exp:time+300,nonce:authUrl.searchParams.get('nonce'),email:'google@example.com',email_verified:true,...claims}).setProtectedHeader({alg:'RS256',kid:'fixture'}).sign(privateKey);}});
  const begin=async(ctx=context,purpose='login')=>{pending=await google.start(ctx,purpose);return {url:origin+'/callback?code=synthetic-code&state='+new URL(pending.url).searchParams.get('state'),binding:pending.binding,token:ctx.token??''};};
  let cb=await begin();await assert.rejects(google.callback({...cb,binding:'wrong'}),/denied/);
  const signed=await google.callback(cb);assert.equal(signed.user.role,'user');await assert.rejects(google.callback(cb),/denied/);
  for(const bad of [{nonce:'wrong'},{email_verified:false},{azp:'wrong'},{email:'invalid'},{iss:'https://wrong.example.com'},{aud:'wrong'},{exp:1},{iat:1},{aud:[clientId,'other']}]){claims=bad;cb=await begin();await assert.rejects(google.callback(cb),/denied/);}claims={};
  cb=await begin();const replay=await Promise.allSettled([google.callback(cb),google.callback(cb)]);assert.equal(replay.filter(x=>x.status==='fulfilled').length,1);
  const password=pass();await local.register(context,{email:'collision@example.com',password});
  claims={email:'collision@example.com',sub:'collision-subject'};
  const collision=createGoogleAuth({local,store,origin,callback:origin+'/callback',clientId,clientSecret:pass(),enabled:()=>enabled,allowSignup:true,keys,
    exchange:async()=>new SignJWT({nonce:new URL(pending.url).searchParams.get('nonce'),email:'collision@example.com',email_verified:true}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setSubject('collision-subject').setIssuer('https://accounts.google.com').setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(privateKey)});
  pending=await collision.start(context);cb={url:origin+'/callback?code=x&state='+new URL(pending.url).searchParams.get('state'),binding:pending.binding};await assert.rejects(collision.callback(cb),/denied/);
  const account=await local.login(context,{email:'collision@example.com',password});
  pending=await collision.start({...context,...account},'link');cb={url:origin+'/callback?code=x&state='+new URL(pending.url).searchParams.get('state'),binding:pending.binding,token:account.token};
  const linked=await collision.callback(cb);assert.equal(linked.user.id,account.user.id);assert.equal(linked.user.role,'user');
  enabled=false;await assert.rejects(google.start(context),/denied/);assert.equal((await local.authenticate(linked.token)).id,account.user.id);
  await local.disconnectGoogle({...context,...linked},'collision-subject');await assert.rejects(local.authenticate(linked.token),/unauthorized/);
}
test('Google signed OIDC, binding/replay, collision, explicit linking and provider disable',()=>googleCases(createMemoryStore()));
test('Google rejects forged signatures, hd mismatch, malformed callbacks and disable during exchange',async()=>{
 const store=createMemoryStore(),local=await createLocalAuth({store,mode:'test',origin});
 const good=await generateKeyPair('RS256'),bad=await generateKeyPair('RS256');const jwk=await exportJWK(good.publicKey);jwk.kid='test';
 let enabled=true,key=bad.privateKey,hd='approved.example.com',disableInExchange=false,pending;
 const google=createGoogleAuth({local,store,origin,callback:origin+'/callback',clientId:'fixture-client',clientSecret:pass(),enabled:()=>enabled,keys:createLocalJWKSet({keys:[jwk]}),hostedDomain:'approved.example.com',exchange:async()=>{
   if(disableInExchange)enabled=false;
   return new SignJWT({nonce:new URL(pending.url).searchParams.get('nonce'),email:'negative@example.com',email_verified:true,hd}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('negative-subject').setIssuer('https://accounts.google.com').setAudience('fixture-client').setIssuedAt().setExpirationTime('5m').sign(key);
 }});
 async function start(){pending=await google.start(context);return{url:origin+'/callback?code=x&state='+new URL(pending.url).searchParams.get('state'),binding:pending.binding};}
 let input=await start();await assert.rejects(google.callback({...input,url:input.url.replace('/callback','/other')}),/denied/);
 await assert.rejects(google.callback({...input,url:input.url+'&state=duplicate'}),/denied/);
 await assert.rejects(google.callback(input),/denied/);
 key=good.privateKey;hd='wrong.example.com';input=await start();await assert.rejects(google.callback(input),/denied/);
 hd='approved.example.com';disableInExchange=true;input=await start();await assert.rejects(google.callback(input),/denied/);
});
