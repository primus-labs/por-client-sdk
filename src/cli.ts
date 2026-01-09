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
    .option("--replace", "Replace existing program if set", false)
    .option("--name <NAME>", "Program Name", "Default Name")
    .option("--version <VERSION>", "Version number", "1.0")
    .option("--description <DESCRIPTION>", "Description", "Default description.")
    .action(async (opts) => {
      console.log("uploadProgram");
      const result = await api.uploadProgram(opts.filepath, config.app.identity.projectId, opts.replace, 'My Program', '1.0', 'Program description');
      console.log('Program uploaded, ID:', result);
    });

  program
    .command("submitTask")
    .description("submitTask.")
    .requiredOption("--filepath <FILEPATH>", "Attestation data file path")
    .action(async (opts) => {
      console.log("submitTask");
      const attestation_data = fs.readFileSync(opts.filepath, { encoding: "utf-8" });
      const result = await api.submitTask({
        userToken: config.app.identity.userToken,
        projectId: config.app.identity.projectId,
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
        userToken: config.app.identity.userToken,
        projectId: config.app.identity.projectId,
        network: config.app.blockchain.network,
        attestationData: attestation_data,
      });
      console.log('result:', result);
    });

  program.parseAsync();
}

main();
