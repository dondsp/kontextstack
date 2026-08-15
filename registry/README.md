# Module Registry

The registry is versioned metadata, not an execution service. The alpha reads
this bundled index only. A later explicit `modules refresh` command may download
a versioned public index, validate it in a temporary location, verify immutable
module integrity, and atomically replace a local cache.

Network failure must retain the previous valid cache. Registry discovery must
never execute module code or silently update KontextStack core.
