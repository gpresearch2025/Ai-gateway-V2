import { PostgresAuthRepository } from "../auth/postgres-auth-repository";
import { RbacAuthService } from "../auth/rbac-auth";
import { SqliteAuthRepository } from "../auth/sqlite-auth-repository";
import { AuditLogService } from "../audit/audit-log";
import { PostgresAuditRepository } from "../audit/postgres-audit-repository";
import { SqliteAuditRepository } from "../audit/sqlite-audit-repository";
import { getAppConfig } from "../config/app-config";
import { KeyVaultService } from "../keys/key-vault";
import { PostgresCredentialRepository } from "../keys/postgres-credential-repository";
import { SqliteCredentialRepository } from "../keys/sqlite-credential-repository";
import { ApprovalService } from "../policy/approval-service";
import { CapabilityRegistryService } from "../policy/capability-registry-service";
import { ConsentPurposeService } from "../policy/consent-purpose-service";
import { ExecutionJobService } from "../policy/execution-job-service";
import { OrgPolicyService } from "../policy/org-policy-service";
import { PostgresPolicyRepository } from "../policy/postgres-policy-repository";
import { PostgresWorkflowRepository } from "../policy/postgres-workflow-repository";
import { SqlitePolicyRepository } from "../policy/sqlite-policy-repository";
import { SqliteWorkflowRepository } from "../policy/sqlite-workflow-repository";
import { GatewayService } from "../services/gateway-service";
import { createStorage } from "../storage/factory";
import { PostgresService } from "../storage/postgres";
import { SqliteService } from "../storage/sqlite";

export interface AppRuntime {
  gateway: GatewayService;
  auth: RbacAuthService;
}

export async function buildRuntime(): Promise<AppRuntime> {
  const config = getAppConfig();

  if (config.storageProvider === "postgres") {
    if (!config.postgresUrl) {
      throw new Error("POSTGRES_URL is required when DATABASE_PROVIDER=postgres.");
    }
    return await buildPostgresRuntime(config.postgresUrl);
  }

  return buildSqliteRuntime(createStorage() as SqliteService);
}

async function buildPostgresRuntime(connectionString: string): Promise<AppRuntime> {
  const postgres = await PostgresService.create(connectionString);
  const authRepository = new PostgresAuthRepository(postgres);
  const policyRepository = new PostgresPolicyRepository(postgres);
  const workflowRepository = new PostgresWorkflowRepository(postgres);

  return {
    auth: new RbacAuthService(authRepository, policyRepository),
    gateway: new GatewayService({
      approvals: new ApprovalService(workflowRepository),
      jobs: new ExecutionJobService(workflowRepository),
      capabilityRegistry: new CapabilityRegistryService(policyRepository),
      consentPurpose: new ConsentPurposeService(policyRepository),
      orgPolicies: new OrgPolicyService(policyRepository),
      audit: new AuditLogService(new PostgresAuditRepository(postgres)),
      keys: new KeyVaultService(new PostgresCredentialRepository(postgres))
    })
  };
}

function buildSqliteRuntime(sqlite: SqliteService): AppRuntime {
  const authRepository = new SqliteAuthRepository(sqlite);
  const policyRepository = new SqlitePolicyRepository(sqlite);
  const workflowRepository = new SqliteWorkflowRepository(sqlite);

  return {
    auth: new RbacAuthService(authRepository, policyRepository),
    gateway: new GatewayService({
      approvals: new ApprovalService(workflowRepository),
      jobs: new ExecutionJobService(workflowRepository),
      capabilityRegistry: new CapabilityRegistryService(policyRepository),
      consentPurpose: new ConsentPurposeService(policyRepository),
      orgPolicies: new OrgPolicyService(policyRepository),
      audit: new AuditLogService(new SqliteAuditRepository(sqlite)),
      keys: new KeyVaultService(new SqliteCredentialRepository(sqlite))
    })
  };
}
