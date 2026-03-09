import "dotenv/config";
import { RbacAuthService, UserRole } from "../auth/rbac-auth";
import { SqliteAuthRepository } from "../auth/sqlite-auth-repository";
import { SqlitePolicyRepository } from "../policy/sqlite-policy-repository";
import { SqliteService } from "../storage/sqlite";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

const username = getArg("--username");
const password = getArg("--password");
const orgId = getArg("--org");
const orgName = getArg("--org-name");
const role = (getArg("--role") ?? "member") as UserRole;
const listOnly = process.argv.includes("--list");

const sqlite = new SqliteService();
const auth = new RbacAuthService(new SqliteAuthRepository(sqlite), new SqlitePolicyRepository(sqlite));

async function main() {
  if (listOnly) {
    console.log(JSON.stringify(await auth.listUsers(), null, 2));
    return;
  }

  if (!username || !password || !orgId) {
    console.error("Usage: npm run user:create -- --username <name> --password <password> --org <org-id> --role <admin|member|auditor>");
    console.error("       npm run user:create -- --list");
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      await auth.upsertUser({
        username,
        password,
        orgId,
        orgName,
        role
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
