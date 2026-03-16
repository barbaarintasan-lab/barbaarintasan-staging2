# Barbaarintasan Academy - Fly.io Staging Deployment

## Prerequisites

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly.io:
```bash
fly auth login
```

## Staging Deployment Steps

### Step 1: Create the Fly.io App

```bash
fly apps create barbaarintasan-staging
```

### Step 2: Set Required Secrets

Set all required environment variables as Fly secrets:

```bash
# Core
fly secrets set SESSION_SECRET="your-session-secret" -a barbaarintasan-staging

# Database (use a separate staging database!)
fly secrets set DATABASE_URL="postgres://user:password@host/staging_db" -a barbaarintasan-staging

# AI Services
fly secrets set OPENAI_API_KEY="sk-..." -a barbaarintasan-staging
fly secrets set OPENAI_PROJECT_ID="proj-..." -a barbaarintasan-staging

# Azure TTS
fly secrets set AZURE_SPEECH_KEY="..." -a barbaarintasan-staging
fly secrets set AZURE_SPEECH_REGION="eastus" -a barbaarintasan-staging

# LiveKit (Voice Rooms)
fly secrets set LIVEKIT_URL="wss://..." -a barbaarintasan-staging
fly secrets set LIVEKIT_API_KEY="..." -a barbaarintasan-staging
fly secrets set LIVEKIT_API_SECRET="..." -a barbaarintasan-staging

# PayPal
fly secrets set PAYPAL_CLIENT_ID="..." -a barbaarintasan-staging
fly secrets set PAYPAL_CLIENT_SECRET="..." -a barbaarintasan-staging

# Telegram
fly secrets set TELEGRAM_BOT_TOKEN="..." -a barbaarintasan-staging
fly secrets set TELEGRAM_GROUP_CHAT_ID="..." -a barbaarintasan-staging

# Other secrets as needed...
```

### Step 3: Allocate an IP Address

```bash
fly ips allocate-v4 -a barbaarintasan-staging
fly ips allocate-v6 -a barbaarintasan-staging
```

### Step 4: Configure Custom Domain

1. Get the allocated IP addresses:
```bash
fly ips list -a barbaarintasan-staging
```

2. Add DNS records for `staging.appbarbaarintasan.com`:
   - A record → IPv4 address
   - AAAA record → IPv6 address

3. Add the certificate:
```bash
fly certs add staging.appbarbaarintasan.com -a barbaarintasan-staging
```

### Step 5: Deploy

```bash
fly deploy -a barbaarintasan-staging
```

### Step 6: Verify Deployment

```bash
# Check app status
fly status -a barbaarintasan-staging

# View logs
fly logs -a barbaarintasan-staging

# Check health endpoint
curl https://staging.appbarbaarintasan.com/api/health
```

## Important Notes

### Staging Mode Features

When `STAGING=true` is set (default in fly.toml):

1. **Cron jobs are disabled** - No scheduled tasks will run
2. **Daily content generation is skipped** - The `/api/cron/daily-content` endpoint returns early without generating content
3. **All other features work normally** - Users can login, view courses, etc.

### Database Considerations

⚠️ **Use a separate staging database!** Do not point staging to the production database.

### Telegram/Notification Considerations

⚠️ **Use staging-specific tokens!** If you use production Telegram bot tokens, notifications from staging will go to production groups. Either:
- Create a separate staging Telegram bot
- Use different group chat IDs for staging
- Or leave TELEGRAM_BOT_TOKEN unset to disable notifications entirely

Option 1: Create a new Neon database for staging
Option 2: Use Fly Postgres:
```bash
fly postgres create --name barbaarintasan-staging-db
fly postgres attach barbaarintasan-staging-db -a barbaarintasan-staging
```

### Scaling

Adjust resources in `fly.toml`:
```toml
[[vm]]
  memory = "1gb"  # Increase if needed
  cpu_kind = "shared"
  cpus = 1
```

Scale machines:
```bash
fly scale count 2 -a barbaarintasan-staging  # Add more instances
```

### Monitoring

```bash
# Live logs
fly logs -a barbaarintasan-staging

# SSH into container
fly ssh console -a barbaarintasan-staging

# Check metrics
fly dashboard -a barbaarintasan-staging
```

## Rollback

If something goes wrong:
```bash
fly releases -a barbaarintasan-staging  # List releases
fly deploy --image <previous-image> -a barbaarintasan-staging  # Rollback
```

## Cost Estimate

- Shared 1GB VM: ~$5-7/month
- Bandwidth: Included (up to limits)
- Total staging cost: ~$7-10/month
