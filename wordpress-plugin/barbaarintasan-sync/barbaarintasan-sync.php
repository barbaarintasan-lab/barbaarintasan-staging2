<?php
/**
 * Plugin Name:       Barbaarintasan Sync
 * Plugin URI:        https://appbarbaarintasan.com
 * Description:       WooCommerce integration: syncs completed orders & user registrations to Barbaarintasan Academy app.
 * Version:           2.0.0
 * Author:            Barbaarintasan Academy
 * License:           GPL-2.0+
 * Text Domain:       barbaarintasan-sync
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * WC requires at least: 6.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
define( 'BSA_SYNC_VERSION',    '2.0.0' );
define( 'BSA_SYNC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BSA_SYNC_OPTION_KEY', 'bsa_sync_settings' );

// ─────────────────────────────────────────────
//  Activation / Deactivation
// ─────────────────────────────────────────────
register_activation_hook( __FILE__, 'bsa_sync_activate' );
function bsa_sync_activate() {
    add_option( BSA_SYNC_OPTION_KEY, [
        'app_url' => 'https://appbarbaarintasan.com',
        'api_key' => '',
    ]);
}

// ─────────────────────────────────────────────
//  Admin Settings Page
// ─────────────────────────────────────────────
add_action( 'admin_menu', 'bsa_sync_admin_menu' );
function bsa_sync_admin_menu() {
    add_options_page(
        'Barbaarintasan Sync',
        'Barbaarintasan Sync',
        'manage_options',
        'barbaarintasan-sync',
        'bsa_sync_settings_page'
    );
}

add_action( 'admin_init', 'bsa_sync_register_settings' );
function bsa_sync_register_settings() {
    register_setting( 'bsa_sync_group', BSA_SYNC_OPTION_KEY, [
        'sanitize_callback' => 'bsa_sync_sanitize_settings',
    ]);
}

function bsa_sync_sanitize_settings( $input ) {
    return [
        'app_url' => esc_url_raw( rtrim( $input['app_url'] ?? '', '/' ) ),
        'api_key' => sanitize_text_field( $input['api_key'] ?? '' ),
    ];
}

function bsa_sync_settings_page() {
    $opts = get_option( BSA_SYNC_OPTION_KEY, [] );
    ?>
    <div class="wrap">
        <h1>Barbaarintasan Sync — Settings</h1>

        <?php if ( ! class_exists('WooCommerce') ): ?>
            <div class="notice notice-error"><p><strong>⚠️ WooCommerce is not active.</strong> Please install and activate WooCommerce before using this plugin.</p></div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php settings_fields('bsa_sync_group'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="bsa_app_url">App URL</label></th>
                    <td>
                        <input type="url" id="bsa_app_url" name="<?= BSA_SYNC_OPTION_KEY ?>[app_url]"
                               value="<?= esc_attr( $opts['app_url'] ?? 'https://appbarbaarintasan.com' ) ?>"
                               class="regular-text" placeholder="https://appbarbaarintasan.com" />
                        <p class="description">Base URL of the Barbaarintasan Academy app (no trailing slash).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="bsa_api_key">API Key</label></th>
                    <td>
                        <input type="password" id="bsa_api_key" name="<?= BSA_SYNC_OPTION_KEY ?>[api_key]"
                               value="<?= esc_attr( $opts['api_key'] ?? '' ) ?>"
                               class="regular-text" autocomplete="new-password" />
                        <p class="description">Secret key — must match <code>WORDPRESS_API_KEY</code> environment variable in the app.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>

        <hr>
        <h2>Product Setup</h2>
        <p>For each WooCommerce product that maps to an academy course, add these <strong>Custom Fields</strong> (under the product's <em>Advanced</em> tab or via <em>Custom Fields</em> meta box):</p>
        <table class="wp-list-table widefat fixed striped" style="max-width:600px">
            <thead><tr><th>Meta Key</th><th>Example Value</th><th>Notes</th></tr></thead>
            <tbody>
                <tr><td><code>_bsa_course_id</code></td><td>0-6</td><td>Course slug (see list below)</td></tr>
                <tr><td><code>_bsa_plan_type</code></td><td>lifetime</td><td><code>monthly</code>, <code>yearly</code>, or <code>lifetime</code></td></tr>
            </tbody>
        </table>
        <h3>Available Course Slugs</h3>
        <table class="wp-list-table widefat fixed striped" style="max-width:500px">
            <thead><tr><th>Slug</th><th>Course Name</th></tr></thead>
            <tbody>
                <tr><td><code>0-6</code></td><td>0-6 Bilood Jir</td></tr>
                <tr><td><code>intellect</code></td><td>Koorsada Ilmo Is-Dabira</td></tr>
                <tr><td><code>autism</code></td><td>Autism Awareness</td></tr>
                <tr><td><code>all-access</code></td><td>Xulashada Oo Dhan (All Access)</td></tr>
            </tbody>
        </table>

        <hr>
        <h2>Connection Test</h2>
        <?php bsa_sync_render_test_section( $opts ); ?>
    </div>
    <?php
}

function bsa_sync_render_test_section( $opts ) {
    $app_url = $opts['app_url'] ?? '';
    $api_key = $opts['api_key'] ?? '';

    if ( empty($app_url) || empty($api_key) ) {
        echo '<p class="description">Save settings first to enable connection test.</p>';
        return;
    }

    if ( isset($_POST['bsa_test_connection']) && check_admin_referer('bsa_test_nonce') ) {
        $response = wp_remote_get( $app_url . '/api/wordpress/courses', [
            'headers' => [ 'X-API-Key' => $api_key ],
            'timeout' => 10,
        ]);

        if ( is_wp_error($response) ) {
            echo '<div class="notice notice-error inline"><p>❌ Connection failed: ' . esc_html( $response->get_error_message() ) . '</p></div>';
        } elseif ( wp_remote_retrieve_response_code($response) === 200 ) {
            $body = json_decode( wp_remote_retrieve_body($response), true );
            $count = count( $body['courses'] ?? [] );
            echo "<div class='notice notice-success inline'><p>✅ Connected! Found <strong>{$count} courses</strong> in the app.</p></div>";
        } else {
            $code = wp_remote_retrieve_response_code($response);
            echo "<div class='notice notice-error inline'><p>❌ HTTP {$code}: " . esc_html( wp_remote_retrieve_body($response) ) . '</p></div>';
        }
    }

    echo '<form method="post">';
    wp_nonce_field('bsa_test_nonce');
    echo '<input type="submit" name="bsa_test_connection" class="button button-secondary" value="Test Connection">';
    echo '</form>';
}

// ─────────────────────────────────────────────
//  Helper: get plugin settings
// ─────────────────────────────────────────────
function bsa_sync_get_settings() {
    return get_option( BSA_SYNC_OPTION_KEY, [
        'app_url' => 'https://appbarbaarintasan.com',
        'api_key' => '',
    ]);
}

// ─────────────────────────────────────────────
//  Helper: POST JSON to the app
// ─────────────────────────────────────────────
function bsa_sync_post( string $endpoint, array $body ): array {
    $opts    = bsa_sync_get_settings();
    $app_url = $opts['app_url'] ?? '';
    $api_key = $opts['api_key'] ?? '';

    if ( empty($app_url) || empty($api_key) ) {
        return [ 'success' => false, 'error' => 'Plugin not configured (missing app_url or api_key)' ];
    }

    $response = wp_remote_post( $app_url . $endpoint, [
        'headers' => [
            'Content-Type' => 'application/json',
            'X-API-Key'    => $api_key,
        ],
        'body'    => wp_json_encode( $body ),
        'timeout' => 15,
    ]);

    if ( is_wp_error($response) ) {
        return [ 'success' => false, 'error' => $response->get_error_message() ];
    }

    $code       = wp_remote_retrieve_response_code($response);
    $raw_body   = wp_remote_retrieve_body($response);
    $parsed     = json_decode( $raw_body, true ) ?: [];

    if ( $code >= 200 && $code < 300 ) {
        return array_merge( ['success' => true, 'http_code' => $code], $parsed );
    }

    return [
        'success'   => false,
        'http_code' => $code,
        'error'     => $parsed['error'] ?? $raw_body,
    ];
}

// ─────────────────────────────────────────────
//  HOOK 1: WooCommerce order completed → sync purchase
// ─────────────────────────────────────────────
add_action( 'woocommerce_order_status_completed', 'bsa_sync_order_completed', 10, 1 );

function bsa_sync_order_completed( int $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    $email    = $order->get_billing_email();
    $amount   = $order->get_total();
    $currency = $order->get_currency();
    $txn_id   = $order->get_transaction_id() ?: 'wc-order-' . $order_id;
    $method   = $order->get_payment_method_title();

    $items = $order->get_items();
    if ( empty($items) ) return;

    foreach ( $items as $item ) {
        $product = $item->get_product();
        if ( ! $product ) continue;

        $product_id = $product->get_id();
        // Support both simple products and variable product parent
        $parent_id  = $product->get_parent_id() ?: $product_id;

        // Read course mapping from product meta
        $course_id = get_post_meta( $product_id, '_bsa_course_id', true )
                  ?: get_post_meta( $parent_id,  '_bsa_course_id', true );
        $plan_type = get_post_meta( $product_id, '_bsa_plan_type', true )
                  ?: get_post_meta( $parent_id,  '_bsa_plan_type', true );

        // Also check variation meta
        if ( $product->is_type('variation') ) {
            $var_course = get_post_meta( $product_id, '_bsa_course_id', true );
            $var_plan   = get_post_meta( $product_id, '_bsa_plan_type',  true );
            if ( $var_course ) $course_id = $var_course;
            if ( $var_plan )   $plan_type = $var_plan;
        }

        if ( empty($course_id) || empty($plan_type) ) {
            // No mapping — skip this item silently
            error_log( "[BSA Sync] Order #{$order_id} item '{$product->get_name()}' has no _bsa_course_id/_bsa_plan_type meta — skipped." );
            continue;
        }

        $payload = [
            'email'          => $email,
            'course_id'      => sanitize_text_field( $course_id ),
            'plan_type'      => sanitize_text_field( $plan_type ),
            'amount'         => floatval( $amount ),
            'currency'       => $currency,
            'payment_method' => $method,
            'transaction_id' => $txn_id,
        ];

        $result = bsa_sync_post( '/api/wordpress/purchase', $payload );

        if ( $result['success'] ) {
            $order->add_order_note( sprintf(
                '[BSA Sync] ✅ Purchase synced — course: %s, plan: %s, email: %s',
                $course_id, $plan_type, $email
            ));
            error_log( "[BSA Sync] Order #{$order_id}: purchase synced successfully (course={$course_id}, plan={$plan_type}, email={$email})" );
        } else {
            $err = $result['error'] ?? 'Unknown error';
            $order->add_order_note( sprintf(
                '[BSA Sync] ❌ Sync failed — %s (course: %s, email: %s)',
                $err, $course_id, $email
            ));
            error_log( "[BSA Sync] Order #{$order_id}: sync FAILED — {$err}" );
        }
    }
}

// ─────────────────────────────────────────────
//  HOOK 2: New WordPress user registration → sync user to app
// ─────────────────────────────────────────────
add_action( 'user_register', 'bsa_sync_new_user', 10, 1 );

function bsa_sync_new_user( int $user_id ) {
    $user = get_userdata( $user_id );
    if ( ! $user ) return;

    $payload = [
        'email'  => $user->user_email,
        'name'   => trim( $user->first_name . ' ' . $user->last_name ) ?: $user->display_name,
        'phone'  => get_user_meta( $user_id, 'billing_phone', true ) ?: '',
        'source' => 'wordpress_registration',
    ];

    $result = bsa_sync_post( '/api/wordpress/sync-user', $payload );

    if ( $result['success'] ) {
        error_log( "[BSA Sync] New user synced: {$user->user_email}" );
    } else {
        error_log( "[BSA Sync] Failed to sync new user {$user->user_email}: " . ($result['error'] ?? 'unknown') );
    }
}

// ─────────────────────────────────────────────
//  HOOK 3: Manual resync button on order admin page
// ─────────────────────────────────────────────
add_action( 'woocommerce_order_actions', 'bsa_sync_add_order_action' );
function bsa_sync_add_order_action( $actions ) {
    $actions['bsa_sync_purchase'] = 'Sync to Barbaarintasan Academy';
    return $actions;
}

add_action( 'woocommerce_order_action_bsa_sync_purchase', 'bsa_sync_manual_resync' );
function bsa_sync_manual_resync( $order ) {
    bsa_sync_order_completed( $order->get_id() );
}

// ─────────────────────────────────────────────
//  Admin product meta box for easy mapping
// ─────────────────────────────────────────────
add_action( 'add_meta_boxes', 'bsa_sync_add_product_meta_box' );
function bsa_sync_add_product_meta_box() {
    add_meta_box(
        'bsa_sync_product_mapping',
        'Barbaarintasan Academy — Course Mapping',
        'bsa_sync_product_meta_box_html',
        'product',
        'side',
        'default'
    );
}

function bsa_sync_product_meta_box_html( $post ) {
    wp_nonce_field( 'bsa_product_meta_nonce', 'bsa_product_meta_nonce' );
    $course_id = get_post_meta( $post->ID, '_bsa_course_id', true );
    $plan_type = get_post_meta( $post->ID, '_bsa_plan_type', true );
    ?>
    <table class="form-table" style="margin:0">
        <tr>
            <td style="padding:4px 0">
                <label><strong>Course Slug</strong></label>
                <select name="bsa_course_id" style="width:100%;margin-top:4px">
                    <option value="">— Not mapped —</option>
                    <option value="0-6"        <?= selected($course_id,'0-6',false) ?>>0-6 Bilood Jir</option>
                    <option value="intellect"  <?= selected($course_id,'intellect',false) ?>>Ilmo Is-Dabira (Intellect)</option>
                    <option value="autism"     <?= selected($course_id,'autism',false) ?>>Autism Awareness</option>
                    <option value="all-access" <?= selected($course_id,'all-access',false) ?>>All Access (Xulasho Oo Dhan)</option>
                </select>
            </td>
        </tr>
        <tr>
            <td style="padding:4px 0">
                <label><strong>Plan Type</strong></label>
                <select name="bsa_plan_type" style="width:100%;margin-top:4px">
                    <option value="">— Select —</option>
                    <option value="monthly"  <?= selected($plan_type,'monthly',false)  ?>>Monthly</option>
                    <option value="yearly"   <?= selected($plan_type,'yearly',false)   ?>>Yearly</option>
                    <option value="lifetime" <?= selected($plan_type,'lifetime',false) ?>>Lifetime</option>
                </select>
            </td>
        </tr>
    </table>
    <?php
}

add_action( 'save_post_product', 'bsa_sync_save_product_meta' );
function bsa_sync_save_product_meta( int $post_id ) {
    if ( ! isset($_POST['bsa_product_meta_nonce']) ) return;
    if ( ! wp_verify_nonce( $_POST['bsa_product_meta_nonce'], 'bsa_product_meta_nonce' ) ) return;
    if ( defined('DOING_AUTOSAVE') && DOING_AUTOSAVE ) return;
    if ( ! current_user_can('edit_post', $post_id) ) return;

    $course_id = sanitize_text_field( $_POST['bsa_course_id'] ?? '' );
    $plan_type = sanitize_text_field( $_POST['bsa_plan_type'] ?? '' );

    if ( $course_id ) update_post_meta( $post_id, '_bsa_course_id', $course_id );
    else              delete_post_meta( $post_id, '_bsa_course_id' );

    if ( $plan_type ) update_post_meta( $post_id, '_bsa_plan_type', $plan_type );
    else              delete_post_meta( $post_id, '_bsa_plan_type' );
}
