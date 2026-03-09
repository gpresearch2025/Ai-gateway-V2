const state = {
  uploadedImages: [],
  authenticated: false,
  csrfToken: "",
  authMode: "local",
  role: null,
  memberships: [],
  users: [],
  orgs: [],
  orgMembers: [],
  auditEvents: [],
  requestHistory: [],
  approvals: [],
  jobs: []
};

const STORAGE_KEYS = {
  auditType: "aiGateway.auditType",
  auditUser: "aiGateway.auditUser",
  requestPurpose: "aiGateway.requestPurpose",
  requestProvider: "aiGateway.requestProvider",
  requestStatus: "aiGateway.requestStatus",
  approvalStatus: "aiGateway.approvalStatus",
  approvalUser: "aiGateway.approvalUser",
  jobStatus: "aiGateway.jobStatus",
  jobUser: "aiGateway.jobUser"
};

const els = {
  authShell: document.getElementById("authShell"),
  loginForm: document.getElementById("loginForm"),
  loginOrgId: document.getElementById("loginOrgId"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginResult: document.getElementById("loginResult"),
  orgId: document.getElementById("orgId"),
  userId: document.getElementById("userId"),
  refreshButton: document.getElementById("refreshButton"),
  logoutButton: document.getElementById("logoutButton"),
  sessionOrgSelect: document.getElementById("sessionOrgSelect"),
  switchOrgButton: document.getElementById("switchOrgButton"),
  sessionState: document.getElementById("sessionState"),
  metricsSummary: document.getElementById("metricsSummary"),
  summaryProvidersValue: document.getElementById("summaryProvidersValue"),
  summaryProvidersNote: document.getElementById("summaryProvidersNote"),
  summaryApprovalsValue: document.getElementById("summaryApprovalsValue"),
  summaryApprovalsNote: document.getElementById("summaryApprovalsNote"),
  summaryJobsValue: document.getElementById("summaryJobsValue"),
  summaryJobsNote: document.getElementById("summaryJobsNote"),
  summaryAuditValue: document.getElementById("summaryAuditValue"),
  summaryAuditNote: document.getElementById("summaryAuditNote"),
  alertsPanel: document.getElementById("alertsPanel"),
  alertsCount: document.getElementById("alertsCount"),
  alertsList: document.getElementById("alertsList"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  shell: document.querySelector(".shell"),
  providersList: document.getElementById("providersList"),
  providerStatus: document.getElementById("providerStatus"),
  keyForm: document.getElementById("keyForm"),
  keyProvider: document.getElementById("keyProvider"),
  credentialSource: document.getElementById("credentialSource"),
  keyLabel: document.getElementById("keyLabel"),
  keySecret: document.getElementById("keySecret"),
  keyResult: document.getElementById("keyResult"),
  policyForm: document.getElementById("policyForm"),
  policyDefaultMode: document.getElementById("policyDefaultMode"),
  policyAllowByok: document.getElementById("policyAllowByok"),
  policyAllowPlatform: document.getElementById("policyAllowPlatform"),
  policyAllowAudit: document.getElementById("policyAllowAudit"),
  policyRequireOptIn: document.getElementById("policyRequireOptIn"),
  policyProviders: document.getElementById("policyProviders"),
  policyResult: document.getElementById("policyResult"),
  capabilityForm: document.getElementById("capabilityForm"),
  capabilityProvider: document.getElementById("capabilityProvider"),
  capabilityModelId: document.getElementById("capabilityModelId"),
  capabilityMaxMode: document.getElementById("capabilityMaxMode"),
  capabilityEnabled: document.getElementById("capabilityEnabled"),
  capabilityText: document.getElementById("capabilityText"),
  capabilityImages: document.getElementById("capabilityImages"),
  capabilityTools: document.getElementById("capabilityTools"),
  capabilityReasoning: document.getElementById("capabilityReasoning"),
  capabilityResult: document.getElementById("capabilityResult"),
  capabilityStatus: document.getElementById("capabilityStatus"),
  purposeForm: document.getElementById("purposeForm"),
  purposeName: document.getElementById("purposeName"),
  purposeAllowLocal: document.getElementById("purposeAllowLocal"),
  purposeAllowExternal: document.getElementById("purposeAllowExternal"),
  purposeRequireConsent: document.getElementById("purposeRequireConsent"),
  purposeRequireApproval: document.getElementById("purposeRequireApproval"),
  purposeResult: document.getElementById("purposeResult"),
  testKeyButton: document.getElementById("testKeyButton"),
  keysList: document.getElementById("keysList"),
  keysCount: document.getElementById("keysCount"),
  requestForm: document.getElementById("requestForm"),
  requestMode: document.getElementById("requestMode"),
  requestProvider: document.getElementById("requestProvider"),
  requestCredentialSource: document.getElementById("requestCredentialSource"),
  requestPurpose: document.getElementById("requestPurpose"),
  requestTaskType: document.getElementById("requestTaskType"),
  requestReasoningMode: document.getElementById("requestReasoningMode"),
  userOptInExternal: document.getElementById("userOptInExternal"),
  consentGranted: document.getElementById("consentGranted"),
  saveConsentButton: document.getElementById("saveConsentButton"),
  requestText: document.getElementById("requestText"),
  imageUrls: document.getElementById("imageUrls"),
  imageFiles: document.getElementById("imageFiles"),
  requestResultSummary: document.getElementById("requestResultSummary"),
  requestResult: document.getElementById("requestResult"),
  auditList: document.getElementById("auditList"),
  auditTypeFilter: document.getElementById("auditTypeFilter"),
  auditUserFilter: document.getElementById("auditUserFilter"),
  refreshAuditButton: document.getElementById("refreshAuditButton"),
  exportAuditButton: document.getElementById("exportAuditButton"),
  auditDetail: document.getElementById("auditDetail"),
  approvalsList: document.getElementById("approvalsList"),
  approvalDetail: document.getElementById("approvalDetail"),
  exportApprovalsButton: document.getElementById("exportApprovalsButton"),
  jobsList: document.getElementById("jobsList"),
  jobDetail: document.getElementById("jobDetail"),
  approvalStatusFilter: document.getElementById("approvalStatusFilter"),
  approvalUserFilter: document.getElementById("approvalUserFilter"),
  refreshApprovalsButton: document.getElementById("refreshApprovalsButton"),
  jobStatusFilter: document.getElementById("jobStatusFilter"),
  jobUserFilter: document.getElementById("jobUserFilter"),
  refreshJobsButton: document.getElementById("refreshJobsButton"),
  exportJobsButton: document.getElementById("exportJobsButton"),
  operationsApprovalsStats: document.getElementById("operationsApprovalsStats"),
  operationsJobsStats: document.getElementById("operationsJobsStats")
  ,
  requestHistoryPurpose: document.getElementById("requestHistoryPurpose"),
  requestHistoryProvider: document.getElementById("requestHistoryProvider"),
  requestHistoryStatus: document.getElementById("requestHistoryStatus"),
  refreshRequestHistoryButton: document.getElementById("refreshRequestHistoryButton"),
  exportRequestHistoryButton: document.getElementById("exportRequestHistoryButton"),
  requestHistoryList: document.getElementById("requestHistoryList"),
  requestHistoryDetail: document.getElementById("requestHistoryDetail"),
  requestHistoryStats: document.getElementById("requestHistoryStats"),
  userForm: document.getElementById("userForm"),
  adminUsername: document.getElementById("adminUsername"),
  adminPassword: document.getElementById("adminPassword"),
  adminRole: document.getElementById("adminRole"),
  adminOrgName: document.getElementById("adminOrgName"),
  userResult: document.getElementById("userResult"),
  membershipForm: document.getElementById("membershipForm"),
  membershipUsername: document.getElementById("membershipUsername"),
  membershipRole: document.getElementById("membershipRole"),
  membershipOrgId: document.getElementById("membershipOrgId"),
  membershipOrgName: document.getElementById("membershipOrgName"),
  membershipResult: document.getElementById("membershipResult"),
  usersList: document.getElementById("usersList"),
  usersCount: document.getElementById("usersCount"),
  usersResult: document.getElementById("usersResult"),
  usersSearch: document.getElementById("usersSearch"),
  orgForm: document.getElementById("orgForm"),
  orgManageId: document.getElementById("orgManageId"),
  orgManageName: document.getElementById("orgManageName"),
  orgsList: document.getElementById("orgsList"),
  orgsCount: document.getElementById("orgsCount"),
  orgsResult: document.getElementById("orgsResult"),
  orgsSearch: document.getElementById("orgsSearch"),
  orgMembersSelect: document.getElementById("orgMembersSelect"),
  loadOrgMembersButton: document.getElementById("loadOrgMembersButton"),
  orgMembersList: document.getElementById("orgMembersList"),
  orgMembersResult: document.getElementById("orgMembersResult"),
  orgMembersSearch: document.getElementById("orgMembersSearch")
};

els.loginForm.addEventListener("submit", login);
els.refreshButton.addEventListener("click", refreshAll);
els.refreshAuditButton.addEventListener("click", loadAudit);
els.exportAuditButton.addEventListener("click", exportAudit);
els.refreshRequestHistoryButton.addEventListener("click", loadRequestHistory);
els.exportRequestHistoryButton.addEventListener("click", exportRequestHistory);
els.refreshApprovalsButton.addEventListener("click", loadApprovals);
els.exportApprovalsButton.addEventListener("click", exportApprovals);
els.refreshJobsButton.addEventListener("click", loadJobs);
els.exportJobsButton.addEventListener("click", exportJobs);
els.logoutButton.addEventListener("click", logout);
els.switchOrgButton.addEventListener("click", switchOrg);
els.policyForm.addEventListener("submit", savePolicy);
els.capabilityForm.addEventListener("submit", saveCapability);
els.purposeForm.addEventListener("submit", savePurposePolicy);
els.saveConsentButton.addEventListener("click", saveConsent);
els.testKeyButton.addEventListener("click", testKey);
els.keyForm.addEventListener("submit", saveKey);
els.requestForm.addEventListener("submit", sendRequest);
els.imageFiles.addEventListener("change", handleImageUpload);
els.userForm.addEventListener("submit", saveUser);
els.membershipForm.addEventListener("submit", assignMembership);
els.orgForm.addEventListener("submit", renameOrganization);
els.loadOrgMembersButton.addEventListener("click", loadOrgMembers);
els.usersSearch.addEventListener("input", renderUsers);
els.orgsSearch.addEventListener("input", renderOrganizations);
els.orgMembersSearch.addEventListener("input", renderOrgMembers);
els.tabButtons.forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));

