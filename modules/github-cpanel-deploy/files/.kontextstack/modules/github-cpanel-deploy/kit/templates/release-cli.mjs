import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { stageArtifacts } from './artifacts.mjs';
import { deliver } from './deliver.mjs';
import { smoke } from './smoke.mjs';
const [operation]=process.argv.slice(2);
try{
 const policy=JSON.parse(await readFile('release-policy.json','utf8'));
 const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(process.env.EXPECTED_REVISION!==revision||(policy.revision&&policy.revision!==revision))throw new Error('Exact revision required');
 policy.revision=revision; // Bind the manifest without a self-referential commit.
 if(operation==='stage'){
   const manifest=await stageArtifacts(process.cwd(),'.release-stage',policy);
   await writeFile('.release-manifest.json',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({revision,artifactApproval:manifest.integrity,targets:manifest.targets.map(t=>t.kind)}));
 }else if(operation==='deliver'){
   const manifest=JSON.parse(await readFile('.release-manifest.json','utf8'));
   const targets=manifest.targets.map(t=>({kind:t.kind,host:t.destination.host,directory:t.destination.directory,user:process.env[t.kind==='static'?'STATIC_USER':'APP_USER'],password:process.env[t.kind==='static'?'STATIC_PASSWORD':'APP_PASSWORD']}));
   console.log(JSON.stringify(await deliver({stage:'.release-stage',manifest,targets,approval:process.env.ARTIFACT_APPROVAL})));
 }else if(operation==='smoke'){
   const manifest=JSON.parse(await readFile('.release-manifest.json','utf8'));
   const exact=manifest.targets.map(t=>t.kind==='static'
     ? {url:t.origin+'/',kind:'sha256',expected:t.files.find(f=>f.path==='index.html').sha256,status:200}
     : {url:t.origin+'/'+t.healthPath,kind:'json-field',field:'release',expected:revision,status:200});
   console.log(JSON.stringify(await smoke([...exact,...policy.smoke])));
 }
 else throw new Error('Unknown release operation');
}catch{
 console.error('Release blocked or failed. Inspect the reviewed gate and target state; no automatic migration or recovery.');process.exitCode=1;
}
