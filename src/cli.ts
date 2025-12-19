#!/usr/bin/env node

import { Command } from "commander";
import { ProverClient } from "./client/prover_client.js";
import fs from "fs";
import { Config } from "config.js";

async function main() {
  const api = new ProverClient();
  const program = new Command();

  program
    .command("uploadProgram")
    .description("uploadProgram.")
    .requiredOption("--filepath <FILEPATH>", "Program file path")
    .option("--name <NAME>", "Program Name", "Default Name")
    .option("--version <VERSION>", "Version number", "1.0")
    .option("--description <DESCRIPTION>", "Description", "Default description.")
    .action(async (opts) => {
      console.log("uploadProgram");
      const result = await api.uploadProgram(opts.filepath, 'My Program', '1.0', 'Program description');
      console.log('Program uploaded, ID:', result.program_id);
    });

  program
    .command("submitTask")
    .description("submitTask.")
    .requiredOption("--filepath <FILEPATH>", "Attestation data file path")
    .option("--programId <PROGRAM_ID>", "Program id")
    .action(async (opts) => {
      console.log("submitTask");
      const attestation_data = fs.readFileSync(opts.filepath, { encoding: "utf-8" });
      const result = await api.submitTask(attestation_data, opts.programId || Config.PROGRAM_ID);
      console.log('Task submitted:', result);
    });

  program
    .command("getResult")
    .description("getResult.")
    .requiredOption("--taskId <TASK_ID>", "Task id")
    .action(async (opts) => {
      console.log("getResult");
      const result = await api.getResult(opts.taskId);
      console.log('getResult:', result);
    });

  program.parseAsync();
}

main();
