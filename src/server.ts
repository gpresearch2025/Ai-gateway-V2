import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { GatewaySession, RbacAuthService, UserRole } from "./auth/rbac-auth";
import { buildRuntime } from "./app/runtime";
import { getAppConfig } from "./config/app-config";
import { GatewayService } from "./services/gateway-service";
import { AiGatewayRequest, AuditEvent, ProviderId } from "./types";

const app = express();
const config = getAppConfig();
const port = config.port;
type LoginAttemptState = { count: number; windowStartedAt: number; blockedUntil?: number };
const loginAttempts = new Map<string, LoginAttemptState>();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 5;
const loginBlockMs = 15 * 60 * 1000;
let gateway: GatewayService;
let auth: RbacAuthService;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/details", async (_req, res) => {
  res.json(await gateway.getSystemHealth());
});

app.get("/auth/session", async (req, res) => {
  const session = await getSession(req);
  const csrfToken = session ? createCsrfToken(session.username) : null;
  const memberships = session ? await auth.listMembershipsForUser(session.username) : [];
  res.json({
    authMode: config.authMode,
    authenticated: Boolean(session),
    username: session?.username ?? null,
    orgId: session?.orgId ?? null,
    role: session?.role ?? null,
    csrfToken,
    memberships
  });
});

app.post("/auth/login", async (req, res) => {
  if (config.authMode === "trusted_header") {
    res.status(405).json({
      ok: false,
      error: "login_disabled_for_trusted_header_auth"
    });
    return;
  }

  const clientIp = getClientIp(req);
  const rateLimitState = recordLoginAttempt(clientIp, false);
  if (rateLimitState.blockedUntil && rateLimitState.blockedUntil > Date.now()) {
    res.status(429).json({
      ok: false,
      error: "too_many_login_attempts",
      retryAt: new Date(rateLimitState.blockedUntil).toISOString()
    });
    return;
  }

  const username = String(req.body.username ?? "");
  const password = String(req.body.password ?? "");
  const orgId = String(req.body.orgId ?? "");
  const session = await auth.login(username, password, orgId);
  if (!session) {
    recordLoginAttempt(clientIp, true);
    res.status(401).json({
      ok: false,
      error: "invalid_credentials"
    });
    return;
  }

  clearLoginAttempts(clientIp);
  res.setHeader("Set-Cookie", serializeSessionCookie(session.id, 60 * 60 * 8));
  res.json({
    ok: true,
    username,
    orgId: session.orgId,
    role: session.role
  });
});

app.post("/auth/logout", async (req, res) => {
  if (config.authMode === "trusted_header") {
    res.json({ ok: true });
    return;
  }

  const sessionId = getSessionId(readCookieHeader(req.headers.cookie));
  await auth.deleteSession(sessionId);
  res.setHeader("Set-Cookie", serializeSessionCookie("", 0));
  res.json({ ok: true });
});

app.post("/auth/switch-org", async (req, res) => {
  if (config.authMode === "trusted_header") {
    res.status(405).json({
      ok: false,
      error: "org_switch_disabled_for_trusted_header_auth"
    });
    return;
  }

  const currentSession = await getRequiredSession(req);
  const nextOrgId = String(req.body.orgId ?? "");
  const sessionId = getSessionId(readCookieHeader(req.headers.cookie));
  const switched = await auth.switchOrg(sessionId, currentSession.username, nextOrgId);

  if (!switched) {
    res.status(404).json({
      ok: false,
      error: "org_membership_not_found"
    });
    return;
  }

  res.setHeader("Set-Cookie", serializeSessionCookie(switched.id, 60 * 60 * 8));
  res.json({
    ok: true,
    username: switched.username,
    orgId: switched.orgId,
    role: switched.role
  });
});

app.use("/ai", requireAdmin);
app.use("/ai", requireCsrfForWrites);

