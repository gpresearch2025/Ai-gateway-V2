import type { GatewaySession, UserRole } from "./rbac-auth";
import type { MaybePromise } from "../storage/maybe-promise";

export interface UserRecord {
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface UserMembershipRecord {
  username: string;
  orgId: string;
  orgName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  membershipCount: number;
}

export interface UpsertUserRecordInput {
  username: string;
  passwordHash: string;
  orgId: string;
  orgName: string;
  role: UserRole;
  now: string;
}

export interface AuthRepository {
  upsertUser(input: UpsertUserRecordInput): MaybePromise<void>;
  listUsers(): MaybePromise<UserMembershipRecord[]>;
  listOrganizations(): MaybePromise<OrganizationRecord[]>;
  getOrganization(orgId: string): MaybePromise<OrganizationRecord | undefined>;
  listMembershipsForUser(username: string): MaybePromise<UserMembershipRecord[]>;
  listMembershipsForOrg(orgId: string): MaybePromise<UserMembershipRecord[]>;
  findUserForLogin(username: string, orgId: string): MaybePromise<UserRecord | undefined>;
  assignMembership(
    username: string,
    orgId: string,
    orgName: string,
    role: UserRole,
    now: string
  ): MaybePromise<boolean>;
  updateOrganizationName(orgId: string, name: string, now: string): MaybePromise<boolean>;
  removeMembership(username: string, orgId: string): MaybePromise<boolean>;
  updateUserRole(username: string, orgId: string, role: UserRole, now: string): MaybePromise<boolean>;
  updateUserPassword(username: string, passwordHash: string, now: string): MaybePromise<boolean>;
  createSession(session: GatewaySession): MaybePromise<void>;
  getSession(sessionId: string): MaybePromise<GatewaySession | undefined>;
  deleteSession(sessionId: string): MaybePromise<void>;
  pruneExpiredSessions(now: string): MaybePromise<void>;
}
