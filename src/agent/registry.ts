import type { Tool } from "./types.js";

type ToolHandler = (tool: Tool, input: string) => Promise<string> | string;

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  constructor() {
    this.register("search", async (_tool, input) => `SEARCH: ${input}`);
  }

  register(type: string, handler: ToolHandler) {
    this.handlers.set(type, handler);
  }

  async invoke(tool: Tool, input: string): Promise<string> {
    const handler = this.handlers.get(tool.type);
    if (!handler) {
      throw new Error(`No handler registered for tool type '${tool.type}'`);
    }
    return await handler(tool, input);
  }
}

export const defaultToolRegistry = new ToolRegistry();
