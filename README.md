# AI Gateway

Minimal hybrid BYOK AI Gateway scaffold based on the project documents in the parent folder.

## What this includes

- Express + TypeScript backend
- gateway request endpoint
- policy engine for `private`, `private_plus`, and `max_intelligence`
- model router with local and external provider adapters
- SQLite-backed BYOK credential and audit storage
- provider discovery and key test endpoints
- audit log service
- basic payload minimization before external calls
- real HTTP adapters for OpenAI and Anthropic
- real OpenAI-compatible local Qwen adapter for vLLM-style runtimes
- image-capable request payload handling for local Qwen and external providers
- browser-based admin and test console served from `/`
- basic admin login gate for the console and `/ai` API routes
- login rate limiting and CSRF protection for admin actions
- persistent SQLite-backed admin sessions with hashed passwords
- org/user role-based auth with `admin`, `member`, and `auditor` roles
- persistent per-org policy controls for providers, key sources, and default mode
- per-org provider/model capability registry with model-level feature gates
- stored purpose policy and per-user consent enforcement
- persistent human-approval queue for policies that require manual approval
- approved requests can now be replayed automatically from the approval queue
- approved requests now run through a persistent background job worker
- the background worker now runs as a separate process from the API server
- failed jobs now retry with backoff and move to dead-letter state after max attempts
- dead-letter jobs can now be manually requeued from the admin API/UI
- basic operational metrics and detailed health endpoints are now exposed
- container packaging for separate API and worker deployment
- secret-store abstraction to prepare for a real secret manager
- env, AWS Secrets Manager, and Azure Key Vault secret-store options
- Postgres migration tooling and schema export path
- Kubernetes, Render, and Fly deployment scaffolding

## What this does not include yet

- KMS-backed envelope encryption for stored BYOK secrets
- consent service integration
- record retrieval from a health-data vault
- full HIPAA-grade de-identification pipeline

## Project structure

```text
src/
  audit/
  keys/
  policy/
  privacy/
  providers/
  router/
  services/
  utils/
```

## Install

```bash
npm install
```

Create a local env file:

```bash
copy .env.example .env
```

Set `ADMIN_PASSWORD` before using the console. On startup, the gateway seeds or updates a default admin user and org in SQLite from `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `DEFAULT_ORG_ID`, and `DEFAULT_ORG_NAME`.

Set `AI_GATEWAY_ENCRYPTION_KEY` before storing any provider credentials. Stored BYOK secrets now use AES-256-GCM instead of reversible base64 encoding.

Example PowerShell key generation:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Then store it in `.env` with the `base64:` prefix:

```text
AI_GATEWAY_ENCRYPTION_KEY=base64:your-32-byte-base64-value
```

You can also create or update org-scoped users directly:

```bash
npm run user:create -- --username admin --password your-password --org demo-org --role admin
```

List current users:

```bash
npm run user:create -- --list
```

PowerShell helper:

```powershell
.\create-user.ps1 -Username admin -Password your-password -Org demo-org -Role admin
```

You can set org policy from the CLI:

```bash
npm run policy:set -- --org demo-org --mode private_plus --providers local_qwen,openai --allow-byok true --allow-platform false
```

You can set model capabilities from the CLI:

```bash
npm run capability:set -- --org demo-org --provider openai --model gpt-4.1-mini --enabled true --images true --reasoning true --max-mode max_intelligence
```

You can set purpose policy from the CLI:

```bash
npm run purpose:set -- --org demo-org --purpose explain_labs --allow-local true --allow-external true --require-consent true --require-approval false
```

You can migrate the current SQLite data into Postgres:

```bash
POSTGRES_URL=postgres://user:pass@host:5432/db npm run db:migrate:postgres
```

## Run

```bash
npm run dev
```

Or on PowerShell:

```powershell
.\start-gateway.ps1
```

Start the worker separately:

```powershell
.\start-worker.ps1
```

To start a local Qwen-compatible runtime with vLLM:

```powershell
.\start-qwen.ps1
```

Or build and start:

```bash
npm run build
npm start
npm run start:worker
```

Containerized local run:

```bash
docker compose up --build
```

Additional deployment scaffolding:

- Kubernetes manifests in [deploy/k8s](C:\Ai Projects\Ai Gateway\Imput Doc\Al-Gateway - Everything\ai-gateway\deploy\k8s)
- Render config in [render.yaml](C:\Ai Projects\Ai Gateway\Imput Doc\Al-Gateway - Everything\ai-gateway\render.yaml)
- Fly config in [fly.toml](C:\Ai Projects\Ai Gateway\Imput Doc\Al-Gateway - Everything\ai-gateway\fly.toml)
- Postgres schema in [postgres-schema.sql](C:\Ai Projects\Ai Gateway\Imput Doc\Al-Gateway - Everything\ai-gateway\db\postgres-schema.sql)
- Deployment notes in [DEPLOYMENT.md](C:\Ai Projects\Ai Gateway\Imput Doc\Al-Gateway - Everything\ai-gateway\DEPLOYMENT.md)

SQLite data is stored by default at `./data/ai-gateway.db`.

## Optional environment variables

```bash
AI_GATEWAY_DB_PATH=./data/ai-gateway.db
AI_GATEWAY_ENCRYPTION_KEY=base64:...
DATABASE_PROVIDER=sqlite
SECRET_STORE_PROVIDER=env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
DEFAULT_ORG_ID=demo-org
DEFAULT_ORG_NAME=Demo Org
AWS_REGION=
AWS_SECRET_PREFIX=
AZURE_KEY_VAULT_URL=
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
LOCAL_QWEN_BASE_URL=http://127.0.0.1:8000/v1
LOCAL_QWEN_MODEL=qwen3.5-4b
JOB_WORKER_INTERVAL_MS=2000
JOB_MAX_ATTEMPTS=3
JOB_RETRY_BASE_MS=2000
JOB_RETRY_MAX_MS=60000
```

`DATABASE_PROVIDER` supports `sqlite` and `postgres`.
Set `POSTGRES_URL` when using `DATABASE_PROVIDER=postgres`.
`AUTH_MODE` supports `local` and `trusted_header`.
When using `AUTH_MODE=trusted_header`, the gateway expects upstream identity headers and disables the local login flow.
`AI_GATEWAY_ENCRYPTION_KEY` is required for storing or reading BYOK credentials from the local database.
`OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are used for `platform_managed` routing when no stored shared key exists.
`LOCAL_QWEN_BASE_URL` should point at an OpenAI-compatible local runtime such as vLLM.
`SECRET_STORE_PROVIDER` can be `env`, `aws-secrets-manager`, or `azure-key-vault`.

