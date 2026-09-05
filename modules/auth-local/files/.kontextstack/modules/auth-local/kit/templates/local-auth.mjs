// Server-only project reference. Never expose the service object to a client.
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const random = () => randomBytes(32).toString('base64url');
const digest = (value) => createHash('sha256').update(String(value)).digest('hex');
const deny = (code = 'unauthorized') => { throw Object.assign(new Error(code), { code }); };
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const emailKey = (value) => {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) deny('invalid_input');
  return value.trim().toLowerCase();
};
const view = ({ id, role, status }) => ({ id, role, status });
export async function hashPassword(value) {
  if (typeof value !== 'string' || value.length < 15 || Buffer.byteLength(value) > 1024) deny('password_policy');
  const salt = randomBytes(16).toString('hex');
  const key = await derive(value, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 });
  return `scrypt:131072:8:1:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(value, encoded) {
  const parts = String(encoded ?? '').split(':');
  if (typeof value !== 'string' || Buffer.byteLength(value) > 1024 || parts.length !== 6 ||
      parts.slice(0, 4).join(':') !== 'scrypt:131072:8:1' || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{64}$/.test(parts[5])) return false;
  const key = await derive(value, parts[4], 32, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 });
  return equal(key.toString('hex'), parts[5]);
}

export async function createLocalAuth({ store, mode, origin, registration = 'closed', enabled = true, now = Date.now, idleMs = 900000, absoluteMs = 43200000 }) {
  const url = new URL(origin);
  if (!['local', 'test', 'production'].includes(mode) || !['open', 'closed'].includes(registration) || url.origin !== origin ||
      url.username || url.password || !['http:', 'https:'].includes(url.protocol) ||
      (mode === 'production' && (!store.durable || url.protocol !== 'https:')) ||
      (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) ||
      !Number.isSafeInteger(idleMs) || !Number.isSafeInteger(absoluteMs) || idleMs < 1000 || absoluteMs < idleMs || absoluteMs > 86400000) deny('unsafe_auth_configuration');
  await store.ready(); // A connection alone does not prove schema readiness.
  const dummy = await hashPassword(random());
  function originCheck(ctx) {
    if (!enabled) deny('provider_disabled');
    if (ctx.origin !== origin || (ctx.fetchSite && ctx.fetchSite !== 'same-origin')) deny('origin_denied');
  }
  async function audit(tx, type, actor = null, target = null) {
    // Strict field allowlist: never accept request metadata or provider payloads.
    await tx.put('audit', randomUUID(), { type, actor, target, at: now() });
  }
  async function rate(ctx, identity) {
    if (typeof ctx.clientKey !== 'string' || !ctx.clientKey || ctx.clientKey.length > 200) deny('invalid_client_context');
    const permitted = await store.transaction(async (tx) => {
      let allowed = true;
      for (const key of ['client:' + digest(ctx.clientKey), 'account:' + digest(identity)]) {
        const old = await tx.get('rate', key);
        const item = old && old.until > now() ? old : { count: 0, until: now() + 60000 };
        item.count++;
        if (item.count > 10) allowed = false;
        await tx.put('rate', key, item);
      }
      return allowed;
    });
    if (!permitted) deny('rate_limited');
  }
  async function session(tx, token) {
    if (!enabled || typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) deny();
    const row = await tx.get('sessions', digest(token));
    if (!row || row.expires <= now() || row.lastSeen + idleMs <= now()) deny();
    const user = await tx.get('users', row.userId);
    if (!user || user.status !== 'active' || user.version !== row.version) deny();
    row.lastSeen = now();
    await tx.put('sessions', digest(token), row);
    return { user, row };
  }
  async function unsafe(tx, ctx) {
    originCheck(ctx);
    const result = await session(tx, ctx.token);
    if (!equal(digest(ctx.csrf ?? ''), result.row.csrfHash)) deny('csrf_denied');
    return result;
  }
  async function issue(tx, user, oldToken) {
    if (oldToken) await tx.remove('sessions', digest(oldToken));
    const token = random(), csrf = random();
    await tx.put('sessions', digest(token), { userId: user.id, version: user.version, csrfHash: digest(csrf), lastSeen: now(), expires: now() + absoluteMs, reauthenticated: now() });
    return { token, csrf, user: view(user), cookie: cookie(token) };
  }
  function cookie(token = '') {
    return `${url.protocol === 'https:' ? '__Host-' : ''}session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? Math.floor(absoluteMs / 1000) : 0}${url.protocol === 'https:' ? '; Secure' : ''}`;
  }
  async function newUser(tx, email, encoded, role) {
    if (await tx.get('emails', email)) deny('account_conflict');
    const user = { id: randomUUID(), email, encoded, role, status: 'active', version: 1 };
    await tx.put('users', user.id, user);
    await tx.put('emails', email, user.id);
    return user;
  }
  const api = {
    cookie,
    async register(ctx, input) {
      originCheck(ctx);
      if (registration !== 'open') deny('registration_closed');
      const email = emailKey(input.email);
      await rate(ctx, email);
      const encoded = await hashPassword(input.password);
      return store.transaction(async (tx) => {
        const user = await newUser(tx, email, encoded, 'user');
        await audit(tx, 'registered', user.id, user.id);
        return view(user); // Browser-supplied roles are never used.
      });
    },
    async login(ctx, input) {
      originCheck(ctx);
      const email = emailKey(input.email);
      await rate(ctx, email);
      const existing = await store.transaction(async (tx) => tx.get('users', await tx.get('emails', email) ?? 'missing'));
      const valid = await verifyPassword(input.password, existing?.encoded || dummy);
      return store.transaction(async (tx) => {
        const current = existing && await tx.get('users', existing.id);
        if (!valid || !current || current.status !== 'active' || current.encoded !== existing.encoded || current.version !== existing.version) {
          await audit(tx, 'login_denied');
          return null;
        }
        await audit(tx, 'login', current.id, current.id);
        return issue(tx, current, ctx.token);
      }).then((result) => result || deny('invalid_credentials'));
    },
    async authenticate(token) { return store.transaction(async (tx) => view((await session(tx, token)).user)); },
    async csrf(token) {
      return store.transaction(async (tx) => {
        const { row } = await session(tx, token);
        const csrf = random();
        row.csrfHash = digest(csrf);
        await tx.put('sessions', digest(token), row);
        return csrf;
      });
    },
    async logout(ctx) {
      return store.transaction(async (tx) => {
        const { user } = await unsafe(tx, ctx);
        await tx.remove('sessions', digest(ctx.token));
        await audit(tx, 'logout', user.id, user.id);
        return { cookie: cookie() };
      });
    },
    async authorize(token, permission, ownerId) {
      const user = await api.authenticate(token);
      if (permission === 'self:read' && ownerId === user.id) return user;
      if (permission === 'users:manage' && user.role === 'admin') return user;
      deny('forbidden');
    },
    async updateUser(ctx, id, changes) {
      return store.transaction(async (tx) => {
        const { user: actor } = await unsafe(tx, ctx);
        if (actor.role !== 'admin') deny('forbidden');
        if (Object.keys(changes).some((key) => !['role', 'status'].includes(key))) deny('invalid_input');
        const user = await tx.get('users', id);
        if (!user) deny('not_found');
        const role = changes.role ?? user.role, status = changes.status ?? user.status;
        if (!['user', 'admin'].includes(role) || !['active', 'disabled'].includes(status)) deny('invalid_input');
        const control = await tx.get('control', 'bootstrap');
        const wasAdmin = user.role === 'admin' && user.status === 'active';
        const isAdmin = role === 'admin' && status === 'active';
        const count = (control?.admins ?? 0) + Number(isAdmin) - Number(wasAdmin);
        if (count < 1) deny('last_admin');
        await tx.put('control', 'bootstrap', { used: true, admins: count });
        await tx.put('users', id, { ...user, role, status, version: user.version + 1 });
        await audit(tx, 'user_changed', actor.id, id);
      });
    },
    // Private CLI only: no public route, environment password or first-user rule.
    async bootstrap(input, approval) {
      if (!enabled || approval !== 'create-first-administrator') deny('bootstrap_approval');
      const email = emailKey(input.email), encoded = await hashPassword(input.password);
      return store.transaction(async (tx) => {
        if (await tx.get('control', 'bootstrap')) deny('bootstrap_used');
        const user = await newUser(tx, email, encoded, 'admin');
        await tx.put('control', 'bootstrap', { used: true, admins: 1 });
        await audit(tx, 'admin_bootstrapped', null, user.id);
        return view(user);
      });
    },
    async changePassword(ctx, currentPassword, nextPassword) {
      const user = await store.transaction(async (tx) => (await unsafe(tx, ctx)).user);
      await rate(ctx, user.email);
      if (!await verifyPassword(currentPassword, user.encoded)) deny('invalid_credentials');
      const encoded = await hashPassword(nextPassword);
      await store.transaction(async (tx) => {
        const { user: current } = await unsafe(tx, ctx);
        if (current.version !== user.version) deny();
        await tx.put('users', user.id, { ...current, encoded, version: current.version + 1 });
        await audit(tx, 'password_changed', user.id, user.id);
      });
    },
    async linkingActor(ctx) {
      return store.transaction(async (tx) => {
        const { user, row } = await unsafe(tx, ctx);
        if (now() - row.reauthenticated > 300000) deny('reauthentication_required');
        return user.id;
      });
    },
    // Only called with a cryptographically verified provider identity by the
    // server adapter. Email collisions always require a separate linking flow.
    async externalIdentity(identity, { allowSignup = false, linkUserId = null, ctx = {} } = {}) {
      if (!enabled || !identity.sub || identity.emailVerified !== true) deny('invalid_identity');
      const email = emailKey(identity.email), identityId = digest('google:' + identity.sub);
      return store.transaction(async (tx) => {
        const mapped = await tx.get('identities', identityId);
        let user;
        if (linkUserId) {
          const current = await unsafe(tx, ctx);
          if (current.user.id !== linkUserId || now() - current.row.reauthenticated > 300000 || (mapped && mapped !== linkUserId)) deny('link_denied');
          user = current.user;
        } else if (mapped) user = await tx.get('users', mapped);
        else {
          if (await tx.get('emails', email)) deny('explicit_link_required');
          if (!allowSignup) deny('signup_closed');
          user = await newUser(tx, email, null, 'user');
        }
        if (!user || user.status !== 'active') deny();
        await tx.put('identities', identityId, user.id);
        await audit(tx, linkUserId ? 'google_linked' : 'google_login', user.id, user.id);
        return issue(tx, user, ctx.token);
      });
    },
    async disconnectGoogle(ctx, sub) {
      return store.transaction(async (tx) => {
        const { user } = await unsafe(tx, ctx);
        const id = digest('google:' + sub);
        if (!user.encoded || await tx.get('identities', id) !== user.id) deny('disconnect_denied');
        await tx.remove('identities', id);
        await tx.put('users', user.id, { ...user, version: user.version + 1 });
        await audit(tx, 'google_disconnected', user.id, user.id);
      });
    }
  };
  return api;
}
