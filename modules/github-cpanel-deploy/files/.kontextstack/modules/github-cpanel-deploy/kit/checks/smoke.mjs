import { createHash } from 'node:crypto';
export async function smoke(checks,{fetcher=fetch,attempts=3,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!Array.isArray(checks)||!checks.length||checks.length>20)throw new Error('Explicit smoke checks required');
 for(const check of checks){
   const url=new URL(check.url);
   if(url.protocol!=='https:'||url.username||url.password||url.hash||!Number.isInteger(check.status)||!['body-marker','json-field','sha256','status'].includes(check.kind))throw new Error('Invalid smoke contract');
   let passed=false;
   for(let attempt=0;attempt<attempts;attempt++){
     try{
       const response=await fetcher(url.href,{redirect:'manual',signal:AbortSignal.timeout(5000),headers:{accept:check.kind==='json-field'?'application/json':'*/*'}});
       const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>2_000_000)throw new Error();const text=bytes.toString('utf8');
       passed=response.status===check.status;
       if(check.kind==='body-marker')passed&&=typeof check.expected==='string'&&check.expected.length>0&&text.includes(check.expected);
       if(check.kind==='json-field')passed&&=/application\/json/i.test(response.headers.get('content-type')??'')&&JSON.parse(text)[check.field]===check.expected;
       if(check.kind==='sha256')passed&&=createHash('sha256').update(bytes).digest('hex')===check.expected;
       if(passed)break;
     }catch{passed=false;}
     if(attempt+1<attempts)await pause(1000);
   }
   if(!passed)throw new Error('Hosted smoke failed; release is not accepted');
 }
 return {smokeVerified:true,ownerAccepted:false};
}
