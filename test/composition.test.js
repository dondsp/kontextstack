import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mysql from 'mysql2/promise';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { createModulePlan, applyModulePlan, verifyProjectModules } from '../src/modules/lifecycle.js';
import { makeCleanProject, commitAll } from './support/project.js';
import { disposableMysql } from './support/mysql.js';
import { writeJson } from './support/kit.js';

async function fixture(t) {
  const project = await makeCleanProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(path.join(project, '.kontextstack'));
  await writeJson(path.join(project, 'package.json'), { name: 'synthetic-composition', private: true, type: 'module' });
  await writeJson(path.join(project, '.kontextstack/modules.lock.json'), { schemaVersion: '1.0.0', core: { version: '0.5.1', source: 'https://github.com/dondsp/kontextstack', commit: null }, modules: [] });
  commitAll(project);
  return project;
}
async function install(project, name) {
  const args = { projectPath: project, name }, preview = await createModulePlan(args);
  assert.equal(preview.status, 'ready');
  assert.equal(preview.module.permissions.network, false);
  assert.deepEqual(preview.module.permissions.commands, []);
  assert.ok(preview.actions.every(action => action.target.startsWith(`.kontextstack/modules/${name}/`) || action.target.startsWith(`docs/kontextstack/modules/${name}/`)));
  await applyModulePlan({ ...args, approval: preview.previewId });
  assert.equal((await verifyProjectModules(project)).valid, true);
  commitAll(project);
}

test('composition matrix installs domain-only, Node-only, Node+MySQL and selected deployment without granting data authority', async t => {
  for (const modules of [['domain-cpanel'], ['node-cpanel'], ['node-cpanel', 'mysql-storage'], ['mysql-storage', 'github-cpanel-deploy']]) {
    const project = await fixture(t);
    for (const name of modules) {
      if (name === 'github-cpanel-deploy') {
        assert.equal((await createModulePlan({ projectPath: project, name })).status, 'blocked');
        await mkdir(path.join(project, '.kontextstack/modules', name), { recursive: true });
        await writeJson(path.join(project, '.kontextstack/modules', name, 'selection.json'), { target: 'split' });
        commitAll(project);
      }
      await install(project, name);
    }
    if (modules.includes('github-cpanel-deploy')) {
      const workflow = await readFile(path.join(project, '.kontextstack/modules/github-cpanel-deploy/kit/templates/deploy.yml.template'), 'utf8');
      assert.doesNotMatch(workflow, /DB_PASSWORD|migrate|bootstrap/);
    }
  }
});

