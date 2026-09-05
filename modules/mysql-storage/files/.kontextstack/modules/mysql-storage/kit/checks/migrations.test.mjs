import test from 'node:test';
import assert from 'node:assert/strict';
import { readPlan, assertLocalTarget, verifyHistory } from '../templates/migrations.mjs';
test('review manifest without connecting and block production or incomplete history',async()=>{
  const plan=await readPlan(new URL('../templates/migrations/',import.meta.url).pathname);
  assert.equal(plan.length,2);
  assert.throws(()=>assertLocalTarget({mode:'production'},'unapproved'));
  assert.throws(()=>verifyHistory(plan,[{...plan[0],state:'failed'}]));
});
