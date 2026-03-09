import crypto from "node:crypto";
import { AuthRepository } from "./auth-repository";
import { OrgPolicyService } from "../policy/org-policy-service";
import { hashPassword, verifyPassword } from "./passwords";
import { PolicyRepository } from "../policy/policy-repository";

export type UserRole = "admin" | "member" | "auditor";

export interface GatewaySession {
  id: string;
  username: string;
  orgId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

export class RbacAuthService {
  private readonly sessionTtlSeconds = 60 * 60 * 8;
  private readonly policies: OrgPolicyService;

  constructor(
    private readonly authRepository: AuthRepository,
    policyRepository: PolicyRepository
  ) {
    this.policies = new OrgPolicyService(policyRepository);
  }

  async seedFromEnv() {
    const username = process.env.ADMIN_USERNAME ?? "admin";
    const password = process.env.ADMIN_PASSWORD;
    const orgId = process.env.DEFAULT_ORG_ID ?? "demo-org";
    const orgName = process.env.DEFAULT_ORG_NAME ?? "Demo Org";

    if (!password) {
      return;
    }

    await this.upsertUser({
      username,
      password,
      orgId,
      orgName,
      role: "admin"
    });
  }

  async upsertUser(input: {
    username: string;
    password: string;
    orgId: string;
    orgName?: string;
    role: UserRole;
  }) {
    if (!input.username || !input.password || !input.orgId || !input.role) {
      throw new Error("username_password_org_and_role_required");
    }

    const now = new Date().toISOString();
    const passwordHash = hashPassword(input.password);

    await this.authRepository.upsertUser({
      username: input.username,
      passwordHash,
      orgId: input.orgId,
      orgName: input.orgName ?? input.orgId,
      role: input.role,
      now
    });

    await this.policies.ensureDefaultPolicy(input.orgId);

    return {
      username: input.username,
      orgId: input.orgId,
      role: input.role,
      updatedAt: now
    };
  }

  async listUsers() {
    return await this.authRepository.listUsers();
  }

  async listOrganizations() {
    return await this.authRepository.listOrganizations();
  }

  async getOrganization(orgId: string) {
    return await this.authRepository.getOrganization(orgId);
  }

  async listMembershipsForUser(username: string) {
    return await this.authRepository.listMembershipsForUser(username);
  }

  async listMembershipsForOrg(orgId: string) {
    return await this.authRepository.listMembershipsForOrg(orgId);
  }

  async assignMembership(input: {
    username: string;
    orgId: string;
    orgName?: string;
    role: UserRole;
  }) {
    if (!input.username || !input.orgId || !input.role) {
      throw new Error("username_org_and_role_required");
    }

    const updatedAt = new Date().toISOString();
    const orgName = input.orgName?.trim() || input.orgId;
    const assigned = await this.authRepository.assignMembership(
      input.username,
      input.orgId,
      orgName,
      input.role,
      updatedAt
    );
    if (!assigned) {
      return undefined;
    }

    await this.policies.ensureDefaultPolicy(input.orgId);

    return {
      username: input.username,
      orgId: input.orgId,
      orgName,
      role: input.role,
      updatedAt
    };
  }

  async renameOrganization(input: { orgId: string; name: string }) {
    if (!input.orgId || !input.name.trim()) {
      throw new Error("org_and_name_required");
    }

    const updatedAt = new Date().toISOString();
    const updated = await this.authRepository.updateOrganizationName(input.orgId, input.name.trim(), updatedAt);
    if (!updated) {
      return undefined;
    }
    return {
      orgId: input.orgId,
      name: input.name.trim(),
      updatedAt
    };
  }

  async removeMembership(input: { username: string; orgId: string }) {
    if (!input.username || !input.orgId) {
      throw new Error("username_and_org_required");
    }

    const removed = await this.authRepository.removeMembership(input.username, input.orgId);
    if (!removed) {
      return undefined;
    }

    return {
      username: input.username,
      orgId: input.orgId,
      removed: true
    };
  }

  async updateUserRole(input: { username: string; orgId: string; role: UserRole }) {
    const updatedAt = new Date().toISOString();
    const updated = await this.authRepository.updateUserRole(input.username, input.orgId, input.role, updatedAt);
    if (!updated) {
      return undefined;
    }
    return {
      username: input.username,
      orgId: input.orgId,
      role: input.role,
      updatedAt
    };
  }

  async resetUserPassword(input: { username: string; password: string }) {
    if (!input.username || !input.password) {
      throw new Error("username_and_password_required");
    }

    const updatedAt = new Date().toISOString();
    const updated = await this.authRepository.updateUserPassword(
      input.username,
      hashPassword(input.password),
      updatedAt
    );
    if (!updated) {
      return undefined;
    }
    return {
      username: input.username,
      updatedAt
    };
  }

  async login(username: string, password: string, orgId: string): Promise<GatewaySession | undefined> {
    const row = await this.authRepository.findUserForLogin(username, orgId);

    if (!row || !verifyPassword(password, row.passwordHash)) {
      return undefined;
    }

    const session: GatewaySession = {
      id: crypto.randomUUID(),
      username,
      orgId,
      role: row.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.sessionTtlSeconds * 1000).toISOString()
    };

    await this.authRepository.createSession(session);

    return session;
  }

  async switchOrg(sessionId: string | undefined, username: string, orgId: string): Promise<GatewaySession | undefined> {
    if (!sessionId || !username || !orgId) {
      return undefined;
    }

    const membership = (await this.authRepository.listMembershipsForUser(username)).find((item) => item.orgId === orgId);
    if (!membership) {
      return undefined;
    }

    await this.deleteSession(sessionId);

    const session: GatewaySession = {
      id: crypto.randomUUID(),
      username,
      orgId,
      role: membership.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.sessionTtlSeconds * 1000).toISOString()
    };

    await this.authRepository.createSession(session);
    return session;
  }

  async getSession(sessionId: string | undefined): Promise<GatewaySession | undefined> {
    if (!sessionId) {
      return undefined;
    }

    const row = await this.authRepository.getSession(sessionId);

    if (!row) {
      return undefined;
    }

    if (new Date(row.expiresAt).getTime() <= Date.now()) {
      await this.deleteSession(sessionId);
      return undefined;
    }

    return row;
  }

  async deleteSession(sessionId: string | undefined) {
    if (!sessionId) {
      return;
    }

    await this.authRepository.deleteSession(sessionId);
  }

  async pruneExpiredSessions() {
    await this.authRepository.pruneExpiredSessions(new Date().toISOString());
  }
}
