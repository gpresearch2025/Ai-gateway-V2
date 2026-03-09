# Deployment Notes

## Current shape

- `gateway`: API server
- `worker`: background execution worker
- shared SQLite volume for local or single-node deployment

## Local container run

```bash
docker compose up --build
```

## Production guidance

- Replace SQLite with a managed database before multi-instance deployment.
- Replace env-based secrets with a real secret manager.
- Put the API behind HTTPS and a reverse proxy.
- Run the worker as a separate service, not inside the API process.
- Set resource limits and restart policies in your target platform.

## Secret manager integration target

The code now resolves platform-managed provider keys through a `SecretStore` abstraction.
The current implementation uses environment variables.

To productionize:

1. Implement a new `SecretStore` for your platform.
2. Inject it through app config.
3. Move provider API keys and admin bootstrap secrets out of `.env`.