bootstrap();

async function bootstrap() {
  restoreSavedFilters();
  await refreshSession();
  if (state.authenticated) {
    await refreshAll();
  }
}

async function refreshAll() {
  await Promise.all([
    loadPolicy(),
    loadCapabilities(),
    loadPurposePolicies(),
    loadProviders(),
    loadKeys(),
    loadAudit(),
    loadRequestHistory()
  ]);
  await loadConsent();
  await Promise.all([loadApprovals(), loadJobs(), loadMetrics()]);
  if (state.role === "admin") {
    await Promise.all([loadUsers(), loadOrganizations()]);
    await loadOrgMembers();
  }
  renderAlerts();
}

async function loadPolicy() {
  const policy = await fetchJson("/ai/policy");
  els.policyDefaultMode.value = policy.defaultMode;
  els.policyAllowByok.checked = Boolean(policy.allowBringYourOwnKey);
  els.policyAllowPlatform.checked = Boolean(policy.allowPlatformManagedKeys);
  els.policyAllowAudit.checked = Boolean(policy.allowAuditView);
  els.policyRequireOptIn.checked = Boolean(policy.requireExternalOptIn);
  els.policyProviders.value = policy.allowedProviders.join(", ");
  els.policyResult.textContent = JSON.stringify(policy, null, 2);
}

