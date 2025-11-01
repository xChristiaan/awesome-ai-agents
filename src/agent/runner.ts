import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { ValidateFunction } from "ajv";
import { defaultToolRegistry } from "./registry.js";
import type { AgentConfig, AgentState } from "./types.js";

export class AgentConfigValidationError extends Error {
  constructor(message: string, public details: string[] = []) {
    super(message);
    this.name = "AgentConfigValidationError";
  }
}

type RunResult = {
  result: string;
  config: AgentConfig;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../../schemas/agent.schema.json");

const schemaContent = JSON.parse(readFileSync(schemaPath, "utf-8"));

export class AgentRunner {
  private ajv: Ajv;
  private validateConfig: ValidateFunction<AgentConfig>;
  private state: AgentState = { status: "idle" };
  private currentConfig?: AgentConfig;
  private currentFilePath?: string;

  constructor() {
    this.ajv = new Ajv({
      strict: false,
      allErrors: true,
      allowUnionTypes: true,
    });
    addFormats(this.ajv);
    this.validateConfig = this.ajv.compile<AgentConfig>(schemaContent);
  }

  private buildValidationError(): AgentConfigValidationError {
    const errors = this.validateConfig.errors ?? [];
    const details = errors.map((err) => {
      const instancePath = err.instancePath || err.schemaPath;
      return `${instancePath} ${err.message ?? "validation error"}`.trim();
    });
    const message =
      details.length > 0
        ? `Agent configuration validation failed: ${details.join("; ")}`
        : "Agent configuration validation failed";
    return new AgentConfigValidationError(message, details);
  }

  private assertNotRunning() {
    if (this.state.status === "running") {
      throw new Error("Agent is already running");
    }
  }

  private updateState(partial: Partial<AgentState>) {
    this.state = { ...this.state, ...partial };
  }

  async loadConfig(filePath: string): Promise<AgentConfig> {
    const resolvedPath = path.resolve(filePath);
    let raw: string;
    try {
      raw = await readFile(resolvedPath, "utf-8");
    } catch (error) {
      throw new Error(`Unable to read agent config at '${resolvedPath}': ${(error as Error).message}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON in agent config '${resolvedPath}': ${(error as Error).message}`);
    }

    if (!this.validateConfig(parsed)) {
      throw this.buildValidationError();
    }

    const config = parsed as AgentConfig;
    this.currentConfig = config;
    this.currentFilePath = resolvedPath;
    return config;
  }

  async run(filePath: string, input: string): Promise<RunResult> {
    this.assertNotRunning();
    const config = await this.loadConfig(filePath);
    this.updateState({
      status: "running",
      agentName: config.name,
      lastInput: input,
      lastRunAt: new Date().toISOString(),
      lastResult: undefined,
    });

    try {
      const result = await this.execute(config, input);
      this.updateState({ status: "idle", lastResult: result });
      return { result, config };
    } catch (error) {
      this.updateState({ status: "idle" });
      throw error;
    }
  }

  private async execute(config: AgentConfig, input: string): Promise<string> {
    const tool = config.tools?.find((item) => item.type === "search");
    if (tool) {
      return await defaultToolRegistry.invoke(tool, input);
    }
    return `[${config.name}] ${input}`;
  }

  stop(): AgentState {
    if (this.state.status === "running") {
      this.updateState({ status: "stopped", lastResult: "Stopped" });
    } else {
      this.updateState({ status: "stopped" });
    }
    return this.getState();
  }

  reset(): AgentState {
    this.currentConfig = undefined;
    this.currentFilePath = undefined;
    this.state = { status: "idle" };
    return this.getState();
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getCurrentConfig(): AgentConfig | undefined {
    return this.currentConfig;
  }

  getCurrentFilePath(): string | undefined {
    return this.currentFilePath;
  }
}

export const agentRunner = new AgentRunner();
