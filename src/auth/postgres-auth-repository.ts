import { PostgresService } from "../storage/postgres";
import {
  AuthRepository,
  OrganizationRecord,
  UpsertUserRecordInput,
  UserMembershipRecord,
  UserRecord
} from "./auth-repository";
import type { GatewaySession, UserRole } from "./rbac-auth";

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly postgres: PostgresService) {}

  async upsertUser(input: UpsertUserRecordInput): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          updated_at = excluded.updated_at
      `,
      [input.orgId, input.orgName, input.now, input.now]
    );
    await this.postgres.pool.query(
      `
        INSERT INTO gateway_users (username, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(username) DO UPDATE SET
          password_hash = excluded.password_hash,
          updated_at = excluded.updated_at
      `,
      [input.username, input.passwordHash, input.now, input.now]
    );
    await this.postgres.pool.query(
      `
        INSERT INTO user_memberships (username, org_id, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(username, org_id) DO UPDATE SET
          role = excluded.role,
          updated_at = excluded.updated_at
      `,
      [input.username, input.orgId, input.role, input.now, input.now]
    );
  }

  async listUsers(): Promise<UserMembershipRecord[]> {
    const result = await this.postgres.pool.query(
      `
        SELECT m.username, m.org_id, m.role, o.name AS org_name, m.created_at, m.updated_at
        FROM user_memberships m
        JOIN organizations o ON o.id = m.org_id
        ORDER BY m.org_id ASC, m.username ASC
      `
    );
    return result.rows.map((row) => ({
      username: String(row.username),
      orgId: String(row.org_id),
      orgName: String(row.org_name),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async listOrganizations(): Promise<OrganizationRecord[]> {
    const result = await this.postgres.pool.query(
      `
        SELECT o.id, o.name, o.created_at, o.updated_at, COUNT(m.username)::int AS membership_count
        FROM organizations o
        LEFT JOIN user_memberships m ON m.org_id = o.id
        GROUP BY o.id, o.name, o.created_at, o.updated_at
        ORDER BY o.name ASC, o.id ASC
      `
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      membershipCount: Number(row.membership_count ?? 0)
    }));
  }

  async getOrganization(orgId: string): Promise<OrganizationRecord | undefined> {
    const result = await this.postgres.pool.query(
      `
        SELECT id, name, created_at, updated_at
        FROM organizations
        WHERE id = $1
      `,
      [orgId]
    );
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    return {
      id: String(row.id),
      name: String(row.name),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      membershipCount: Number(
        (
          await this.postgres.pool.query(
            `
              SELECT COUNT(*)::int AS count
              FROM user_memberships
              WHERE org_id = $1
            `,
            [orgId]
          )
        ).rows[0]?.count ?? 0
      )
    };
  }

  async listMembershipsForUser(username: string): Promise<UserMembershipRecord[]> {
    const result = await this.postgres.pool.query(
      `
        SELECT m.username, m.org_id, m.role, o.name AS org_name, m.created_at, m.updated_at
        FROM user_memberships m
        JOIN organizations o ON o.id = m.org_id
        WHERE m.username = $1
        ORDER BY m.org_id ASC
      `,
      [username]
    );
    return result.rows.map((row) => ({
      username: String(row.username),
      orgId: String(row.org_id),
      orgName: String(row.org_name),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async listMembershipsForOrg(orgId: string): Promise<UserMembershipRecord[]> {
    const result = await this.postgres.pool.query(
      `
        SELECT m.username, m.org_id, m.role, o.name AS org_name, m.created_at, m.updated_at
        FROM user_memberships m
        JOIN organizations o ON o.id = m.org_id
        WHERE m.org_id = $1
        ORDER BY m.username ASC
      `,
      [orgId]
    );
    return result.rows.map((row) => ({
      username: String(row.username),
      orgId: String(row.org_id),
      orgName: String(row.org_name),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async assignMembership(username: string, orgId: string, orgName: string, role: UserRole, now: string): Promise<boolean> {
    const existingUser = await this.postgres.pool.query(
      `
        SELECT username
        FROM gateway_users
        WHERE username = $1
      `,
      [username]
    );

    if (!existingUser.rows[0]) {
      return false;
    }

    await this.postgres.pool.query(
      `
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          updated_at = excluded.updated_at
      `,
      [orgId, orgName, now, now]
    );

    await this.postgres.pool.query(
      `
        INSERT INTO user_memberships (username, org_id, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(username, org_id) DO UPDATE SET
          role = excluded.role,
          updated_at = excluded.updated_at
      `,
      [username, orgId, role, now, now]
    );

    return true;
  }

  async updateOrganizationName(orgId: string, name: string, now: string): Promise<boolean> {
    const result = await this.postgres.pool.query(
      `
        UPDATE organizations
        SET name = $1, updated_at = $2
        WHERE id = $3
      `,
      [name, now, orgId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async removeMembership(username: string, orgId: string): Promise<boolean> {
    const membershipCount = await this.postgres.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM user_memberships
        WHERE username = $1
      `,
      [username]
    );

    if (Number(membershipCount.rows[0]?.count ?? 0) <= 1) {
      return false;
    }

    const result = await this.postgres.pool.query(
      `
        DELETE FROM user_memberships
        WHERE username = $1 AND org_id = $2
      `,
      [username, orgId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findUserForLogin(username: string, orgId: string): Promise<UserRecord | undefined> {
    const result = await this.postgres.pool.query(
      `
        SELECT u.username, u.password_hash, m.role
        FROM gateway_users u
        JOIN user_memberships m ON m.username = u.username
        WHERE u.username = $1 AND m.org_id = $2
      `,
      [username, orgId]
    );
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    return {
      username: String(row.username),
      passwordHash: String(row.password_hash),
      role: row.role as UserRole
    };
  }

  async updateUserRole(username: string, orgId: string, role: UserRole, now: string): Promise<boolean> {
    const result = await this.postgres.pool.query(
      `
        UPDATE user_memberships
        SET role = $1, updated_at = $2
        WHERE username = $3 AND org_id = $4
      `,
      [role, now, username, orgId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserPassword(username: string, passwordHash: string, now: string): Promise<boolean> {
    const result = await this.postgres.pool.query(
      `
        UPDATE gateway_users
        SET password_hash = $1, updated_at = $2
        WHERE username = $3
      `,
      [passwordHash, now, username]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async createSession(session: GatewaySession): Promise<void> {
    await this.postgres.pool.query(
      `
        INSERT INTO gateway_sessions (id, username, org_id, role, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [session.id, session.username, session.orgId, session.role, session.createdAt, session.expiresAt]
    );
  }

  async getSession(sessionId: string): Promise<GatewaySession | undefined> {
    const result = await this.postgres.pool.query(
      `
        SELECT id, username, org_id, role, created_at, expires_at
        FROM gateway_sessions
        WHERE id = $1
      `,
      [sessionId]
    );
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    return {
      id: String(row.id),
      username: String(row.username),
      orgId: String(row.org_id),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at)
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.postgres.pool.query(`DELETE FROM gateway_sessions WHERE id = $1`, [sessionId]);
  }

  async pruneExpiredSessions(now: string): Promise<void> {
    await this.postgres.pool.query(`DELETE FROM gateway_sessions WHERE expires_at <= $1`, [now]);
  }
}