async function refreshSession() {
  const session = await fetchJson("/auth/session");
  state.authMode = session.authMode ?? "local";
  state.authenticated = Boolean(session.authenticated);
  state.role = session.role ?? null;
  state.memberships = session.memberships ?? [];
  state.csrfToken = session.csrfToken ?? "";
  els.sessionState.textContent = state.authenticated
    ? `Signed in as ${session.username} @ ${session.orgId} (${session.role})`
    : state.authMode === "trusted_header"
      ? "Waiting for trusted identity headers"
      : "Not signed in";
  if (state.authenticated) {
    els.orgId.value = session.orgId;
    els.userId.value = session.username;
  }
  els.sessionOrgSelect.innerHTML = "";
  state.memberships.forEach((membership) => {
    const option = document.createElement("option");
    option.value = membership.orgId;
    option.textContent = `${membership.orgName} (${membership.role})`;
    option.selected = membership.orgId === session.orgId;
    els.sessionOrgSelect.appendChild(option);
  });
  const loginDisabled = state.authMode === "trusted_header";
  els.loginUsername.disabled = loginDisabled;
  els.loginPassword.disabled = loginDisabled;
  els.loginOrgId.disabled = loginDisabled;
  els.loginResult.textContent = loginDisabled && !state.authenticated
    ? "Trusted-header auth is enabled. Sign in through the upstream proxy or identity gateway."
    : els.loginResult.textContent;
  els.logoutButton.disabled = loginDisabled;
  els.switchOrgButton.disabled = loginDisabled || !state.authenticated || state.memberships.length < 2;
  els.sessionOrgSelect.disabled = loginDisabled || !state.authenticated || state.memberships.length < 2;
  els.authShell.classList.toggle("visible", !state.authenticated);
  els.shell.classList.toggle("hidden", !state.authenticated);
}

async function login(event) {
  event.preventDefault();
  const result = await fetchJson("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId: els.loginOrgId.value,
      username: els.loginUsername.value,
      password: els.loginPassword.value
    })
  });
  els.loginResult.textContent = JSON.stringify(result, null, 2);
  els.loginPassword.value = "";
  await refreshSession();
  await refreshAll();
}

async function logout() {
  await fetchJson("/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  els.requestResult.textContent = "";
  els.keyResult.textContent = "";
  state.csrfToken = "";
  await refreshSession();
}

async function switchOrg() {
  const orgId = els.sessionOrgSelect.value;
  const result = await fetchJson("/auth/switch-org", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify({ orgId })
  });
  els.requestResult.textContent = JSON.stringify(result, null, 2);
  await refreshSession();
  await refreshAll();
}

async function loadProviders() {
  els.providerStatus.textContent = "Refreshing";
  const data = await fetchJson(
    `/ai/providers?orgId=${encodeURIComponent(els.orgId.value)}&userId=${encodeURIComponent(els.userId.value)}`
  );
  els.providersList.innerHTML = "";
  data.forEach((provider) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item-row">
        <strong>${provider.provider}</strong>
        <span>${provider.credentialStatus}</span>
      </div>
      <div>available=${provider.available} credentialRequired=${provider.credentialRequired}</div>
      <div>supports=${provider.supports.join(", ")}</div>
      <div>models=${(provider.models ?? []).join(", ")}</div>
    `;
    els.providersList.appendChild(item);
  });
  els.providerStatus.textContent = `${data.length} providers`;
  els.summaryProvidersValue.textContent = String(data.length);
  const availableCount = data.filter((provider) => provider.available).length;
  els.summaryProvidersNote.textContent = `${availableCount} available now`;
}

async function loadCapabilities() {
  const capabilities = await fetchJson("/ai/capabilities");
  els.capabilityStatus.textContent = `${capabilities.length} entries`;
  els.capabilityResult.textContent = JSON.stringify(capabilities, null, 2);
}

async function loadPurposePolicies() {
  const policies = await fetchJson("/ai/purposes");
  const selected = policies.find((policy) => policy.purpose === els.purposeName.value) ?? policies[0];
  if (!selected) {
    els.purposeResult.textContent = "[]";
    return;
  }
  els.purposeName.value = selected.purpose;
  els.purposeAllowLocal.checked = Boolean(selected.allowLocal);
  els.purposeAllowExternal.checked = Boolean(selected.allowExternal);
  els.purposeRequireConsent.checked = Boolean(selected.requireUserConsent);
  els.purposeRequireApproval.checked = Boolean(selected.requireHumanApproval);
  els.purposeResult.textContent = JSON.stringify(policies, null, 2);
}

async function loadKeys() {
  const keys = await fetchJson(
    `/ai/keys?orgId=${encodeURIComponent(els.orgId.value)}&userId=${encodeURIComponent(els.userId.value)}`
  );
  els.keysList.innerHTML = "";
  els.keysCount.textContent = String(keys.length);

  keys.forEach((key) => {
    const item = document.createElement("div");
    item.className = "item";
    const deleteButtonId = `delete-${key.id}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${key.provider}</strong>
        <button id="${deleteButtonId}" class="secondary">Delete</button>
      </div>
      <div>source=${key.credentialSource} label=${key.label}</div>
      <div>fingerprint=${key.secretFingerprint} status=${key.status}</div>
    `;
    els.keysList.appendChild(item);
    item.querySelector(`#${CSS.escape(deleteButtonId)}`).addEventListener("click", async () => {
      await fetchJson(`/ai/keys/${encodeURIComponent(key.id)}`, {
        method: "DELETE",
        headers: csrfHeaders()
      });
      await refreshAll();
    });
  });
}

async function loadAudit() {
  saveFilter(STORAGE_KEYS.auditType, els.auditTypeFilter.value);
  saveFilter(STORAGE_KEYS.auditUser, els.auditUserFilter.value);
  const params = new URLSearchParams();
  if (els.auditTypeFilter.value.trim()) {
    params.set("type", els.auditTypeFilter.value.trim());
  }
  if (els.auditUserFilter.value.trim()) {
    params.set("userId", els.auditUserFilter.value.trim());
  }
  const audit = await fetchJson(`/ai/audit${params.toString() ? `?${params.toString()}` : ""}`);
  state.auditEvents = audit;
  els.auditList.innerHTML = "";
  audit.slice(-12).reverse().forEach((event) => {
    const item = document.createElement("div");
    item.className = "item";
    const detailId = `audit-detail-${event.id}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${event.type}</strong>
        <span>${new Date(event.timestamp).toLocaleString()}</span>
      </div>
      <div>request=${event.requestId ?? "-"}</div>
      <div>user=${event.userId ?? "-"} org=${event.orgId ?? "-"}</div>
      <div class="actions">
        <button id="${detailId}" class="secondary" type="button">View Detail</button>
      </div>
    `;
    els.auditList.appendChild(item);
    item.querySelector(`#${CSS.escape(detailId)}`).addEventListener("click", () => {
      els.auditDetail.textContent = JSON.stringify(event, null, 2);
    });
  });
  els.summaryAuditValue.textContent = String(audit.length);
  els.summaryAuditNote.textContent = audit.length
    ? `Last event ${new Date(audit[audit.length - 1].timestamp).toLocaleString()}`
    : "No audit events yet";
}

