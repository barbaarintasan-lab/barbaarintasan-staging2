<?php
/**
 * BSA Payment Page - Course purchase via Mobile Money & Stripe
 * Shortcode: [bsa_payment]
 * Version: 1.1.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('BSA_APP_API_URL', 'https://appbarbaarintasan.com');

// Flush rewrite rules on activation so the REST webhook route is immediately available
register_activation_hook(__FILE__, 'bsa_activate_plugin');
function bsa_activate_plugin() {
    flush_rewrite_rules();
}

add_shortcode('bsa_payment', 'bsa_render_payment_page');

add_action('admin_menu', 'bsa_payment_admin_menu');

function bsa_payment_admin_menu() {
    add_submenu_page(
        'options-general.php',
        'BSA Payment Settings',
        'BSA Payment',
        'manage_options',
        'bsa-payment-settings',
        'bsa_payment_settings_page'
    );
}

function bsa_payment_settings_page() {
    if (isset($_POST['bsa_payment_save']) && check_admin_referer('bsa_payment_settings')) {
        update_option('bsa_stripe_publishable_key', sanitize_text_field($_POST['bsa_stripe_publishable_key'] ?? ''));
        update_option('bsa_stripe_secret_key', sanitize_text_field($_POST['bsa_stripe_secret_key'] ?? ''));
        update_option('bsa_stripe_webhook_secret', sanitize_text_field($_POST['bsa_stripe_webhook_secret'] ?? ''));
        update_option('bsa_mobile_money_number', sanitize_text_field($_POST['bsa_mobile_money_number'] ?? ''));
        update_option('bsa_mobile_money_name', sanitize_text_field($_POST['bsa_mobile_money_name'] ?? ''));
        update_option('bsa_openai_api_key', sanitize_text_field($_POST['bsa_openai_api_key'] ?? ''));
        echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
    }
    $api_key = get_option('bsa_sync_api_key', '');
    ?>
    <div class="wrap">
        <h1>BSA Payment Settings</h1>
        <?php if (empty($api_key)): ?>
            <div class="notice notice-warning"><p><strong>BSA Sync API Key not set!</strong> Go to Settings > BSA Sync to set the API key first.</p></div>
        <?php endif; ?>
        <form method="post">
            <?php wp_nonce_field('bsa_payment_settings'); ?>
            <table class="form-table">
                <tr>
                    <th>Stripe Publishable Key</th>
                    <td><input type="text" name="bsa_stripe_publishable_key" value="<?php echo esc_attr(get_option('bsa_stripe_publishable_key', '')); ?>" class="regular-text" placeholder="pk_live_..." /></td>
                </tr>
                <tr>
                    <th>Stripe Secret Key</th>
                    <td><input type="password" name="bsa_stripe_secret_key" value="<?php echo esc_attr(get_option('bsa_stripe_secret_key', '')); ?>" class="regular-text" placeholder="sk_live_..." /></td>
                </tr>
                <tr style="background:#f0fdf4;">
                    <th style="font-weight:bold;">Stripe Webhook Secret</th>
                    <td>
                        <?php $webhook_secret = get_option('bsa_stripe_webhook_secret', ''); ?>
                        <input type="password" name="bsa_stripe_webhook_secret" value="<?php echo esc_attr($webhook_secret); ?>" class="regular-text" placeholder="whsec_..." />
                        <?php if (empty($webhook_secret)): ?>
                            <p style="color:#dc2626;font-weight:bold;">&#9888; Webhook Secret ma la gelin! Stripe webhooks ma shaqayn doonaan.</p>
                        <?php else: ?>
                            <p style="color:#16a34a;font-weight:bold;">&#10004; Webhook Secret waa la geliyay.</p>
                        <?php endif; ?>
                        <ol class="description" style="margin:6px 0 0 1.2em;padding:0;">
                            <li>Stripe Dashboard &rarr; Developers &rarr; Webhooks &rarr; <strong>Add endpoint</strong></li>
                            <li>Webhook URL (REST):<br><code style="background:#f3f4f6;padding:2px 6px;"><?php echo esc_url(rest_url('bsa/v1/stripe-webhook')); ?></code></li>
                            <li>Webhook URL (fallback &mdash; use if REST gives 404):<br><code style="background:#fff3cd;padding:2px 6px;"><?php echo esc_url(admin_url('admin-ajax.php') . '?action=bsa_stripe_webhook'); ?></code></li>
                            <li>Event: <code>checkout.session.completed</code> dooro</li>
                            <li>&ldquo;Signing secret&rdquo; ka hel (<code>whsec_...</code>) oo halkan ku geli &rarr; <strong>Save Settings</strong></li>
                        </ol>
                    </td>
                </tr>
                <tr>
                    <th>Mobile Money Number</th>
                    <td><input type="text" name="bsa_mobile_money_number" value="<?php echo esc_attr(get_option('bsa_mobile_money_number', '')); ?>" class="regular-text" placeholder="252-XXX-XXXX" /></td>
                </tr>
                <tr>
                    <th>Mobile Money Magaca</th>
                    <td><input type="text" name="bsa_mobile_money_name" value="<?php echo esc_attr(get_option('bsa_mobile_money_name', 'Barbaarintasan Academy')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th>OpenAI API Key (Rasiid Xaqiijinta)</th>
                    <td><input type="password" name="bsa_openai_api_key" value="<?php echo esc_attr(get_option('bsa_openai_api_key', '')); ?>" class="regular-text" placeholder="sk-..." />
                    <p class="description">OpenAI API key rasiidka sawirka si AI u xaqiijiyo in uu yahay rasiid run ah.</p></td>
                </tr>
            </table>
            <p class="submit"><input type="submit" name="bsa_payment_save" class="button-primary" value="Save Settings" /></p>
        </form>
    </div>
    <?php
}

// AJAX: Create Stripe checkout session (NO enrollment created here - only after payment verified)
add_action('wp_ajax_bsa_stripe_checkout', 'bsa_create_stripe_checkout');
add_action('wp_ajax_nopriv_bsa_stripe_checkout', 'bsa_create_stripe_checkout');

function bsa_create_stripe_checkout() {
    check_ajax_referer('bsa_payment_nonce', 'nonce');

    $course_id = sanitize_text_field($_POST['course_id'] ?? '');
    $plan_type = sanitize_text_field($_POST['plan_type'] ?? '');
    $email = sanitize_email($_POST['email'] ?? '');
    $name = sanitize_text_field($_POST['name'] ?? '');

    if (empty($course_id) || empty($plan_type) || empty($email)) {
        wp_send_json_error(array('message' => 'Fadlan buuxi meelaha oo dhan.'));
    }

    $stripe_secret = get_option('bsa_stripe_secret_key', '');
    if (empty($stripe_secret)) {
        wp_send_json_error(array('message' => 'Stripe ma la habeynin. Fadlan la xiriir admin-ka.'));
    }

    $prices = array(
        'monthly' => array('amount' => 1500, 'name' => 'Bishii - Koorso', 'recurring' => true, 'interval' => 'month'),
        'yearly' => array('amount' => 11400, 'name' => 'Xubin Dahabi - Sannadkii', 'recurring' => true, 'interval' => 'year'),
        'onetime' => array('amount' => 7000, 'name' => 'Koorso - Hal Mar', 'recurring' => false, 'interval' => ''),
    );

    if (!isset($prices[$plan_type])) {
        wp_send_json_error(array('message' => 'Plan type aan la aqoon.'));
    }

    $price = $prices[$plan_type];
    $current_url = wp_get_referer() ?: home_url('/');
    $success_url = add_query_arg(array(
        'bsa_payment' => 'stripe_verify',
        'session_id' => '{CHECKOUT_SESSION_ID}',
    ), $current_url);
    $cancel_url = add_query_arg('bsa_payment', 'cancelled', $current_url);

    $body = array(
        'payment_method_types[]' => 'card',
        'line_items[0][price_data][currency]' => 'usd',
        'line_items[0][price_data][product_data][name]' => $price['name'],
        'line_items[0][price_data][product_data][description]' => 'Barbaarintasan Academy - ' . $price['name'],
        'line_items[0][price_data][unit_amount]' => $price['amount'],
        'line_items[0][quantity]' => 1,
        'mode' => $price['recurring'] ? 'subscription' : 'payment',
        'success_url' => $success_url,
        'cancel_url' => $cancel_url,
        'customer_email' => $email,
        'metadata[course_id]' => $course_id,
        'metadata[plan_type]' => $plan_type,
        'metadata[email]' => $email,
        'metadata[name]' => $name,
        'metadata[source]' => 'wordpress',
    );

    if ($price['recurring']) {
        $body['line_items[0][price_data][recurring][interval]'] = $price['interval'];
    }

    $response = wp_remote_post('https://api.stripe.com/v1/checkout/sessions', array(
        'headers' => array(
            'Authorization' => 'Basic ' . base64_encode($stripe_secret . ':'),
        ),
        'body' => $body,
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        wp_send_json_error(array('message' => 'Stripe khalad: ' . $response->get_error_message()));
    }

    $result = json_decode(wp_remote_retrieve_body($response), true);

    if (!empty($result['url'])) {
        wp_send_json_success(array('url' => $result['url']));
    } else {
        wp_send_json_error(array('message' => $result['error']['message'] ?? 'Stripe session la abuurin waayay.'));
    }
}

// Handle Stripe success: verify session server-side, then create enrollment
add_action('init', 'bsa_handle_stripe_verify');

function bsa_handle_stripe_verify() {
    if (!isset($_GET['bsa_payment']) || $_GET['bsa_payment'] !== 'stripe_verify') {
        return;
    }

    $session_id = sanitize_text_field($_GET['session_id'] ?? '');
    if (empty($session_id) || strpos($session_id, 'cs_') !== 0) {
        return;
    }

    $stripe_secret = get_option('bsa_stripe_secret_key', '');
    if (empty($stripe_secret)) {
        return;
    }

    // Check if already processed (idempotency)
    $processed = get_transient('bsa_stripe_processed_' . $session_id);
    if ($processed) {
        return;
    }

    // Verify session with Stripe API
    $response = wp_remote_get('https://api.stripe.com/v1/checkout/sessions/' . $session_id, array(
        'headers' => array(
            'Authorization' => 'Basic ' . base64_encode($stripe_secret . ':'),
        ),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        return;
    }

    $session = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($session) || ($session['payment_status'] ?? '') !== 'paid') {
        // Check subscription status for recurring payments
        if (($session['status'] ?? '') !== 'complete') {
            return;
        }
    }

    $email = $session['metadata']['email'] ?? ($session['customer_email'] ?? '');
    $name = $session['metadata']['name'] ?? '';
    $course_id = $session['metadata']['course_id'] ?? 'all-access';
    $plan_type = $session['metadata']['plan_type'] ?? 'yearly';
    $amount_total = ($session['amount_total'] ?? 0) / 100;

    if (empty($email)) {
        return;
    }

    // Mark as processed (24h idempotency window)
    set_transient('bsa_stripe_processed_' . $session_id, true, 86400);

    // Record purchase in app (include name for auto-registration)
    $result = bsa_record_purchase_in_app($email, $course_id, $plan_type, $amount_total, 'stripe', $session_id, $name);

    // Store payment record in WordPress
    $payment_id = wp_insert_post(array(
        'post_title' => 'Stripe: ' . $email . ' - ' . $plan_type,
        'post_type' => 'bsa_payment',
        'post_status' => 'publish',
    ));
    if ($payment_id) {
        update_post_meta($payment_id, 'bsa_email', $email);
        update_post_meta($payment_id, 'bsa_course_id', $course_id);
        update_post_meta($payment_id, 'bsa_plan_type', $plan_type);
        update_post_meta($payment_id, 'bsa_amount', $amount_total);
        update_post_meta($payment_id, 'bsa_payment_status', 'approved');
        update_post_meta($payment_id, 'bsa_payment_method', 'stripe');
        update_post_meta($payment_id, 'bsa_stripe_session_id', $session_id);
        update_post_meta($payment_id, 'bsa_approved_at', current_time('mysql'));
        update_post_meta($payment_id, 'bsa_app_sync_result', wp_json_encode($result));
    }

    // Redirect to clean success URL
    $clean_url = remove_query_arg(array('session_id', 'bsa_payment'));
    wp_safe_redirect(add_query_arg('bsa_payment', 'success', $clean_url));
    exit;
}

// ==================== STRIPE WEBHOOK ENDPOINT ====================

// Register REST webhook endpoint
add_action('rest_api_init', function () {
    register_rest_route('bsa/v1', '/stripe-webhook', array(
        'methods'             => 'POST',
        'callback'            => 'bsa_handle_stripe_webhook',
        'permission_callback' => '__return_true',
    ));
});

// Reads the Stripe-Signature header using every available PHP/server mechanism.
function bsa_get_stripe_signature() {
    // Method 1: standard FastCGI superglobal (works on most setups)
    if (!empty($_SERVER['HTTP_STRIPE_SIGNATURE'])) {
        return wp_unslash($_SERVER['HTTP_STRIPE_SIGNATURE']);
    }

    // Method 2: getallheaders() — works on Apache and PHP built-in server
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strtolower($name) === 'stripe-signature') {
                return wp_unslash($value);
            }
        }
    }

    // Method 3: case-insensitive scan of HTTP_* keys only (catches non-standard casing)
    $http_server = array_filter(
        $_SERVER,
        function ($k) { return strpos($k, 'HTTP_') === 0; },
        ARRAY_FILTER_USE_KEY
    );
    $http_lower = array_change_key_case($http_server, CASE_LOWER);
    if (!empty($http_lower['http_stripe_signature'])) {
        return wp_unslash($http_lower['http_stripe_signature']);
    }

    return '';
}

function bsa_handle_stripe_webhook(WP_REST_Request $request) {
    $webhook_secret = get_option('bsa_stripe_webhook_secret', '');
    if (empty($webhook_secret)) {
        return new WP_REST_Response(array('error' => 'Webhook secret not configured'), 500);
    }

    $payload    = $request->get_body();
    $sig_header = $request->get_header('stripe-signature') ?: bsa_get_stripe_signature();

    if (empty($sig_header)) {
        return new WP_REST_Response(array('error' => 'Missing Stripe-Signature header'), 400);
    }

    $event = bsa_stripe_verify_webhook_signature($payload, $sig_header, $webhook_secret);
    if (is_wp_error($event)) {
        error_log('BSA Stripe Webhook: signature verification failed - ' . $event->get_error_message());
        return new WP_REST_Response(array('error' => 'Invalid signature'), 400);
    }

    bsa_process_stripe_webhook_event($event);

    return new WP_REST_Response(array('received' => true), 200);
}

// Admin-ajax fallback: works even when REST API permalink structure is misconfigured.
// Webhook URL (fallback): /wp-admin/admin-ajax.php?action=bsa_stripe_webhook
add_action('wp_ajax_nopriv_bsa_stripe_webhook', 'bsa_handle_stripe_webhook_ajax');
add_action('wp_ajax_bsa_stripe_webhook', 'bsa_handle_stripe_webhook_ajax');

function bsa_handle_stripe_webhook_ajax() {
    $webhook_secret = get_option('bsa_stripe_webhook_secret', '');
    if (empty($webhook_secret)) {
        status_header(500);
        wp_send_json(array('error' => 'Webhook secret not configured'));
    }

    $payload    = file_get_contents('php://input');
    $sig_header = bsa_get_stripe_signature();

    if (empty($sig_header)) {
        status_header(400);
        wp_send_json(array('error' => 'Missing Stripe-Signature header'));
    }

    $event = bsa_stripe_verify_webhook_signature($payload, $sig_header, $webhook_secret);
    if (is_wp_error($event)) {
        error_log('BSA Stripe Webhook (ajax): signature verification failed - ' . $event->get_error_message());
        status_header(400);
        wp_send_json(array('error' => 'Invalid signature'));
    }

    bsa_process_stripe_webhook_event($event);
    wp_send_json(array('received' => true));
}

// Shared event processor used by both the REST endpoint and the admin-ajax fallback
function bsa_process_stripe_webhook_event($event) {
    $event_type = $event['type'] ?? '';
    error_log('BSA Stripe Webhook: received event ' . $event_type);

    if ($event_type !== 'checkout.session.completed') {
        return;
    }

    $session    = $event['data']['object'] ?? array();
    $session_id = $session['id'] ?? '';

    // Idempotency: skip if already processed
    if (!empty($session_id) && get_transient('bsa_stripe_processed_' . $session_id)) {
        return;
    }

    if (($session['payment_status'] ?? '') !== 'paid' && ($session['status'] ?? '') !== 'complete') {
        return;
    }

    $email        = $session['metadata']['email'] ?? ($session['customer_email'] ?? '');
    $name         = $session['metadata']['name'] ?? '';
    $course_id    = $session['metadata']['course_id'] ?? 'all-access';
    $plan_type    = $session['metadata']['plan_type'] ?? 'yearly';
    $amount_total = ($session['amount_total'] ?? 0) / 100;

    if (empty($email)) {
        return;
    }

    if (!empty($session_id)) {
        set_transient('bsa_stripe_processed_' . $session_id, true, 86400);
    }

    $result = bsa_record_purchase_in_app($email, $course_id, $plan_type, $amount_total, 'stripe', $session_id, $name);

    $payment_id = wp_insert_post(array(
        'post_title'  => 'Stripe Webhook: ' . sanitize_text_field($email) . ' - ' . sanitize_text_field($plan_type),
        'post_type'   => 'bsa_payment',
        'post_status' => 'publish',
    ));
    if ($payment_id) {
        update_post_meta($payment_id, 'bsa_email', $email);
        update_post_meta($payment_id, 'bsa_course_id', $course_id);
        update_post_meta($payment_id, 'bsa_plan_type', $plan_type);
        update_post_meta($payment_id, 'bsa_amount', $amount_total);
        update_post_meta($payment_id, 'bsa_payment_status', 'approved');
        update_post_meta($payment_id, 'bsa_payment_method', 'stripe');
        update_post_meta($payment_id, 'bsa_stripe_session_id', $session_id);
        update_post_meta($payment_id, 'bsa_approved_at', current_time('mysql'));
        update_post_meta($payment_id, 'bsa_app_sync_result', wp_json_encode($result));
    }
}

function bsa_stripe_verify_webhook_signature($payload, $sig_header, $secret) {
    $timestamp  = null;
    $signatures = array();

    foreach (explode(',', $sig_header) as $part) {
        $pair = explode('=', $part, 2);
        if (count($pair) !== 2) {
            continue;
        }
        if ($pair[0] === 't') {
            $timestamp = (int) $pair[1];
        } elseif ($pair[0] === 'v1') {
            $signatures[] = $pair[1];
        }
    }

    if (empty($timestamp) || empty($signatures)) {
        return new WP_Error('invalid_signature', 'Missing timestamp or signatures in Stripe-Signature header');
    }

    // Reject events older than 5 minutes (replay attack prevention)
    if (abs(time() - $timestamp) > 300) {
        return new WP_Error('invalid_timestamp', 'Stripe webhook timestamp is too old');
    }

    $signed_payload     = $timestamp . '.' . $payload;
    $expected_signature = hash_hmac('sha256', $signed_payload, $secret);

    foreach ($signatures as $sig) {
        if (hash_equals($expected_signature, $sig)) {
            return json_decode($payload, true);
        }
    }

    return new WP_Error('invalid_signature', 'Stripe webhook signature mismatch');
}

// AJAX: Submit mobile money receipt
add_action('wp_ajax_bsa_mobile_payment', 'bsa_submit_mobile_payment');
add_action('wp_ajax_nopriv_bsa_mobile_payment', 'bsa_submit_mobile_payment');

function bsa_validate_receipt_with_ai($image_path, $expected_amount, $plan_type) {
    $openai_key = get_option('bsa_openai_api_key', '');
    if (empty($openai_key)) {
        return array('valid' => true, 'reason' => 'AI validation not configured', 'confidence' => 0);
    }

    $image_data = file_get_contents($image_path);
    if (!$image_data) {
        return array('valid' => false, 'reason' => 'Sawirka la akhriyi kari waayay', 'confidence' => 0);
    }

    $base64_image = base64_encode($image_data);
    $mime_type = mime_content_type($image_path) ?: 'image/jpeg';

    $prompt = "You are a payment receipt validator for Barbaarintasan Academy (an education platform). \nAnalyze this image and determine if it is a REAL mobile money payment receipt/screenshot.\n\nExpected payment amount: \${$expected_amount} USD (Plan: {$plan_type})\n\nIMPORTANT RULES:\n1. The image MUST be a mobile money transaction screenshot or receipt (EVC Plus, Zaad, Sahal, eDahab, M-Pesa, or similar)\n2. It must show a completed/successful transaction\n3. Random photos, selfies, screenshots of other apps, or non-receipt images should be REJECTED\n4. The receipt should show transaction details like amount, reference number, date, or recipient\n\nRespond in this exact JSON format only:\n{\n  \"is_receipt\": true/false,\n  \"confidence\": 0.0-1.0,\n  \"reason_somali\": \"Brief reason in Somali language\",\n  \"detected_amount\": null or number,\n  \"transaction_ref\": null or string\n}";

    $response = wp_remote_post('https://api.openai.com/v1/chat/completions', array(
        'timeout' => 30,
        'headers' => array(
            'Authorization' => 'Bearer ' . $openai_key,
            'Content-Type' => 'application/json',
        ),
        'body' => wp_json_encode(array(
            'model' => 'gpt-4o',
            'messages' => array(
                array(
                    'role' => 'user',
                    'content' => array(
                        array('type' => 'text', 'text' => $prompt),
                        array('type' => 'image_url', 'image_url' => array(
                            'url' => 'data:' . $mime_type . ';base64,' . $base64_image,
                            'detail' => 'low',
                        )),
                    ),
                ),
            ),
            'max_tokens' => 300,
            'temperature' => 0.1,
        )),
    ));

    if (is_wp_error($response)) {
        return array('valid' => true, 'reason' => 'AI check failed, allowing manual review', 'confidence' => 0);
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $content = $body['choices'][0]['message']['content'] ?? '';

    $content = preg_replace('/```json\s*/', '', $content);
    $content = preg_replace('/```\s*/', '', $content);
    $result = json_decode(trim($content), true);

    if (!$result || !isset($result['is_receipt'])) {
        return array('valid' => true, 'reason' => 'AI response unclear, allowing manual review', 'confidence' => 0);
    }

    return array(
        'valid' => (bool) $result['is_receipt'],
        'confidence' => (float) ($result['confidence'] ?? 0),
        'reason' => $result['reason_somali'] ?? 'Unknown',
        'detected_amount' => $result['detected_amount'] ?? null,
        'transaction_ref' => $result['transaction_ref'] ?? null,
    );
}