app.get("/ai/modes", requireRole("auditor"), (_req, res) => {
  res.json([
    { id: "private", description: "Local only, no external providers." },
    { id: "private_plus", description: "Default hybrid mode with de-identification and consent." },
    { id: "max_intelligence", description: "Richer external usage with explicit consent." }
  ]);
});

app.get("/ai/policy", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.getOrgPolicy(session.orgId));
});

app.get("/ai/capabilities", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.listCapabilities(session.orgId));
});

app.get("/ai/purposes", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.listPurposePolicies(session.orgId));
});

app.post("/ai/purposes", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    purpose: string;
    allowLocal: boolean;
    allowExternal: boolean;
    requireUserConsent: boolean;
    requireHumanApproval: boolean;
  };
  res.json(
    await gateway.upsertPurposePolicy({
      orgId: session.orgId,
      purpose: body.purpose,
      allowLocal: body.allowLocal,
      allowExternal: body.allowExternal,
      requireUserConsent: body.requireUserConsent,
      requireHumanApproval: body.requireHumanApproval
    })
  );
});

app.get("/ai/consent/:purpose", requireRole("member"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json((await gateway.getUserConsent(session.username, session.orgId, String(req.params.purpose))) ?? null);
});

app.post("/ai/consent", requireRole("member"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    purpose: string;
    consentGranted: boolean;
  };
  res.json(
    await gateway.setUserConsent({
      username: session.username,
      orgId: session.orgId,
      purpose: body.purpose,
      consentGranted: body.consentGranted
    })
  );
});

app.get("/ai/approvals", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.listApprovals(session.orgId));
});

app.get("/ai/jobs", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.listExecutionJobs(session.orgId));
});

app.get("/ai/metrics", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.getOrgOperationalSummary(session.orgId));
});

app.get("/ai/request-history", requireRole("auditor"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(
    await gateway.getRequestHistory(session.orgId, {
      purpose: typeof req.query.purpose === "string" ? req.query.purpose : undefined,
      provider: typeof req.query.provider === "string" ? req.query.provider : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined
    })
  );
});

app.get("/ai/users", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const users = await auth.listUsers();
  res.json(users.filter((user) => user.orgId === session.orgId));
});

app.get("/ai/orgs", requireRole("admin"), async (_req, res) => {
  res.json(await auth.listOrganizations());
});

app.get("/ai/orgs/:orgId/users", requireRole("admin"), async (req, res) => {
  res.json(await auth.listMembershipsForOrg(String(req.params.orgId)));
});

app.patch("/ai/orgs/:orgId", requireRole("admin"), async (req, res) => {
  const body = req.body as { name: string };
  const updated = await auth.renameOrganization({
    orgId: String(req.params.orgId),
    name: String(body.name ?? "")
  });

  if (!updated) {
    res.status(404).json({
      ok: false,
      error: "org_not_found"
    });
    return;
  }

  res.json(updated);
});

app.post("/ai/users", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    username: string;
    password: string;
    role: UserRole;
    orgName?: string;
  };

  const created = await auth.upsertUser({
    username: String(body.username ?? ""),
    password: String(body.password ?? ""),
    orgId: session.orgId,
    orgName: body.orgName,
    role: body.role
  });

  res.status(201).json(created);
});

app.post("/ai/users/:username/memberships", requireRole("admin"), async (req, res) => {
  const body = req.body as {
    orgId: string;
    orgName?: string;
    role: UserRole;
  };

  const assigned = await auth.assignMembership({
    username: String(req.params.username),
    orgId: String(body.orgId ?? ""),
    orgName: body.orgName,
    role: body.role
  });

  if (!assigned) {
    res.status(404).json({
      ok: false,
      error: "user_not_found"
    });
    return;
  }

  res.status(201).json(assigned);
});

app.delete("/ai/users/:username/memberships/:orgId", requireRole("admin"), async (req, res) => {
  const removed = await auth.removeMembership({
    username: String(req.params.username),
    orgId: String(req.params.orgId)
  });

  if (!removed) {
    res.status(404).json({
      ok: false,
      error: "membership_not_found_or_last_membership"
    });
    return;
  }

  res.json(removed);
});