async function loadRequestHistory() {
  saveFilter(STORAGE_KEYS.requestPurpose, els.requestHistoryPurpose.value);
  saveFilter(STORAGE_KEYS.requestProvider, els.requestHistoryProvider.value);
  saveFilter(STORAGE_KEYS.requestStatus, els.requestHistoryStatus.value);
  const params = new URLSearchParams();
  if (els.requestHistoryPurpose.value.trim()) {
    params.set("purpose", els.requestHistoryPurpose.value.trim());
  }
  if (els.requestHistoryProvider.value.trim()) {
    params.set("provider", els.requestHistoryProvider.value.trim());
  }
  if (els.requestHistoryStatus.value) {
    params.set("status", els.requestHistoryStatus.value);
  }

  state.requestHistory = await fetchJson(
    `/ai/request-history${params.toString() ? `?${params.toString()}` : ""}`
  );
  els.requestHistoryList.innerHTML = "";
  els.requestHistoryDetail.textContent = JSON.stringify(state.requestHistory, null, 2);
  renderRequestHistoryStats(state.requestHistory);

  state.requestHistory.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "item";
    const detailId = `request-history-${entry.requestId}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${entry.purpose || "unknown-purpose"}</strong>
        <span>${entry.status}</span>
      </div>
      <div>request=${entry.requestId}</div>
      <div>provider=${entry.provider || "-"} mode=${entry.mode || "-"}</div>
      <div>user=${entry.userId || "-"} model=${entry.responseModel || "-"}</div>
      <div>${new Date(entry.timestamp).toLocaleString()}</div>
      <div class="actions">
        <button id="${detailId}" class="secondary" type="button">View Trace</button>
      </div>
    `;
    els.requestHistoryList.appendChild(item);
    item.querySelector(`#${CSS.escape(detailId)}`).addEventListener("click", async () => {
      const trace = await fetchJson(`/ai/audit/${encodeURIComponent(entry.requestId)}`);
      els.requestHistoryDetail.textContent = JSON.stringify(
        {
          request: entry,
          trace
        },
        null,
        2
      );
    });
  });
}

async function loadApprovals() {
  saveFilter(STORAGE_KEYS.approvalStatus, els.approvalStatusFilter.value);
  saveFilter(STORAGE_KEYS.approvalUser, els.approvalUserFilter.value);
  const approvals = await fetchJson("/ai/approvals");
  state.approvals = approvals;
  const filteredApprovals = approvals.filter((approval) => {
    if (els.approvalStatusFilter.value && approval.status !== els.approvalStatusFilter.value) {
      return false;
    }
    if (els.approvalUserFilter.value.trim()) {
      return approval.username.toLowerCase().includes(els.approvalUserFilter.value.trim().toLowerCase());
    }
    return true;
  });
  els.approvalsList.innerHTML = "";
  filteredApprovals.forEach((approval) => {
    const item = document.createElement("div");
    item.className = "item";
    const approveId = `approve-${approval.id}`;
    const denyId = `deny-${approval.id}`;
    const detailId = `detail-${approval.id}`;
    const statusTone = approval.status === "pending" ? "warning" : approval.status === "approved" ? "success" : "muted";
    item.innerHTML = `
      <div class="item-row">
        <strong>${approval.purpose}</strong>
        <span class="status-badge ${statusTone}">${approval.status}</span>
      </div>
      <div class="meta-grid">
        <span>provider: ${approval.provider}</span>
        <span>mode: ${approval.mode}</span>
        <span>user: ${approval.username}</span>
        <span>created: ${new Date(approval.createdAt).toLocaleString()}</span>
      </div>
      <div>reason: ${approval.reason ?? "-"}</div>
      <div>executed: ${approval.executionResultJson ? "yes" : "no"}</div>
      <div class="actions">
        <button id="${detailId}" class="secondary" type="button">View Detail</button>
        <button id="${approveId}" class="secondary">Approve</button>
        <button id="${denyId}" class="secondary">Deny</button>
      </div>
    `;
    els.approvalsList.appendChild(item);
    item.querySelector(`#${CSS.escape(detailId)}`).addEventListener("click", () => {
      els.approvalDetail.textContent = JSON.stringify(approval, null, 2);
    });
    item.querySelector(`#${CSS.escape(approveId)}`).addEventListener("click", async () => {
      await resolveApproval(approval.id, "approved");
    });
    item.querySelector(`#${CSS.escape(denyId)}`).addEventListener("click", async () => {
      await resolveApproval(approval.id, "denied");
    });
  });
  const pendingCount = approvals.filter((approval) => approval.status === "pending").length;
  els.summaryApprovalsValue.textContent = String(approvals.length);
  els.summaryApprovalsNote.textContent = pendingCount ? `${pendingCount} pending review` : "No pending approvals";
  els.operationsApprovalsStats.textContent = `${pendingCount} pending`;
  renderAlerts();
}

