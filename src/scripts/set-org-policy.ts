import "dotenv/config";
import { GatewayMode, ProviderId } from "../types";
import { OrgPolicyService } from "../policy/org-policy-service";
import { SqlitePolicyRepository } from "../policy/sqlite-policy-repository";
import { SqliteService } from "../storage/sqlite";

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
const listOnly = process.argv.includes("--list");

const sqlite = new SqliteService();
const policies = new OrgPolicyService(new SqlitePolicyRepository(sqlite));

async function main() {
  if (listOnly) {
    console.log(JSON.stringify(await policies.listPolicies(), null, 2));
    return;
  }

  if (!orgId) {
    console.error("Usage: npm run policy:set -- --org <org-id> [--mode private_plus] [--providers local_qwen,openai]");
    console.error("       npm run policy:set -- --list");
    process.exit(1);
  }

  const existing = await policies.ensureDefaultPolicy(orgId);
  const policy = await policies.upsertPolicy({
    orgId,
    defaultMode: (getArg("--mode") as GatewayMode | undefined) ?? existing.defaultMode,
    allowBringYourOwnKey: parseBool(getArg("--allow-byok"), existing.allowBringYourOwnKey),
    allowPlatformManagedKeys: parseBool(getArg("--allow-platform"), existing.allowPlatformManagedKeys),
    allowedProviders:
      (getArg("--providers")?.split(",").map((value) => value.trim()).filter(Boolean) as ProviderId[] | undefined)
      ?? existing.allowedProviders,
    allowAuditView: parseBool(getArg("--allow-audit"), existing.allowAuditView),
    requireExternalOptIn: parseBool(getArg("--require-opt-in"), existing.requireExternalOptIn)
  });

  console.log(JSON.stringify(policy, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
