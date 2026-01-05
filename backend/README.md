# Design Inspector API

Vercel serverless backend for the Design Inspector Chrome extension.

## Endpoints

### GET /api/version

Returns version configuration for force-update checking.

**Response:**
```json
{
  "minVersion": "1.0",
  "latestVersion": "1.0",
  "updateMessage": "Please update...",
  "forceUpdate": false,
  "storeUrl": "https://chrome.google.com/webstore/detail/..."
}
```

## Forcing Updates

When you release a new version that requires all users to update (e.g., paywall release):

1. Update `version-config.json`:
   ```json
   {
     "minVersion": "2.0",
     "latestVersion": "2.0",
     "updateMessage": "Update required to access new premium features!",
     "forceUpdate": true,
     "storeUrl": "https://chrome.google.com/webstore/detail/YOUR_ID"
   }
   ```

2. Deploy to Vercel:
   ```bash
   cd backend
   vercel --prod
   ```

3. All users on older versions will see a force-update screen.

## Development

```bash
# Install Vercel CLI globally
npm i -g vercel

# Run locally
vercel dev

# Deploy
vercel --prod
```

## First-time Setup

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`
4. Deploy: `vercel --prod`
5. Copy the production URL and update the extension's API_URL
