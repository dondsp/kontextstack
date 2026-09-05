// Project-owned reference. Importing this module never connects or migrates.
import { createHash } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';

export const checksum = (text) => createHash('sha256').update(text).digest('hex');
export async function readPlan(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.migrations) || !manifest.migrations.length) throw new Error('Invalid migration manifest');
  let previous = '';
  const plan = [];
  for (const item of manifest.migrations) {
    if (!/^\d{4}_[a-z0-9_]+$/.test(item.id) || item.id <= previous || item.file !== item.id + '.sql.template') throw new Error('Invalid migration order or path');
    previous = item.id;
    const filename = path.join(directory, item.file);
    if (!(await lstat(filename)).isFile()) throw new Error('Migration must be a regular file');
    const sql = await readFile(filename, 'utf8');
    if (checksum(sql) !== item.checksum || /<[A-Z_]+>|\{\{/.test(sql)) throw new Error('Changed or unresolved migration');
    // One reviewed statement per migration; never split SQL on semicolons.
    if (!sql.trim() || !/^(?:CREATE TABLE|ALTER TABLE|CREATE INDEX)\b/i.test(sql.trim())) throw new Error('Review structural migrations only');
    plan.push({ ...item, sql });
  }
  return plan;
}

export function assertLocalTarget(config, approval) {
  if (!['local', 'test'].includes(config.mode) || !['127.0.0.1', '::1', 'localhost'].includes(config.host) ||
      !/^fixture_[a-z0-9_]+$/.test(config.database ?? '') || approval !== config.database ||
      !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 ||
      !config.user || /<|\{|example|replace/i.test(config.user)) throw new Error('Local disposable database approval required');
}

export function verifyHistory(plan, rows) {
  if (rows.length > plan.length) throw new Error('Unknown migration history');
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== plan[i].id || rows[i].checksum !== plan[i].checksum) throw new Error('Changed migration history');
    if (rows[i].state !== 'applied') throw new Error('Failed or interrupted migration: explicit recovery required');
  }
}

export async function migrateLocal({ directory, config, approval, connect }) {
  const plan = await readPlan(directory); // No connection until all local checks pass.
  assertLocalTarget(config, approval);
  const db = await connect(config);
  let locked = false;
  try {
    const [[target]] = await db.query('SELECT DATABASE() AS name');
    if (target.name !== config.database) throw new Error('Unknown database target');
    const [[lock]] = await db.query("SELECT GET_LOCK('kit_migrations', 0) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Migration already running');
    locked = true;
    await db.query("CREATE TABLE IF NOT EXISTS kit_migrations (id VARCHAR(128) PRIMARY KEY, checksum CHAR(64) NOT NULL, state VARCHAR(16) NOT NULL) ENGINE=InnoDB");
    const [rows] = await db.query('SELECT id, checksum, state FROM kit_migrations ORDER BY id');
    verifyHistory(plan, rows);
    for (const item of plan.slice(rows.length)) {
      await db.execute("INSERT INTO kit_migrations (id, checksum, state) VALUES (?, ?, 'running')", [item.id, item.checksum]);
      try {
        // MySQL DDL commits implicitly. The persistent running/failed marker
        // prevents unsafe replay after partial DDL or a killed process.
        await db.query(item.sql);
        await db.execute("UPDATE kit_migrations SET state='applied' WHERE id=?", [item.id]);
      } catch {
        await db.execute("UPDATE kit_migrations SET state='failed' WHERE id=?", [item.id]);
        throw new Error('Migration failed; inspect schema and record recovery separately');
      }
    }
    return { applied: plan.length - rows.length, total: plan.length };
  } finally {
    try { if (locked) await db.query("SELECT RELEASE_LOCK('kit_migrations')"); }
    finally { await db.end(); }
  }
}