function bsa_submit_mobile_payment() {
    check_ajax_referer('bsa_payment_nonce', 'nonce');

    $course_id = sanitize_text_field($_POST['course_id'] ?? '');
    $plan_type = sanitize_text_field($_POST['plan_type'] ?? '');
    $email = sanitize_email($_POST['email'] ?? '');
    $name = sanitize_text_field($_POST['name'] ?? '');
    $phone = sanitize_text_field($_POST['phone'] ?? '');

    if (empty($course_id) || empty($plan_type) || empty($email) || empty($name)) {
        wp_send_json_error(array('message' => 'Fadlan buuxi meelaha oo dhan.'));
    }

    if (empty($_FILES['receipt']) || $_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
        wp_send_json_error(array('message' => 'Fadlan soo dir sawirka rasiidka.'));
    }

    $file = $_FILES['receipt'];
    $allowed = array('image/jpeg', 'image/png', 'image/webp', 'image/gif');
    if (!in_array($file['type'], $allowed)) {
        wp_send_json_error(array('message' => 'Sawirka noociisu waa inuu yahay JPG, PNG, ama WebP.'));
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        wp_send_json_error(array('message' => 'Sawirku waa inuusan ka badnayn 10MB.'));
    }

    $prices = array('monthly' => 15, 'yearly' => 114, 'onetime' => 70);
    $amount = $prices[$plan_type] ?? 114;

    $ai_result = bsa_validate_receipt_with_ai($file['tmp_name'], $amount, $plan_type);

    if (!$ai_result['valid'] && $ai_result['confidence'] >= 0.7) {
        wp_send_json_error(array(
            'message' => 'Sawirka aad soo dirtay ma aha rasiid lacag bixin. ' . ($ai_result['reason'] ?? '') . ' Fadlan sawirka rasiidka ee lacag bixinta soo dir.',
        ));
    }

    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');

    $attachment_id = media_handle_upload('receipt', 0);
    if (is_wp_error($attachment_id)) {
        wp_send_json_error(array('message' => 'Sawirka la upload garayn waayay: ' . $attachment_id->get_error_message()));
    }

    $receipt_url = wp_get_attachment_url($attachment_id);

    $payment_id = wp_insert_post(array(
        'post_title' => 'Mobile: ' . $name . ' - ' . $email,
        'post_type' => 'bsa_payment',
        'post_status' => 'pending',
    ));

    if ($payment_id) {
        update_post_meta($payment_id, 'bsa_email', $email);
        update_post_meta($payment_id, 'bsa_name', $name);
        update_post_meta($payment_id, 'bsa_phone', $phone);
        update_post_meta($payment_id, 'bsa_course_id', $course_id);
        update_post_meta($payment_id, 'bsa_plan_type', $plan_type);
        update_post_meta($payment_id, 'bsa_amount', $amount);
        update_post_meta($payment_id, 'bsa_receipt_url', $receipt_url);
        update_post_meta($payment_id, 'bsa_receipt_attachment_id', $attachment_id);
        update_post_meta($payment_id, 'bsa_payment_status', 'pending');
        update_post_meta($payment_id, 'bsa_payment_method', 'mobile_money');
        update_post_meta($payment_id, 'bsa_submitted_at', current_time('mysql'));
        update_post_meta($payment_id, 'bsa_ai_validation', wp_json_encode($ai_result));
    }

    wp_send_json_success(array(
        'message' => 'Mahadsanid! Rasiidkaagu waa la helay. Waxaan ku ogeysiin doonaa marka la ansixiyo (24 saac gudahood).',
        'payment_id' => $payment_id,
    ));
}