app.patch("/ai/users/:username/role", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as { role: UserRole; orgId?: string };
  const updated = await auth.updateUserRole({
    username: String(req.params.username),
    orgId: String(body.orgId ?? session.orgId),
    role: body.role
  });

  if (!updated) {
    res.status(404).json({
      ok: false,
      error: "user_not_found"
    });
    return;
  }

  res.json(updated);
});

app.patch("/ai/users/:username/password", requireRole("admin"), async (req, res) => {
  const body = req.body as { password: string };
  const updated = await auth.resetUserPassword({
    username: String(req.params.username),
    password: String(body.password ?? "")
  });

  if (!updated) {
    res.status(404).json({
      ok: false,
      error: "user_not_found"
    });
    return;
  }

  res.json(updated);
});

app.post("/ai/jobs/:id/requeue", requireRole("admin"), async (req, res) => {
  const requeued = await gateway.requeueExecutionJob(String(req.params.id));
  if (!requeued) {
    res.status(404).json({
      ok: false,
      error: "dead_letter_job_not_found"
    });
    return;
  }
  res.json(requeued);
});

app.post("/ai/approvals/:id/resolve", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    status: "approved" | "denied";
    reason?: string;
  };
  try {
    const resolved = await gateway.resolveApprovalAndExecute({
      id: String(req.params.id),
      status: body.status,
      resolvedBy: session.username,
      reason: body.reason
    });
    if (!resolved) {
      res.status(404).json({
        ok: false,
        error: "approval_not_found"
      });
      return;
    }
    res.json(resolved);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "approval_resolution_failed"
    });
  }
});

app.post("/ai/capabilities", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    provider: ProviderId;
    modelId: string;
    enabled: boolean;
    supportsText: boolean;
    supportsImages: boolean;
    supportsTools: boolean;
    supportsReasoning: boolean;
    maxMode: "private" | "private_plus" | "max_intelligence";
  };
  res.json(
    await gateway.upsertCapability({
      orgId: session.orgId,
      provider: body.provider,
      modelId: body.modelId,
      enabled: body.enabled,
      supportsText: body.supportsText,
      supportsImages: body.supportsImages,
      supportsTools: body.supportsTools,
      supportsReasoning: body.supportsReasoning,
      maxMode: body.maxMode
    })
  );
});

app.post("/ai/policy", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    defaultMode: "private" | "private_plus" | "max_intelligence";
    allowBringYourOwnKey: boolean;
    allowPlatformManagedKeys: boolean;
    allowedProviders: ProviderId[];
    allowAuditView: boolean;
    requireExternalOptIn: boolean;
  };
  res.json(
    await gateway.upsertOrgPolicy({
      orgId: session.orgId,
      defaultMode: body.defaultMode,
      allowBringYourOwnKey: body.allowBringYourOwnKey,
      allowPlatformManagedKeys: body.allowPlatformManagedKeys,
      allowedProviders: body.allowedProviders,
      allowAuditView: body.allowAuditView,
      requireExternalOptIn: body.requireExternalOptIn
    })
  );
});

app.get("/ai/providers", requireRole("member"), async (req, res) => {
  const session = await getRequiredSession(req);
  res.json(await gateway.getAvailableProviders(session.orgId, session.username));
});

app.post("/ai/keys", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const body = req.body as {
    ownerUserId?: string;
    provider: "openai" | "anthropic";
    credentialSource: "user_byok" | "org_byok" | "platform_managed";
    label: string;
    secret: string;
  };
  const saved = await gateway.saveCredential({
    orgId: session.orgId,
    ownerUserId: body.credentialSource === "user_byok" ? (body.ownerUserId ?? session.username) : undefined,
    provider: body.provider,
    credentialSource: body.credentialSource,
    label: body.label,
    secret: body.secret
  });
  res.status(201).json({
    id: saved.id,
    provider: saved.provider,
    credentialSource: saved.credentialSource,
    label: saved.label,
    status: saved.status,
    secretFingerprint: saved.secretFingerprint
  });
});

