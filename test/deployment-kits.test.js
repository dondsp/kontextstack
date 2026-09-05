import test from 'node:test';import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import { randomBytes } from 'node:crypto';
import { parse } from 'yaml';
import { stageArtifacts, verifyStage, hash } from '../modules/github-cpanel-deploy/files/.kontextstack/modules/github-cpanel-deploy/kit/templates/artifacts.mjs';
import { deliver } from '../modules/github-cpanel-deploy/files/.kontextstack/modules/github-cpanel-deploy/kit/templates/deliver.mjs';
import { smoke } from '../modules/github-cpanel-deploy/files/.kontextstack/modules/github-cpanel-deploy/kit/checks/smoke.mjs';
import { readiness } from '../modules/production-operations/files/.kontextstack/modules/production-operations/kit/checks/readiness.mjs';
import { fileRecovery } from '../modules/production-operations/files/.kontextstack/modules/production-operations/kit/checks/file-recovery.mjs';
async function fixture(t){
 const root=await mkdtemp(path.join(os.tmpdir(),'kit-deploy-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'web'));await writeFile(path.join(root,'web/index.html'),'<title>Synthetic release</title>');
 await mkdir(path.join(root,'app/tmp'),{recursive:true});await writeFile(path.join(root,'app/package.json'),'{}');await writeFile(path.join(root,'app/package-lock.json'),'{}');await writeFile(path.join(root,'app/tmp/restart.txt'),'synthetic-revision');
 const policy={version:1,target:'split',revision:'1'.repeat(40),dependencies:'reviewed-host-install',targets:[
   {kind:'node',source:'app',origin:'https://app.example.com',healthPath:'api/health',files:['package.json','package-lock.json','tmp/restart.txt'],dependenciesInstalledFor:hash('{}'),destination:{host:'transport.example.test',directory:'app-root',identity:'fixture-app'}},
   {kind:'static',source:'web',origin:'https://site.example.com',files:['index.html'],destination:{host:'transport.example.test',directory:'web-root',identity:'fixture-static'}}]};
 return {root,policy};
}
test('stage exact split artifacts, guard dependencies, reject unsafe files and changed destinations',async t=>{
 const {root,policy}=await fixture(t);const stage=path.join(root,'stage'),manifest=await stageArtifacts(root,stage,policy);await verifyStage(stage,manifest);
 await assert.rejects(stageArtifacts(root,stage,policy));
 const targets=manifest.targets.map(t=>({kind:t.kind,...t.destination,user:t.destination.identity,password:randomBytes(16).toString('hex')})).map(({identity,...t})=>t);
 await assert.rejects(deliver({stage,manifest,targets,approval:'wrong'}),/approval/);
 await assert.rejects(deliver({stage,manifest,targets:targets.map(t=>({...t,directory:'wrong'})),approval:manifest.integrity,upload:async()=>assert.fail()}),/destination/);
 const uploaded=[];const result=await deliver({stage,manifest,targets,approval:manifest.integrity,upload:async file=>uploaded.push(file.remote)});
 assert.equal(result.status,'uploaded-awaiting-runtime-and-smoke');assert.match(uploaded.at(-1),/tmp\/restart.txt$/);
 await writeFile(path.join(stage,'static/.env'),'synthetic');await assert.rejects(verifyStage(stage,manifest),/Unexpected/);
 const bad=structuredClone(policy);bad.targets[0].dependenciesInstalledFor='wrong';await assert.rejects(stageArtifacts(root,path.join(root,'bad'),bad),/dependencies/);
 const traversal=structuredClone(policy);traversal.targets[1].files=['../outside'];await assert.rejects(stageArtifacts(root,path.join(root,'traversal'),traversal));
 await symlink(path.join(root,'web/index.html'),path.join(root,'web/alias.html'));const linked=structuredClone(policy);linked.targets[1].files.push('alias.html');await assert.rejects(stageArtifacts(root,path.join(root,'linked'),linked),/Symlink/);
});
test('partial delivery stops before restart, preserves recovery evidence and rehearses file rollback only',async t=>{
 const {root,policy}=await fixture(t),stage=path.join(root,'stage'),previous=await stageArtifacts(root,stage,policy);
 const remote=new Map();for(const target of previous.targets)for(const file of target.files)remote.set(target.kind+'/'+file.path,await readFile(path.join(stage,target.kind,file.path)));
 await writeFile(path.join(root,'web/index.html'),'<title>Next synthetic release</title>');policy.revision='2'.repeat(40);
 const nextStage=path.join(root,'next'),next=await stageArtifacts(root,nextStage,policy);
 const targets=next.targets.map(t=>({kind:t.kind,host:t.destination.host,directory:t.destination.directory,user:t.destination.identity,password:randomBytes(16).toString('hex')}));
 let calls=0;await assert.rejects(deliver({stage:nextStage,manifest:next,targets,approval:next.integrity,upload:async file=>{if(++calls===3)throw new Error('fixture interruption');remote.set(file.kind+'/'+path.relative(path.join(nextStage,file.kind),file.local),await readFile(file.local));}}),/Partial/);
 const recovery=fileRecovery(previous,next);assert.deepEqual(recovery.restore,['static/index.html']);assert.equal(recovery.databaseRestored,false);
 // Synthetic operator explicitly restores the reviewed prior artifact.
 await deliver({stage,manifest:previous,targets,approval:previous.integrity,upload:async file=>remote.set(file.kind+'/'+path.relative(path.join(stage,file.kind),file.local),await readFile(file.local))});
 for(const target of previous.targets)for(const file of target.files)assert.equal(hash(remote.get(target.kind+'/'+file.path)),file.sha256);
});
test('hosted smoke fails on wrong status, product, redirect, asset and auth boundary',async()=>{
 const checks=[{url:'https://site.example.com/health',kind:'json-field',field:'release',expected:'synthetic-release',status:200}];
 const response=(body,status=200)=>new Response(body,{status,headers:{'content-type':'application/json'}});
 for(const result of [response('{"release":"wrong"}'),response('{}',503),response('{}',302)])await assert.rejects(smoke(checks,{fetcher:async()=>result,attempts:1}),/smoke failed/);
 assert.equal((await smoke(checks,{fetcher:async()=>response('{"release":"synthetic-release"}'),attempts:1})).ownerAccepted,false);
 await assert.rejects(smoke([{url:'https://site.example.com/private',kind:'status',status:401}],{fetcher:async()=>response('{}'),attempts:1}));
 await assert.rejects(smoke([{url:'https://site.example.com/asset',kind:'sha256',expected:'0'.repeat(64),status:200}],{fetcher:async()=>response('wrong'),attempts:1}));
});
test('workflow parses, pins actions, protects deployment and excludes data authority',async()=>{
 const text=await readFile(new URL('../modules/github-cpanel-deploy/files/.kontextstack/modules/github-cpanel-deploy/kit/templates/deploy.yml.template',import.meta.url),'utf8');const workflow=parse(text);
 assert.deepEqual(Object.keys(workflow.on),['workflow_dispatch']);assert.equal(workflow.concurrency['cancel-in-progress'],false);assert.equal(workflow.permissions.contents,'read');assert.ok(workflow.jobs.deliver.environment);
 for(const step of workflow.jobs.deliver.steps){if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);if(step.run)assert.doesNotMatch(step.run,/migrat|bootstrap|restore|DB_PASSWORD|SESSION_SECRET/i);}
 assert.equal(workflow.jobs.deliver.steps.filter(s=>s.env?.APP_PASSWORD).length,1);
});
test('readiness cannot infer owner approval, skips no selected surface and rejects stale evidence',()=>{
 const record={version:1,revision:'1'.repeat(40),surfaces:['static','runtime','data','identity'],evidence:{}};
 const missing=readiness(record);assert.equal(missing.eligibleForOwnerReview,false);assert.ok(missing.required.includes('restore-rehearsal'));
 for(const id of missing.required)record.evidence[id]={status:'passed',revision:record.revision,reference:'synthetic-reference',owner:'fixture-owner',checkedAt:new Date().toISOString()};
 assert.equal(readiness(record).eligibleForOwnerReview,true);assert.equal(readiness(record).ownerAccepted,false);
 record.evidence.backup.revision='2'.repeat(40);assert.ok(readiness(record).missing.includes('backup'));
 assert.throws(()=>readiness({...record,surfaces:[]}));
});
