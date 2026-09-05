import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createLocalAuth } from '../modules/auth-local/files/.kontextstack/modules/auth-local/kit/templates/local-auth.mjs';
import { createMemoryStore } from '../modules/auth-local/files/.kontextstack/modules/auth-local/kit/fixtures/memory-store.mjs';
import { authRoutes } from '../modules/auth-local/files/.kontextstack/modules/auth-local/kit/templates/http-auth.mjs';
test('HTTP adapter keeps session tokens out of JSON, denies forged roles and enforces logout CSRF',async()=>{
  const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  const auth=await createLocalAuth({store:createMemoryStore(),mode:'test',origin,registration:'open'});
  const route=authRoutes(auth,origin);server.on('request',(req,res)=>{route(req,res).then(handled=>{if(!handled){res.writeHead(404);res.end();}});});
  const request=(url,method='GET',data,headers={})=>fetch(origin+url,{method,headers:{origin,'content-type':'application/json',...headers},...(data?{body:JSON.stringify(data)}:{})});
  try{
    const password=randomBytes(24).toString('hex');
    assert.equal((await request('/api/auth/register','POST',{email:'http@example.com',password,role:'admin'})).status,201);
    const login=await request('/api/auth/login','POST',{email:'http@example.com',password});const value=await login.json();
    assert.equal(login.status,200);assert.equal(value.token,undefined);assert.equal(value.user.role,'user');assert.equal(value.user.encoded,undefined);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/auth/me','GET',null,{cookie})).status,200);
    assert.equal((await request('/api/admin/users','PATCH',{id:value.user.id,changes:{role:'admin'}},{cookie,'x-csrf-token':value.csrf})).status,403);
    assert.equal((await request('/api/auth/logout','POST',null,{cookie})).status,403);
    assert.equal((await request('/api/auth/logout','POST',null,{cookie,'x-csrf-token':value.csrf})).status,200);
    assert.equal((await request('/api/auth/me','GET',null,{cookie})).status,401);
    assert.equal((await request('/api/auth/login','POST',{email:'http@example.com',password},{origin:'https://wrong.example.com'})).status,403);
    assert.equal((await request('/api/auth/bootstrap','POST',{})).status,404);
    assert.equal((await request('/api/auth/register','POST',{data:'x'.repeat(9000)})).status,400);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
