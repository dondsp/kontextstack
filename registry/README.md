# Module Registry

The registry is versioned metadata, not an execution service. Each KontextStack
package reads its bundled index only. A future explicit `modules refresh`
command may download a versioned public index, validate it in a temporary
location, verify immutable module integrity, and atomically replace a local
cache.

Network failure must retain the previous valid cache. Registry discovery must
never execute module code or silently update KontextStack core.

Remote refresh remains unavailable. `modules import` accepts a reviewed local
directory, validates its canonical metadata and fingerprint, and copies only
its manifest and declared text files into the local filesystem cache. Invalid
cache entries are ignored and cannot become executable.
