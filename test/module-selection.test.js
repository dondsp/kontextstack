import test from 'node:test';import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';import path from 'node:path';
import { createModulePlan, applyModulePlan, verifyProjectModules, inspectModule } from '../src/modules/lifecycle.js';
import { validateSelectionDeclaration } from '../src/modules/selection.js';
import { makeCleanProject, commitAll } from './support/project.js';import { writeJson } from './support/kit.js';
test('deployment and operations require explicit confined owner selections; selection changes stale exact approval',async t=>{
 const project=await makeCleanProject();t.after(()=>rm(project,{recursive:true,force:true}));await mkdir(path.join(project,'.kontextstack'));
 await writeJson(path.join(project,'.kontextstack/modules.lock.json'),{schemaVersion:'1.0.0',core:{version:'0.5.1',source:'https://github.com/dondsp/kontextstack',commit:null},modules:[]});
 await writeFile(path.join(project,'.gitignore'),'.kontextstack/modules/*/selection.json\n');commitAll(project);
 for(const [name,value]of [['github-cpanel-deploy',{target:'static'}],['production-operations',{surfaces:['static']}]] ){
   const args={projectPath:project,name};assert.equal((await createModulePlan(args)).status,'blocked');
   const selection=path.join(project,'.kontextstack/modules',name,'selection.json');await mkdir(path.dirname(selection),{recursive:true});
   await writeJson(selection,value);const plan=await createModulePlan(args);assert.equal(plan.status,'ready');assert.equal(plan.actions.some(a=>a.target.endsWith('/selection.json')),false);
   await writeJson(selection,name==='github-cpanel-deploy'?{target:'split'}:{surfaces:['runtime']});
   await assert.rejects(applyModulePlan({...args,approval:plan.previewId}),/exactly match/);
   await writeJson(selection,value);const current=await createModulePlan(args);await applyModulePlan({...args,approval:current.previewId});assert.equal((await verifyProjectModules(project)).valid,true);commitAll(project);
   await writeJson(selection,{...value,password:'synthetic-not-a-secret'});const invalid=await createModulePlan(args);assert.equal(invalid.status,'blocked');assert.doesNotMatch(JSON.stringify(invalid),/synthetic-not-a-secret/);
   await rm(selection);await symlink(path.join(project,'README.md'),selection);assert.equal((await createModulePlan(args)).status,'blocked');await rm(selection);await writeJson(selection,value);
 }
});
test('selection declarations cannot request paths, overwrite owner choices or claim legacy compatibility',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../modules/github-cpanel-deploy/module.json',import.meta.url)));
 validateSelectionDeclaration(manifest);
 assert.throws(()=>validateSelectionDeclaration({...manifest,selection:{...manifest.selection,path:'../outside'}}));
 assert.throws(()=>validateSelectionDeclaration({...manifest,coreCompatibility:'>=0.6.0-alpha.1 <0.7.0'}));
 assert.throws(()=>validateSelectionDeclaration({...manifest,files:[...manifest.files,{path:'.kontextstack/modules/github-cpanel-deploy/selection.json'}]}));
});
