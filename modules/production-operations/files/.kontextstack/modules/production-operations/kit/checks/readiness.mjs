const gates={
 static:['artifact','dns-tls','routes-assets','file-rollback','journey'],
 runtime:['startup','health-readiness','logs-redaction','restart','runtime-rollback'],
 data:['schema-ledger','persistence','backup','restore-rehearsal','data-recovery'],
 identity:['sessions-csrf','authorization','logout-replay','account-recovery']
};
export function readiness(record){
 if(record.version!==1||!Array.isArray(record.surfaces)||!record.surfaces.length||new Set(record.surfaces).size!==record.surfaces.length||record.surfaces.some(s=>!gates[s])||!/^[a-f0-9]{40}$/.test(record.revision??''))throw new Error('Explicit release and surfaces required');
 const required=[...new Set(record.surfaces.flatMap(s=>gates[s]))];
 const missing=required.filter(id=>{
   const evidence=record.evidence?.[id];
   return !evidence||evidence.status!=='passed'||evidence.revision!==record.revision||
     typeof evidence.reference!=='string'||!evidence.reference||/[<>\r\n]/.test(evidence.reference)||
     typeof evidence.owner!=='string'||!evidence.owner||/[<>\r\n]/.test(evidence.owner)||!Number.isFinite(Date.parse(evidence.checkedAt));
 });
 return {required,missing,eligibleForOwnerReview:missing.length===0,ownerAccepted:false,externalAuthority:false};
}
