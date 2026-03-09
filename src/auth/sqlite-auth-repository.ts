import { SqliteService } from "../storage/sqlite";
import {
  AuthRepository,
  OrganizationRecord,
  UpsertUserRecordInput,
  UserMembershipRecord,
  UserRecord
} from "./auth-repository";
import type { GatewaySession, UserRole } from "./rbac-auth";

export class SqliteAuthRepository implements AuthRepository {
  constructor(private readonly sqlite: SqliteService) {}

  upsertUser(input: UpsertUserRecordInput): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          updated_at = excluded.updated_at
      `)
      .run(input.orgId, input.orgName, input.now, input.now);

    this.sqlite.db
      .prepare(`
        INSERT INTO gateway_users (username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          password_hash = excluded.password_hash,
          updated_at = excluded.updated_at
      `)
      .run(input.username, input.passwordHash, input.now, input.now);

    this.sqlite.db
      .prepare(`
        INSERT INTO user_memberships (username, org_id, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(username, org_id) DO UPDATE SET
          role = excluded.role,
          updated_at = excluded.updated_at
      `)
      .run(input.username, input.orgId, input.role, input.now, input.now);
  }

  listUsers(): UserMembershipRecord[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT m.username, m.org_id, m.role, o.name AS org_name, m.created_at, m.updated_at
        FROM user_memberships m
        JOIN organizations o ON o.id = m.org_id
        ORDER BY m.org_id ASC, m.username ASC
      `)
      .all() as Array<{
        username: string;
        org_id: string;
        role: UserRole;
        org_name: string;
        created_at: string;
        updated_at: string;
      }>;

    return rows.map((row) => ({
      username: row.username,
      orgId: row.org_id,
      orgName: row.org_name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  listOrganizations(): OrganizationRecord[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT o.id, o.name, o.created_at, o.updated_at, COUNT(m.username) AS membership_count
        FROM organizations o
        LEFT JOIN user_memberships m ON m.org_id = o.id
        GROUP BY o.id, o.name, o.created_at, o.updated_at
        ORDER BY o.name ASC, o.id ASC
      `)
      .all() as Array<{
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        membership_count: number;
      }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      membershipCount: Number(row.membership_count)
    }));
  }

  getOrganization(orgId: string): OrganizationRecord | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT id, name, created_at, updated_at
        FROM organizations
        WHERE id = ?
      `)
      .get(orgId) as
      | {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      membershipCount: Number(
        (
          this.sqlite.db
            .prepare(`
              SELECT COUNT(*) AS count
              FROM user_memberships
              WHERE org_id = ?
            `)
            .get(orgId) as { count: number }
        ).count
      )
    };
  }

  listMembershipsForUser(username: string): UserMembershipRecord[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT m.username, m.org_id, m.role, o.name AS org_name, m.created_at, m.updated_at
        FROM user_memberships m
        JOIN organizations o ON o.id = m.org_id
        WHERE m.username = ?
        ORDER BY m.org_id ASC
      `)
      .all(username) as Array<{
        username: string;
        org_id: string;
        role: UserRole;
        org_name: string;
        created_at: string;
        updated_at: string;
      }>;

    return rows.map((row) => ({
      username: row.username,
      orgId: row.org_id,
      orgName: row.org_name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  listMembershipsForOrg(orgId: string): UserMembershipRecord[] {
    const rows = this.sqlite.db
      .prepare(`
        SELECT m.username, m.org_id, m.role, o.name AS org_name, m.created_at, m.updated_at
        FROM user_memberships m
        JOIN organizations o ON o.id = m.org_id
        WHERE m.org_id = ?
        ORDER BY m.username ASC
      `)
      .all(orgId) as Array<{
        username: string;
        org_id: string;
        role: UserRole;
        org_name: string;
        created_at: string;
        updated_at: string;
      }>;

    return rows.map((row) => ({
      username: row.username,
      orgId: row.org_id,
      orgName: row.org_name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  assignMembership(username: string, orgId: string, orgName: string, role: UserRole, now: string): boolean {
    const user = this.sqlite.db
      .prepare(`
        SELECT username
        FROM gateway_users
        WHERE username = ?
      `)
      .get(username) as { username: string } | undefined;

    if (!user) {
      return false;
    }

    this.sqlite.db
      .prepare(`
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          updated_at = excluded.updated_at
      `)
      .run(orgId, orgName, now, now);

    this.sqlite.db
      .prepare(`
        INSERT INTO user_memberships (username, org_id, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(username, org_id) DO UPDATE SET
          role = excluded.role,
          updated_at = excluded.updated_at
      `)
      .run(username, orgId, role, now, now);

    return true;
  }

  updateOrganizationName(orgId: string, name: string, now: string): boolean {
    const result = this.sqlite.db
      .prepare(`
        UPDATE organizations
        SET name = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(name, now, orgId);
    return Number(result.changes) > 0;
  }

  removeMembership(username: string, orgId: string): boolean {
    const countRow = this.sqlite.db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM user_memberships
        WHERE username = ?
      `)
      .get(username) as { count: number };

    if (Number(countRow.count) <= 1) {
      return false;
    }

    const result = this.sqlite.db
      .prepare(`
        DELETE FROM user_memberships
        WHERE username = ? AND org_id = ?
      `)
      .run(username, orgId);
    return Number(result.changes) > 0;
  }

  findUserForLogin(username: string, orgId: string): UserRecord | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT u.username, u.password_hash, m.role
        FROM gateway_users u
        JOIN user_memberships m ON m.username = u.username
        WHERE u.username = ? AND m.org_id = ?
      `)
      .get(username, orgId) as { username: string; password_hash: string; role: UserRole } | undefined;

    if (!row) {
      return undefined;
    }

    return {
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role
    };
  }

  updateUserRole(username: string, orgId: string, role: UserRole, now: string): boolean {
    const result = this.sqlite.db
      .prepare(`
        UPDATE user_memberships
        SET role = ?, updated_at = ?
        WHERE username = ? AND org_id = ?
      `)
      .run(role, now, username, orgId);
    return Number(result.changes) > 0;
  }

  updateUserPassword(username: string, passwordHash: string, now: string): boolean {
    const result = this.sqlite.db
      .prepare(`
        UPDATE gateway_users
        SET password_hash = ?, updated_at = ?
        WHERE username = ?
      `)
      .run(passwordHash, now, username);
    return Number(result.changes) > 0;
  }

  createSession(session: GatewaySession): void {
    this.sqlite.db
      .prepare(`
        INSERT INTO gateway_sessions (id, username, org_id, role, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(session.id, session.username, session.orgId, session.role, session.createdAt, session.expiresAt);
  }

  getSession(sessionId: string): GatewaySession | undefined {
    const row = this.sqlite.db
      .prepare(`
        SELECT id, username, org_id, role, created_at, expires_at
        FROM gateway_sessions
        WHERE id = ?
      `)
      .get(sessionId) as
      | {
          id: string;
          username: string;
          org_id: string;
          role: UserRole;
          created_at: string;
          expires_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      username: row.username,
      orgId: row.org_id,
      role: row.role,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }

  deleteSession(sessionId: string): void {
    this.sqlite.db.prepare(`DELETE FROM gateway_sessions WHERE id = ?`).run(sessionId);
  }

  pruneExpiredSessions(now: string): void {
    this.sqlite.db
      .prepare(`
        DELETE FROM gateway_sessions
        WHERE expires_at <= ?
      `)
      .run(now);
  }
}