// Register custom post type for payments
add_action('init', 'bsa_register_payment_post_type');

function bsa_register_payment_post_type() {
    register_post_type('bsa_payment', array(
        'labels' => array(
            'name' => 'BSA Payments',
            'singular_name' => 'BSA Payment',
            'all_items' => 'Dhammaan Lacag Bixinaha',
            'edit_item' => 'Eeg Payment-ka',
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-money-alt',
        'supports' => array('title'),
        'capability_type' => 'post',
    ));
}

// Admin columns for payments
add_filter('manage_bsa_payment_posts_columns', 'bsa_payment_columns');
add_action('manage_bsa_payment_posts_custom_column', 'bsa_payment_column_content', 10, 2);

function bsa_payment_columns($columns) {
    return array(
        'cb' => '<input type="checkbox" />',
        'title' => 'Payment',
        'bsa_email' => 'Email',
        'bsa_method' => 'Habka',
        'bsa_plan' => 'Plan',
        'bsa_amount' => 'Lacag',
        'bsa_status' => 'Xaalad',
        'bsa_receipt' => 'Rasiid',
        'bsa_actions' => 'Ficil',
        'date' => 'Taariikh',
    );
}

function bsa_payment_column_content($column, $post_id) {
    switch ($column) {
        case 'bsa_email':
            echo esc_html(get_post_meta($post_id, 'bsa_email', true));
            break;
        case 'bsa_method':
            $method = get_post_meta($post_id, 'bsa_payment_method', true);
            echo $method === 'stripe' ? '&#128179; Stripe' : '&#128241; Mobile Money';
            break;
        case 'bsa_plan':
            $plans = array('monthly' => 'Bishii', 'yearly' => 'Sannadkii', 'onetime' => 'Hal Mar');
            $plan = get_post_meta($post_id, 'bsa_plan_type', true);
            echo esc_html($plans[$plan] ?? $plan);
            break;
        case 'bsa_amount':
            echo '$' . esc_html(get_post_meta($post_id, 'bsa_amount', true));
            break;
        case 'bsa_status':
            $status = get_post_meta($post_id, 'bsa_payment_status', true);
            $colors = array('pending' => '#f59e0b', 'approved' => '#10b981', 'rejected' => '#ef4444');
            $labels = array('pending' => 'Sugitaan', 'approved' => 'La ansixiyay', 'rejected' => 'La diiday');
            echo '<span style="color:' . ($colors[$status] ?? '#666') . ';font-weight:600;">' . ($labels[$status] ?? $status) . '</span>';
            break;
        case 'bsa_receipt':
            $url = get_post_meta($post_id, 'bsa_receipt_url', true);
            if ($url) {
                echo '<a href="' . esc_url($url) . '" target="_blank"><img src="' . esc_url($url) . '" style="max-width:80px;max-height:60px;border-radius:4px;" /></a>';
            } else {
                echo '-';
            }
            break;
        case 'bsa_actions':
            $status = get_post_meta($post_id, 'bsa_payment_status', true);
            if ($status === 'pending') {
                echo '<a href="' . wp_nonce_url(admin_url('admin-post.php?action=bsa_approve_payment&payment_id=' . $post_id), 'bsa_approve_' . $post_id) . '" class="button button-primary" style="margin-right:4px;">Ansixii</a>';
                echo '<a href="' . wp_nonce_url(admin_url('admin-post.php?action=bsa_reject_payment&payment_id=' . $post_id), 'bsa_reject_' . $post_id) . '" class="button" onclick="return confirm(\'Ma hubtaa inaad diidayso payment-kan?\')">Diid</a>';
            } elseif ($status === 'approved') {
                echo '<span style="color:#10b981;">&#10003; Done</span>';
            }
            break;
    }
}

// Admin actions: Approve/Reject payment
add_action('admin_post_bsa_approve_payment', 'bsa_approve_payment');
add_action('admin_post_bsa_reject_payment', 'bsa_reject_payment');

function bsa_approve_payment() {
    $payment_id = intval($_GET['payment_id'] ?? 0);
    check_admin_referer('bsa_approve_' . $payment_id);

    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }

    $email = get_post_meta($payment_id, 'bsa_email', true);
    $name = get_post_meta($payment_id, 'bsa_name', true);
    $course_id = get_post_meta($payment_id, 'bsa_course_id', true);
    $plan_type = get_post_meta($payment_id, 'bsa_plan_type', true);
    $amount = get_post_meta($payment_id, 'bsa_amount', true);

    $result = bsa_record_purchase_in_app($email, $course_id, $plan_type, $amount, 'mobile_money', 'wp_mobile_' . $payment_id, $name);

    update_post_meta($payment_id, 'bsa_payment_status', 'approved');
    update_post_meta($payment_id, 'bsa_approved_at', current_time('mysql'));
    update_post_meta($payment_id, 'bsa_app_sync_result', wp_json_encode($result));

    wp_safe_redirect(admin_url('edit.php?post_type=bsa_payment&bsa_msg=approved'));
    exit;
}

