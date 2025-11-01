export type ToolType = "http" | "python" | "db" | "search";

export interface ToolConfig {
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  type: ToolType;
  config?: ToolConfig;
  allowed_hosts?: string[];
}

export interface AgentConfig {
  schema_version?: string;
  name: string;
  description?: string;
  model: string;
  temperature?: number;
  instructions: string;
  tools?: Tool[];
  triggers?: Array<"cron" | "webhook" | "manual">;
}

export type RunnerStatus = "idle" | "running" | "stopped";

export interface AgentState {
  status: RunnerStatus;
  lastRunAt?: string;
  lastInput?: string;
  lastResult?: string;
  agentName?: string;
}
