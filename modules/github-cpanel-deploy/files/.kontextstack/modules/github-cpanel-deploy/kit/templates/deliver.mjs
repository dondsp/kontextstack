// Project-owned explicit FTPS delivery. Importing does nothing.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { verifyStage, relative } from './artifacts.mjs';
function quote(value){if(typeof value!=='string'||!value||/[\r\n\0]/.test(value))throw new Error('Invalid transport configuration');return '"'+value.replaceAll('\\','\\\\').replaceAll('"','\\"')+'"';}
export async function deliver({stage,manifest,targets,approval,upload=ftpsUpload}){
  if(approval!==manifest.integrity)throw new Error('Exact artifact approval required');
  await verifyStage(stage,manifest);
  if(targets.length!==manifest.targets.length||new Set(targets.map(t=>t.kind)).size!==targets.length)throw new Error('Delivery target mismatch');
  const identities=new Set();
  for(const target of targets){
    if(Object.keys(target).sort().join(',')!=='directory,host,kind,password,user')throw new Error('Unknown delivery field');
    if(!manifest.targets.some(t=>t.kind===target.kind)||!/^[a-z0-9][a-z0-9.-]+$/i.test(target.host)||/(?:example\.(?:com|invalid)|localhost)$/i.test(target.host)||target.host.includes('..'))throw new Error('Unresolved delivery target');
    const expected=manifest.targets.find(t=>t.kind===target.kind).destination;
    if(expected.host!==target.host||expected.directory!==target.directory||expected.identity!==target.user)throw new Error('Approved destination changed');
    relative(target.directory);quote(target.user);quote(target.password);
    if(identities.has(target.user))throw new Error('Separate delivery identities required');identities.add(target.user);
  }
  const completed=[];
  try{
    // Passenger markers are delivered only after every target's files succeed.
    for(const restart of [false,true])for(const target of targets){
      for(const file of manifest.targets.find(t=>t.kind===target.kind).files.filter(f=>(f.path==='tmp/restart.txt')===restart)){
        await upload({...target,local:path.join(stage,target.kind,file.path),remote:'ftp://'+target.host+'/'+target.directory+'/'+file.path});
        completed.push(target.kind+'/'+file.path);
      }
    }
    return {status:'uploaded-awaiting-runtime-and-smoke',completed};
  }catch{throw Object.assign(new Error('Partial delivery possible; inspect every target and approve recovery before retry'),{completed});}
}
export async function ftpsUpload({local,remote,user,password}){
  // Credentials travel over stdin, never shell arguments, files or logs.
  const config=['url = '+quote(remote),'user = '+quote(user+':'+password),'upload-file = '+quote(local),'ssl-reqd','tlsv1.2','ftp-create-dirs','connect-timeout = 15','max-time = 120','retry = 2','retry-delay = 3','silent','fail'].join('\n')+'\n';
  await new Promise((resolve,reject)=>{
    const child=spawn('curl',['--disable','--config','-'],{stdio:['pipe','ignore','ignore']});
    child.on('error',()=>reject(new Error('Transport unavailable')));child.on('exit',code=>code===0?resolve():reject(new Error('Transport failed')));child.stdin.on('error',()=>{});child.stdin.end(config);
  });
}
