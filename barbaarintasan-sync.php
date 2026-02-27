<?php
/*
Plugin Name: Barbaarintasan Academy Sync
Plugin URI: https://appbarbaarintasan.com
Description: Syncs WooCommerce purchases and user data between barbaarintasan.com and appbarbaarintasan.com. Auto-enrolls users, syncs password resets, and manages course access.
Version: 3.0
Author: Barbaarintasan Academy
*/

if (!defined('ABSPATH')) exit;

define('BSA_SYNC_API_URL', 'https://appbarbaarintasan.com/api/wordpress/purchase');
define('BSA_SYNC_API_KEY', 'f6f7ce5e91c6b9a1');

add_action('woocommerce_order_status_completed', 'bsa_sync_order_to_platform', 10, 1);

function bsa_sync_order_to_platform($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        bsa_log("Order #{$order_id} not found");
        return;
    }

    $billing_email = $order->get_billing_email();
    if (!$billing_email) {
        bsa_log("Order #{$order_id}: No billing email");
        return;
    }

    $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    $customer_phone = $order->get_billing_phone();

    $items = $order->get_items();
    foreach ($items as $item) {
        $product = $item->get_product();
        if (!$product) continue;

        $product_id = $item->get_product_id();

        $course_slug = get_post_meta($product_id, '_bsa_course_slug', true);
        if (!$course_slug) {
            $course_slug = get_post_meta($product_id, '_course_id', true);
        }
        if (!$course_slug) {
            bsa_log("Order #{$order_id}: Product #{$product_id} has no course slug, skipping");
            continue;
        }

        $plan_type = get_post_meta($product_id, '_bsa_plan_type', true);
        if (!$plan_type) {
            $plan_type = 'monthly';
        }

        $payload = [
            'email'          => strtolower(trim($billing_email)),
            'name'           => $customer_name,
            'phone'          => $customer_phone,
            'course_id'      => $course_slug,
            'plan_type'      => $plan_type,
            'amount'         => (float) $order->get_total(),
            'currency'       => $order->get_currency(),
            'payment_method' => $order->get_payment_method_title(),
            'transaction_id' => $order->get_transaction_id() ?: "woo-{$order_id}",
        ];

        $response = wp_remote_post(BSA_SYNC_API_URL, [
            'body'    => json_encode($payload),
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key'    => BSA_SYNC_API_KEY,
            ],
            'timeout' => 30,
        ]);

        if (is_wp_error($response)) {
            bsa_log("Order #{$order_id}: API error for {$course_slug} - " . $response->get_error_message());
            $order->add_order_note("BSA Sync failed for {$course_slug}: " . $response->get_error_message());
        } else {
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if ($code === 200 && !empty($data['success'])) {
                $order->add_order_note("BSA Sync OK: {$course_slug} enrolled (plan: {$plan_type})");
                bsa_log("Order #{$order_id}: Enrolled {$billing_email} in {$course_slug}");
            } else {
                $err = $data['error'] ?? $data['message'] ?? "HTTP {$code}";
                $order->add_order_note("BSA Sync failed for {$course_slug}: {$err}");
                bsa_log("Order #{$order_id}: Failed {$course_slug} - {$err}");
            }
        }
    }
}

function bsa_log($message) {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('[BSA Sync] ' . $message);
    }
}

// ==================== REST API ENDPOINTS ====================

add_action('rest_api_init', function () {
    register_rest_route('bsa/v1', '/reset-password', [
        'methods'  => 'POST',
        'callback' => 'bsa_handle_password_reset',
        'permission_callback' => 'bsa_verify_api_key',
    ]);

    register_rest_route('bsa/v1', '/sync-user', [
        'methods'  => 'POST',
        'callback' => 'bsa_handle_sync_user',
        'permission_callback' => 'bsa_verify_api_key',
    ]);
});

function bsa_verify_api_key($request) {
    $api_key = $request->get_header('X-API-Key');
    if (!$api_key || $api_key !== BSA_SYNC_API_KEY) {
        return new WP_Error('unauthorized', 'Invalid API key', ['status' => 401]);
    }
    return true;
}

function bsa_handle_password_reset($request) {
    $email = sanitize_email($request->get_param('email'));
    $password_hash = $request->get_param('password_hash');

    if (!$email || !$password_hash) {
        return new WP_REST_Response(['success' => false, 'error' => 'Email and password_hash required'], 400);
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        bsa_log("Password reset: user not found for {$email}");
        return new WP_REST_Response(['success' => false, 'error' => 'User not found', 'action' => 'not_found'], 404);
    }

    global $wpdb;
    $wpdb->update(
        $wpdb->users,
        ['user_pass' => $password_hash],
        ['ID' => $user->ID]
    );

    clean_user_cache($user->ID);

    bsa_log("Password reset synced for {$email} (user #{$user->ID})");

    return new WP_REST_Response([
        'success' => true,
        'action'  => 'password_updated',
        'user_id' => $user->ID,
    ]);
}