test('installed Node + durable MySQL + local auth + signed Google identity compose through one adapted HTTP listener', async t => {
  const project = await fixture(t);
  for (const name of ['node-cpanel', 'mysql-storage', 'auth-local', 'auth-google']) await install(project, name);
  const kit = name => path.join(project, '.kontextstack/modules', name, 'kit');
  // Explicit project adaptation, outside module-owned files. No listener is added
  // by module apply. The project wires one router and the installed references.
  const app = path.join(project, 'adapted'); await mkdir(app);
  for (const name of ['node-cpanel', 'mysql-storage', 'auth-local', 'auth-google']) await cp(kit(name), path.join(app, name), { recursive: true });
  await cp(new URL('../node_modules/jose/', import.meta.url), path.join(project, 'node_modules/jose'), { recursive: true });
  const imported = (name, file) => import(pathToFileURL(path.join(app, name, 'templates', file)));
  const { createServer } = await imported('node-cpanel', 'runtime.mjs');
  const { migrateLocal, readPlan } = await imported('mysql-storage', 'migrations.mjs');
  const { createMysqlStore } = await imported('mysql-storage', 'mysql-store.mjs');
  const { createLocalAuth } = await imported('auth-local', 'local-auth.mjs');
  const { authRoutes } = await imported('auth-local', 'http-auth.mjs');
  const { createGoogleAuth } = await imported('auth-google', 'google-auth.mjs');
  const database = await disposableMysql(); let pool, server;
  try {
    const directory = path.join(app, 'mysql-storage/templates/migrations');
    await migrateLocal({ directory, config: { mode: 'test', host: '127.0.0.1', port: 3306, database: 'fixture_auth', user: 'root' }, approval: 'fixture_auth', connect: () => mysql.createConnection(database.connection) });
    const plan = await readPlan(directory); pool = mysql.createPool(database.connection);
    let store = createMysqlStore(pool, plan); await store.ready();
    const origin = 'https://app.example.com';
    let auth = await createLocalAuth({ store, mode: 'test', origin, registration: 'open' });
    const publicRoot = path.join(app, 'node-cpanel/fixtures/public');
    server = await createServer({ config: { service: 'synthetic-composition' }, publicRoot, isReady: async () => { await store.ready(); return true; } });
    const runtime = server.listeners('request')[0]; server.removeAllListeners('request');
    // The adapted canonical router calls auth first and delegates remaining paths.
    server.on('request', async (req, res) => { try { if (!await authRoutes(auth, origin)(req, res)) await runtime(req, res); } catch { res.writeHead(503); res.end(); } });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (route, body, extra = {}) => fetch(base + route, { method: body ? 'POST' : 'GET', headers: { origin, 'content-type': 'application/json', ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.deepEqual(await (await request('/api/health')).json(), { ok: true, service: 'synthetic-composition' });
    assert.deepEqual(await (await request('/api/ready')).json(), { ready: true });
    const password = randomBytes(24).toString('hex');
    assert.equal((await request('/api/auth/register', { email: 'fixture@example.com', password, role: 'admin' })).status, 201);
    const login = await request('/api/auth/login', { email: 'fixture@example.com', password });
    const cookie = login.headers.get('set-cookie').split(';')[0], account = await login.json();
    assert.equal(account.user.role, 'user'); assert.equal(account.token, undefined);
    await pool.end(); pool = mysql.createPool(database.connection); store = createMysqlStore(pool, plan);
    auth = await createLocalAuth({ store, mode: 'test', origin });
    assert.equal((await (await request('/api/auth/me', null, { cookie })).json()).user.id, account.user.id);
    assert.equal((await request('/api/auth/me')).status, 401);
    assert.equal((await request('/api/auth/logout', {}, { cookie, 'x-csrf-token': 'wrong' })).status, 403);
    assert.equal((await request('/api/auth/logout', {}, { cookie, 'x-csrf-token': account.csrf })).status, 200);
    assert.equal((await request('/api/auth/me', null, { cookie })).status, 401);
    const keys = await generateKeyPair('RS256'), jwk = await exportJWK(keys.publicKey); jwk.kid = 'synthetic';
    let pending, enabled = true;
    const google = createGoogleAuth({ local: auth, store, origin, callback: origin + '/callback', clientId: 'fixture-client', clientSecret: randomBytes(24).toString('hex'), allowSignup: true, enabled: () => enabled, keys: createLocalJWKSet({ keys: [jwk] }), exchange: async () => new SignJWT({ nonce: new URL(pending.url).searchParams.get('nonce'), email: 'google-fixture@example.com', email_verified: true }).setProtectedHeader({ alg: 'RS256', kid: 'synthetic' }).setSubject('fixture-subject').setIssuer('https://accounts.google.com').setAudience('fixture-client').setIssuedAt().setExpirationTime('5m').sign(keys.privateKey) });
    pending = await google.start({ origin, clientKey: 'synthetic-loopback' });
    const callback = { url: origin + '/callback?code=fixture&state=' + new URL(pending.url).searchParams.get('state'), binding: pending.binding };
    const signed = await google.callback(callback);
    assert.equal((await (await request('/api/auth/me', null, { cookie: `__Host-session=${signed.token}` })).json()).user.id, signed.user.id);
    await assert.rejects(google.callback(callback)); enabled = false;
    await assert.rejects(google.start({ origin, clientKey: 'synthetic-loopback' }));
    assert.equal((await verifyProjectModules(project)).valid, true);
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await pool?.end(); await database.close();
  }
});
