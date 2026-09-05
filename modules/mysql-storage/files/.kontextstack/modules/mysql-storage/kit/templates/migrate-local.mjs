import { readPlan, migrateLocal } from './migrations.mjs';
const [operation, directory, approval] = process.argv.slice(2);
try {
  if (operation === '--check' && directory && !approval) {
    const plan = await readPlan(directory);
    console.log(JSON.stringify(plan.map(({ id, checksum }) => ({ id, checksum }))));
  } else if (operation === '--apply' && directory && approval) {
    const config = { mode: process.env.APP_MODE, host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER };
    if (process.env.NODE_ENV === 'production' || !process.env.DB_PASSWORD || /<|\{|replace/i.test(process.env.DB_PASSWORD)) throw new Error('Unsafe local configuration');
    const result = await migrateLocal({ directory, config, approval, connect: async (target) => {
      const mysql = await import('mysql2/promise');
      const { mode, ...connection } = target;
      return mysql.createConnection({ ...connection, password: process.env.DB_PASSWORD, multipleStatements: false });
    } });
    console.log(JSON.stringify(result));
  } else throw new Error('Invalid invocation');
} catch {
  console.error('Migration refused or failed. Inspect the reviewed plan and private recovery record; no automatic retry.');
  process.exitCode = 1;
}
