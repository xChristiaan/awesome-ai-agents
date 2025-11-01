import express from "express";
import dotenv from "dotenv";
import pino from "pino";
import { agentRunner, AgentConfigValidationError } from "./agent/runner.js";

dotenv.config();

const app = express();
const logger = pino();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/run", async (req, res) => {
  const { file, input } = req.body ?? {};
  if (typeof file !== "string" || file.length === 0) {
    return res.status(400).json({ error: "'file' is required" });
  }
  if (typeof input !== "string") {
    return res.status(400).json({ error: "'input' is required" });
  }
  try {
    const { result } = await agentRunner.run(file, input);
    res.json({ status: "ok", result });
  } catch (error) {
    if (error instanceof AgentConfigValidationError) {
      res.status(400).json({ error: error.message, details: error.details });
    } else {
      logger.error({ err: error }, "Failed to run agent");
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

app.post("/stop", (_req, res) => {
  const state = agentRunner.stop();
  res.json({ status: "ok", state });
});

app.get("/state", (_req, res) => {
  res.json({ status: "ok", state: agentRunner.getState() });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  logger.info({ port }, "Agent server listening");
});
