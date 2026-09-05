// Run explicitly in the project: node --test <KIT>/checks/security.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createLocalAuth } from '../templates/local-auth.mjs';
import { createMemoryStore } from '../fixtures/memory-store.mjs';
test('local reference refuses unsafe production, checks CSRF and revokes logout',async()=>{
  const store=createMemoryStore(),origin='https://app.example.com';
  await assert.rejects(createLocalAuth({store,origin,mode:'production'}));
  const auth=await createLocalAuth({store,origin,mode:'test',registration:'open'});
  const password=randomBytes(24).toString('hex'),ctx={origin,clientKey:'synthetic'};
  await auth.register(ctx,{email:'fixture@example.com',password,role:'admin'});
  const login=await auth.login(ctx,{email:'fixture@example.com',password});
  assert.equal(login.user.role,'user');
  await assert.rejects(auth.authorize(login.token,'users:manage'));
  await assert.rejects(auth.logout({...ctx,...login,csrf:'wrong'}));
  await auth.logout({...ctx,...login});await assert.rejects(auth.authenticate(login.token));
});
