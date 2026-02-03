# Google Cloud Secret Manager Integration

This project now uses Google Cloud Secret Manager for API keys and sensitive configuration.

## Setup

### 1. Install Dependencies

```bash
npm install @google-cloud/secret-manager
```

### 2. Configure Google Cloud

Make sure you're authenticated with gcloud:

```bash
# Already done on this machine
gcloud auth application-default login
```

### 3. Use Secrets in Your Code

```javascript
const { loadSecretsToEnv, getSecret } = require('./secrets_manager');

// Load secrets at application startup
async function init() {
  await loadSecretsToEnv();

  // Now secrets are available in process.env
  console.log('Groq API Key:', process.env.GROQ_API_KEY);
  console.log('Cerebras API Key:', process.env.CEREBRAS_API_KEY);
}

init();
```

### 4. Update Your Application Startup

Add this to the top of your main application file:

```javascript
// Load secrets before starting the app
require('./secrets_manager').loadSecretsToEnv()
  .then(() => {
    // Start your application
    const app = require('./app');
    app.listen(3000);
  })
  .catch(error => {
    console.error('Failed to load secrets:', error);
    process.exit(1);
  });
```

## Available Secrets

- `groq-api-key-ai-village` - Groq API key
- `cerebras-api-key` - Cerebras API key
- `nats-url` - NATS server URL (password extracted automatically)

## Local Development

You can still use `.env` for local-only configuration like:
- `NATS_URL` (server address)
- `PROJECT_NAME`
- `DASHBOARD_PORT`
- `MATRIX_*` (if using Matrix)

But all API keys should come from Secret Manager.

## Using in TypeScript

If using TypeScript, you can create a types file:

```typescript
// secrets.d.ts
declare module 'secrets_manager' {
  export function getSecret(name: string, version?: string): Promise<string>;
  export function loadSecrets(): Promise<Record<string, string>>;
  export function loadSecretsToEnv(): Promise<void>;
}
```

## Accessing Secrets from CLI

```bash
# Using Node
node -e "require('./secrets_manager').getSecret('groq-api-key-ai-village').then(console.log)"

# Or use the helper scripts in ~/
~/gcloud-secrets.sh groq-api-key-ai-village
```

## Production Deployment

On production (Google VMs), secrets are automatically accessible via the VM's service account.

No additional authentication needed!

## Testing

Test your Secret Manager setup:

```bash
node -e "require('./secrets_manager').loadSecretsToEnv().then(() => console.log('Success!'))"
```