## Local Qwen example

If you have a vLLM-compatible local server, point the gateway at it through `.env`:

```bash
LOCAL_QWEN_BASE_URL=http://127.0.0.1:8000/v1
LOCAL_QWEN_MODEL=qwen3.5-4b
```

Then start the gateway and open:

```text
http://localhost:3001/
```

## vLLM helper

The included PowerShell helper starts an OpenAI-compatible local runtime:

```powershell
.\start-qwen.ps1 -Model "Qwen/Qwen2.5-VL-3B-Instruct" -Port 8000
```

If you want to pass extra vLLM flags:

```powershell
.\start-qwen.ps1 -ExtraArgs "--max-model-len 8192 --dtype auto"
```

The gateway should then use:

```text
LOCAL_QWEN_BASE_URL=http://127.0.0.1:8000/v1
```

## API endpoints

- `GET /health`
- `GET /health/details`
- `GET /ai/modes`
- `GET /ai/providers?orgId=demo-org&userId=demo-user`
- `POST /ai/keys`
- `GET /ai/keys`
- `DELETE /ai/keys/:id`
- `POST /ai/provider/test`
- `POST /ai/request`
- `GET /ai/audit/:id`
- `GET /ai/metrics`

## Example: add a BYOK credential

```json
{
  "orgId": "demo-org",
  "ownerUserId": "demo-user",
  "provider": "openai",
  "credentialSource": "user_byok",
  "label": "My OpenAI Key",
  "secret": "sk-example-key"
}
```

## Example: send a hybrid request

```json
{
  "userId": "demo-user",
  "orgId": "demo-org",
  "mode": "private_plus",
  "purpose": "explain_labs",
  "taskType": "question_answer",
  "providerPreference": "openai",
  "credentialSource": "user_byok",
  "reasoningMode": "light",
  "userOptInExternal": true,
  "input": {
    "text": "Explain my cholesterol results without using my identifying information.",
    "images": [
      "data:image/png;base64,<base64-image>"
    ]
  }
}
```

## Recommended next steps

1. Move from app-managed AES keys to KMS-backed envelope encryption.
2. Replace the live SQLite runtime with Postgres.
3. Move payload minimization into a tested service with golden records and deny rules.
4. Replace custom auth with org SSO if this becomes multi-tenant production software.
