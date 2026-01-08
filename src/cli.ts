#!/usr/bin/env node

import { Command } from "commander";
import { ProverClient } from "./client/prover_client.js";
import { loadConfigFromFile } from "./config_schema.js";
import fs from "fs";

async function main() {
  const config = loadConfigFromFile();
  const api = new ProverClient(config.app.services.zkvm.url);
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
    .action(async (opts) => {
      console.log("submitTask");
      const attestation_data = fs.readFileSync(opts.filepath, { encoding: "utf-8" });
      const result = await api.submitTask({
        token: config.app.identity.token,
        projectId: config.app.identity.projectId,
        programId: config.app.identity.programId,
        network: config.app.blockchain.network,
        attestationData: attestation_data,
      });
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


  program
    .command("submitTaskAndGetResult")
    .description("submitTask and getResult.")
    .requiredOption("--filepath <FILEPATH>", "Attestation data file path")
    .action(async (opts) => {
      console.log("submitTask and getResult.");
      const attestation_data = fs.readFileSync(opts.filepath, { encoding: "utf-8" });
      const result = await api.doZkVM({
        token: config.app.identity.token,
        projectId: config.app.identity.projectId,
        programId: config.app.identity.programId,
        network: config.app.blockchain.network,
        attestationData: attestation_data,
      });
      console.log('result:', result);
    });

  program.parseAsync();
}

main();
