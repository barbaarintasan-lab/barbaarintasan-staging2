# Barbaarintasan Academy Sync - WooCommerce Plugin

## Installation

1. Download the `barbaarintasan-sync.php` file
2. Upload to your WordPress site at `/wp-content/plugins/barbaarintasan-sync/barbaarintasan-sync.php`
3. Activate the plugin in WordPress Admin > Plugins

## Configuration

1. Go to **Settings > Barbaarintasan Sync**
2. Enter:
   - **API URL**: `https://appbarbaarintasan.com`
   - **API Key**: Your `WORDPRESS_API_KEY` from Replit secrets
3. Save changes

## Setting Up Products

For each WooCommerce product:

1. Edit the product
2. In the **Product data > General** tab, you'll see:
   - **Barbaarintasan Course Slug**: Enter the course slug (see table below)
   - **Barbaarintasan Plan Type**: Select monthly, yearly, or lifetime

## Course Slugs

| Course | Slug |
|--------|------|
| 0-6 Bilood Jir | `0-6-bilood` |
| 6-12 Bilood Jir | `6-12-bilood` |
| 1-2 Sano Jir | `1-2-sano` |
| 2-4 Sano Jir | `2-4-sano` |
| 4-7 Sano Jir | `4-7-sano` |
| Koorsada Ilmo Is-Dabira | `ilmo-is-dabira` |
| Koorsada Ilmo Caqli Sare | `caqli-sare` |
| Koorsada Autism | `autism` |
| All-Access Subscription | `all-access` |

## How It Works

1. Customer places order on WooCommerce (manual payment, bank transfer, etc.)
2. Admin reviews and marks order as "Processing" or "Completed"
3. Plugin automatically:
   - Checks if customer is registered in the app (by email)
   - Creates enrollment in the app
   - Adds order note with result

## Manual Sync

If automatic sync fails:
1. Go to the order in WooCommerce
2. Look for "Barbaarintasan Sync" box on the right
3. Click "Sync Now" or "Re-sync"

## Troubleshooting

### "User not registered in app"
Customer must register at https://appbarbaarintasan.com/register before purchasing.

### "API key not configured"
Go to Settings > Barbaarintasan Sync and enter your API key.

### Check logs
- Enable WP_DEBUG in wp-config.php
- Check WooCommerce > Status > Logs > barbaarintasan-sync

## Important Notes

- Customers must use the SAME email for WordPress and the app
- Sync only happens when order status changes to Processing/Completed
- Failed syncs can be retried from the order page
