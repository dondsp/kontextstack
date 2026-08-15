#!/usr/bin/env node

import { main } from "../src/cli/main.js";

main().catch((error) => {
  process.stderr.write(`KontextStack error: ${error.message}\n`);
  process.exitCode = 1;
});
