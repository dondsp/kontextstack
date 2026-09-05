import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import os from "node:os";
import path from "node:path";

// Test-only server: disposable config and loopback listener. Never host config.
export async function startApache(t, documentRoot) {
  const mac = process.platform === "darwin";
  const binary = mac ? "/usr/sbin/httpd" : "/usr/sbin/apache2";
  await access(binary); // Missing Apache is a failed phase gate, not a skipped test.
  const temporary = await mkdtemp(path.join(os.tmpdir(), "kontextstack-apache-"));
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const moduleRoot = mac ? "/usr/libexec/apache2" : "/usr/lib/apache2/modules";
  const compiled = spawnSync(binary, ["-l"], { encoding: "utf8" }).stdout;
  const modules = ["mpm_prefork", "unixd", "authz_core", "dir", "mime", "rewrite"];
  const loads = modules.filter((name) => !compiled.includes(`mod_${name}.c`))
    .map((name) => `LoadModule ${name}_module "${moduleRoot}/mod_${name}.so"`).join("\n");
  const config = path.join(temporary, "httpd.conf");
  await writeFile(config, `
ServerRoot "${temporary}"
PidFile "${temporary}/httpd.pid"
Listen 127.0.0.1:${port}
ServerName site.example.invalid
KeepAlive Off
ErrorLog "${temporary}/error.log"
LogLevel warn
${loads}
TypesConfig "${mac ? "/private/etc/apache2/mime.types" : "/etc/mime.types"}"
DocumentRoot "${documentRoot}"
<Directory "${documentRoot}">
  AllowOverride All
  Require all granted
  Options FollowSymLinks
</Directory>
`);
  const syntax = spawnSync(binary, ["-t", "-f", config], { encoding: "utf8" });
  if (syntax.status !== 0) throw new Error("Disposable Apache syntax failed: " + syntax.stderr);
  const child = spawn(binary, ["-X", "-f", config], { stdio: "ignore" });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await rm(temporary, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await fetch(origin); return origin; } catch {
      if (child.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("Disposable Apache did not start: " + await readFile(path.join(temporary, "error.log"), "utf8").catch(() => "no log"));
}
