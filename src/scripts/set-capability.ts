import "dotenv/config";
import { CapabilityRegistryService } from "../policy/capability-registry-service";
import { SqlitePolicyRepository } from "../policy/sqlite-policy-repository";
import { SqliteService } from "../storage/sqlite";
import { GatewayMode, ProviderId } from "../types";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === "true" || value === "1" || value === "yes";
}

const orgId = getArg("--org");
const provider = getArg("--provider") as ProviderId | undefined;
const modelId = getArg("--model");
const listOnly = process.argv.includes("--list");

const sqlite = new SqliteService();
const registry = new CapabilityRegistryService(new SqlitePolicyRepository(sqlite));

async function main() {
  if (listOnly) {
    if (!orgId) {
      console.error("Usage: npm run capability:set -- --list --org <org-id>");
      process.exit(1);
    }
    console.log(JSON.stringify(await registry.ensureDefaults(orgId), null, 2));
    return;
  }

  if (!orgId || !provider || !modelId) {
    console.error("Usage: npm run capability:set -- --org <org-id> --provider <provider> --model <model-id> [--enabled true]");
    process.exit(1);
  }

  const existing = (await registry.ensureDefaults(orgId)).find(
    (capability) => capability.provider === provider && capability.modelId === modelId
  ) ?? {
    orgId,
    provider,
    modelId,
    enabled: true,
    supportsText: true,
    supportsImages: false,
    supportsTools: false,
    supportsReasoning: false,
    maxMode: "private_plus" as GatewayMode,
    updatedAt: new Date().toISOString()
  };

  console.log(
    JSON.stringify(
      await registry.upsertCapability({
        orgId,
        provider,
        modelId,
        enabled: parseBool(getArg("--enabled"), existing.enabled),
        supportsText: parseBool(getArg("--text"), existing.supportsText),
        supportsImages: parseBool(getArg("--images"), existing.supportsImages),
        supportsTools: parseBool(getArg("--tools"), existing.supportsTools),
        supportsReasoning: parseBool(getArg("--reasoning"), existing.supportsReasoning),
        maxMode: (getArg("--max-mode") as GatewayMode | undefined) ?? existing.maxMode
      }),
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
