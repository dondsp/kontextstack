// Project adapter: parameterized row writes, no full-store replacement.
import { verifyHistory } from './migrations.mjs';
const buckets = new Set(['users', 'emails', 'sessions', 'identities', 'oauth', 'rate', 'audit', 'control']);
function key(bucket, id) {
  if (!buckets.has(bucket) || typeof id !== 'string' || !id || Buffer.byteLength(id) > 255) throw new Error('Invalid storage key');
}
export function createMysqlStore(pool, plan) {
  return {
    durable: true,
    async ready() {
      const [rows] = await pool.query('SELECT id, checksum, state FROM kit_migrations ORDER BY id');
      verifyHistory(plan, rows);
      if (rows.length !== plan.length) throw new Error('Schema not ready');
      const [guard] = await pool.query('SELECT id FROM kit_auth_guard WHERE id=1');
      if (guard.length !== 1) throw new Error('Schema not ready');
      await pool.query('SELECT bucket, id, value FROM kit_auth_records LIMIT 0');
    },
    async transaction(fn) {
      const db = await pool.getConnection();
      try {
        await db.beginTransaction();
        // A persistent guard serializes auth mutations even on an empty store.
        // Intended for modest-volume applications; benchmark before adoption.
        const [guard] = await db.query('SELECT id FROM kit_auth_guard WHERE id=1 FOR UPDATE');
        if (guard.length !== 1) throw new Error('Schema not ready');
        const tx = {
          async get(bucket, id) {
            key(bucket, id);
            const [rows] = await db.execute('SELECT CAST(value AS CHAR) AS value FROM kit_auth_records WHERE bucket=? AND id=?', [bucket, id]);
            const value = rows[0]?.value;
            return typeof value === 'string' ? JSON.parse(value) : value;
          },
          async put(bucket, id, value) {
            key(bucket, id);
            await db.execute('INSERT INTO kit_auth_records (bucket, id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value=?', [bucket, id, JSON.stringify(value), JSON.stringify(value)]);
          },
          async remove(bucket, id) {
            key(bucket, id);
            await db.execute('DELETE FROM kit_auth_records WHERE bucket=? AND id=?', [bucket, id]);
          }
        };
        const result = await fn(tx);
        await db.commit();
        return result;
      } catch (error) {
        await db.rollback();
        throw error;
      } finally { db.release(); }
    }
  };
}
