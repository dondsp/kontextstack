// cPanel-compatible CommonJS shim. Adapt the import to the one canonical server.
(async () => {
  const path = require("node:path");
  const { runtimeConfig, createServer, attachShutdown } = await import("./runtime.mjs");
  const config = runtimeConfig();
  const server = await createServer({
    config,
    publicRoot: path.join(__dirname, "public"),
    log: (event) => process.stdout.write(JSON.stringify(event) + "\n")
  });
  attachShutdown(server);
  server.on("error", () => {
    process.stderr.write("Runtime listener failed; details withheld.\n");
    process.exitCode = 1;
  });
  server.listen(config.port, config.host, () => {
    process.stdout.write(JSON.stringify({ event: "runtime-ready", service: config.service }) + "\n");
  });
})().catch(() => {
  process.stderr.write("Runtime startup failed; review configuration and artifact without exposing values.\n");
  process.exitCode = 1;
});
