import "dotenv/config";
import { buildRuntime } from "./app/runtime";
import { getAppConfig } from "./config/app-config";

const config = getAppConfig();
const intervalMs = config.jobWorkerIntervalMs;

async function main() {
  const { gateway } = await buildRuntime();
  console.log(`AI Gateway worker polling every ${intervalMs}ms`);

  setInterval(() => {
    gateway.processNextExecutionJob().catch((error) => {
      console.error("Execution job failed", error);
    });
  }, intervalMs);
}

main().catch((error) => {
  console.error("Failed to start AI Gateway worker", error);
  process.exit(1);
});
