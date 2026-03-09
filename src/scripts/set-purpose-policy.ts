import "dotenv/config";
import { ConsentPurposeService } from "../policy/consent-purpose-service";
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
const purpose = getArg("--purpose");
const listOnly = process.argv.includes("--list");

const sqlite = new SqliteService();
const service = new ConsentPurposeService(new SqlitePolicyRepository(sqlite));

async function main() {
  if (listOnly) {
    if (!orgId) {
      console.error("Usage: npm run purpose:set -- --list --org <org-id>");
      process.exit(1);
    }
    console.log(JSON.stringify(await service.ensureDefaultPolicies(orgId), null, 2));
    return;
  }

  if (!orgId || !purpose) {
    console.error("Usage: npm run purpose:set -- --org <org-id> --purpose <purpose>");
    process.exit(1);
  }

  const existing = (await service.getPurposePolicy(orgId, purpose)) ?? {
    orgId,
    purpose,
    allowLocal: true,
    allowExternal: false,
    requireUserConsent: true,
    requireHumanApproval: false,
    updatedAt: new Date().toISOString()
  };

  console.log(
    JSON.stringify(
      await service.upsertPurposePolicy({
        orgId,
        purpose,
        allowLocal: parseBool(getArg("--allow-local"), existing.allowLocal),
        allowExternal: parseBool(getArg("--allow-external"), existing.allowExternal),
        requireUserConsent: parseBool(getArg("--require-consent"), existing.requireUserConsent),
        requireHumanApproval: parseBool(getArg("--require-approval"), existing.requireHumanApproval)
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
