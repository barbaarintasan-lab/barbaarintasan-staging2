=== Barbaarintasan Sync ===
Contributors: barbaarintasan
Tags: woocommerce, lms, e-learning, somali
Requires at least: 5.8
Tested up to: 6.4
Stable tag: 2.0.0
Requires PHP: 7.4
License: GPL-2.0+

Syncs WooCommerce completed orders and user registrations to Barbaarintasan Academy app.

== Description ==

This plugin connects your WordPress/WooCommerce store to the Barbaarintasan Academy
app (appbarbaarintasan.com). When a customer completes an order, the plugin
automatically enrolls them in the corresponding course inside the app.

**Features:**

* Automatic enrollment on order completion
* Supports monthly, yearly, and lifetime plans
* Syncs new WordPress registrations to the app
* Manual resync button on each WooCommerce order
* Simple product meta box for mapping products to courses
* Connection test from the settings page

== Installation ==

1. Upload `barbaarintasan-sync` folder to `/wp-content/plugins/`
2. Activate the plugin from **Plugins** menu
3. Go to **Settings → Barbaarintasan Sync**
4. Set **App URL**: `https://appbarbaarintasan.com`
5. Set **API Key**: the value of `WORDPRESS_API_KEY` env var from the app
6. For each WooCommerce product, open the product and use the
   **Barbaarintasan Academy — Course Mapping** box (right sidebar) to select
   the course slug and plan type.

== Product Mapping ==

Each WooCommerce product needs two meta values:

* `_bsa_course_id` — course slug: `0-6`, `intellect`, `autism`, `all-access`
* `_bsa_plan_type` — plan: `monthly`, `yearly`, or `lifetime`

These can be set via the Course Mapping meta box in the product editor.

== Changelog ==

= 2.0.0 =
* Added admin product meta box for easy course mapping
* Added manual resync action on order admin page
* Added user registration sync
* Added connection test button in settings
* Improved error logging and order notes

= 1.0.0 =
* Initial release — WooCommerce order completed hook