function bsa_handle_sync_user($request) {
    $email = sanitize_email($request->get_param('email'));
    $name  = sanitize_text_field($request->get_param('name'));
    $phone = sanitize_text_field($request->get_param('phone'));
    $password_hash = $request->get_param('password_hash');
    if ($password_hash) {
        $password_hash = preg_replace('/^\$2b\$/', '$2y$', $password_hash);
    }

    if (!$email) {
        return new WP_REST_Response(['success' => false, 'error' => 'Email required'], 400);
    }

    $existing_user = get_user_by('email', $email);
    if ($existing_user) {
        if ($name) {
            $name_parts = explode(' ', $name, 2);
            update_user_meta($existing_user->ID, 'first_name', $name_parts[0]);
            if (isset($name_parts[1])) {
                update_user_meta($existing_user->ID, 'last_name', $name_parts[1]);
            }
        }
        if ($phone) {
            update_user_meta($existing_user->ID, 'billing_phone', $phone);
        }
        if ($password_hash) {
            global $wpdb;
            $wpdb->update($wpdb->users, ['user_pass' => $password_hash], ['ID' => $existing_user->ID]);
            clean_user_cache($existing_user->ID);
        }

        bsa_log("Sync user: updated existing user {$email} (#{$existing_user->ID})");
        return new WP_REST_Response(['success' => true, 'action' => 'updated', 'user_id' => $existing_user->ID]);
    }

    $username = strstr($email, '@', true);
    $counter  = 1;
    $base     = $username;
    while (username_exists($username)) {
        $username = $base . $counter;
        $counter++;
    }

    $temp_password = wp_generate_password(16, true, true);
    $user_id = wp_create_user($username, $temp_password, $email);

    if (is_wp_error($user_id)) {
        bsa_log("Sync user: failed to create user {$email} - " . $user_id->get_error_message());
        return new WP_REST_Response(['success' => false, 'error' => $user_id->get_error_message()], 500);
    }

    $user = new WP_User($user_id);
    $user->set_role('customer');

    if ($name) {
        $name_parts = explode(' ', $name, 2);
        update_user_meta($user_id, 'first_name', $name_parts[0]);
        update_user_meta($user_id, 'billing_first_name', $name_parts[0]);
        if (isset($name_parts[1])) {
            update_user_meta($user_id, 'last_name', $name_parts[1]);
            update_user_meta($user_id, 'billing_last_name', $name_parts[1]);
        }
        wp_update_user(['ID' => $user_id, 'display_name' => $name]);
    }

    if ($phone) {
        update_user_meta($user_id, 'billing_phone', $phone);
    }

    update_user_meta($user_id, 'billing_email', $email);

    if ($password_hash) {
        global $wpdb;
        $wpdb->update($wpdb->users, ['user_pass' => $password_hash], ['ID' => $user_id]);
        clean_user_cache($user_id);
    }

    bsa_log("Sync user: created new user {$email} (#{$user_id})");
    return new WP_REST_Response(['success' => true, 'action' => 'created', 'user_id' => $user_id]);
}

// ==================== PRODUCT META BOX ====================

add_action('add_meta_boxes', 'bsa_add_product_meta_box');

function bsa_add_product_meta_box() {
    add_meta_box(
        'bsa_course_settings',
        'Barbaarintasan Academy',
        'bsa_render_product_meta_box',
        'product',
        'side',
        'default'
    );
}

function bsa_render_product_meta_box($post) {
    wp_nonce_field('bsa_save_meta', 'bsa_meta_nonce');

    $slug = get_post_meta($post->ID, '_bsa_course_slug', true);
    $plan = get_post_meta($post->ID, '_bsa_plan_type', true);
    ?>
    <p>
        <label for="bsa_course_slug"><strong>Course Slug:</strong></label><br>
        <input type="text" id="bsa_course_slug" name="bsa_course_slug" value="<?php echo esc_attr($slug); ?>" style="width:100%">
        <br><small>e.g. <code>0-6</code>, <code>intellect</code>, <code>all-access</code></small>
    </p>
    <p>
        <label for="bsa_plan_type"><strong>Plan Type:</strong></label><br>
        <select id="bsa_plan_type" name="bsa_plan_type" style="width:100%">
            <option value="monthly" <?php selected($plan, 'monthly'); ?>>Monthly (1 bil)</option>
            <option value="yearly" <?php selected($plan, 'yearly'); ?>>Yearly / Dahabi (12 bilood)</option>
            <option value="onetime" <?php selected($plan, 'onetime'); ?>>One-time (6 bilood)</option>
            <option value="lifetime" <?php selected($plan, 'lifetime'); ?>>Lifetime</option>
        </select>
    </p>
    <?php
}

add_action('save_post_product', 'bsa_save_product_meta');

function bsa_save_product_meta($post_id) {
    if (!isset($_POST['bsa_meta_nonce']) || !wp_verify_nonce($_POST['bsa_meta_nonce'], 'bsa_save_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    if (isset($_POST['bsa_course_slug'])) {
        update_post_meta($post_id, '_bsa_course_slug', sanitize_text_field($_POST['bsa_course_slug']));
    }
    if (isset($_POST['bsa_plan_type'])) {
        update_post_meta($post_id, '_bsa_plan_type', sanitize_text_field($_POST['bsa_plan_type']));
    }
}