function bsa_reject_payment() {
    $payment_id = intval($_GET['payment_id'] ?? 0);
    check_admin_referer('bsa_reject_' . $payment_id);

    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }

    update_post_meta($payment_id, 'bsa_payment_status', 'rejected');
    update_post_meta($payment_id, 'bsa_rejected_at', current_time('mysql'));

    wp_safe_redirect(admin_url('edit.php?post_type=bsa_payment&bsa_msg=rejected'));
    exit;
}

// Admin notices
add_action('admin_notices', 'bsa_payment_admin_notices');

function bsa_payment_admin_notices() {
    if (isset($_GET['bsa_msg'])) {
        if ($_GET['bsa_msg'] === 'approved') {
            echo '<div class="notice notice-success is-dismissible"><p>Payment waa la ansixiyay! Enrollment-ka app-ka ayaa loo abuuray.</p></div>';
        } elseif ($_GET['bsa_msg'] === 'rejected') {
            echo '<div class="notice notice-warning is-dismissible"><p>Payment waa la diiday.</p></div>';
        }
    }
}

// Helper: Record purchase in the app via API
function bsa_record_purchase_in_app($email, $course_id, $plan_type, $amount, $payment_method, $transaction_id, $name = '') {
    $api_key = get_option('bsa_sync_api_key', '');
    if (empty($api_key)) {
        return array('success' => false, 'error' => 'API key not configured. Set it in Settings > BSA Sync.');
    }

    $body = array(
        'email' => $email,
        'course_id' => $course_id,
        'plan_type' => $plan_type,
        'amount' => $amount,
        'currency' => 'usd',
        'payment_method' => $payment_method,
        'transaction_id' => $transaction_id,
        'payment_source' => 'wordpress',
    );
    if (!empty($name)) {
        $body['name'] = $name;
    }

    $response = wp_remote_post(BSA_APP_API_URL . '/api/wordpress/purchase', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-API-Key' => $api_key,
        ),
        'body' => wp_json_encode($body),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        return array('success' => false, 'error' => $response->get_error_message());
    }

    $result = json_decode(wp_remote_retrieve_body($response), true);

    bsa_sync_payment_to_app($email, $course_id, $plan_type, $amount, $payment_method, $transaction_id, $name);

    return $result;
}