async function loadJobs() {
  saveFilter(STORAGE_KEYS.jobStatus, els.jobStatusFilter.value);
  saveFilter(STORAGE_KEYS.jobUser, els.jobUserFilter.value);
  const jobs = await fetchJson("/ai/jobs");
  state.jobs = jobs;
  const filteredJobs = jobs.filter((job) => {
    if (els.jobStatusFilter.value && job.status !== els.jobStatusFilter.value) {
      return false;
    }
    if (els.jobUserFilter.value.trim()) {
      return job.username.toLowerCase().includes(els.jobUserFilter.value.trim().toLowerCase());
    }
    return true;
  });
  els.jobsList.innerHTML = "";
  filteredJobs.forEach((job) => {
    const item = document.createElement("div");
    item.className = "item";
    const requeueId = `requeue-${job.id}`;
    const detailId = `job-detail-${job.id}`;
    const statusTone =
      job.status === "completed" ? "success" :
      job.status === "failed" || job.status === "dead_letter" ? "danger" :
      job.status === "running" ? "warning" :
      "muted";
    item.innerHTML = `
      <div class="item-row">
        <strong>${job.id.slice(0, 18)}...</strong>
        <span class="status-badge ${statusTone}">${job.status}</span>
      </div>
      <div class="meta-grid">
        <span>approval: ${job.approvalId}</span>
        <span>user: ${job.username}</span>
        <span>attempts: ${job.attemptCount}/${job.maxAttempts}</span>
        <span>next: ${new Date(job.nextRunAt).toLocaleString()}</span>
      </div>
      <div>created: ${new Date(job.createdAt).toLocaleString()}</div>
      <div>error: ${job.errorMessage ?? "-"}</div>
      <div class="actions">
        <button id="${detailId}" class="secondary" type="button">View Detail</button>
        ${job.status === "dead_letter" ? `<button id="${requeueId}" class="secondary">Requeue</button>` : ""}
      </div>
    `;
    els.jobsList.appendChild(item);
    item.querySelector(`#${CSS.escape(detailId)}`).addEventListener("click", () => {
      els.jobDetail.textContent = JSON.stringify(job, null, 2);
    });
    if (job.status === "dead_letter") {
      item.querySelector(`#${CSS.escape(requeueId)}`).addEventListener("click", async () => {
        const result = await fetchJson(`/ai/jobs/${encodeURIComponent(job.id)}/requeue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders()
          }
        });
        els.requestResult.textContent = JSON.stringify(result, null, 2);
        await loadJobs();
      });
    }
  });
  const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const deadJobs = jobs.filter((job) => job.status === "dead_letter").length;
  els.summaryJobsValue.textContent = String(jobs.length);
  els.summaryJobsNote.textContent = activeJobs ? `${activeJobs} active in queue` : "Queue is clear";
  els.operationsJobsStats.textContent = deadJobs ? `${activeJobs} active / ${deadJobs} dead` : `${activeJobs} active`;
  renderAlerts();
}

async function loadMetrics() {
  const metrics = await fetchJson("/ai/metrics");
  els.metricsSummary.textContent = JSON.stringify(metrics, null, 2);
}

async function loadUsers() {
  state.users = await fetchJson("/ai/users");
  renderUsers();
}

function renderUsers() {
  const query = els.usersSearch.value.trim().toLowerCase();
  const users = state.users.filter((user) => {
    if (!query) {
      return true;
    }
    return user.username.toLowerCase().includes(query) || user.role.toLowerCase().includes(query);
  });

  els.usersList.innerHTML = "";
  els.usersCount.textContent = String(users.length);

  users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "item";
    const roleSelectId = `role-${user.username}`;
    const passwordInputId = `password-${user.username}`;
    const roleButtonId = `save-role-${user.username}`;
    const passwordButtonId = `reset-password-${user.username}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${user.username}</strong>
        <span>${user.role}</span>
      </div>
      <div>org=${user.orgId}</div>
      <div>updated=${new Date(user.updatedAt).toLocaleString()}</div>
      <div class="actions">
        <select id="${roleSelectId}">
          <option value="member" ${user.role === "member" ? "selected" : ""}>Member</option>
          <option value="auditor" ${user.role === "auditor" ? "selected" : ""}>Auditor</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
        <button id="${roleButtonId}" class="secondary" type="button">Save Role</button>
      </div>
      <div class="actions">
        <input id="${passwordInputId}" type="password" placeholder="New password" />
        <button id="${passwordButtonId}" class="secondary" type="button">Reset Password</button>
      </div>
    `;
    els.usersList.appendChild(item);

    item.querySelector(`#${CSS.escape(roleButtonId)}`).addEventListener("click", async () => {
      const role = item.querySelector(`#${CSS.escape(roleSelectId)}`).value;
      const result = await fetchJson(`/ai/users/${encodeURIComponent(user.username)}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders()
        },
        body: JSON.stringify({ role })
      });
      els.usersResult.textContent = JSON.stringify(result, null, 2);
      await Promise.all([loadUsers(), loadOrgMembers()]);
    });

    item.querySelector(`#${CSS.escape(passwordButtonId)}`).addEventListener("click", async () => {
      const password = item.querySelector(`#${CSS.escape(passwordInputId)}`).value;
      const result = await fetchJson(`/ai/users/${encodeURIComponent(user.username)}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders()
        },
        body: JSON.stringify({ password })
      });
      els.usersResult.textContent = JSON.stringify(result, null, 2);
      item.querySelector(`#${CSS.escape(passwordInputId)}`).value = "";
    });
  });
}

async function loadOrganizations() {
  state.orgs = await fetchJson("/ai/orgs");
  renderOrganizations();
}

function renderOrganizations() {
  const query = els.orgsSearch.value.trim().toLowerCase();
  const orgs = state.orgs.filter((org) => {
    if (!query) {
      return true;
    }
    return org.name.toLowerCase().includes(query) || org.id.toLowerCase().includes(query);
  });

  els.orgsList.innerHTML = "";
  els.orgsCount.textContent = String(orgs.length);
  els.orgsResult.textContent = JSON.stringify(state.orgs, null, 2);

  orgs.forEach((org) => {
    const item = document.createElement("div");
    item.className = "item";
    const selectOrgId = `select-org-${org.id}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${org.name}</strong>
        <span>${org.id}</span>
      </div>
      <div>members=${org.membershipCount}</div>
      <div>updated=${new Date(org.updatedAt).toLocaleString()}</div>
      <div class="actions">
        <button id="${selectOrgId}" class="secondary" type="button">View Members</button>
      </div>
    `;
    els.orgsList.appendChild(item);
    item.querySelector(`#${CSS.escape(selectOrgId)}`).addEventListener("click", async () => {
      els.orgMembersSelect.value = org.id;
      els.orgManageId.value = org.id;
      els.orgManageName.value = org.name;
      await loadOrgMembers();
    });
  });

  const currentValue = els.orgMembersSelect.value;
  els.orgMembersSelect.innerHTML = "";
  state.orgs.forEach((org) => {
    const option = document.createElement("option");
    option.value = org.id;
    option.textContent = `${org.name} (${org.id})`;
    option.selected = org.id === (currentValue || els.orgId.value);
    els.orgMembersSelect.appendChild(option);
  });
}

async function loadOrgMembers() {
  const orgId = els.orgMembersSelect.value || els.orgId.value;
  if (!orgId) {
    els.orgMembersList.innerHTML = "";
    els.orgMembersResult.textContent = "[]";
    state.orgMembers = [];
    return;
  }

  state.orgMembers = await fetchJson(`/ai/orgs/${encodeURIComponent(orgId)}/users`);
  renderOrgMembers();
}

function renderOrgMembers() {
  const query = els.orgMembersSearch.value.trim().toLowerCase();
  const members = state.orgMembers.filter((member) => {
    if (!query) {
      return true;
    }
    return member.username.toLowerCase().includes(query) || member.role.toLowerCase().includes(query);
  });

  els.orgMembersList.innerHTML = "";
  els.orgMembersResult.textContent = JSON.stringify(state.orgMembers, null, 2);

  members.forEach((member) => {
    const item = document.createElement("div");
    item.className = "item";
    const removeId = `remove-membership-${member.username}-${member.orgId}`;
    const roleSelectId = `org-member-role-${member.username}-${member.orgId}`;
    const roleSaveId = `org-member-save-${member.username}-${member.orgId}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${member.username}</strong>
        <span>${member.role}</span>
      </div>
      <div>org=${member.orgName} (${member.orgId})</div>
      <div>updated=${new Date(member.updatedAt).toLocaleString()}</div>
      <div class="actions">
        <select id="${roleSelectId}">
          <option value="member" ${member.role === "member" ? "selected" : ""}>Member</option>
          <option value="auditor" ${member.role === "auditor" ? "selected" : ""}>Auditor</option>
          <option value="admin" ${member.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
        <button id="${roleSaveId}" class="secondary" type="button">Save Role</button>
        <button id="${removeId}" class="secondary" type="button">Remove From Org</button>
      </div>
    `;
    els.orgMembersList.appendChild(item);
    item.querySelector(`#${CSS.escape(roleSaveId)}`).addEventListener("click", async () => {
      const role = item.querySelector(`#${CSS.escape(roleSelectId)}`).value;
      const result = await fetchJson(`/ai/users/${encodeURIComponent(member.username)}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders()
        },
        body: JSON.stringify({
          role,
          orgId: member.orgId
        })
      });
      els.orgMembersResult.textContent = JSON.stringify(result, null, 2);
      await Promise.all([refreshSession(), loadUsers(), loadOrganizations(), loadOrgMembers()]);
    });
    item.querySelector(`#${CSS.escape(removeId)}`).addEventListener("click", async () => {
      const result = await fetchJson(
        `/ai/users/${encodeURIComponent(member.username)}/memberships/${encodeURIComponent(member.orgId)}`,
        {
          method: "DELETE",
          headers: csrfHeaders()
        }
      );
      els.orgMembersResult.textContent = JSON.stringify(result, null, 2);
      await Promise.all([refreshSession(), loadUsers(), loadOrganizations(), loadOrgMembers()]);
    });
  });
}

async function testKey() {
  const body = {
    provider: els.keyProvider.value,
    secret: els.keySecret.value
  };
  const result = await fetchJson("/ai/provider/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });
  els.keyResult.textContent = JSON.stringify(result, null, 2);
}

async function savePolicy(event) {
  event.preventDefault();
  const body = {
    defaultMode: els.policyDefaultMode.value,
    allowBringYourOwnKey: els.policyAllowByok.checked,
    allowPlatformManagedKeys: els.policyAllowPlatform.checked,
    allowAuditView: els.policyAllowAudit.checked,
    requireExternalOptIn: els.policyRequireOptIn.checked,
    allowedProviders: els.policyProviders.value
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  };
  const result = await fetchJson("/ai/policy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });
  els.policyResult.textContent = JSON.stringify(result, null, 2);
  await refreshAll();
}

async function saveCapability(event) {
  event.preventDefault();
  const body = {
    provider: els.capabilityProvider.value,
    modelId: els.capabilityModelId.value,
    enabled: els.capabilityEnabled.checked,
    supportsText: els.capabilityText.checked,
    supportsImages: els.capabilityImages.checked,
    supportsTools: els.capabilityTools.checked,
    supportsReasoning: els.capabilityReasoning.checked,
    maxMode: els.capabilityMaxMode.value
  };
  const result = await fetchJson("/ai/capabilities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });
  els.capabilityResult.textContent = JSON.stringify(result, null, 2);
  await refreshAll();
}

async function savePurposePolicy(event) {
  event.preventDefault();
  const body = {
    purpose: els.purposeName.value,
    allowLocal: els.purposeAllowLocal.checked,
    allowExternal: els.purposeAllowExternal.checked,
    requireUserConsent: els.purposeRequireConsent.checked,
    requireHumanApproval: els.purposeRequireApproval.checked
  };
  const result = await fetchJson("/ai/purposes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });
  els.purposeResult.textContent = JSON.stringify(result, null, 2);
  await refreshAll();
}

async function loadConsent() {
  const purpose = els.requestPurpose.value || els.purposeName.value;
  const consent = await fetchJson(`/ai/consent/${encodeURIComponent(purpose)}`);
  els.consentGranted.checked = consent?.consentGranted ?? false;
}

async function saveConsent() {
  const body = {
    purpose: els.requestPurpose.value || els.purposeName.value,
    consentGranted: els.consentGranted.checked
  };
  const result = await fetchJson("/ai/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });
  els.requestResult.textContent = JSON.stringify(result, null, 2);
}

async function resolveApproval(id, status) {
  const result = await fetchJson(`/ai/approvals/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify({
      status
    })
  });
  els.requestResult.textContent = JSON.stringify(result, null, 2);
  await Promise.all([loadApprovals(), loadJobs(), loadAudit()]);
}

async function saveKey(event) {
  event.preventDefault();
  const source = els.credentialSource.value;
  const body = {
    orgId: els.orgId.value,
    ownerUserId: source === "org_byok" || source === "platform_managed" ? undefined : els.userId.value,
    provider: els.keyProvider.value,
    credentialSource: source,
    label: els.keyLabel.value,
    secret: els.keySecret.value
  };
  const result = await fetchJson("/ai/keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });
  els.keyResult.textContent = JSON.stringify(result, null, 2);
  els.keySecret.value = "";
  await refreshAll();
}

async function saveUser(event) {
  event.preventDefault();
  const result = await fetchJson("/ai/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify({
      username: els.adminUsername.value,
      password: els.adminPassword.value,
      role: els.adminRole.value,
      orgName: els.adminOrgName.value || undefined
    })
  });
  els.userResult.textContent = JSON.stringify(result, null, 2);
  els.adminPassword.value = "";
  await Promise.all([loadUsers(), loadOrganizations()]);
}

async function assignMembership(event) {
  event.preventDefault();
  const username = els.membershipUsername.value.trim();
  const result = await fetchJson(`/ai/users/${encodeURIComponent(username)}/memberships`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify({
      orgId: els.membershipOrgId.value,
      orgName: els.membershipOrgName.value || undefined,
      role: els.membershipRole.value
    })
  });
  els.membershipResult.textContent = JSON.stringify(result, null, 2);
  await Promise.all([refreshSession(), loadUsers(), loadOrganizations(), loadOrgMembers()]);
}

async function renameOrganization(event) {
  event.preventDefault();
  const result = await fetchJson(`/ai/orgs/${encodeURIComponent(els.orgManageId.value)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify({
      name: els.orgManageName.value
    })
  });
  els.orgsResult.textContent = JSON.stringify(result, null, 2);
  await Promise.all([refreshSession(), loadOrganizations(), loadUsers(), loadOrgMembers()]);
}

async function sendRequest(event) {
  event.preventDefault();
  const inlineImages = els.imageUrls.value
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const body = {
    userId: els.userId.value,
    orgId: els.orgId.value,
    mode: els.requestMode.value,
    purpose: els.requestPurpose.value,
    taskType: els.requestTaskType.value,
    providerPreference: els.requestProvider.value,
    credentialSource: els.requestCredentialSource.value,
    reasoningMode: els.requestReasoningMode.value,
    userOptInExternal: els.userOptInExternal.checked,
    input: {
      text: els.requestText.value,
      images: [...inlineImages, ...state.uploadedImages]
    }
  };

  const result = await fetchJson("/ai/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders()
    },
    body: JSON.stringify(body)
  });

  renderRequestResult(result);
  els.requestResult.textContent = JSON.stringify(result, null, 2);
  await Promise.all([loadAudit(), loadRequestHistory()]);
}

async function handleImageUpload() {
  const files = Array.from(els.imageFiles.files || []);
  state.uploadedImages = await Promise.all(files.map(fileToDataUrl));
  els.requestResultSummary.innerHTML = `
    <div class="detail-head">
      <strong>Images Ready</strong>
      <span class="status-badge muted">${state.uploadedImages.length}</span>
    </div>
    <div class="detail-copy">Uploaded images will be attached to the next gateway request.</div>
  `;
  els.requestResult.textContent = JSON.stringify(
    { uploadedImages: state.uploadedImages.length },
    null,
    2
  );
}

function renderRequestResult(result) {
  const statusTone = result.ok ? "success" : result.approval ? "warning" : "danger";
  const title = result.ok ? "Request Completed" : result.approval ? "Approval Required" : "Request Blocked";
  const detail = result.ok
    ? `Provider ${result.response?.provider ?? "-"} returned ${result.response?.model ?? "-"}`
    : result.decision?.reasonIfDenied ?? "Request did not execute";
  const responsePreview = result.response?.outputText
    ? escapeHtml(String(result.response.outputText).slice(0, 240))
    : "";

  els.requestResultSummary.innerHTML = `
    <div class="detail-head">
      <strong>${title}</strong>
      <span class="status-badge ${statusTone}">${result.ok ? "ok" : "attention"}</span>
    </div>
    <div class="meta-grid">
      <span>request: ${result.requestId ?? "-"}</span>
      <span>provider: ${result.response?.provider ?? result.approval?.provider ?? "-"}</span>
      <span>model: ${result.response?.model ?? "-"}</span>
      <span>approval: ${result.approval ? result.approval.status : "not-needed"}</span>
    </div>
    <div class="detail-copy">${detail}</div>
    ${responsePreview ? `<div class="detail-preview">${responsePreview}</div>` : ""}
  `;
}

function renderRequestHistoryStats(history) {
  const completed = history.filter((item) => item.status === "completed").length;
  const pending = history.filter((item) => item.status === "pending_approval").length;
  const denied = history.filter((item) => item.status === "denied").length;
  els.requestHistoryStats.innerHTML = `
    <div class="mini-stat">
      <span>Completed</span>
      <strong>${completed}</strong>
    </div>
    <div class="mini-stat">
      <span>Pending</span>
      <strong>${pending}</strong>
    </div>
    <div class="mini-stat">
      <span>Denied</span>
      <strong>${denied}</strong>
    </div>
  `;
}

function renderAlerts() {
  const alerts = [];
  const pendingApprovals = state.approvals.filter((item) => item.status === "pending");
  const deadJobs = state.jobs.filter((item) => item.status === "dead_letter");
  const failedJobs = state.jobs.filter((item) => item.status === "failed");
  const deniedRequests = state.requestHistory.filter((item) => item.status === "denied");
  const pendingRequests = state.requestHistory.filter((item) => item.status === "pending_approval");

  if (pendingApprovals.length >= 3) {
    alerts.push({
      level: "warning",
      title: "Approval backlog",
      body: `${pendingApprovals.length} approvals are waiting for review.`,
      action: () => setActiveTab("operations")
    });
  }

  if (deadJobs.length > 0) {
    alerts.push({
      level: "danger",
      title: "Dead-letter jobs detected",
      body: `${deadJobs.length} jobs have exhausted retries and need manual attention.`,
      action: () => setActiveTab("operations")
    });
  }

  if (failedJobs.length >= 3) {
    alerts.push({
      level: "warning",
      title: "Repeated job failures",
      body: `${failedJobs.length} jobs are currently failing before completion.`,
      action: () => setActiveTab("operations")
    });
  }

  if (deniedRequests.length >= 5) {
    alerts.push({
      level: "warning",
      title: "High request denial volume",
      body: `${deniedRequests.length} requests were denied in the current history view.`,
      action: () => setActiveTab("overview")
    });
  }

  if (pendingRequests.length >= 3) {
    alerts.push({
      level: "muted",
      title: "Requests waiting on approval",
      body: `${pendingRequests.length} requests are paused for human approval.`,
      action: () => setActiveTab("overview")
    });
  }

  els.alertsList.innerHTML = "";
  els.alertsCount.textContent = `${alerts.length} active`;
  els.alertsPanel.classList.toggle("empty", alerts.length === 0);

  if (!alerts.length) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item-row">
        <strong>No active alerts</strong>
        <span class="status-badge success">stable</span>
      </div>
      <div>Queue, approvals, and request history are within the current thresholds.</div>
    `;
    els.alertsList.appendChild(item);
    return;
  }

  alerts.forEach((alert) => {
    const item = document.createElement("div");
    item.className = `item alert-item ${alert.level}`;
    const openId = `alert-open-${Math.random().toString(36).slice(2, 10)}`;
    item.innerHTML = `
      <div class="item-row">
        <strong>${alert.title}</strong>
        <span class="status-badge ${alert.level}">${alert.level}</span>
      </div>
      <div>${alert.body}</div>
      <div class="actions">
        <button id="${openId}" class="secondary" type="button">Open Area</button>
      </div>
    `;
    els.alertsList.appendChild(item);
    item.querySelector(`#${CSS.escape(openId)}`).addEventListener("click", alert.action);
  });
}

function exportAudit() {
  const rows = state.auditEvents.map((event) => ({
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    requestId: event.requestId ?? "",
    userId: event.userId ?? "",
    orgId: event.orgId ?? "",
    details: JSON.stringify(event.details)
  }));
  downloadExport("audit-events", rows);
}

function exportRequestHistory() {
  const rows = state.requestHistory.map((item) => ({
    requestId: item.requestId,
    timestamp: item.timestamp,
    userId: item.userId ?? "",
    purpose: item.purpose ?? "",
    provider: item.provider ?? "",
    mode: item.mode ?? "",
    status: item.status,
    responseModel: item.responseModel ?? ""
  }));
  downloadExport("request-history", rows);
}

function exportApprovals() {
  const rows = state.approvals
    .filter((approval) => {
      if (els.approvalStatusFilter.value && approval.status !== els.approvalStatusFilter.value) {
        return false;
      }
      if (els.approvalUserFilter.value.trim()) {
        return approval.username.toLowerCase().includes(els.approvalUserFilter.value.trim().toLowerCase());
      }
      return true;
    })
    .map((approval) => ({
      id: approval.id,
      purpose: approval.purpose,
      provider: approval.provider,
      mode: approval.mode,
      username: approval.username,
      status: approval.status,
      reason: approval.reason ?? "",
      createdAt: approval.createdAt,
      resolvedAt: approval.resolvedAt ?? "",
      resolvedBy: approval.resolvedBy ?? "",
      executed: approval.executionResultJson ? "yes" : "no"
    }));
  downloadExport("approvals", rows);
}

function exportJobs() {
  const rows = state.jobs
    .filter((job) => {
      if (els.jobStatusFilter.value && job.status !== els.jobStatusFilter.value) {
        return false;
      }
      if (els.jobUserFilter.value.trim()) {
        return job.username.toLowerCase().includes(els.jobUserFilter.value.trim().toLowerCase());
      }
      return true;
    })
    .map((job) => ({
      id: job.id,
      approvalId: job.approvalId,
      username: job.username,
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextRunAt: job.nextRunAt,
      createdAt: job.createdAt,
      errorMessage: job.errorMessage ?? ""
    }));
  downloadExport("jobs", rows);
}

function downloadExport(name, rows) {
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const jsonBlob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  triggerDownload(jsonBlob, `${name}-${timestamp}.json`);

  const csv = rowsToCsv(rows);
  if (csv) {
    const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(csvBlob, `${name}-${timestamp}.csv`);
  }
}

function rowsToCsv(rows) {
  if (!rows.length) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => csvEscape(row[header]))
        .join(",")
    )
  ];
  return lines.join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function restoreSavedFilters() {
  els.auditTypeFilter.value = loadFilter(STORAGE_KEYS.auditType);
  els.auditUserFilter.value = loadFilter(STORAGE_KEYS.auditUser);
  els.requestHistoryPurpose.value = loadFilter(STORAGE_KEYS.requestPurpose);
  els.requestHistoryProvider.value = loadFilter(STORAGE_KEYS.requestProvider);
  els.requestHistoryStatus.value = loadFilter(STORAGE_KEYS.requestStatus);
  els.approvalStatusFilter.value = loadFilter(STORAGE_KEYS.approvalStatus);
  els.approvalUserFilter.value = loadFilter(STORAGE_KEYS.approvalUser);
  els.jobStatusFilter.value = loadFilter(STORAGE_KEYS.jobStatus);
  els.jobUserFilter.value = loadFilter(STORAGE_KEYS.jobUser);
}

function saveFilter(key, value) {
  try {
    window.localStorage.setItem(key, value ?? "");
  } catch {
    // Ignore storage failures in locked-down browser contexts.
  }
}

function loadFilter(key) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    if (response.status === 401) {
      state.authenticated = false;
      els.authShell.classList.add("visible");
      els.shell.classList.add("hidden");
    }
    throw new Error(JSON.stringify(data));
  }
  return data;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function csrfHeaders() {
  return state.csrfToken ? { "X-CSRF-Token": state.csrfToken } : {};
}

function setActiveTab(tabName) {
  els.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
}
