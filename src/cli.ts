#!/usr/bin/env node

import { Command } from "commander";

async function main() {
  const program = new Command();

  program.parseAsync();
}

main();