app.get("/ai/keys", requireRole("admin"), async (req, res) => {
  const session = await getRequiredSession(req);
  const credentials = (await gateway.listCredentials(session.orgId, session.username)).map((credential) => ({
    id: credential.id,
    provider: credential.provider,
    credentialSource: credential.credentialSource,
    label: credential.label,
    status: credential.status,
    secretFingerprint: credential.secretFingerprint,
    ownerUserId: credential.ownerUserId
  }));
  res.json(credentials);
});

app.delete("/ai/keys/:id", requireRole("admin"), async (req, res) => {
  const deleted = await gateway.deleteCredential(String(req.params.id));
  res.json({ ok: deleted });
});

app.post("/ai/provider/test", requireRole("admin"), async (req, res) => {
  const providerId = req.body.provider as ProviderId;
  const secret = String(req.body.secret ?? "");
  const valid = await gateway.testProviderKey(providerId, secret);
  res.json({ ok: valid });
});

app.post("/ai/request", requireRole("member"), async (req, res) => {
  const session = await getRequiredSession(req);
  const payload = req.body as AiGatewayRequest;
  try {
    const result = await gateway.handleRequest({
      ...payload,
      userId: session.username,
      orgId: session.orgId
    });

    if (!result.ok) {
      res.status(403).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

app.get("/ai/audit/:id", requireAuditAccess, async (req, res) => {
  res.json(await gateway.getAuditEvents(String(req.params.id)));
});

app.get("/ai/audit", requireAuditAccess, async (req, res) => {
  const session = await getRequiredSession(req);
  const typeQuery = typeof req.query.type === "string" ? normalizeAuditEventType(req.query.type) : undefined;
  res.json(
    await gateway.getAllAuditEvents({
      orgId: session.orgId,
      type: typeQuery,
      requestId: typeof req.query.requestId === "string" ? req.query.requestId : undefined,
      userId: typeof req.query.userId === "string" ? req.query.userId : undefined
    })
  );
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

async function main() {
  const runtime = await buildRuntime();
  gateway = runtime.gateway;
  auth = runtime.auth;
  await auth.seedFromEnv();
  await auth.pruneExpiredSessions();

  app.listen(port, () => {
    console.log(`AI Gateway listening on port ${port}`);
  });
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: "authentication_required"
    });
    return;
  }
  next();
}

function requireRole(minimumRole: UserRole) {
  const ranking: Record<UserRole, number> = {
    auditor: 1,
    member: 2,
    admin: 3
  };

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = await getSession(req);
    if (!session) {
      res.status(401).json({
        ok: false,
        error: "authentication_required"
      });
      return;
    }

    if (ranking[session.role] < ranking[minimumRole]) {
      res.status(403).json({
        ok: false,
        error: "insufficient_role",
        requiredRole: minimumRole,
        actualRole: session.role
      });
      return;
    }

    next();
  };
}

async function requireAuditAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: "authentication_required"
    });
    return;
  }

  const policy = await gateway.getOrgPolicy(session.orgId);
  if (!policy.allowAuditView) {
    res.status(403).json({
      ok: false,
      error: "audit_view_disabled_by_org_policy"
    });
    return;
  }

  const ranking: Record<UserRole, number> = {
    auditor: 1,
    member: 2,
    admin: 3
  };

  if (ranking[session.role] < ranking.auditor) {
    res.status(403).json({
      ok: false,
      error: "insufficient_role",
      requiredRole: "auditor",
      actualRole: session.role
    });
    return;
  }

  next();
}

