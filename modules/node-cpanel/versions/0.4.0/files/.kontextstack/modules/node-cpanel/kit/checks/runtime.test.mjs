// Copy next to runtime.mjs as test/runtime.test.mjs and run node --test.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer, runtimeConfig } from "../runtime.mjs";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

const config = () => runtimeConfig({
  NODE_ENV: "test", PORT: "4000", SERVICE_NAME: "runtime-fixture",
  APP_BASE_URL: "http://127.0.0.1:4000", TRUST_PROXY: "false"
});
async function withServer(t, ready = async () => true) {
  const events = [];
  const server = await createServer({
    config: config(), publicRoot: fileURLToPath(new URL("../public", import.meta.url)),
    isReady: ready, log: (event) => events.push(event)
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  return { origin: "http://127.0.0.1:" + server.address().port, events };
}
test("runtime configuration fails closed", () => {
  assert.throws(() => runtimeConfig({ NODE_ENV: "production" }));
  const env = { NODE_ENV: "production", PORT: "4200", SERVICE_NAME: "runtime-fixture", APP_BASE_URL: "https://app.example.invalid" };
  assert.equal(runtimeConfig(env).port, 4200);
  for (const override of [{ PORT: "42oops" }, { PORT: "0" }, { PORT: "65536" }, { APP_BASE_URL: "http://app.example.invalid" }, { TRUST_PROXY: "true" }, { SERVICE_NAME: "<SERVICE_NAME>" }]) {
    assert.throws(() => runtimeConfig({ ...env, ...override }));
  }
});
test("health, readiness, APIs, assets and deep routes have separate contracts", async (t) => {
  const { origin, events } = await withServer(t);
  const health = await fetch(origin + "/api/health");
  assert.deepEqual(await health.json(), { ok: true, service: "runtime-fixture" });
  assert.equal((await fetch(origin + "/api/ready")).status, 200);
  const missing = await fetch(origin + "/api/missing");
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("content-type"), /application\/json/);
  assert.equal((await fetch(origin + "/missing.css")).status, 404);
  assert.equal((await fetch(origin + "/.env")).status, 404);
  assert.match((await fetch(origin + "/site.css")).headers.get("content-type"), /text\/css/);
  assert.match(await (await fetch(origin + "/deep/link", { headers: { Accept: "text/html" } })).text(), /Runtime fixture/);
  assert.equal((await fetch(origin + "/deep/link", { headers: { Accept: "application/json" } })).status, 404);
  assert.equal((await fetch(origin + "/", { method: "POST", body: "synthetic-body" })).status, 405);
  assert.equal(await (await fetch(origin + "/site.css", { method: "HEAD" })).text(), "");
  assert.ok(events.every((event) => Object.keys(event).sort().join(",") === "event,status"));
});
test("readiness errors fail closed without changing liveness or exposing errors", async (t) => {
  const { origin } = await withServer(t, async () => { throw new Error("synthetic-private-diagnostic"); });
  assert.equal((await fetch(origin + "/api/health")).status, 200);
  const response = await fetch(origin + "/api/ready");
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ready: false });
});
