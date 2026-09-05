// Explicitly test-only. Production must use the reviewed durable adapter.
export function createMemoryStore() {
  let data = new Map();
  let pending = Promise.resolve();
  return {
    durable: false,
    async ready() {},
    transaction(fn) {
      const run = pending.then(async () => {
        const next = structuredClone(data);
        const tx = {
          async get(bucket, id) { return structuredClone(next.get(bucket + ':' + id)); },
          async put(bucket, id, value) { next.set(bucket + ':' + id, structuredClone(value)); },
          async remove(bucket, id) { next.delete(bucket + ':' + id); }
        };
        const result = await fn(tx);
        data = next;
        return result;
      });
      pending = run.catch(() => {});
      return run;
    }
  };
}
