// Project-only adapter. The toolkit never imports this or contacts Google.
import { randomBytes, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
const random = () => randomBytes(32).toString('base64url');
const hash = (value) => createHash('sha256').update(String(value)).digest('base64url');
const fail = () => { throw new Error('google_signin_denied'); };
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 5000 });

export function createGoogleAuth({ local, store, origin, callback, clientId, clientSecret, enabled = () => false, allowSignup = false, hostedDomain = '', now = Date.now, keys = jwks, exchange = exchangeCode }) {
  const base = new URL(origin), redirect = new URL(callback);
  if (base.origin !== origin || redirect.origin !== origin || redirect.username || redirect.password || redirect.search || redirect.hash ||
      !['https:', 'http:'].includes(base.protocol) || (base.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) ||
      !clientId || !clientSecret || /<|\{|replace/i.test(clientId + clientSecret)) fail();
  function active() { if (!enabled()) fail(); }
  return {
    async start(ctx, purpose = 'login') {
      active();
      if (ctx.origin !== origin || (ctx.fetchSite && ctx.fetchSite !== 'same-origin') || !['login', 'link'].includes(purpose)) fail();
      if (typeof ctx.clientKey !== 'string' || !ctx.clientKey || ctx.clientKey.length > 200) fail();
      const allowed = await store.transaction(async (tx) => {
        const id = 'google:' + hash(ctx.clientKey), old = await tx.get('rate', id);
        const row = old && old.until > now() ? old : { count: 0, until: now() + 60000 };
        row.count++;
        await tx.put('rate', id, row);
        return row.count <= 30;
      });
      if (!allowed) fail();
      const linkUserId = purpose === 'link' ? await local.linkingActor(ctx) : null;
      const state = random(), nonce = random(), verifier = random(), binding = random();
      await store.transaction(async (tx) => tx.put('oauth', hash(state), { nonce, verifier, binding: hash(binding), expires: now() + 300000, linkUserId, tokenHash: hash(ctx.token ?? ''), csrf: linkUserId ? ctx.csrf : null }));
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      for (const [name, value] of Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: callback, scope: 'openid email profile', state, nonce, code_challenge: hash(verifier), code_challenge_method: 'S256' })) url.searchParams.set(name, value);
      if (hostedDomain) url.searchParams.set('hd', hostedDomain);
      return { url: url.href, binding, cookie: `${base.protocol === 'https:' ? '__Host-' : ''}oauth=${binding}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${base.protocol === 'https:' ? '; Secure' : ''}` };
    },
    async callback({ url, binding, token = '' }) {
      active();
      const incoming = new URL(url);
      if (incoming.origin + incoming.pathname !== callback || incoming.username || incoming.password || incoming.hash ||
          ['state', 'code'].some((key) => incoming.searchParams.getAll(key).length !== 1) || incoming.searchParams.has('error')) fail();
      const state = incoming.searchParams.get('state'), code = incoming.searchParams.get('code');
      if (!/^[\w-]{43}$/.test(state ?? '') || !code || code.length > 4096) fail();
      const flow = await store.transaction(async (tx) => {
        const row = await tx.get('oauth', hash(state));
        if (!row || row.expires <= now() || row.binding !== hash(binding) || row.tokenHash !== hash(token)) return null;
        await tx.remove('oauth', hash(state)); // Consume atomically before network I/O.
        return row;
      });
      if (!flow) fail();
      try {
        const encoded = await exchange({ code, verifier: flow.verifier, callback, clientId, clientSecret });
        const { payload } = await jwtVerify(encoded, keys, { algorithms: ['RS256'], issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: clientId, requiredClaims: ['sub', 'iat', 'exp', 'nonce', 'email', 'email_verified'], currentDate: new Date(now()), maxTokenAge: '10m' });
        if (payload.nonce !== flow.nonce || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
            (payload.azp !== undefined && payload.azp !== clientId) || (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId) ||
            (hostedDomain && payload.hd !== hostedDomain)) fail();
        active(); // Revocation while the provider was being contacted wins.
        return await local.externalIdentity({ sub: payload.sub, email: payload.email, emailVerified: true }, {
          allowSignup, linkUserId: flow.linkUserId,
          ctx: { origin, token, csrf: flow.csrf, fetchSite: 'same-origin' }
        });
      } catch { fail(); } // Never log token exchange responses or raw JWTs.
    }
  };
}

async function exchangeCode({ code, verifier, callback, clientId, clientSecret }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: 'authorization_code' })
  });
  if (!response.ok) fail();
  const result = await response.json();
  if (typeof result.id_token !== 'string' || result.id_token.length > 16384) fail();
  return result.id_token; // Access and refresh tokens are not persisted.
}
