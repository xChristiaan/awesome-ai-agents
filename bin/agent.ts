#!/usr/bin/env ts-node
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { agentRunner, AgentConfigValidationError } from "../src/agent/runner.js";

dotenv.config();

yargs(hideBin(process.argv))
  .scriptName("agent")
  .command(
    "run",
    "Run an agent from a JSON blueprint",
    (cmd) =>
      cmd
        .option("file", {
          type: "string",
          demandOption: true,
          describe: "Path to the agent JSON file",
        })
        .option("input", {
          type: "string",
          demandOption: true,
          describe: "Input prompt for the agent",
        }),
    async (argv) => {
      const filePath = argv.file as string;
      const input = argv.input as string;
      try {
        const { result } = await agentRunner.run(filePath, input);
        console.log(result);
      } catch (error) {
        if (error instanceof AgentConfigValidationError) {
          console.error(error.message);
        } else {
          console.error((error as Error).message);
        }
        process.exitCode = 1;
      }
    }
  )
  .command(
    "state",
    "Show the last known agent state",
    (cmd) =>
      cmd.option("file", {
        type: "string",
        describe: "Path to the agent JSON file (optional, used to refresh config cache)",
      }),
    async (argv) => {
      const filePath = argv.file as string | undefined;
      if (filePath) {
        try {
          if (!agentRunner.getCurrentConfig()) {
            await agentRunner.loadConfig(filePath);
          }
        } catch (error) {
          console.error((error as Error).message);
          process.exitCode = 1;
          return;
        }
      }
      console.log(JSON.stringify(agentRunner.getState(), null, 2));
    }
  )
  .command(
    "stop",
    "Stop the currently running agent",
    () => {},
    () => {
      const state = agentRunner.stop();
      console.log(JSON.stringify(state, null, 2));
    }
  )
  .demandCommand(1)
  .strict()
  .help().argv;
