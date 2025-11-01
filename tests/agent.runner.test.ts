import { describe, expect, it, beforeEach } from "vitest";
import path from "path";
import { agentRunner, AgentConfigValidationError } from "../src/agent/runner.js";

const demoPath = path.resolve("tests/fixtures/demo-agent.json");
const invalidPath = path.resolve("tests/fixtures/invalid-agent.json");

describe("AgentRunner", () => {
  beforeEach(() => {
    agentRunner.reset();
  });

  it("loads a valid agent configuration", async () => {
    const config = await agentRunner.loadConfig(demoPath);
    expect(config.name).toBe("demo-search-agent");
    expect(config.tools?.[0]?.type).toBe("search");
  });

  it("throws a validation error for invalid configuration", async () => {
    await expect(agentRunner.loadConfig(invalidPath)).rejects.toBeInstanceOf(
      AgentConfigValidationError
    );
  });

  it("runs the agent and uses the search tool when available", async () => {
    const { result } = await agentRunner.run(demoPath, "suche Rust tutorials");
    expect(result).toBe("SEARCH: suche Rust tutorials");
    const state = agentRunner.getState();
    expect(state.status).toBe("idle");
    expect(state.lastResult).toBe("SEARCH: suche Rust tutorials");
    expect(state.lastRunAt).toBeDefined();
  });
});
