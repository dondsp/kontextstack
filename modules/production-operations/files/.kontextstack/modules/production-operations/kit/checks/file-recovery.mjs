export function fileRecovery(previous,current){
 if(!previous?.integrity||!current?.integrity||!Array.isArray(previous.targets)||!Array.isArray(current.targets))throw new Error('Exact prior and current artifacts required');
 const flatten=m=>new Map(m.targets.flatMap(t=>t.files.map(f=>[t.kind+'/'+f.path,f.sha256])));
 const before=flatten(previous),after=flatten(current);
 return {
   restore:[...before].filter(([p,h])=>after.get(p)!==h).map(([p])=>p),
   inspectBeforeRemoving:[...after.keys()].filter(p=>!before.has(p)),
   approvalRequired:true,databaseRestored:false,identityRecovered:false,ownerAccepted:false
 };
}
