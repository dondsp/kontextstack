import { lstat, readFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const hash = value => createHash('sha256').update(value).digest('hex');
export function relative(value) {
  if(typeof value!=='string'||!value||value.length>250||value.startsWith('/')||value.split('/').some(x=>!x||x==='.'||x==='..'||!/^[A-Za-z0-9_.-]+$/.test(x)))throw new Error('Unsafe artifact path');
  return value;
}
function allowed(value) {
  relative(value);
  if(value.split('/').some(x=>/^(?:\.env|\.git|node_modules|uploads|logs|backups|dumps|private|test|tests)(?:\.|$)/i.test(x))||/\.(?:sql|pem|key|log|map|zip|tgz|gz)$/i.test(value))throw new Error('Forbidden artifact category');
}
async function safeFile(root,file) {
  relative(file);let current=root;
  if((await lstat(root)).isSymbolicLink())throw new Error('Symlink artifact root');
  for(const part of file.split('/')){current=path.join(current,part);if((await lstat(current)).isSymbolicLink())throw new Error('Symlink artifact path');}
  const stat=await lstat(current);if(!stat.isFile()||stat.size>20_000_000)throw new Error('Invalid artifact file');
  return current;
}
export function validatePolicy(policy) {
  if(policy.version!==1||!['static','node','split'].includes(policy.target)||!Array.isArray(policy.targets)||!policy.targets.length||policy.targets.length>2||
    !/^[a-f0-9]{40}$/.test(policy.revision??'')||!['reviewed-lockfile','reviewed-host-install'].includes(policy.dependencies))throw new Error('Incomplete release policy');
  const kinds=policy.targets.map(t=>t.kind).sort();
  if(JSON.stringify(kinds)!==JSON.stringify(policy.target==='split'?['node','static']:[policy.target]))throw new Error('Target selection mismatch');
  const names=new Set();
  for(const target of policy.targets){
    if(!['static','node'].includes(target.kind)||names.has(target.kind)||!Array.isArray(target.files)||!target.files.length||new Set(target.files).size!==target.files.length||!target.files.every(f=>typeof f==='string'))throw new Error('Invalid artifact allowlist');
    names.add(target.kind);relative(target.source);target.files.forEach(allowed);
    if(!target.destination||Object.keys(target.destination).sort().join(',')!=='directory,host,identity'||!/^[a-z0-9][a-z0-9.-]+$/i.test(target.destination.host??'')||!/^[A-Za-z0-9_.@-]{1,128}$/.test(target.destination.identity??''))throw new Error('Explicit destination required');
    relative(target.destination.directory);
    const origin=new URL(target.origin);if(origin.protocol!=='https:'||origin.origin!==target.origin)throw new Error('Exact public HTTPS origin required');
    if(target.kind==='node')relative(target.healthPath);
    if(target.kind==='static'&&!target.files.includes('index.html'))throw new Error('Static entrypoint required');
    if(target.kind==='node'&&(!target.files.includes('package.json')||!target.files.includes('package-lock.json')))throw new Error('Runtime manifest and lockfile required');
  }
}
export async function describeArtifacts(root,policy) {
  validatePolicy(policy);const targets=[];
  for(const target of policy.targets){
    const files=[];
    for(const file of [...target.files].sort()){
      const source=await safeFile(root,target.source+'/'+file),content=await readFile(source);
      if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_|sk-)[A-Za-z0-9_-]{20,}|\b(?:PASSWORD|TOKEN|SECRET)\s*[:=]\s*["'][^"']+["']/i.test(content.toString('utf8')))throw new Error('Secret-like artifact content withheld');
      files.push({path:file,sha256:hash(content)});
    }
    targets.push({kind:target.kind,destination:target.destination,origin:target.origin,...(target.kind==='node'?{healthPath:target.healthPath}:{}),files});
    if(target.kind==='node'){
      const lock=files.find(f=>f.path==='package-lock.json').sha256;
      if(target.dependenciesInstalledFor!==lock)throw new Error('Runtime dependencies need separate host approval and verification for this exact lockfile');
    }
  }
  const manifest={version:1,revision:policy.revision,targets};
  return {...manifest,integrity:hash(JSON.stringify(manifest))};
}
export async function stageArtifacts(root,destination,policy) {
  const manifest=await describeArtifacts(root,policy);
  await mkdir(destination); // Refuse an existing stage instead of wiping it.
  for(const target of policy.targets)for(const file of target.files){
    const source=await safeFile(root,target.source+'/'+file),out=path.join(destination,target.kind,file);
    await mkdir(path.dirname(out),{recursive:true});await copyFile(source,out);
    const expected=manifest.targets.find(t=>t.kind===target.kind).files.find(f=>f.path===file).sha256;
    if(hash(await readFile(out))!==expected)throw new Error('Artifact changed while staging');
  }
  return manifest;
}
export async function verifyStage(root,manifest) {
  const {integrity,...body}=manifest;
  if(hash(JSON.stringify(body))!==integrity)throw new Error('Artifact manifest changed');
  const expected=new Map(manifest.targets.flatMap(t=>t.files.map(f=>[t.kind+'/'+f.path,f.sha256])));
  async function walk(directory,prefix=''){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const rel=prefix+entry.name;
      if(entry.isSymbolicLink())throw new Error('Stage symlink');
      if(entry.isDirectory())await walk(path.join(directory,entry.name),rel+'/');
      else {if(!expected.has(rel))throw new Error('Unexpected staged file');const file=await safeFile(root,rel);if(hash(await readFile(file))!==expected.get(rel))throw new Error('Stage integrity mismatch');expected.delete(rel);}
    }
  }
  await walk(root);if(expected.size)throw new Error('Missing staged file');
}