async function requireCsrfForWrites(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  const session = await getSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      error: "authentication_required"
    });
    return;
  }

  const expectedToken = createCsrfToken(session.username);
  const actualToken = String(req.headers["x-csrf-token"] ?? "");
  if (!actualToken || actualToken !== expectedToken) {
    res.status(403).json({
      ok: false,
      error: "invalid_csrf_token"
    });
    return;
  }

  next();
}

async function getSession(req: express.Request) {
  if (config.authMode === "trusted_header") {
    return getTrustedHeaderSession(req);
  }

  const sessionId = getSessionId(readCookieHeader(req.headers.cookie));
  return await auth.getSession(sessionId);
}

async function getRequiredSession(req: express.Request): Promise<GatewaySession> {
  const session = await getSession(req);
  if (!session) {
    throw new Error("missing_authenticated_session");
  }
  return session;
}

function getTrustedHeaderSession(req: express.Request): GatewaySession | undefined {
  const username = readHeaderValue(req.headers[config.trustedAuthUserHeader]);
  const orgId = readHeaderValue(req.headers[config.trustedAuthOrgHeader]);
  const roleValue = readHeaderValue(req.headers[config.trustedAuthRoleHeader]);
  const role = normalizeRole(roleValue);

  if (!username || !orgId || !role) {
    return undefined;
  }

  const now = new Date().toISOString();
  return {
    id: `trusted:${username}:${orgId}`,
    username,
    orgId,
    role,
    createdAt: now,
    expiresAt: now
  };
}

function getSessionId(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "ai_gateway_session" && value) {
      return decodeURIComponent(value);
    }
  }

  return undefined;
}

function readCookieHeader(cookieHeader: string | string[] | undefined): string | undefined {
  if (typeof cookieHeader === "string") {
    return cookieHeader;
  }
  if (Array.isArray(cookieHeader)) {
    return cookieHeader[0];
  }
  return undefined;
}

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }
  return undefined;
}

function normalizeRole(value: string | undefined): UserRole | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "admin" || value === "member" || value === "auditor") {
    return value;
  }
  return undefined;
}

function normalizeAuditEventType(value: string | undefined): AuditEvent["type"] | undefined {
  if (
    value === "AI_REQUEST_RECEIVED" ||
    value === "POLICY_DECISION_MADE" ||
    value === "PAYLOAD_MINIMIZED" ||
    value === "AI_REQUEST_DENIED" ||
    value === "AI_PROVIDER_CALLED" ||
    value === "AI_RESPONSE_RETURNED" ||
    value === "AI_KEY_ADDED" ||
    value === "AI_KEY_VALIDATED" ||
    value === "AI_KEY_DELETED"
  ) {
    return value;
  }
  return undefined;
}

function serializeSessionCookie(sessionId: string, maxAgeSeconds: number): string {
  return [
    `ai_gateway_session=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ].join("; ");
}

function createCsrfToken(username: string): string {
  const secret = process.env.ADMIN_PASSWORD ?? "dev-only-secret";
  return crypto.createHash("sha256").update(`${username}:${secret}`).digest("hex");
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function recordLoginAttempt(clientIp: string, failedAttempt: boolean) {
  const now = Date.now();
  const current = loginAttempts.get(clientIp);
  if (!current || now - current.windowStartedAt > loginWindowMs) {
    const fresh: LoginAttemptState = { count: failedAttempt ? 1 : 0, windowStartedAt: now };
    loginAttempts.set(clientIp, fresh);
    return fresh;
  }

  if (current.blockedUntil && current.blockedUntil > now) {
    return current;
  }

  if (failedAttempt) {
    current.count += 1;
    if (current.count >= maxLoginAttempts) {
      current.blockedUntil = now + loginBlockMs;
    }
  }

  loginAttempts.set(clientIp, current);
  return current;
}

function clearLoginAttempts(clientIp: string) {
  loginAttempts.delete(clientIp);
}

main().catch((error) => {
  console.error("Failed to start AI Gateway", error);
  process.exit(1);
});
