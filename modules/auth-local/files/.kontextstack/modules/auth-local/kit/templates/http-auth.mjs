// Adapt into the canonical router. No bootstrap or provider-proof endpoint.
function readCookie(header, name) {
  const values = String(header ?? '').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
  return values.length === 1 ? values[0].slice(name.length+1) : '';
}
async function body(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) throw Object.assign(new Error('content_type'),{code:'invalid_input'});
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>8192)throw Object.assign(new Error('body_limit'),{code:'invalid_input'});chunks.push(chunk);}
  try {const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw new Error();return value;}
  catch {throw Object.assign(new Error('invalid_json'),{code:'invalid_input'});}
}
export function authRoutes(auth, origin) {
  return async(req,res)=>{
    const route=new URL(req.url,origin).pathname;
    if(!route.startsWith('/api/auth/') && route!=='/api/admin/users')return false;
    const ctx={origin:req.headers.origin,fetchSite:req.headers['sec-fetch-site'],clientKey:req.socket.remoteAddress,token:readCookie(req.headers.cookie,new URL(origin).protocol==='https:'?'__Host-session':'session'),csrf:req.headers['x-csrf-token']};
    const send=(status,value,cookie)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(cookie?{'set-cookie':cookie}:{})});res.end(JSON.stringify(value));};
    try {
      if(req.method==='POST' && route==='/api/auth/register')send(201,{user:await auth.register(ctx,await body(req))});
      else if(req.method==='POST' && route==='/api/auth/login'){
        const result=await auth.login(ctx,await body(req));send(200,{user:result.user,csrf:result.csrf},result.cookie);
      }else if(req.method==='POST' && route==='/api/auth/logout')send(200,{ok:true},(await auth.logout(ctx)).cookie);
      else if(req.method==='GET' && route==='/api/auth/me')send(200,{user:await auth.authenticate(ctx.token)});
      else if(req.method==='GET' && route==='/api/auth/csrf'){
        if(ctx.fetchSite!=='same-origin' && ctx.origin!==origin)throw Object.assign(new Error('origin_denied'),{code:'origin_denied'});
        send(200,{csrf:await auth.csrf(ctx.token)});
      }else if(req.method==='PATCH' && route==='/api/admin/users'){
        const input=await body(req);await auth.updateUser(ctx,input.id,input.changes??{});send(200,{ok:true});
      }else send(404,{error:'not_found'});
    }catch(error){
      const code=error.code;
      const status=['unauthorized','invalid_credentials'].includes(code)?401:['forbidden','csrf_denied','origin_denied','registration_closed','provider_disabled'].includes(code)?403:code==='rate_limited'?429:['account_conflict','last_admin'].includes(code)?409:['invalid_input','password_policy'].includes(code)?400:503;
      send(status,{error:status===503?'temporarily_unavailable':code});
    }
    return true;
  };
}