function bsa_sync_payment_to_app($email, $course_id, $plan_type, $amount, $payment_method, $transaction_id, $name = '') {
    $api_key = get_option('bsa_sync_api_key', '');
    if (empty($api_key)) {
        return;
    }

    $body = array(
        'email' => $email,
        'plan_type' => $plan_type,
        'course_id' => $course_id,
        'amount' => $amount,
        'payment_method' => $payment_method,
        'transaction_id' => $transaction_id,
        'payment_source' => 'wordpress',
        'name' => $name,
    );

    wp_remote_post(BSA_APP_API_URL . '/api/webhook/wordpress-payment', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-API-Key' => $api_key,
        ),
        'body' => wp_json_encode($body),
        'timeout' => 15,
    ));
}

// ==================== PAYMENT PAGE SHORTCODE ====================

function bsa_render_payment_page($atts) {
    $mobile_number = get_option('bsa_mobile_money_number', '');
    $mobile_name = get_option('bsa_mobile_money_name', 'Barbaarintasan Academy');

    $payment_status = isset($_GET['bsa_payment']) ? sanitize_text_field($_GET['bsa_payment']) : '';

    ob_start();
    ?>
    <style>
        .bsa-pay-wrap{display:flex;justify-content:center;padding:20px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
        .bsa-pay-card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:40px 36px;max-width:560px;width:100%}
        .bsa-pay-title{text-align:center;font-size:24px;font-weight:700;color:#1a1a2e;margin:0 0 4px}
        .bsa-pay-subtitle{text-align:center;color:#6b7280;font-size:14px;margin:0 0 24px}
        .bsa-plans{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
        .bsa-plan{border:2px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:all 0.2s;position:relative}
        .bsa-plan:hover{border-color:#6366f1;background:#f5f3ff}
        .bsa-plan.active{border-color:#6366f1;background:#f5f3ff;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
        .bsa-plan-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;white-space:nowrap}
        .bsa-plan-price{font-size:28px;font-weight:800;color:#1a1a2e;margin:8px 0 2px}
        .bsa-plan-period{font-size:13px;color:#6b7280}
        .bsa-plan-name{font-size:14px;font-weight:600;color:#374151;margin-top:8px}
        .bsa-section{margin-bottom:20px}
        .bsa-section-title{font-size:15px;font-weight:600;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:8px}
        .bsa-input{width:100%;padding:12px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;box-sizing:border-box;background:#f9fafb;transition:border-color 0.2s}
        .bsa-input:focus{outline:none;border-color:#6366f1;background:#fff}
        .bsa-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px}
        .bsa-row{display:flex;gap:12px}
        .bsa-row>div{flex:1}
        .bsa-methods{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
        .bsa-method{border:2px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:all 0.2s;font-weight:500;font-size:14px}
        .bsa-method:hover{border-color:#6366f1}
        .bsa-method.active{border-color:#6366f1;background:#f5f3ff}
        .bsa-method-icon{font-size:28px;margin-bottom:6px}
        .bsa-btn{display:block;width:100%;padding:14px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff!important;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;text-align:center;text-decoration:none!important;box-sizing:border-box;margin-top:10px}
        .bsa-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.4)}
        .bsa-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .bsa-btn-green{background:linear-gradient(135deg,#10b981 0%,#059669 100%)}
        .bsa-btn-green:hover{box-shadow:0 4px 12px rgba(16,185,129,0.4)}
        .bsa-mobile-info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:12px 0}
        .bsa-mobile-info p{margin:4px 0;font-size:14px;color:#374151}
        .bsa-mobile-info strong{color:#059669}
        .bsa-upload-area{border:2px dashed #d1d5db;border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:all 0.2s;background:#f9fafb}
        .bsa-upload-area:hover{border-color:#6366f1;background:#f5f3ff}
        .bsa-upload-area.has-file{border-color:#10b981;background:#f0fdf4}
        .bsa-upload-icon{font-size:36px;margin-bottom:8px}
        .bsa-upload-text{font-size:14px;color:#6b7280}
        .bsa-preview-img{max-width:200px;max-height:150px;border-radius:8px;margin-top:10px}
        .bsa-error{background:#fef2f2;color:#dc2626;padding:12px 16px;border-radius:10px;font-size:14px;margin-bottom:16px;border-left:4px solid #dc2626}
        .bsa-success-box{text-align:center;padding:20px 0}
        .bsa-success-icon{font-size:60px;margin-bottom:16px}
        .bsa-success-box h2{color:#1a1a2e;font-size:22px;margin:0 0 10px}
        .bsa-success-box p{color:#6b7280;font-size:15px;margin:0 0 24px}
        .bsa-hidden{display:none}
        .bsa-spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#fff;animation:bsa-spin 0.8s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes bsa-spin{to{transform:rotate(360deg)}}
        @media(max-width:500px){.bsa-pay-card{padding:24px 18px}.bsa-plans{grid-template-columns:1fr}.bsa-methods{grid-template-columns:1fr}.bsa-row{flex-direction:column;gap:0}}
    </style>

    <div class="bsa-pay-wrap">
        <div class="bsa-pay-card">

            <?php if ($payment_status === 'success'): ?>
                <div class="bsa-success-box">
                    <div class="bsa-success-icon">&#127881;</div>
                    <div style="width:70px;height:70px;background:linear-gradient(135deg,#10b981,#059669);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px;font-weight:bold;">&#10003;</div>
                    <h2>Hambalyo! Lacag bixintaadu waa lagu guuleystay!</h2>
                    <p>Koorsadaada waa laguu furay. Hadda app-ka ka gal si aad u bilowdo waxbarashada.</p>
                    <a href="https://appbarbaarintasan.com" style="display:block;width:100%;padding:14px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff!important;border:none;border-radius:10px;font-size:16px;font-weight:600;text-align:center;text-decoration:none!important;box-sizing:border-box;">&#128640; Gal App-ka</a>
                    <a href="<?php echo esc_url(home_url('/')); ?>" style="display:block;width:100%;padding:14px;background:transparent!important;color:#6366f1!important;border:2px solid #6366f1;margin-top:12px;border-radius:10px;font-size:16px;font-weight:600;text-align:center;text-decoration:none!important;box-sizing:border-box;">Ku noqo Bogga Hore</a>
                </div>

            <?php elseif ($payment_status === 'cancelled'): ?>
                <div class="bsa-error">Lacag bixintii waa la joojiyay. Fadlan isku day mar kale.</div>
                <?php bsa_render_payment_form($mobile_number, $mobile_name); ?>

            <?php else: ?>
                <?php bsa_render_payment_form($mobile_number, $mobile_name); ?>
            <?php endif; ?>

        </div>
    </div>
    <?php
    return ob_get_clean();
}

function bsa_render_payment_form($mobile_number, $mobile_name) {
    $current_user = wp_get_current_user();
    $user_email = $current_user->ID ? $current_user->user_email : '';
    $user_name = $current_user->ID ? $current_user->display_name : '';
    ?>

    <h2 class="bsa-pay-title">Koorso Iibso</h2>
    <p class="bsa-pay-subtitle">Dooro qorshahaaga, habka lacag bixinta, oo bilow waxbarashada</p>

    <div id="bsa-error-msg" class="bsa-error bsa-hidden"></div>
    <div id="bsa-mobile-success" class="bsa-hidden">
        <div class="bsa-success-box">
            <div class="bsa-success-icon">&#128233;</div>
            <h2>Rasiidkaaga waa la helay!</h2>
            <p>Waxaan ku ogeysiin doonaa email-kaaga marka la ansixiyo. Caadi ahaan 24 saac gudahood.</p>
            <a href="<?php echo esc_url(home_url('/')); ?>" style="display:block;width:100%;padding:14px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff!important;border:none;border-radius:10px;font-size:16px;font-weight:600;text-align:center;text-decoration:none!important;box-sizing:border-box;">Ku noqo Bogga Hore</a>
        </div>
    </div>

    <form id="bsa-payment-form" enctype="multipart/form-data">
        <?php wp_nonce_field('bsa_payment_nonce', 'bsa_nonce_field'); ?>

        <div class="bsa-section">
            <div class="bsa-section-title">&#128100; Macluumaadkaaga</div>
            <div class="bsa-row">
                <div style="margin-bottom:12px">
                    <label class="bsa-label">Magaca</label>
                    <input type="text" id="bsa-name" class="bsa-input" placeholder="Magacaaga" value="<?php echo esc_attr($user_name); ?>" required />
                </div>
                <div style="margin-bottom:12px">
                    <label class="bsa-label">Email</label>
                    <input type="email" id="bsa-email" class="bsa-input" placeholder="email@tusaale.com" value="<?php echo esc_attr($user_email); ?>" required />
                </div>
            </div>
            <div style="margin-bottom:12px">
                <label class="bsa-label">Telefon (ikhtiyaari)</label>
                <input type="tel" id="bsa-phone" class="bsa-input" placeholder="+252 xx xxx xxxx" />
            </div>
        </div>

        <div class="bsa-section">
            <div class="bsa-section-title">&#127775; Dooro Qorshahaaga</div>
            <div class="bsa-plans">
                <div class="bsa-plan" data-plan="monthly" onclick="bsaSelectPlan('monthly')">
                    <div class="bsa-plan-name">Bishii</div>
                    <div class="bsa-plan-price">$15</div>
                    <div class="bsa-plan-period">bishii</div>
                </div>
                <div class="bsa-plan" data-plan="yearly" onclick="bsaSelectPlan('yearly')">
                    <div class="bsa-plan-badge">&#11088; Qiimo Dhimis!</div>
                    <div class="bsa-plan-name">Xubin Dahabi</div>
                    <div class="bsa-plan-price">$114</div>
                    <div class="bsa-plan-period">sannadkii</div>
                </div>
                <div class="bsa-plan" data-plan="onetime" onclick="bsaSelectPlan('onetime')">
                    <div class="bsa-plan-name">Hal Mar</div>
                    <div class="bsa-plan-price">$70</div>
                    <div class="bsa-plan-period">weligaa</div>
                </div>
            </div>
        </div>

        <div class="bsa-section" id="bsa-method-section" style="display:none">
            <div class="bsa-section-title">&#128179; Sida Lacagta Loogu Bixinayo</div>
            <div class="bsa-methods">
                <div class="bsa-method" data-method="mobile" onclick="bsaSelectMethod('mobile')">
                    <div class="bsa-method-icon">&#128241;</div>
                    Mobile Money<br><small style="color:#6b7280">EVC, Zaad, E-Dahab, Sahal, Taaj, Dahabshiil</small>
                </div>
                <div class="bsa-method" data-method="stripe" onclick="bsaSelectMethod('stripe')">
                    <div class="bsa-method-icon">&#128179;</div>
                    Card / Stripe<br><small style="color:#6b7280">Visa, Mastercard</small>
                </div>
            </div>
        </div>

        <div id="bsa-mobile-section" class="bsa-hidden">
            <div class="bsa-mobile-info">
                <p><strong>Lacagta u dir lambaryadan midkood:</strong></p>
                <div style="background:#fff;border-radius:8px;padding:12px;margin:8px 0;border:1px solid #d1fae5;">
                    <p style="margin:0 0 4px;font-weight:700;color:#059669;">&#128241; EVC Plus:</p>
                    <p style="margin:0 0 2px;">&#128222; <strong>0907790584</strong></p>
                    <p style="margin:0;">&#128100; <strong>Musse Said Aw-Musse</strong></p>
                </div>
                <div style="background:#fff;border-radius:8px;padding:12px;margin:8px 0;border:1px solid #d1fae5;">
                    <p style="margin:0 0 4px;font-weight:700;color:#059669;">&#128241; E-Dahab:</p>
                    <p style="margin:0 0 2px;">&#128222; <strong>0667790584</strong></p>
                    <p style="margin:0;">&#128100; <strong>Musse Said Aw-Musse</strong></p>
                </div>
                <p style="margin-top:10px;font-size:13px;color:#6b7280;">EVC Plus, Zaad, E-Dahab, Sahal, Taaj, ama Dahabshiil - mid kasta waa la aqbalaa. Kadib marka aad lacagta dirto, sawirka rasiidka soo upload garee.</p>
            </div>

            <div class="bsa-upload-area" id="bsa-upload-area" onclick="document.getElementById('bsa-receipt-file').click()">
                <div class="bsa-upload-icon">&#128247;</div>
                <div class="bsa-upload-text">Riix halkan si aad sawirka rasiidka u soo dirto</div>
                <div id="bsa-file-name" style="margin-top:8px;font-weight:600;color:#10b981;display:none"></div>
                <img id="bsa-preview" class="bsa-preview-img" style="display:none" alt="Preview" />
            </div>
            <input type="file" id="bsa-receipt-file" accept="image/*" style="display:none" onchange="bsaHandleFile(this)" />

            <button type="button" id="bsa-mobile-submit" class="bsa-btn bsa-btn-green" onclick="bsaSubmitMobile()" disabled>
                Rasiidka Dir
            </button>
        </div>

        <div id="bsa-stripe-section" class="bsa-hidden">
            <button type="button" id="bsa-stripe-submit" class="bsa-btn" onclick="bsaSubmitStripe()">
                &#128179; Card-ka ku bixi
            </button>
        </div>
    </form>

    <script>
    var bsaSelectedPlan = '';
    var bsaSelectedMethod = '';
    var bsaSelectedCourse = 'all-access';

    function bsaSelectPlan(plan) {
        bsaSelectedPlan = plan;
        document.querySelectorAll('.bsa-plan').forEach(function(el) { el.classList.remove('active'); });
        document.querySelector('.bsa-plan[data-plan="' + plan + '"]').classList.add('active');
        document.getElementById('bsa-method-section').style.display = '';
    }

    function bsaSelectMethod(method) {
        bsaSelectedMethod = method;
        document.querySelectorAll('.bsa-method').forEach(function(el) { el.classList.remove('active'); });
        document.querySelector('.bsa-method[data-method="' + method + '"]').classList.add('active');
        document.getElementById('bsa-mobile-section').classList.toggle('bsa-hidden', method !== 'mobile');
        document.getElementById('bsa-stripe-section').classList.toggle('bsa-hidden', method !== 'stripe');
    }

    function bsaHandleFile(input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            document.getElementById('bsa-file-name').textContent = file.name;
            document.getElementById('bsa-file-name').style.display = '';
            document.getElementById('bsa-upload-area').classList.add('has-file');
            document.getElementById('bsa-mobile-submit').disabled = false;
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = document.getElementById('bsa-preview');
                img.src = e.target.result;
                img.style.display = '';
            };
            reader.readAsDataURL(file);
        }
    }

    function bsaShowError(msg) {
        var el = document.getElementById('bsa-error-msg');
        el.textContent = msg;
        el.classList.remove('bsa-hidden');
        el.scrollIntoView({behavior:'smooth', block:'center'});
    }

    function bsaHideError() {
        document.getElementById('bsa-error-msg').classList.add('bsa-hidden');
    }

    function bsaValidateForm() {
        var name = document.getElementById('bsa-name').value.trim();
        var email = document.getElementById('bsa-email').value.trim();
        if (!name || !email) { bsaShowError('Fadlan geli magacaaga iyo email-kaaga.'); return false; }
        if (!bsaSelectedPlan) { bsaShowError('Fadlan dooro qorshahaaga (bishii, sannadkii, ama hal mar).'); return false; }
        bsaHideError();
        return true;
    }

    function bsaSubmitMobile() {
        if (!bsaValidateForm()) return;
        var fileInput = document.getElementById('bsa-receipt-file');
        if (!fileInput.files || !fileInput.files[0]) { bsaShowError('Fadlan soo dir sawirka rasiidka.'); return; }

        var btn = document.getElementById('bsa-mobile-submit');
        btn.disabled = true;
        btn.innerHTML = '<span class="bsa-spinner"></span> Waa la dirayaa...';

        var formData = new FormData();
        formData.append('action', 'bsa_mobile_payment');
        formData.append('nonce', document.getElementById('bsa_nonce_field').value);
        formData.append('course_id', bsaSelectedCourse);
        formData.append('plan_type', bsaSelectedPlan);
        formData.append('email', document.getElementById('bsa-email').value.trim());
        formData.append('name', document.getElementById('bsa-name').value.trim());
        formData.append('phone', document.getElementById('bsa-phone').value.trim());
        formData.append('receipt', fileInput.files[0]);

        fetch('<?php echo esc_url(admin_url('admin-ajax.php')); ?>', { method: 'POST', body: formData })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                document.getElementById('bsa-payment-form').style.display = 'none';
                document.getElementById('bsa-mobile-success').classList.remove('bsa-hidden');
            } else {
                bsaShowError(data.data.message || 'Khalad ayaa dhacay.');
                btn.disabled = false;
                btn.textContent = 'Rasiidka Dir';
            }
        })
        .catch(function(err) {
            bsaShowError('Khalad: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Rasiidka Dir';
        });
    }

    function bsaSubmitStripe() {
        if (!bsaValidateForm()) return;

        var btn = document.getElementById('bsa-stripe-submit');
        btn.disabled = true;
        btn.innerHTML = '<span class="bsa-spinner"></span> Waa la diyaarinayaa...';

        var formData = new FormData();
        formData.append('action', 'bsa_stripe_checkout');
        formData.append('nonce', document.getElementById('bsa_nonce_field').value);
        formData.append('course_id', bsaSelectedCourse);
        formData.append('plan_type', bsaSelectedPlan);
        formData.append('email', document.getElementById('bsa-email').value.trim());
        formData.append('name', document.getElementById('bsa-name').value.trim());

        fetch('<?php echo esc_url(admin_url('admin-ajax.php')); ?>', { method: 'POST', body: formData })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success && data.data.url) {
                window.location.href = data.data.url;
            } else {
                bsaShowError(data.data.message || 'Stripe khalad ayaa dhacay.');
                btn.disabled = false;
                btn.innerHTML = '&#128179; Card-ka ku bixi';
            }
        })
        .catch(function(err) {
            bsaShowError('Khalad: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '&#128179; Card-ka ku bixi';
        });
    }
    </script>
    <?php
}
