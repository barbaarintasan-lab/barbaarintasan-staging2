<?php
/*
Plugin Name: BSA Sync
Plugin URI: https://appbarbaarintasan.com
Description: App user sync + WooCommerce order enrollment
Version: 3.1.0
Author: Barbaarintasan Academy
Author URI: https://barbaarintasan.com
License: GPL2
*/

if (!defined('ABSPATH')) exit;

define('BSA_SYNC_API_URL', 'https://appbarbaarintasan.com/api/wordpress/purchase');
define('BSA_SYNC_API_KEY', 'bsa2026wpconnect');

add_action('rest_api_init', function() {
    register_rest_route('bsa/v1', '/sync-user', [
        'methods'  => 'POST',
        'callback' => 'bsa_handle_sync_user',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('bsa/v1', '/reset-password', [
        'methods'  => 'POST',
        'callback' => 'bsa_handle_password_reset',
        'permission_callback' => '__return_true',
    ]);
});

function bsa_check_api_key($request) {
    $api_key = $request->get_header('X-API-Key');
    if (!$api_key) {
        $api_key = $request->get_param('api_key');
    }
    if (!$api_key) {
        $body = json_decode($request->get_body(), true);
        if (is_array($body) && isset($body['api_key'])) {
            $api_key = $body['api_key'];
        }
    }
    return $api_key === BSA_SYNC_API_KEY;
}

function bsa_handle_sync_user($request) {
    if (!bsa_check_api_key($request)) {
        return new WP_REST_Response(['success' => false, 'error' => 'Invalid API key'], 403);
    }

    $email = sanitize_email($request->get_param('email'));
    $name  = sanitize_text_field($request->get_param('name'));
    $phone = sanitize_text_field($request->get_param('phone'));
    $password = $request->get_param('password');

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
        if ($password) {
            wp_set_password($password, $existing_user->ID);
        }
        return new WP_REST_Response(['success' => true, 'action' => 'updated', 'user_id' => $existing_user->ID]);
    }

    $username = strstr($email, '@', true);
    $counter = 1;
    $base = $username;
    while (username_exists($username)) {
        $username = $base . $counter;
        $counter++;
    }

    if ($password) {
        $user_id = wp_create_user($username, $password, $email);
    } else {
        $user_id = wp_create_user($username, wp_generate_password(16, true, true), $email);
    }

    if (is_wp_error($user_id)) {
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

    return new WP_REST_Response(['success' => true, 'action' => 'created', 'user_id' => $user_id]);
}

function bsa_handle_password_reset($request) {
    if (!bsa_check_api_key($request)) {
        return new WP_REST_Response(['success' => false, 'error' => 'Invalid API key'], 403);
    }

    $email = sanitize_email($request->get_param('email'));
    $new_password = $request->get_param('password');

    if (!$email || !$new_password) {
        return new WP_REST_Response(['success' => false, 'error' => 'Email and password required'], 400);
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'error' => 'User not found'], 404);
    }

    wp_set_password($new_password, $user->ID);

    return new WP_REST_Response(['success' => true, 'action' => 'password_updated', 'user_id' => $user->ID]);
}

add_action('woocommerce_order_status_completed', 'bsa_sync_order_to_platform', 10, 1);

function bsa_sync_order_to_platform($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;

    $billing_email = $order->get_billing_email();
    if (!$billing_email) return;

    $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    $customer_phone = $order->get_billing_phone();

    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        if (!$product) continue;

        $product_id = $item->get_product_id();
        $course_slug = get_post_meta($product_id, '_bsa_course_slug', true);
        if (!$course_slug) {
            $sku = $product->get_sku();
            if (!empty($sku)) {
                $course_slug = bsa_get_course_slug($sku);
            }
        }
        if (!$course_slug) continue;

        $plan_type = get_post_meta($product_id, '_bsa_plan_type', true) ?: 'monthly';

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
            $order->add_order_note("BSA Sync failed: " . $response->get_error_message());
        } else {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (wp_remote_retrieve_response_code($response) === 200 && !empty($data['success'])) {
                $order->add_order_note("BSA Sync OK: {$course_slug} enrolled");
            } else {
                $order->add_order_note("BSA Sync failed: " . ($data['error'] ?? 'Unknown'));
            }
        }
    }
}

function bsa_get_course_slug($sku) {
    $mapping = [
        'course-0-6-bilood' => '0-6-bilood',
        'course-6-12-bilood' => '6-12-bilood',
        'course-1-2-sano' => '1-2-sano',
        'course-2-4-sano' => '2-4-sano',
        'course-4-7-sano' => '4-7-sano',
        'course-ilmo-is-dabira' => 'ilmo-is-dabira',
        'course-autism' => 'autism',
        'course-caqli-sare' => 'caqli-sare',
        'course-aabe' => 'aabe',
        'course-khilaaf' => 'khilaaf',
        'course-all-access' => 'all-access',
        'subscription-monthly' => 'monthly',
        'subscription-yearly' => 'yearly',
    ];
    $sku_lower = strtolower(trim($sku));
    if (isset($mapping[$sku_lower])) return $mapping[$sku_lower];
    if (strpos($sku_lower, 'course-') === 0) return substr($sku_lower, 7);
    return $sku_lower;
}
