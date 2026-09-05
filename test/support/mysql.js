// Isolated server owned by this test; never reads machine MySQL defaults.
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import mysql from 'mysql2/promise';
export async function disposableMysql() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kit-mysql-'));
  const binary = process.env.KIT_MYSQLD || 'mysqld';
  const socketPath = path.join(root, 'db.sock');
  const init = spawnSync(binary, ['--no-defaults', '--initialize-insecure', '--datadir='+root], {encoding:'utf8'});
  if (init.status !== 0) { await rm(root,{recursive:true,force:true}); throw new Error('Disposable MySQL initialization failed: install MySQL or set KIT_MYSQLD'); }
  const server = spawn(binary, ['--no-defaults', '--datadir='+root, '--socket='+socketPath, '--skip-networking', '--mysqlx=OFF', '--pid-file='+path.join(root,'pid'), '--log-error='+path.join(root,'error.log')], {stdio:'ignore'});
  const exited = once(server, 'exit');
  const connection = {socketPath,user:'root'};
  let db;
  try {
    for(let i=0;i<100;i++) {
      try { db = await mysql.createConnection(connection); break; } catch {}
      if(server.exitCode !== null) throw new Error('Disposable MySQL stopped');
      await new Promise(r=>setTimeout(r,100));
    }
    if(!db) throw new Error('Disposable MySQL startup timed out');
    await db.query('CREATE DATABASE fixture_auth');
    await db.end();
  } catch(error) {
    server.kill('SIGTERM');await exited;await rm(root,{recursive:true,force:true});throw error;
  }
  return {
    connection:{...connection,database:'fixture_auth',multipleStatements:false},
    async close(){server.kill('SIGTERM');await exited;await rm(root,{recursive:true,force:true});}
  };
}
