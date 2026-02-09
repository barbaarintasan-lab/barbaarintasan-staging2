import Stripe from 'stripe';

let connectionSettings: any;

async function getCredentials() {
  // Check for LIVE keys first (highest priority)
  if (process.env.STRIPE_LIVE_SECRET && process.env.STRIPE_LIVE_PUBLISHABLE) {
    console.log('[STRIPE] Using LIVE environment variables (STRIPE_LIVE_SECRET)');
    return {
      publishableKey: process.env.STRIPE_LIVE_PUBLISHABLE,
      secretKey: process.env.STRIPE_LIVE_SECRET,
    };
  }
  
  // Check for direct environment variables (for Fly.io and other non-Replit deployments)
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
    console.log('[STRIPE] Using direct environment variables (STRIPE_SECRET_KEY)');
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
    };
  }

  // Fallback to Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    // Last fallback: try just STRIPE_SECRET_KEY without publishable
    if (process.env.STRIPE_SECRET_KEY) {
      console.log('[STRIPE] Using STRIPE_SECRET_KEY only (no publishable key)');
      return {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY,
      };
    }
    throw new Error('No Stripe credentials found. Set STRIPE_SECRET_KEY or configure Replit connector.');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
