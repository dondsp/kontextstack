import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createModulePlan, applyModulePlan, verifyProjectModules } from '../src/modules/lifecycle.js';
import { loadPortableBundle } from '../src/modules/bundle.js';
import { makeCleanProject, commitAll } from './support/project.js';
import { writeJson } from './support/kit.js';
async function projectFixture(t){
 const project=await makeCleanProject();t.after(()=>rm(project,{recursive:true,force:true}));
 await mkdir(path.join(project,'.kontextstack'));
 await writeJson(path.join(project,'package.json'),{name:'synthetic-auth-fixture',private:true,type:'module'});
 await writeJson(path.join(project,'.kontextstack/modules.lock.json'),{schemaVersion:'1.0.0',core:{version:'0.5.1',source:'https://github.com/dondsp/kontextstack',commit:null},modules:[]});
 commitAll(project);return project;
}
test('installed data/auth kit composition, copy-ready brief and explicit fixture adaptation',async t=>{
 const project=await projectFixture(t);
 assert.equal((await createModulePlan({projectPath:project,name:'auth-google'})).status,'blocked');
 // Local/test auth may be installed alone; production storage is enforced by startup.
 assert.equal((await createModulePlan({projectPath:project,name:'auth-local'})).status,'ready');
 for(const name of ['mysql-storage','auth-local','auth-google']){
   const args={projectPath:project,name},plan=await createModulePlan(args);
   assert.equal(plan.status,'ready');assert.deepEqual(plan.module.permissions.commands,[]);assert.equal(plan.module.permissions.network,false);
   await applyModulePlan({...args,approval:plan.previewId});assert.equal((await verifyProjectModules(project)).valid,true);
   assert.match(await readFile(path.join(project,'docs/kontextstack/modules',name,'CODEX_PROMPT.md'),'utf8'),/AGENTS.md/);
   commitAll(project);
 }
 const installed=path.join(project,'.kontextstack/modules');
 for(const [name,check]of [['mysql-storage','migrations'],['auth-local','security']]){
   const run=spawnSync(process.execPath,['--test',path.join(installed,name,'kit/checks/'+check+'.test.mjs')],{encoding:'utf8'});
   assert.equal(run.status,0,run.stdout+run.stderr);
 }
 await cp(path.join(installed,'auth-local/kit'),path.join(project,'adapted-auth'),{recursive:true});
 const {createLocalAuth}=await import(pathToFileURL(path.join(project,'adapted-auth/templates/local-auth.mjs')));
 const {createMemoryStore}=await import(pathToFileURL(path.join(project,'adapted-auth/fixtures/memory-store.mjs')));
 const auth=await createLocalAuth({store:createMemoryStore(),mode:'test',origin:'https://app.example.com',registration:'open'});
 const password=randomBytes(24).toString('hex'),ctx={origin:'https://app.example.com',clientKey:'fixture'};
 await auth.register(ctx,{email:'adapted@example.com',password});const login=await auth.login(ctx,{email:'adapted@example.com',password});
 assert.equal((await auth.authenticate(login.token)).role,'user');
 assert.equal((await verifyProjectModules(project)).valid,true);
});
test('published planning versions retain fingerprints, upgrade preserves records, customization blocks',async t=>{
 const project=await projectFixture(t);
 const fingerprints={'mysql-storage':'6cd6890cd7c217ce9094d99131589e1157b16fc7a2f1dedfd2b3d7e79356ed37','auth-local':'09b56e3686b7f2f48821ac9c3b54900d32858d52a3e51fea364aabdfeb81ddd8','auth-google':'4566b6567fe98d1235efcd4b1324ee9ed4db65b3ebec8fbae71b2a01d02767ed'};
 for(const name of Object.keys(fingerprints)){
   const bundle=await loadPortableBundle(new URL('../modules/'+name+'/versions/0.4.0/',import.meta.url).pathname);
   assert.equal(bundle.computedIntegrity,'sha256-'+fingerprints[name]);
   const args={projectPath:project,name,version:'0.4.0'},old=await createModulePlan(args);assert.equal(old.status,'ready');
   await applyModulePlan({...args,approval:old.previewId});commitAll(project);
 }
 assert.ok((await createModulePlan({projectPath:project,name:'auth-local'})).conflicts.some(x=>x.includes('Optional module version')));
 for(const name of Object.keys(fingerprints)){
   const args={projectPath:project,name},plan=await createModulePlan(args);assert.equal(plan.status,'ready');
   assert.equal(plan.actions.filter(a=>a.action==='preserve').length,2);
   await applyModulePlan({...args,approval:plan.previewId});commitAll(project);
 }
 const lock=JSON.parse(await readFile(path.join(project,'.kontextstack/modules.lock.json')));
 for(const m of lock.modules)assert.equal(m.history[0].integrity,'sha256-'+fingerprints[m.name]);
 const target=path.join(project,'.kontextstack/modules/auth-local/decision.json');await writeFile(target,'{"custom":true}\n');commitAll(project);
 const args={projectPath:project,name:'auth-local'},conflict=await createModulePlan(args);assert.equal(conflict.status,'blocked');
 await assert.rejects(applyModulePlan({...args,approval:conflict.previewId}));assert.match(await readFile(target,'utf8'),/custom/);
});
