<?php
/**
 * Plugin Name: Barbaarintasan Payment
 * Plugin URI: https://barbaarintasan.com
 * Description: Barbaarintasan Academy - Lacag bixin Mobile Money & Stripe. Shortcodes: [bsa_payment] [bsa_register]
 * Version: 2.5.0
 * Author: Barbaarintasan Academy
 * Author URI: https://barbaarintasan.com
 * Text Domain: bsa-payment
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

define('BSA_APP_API_URL', 'https://appbarbaarintasan.com');

// AJAX registration handler for inline register form
add_action('wp_ajax_nopriv_bsa_ajax_register', 'bsa_ajax_register');
add_action('wp_ajax_bsa_ajax_register', 'bsa_ajax_register');

function bsa_ajax_register() {
    if (!wp_verify_nonce($_POST['nonce'] ?? '', 'bsa_ajax_register_nonce')) {
        wp_send_json_error(array('message' => 'Session-kaagu wuu dhacay. Fadlan page-ka refresh garee (F5) oo mar kale isku day.'));
        return;
    }

    $name = sanitize_text_field($_POST['name'] ?? '');
    $email = sanitize_email($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($name) || empty($email) || empty($password)) {
        wp_send_json_error(array('message' => 'Fadlan buuxi dhammaan meelaha.'));
    }
    if (!is_email($email)) {
        wp_send_json_error(array('message' => 'Email-ka ma sax-sana.'));
    }
    if (strlen($password) < 6) {
        wp_send_json_error(array('message' => 'Password-ku waa inuu ugu yaraan 6 xaraf ahaadaa.'));
    }
    if (email_exists($email)) {
        wp_send_json_error(array('message' => 'Email-kan horey ayaa loo isticmaalay. Fadlan ku gal akoonkaaga.'));
    }

    $username = sanitize_user(strtolower(str_replace(' ', '', $name)) . '_' . wp_rand(100, 999));
    if (username_exists($username)) {
        $username = sanitize_user(strtolower(str_replace(' ', '', $name)) . '_' . wp_rand(1000, 9999));
    }

    $user_id = wp_create_user($username, $password, $email);
    if (is_wp_error($user_id)) {
        wp_send_json_error(array('message' => $user_id->get_error_message()));
    }

    wp_update_user(array('ID' => $user_id, 'display_name' => $name, 'first_name' => $name));

    // Sync to app
    $api_key = get_option('bsa_api_key', '');
    if (!empty($api_key)) {
        wp_remote_post(BSA_APP_API_URL . '/api/sync-user', array(
            'timeout' => 15,
            'headers' => array('Content-Type' => 'application/json', 'x-wordpress-api-key' => $api_key),
            'body' => json_encode(array('email' => $email, 'username' => $username, 'fullName' => $name, 'password' => $password)),
        ));
    }

    // Auto-login
    $creds = array('user_login' => $username, 'user_password' => $password, 'remember' => true);
    wp_signon($creds, is_ssl());

    wp_send_json_success(array('message' => 'Akoonkaaga waa la sameeyay!'));
}

add_shortcode('bsa_payment', 'bsa_render_payment_page');
add_shortcode('bsa_register', 'bsa_render_register_page');

function bsa_render_register_page() {
    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        ob_start();
        ?>
        <div style="max-width:480px;margin:40px auto;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:32px">
                <div style="font-size:48px;margin-bottom:12px">&#9989;</div>
                <h2 style="margin:0 0 8px;color:#166534">Waad ku soo dhawaaday!</h2>
                <p style="color:#15803d;margin:0 0 20px">Waxaad ku gashay: <strong><?php echo esc_html($user->user_email); ?></strong></p>
                <a href="<?php echo home_url('/koorso-iibso/'); ?>" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff!important;border-radius:10px;text-decoration:none!important;font-weight:600;font-size:16px">&#128218; Koorso Iibso</a>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    $error_msg = '';
    $success_msg = '';

    if (isset($_POST['bsa_register_submit']) && wp_verify_nonce($_POST['bsa_register_nonce'], 'bsa_register_action')) {
        $username = sanitize_user(trim($_POST['bsa_username'] ?? ''));
        $email = sanitize_email(trim($_POST['bsa_email'] ?? ''));
        $password = $_POST['bsa_password'] ?? '';
        $password2 = $_POST['bsa_password2'] ?? '';
        $full_name = sanitize_text_field(trim($_POST['bsa_full_name'] ?? ''));

        if (empty($username) || empty($email) || empty($password) || empty($full_name)) {
            $error_msg = 'Fadlan buuxi dhammaan meelaha loo baahan yahay.';
        } elseif (!is_email($email)) {
            $error_msg = 'Email-ka aad gelisay ma sax-sana.';
        } elseif (strlen($password) < 6) {
            $error_msg = 'Password-ku waa inuu ugu yaraan 6 xaraf ahaadaa.';
        } elseif ($password !== $password2) {
            $error_msg = 'Labada password ee aad gelisay isku ma eka.';
        } elseif (username_exists($username)) {
            $error_msg = 'Username-kan horey ayaa loo isticmaalay. Mid kale dooro.';
        } elseif (email_exists($email)) {
            $error_msg = 'Email-kan horey ayaa loo isticmaalay. Ku galaysaa akoonkaaga.';
        } else {
            $user_id = wp_create_user($username, $password, $email);
            if (is_wp_error($user_id)) {
                $error_msg = $user_id->get_error_message();
            } else {
                wp_update_user(array('ID' => $user_id, 'display_name' => $full_name, 'first_name' => $full_name));

                $api_url = BSA_APP_API_URL . '/api/sync-user';
                $api_key = get_option('bsa_wordpress_api_key', '');
                wp_remote_post($api_url, array(
                    'timeout' => 15,
                    'headers' => array(
                        'Content-Type' => 'application/json',
                        'x-wordpress-api-key' => $api_key,
                    ),
                    'body' => json_encode(array(
                        'email' => $email,
                        'username' => $username,
                        'fullName' => $full_name,
                        'password' => $password,
                    )),
                ));

                $creds = array('user_login' => $username, 'user_password' => $password, 'remember' => true);
                $login = wp_signon($creds, is_ssl());
                if (!is_wp_error($login)) {
                    wp_set_current_user($user_id);
                    $redirect = home_url('/koorso-iibso/');
                    wp_redirect($redirect);
                    exit;
                }
                $success_msg = 'Akoonkaaga waa la sameeyay! Hadda waxaad gali kartaa.';
            }
        }
    }

    ob_start();
    ?>
    <style>
    .bsa-reg-wrap{max-width:480px;margin:40px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    .bsa-reg-card{background:#fff;border-radius:16px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
    .bsa-reg-title{text-align:center;font-size:24px;font-weight:700;color:#1e293b;margin:0 0 6px}
    .bsa-reg-sub{text-align:center;color:#64748b;font-size:14px;margin:0 0 28px}
    .bsa-reg-label{display:block;font-size:14px;font-weight:600;color:#374151;margin-bottom:6px}
    .bsa-reg-input{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;box-sizing:border-box;transition:border-color 0.2s}
    .bsa-reg-input:focus{outline:none;border-color:#6366f1}
    .bsa-reg-group{margin-bottom:18px}
    .bsa-reg-btn{display:block;width:100%;padding:14px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff!important;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px}
    .bsa-reg-btn:hover{opacity:0.9}
    .bsa-reg-error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:12px;border-radius:10px;margin-bottom:18px;text-align:center;font-size:14px}
    .bsa-reg-success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:12px;border-radius:10px;margin-bottom:18px;text-align:center;font-size:14px}
    .bsa-reg-footer{text-align:center;margin-top:20px;font-size:14px;color:#64748b}
    .bsa-reg-footer a{color:#6366f1;text-decoration:none;font-weight:600}
    </style>
    <div class="bsa-reg-wrap">
        <div class="bsa-reg-card">
            <div style="text-align:center;font-size:48px;margin-bottom:12px">&#128221;</div>
            <h2 class="bsa-reg-title">Isdiiwaangeli</h2>
            <p class="bsa-reg-sub">Akoon cusub sameyso si aad koorsooyin u iibsato</p>

            <?php if ($error_msg): ?>
                <div class="bsa-reg-error">&#9888;&#65039; <?php echo esc_html($error_msg); ?></div>
            <?php endif; ?>
            <?php if ($success_msg): ?>
                <div class="bsa-reg-success">&#9989; <?php echo esc_html($success_msg); ?></div>
            <?php endif; ?>

            <form method="post" autocomplete="on">
                <?php wp_nonce_field('bsa_register_action', 'bsa_register_nonce'); ?>
                <div class="bsa-reg-group">
                    <label class="bsa-reg-label">Magacaaga oo buuxa *</label>
                    <input type="text" name="bsa_full_name" class="bsa-reg-input" placeholder="Tusaale: Axmed Maxamed" value="<?php echo esc_attr($_POST['bsa_full_name'] ?? ''); ?>" required>
                </div>
                <div class="bsa-reg-group">
                    <label class="bsa-reg-label">Username *</label>
                    <input type="text" name="bsa_username" class="bsa-reg-input" placeholder="Tusaale: axmed123" value="<?php echo esc_attr($_POST['bsa_username'] ?? ''); ?>" required>
                </div>
                <div class="bsa-reg-group">
                    <label class="bsa-reg-label">Email *</label>
                    <input type="email" name="bsa_email" class="bsa-reg-input" placeholder="email@tusaale.com" value="<?php echo esc_attr($_POST['bsa_email'] ?? ''); ?>" required>
                </div>
                <div class="bsa-reg-group">
                    <label class="bsa-reg-label">Password *</label>
                    <input type="password" name="bsa_password" class="bsa-reg-input" placeholder="Ugu yaraan 6 xaraf" required>
                </div>
                <div class="bsa-reg-group">
                    <label class="bsa-reg-label">Password-ka ku celi *</label>
                    <input type="password" name="bsa_password2" class="bsa-reg-input" placeholder="Mar kale ku qor" required>
                </div>
                <button type="submit" name="bsa_register_submit" class="bsa-reg-btn">&#128640; Isdiiwaangeli</button>
            </form>
            <div class="bsa-reg-footer">
                Horey u leedahay akoon? <a href="<?php echo wp_login_url(home_url('/koorso-iibso/')); ?>">Halkan ka gal</a>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

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
        update_option('bsa_api_key', sanitize_text_field($_POST['bsa_api_key'] ?? ''));
        update_option('bsa_stripe_publishable_key', sanitize_text_field($_POST['bsa_stripe_publishable_key'] ?? ''));
        update_option('bsa_stripe_secret_key', sanitize_text_field($_POST['bsa_stripe_secret_key'] ?? ''));
        update_option('bsa_stripe_webhook_secret', sanitize_text_field($_POST['bsa_stripe_webhook_secret'] ?? ''));
        update_option('bsa_mobile_money_number', sanitize_text_field($_POST['bsa_mobile_money_number'] ?? ''));
        update_option('bsa_mobile_money_name', sanitize_text_field($_POST['bsa_mobile_money_name'] ?? ''));
        update_option('bsa_openai_api_key', sanitize_text_field($_POST['bsa_openai_api_key'] ?? ''));
        echo '<div class="notice notice-success"><p>Settings waa la keydiyay!</p></div>';
    }
    $api_key = get_option('bsa_api_key', '');
    ?>
    <div class="wrap">
        <h1>BSA Payment Settings</h1>
        <form method="post">
            <?php wp_nonce_field('bsa_payment_settings'); ?>
            <table class="form-table">
                <tr style="background: #f0f7ff;">
                    <th style="color: #1a56db; font-weight: bold;">BSA App API Key</th>
                    <td>
                        <input type="password" name="bsa_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" placeholder="API Key-ga app-ka halkan ku geli..." />
                        <p class="description">App-ka (appbarbaarintasan.com) iyo WordPress-ka isku xiriirka. Tani waa WORDPRESS_API_KEY.</p>
                        <?php if (empty($api_key)): ?>
                            <p style="color: #dc2626; font-weight: bold;">&#9888; API Key ma la gelin! Import iyo enrollment ma shaqayn doonaan.</p>
                        <?php else: ?>
                            <p style="color: #16a34a; font-weight: bold;">&#10004; API Key waa la geliyay.</p>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr><td colspan="2"><hr style="border-top: 2px solid #e5e7eb;"></td></tr>
                <tr>
                    <th>Stripe Publishable Key</th>
                    <td><input type="text" name="bsa_stripe_publishable_key" value="<?php echo esc_attr(get_option('bsa_stripe_publishable_key', '')); ?>" class="regular-text" placeholder="pk_live_..." /></td>
                </tr>
                <tr>
                    <th>Stripe Secret Key</th>
                    <td><input type="password" name="bsa_stripe_secret_key" value="<?php echo esc_attr(get_option('bsa_stripe_secret_key', '')); ?>" class="regular-text" placeholder="sk_live_..." /></td>
                </tr>
                <tr>
                    <th>Stripe Webhook Secret</th>
                    <td><input type="password" name="bsa_stripe_webhook_secret" value="<?php echo esc_attr(get_option('bsa_stripe_webhook_secret', '')); ?>" class="regular-text" placeholder="whsec_..." />
                    <p class="description">Stripe Dashboard &rarr; Webhooks ka hel signing secret-ka. Webhook URL: <code><?php echo esc_url(rest_url('bsa/v1/stripe-webhook')); ?></code></p></td>
                </tr>
                <tr><td colspan="2"><hr style="border-top: 2px solid #e5e7eb;"></td></tr>
                <tr>
                    <th>Mobile Money Number</th>
                    <td><input type="text" name="bsa_mobile_money_number" value="<?php echo esc_attr(get_option('bsa_mobile_money_number', '')); ?>" class="regular-text" placeholder="252-XXX-XXXX" /></td>
                </tr>
                <tr>
                    <th>Mobile Money Magaca</th>
                    <td><input type="text" name="bsa_mobile_money_name" value="<?php echo esc_attr(get_option('bsa_mobile_money_name', 'Barbaarintasan Academy')); ?>" class="regular-text" /></td>
                </tr>
                <tr><td colspan="2"><hr style="border-top: 2px solid #e5e7eb;"></td></tr>
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
    if (!wp_verify_nonce($_POST['nonce'] ?? '', 'bsa_payment_nonce')) {
        wp_send_json_error(array('message' => 'Session-kaagu wuu dhacay. Fadlan page-ka refresh garee (F5) oo mar kale isku day.'));
        return;
    }

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

// Register Stripe webhook REST endpoint
add_action('rest_api_init', function () {
    register_rest_route('bsa/v1', '/stripe-webhook', array(
        'methods'             => 'POST',
        'callback'            => 'bsa_handle_stripe_webhook',
        'permission_callback' => '__return_true',
    ));
});

function bsa_handle_stripe_webhook(WP_REST_Request $request) {
    $webhook_secret = get_option('bsa_stripe_webhook_secret', '');
    if (empty($webhook_secret)) {
        return new WP_REST_Response(array('error' => 'Webhook secret not configured'), 500);
    }

    $payload    = $request->get_body();
    $sig_header = $request->get_header('stripe-signature');

    if (empty($sig_header)) {
        return new WP_REST_Response(array('error' => 'Missing Stripe-Signature header'), 400);
    }

    // Verify the webhook signature
    $event = bsa_stripe_verify_webhook_signature($payload, $sig_header, $webhook_secret);
    if (is_wp_error($event)) {
        error_log('BSA Stripe Webhook: signature verification failed - ' . $event->get_error_message());
        return new WP_REST_Response(array('error' => 'Invalid signature'), 400);
    }

    $event_type = $event['type'] ?? '';
    error_log('BSA Stripe Webhook: received event ' . $event_type);

    if ($event_type === 'checkout.session.completed') {
        $session    = $event['data']['object'] ?? array();
        $session_id = $session['id'] ?? '';

        // Idempotency: skip if already processed
        if (!empty($session_id) && get_transient('bsa_stripe_processed_' . $session_id)) {
            return new WP_REST_Response(array('received' => true), 200);
        }

        if (($session['payment_status'] ?? '') !== 'paid' && ($session['status'] ?? '') !== 'complete') {
            return new WP_REST_Response(array('received' => true), 200);
        }

        $email       = $session['metadata']['email'] ?? ($session['customer_email'] ?? '');
        $name        = $session['metadata']['name'] ?? '';
        $course_id   = $session['metadata']['course_id'] ?? 'all-access';
        $plan_type   = $session['metadata']['plan_type'] ?? 'yearly';
        $amount_total = ($session['amount_total'] ?? 0) / 100;

        if (empty($email)) {
            return new WP_REST_Response(array('received' => true), 200);
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

    return new WP_REST_Response(array('received' => true), 200);
}

function bsa_stripe_verify_webhook_signature($payload, $sig_header, $secret) {
    // Parse the Stripe-Signature header: t=timestamp,v1=signature,...
    $parts     = array();
    $timestamp = null;
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

    // Reject events with timestamp older than 5 minutes (replay attack prevention)
    if (abs(time() - $timestamp) > 300) {
        return new WP_Error('invalid_timestamp', 'Stripe webhook timestamp is too old');
    }

    $signed_payload    = $timestamp . '.' . $payload;
    $expected_signature = hash_hmac('sha256', $signed_payload, $secret);

    foreach ($signatures as $sig) {
        if (hash_equals($expected_signature, $sig)) {
            return json_decode($payload, true);
        }
    }

    return new WP_Error('invalid_signature', 'Stripe webhook signature mismatch');
}

function bsa_enroll_user_in_app($enroll_body, $payment_id) {
    $api_key = get_option('bsa_api_key', '');
    if (empty($api_key)) {
        return array('success' => false, 'error' => 'BSA App API Key ma jiro. Settings → BSA App Integration ku geli.');
    }

    $url = rtrim(BSA_APP_API_URL, '/') . '/api/wordpress/purchase';

    if (empty($enroll_body['transaction_id']) && $payment_id > 0) {
        $enroll_body['transaction_id'] = 'wp_payment_' . $payment_id . '_' . time();
    }

    error_log('BSA ENROLL: Sending to ' . $url . ' for ' . ($enroll_body['email'] ?? 'unknown') . ' txn=' . ($enroll_body['transaction_id'] ?? 'none'));

    $max_retries = 2;
    $last_error = '';
    
    for ($attempt = 1; $attempt <= $max_retries; $attempt++) {
        $response = wp_remote_post($url, array(
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'x-wordpress-api-key' => $api_key,
            ),
            'body' => wp_json_encode($enroll_body),
        ));

        if (is_wp_error($response)) {
            $last_error = $response->get_error_message();
            error_log('BSA ENROLL ERROR (attempt ' . $attempt . '): ' . $last_error);
            if ($attempt < $max_retries) {
                sleep(2);
                continue;
            }
            update_post_meta($payment_id, 'bsa_enroll_status', 'failed');
            update_post_meta($payment_id, 'bsa_enroll_error', $last_error);
            return array('success' => false, 'error' => 'App-ka la xiriiri kari waayay: ' . $last_error);
        }

        $code = wp_remote_retrieve_response_code($response);
        $body_text = wp_remote_retrieve_body($response);
        $result = json_decode($body_text, true);
        error_log('BSA ENROLL RESPONSE (attempt ' . $attempt . '): HTTP ' . $code . ' - ' . $body_text);

        if ($code >= 200 && $code < 300 && !empty($result['success'])) {
            update_post_meta($payment_id, 'bsa_enroll_status', 'success');
            update_post_meta($payment_id, 'bsa_enrolled_at', current_time('mysql'));
            if (!empty($result['enrollment']['expiresAt'])) {
                update_post_meta($payment_id, 'bsa_access_end', $result['enrollment']['expiresAt']);
            }
            error_log('BSA ENROLL SUCCESS: User ' . ($enroll_body['email'] ?? '') . ' enrolled, access until: ' . ($result['enrollment']['expiresAt'] ?? 'unknown'));
            return array('success' => true, 'data' => $result);
        } else {
            $last_error = !empty($result['error']) ? $result['error'] : (!empty($result['message']) ? $result['message'] : 'HTTP ' . $code);
            if ($attempt < $max_retries && $code >= 500) {
                error_log('BSA ENROLL RETRY: Server error, retrying in 2s...');
                sleep(2);
                continue;
            }
            update_post_meta($payment_id, 'bsa_enroll_status', 'failed');
            update_post_meta($payment_id, 'bsa_enroll_error', $last_error);
            error_log('BSA ENROLL FAILED: ' . $last_error);
            return array('success' => false, 'error' => $last_error);
        }
    }

    return array('success' => false, 'error' => $last_error ?: 'Unknown error after retries');
}

function bsa_api_request($endpoint, $body = array()) {
    $api_key = get_option('bsa_api_key', '');
    if (empty($api_key)) {
        error_log('BSA API: No API key configured');
        return false;
    }

    $url = rtrim(BSA_APP_API_URL, '/') . $endpoint;
    error_log('BSA API: POST ' . $url);

    $response = wp_remote_post($url, array(
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-wordpress-api-key' => $api_key,
        ),
        'body' => wp_json_encode($body),
    ));

    if (is_wp_error($response)) {
        error_log('BSA API Error: ' . $response->get_error_message());
        return false;
    }

    $code = wp_remote_retrieve_response_code($response);
    $result = json_decode(wp_remote_retrieve_body($response), true);
    error_log('BSA API Response: HTTP ' . $code);

    return $result;
}

// AJAX: Submit mobile money receipt
add_action('wp_ajax_bsa_mobile_payment', 'bsa_submit_mobile_payment');
add_action('wp_ajax_nopriv_bsa_mobile_payment', 'bsa_submit_mobile_payment');

function bsa_validate_receipt_with_ai($image_path, $expected_amount, $plan_type) {
    $openai_key = get_option('bsa_openai_api_key', '');
    if (empty($openai_key)) {
        error_log('BSA AI Receipt: OpenAI API key not configured');
        return array('valid' => false, 'reason' => 'AI validation not configured - API key missing', 'confidence' => 0, 'error' => 'no_api_key');
    }

    error_log('BSA AI Receipt: Starting validation for plan=' . $plan_type . ' amount=' . $expected_amount);

    $image_data = file_get_contents($image_path);
    if (!$image_data) {
        error_log('BSA AI Receipt: Cannot read image file: ' . $image_path);
        return array('valid' => false, 'reason' => 'Sawirka la akhriyi kari waayay', 'confidence' => 0);
    }

    $file_size = strlen($image_data);
    error_log('BSA AI Receipt: Image size = ' . $file_size . ' bytes');

    $mime_type = 'image/jpeg';
    if (function_exists('mime_content_type')) {
        $mime_type = mime_content_type($image_path) ?: 'image/jpeg';
    } elseif (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        if ($fi) { $mime_type = finfo_file($fi, $image_path) ?: 'image/jpeg'; finfo_close($fi); }
    }

    if ($file_size > 5 * 1024 * 1024 && function_exists('imagecreatefromjpeg')) {
        $image = null;
        if (strpos($mime_type, 'png') !== false && function_exists('imagecreatefrompng')) {
            $image = @imagecreatefrompng($image_path);
        } elseif (strpos($mime_type, 'webp') !== false && function_exists('imagecreatefromwebp')) {
            $image = @imagecreatefromwebp($image_path);
        } else {
            $image = @imagecreatefromjpeg($image_path);
        }
        if ($image) {
            $temp_path = $image_path . '_resized.jpg';
            imagejpeg($image, $temp_path, 70);
            imagedestroy($image);
            $image_data = file_get_contents($temp_path);
            $mime_type = 'image/jpeg';
            @unlink($temp_path);
            error_log('BSA AI Receipt: Resized image to ' . strlen($image_data) . ' bytes');
        }
    }

    $base64_image = base64_encode($image_data);

    $prompt = "You are a payment receipt validator for Barbaarintasan Academy (an education platform). 
Analyze this image and determine if it is a REAL mobile money payment receipt/screenshot.

Expected payment amount: \${$expected_amount} USD (Plan: {$plan_type})

IMPORTANT RULES:
1. The image MUST be a mobile money transaction screenshot or receipt (EVC Plus, Zaad, Sahal, eDahab, M-Pesa, or similar)
2. It must show a completed/successful transaction
3. Random photos, selfies, screenshots of other apps, or non-receipt images should be REJECTED
4. The receipt should show transaction details like amount, reference number, date, or recipient

Respond in this exact JSON format only (no extra text):
{
  \"is_receipt\": true,
  \"confidence\": 0.95,
  \"reason_somali\": \"Waa rasiid EVC Plus oo sax ah\",
  \"detected_amount\": 15,
  \"transaction_ref\": \"CT123456\"
}";

    $request_body = wp_json_encode(array(
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
        'response_format' => array('type' => 'json_object'),
    ));

    if (!$request_body) {
        error_log('BSA AI Receipt: Failed to encode JSON request body');
        return array('valid' => false, 'reason' => 'Internal error - JSON encode failed', 'confidence' => 0, 'error' => 'json_encode_fail');
    }

    error_log('BSA AI Receipt: Sending request to OpenAI (body size: ' . strlen($request_body) . ')');

    $response = wp_remote_post('https://api.openai.com/v1/chat/completions', array(
        'timeout' => 60,
        'headers' => array(
            'Authorization' => 'Bearer ' . $openai_key,
            'Content-Type' => 'application/json',
        ),
        'body' => $request_body,
    ));

    if (is_wp_error($response)) {
        $error_msg = $response->get_error_message();
        error_log('BSA AI Receipt: WP Error - ' . $error_msg);
        return array('valid' => false, 'reason' => 'AI khalad: ' . $error_msg, 'confidence' => 0, 'error' => 'wp_error');
    }

    $http_code = wp_remote_retrieve_response_code($response);
    $raw_body = wp_remote_retrieve_body($response);
    error_log('BSA AI Receipt: HTTP ' . $http_code . ' Response length: ' . strlen($raw_body));

    if ($http_code !== 200) {
        error_log('BSA AI Receipt: API Error Response: ' . substr($raw_body, 0, 500));
        $error_data = json_decode($raw_body, true);
        $error_msg = $error_data['error']['message'] ?? 'Unknown API error';
        return array('valid' => false, 'reason' => 'OpenAI API error: ' . $error_msg, 'confidence' => 0, 'error' => 'api_error_' . $http_code);
    }

    $body = json_decode($raw_body, true);
    if (!$body || !isset($body['choices'][0]['message']['content'])) {
        error_log('BSA AI Receipt: Invalid response structure: ' . substr($raw_body, 0, 500));
        return array('valid' => false, 'reason' => 'AI jawaab aan la fahmin', 'confidence' => 0, 'error' => 'invalid_response');
    }

    $content = $body['choices'][0]['message']['content'];
    error_log('BSA AI Receipt: AI Response: ' . $content);

    $content = preg_replace('/```json\s*/', '', $content);
    $content = preg_replace('/```\s*/', '', $content);
    $result = json_decode(trim($content), true);

    if (!$result || !isset($result['is_receipt'])) {
        error_log('BSA AI Receipt: Failed to parse JSON from AI response');
        return array('valid' => false, 'reason' => 'AI jawaabta la parse garayn waayay', 'confidence' => 0, 'error' => 'parse_fail');
    }

    $final = array(
        'valid' => (bool) $result['is_receipt'],
        'confidence' => (float) ($result['confidence'] ?? 0),
        'reason' => $result['reason_somali'] ?? 'Unknown',
        'detected_amount' => $result['detected_amount'] ?? null,
        'transaction_ref' => $result['transaction_ref'] ?? null,
    );

    error_log('BSA AI Receipt: Result - valid=' . ($final['valid'] ? 'YES' : 'NO') . ' confidence=' . $final['confidence'] . ' reason=' . $final['reason']);

    return $final;
}

function bsa_submit_mobile_payment() {
    ob_start();
    @ini_set('display_errors', 0);

    try {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'bsa_payment_nonce')) {
            ob_end_clean();
            wp_send_json_error(array('message' => 'Session-kaagu wuu dhacay. Fadlan page-ka refresh garee (F5) oo mar kale isku day.'));
            return;
        }

        $course_id = sanitize_text_field($_POST['course_id'] ?? '');
        $plan_type = sanitize_text_field($_POST['plan_type'] ?? '');
        $email = sanitize_email($_POST['email'] ?? '');
        $name = sanitize_text_field($_POST['name'] ?? '');
        $phone = sanitize_text_field($_POST['phone'] ?? '');

        if (empty($course_id) || empty($plan_type) || empty($email) || empty($name)) {
            ob_end_clean();
            wp_send_json_error(array('message' => 'Fadlan buuxi meelaha oo dhan.'));
            return;
        }

        if (empty($_FILES['receipt']) || $_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
            $upload_errors = array(
                UPLOAD_ERR_INI_SIZE => 'Sawirku aad buu u weyn yahay (server limit).',
                UPLOAD_ERR_FORM_SIZE => 'Sawirku aad buu u weyn yahay.',
                UPLOAD_ERR_PARTIAL => 'Sawirka qayb ka mid ah kaliya ayaa la soo diray. Fadlan isku day mar kale.',
                UPLOAD_ERR_NO_FILE => 'Sawir lama soo dirin. Fadlan sawirka rasiidka dooro.',
                UPLOAD_ERR_NO_TMP_DIR => 'Server khalad (temp folder). La xiriir admin-ka.',
                UPLOAD_ERR_CANT_WRITE => 'Server khalad (write). La xiriir admin-ka.',
            );
            $err_code = $_FILES['receipt']['error'] ?? UPLOAD_ERR_NO_FILE;
            $err_msg = $upload_errors[$err_code] ?? 'Sawirka la upload garayn waayay (code: ' . $err_code . ').';
            ob_end_clean();
            wp_send_json_error(array('message' => $err_msg));
            return;
        }

        $file = $_FILES['receipt'];
        $allowed = array('image/jpeg', 'image/png', 'image/webp', 'image/gif');

        $real_mime = $file['type'];
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $real_mime = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
            }
        } elseif (function_exists('mime_content_type')) {
            $real_mime = mime_content_type($file['tmp_name']);
        }

        if (!in_array($real_mime, $allowed)) {
            ob_end_clean();
            wp_send_json_error(array('message' => 'Sawirka noociisu waa inuu yahay JPG, PNG, ama WebP. Nooca la helay: ' . $real_mime));
            return;
        }

        if ($file['size'] > 10 * 1024 * 1024) {
            ob_end_clean();
            wp_send_json_error(array('message' => 'Sawirku waa inuusan ka badnayn 10MB. Sawirkaagu waa ' . round($file['size'] / 1024 / 1024, 1) . 'MB.'));
            return;
        }

        $prices = array('monthly' => 15, 'yearly' => 114, 'onetime' => 70);
        $amount = $prices[$plan_type] ?? 114;

        // DUPLICATE CHECK 1: Check image hash to prevent same image being uploaded twice
        $image_hash = md5_file($file['tmp_name']);
        if ($image_hash) {
            $existing_by_hash = get_posts(array(
                'post_type' => 'bsa_payment',
                'meta_key' => 'bsa_receipt_hash',
                'meta_value' => $image_hash,
                'post_status' => array('pending', 'publish'),
                'posts_per_page' => 1,
                'fields' => 'ids',
            ));
            if (!empty($existing_by_hash)) {
                ob_end_clean();
                wp_send_json_error(array(
                    'message' => 'Rasiidkan hore ayaa la isticmaalay. Fadlan soo dir rasiid cusub oo kale.',
                ));
                return;
            }
        }

        $ai_result = bsa_validate_receipt_with_ai($file['tmp_name'], $amount, $plan_type);

        if (!$ai_result['valid'] && $ai_result['confidence'] >= 0.7) {
            ob_end_clean();
            wp_send_json_error(array(
                'message' => 'Sawirka aad soo dirtay ma aha rasiid lacag bixin. ' . ($ai_result['reason'] ?? '') . ' Fadlan sawirka rasiidka ee lacag bixinta soo dir.',
            ));
            return;
        }

        // DUPLICATE CHECK 2: Check transaction reference from AI
        $transaction_ref = trim($ai_result['transaction_ref'] ?? '');
        if (!empty($transaction_ref)) {
            $existing_by_ref = get_posts(array(
                'post_type' => 'bsa_payment',
                'meta_key' => 'bsa_transaction_ref',
                'meta_value' => $transaction_ref,
                'post_status' => array('pending', 'publish'),
                'posts_per_page' => 1,
                'fields' => 'ids',
            ));
            if (!empty($existing_by_ref)) {
                ob_end_clean();
                wp_send_json_error(array(
                    'message' => 'Rasiidkan hore ayaa la isticmaalay (Ref: ' . $transaction_ref . '). Fadlan soo dir rasiid cusub oo kale.',
                ));
                return;
            }
        }

        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');

        $attachment_id = media_handle_upload('receipt', 0);
        if (is_wp_error($attachment_id)) {
            ob_end_clean();
            wp_send_json_error(array('message' => 'Sawirka la upload garayn waayay: ' . $attachment_id->get_error_message()));
            return;
        }

        $receipt_url = wp_get_attachment_url($attachment_id);

        $payment_id = wp_insert_post(array(
            'post_title' => 'Mobile: ' . $name . ' - ' . $email,
            'post_type' => 'bsa_payment',
            'post_status' => 'pending',
        ));

        $ai_confidence = (float) ($ai_result['confidence'] ?? 0);
        $auto_approved = false;

        if ($ai_result['valid'] && $ai_confidence >= 0.95) {
            $payment_status = 'approved';
            $auto_approved = true;
        } elseif ($ai_result['valid'] && $ai_confidence >= 0.85) {
            $payment_status = 'pending';
        } else {
            $payment_status = 'pending';
        }

        if ($payment_id) {
            update_post_meta($payment_id, 'bsa_email', $email);
            update_post_meta($payment_id, 'bsa_name', $name);
            update_post_meta($payment_id, 'bsa_phone', $phone);
            update_post_meta($payment_id, 'bsa_course_id', $course_id);
            update_post_meta($payment_id, 'bsa_plan_type', $plan_type);
            update_post_meta($payment_id, 'bsa_amount', $amount);
            update_post_meta($payment_id, 'bsa_receipt_url', $receipt_url);
            update_post_meta($payment_id, 'bsa_receipt_attachment_id', $attachment_id);
            update_post_meta($payment_id, 'bsa_payment_status', $payment_status);
            update_post_meta($payment_id, 'bsa_payment_method', 'mobile_money');
            update_post_meta($payment_id, 'bsa_submitted_at', current_time('mysql'));
            update_post_meta($payment_id, 'bsa_ai_validation', wp_json_encode($ai_result));
            if ($image_hash) {
                update_post_meta($payment_id, 'bsa_receipt_hash', $image_hash);
            }
            if (!empty($transaction_ref)) {
                update_post_meta($payment_id, 'bsa_transaction_ref', $transaction_ref);
            }

            if ($auto_approved) {
                update_post_meta($payment_id, 'bsa_auto_approved', true);
                update_post_meta($payment_id, 'bsa_approved_at', current_time('mysql'));
                wp_update_post(array('ID' => $payment_id, 'post_status' => 'publish'));

                $enroll_body = array(
                    'email' => $email,
                    'name' => $name,
                    'plan_type' => $plan_type,
                    'course_id' => $course_id,
                    'payment_method' => 'mobile_money',
                    'amount' => $amount,
                    'receipt_url' => $receipt_url,
                    'transaction_ref' => $ai_result['transaction_ref'] ?? '',
                    'auto_approved' => true,
                    'ai_confidence' => $ai_confidence,
                );
                $enroll_result = bsa_enroll_user_in_app($enroll_body, $payment_id);
                if (!$enroll_result['success']) {
                    error_log('BSA ENROLL FAILED: ' . $enroll_result['error']);
                    update_post_meta($payment_id, 'bsa_enroll_error', $enroll_result['error']);
                }
            }
        }

        bsa_send_payment_emails($name, $email, $course_id, $plan_type, $amount, $payment_status, $auto_approved, $payment_id);

        ob_end_clean();

        if ($auto_approved) {
            wp_send_json_success(array(
                'message' => 'Hambalyo! Rasiidkaagu waa la xaqiijiyay! Koorsadaada waa laguu furay.',
                'payment_id' => $payment_id,
                'auto_approved' => true,
                'redirect' => 'https://appbarbaarintasan.com/courses',
            ));
        } else {
            wp_send_json_success(array(
                'message' => 'Mahadsanid! Rasiidkaaga waa la helay. Waxaan ku ogeysiin doonaa marka la ansixiyo (24 saac gudahood).',
                'payment_id' => $payment_id,
                'auto_approved' => false,
            ));
        }

    } catch (Exception $e) {
        ob_end_clean();
        error_log('BSA Mobile Payment Error: ' . $e->getMessage());
        wp_send_json_error(array('message' => 'Khalad aan la fileyn ayaa dhacay. Fadlan mar kale isku day. (' . $e->getMessage() . ')'));
    } catch (Error $e) {
        ob_end_clean();
        error_log('BSA Mobile Payment Fatal: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
        wp_send_json_error(array('message' => 'Khalad server ayaa dhacay: ' . $e->getMessage() . ' (Line ' . $e->getLine() . '). Fadlan admin-ka u sheeg.'));
    }
}

function bsa_send_payment_emails($name, $email, $course_id, $plan_type, $amount, $status, $auto_approved, $payment_id) {
    $plan_names = array('monthly' => 'Bishii', 'yearly' => 'Sannadkii', 'onetime' => 'Hal mar');
    $plan_label = $plan_names[$plan_type] ?? $plan_type;
    $date = current_time('d/m/Y h:i A');
    $site_name = get_bloginfo('name');
    $admin_email = get_option('admin_email');

    $headers = array('Content-Type: text/html; charset=UTF-8', 'From: ' . $site_name . ' <' . $admin_email . '>');

    if ($auto_approved) {
        $customer_subject = 'Hambalyo! Lacag bixintaada waa la xaqiijiyay - ' . $site_name;
        $customer_body = '
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;border-radius:16px 16px 0 0;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">&#9989; Hambalyo, ' . esc_html($name) . '!</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 16px 16px">
                <p style="font-size:16px;color:#1e293b">Lacag bixintaada waa la xaqiijiyay oo koorsadaada waa laguu furay!</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0">
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Koorso ID</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($course_id) . '</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Nooca</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($plan_label) . '</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Lacagta</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">$' . esc_html($amount) . '</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Taariikhda</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . $date . '</td></tr>
                    <tr><td style="padding:10px;color:#64748b">Xaalad</td><td style="padding:10px;font-weight:600;color:#059669">&#9989; La xaqiijiyay</td></tr>
                </table>
                <div style="text-align:center;margin-top:24px">
                    <a href="https://appbarbaarintasan.com/courses" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff!important;border-radius:10px;text-decoration:none!important;font-weight:600;font-size:16px">Bilow Waxbarashada</a>
                </div>
                <p style="font-size:13px;color:#94a3b8;text-align:center;margin-top:24px">Mahadsanid inaad la socotid ' . esc_html($site_name) . '</p>
            </div>
        </div>';
    } else {
        $customer_subject = 'Rasiidkaaga waa la helay - ' . $site_name;
        $customer_body = '
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;border-radius:16px 16px 0 0;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">&#128338; Rasiidkaaga waa la helay</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 16px 16px">
                <p style="font-size:16px;color:#1e293b">Salaan, ' . esc_html($name) . '!</p>
                <p style="color:#475569">Rasiidkaaga waa la helay waxaana la baareyaa. Waxaan ku ogeysiin doonaa 24 saac gudahood.</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0">
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Koorso ID</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($course_id) . '</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Nooca</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($plan_label) . '</td></tr>
                    <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Lacagta</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">$' . esc_html($amount) . '</td></tr>
                    <tr><td style="padding:10px;color:#64748b">Xaalad</td><td style="padding:10px;font-weight:600;color:#d97706">&#9203; Waa la baareyaa</td></tr>
                </table>
                <p style="font-size:13px;color:#94a3b8;text-align:center;margin-top:24px">Mahadsanid inaad la socotid ' . esc_html($site_name) . '</p>
            </div>
        </div>';
    }

    wp_mail($email, $customer_subject, $customer_body, $headers);

    $admin_subject = 'Lacag bixin cusub: ' . $name . ' - $' . $amount . ' (' . ($auto_approved ? 'AUTO-APPROVED' : 'PENDING') . ')';
    $admin_body = '
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;border-radius:16px 16px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">&#128176; Lacag Bixin Cusub!</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 16px 16px">
            <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Magaca</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($name) . '</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Email</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($email) . '</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Koorso ID</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($course_id) . '</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Nooca</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">' . esc_html($plan_label) . '</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Lacagta</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:18px;color:#059669">$' . esc_html($amount) . '</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Habka</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600">Mobile Money</td></tr>
                <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#64748b">Xaalad</td><td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:600;color:' . ($auto_approved ? '#059669' : '#d97706') . '">' . ($auto_approved ? '&#9989; Auto-Approved (AI)' : '&#9203; Pending Review') . '</td></tr>
                <tr><td style="padding:10px;color:#64748b">Payment ID</td><td style="padding:10px;font-weight:600">#' . $payment_id . '</td></tr>
            </table>
            <div style="text-align:center;margin-top:24px">
                <a href="' . admin_url('edit.php?post_type=bsa_payment') . '" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff!important;border-radius:8px;text-decoration:none!important;font-weight:600">Payments-ka Eeg</a>
            </div>
        </div>
    </div>';

    wp_mail($admin_email, $admin_subject, $admin_body, $headers);

    error_log('BSA Email: Sent payment emails to ' . $email . ' and ' . $admin_email);
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
        'show_in_menu' => false,
        'menu_icon' => 'dashicons-money-alt',
        'supports' => array('title'),
        'capability_type' => 'post',
    ));
}

// Custom admin menu for BSA Payments dashboard
add_action('admin_menu', 'bsa_payment_dashboard_menu');

function bsa_payment_dashboard_menu() {
    $pending_count = bsa_get_payment_count_by_status('pending');
    $menu_title = 'BSA Payments';
    if ($pending_count > 0) {
        $menu_title .= ' <span class="awaiting-mod">' . $pending_count . '</span>';
    }
    add_menu_page(
        'BSA Payments',
        $menu_title,
        'manage_options',
        'bsa-payments-dashboard',
        'bsa_render_payments_dashboard',
        'dashicons-money-alt',
        30
    );
    add_submenu_page(
        'bsa-payments-dashboard',
        'Dhammaan Lacag Bixinaha',
        'Dhammaan Lacag Bixinaha',
        'manage_options',
        'bsa-payments-dashboard',
        'bsa_render_payments_dashboard'
    );
    add_submenu_page(
        'bsa-payments-dashboard',
        'Import App Data',
        'Import App Data',
        'manage_options',
        'bsa-payments-import',
        'bsa_render_import_page'
    );
    add_submenu_page(
        'bsa-payments-dashboard',
        'Bilaash Sii',
        'Bilaash Sii',
        'manage_options',
        'bsa-free-access',
        'bsa_render_free_access_page'
    );
}

function bsa_get_payment_count_by_status($status) {
    $args = array(
        'post_type' => 'bsa_payment',
        'post_status' => 'publish',
        'meta_query' => array(
            array('key' => 'bsa_payment_status', 'value' => $status),
        ),
        'posts_per_page' => -1,
        'fields' => 'ids',
    );
    $q = new WP_Query($args);
    return $q->found_posts;
}

function bsa_get_all_payments($filter_status = '') {
    $meta_query = array();
    if (!empty($filter_status)) {
        $meta_query[] = array('key' => 'bsa_payment_status', 'value' => $filter_status);
    }
    $args = array(
        'post_type' => 'bsa_payment',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'DESC',
        'meta_query' => $meta_query,
    );
    return get_posts($args);
}

function bsa_render_payments_dashboard() {
    $filter = isset($_GET['status_filter']) ? sanitize_text_field($_GET['status_filter']) : '';
    $payments = bsa_get_all_payments($filter);
    
    $all_payments = bsa_get_all_payments('');
    $approved_payments = array_filter($all_payments, function($p) { return get_post_meta($p->ID, 'bsa_payment_status', true) === 'approved'; });
    $pending_payments = array_filter($all_payments, function($p) { return get_post_meta($p->ID, 'bsa_payment_status', true) === 'pending'; });
    $rejected_payments = array_filter($all_payments, function($p) { return get_post_meta($p->ID, 'bsa_payment_status', true) === 'rejected'; });
    
    $total_revenue = 0;
    foreach ($approved_payments as $p) {
        $total_revenue += floatval(get_post_meta($p->ID, 'bsa_amount', true));
    }
    
    $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'payments';
    ?>
    <style>
        .bsa-dash{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:1200px;margin:20px auto;padding:0 15px}
        .bsa-dash *{box-sizing:border-box}
        .bsa-dash h1{font-size:24px;font-weight:700;color:#1e293b;margin:0 0 20px}
        .bsa-tabs{display:flex;background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08);padding:6px;margin-bottom:24px;gap:4px}
        .bsa-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:600;color:#64748b;cursor:pointer;text-decoration:none;transition:all .2s;border:none;background:none}
        .bsa-tab:hover{color:#1e293b;background:#f8fafc}
        .bsa-tab.active{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}
        .bsa-tab:focus{outline:none}
        .bsa-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .bsa-stat{background:#fff;border-radius:14px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);transition:transform .2s;border-left:4px solid transparent}
        .bsa-stat:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08)}
        .bsa-stat-revenue{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-left-color:#22c55e}
        .bsa-stat-approved{background:linear-gradient(135deg,#eff6ff,#dbeafe);border-left-color:#3b82f6}
        .bsa-stat-pending{background:linear-gradient(135deg,#fefce8,#fef9c3);border-left-color:#eab308}
        .bsa-stat-rejected{background:linear-gradient(135deg,#fef2f2,#fecaca);border-left-color:#ef4444}
        .bsa-stat .num{font-size:32px;font-weight:800;line-height:1.2}
        .bsa-stat-revenue .num{color:#16a34a}
        .bsa-stat-approved .num{color:#2563eb}
        .bsa-stat-pending .num{color:#ca8a04}
        .bsa-stat-rejected .num{color:#dc2626}
        .bsa-stat .label{font-size:12px;font-weight:600;margin-top:4px}
        .bsa-stat-revenue .label{color:#15803d}
        .bsa-stat-approved .label{color:#1d4ed8}
        .bsa-stat-pending .label{color:#a16207}
        .bsa-stat-rejected .label{color:#b91c1c}
        .bsa-list-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px}
        .bsa-list-title{font-size:18px;font-weight:700;color:#1e293b}
        .bsa-list-sub{font-size:13px;color:#64748b;margin-top:2px}
        .bsa-filter-btns{display:flex;gap:6px}
        .bsa-filter-btn{padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid #e2e8f0;background:#fff;color:#64748b;cursor:pointer;text-decoration:none;transition:all .2s}
        .bsa-filter-btn:hover{border-color:#3b82f6;color:#3b82f6;background:#eff6ff}
        .bsa-filter-btn.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
        .bsa-payment-card{background:#fff;border-radius:14px;padding:20px;margin-bottom:14px;border:2px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:all .2s}
        .bsa-payment-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.06)}
        .bsa-payment-card.status-approved{border-color:#bbf7d0;background:linear-gradient(135deg,#f0fdf4,#fff)}
        .bsa-payment-card.status-pending{border-color:#fed7aa;background:linear-gradient(135deg,#fffbeb,#fff)}
        .bsa-payment-card.status-rejected{border-color:#fecaca;background:linear-gradient(135deg,#fef2f2,#fff)}
        .bsa-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
        .bsa-card-info{flex:1;min-width:0}
        .bsa-status-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700}
        .bsa-status-approved{background:#dcfce7;color:#15803d}
        .bsa-status-pending{background:#fef3c7;color:#92400e}
        .bsa-status-rejected{background:#fee2e2;color:#991b1b}
        .bsa-card-date{font-size:12px;color:#94a3b8;margin-left:8px}
        .bsa-card-name{font-size:16px;font-weight:700;color:#1e293b;margin:8px 0 4px}
        .bsa-card-contact{font-size:13px;color:#475569;margin-bottom:10px}
        .bsa-card-contact strong{color:#1e293b}
        .bsa-badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
        .bsa-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;color:#475569}
        .bsa-badge-blue{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
        .bsa-badge-purple{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}
        .bsa-badge-green{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}
        .bsa-renewal-box{background:#fff;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-top:8px}
        .bsa-renewal-box.lifetime{border-color:#bbf7d0}
        .bsa-renewal-box.timed{border-color:#fed7aa}
        .bsa-renewal-text{font-size:13px;font-weight:600}
        .bsa-renewal-box.lifetime .bsa-renewal-text{color:#15803d}
        .bsa-renewal-box.timed .bsa-renewal-text{color:#b45309}
        .bsa-card-actions{display:flex;gap:8px;align-items:flex-start;flex-shrink:0}
        .bsa-action-btn{padding:8px 16px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .2s}
        .bsa-action-btn:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,0.12)}
        .bsa-btn-approve{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}
        .bsa-btn-reject{background:#fff;color:#dc2626;border:1px solid #fecaca}
        .bsa-btn-reject:hover{background:#fef2f2}
        .bsa-btn-delete{background:#fff;color:#dc2626;border:1px solid #fecaca;padding:6px 12px;font-size:12px}
        .bsa-btn-delete:hover{background:#fef2f2}
        .bsa-receipt-img{max-width:120px;max-height:80px;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px;cursor:pointer;transition:transform .2s}
        .bsa-receipt-img:hover{transform:scale(1.05)}
        .bsa-ai-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700}
        .bsa-ai-valid{background:#dcfce7;color:#15803d}
        .bsa-ai-warning{background:#fef3c7;color:#92400e}
        .bsa-ai-invalid{background:#fee2e2;color:#991b1b}
        .bsa-empty{text-align:center;padding:60px 20px;color:#94a3b8;font-size:16px}
        .bsa-import-card{background:#fff;border-radius:14px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:20px}
        .bsa-import-card h3{font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px}
        .bsa-import-card p{color:#64748b;font-size:14px;margin:0 0 20px}
        .bsa-import-result{padding:14px 18px;border-radius:10px;font-size:14px;margin-top:16px}
        .bsa-import-success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .bsa-import-error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        @media(max-width:768px){
            .bsa-stats{grid-template-columns:repeat(2,1fr)}
            .bsa-card-top{flex-direction:column}
            .bsa-card-actions{width:100%;justify-content:flex-end}
            .bsa-tabs{flex-wrap:wrap}
        }
    </style>
    <div class="bsa-dash">
        <h1>&#128176; BSA Payments Dashboard</h1>
        
        <div class="bsa-tabs">
            <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=payments'); ?>" class="bsa-tab <?php echo $active_tab === 'payments' ? 'active' : ''; ?>">
                &#128179; Lacag Bixinta
            </a>
            <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=pricing'); ?>" class="bsa-tab <?php echo $active_tab === 'pricing' ? 'active' : ''; ?>">
                &#128176; Qiimaha
            </a>
            <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=stats'); ?>" class="bsa-tab <?php echo $active_tab === 'stats' ? 'active' : ''; ?>">
                &#128200; Xisaab
            </a>
        </div>

        <div class="bsa-stats">
            <div class="bsa-stat bsa-stat-revenue">
                <div class="num">$<?php echo number_format($total_revenue, 0); ?></div>
                <div class="label">Dakhli Wadarta</div>
            </div>
            <div class="bsa-stat bsa-stat-approved">
                <div class="num"><?php echo count($approved_payments); ?></div>
                <div class="label">La oggolaaday</div>
            </div>
            <div class="bsa-stat bsa-stat-pending">
                <div class="num"><?php echo count($pending_payments); ?></div>
                <div class="label">Sugaya</div>
            </div>
            <div class="bsa-stat bsa-stat-rejected">
                <div class="num"><?php echo count($rejected_payments); ?></div>
                <div class="label">La diiday</div>
            </div>
        </div>

        <?php if ($active_tab === 'payments'): ?>
        <div class="bsa-list-header">
            <div>
                <div class="bsa-list-title">Codsiyada Lacag Bixinta (<?php echo count($payments); ?>)</div>
                <div class="bsa-list-sub">Halkan waxaad ka arki kartaa dhammaan codsiyada lacag bixinta</div>
            </div>
            <div class="bsa-filter-btns">
                <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=payments'); ?>" class="bsa-filter-btn <?php echo empty($filter) ? 'active' : ''; ?>">Dhammaan</a>
                <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=payments&status_filter=approved'); ?>" class="bsa-filter-btn <?php echo $filter === 'approved' ? 'active' : ''; ?>">La oggolaaday</a>
                <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=payments&status_filter=pending'); ?>" class="bsa-filter-btn <?php echo $filter === 'pending' ? 'active' : ''; ?>">Sugaya</a>
                <a href="<?php echo admin_url('admin.php?page=bsa-payments-dashboard&tab=payments&status_filter=rejected'); ?>" class="bsa-filter-btn <?php echo $filter === 'rejected' ? 'active' : ''; ?>">La diiday</a>
            </div>
        </div>

        <?php if (empty($payments)): ?>
            <div class="bsa-empty">&#128722; Weli codsi lacag bixin ma jirto.</div>
        <?php else: ?>
            <?php foreach ($payments as $p):
                $pid = $p->ID;
                $status = get_post_meta($pid, 'bsa_payment_status', true) ?: 'pending';
                $email = get_post_meta($pid, 'bsa_email', true);
                $name = get_post_meta($pid, 'bsa_name', true) ?: get_the_title($pid);
                $phone = get_post_meta($pid, 'bsa_phone', true);
                $plan = get_post_meta($pid, 'bsa_plan_type', true);
                $amount = get_post_meta($pid, 'bsa_amount', true);
                $method = get_post_meta($pid, 'bsa_payment_method', true);
                $course_id = get_post_meta($pid, 'bsa_course_id', true);
                $receipt_url = get_post_meta($pid, 'bsa_receipt_url', true);
                $ai_data = get_post_meta($pid, 'bsa_ai_validation', true);
                $reference = get_post_meta($pid, 'bsa_reference_code', true);
                $source = get_post_meta($pid, 'bsa_payment_source', true) ?: ($method === 'stripe' ? 'stripe' : 'manual');
                $created = get_the_date('d/m/Y', $pid);
                
                $plan_labels = array('monthly' => 'Bilaha', 'yearly' => 'Sanada', 'onetime' => 'Hal Mar');
                $plan_label = $plan_labels[$plan] ?? $plan;
                
                $course_name_meta = get_post_meta($pid, 'bsa_course_name', true);
                $course_labels = array(
                    'all-access' => 'Dhammaan Koorsoyinka',
                    'course-1' => '0-6 Bilood Jir',
                    'course-2' => '6-12 Bilood Jir',
                    'course-3' => '1-3 Sano Jir',
                    'course-4' => '3-7 Sano Jir',
                );
                $course_label = !empty($course_name_meta) ? $course_name_meta : ($course_labels[$course_id] ?? $course_id);
            ?>
            <div class="bsa-payment-card status-<?php echo esc_attr($status); ?>">
                <div class="bsa-card-top">
                    <div class="bsa-card-info">
                        <div>
                            <span class="bsa-status-badge bsa-status-<?php echo esc_attr($status); ?>">
                                <?php if ($status === 'approved'): ?>&#10004;<?php elseif ($status === 'pending'): ?>&#9203;<?php else: ?>&#10006;<?php endif; ?>
                                <?php echo $status === 'approved' ? 'La oggolaaday' : ($status === 'pending' ? 'Sugaya' : 'La diiday'); ?>
                            </span>
                            <span class="bsa-card-date"><?php echo esc_html($created); ?></span>
                        </div>
                        <div class="bsa-card-name"><?php echo esc_html($name); ?></div>
                        <div class="bsa-card-contact">
                            <?php if ($phone): ?><strong>Tel:</strong> <?php echo esc_html($phone); ?><?php endif; ?>
                            <?php if ($phone && $email): ?> | <?php endif; ?>
                            <?php if ($email): ?><strong>Email:</strong> <?php echo esc_html($email); ?><?php endif; ?>
                        </div>
                        
                        <div class="bsa-badges">
                            <span class="bsa-badge"><?php echo esc_html($course_label); ?></span>
                            <span class="bsa-badge bsa-badge-blue"><?php echo esc_html($plan_label); ?> - $<?php echo esc_html($amount); ?></span>
                            <?php if ($method === 'stripe' || $source === 'stripe'): ?>
                                <span class="bsa-badge bsa-badge-purple">&#128179; Stripe</span>
                            <?php elseif (strpos($source, 'wordpress') !== false): ?>
                                <span class="bsa-badge bsa-badge-blue">&#127760; WordPress</span>
                            <?php else: ?>
                                <span class="bsa-badge">&#128241; Mobile Money</span>
                            <?php endif; ?>
                            <?php if ($ai_data):
                                $ai = json_decode($ai_data, true);
                                if ($ai):
                                    $conf = round(($ai['confidence'] ?? 0) * 100);
                                    $valid = $ai['valid'] ?? false;
                                    $ai_class = $conf >= 95 ? 'bsa-ai-valid' : ($conf >= 85 ? 'bsa-ai-warning' : 'bsa-ai-invalid');
                            ?>
                                <span class="bsa-ai-badge <?php echo $ai_class; ?>" title="<?php echo esc_attr($ai['reason'] ?? ''); ?>">
                                    AI <?php echo $conf; ?>%
                                </span>
                            <?php endif; endif; ?>
                        </div>
                        
                        <?php if ($reference): ?>
                            <div style="font-size:13px;color:#475569;margin-bottom:6px"><strong>Reference:</strong> <?php echo esc_html($reference); ?></div>
                        <?php endif; ?>
                        
                        <?php if ($status === 'approved'): ?>
                            <div class="bsa-renewal-box <?php echo $plan === 'onetime' ? 'lifetime' : 'timed'; ?>">
                                <?php if ($plan === 'onetime'): ?>
                                    <div class="bsa-renewal-text">&#9989; Weligeed wuu furan yahay (Lifetime Access)</div>
                                <?php else: ?>
                                    <?php
                                    $approved_at = get_post_meta($pid, 'bsa_approved_at', true);
                                    $base = $approved_at ? strtotime($approved_at) : strtotime($p->post_date);
                                    if ($plan === 'yearly') {
                                        $end = date('d F Y', strtotime('+1 year', $base));
                                    } else {
                                        $end = date('d F Y', strtotime('+1 month', $base));
                                    }
                                    ?>
                                    <div class="bsa-renewal-text">&#9200; Lacag dambe waxaa la rabaa: <strong><?php echo esc_html($end); ?></strong></div>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($receipt_url): ?>
                            <div style="margin-top:8px">
                                <a href="<?php echo esc_url($receipt_url); ?>" target="_blank">
                                    <img src="<?php echo esc_url($receipt_url); ?>" class="bsa-receipt-img" alt="Receipt" />
                                </a>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                    <div class="bsa-card-actions">
                        <?php if ($status === 'pending'): ?>
                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bsa_approve_payment&payment_id=' . $pid), 'bsa_approve_' . $pid); ?>" class="bsa-action-btn bsa-btn-approve">&#10004; Oggolow</a>
                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bsa_reject_payment&payment_id=' . $pid), 'bsa_reject_' . $pid); ?>" class="bsa-action-btn bsa-btn-reject" onclick="return confirm('Ma hubtaa inaad diidayso payment-kan?')">&#10006; Diid</a>
                        <?php else: ?>
                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bsa_delete_payment&payment_id=' . $pid), 'bsa_delete_' . $pid); ?>" class="bsa-action-btn bsa-btn-delete" onclick="return confirm('Ma hubtaa inaad tirtireyso payment-kan?')">&#128465; Tirtir</a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
        
        <?php elseif ($active_tab === 'pricing'): ?>
        <div class="bsa-import-card">
            <h3>&#128176; Qiimaha Koorsoyinka</h3>
            <p>Qiimaha hadda jira ee koorsoyinka</p>
            <table style="width:100%;border-collapse:collapse;margin-top:10px">
                <tr style="background:#f8fafc">
                    <th style="padding:12px 16px;text-align:left;font-size:14px;color:#475569;border-bottom:2px solid #e2e8f0">Qorshaha</th>
                    <th style="padding:12px 16px;text-align:left;font-size:14px;color:#475569;border-bottom:2px solid #e2e8f0">Qiimaha</th>
                    <th style="padding:12px 16px;text-align:left;font-size:14px;color:#475569;border-bottom:2px solid #e2e8f0">Mudada</th>
                </tr>
                <tr>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600">&#128197; Bishii (Monthly)</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:700;color:#2563eb">$15</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b">1 Bil</td>
                </tr>
                <tr>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600">&#127775; Sanada (Yearly/Dahabi)</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:700;color:#2563eb">$114</td>
                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b">12 Bilood</td>
                </tr>
                <tr>
                    <td style="padding:12px 16px;font-weight:600">&#128293; Hal Mar (One-time)</td>
                    <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#2563eb">$70</td>
                    <td style="padding:12px 16px;color:#64748b">6 Bilood</td>
                </tr>
            </table>
        </div>
        
        <?php elseif ($active_tab === 'stats'): ?>
        <div class="bsa-import-card">
            <h3>&#128200; Xisaabta Lacag Bixinta</h3>
            <p>Faahfaahin dheeraad ah oo ku saabsan lacag bixinaha</p>
            <?php
            $monthly_count = 0; $yearly_count = 0; $onetime_count = 0;
            $monthly_rev = 0; $yearly_rev = 0; $onetime_rev = 0;
            $stripe_count = 0; $mobile_count = 0; $wp_count = 0;
            foreach ($approved_payments as $p) {
                $plan = get_post_meta($p->ID, 'bsa_plan_type', true);
                $amt = floatval(get_post_meta($p->ID, 'bsa_amount', true));
                $method = get_post_meta($p->ID, 'bsa_payment_method', true);
                $source = get_post_meta($p->ID, 'bsa_payment_source', true);
                if ($plan === 'monthly') { $monthly_count++; $monthly_rev += $amt; }
                elseif ($plan === 'yearly') { $yearly_count++; $yearly_rev += $amt; }
                else { $onetime_count++; $onetime_rev += $amt; }
                if ($method === 'stripe') $stripe_count++;
                elseif (strpos($source, 'wordpress') !== false) $wp_count++;
                else $mobile_count++;
            }
            ?>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px">
                <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:24px;font-weight:800;color:#1d4ed8"><?php echo $monthly_count; ?></div>
                    <div style="font-size:12px;color:#1d4ed8;font-weight:600">Bilaha ($<?php echo number_format($monthly_rev); ?>)</div>
                </div>
                <div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:24px;font-weight:800;color:#92400e"><?php echo $yearly_count; ?></div>
                    <div style="font-size:12px;color:#92400e;font-weight:600">Sanada ($<?php echo number_format($yearly_rev); ?>)</div>
                </div>
                <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:24px;font-weight:800;color:#15803d"><?php echo $onetime_count; ?></div>
                    <div style="font-size:12px;color:#15803d;font-weight:600">Hal Mar ($<?php echo number_format($onetime_rev); ?>)</div>
                </div>
            </div>
            <h4 style="margin:20px 0 10px;font-size:15px;color:#1e293b">Habka Lacag Bixinta</h4>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
                <div style="background:#f5f3ff;border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:24px;font-weight:800;color:#6d28d9"><?php echo $stripe_count; ?></div>
                    <div style="font-size:12px;color:#6d28d9;font-weight:600">&#128179; Stripe</div>
                </div>
                <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:24px;font-weight:800;color:#15803d"><?php echo $mobile_count; ?></div>
                    <div style="font-size:12px;color:#15803d;font-weight:600">&#128241; Mobile Money</div>
                </div>
                <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:24px;font-weight:800;color:#1d4ed8"><?php echo $wp_count; ?></div>
                    <div style="font-size:12px;color:#1d4ed8;font-weight:600">&#127760; WordPress</div>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>
    <?php
}

// Import page - pull data from app
function bsa_render_import_page() {
    $import_result = '';
    $import_type = '';
    
    if (isset($_POST['bsa_import_from_app']) && check_admin_referer('bsa_import_payments')) {
        $api_key = get_option('bsa_api_key', '');
        if (empty($api_key)) {
            $import_result = 'BSA App API Key ma la habeynin. Settings > BSA App Integration ku geli.';
            $import_type = 'error';
        } else {
            $response = wp_remote_get(BSA_APP_API_URL . '/api/wordpress/export-payments', array(
                'timeout' => 30,
                'headers' => array(
                    'x-wordpress-api-key' => $api_key,
                ),
            ));
            
            if (is_wp_error($response)) {
                $import_result = 'App-ka la xiriiri kari waayay: ' . $response->get_error_message();
                $import_type = 'error';
            } else {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if (empty($body['success']) || empty($body['payments'])) {
                    $import_result = 'Xog lacag bixin ma jirto ama khalad ayaa dhacay.';
                    $import_type = 'error';
                } else {
                    $imported = 0;
                    $skipped = 0;
                    foreach ($body['payments'] as $payment) {
                        $existing = get_posts(array(
                            'post_type' => 'bsa_payment',
                            'meta_query' => array(
                                array('key' => 'bsa_app_import_id', 'value' => $payment['id']),
                            ),
                            'posts_per_page' => 1,
                            'fields' => 'ids',
                        ));
                        
                        if (!empty($existing)) {
                            $skipped++;
                            continue;
                        }
                        
                        $title = ($payment['paymentSource'] === 'stripe' ? 'Stripe: ' : 'Mobile: ') . ($payment['customerEmail'] ?: $payment['customerName']) . ' - ' . $payment['planType'];
                        $post_id = wp_insert_post(array(
                            'post_title' => $title,
                            'post_type' => 'bsa_payment',
                            'post_status' => 'publish',
                            'post_date' => $payment['createdAt'] ? date('Y-m-d H:i:s', strtotime($payment['createdAt'])) : current_time('mysql'),
                        ));
                        
                        if ($post_id && !is_wp_error($post_id)) {
                            update_post_meta($post_id, 'bsa_email', $payment['customerEmail'] ?: '');
                            update_post_meta($post_id, 'bsa_name', $payment['customerName'] ?: '');
                            update_post_meta($post_id, 'bsa_phone', $payment['customerPhone'] ?: '');
                            update_post_meta($post_id, 'bsa_course_id', $payment['courseId'] ?: 'all-access');
                            update_post_meta($post_id, 'bsa_course_name', $payment['courseName'] ?: '');
                            update_post_meta($post_id, 'bsa_plan_type', $payment['planType'] ?: 'yearly');
                            update_post_meta($post_id, 'bsa_amount', $payment['amount'] ?: 0);
                            update_post_meta($post_id, 'bsa_payment_status', $payment['status'] ?: 'pending');
                            update_post_meta($post_id, 'bsa_payment_method', ($payment['paymentSource'] === 'stripe') ? 'stripe' : 'mobile_money');
                            update_post_meta($post_id, 'bsa_payment_source', $payment['paymentSource'] ?: 'manual');
                            update_post_meta($post_id, 'bsa_reference_code', $payment['referenceCode'] ?: '');
                            update_post_meta($post_id, 'bsa_receipt_url', $payment['screenshotUrl'] ?: '');
                            update_post_meta($post_id, 'bsa_stripe_session_id', $payment['stripeSessionId'] ?: '');
                            update_post_meta($post_id, 'bsa_app_import_id', $payment['id']);
                            if ($payment['status'] === 'approved') {
                                $approved_date = $payment['reviewedAt'] ? date('Y-m-d H:i:s', strtotime($payment['reviewedAt'])) : ($payment['updatedAt'] ? date('Y-m-d H:i:s', strtotime($payment['updatedAt'])) : current_time('mysql'));
                                update_post_meta($post_id, 'bsa_approved_at', $approved_date);
                            }
                            $imported++;
                        }
                    }
                    $import_result = "Waa la soo import-garay! $imported lacag bixin cusub, $skipped horey loo soo import-garay.";
                    $import_type = 'success';
                }
            }
        }
    }
    ?>
    <style>
        .bsa-dash{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:20px auto;padding:0 15px}
        .bsa-dash *{box-sizing:border-box}
        .bsa-import-card{background:#fff;border-radius:14px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:20px}
        .bsa-import-card h3{font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px}
        .bsa-import-card p{color:#64748b;font-size:14px;margin:0 0 20px}
        .bsa-import-result{padding:14px 18px;border-radius:10px;font-size:14px;margin-top:16px;font-weight:600}
        .bsa-import-success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .bsa-import-error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        .bsa-import-btn{padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;display:inline-flex;align-items:center;gap:8px;transition:all .2s}
        .bsa-import-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.3)}
        .bsa-import-warning{background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;margin-bottom:16px}
    </style>
    <div class="bsa-dash">
        <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 20px">&#128230; Import App Data</h1>
        
        <div class="bsa-import-card">
            <h3>&#128259; App-ka ka soo Import-garee Lacag Bixinaha</h3>
            <p>Dhammaan lacag bixinaha ku jira app-ka (appbarbaarintasan.com) ayaa loo soo import-garayn doonaa WordPress-ka. Kuwa horey loo soo import-garay dib loo soo import-garayn maayo.</p>
            
            <div class="bsa-import-warning">
                &#9888;&#65039; <strong>Ogow:</strong> Tani waxay ka soo qaadaysaa dhammaan payment data-da app-ka. Waxay u baahan tahay in BSA App API Key la habeeyay (Settings &gt; BSA App Integration).
            </div>
            
            <form method="post">
                <?php wp_nonce_field('bsa_import_payments'); ?>
                <button type="submit" name="bsa_import_from_app" class="bsa-import-btn">
                    &#128230; Hadda Import Garee
                </button>
            </form>
            
            <?php if (!empty($import_result)): ?>
                <div class="bsa-import-result bsa-import-<?php echo $import_type; ?>">
                    <?php echo $import_type === 'success' ? '&#9989; ' : '&#10060; '; ?><?php echo esc_html($import_result); ?>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="bsa-import-card">
            <h3>&#128279; API Export Endpoint</h3>
            <p>App-ku wuxuu ka soo export-garaynayaa xogta meeshan:</p>
            <code style="display:block;background:#f1f5f9;padding:12px 16px;border-radius:8px;font-size:14px;color:#1e293b;word-break:break-all">
                GET <?php echo esc_html(BSA_APP_API_URL); ?>/api/wordpress/export-payments
            </code>
            <p style="margin-top:12px;font-size:12px;color:#94a3b8">Header: x-wordpress-api-key: [API Key]</p>
        </div>
    </div>
    <?php
}

// Free access page - grant free course access
function bsa_render_free_access_page() {
    $result_msg = '';
    $result_type = '';
    
    if (isset($_POST['bsa_grant_free']) && check_admin_referer('bsa_grant_free_access')) {
        $email = sanitize_email($_POST['free_email'] ?? '');
        $name = sanitize_text_field($_POST['free_name'] ?? '');
        $phone = sanitize_text_field($_POST['free_phone'] ?? '');
        $course_id = sanitize_text_field($_POST['free_course_id'] ?? 'all-access');
        $plan_type = sanitize_text_field($_POST['free_plan_type'] ?? 'yearly');
        $reason = sanitize_text_field($_POST['free_reason'] ?? '');
        
        if (empty($email) || empty($name)) {
            $result_msg = 'Email iyo magaca waa lagama maarmaan.';
            $result_type = 'error';
        } else {
            $enroll_body = array(
                'email' => $email,
                'name' => $name,
                'phone' => $phone,
                'course_id' => $course_id,
                'plan_type' => $plan_type,
                'amount' => 0,
                'payment_method' => 'free_grant',
                'transaction_id' => 'free_' . time() . '_' . wp_rand(1000, 9999),
            );
            
            $enroll_result = bsa_enroll_user_in_app($enroll_body, 0);
            
            if (!empty($enroll_result['success'])) {
                $payment_id = wp_insert_post(array(
                    'post_type' => 'bsa_payment',
                    'post_title' => $name . ' - Bilaash (' . $email . ')',
                    'post_status' => 'publish',
                    'post_date' => current_time('mysql'),
                ));
                
                if ($payment_id && !is_wp_error($payment_id)) {
                    update_post_meta($payment_id, 'bsa_email', $email);
                    update_post_meta($payment_id, 'bsa_name', $name);
                    update_post_meta($payment_id, 'bsa_phone', $phone);
                    update_post_meta($payment_id, 'bsa_course_id', $course_id);
                    update_post_meta($payment_id, 'bsa_plan_type', $plan_type);
                    update_post_meta($payment_id, 'bsa_amount', 0);
                    update_post_meta($payment_id, 'bsa_payment_status', 'approved');
                    update_post_meta($payment_id, 'bsa_payment_method', 'free_grant');
                    update_post_meta($payment_id, 'bsa_approved_at', current_time('mysql'));
                    update_post_meta($payment_id, 'bsa_notes', 'Bilaash: ' . $reason);
                }
                
                $result_msg = $name . ' (' . $email . ') koorso bilaash ah waa loo siiyay! App-ka waa lagu diiwaan geliyay.';
                $result_type = 'success';
            } else {
                $error_detail = $enroll_result['error'] ?? 'Khalad la aanan aqoon';
                $result_msg = 'App-ka enrollment ma guulaysan: ' . $error_detail;
                $result_type = 'error';
            }
        }
    }
    ?>
    <div class="wrap" style="max-width:700px;">
        <h1 style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <span style="font-size:32px;">&#127873;</span> Bilaash Sii - Koorso Bilaash ku Sii
        </h1>
        
        <?php if (!empty($result_msg)): ?>
            <div style="padding:16px 20px;border-radius:12px;margin-bottom:20px;font-size:15px;<?php echo $result_type === 'success' ? 'background:#dcfce7;color:#166534;border:1px solid #86efac;' : 'background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;'; ?>">
                <?php echo $result_type === 'success' ? '&#9989; ' : '&#10060; '; ?><?php echo esc_html($result_msg); ?>
            </div>
        <?php endif; ?>
        
        <div style="background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);border:1px solid #e5e7eb;">
            <p style="color:#64748b;margin-bottom:20px;font-size:14px;">Qof aad rabto koorso bilaash ku sii. App-ka waa lagu diiwaan gelin doonaa si toos ah.</p>
            
            <form method="post">
                <?php wp_nonce_field('bsa_grant_free_access'); ?>
                
                <table class="form-table" style="margin-top:0;">
                    <tr>
                        <th style="width:140px;padding:12px 10px 12px 0;"><label>Magaca *</label></th>
                        <td style="padding:12px 0;"><input type="text" name="free_name" class="regular-text" placeholder="Magaca buuxa..." required style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;" /></td>
                    </tr>
                    <tr>
                        <th style="padding:12px 10px 12px 0;"><label>Email *</label></th>
                        <td style="padding:12px 0;"><input type="email" name="free_email" class="regular-text" placeholder="email@tusaale.com" required style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;" /></td>
                    </tr>
                    <tr>
                        <th style="padding:12px 10px 12px 0;"><label>Telefoonka</label></th>
                        <td style="padding:12px 0;"><input type="text" name="free_phone" class="regular-text" placeholder="+252..." style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;" /></td>
                    </tr>
                    <tr>
                        <th style="padding:12px 10px 12px 0;"><label>Koorsada</label></th>
                        <td style="padding:12px 0;">
                            <select name="free_course_id" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;background:#fff;">
                                <option value="all-access-id">Dhammaan Koorsoyinka (All Access)</option>
                                <option value="02eec0ad-c335-4756-9b94-861117bfb058">0-6 Bilood Jir</option>
                                <option value="2e91e567-b078-41ac-a113-80ca8a1ac063">6-12 Bilood Jir</option>
                                <option value="0ca74a49-02ce-4d52-8640-1393f0bc876d">1-2 Sano Jir</option>
                                <option value="e0d76c43-476f-40b3-adbc-3b838d0a942c">2-4 Sano Jir</option>
                                <option value="c28483c5-78c5-4c98-b1f3-110d1828a1b4">4-7 Sano Jir</option>
                                <option value="4f0c1de8-058f-4889-8507-bba02baebea4">Koorsada Ilmo Caqli Sare leh</option>
                                <option value="c4ad759d-067d-46ee-8aa2-60d27c0f1491">Koorsada Ilmaha Hadalka ka soo Daaho</option>
                                <option value="fde44d06-e012-4eab-867f-59d52e312453">Koorsada Ilmo Is-Dabira</option>
                                <option value="69955af6-95b5-473e-9153-437024e45c73">Koorsada Badqabka Qoyska iyo Xalinta Khilaafka</option>
                                <option value="103e6526-b2c9-4586-b886-66fe5745541d">Koorsada Aabe Baraarugay</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th style="padding:12px 10px 12px 0;"><label>Nooca</label></th>
                        <td style="padding:12px 0;">
                            <select name="free_plan_type" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;background:#fff;">
                                <option value="yearly">Sanada (1 Sano)</option>
                                <option value="monthly">Bilaha (1 Bil)</option>
                                <option value="onetime">Hal Mar (6 Bilood)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th style="padding:12px 10px 12px 0;"><label>Sababta</label></th>
                        <td style="padding:12px 0;"><input type="text" name="free_reason" class="regular-text" placeholder="Sababta loo siiyay bilaash... (ikhtiyaari)" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;" /></td>
                    </tr>
                </table>
                
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">
                    <button type="submit" name="bsa_grant_free" class="button button-primary" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;padding:12px 32px;font-size:15px;border-radius:10px;cursor:pointer;color:#fff;">
                        &#127873; Bilaash Sii
                    </button>
                </div>
            </form>
        </div>
    </div>
    <?php
}

// Admin actions: Approve/Reject/Delete payment
add_action('admin_post_bsa_approve_payment', 'bsa_approve_payment');
add_action('admin_post_bsa_reject_payment', 'bsa_reject_payment');
add_action('admin_post_bsa_delete_payment', 'bsa_delete_payment');

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

    wp_safe_redirect(admin_url('admin.php?page=bsa-payments-dashboard&tab=payments&bsa_msg=approved'));
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

    wp_safe_redirect(admin_url('admin.php?page=bsa-payments-dashboard&tab=payments&bsa_msg=rejected'));
    exit;
}

function bsa_delete_payment() {
    $payment_id = intval($_GET['payment_id'] ?? 0);
    check_admin_referer('bsa_delete_' . $payment_id);

    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }

    wp_trash_post($payment_id);

    wp_safe_redirect(admin_url('admin.php?page=bsa-payments-dashboard&tab=payments&bsa_msg=deleted'));
    exit;
}

// Admin notices
add_action('admin_notices', 'bsa_payment_admin_notices');

function bsa_payment_admin_notices() {
    if (isset($_GET['bsa_msg'])) {
        if ($_GET['bsa_msg'] === 'approved') {
            echo '<div class="notice notice-success is-dismissible"><p>&#9989; Payment waa la ansixiyay! Enrollment-ka app-ka ayaa loo abuuray.</p></div>';
        } elseif ($_GET['bsa_msg'] === 'rejected') {
            echo '<div class="notice notice-warning is-dismissible"><p>&#10060; Payment waa la diiday.</p></div>';
        } elseif ($_GET['bsa_msg'] === 'deleted') {
            echo '<div class="notice notice-info is-dismissible"><p>&#128465; Payment waa la tirtiray.</p></div>';
        }
    }
}

function bsa_record_purchase_in_app($email, $course_id, $plan_type, $amount, $payment_method, $transaction_id, $name = '') {
    $enroll_body = array(
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
        $enroll_body['name'] = $name;
    }
    return bsa_enroll_user_in_app($enroll_body, 0);
}

function bsa_sync_payment_to_app($email, $course_id, $plan_type, $amount, $payment_method, $transaction_id, $name = '') {
    $api_key = get_option('bsa_api_key', '');
    if (empty($api_key)) {
        error_log('BSA SYNC: No API key configured');
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

    $response = wp_remote_post(BSA_APP_API_URL . '/api/webhook/wordpress-payment', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-wordpress-api-key' => $api_key,
        ),
        'body' => wp_json_encode($body),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        error_log('BSA SYNC ERROR: ' . $response->get_error_message());
    } else {
        error_log('BSA SYNC: HTTP ' . wp_remote_retrieve_response_code($response));
    }
}

// ==================== PAYMENT PAGE SHORTCODE ====================

function bsa_render_payment_page($atts) {
    $mobile_number = get_option('bsa_mobile_money_number', '');
    $mobile_name = get_option('bsa_mobile_money_name', 'Barbaarintasan Academy');
    $payment_status = isset($_GET['bsa_payment']) ? sanitize_text_field($_GET['bsa_payment']) : '';

    $current_user = wp_get_current_user();
    $from_app = isset($_GET['from']) && $_GET['from'] === 'app';
    $url_name = isset($_GET['name']) ? sanitize_text_field($_GET['name']) : '';
    $url_email = isset($_GET['email']) ? sanitize_email($_GET['email']) : '';

    $is_logged_in = false;
    $user_email = '';
    $user_name = '';

    if ($current_user->ID) {
        $is_logged_in = true;
        $user_email = $current_user->user_email;
        $user_name = $current_user->display_name;
    } elseif ($from_app && $url_name && $url_email) {
        $is_logged_in = true;
        $user_email = $url_email;
        $user_name = $url_name;
    }

    ob_start();
    ?>
    <style>
        *{box-sizing:border-box}
        .bsa-page{max-width:720px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;color:#1e293b}

        /* Step indicator */
        .bsa-steps{display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:32px}
        .bsa-step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#94a3b8;transition:color 0.3s}
        .bsa-step.active{color:#6366f1}
        .bsa-step.done{color:#10b981}
        .bsa-step-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:#e2e8f0;color:#64748b;transition:all 0.3s}
        .bsa-step.active .bsa-step-num{background:#6366f1;color:#fff}
        .bsa-step.done .bsa-step-num{background:#10b981;color:#fff}
        .bsa-step-line{width:40px;height:2px;background:#e2e8f0;margin:0 4px}
        .bsa-step-line.done{background:#10b981}

        /* Auth section */
        .bsa-auth-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.06);padding:32px;margin-bottom:24px}
        .bsa-auth-tabs{display:flex;border-bottom:2px solid #e2e8f0;margin-bottom:24px}
        .bsa-auth-tab{flex:1;text-align:center;padding:12px;font-size:15px;font-weight:600;color:#94a3b8;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s}
        .bsa-auth-tab.active{color:#6366f1;border-bottom-color:#6366f1}
        .bsa-auth-tab:hover{color:#6366f1}
        .bsa-auth-panel{display:none}
        .bsa-auth-panel.active{display:block}

        /* Cards & sections */
        .bsa-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.06);padding:28px;margin-bottom:20px}
        .bsa-card-title{font-size:18px;font-weight:700;color:#1e293b;margin:0 0 4px;display:flex;align-items:center;gap:8px}
        .bsa-card-sub{font-size:13px;color:#64748b;margin:0 0 20px}

        /* User info bar */
        .bsa-user-bar{background:linear-gradient(135deg,#f0f9ff,#ede9fe);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:12px;margin-bottom:20px}
        .bsa-user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}
        .bsa-user-info{flex:1;min-width:0}
        .bsa-user-name{font-weight:600;font-size:15px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bsa-user-email{font-size:13px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

        /* Plans */
        .bsa-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .bsa-plan{border:2px solid #e2e8f0;border-radius:14px;padding:20px 12px;text-align:center;cursor:pointer;transition:all 0.25s;position:relative;background:#fff}
        .bsa-plan:hover{border-color:#a5b4fc;background:#faf5ff;transform:translateY(-2px);box-shadow:0 4px 12px rgba(99,102,241,0.1)}
        .bsa-plan.active{border-color:#6366f1;background:#f5f3ff;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
        .bsa-plan-tag{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;white-space:nowrap;letter-spacing:0.3px}
        .bsa-plan-icon{font-size:32px;margin-bottom:6px}
        .bsa-plan-name{font-size:13px;font-weight:600;color:#475569;margin-bottom:4px}
        .bsa-plan-price{font-size:32px;font-weight:800;color:#1e293b;line-height:1.1}
        .bsa-plan-period{font-size:12px;color:#94a3b8;margin-top:2px}
        .bsa-plan-desc{font-size:11px;color:#64748b;margin-top:8px;line-height:1.4}
        .bsa-plan .bsa-check{display:none;position:absolute;top:10px;right:10px;width:22px;height:22px;background:#6366f1;color:#fff;border-radius:50%;font-size:12px;line-height:22px;text-align:center}
        .bsa-plan.active .bsa-check{display:block}

        /* Payment method tabs */
        .bsa-pay-tabs{display:flex;background:#f1f5f9;border-radius:12px;padding:4px;margin-bottom:20px}
        .bsa-pay-tab{flex:1;text-align:center;padding:12px 8px;font-size:14px;font-weight:600;color:#64748b;cursor:pointer;border-radius:10px;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px}
        .bsa-pay-tab:hover{color:#1e293b}
        .bsa-pay-tab.active{background:#fff;color:#1e293b;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
        .bsa-pay-tab-icon{font-size:20px}
        .bsa-pay-panel{display:none}
        .bsa-pay-panel.active{display:block}

        /* Mobile Money info */
        .bsa-mm-box{border-radius:12px;overflow:hidden;margin-bottom:16px}
        .bsa-mm-header{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:14px 18px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}
        .bsa-mm-body{background:#f0fdf4;padding:16px 18px}
        .bsa-mm-item{background:#fff;border-radius:10px;padding:14px;margin-bottom:10px;border:1px solid #d1fae5;display:flex;align-items:center;gap:12px}
        .bsa-mm-item:last-child{margin-bottom:0}
        .bsa-mm-icon{width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .bsa-mm-detail{flex:1}
        .bsa-mm-label{font-size:12px;color:#059669;font-weight:600;margin-bottom:2px}
        .bsa-mm-value{font-size:16px;font-weight:700;color:#1e293b;letter-spacing:0.5px}

        /* Upload area */
        .bsa-upload{border:2px dashed #cbd5e1;border-radius:14px;padding:28px;text-align:center;cursor:pointer;transition:all 0.25s;background:#f8fafc;margin-bottom:16px}
        .bsa-upload:hover{border-color:#6366f1;background:#faf5ff}
        .bsa-upload.has-file{border-color:#10b981;background:#f0fdf4;border-style:solid}
        .bsa-upload-icon{font-size:40px;margin-bottom:8px}
        .bsa-upload-text{font-size:14px;color:#64748b;font-weight:500}
        .bsa-upload-hint{font-size:12px;color:#94a3b8;margin-top:4px}
        .bsa-preview-img{max-width:180px;max-height:140px;border-radius:10px;margin-top:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}

        /* Stripe section */
        .bsa-stripe-box{background:linear-gradient(135deg,#eff6ff,#f5f3ff);border-radius:14px;padding:24px;text-align:center;margin-bottom:16px}
        .bsa-stripe-box p{font-size:14px;color:#475569;margin:0 0 16px}
        .bsa-stripe-logos{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;font-size:13px;color:#64748b;font-weight:500}

        /* Inputs */
        .bsa-input{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;background:#f8fafc;transition:all 0.2s;outline:none}
        .bsa-input:focus{border-color:#6366f1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
        .bsa-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
        .bsa-field{margin-bottom:14px}

        /* Buttons */
        .bsa-btn{display:block;width:100%;padding:14px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s;text-align:center;text-decoration:none!important;color:#fff!important}
        .bsa-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,0.15)}
        .bsa-btn:disabled{opacity:0.55;cursor:not-allowed;transform:none;box-shadow:none}
        .bsa-btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6)}
        .bsa-btn-green{background:linear-gradient(135deg,#10b981,#059669)}
        .bsa-btn-outline{background:transparent!important;color:#6366f1!important;border:2px solid #6366f1}
        .bsa-btn-outline:hover{background:#f5f3ff!important}

        /* Alerts */
        .bsa-error{background:#fef2f2;color:#dc2626;padding:14px 18px;border-radius:12px;font-size:14px;margin-bottom:16px;border-left:4px solid #dc2626;display:flex;align-items:center;gap:8px}
        .bsa-success-page{text-align:center;padding:40px 20px}
        .bsa-success-circle{width:80px;height:80px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 20px;box-shadow:0 8px 24px rgba(16,185,129,0.3)}
        .bsa-success-page h2{font-size:22px;font-weight:700;color:#1e293b;margin:0 0 8px}
        .bsa-success-page p{font-size:15px;color:#64748b;margin:0 0 28px;line-height:1.5}

        .bsa-hidden{display:none}
        .bsa-spinner{display:inline-block;width:18px;height:18px;border:3px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#fff;animation:bsaSpin 0.7s linear infinite;vertical-align:middle;margin-right:6px}
        @keyframes bsaSpin{to{transform:rotate(360deg)}}

        @media(max-width:600px){
            .bsa-page{padding:16px 12px}
            .bsa-plans{grid-template-columns:1fr}
            .bsa-card{padding:20px 16px}
            .bsa-auth-card{padding:24px 16px}
            .bsa-steps{gap:0}
            .bsa-step span{display:none}
            .bsa-step-line{width:24px}
            .bsa-user-bar{flex-direction:column;text-align:center;gap:8px}
        }
    </style>

    <div class="bsa-page">

        <?php if ($payment_status === 'success'): ?>
            <div class="bsa-card">
                <div class="bsa-success-page">
                    <div class="bsa-success-circle">&#10003;</div>
                    <h2>Hambalyo! Lacag bixintaadu waa lagu guuleystay!</h2>
                    <p>Koorsadaada waa laguu furay. Waxaa lagu geynayaa bogga koorsada...</p>
                    <a href="https://appbarbaarintasan.com/courses" class="bsa-btn bsa-btn-green" style="margin-bottom:12px">Bilow Waxbarashada</a>
                    <a href="<?php echo esc_url(home_url('/')); ?>" class="bsa-btn bsa-btn-outline">Ku noqo Bogga Hore</a>
                </div>
            </div>
            <script>setTimeout(function(){ window.location.href = 'https://appbarbaarintasan.com/courses'; }, 3000);</script>

        <?php elseif ($payment_status === 'cancelled'): ?>
            <div class="bsa-error">Lacag bixintii waa la joojiyay. Fadlan isku day mar kale.</div>
            <?php bsa_render_payment_form_v2($is_logged_in, $user_name, $user_email); ?>

        <?php else: ?>
            <?php bsa_render_payment_form_v2($is_logged_in, $user_name, $user_email); ?>
        <?php endif; ?>

    </div>
    <?php
    return ob_get_clean();
}

function bsa_render_payment_form_v2($is_logged_in, $user_name, $user_email) {
    ?>

    <!-- Step indicator -->
    <div class="bsa-steps">
        <div class="bsa-step <?php echo $is_logged_in ? 'done' : 'active'; ?>" id="bsa-step-1">
            <div class="bsa-step-num"><?php echo $is_logged_in ? '&#10003;' : '1'; ?></div>
            <span>Gal</span>
        </div>
        <div class="bsa-step-line <?php echo $is_logged_in ? 'done' : ''; ?>"></div>
        <div class="bsa-step <?php echo $is_logged_in ? 'active' : ''; ?>" id="bsa-step-2">
            <div class="bsa-step-num">2</div>
            <span>Qorshe</span>
        </div>
        <div class="bsa-step-line"></div>
        <div class="bsa-step" id="bsa-step-3">
            <div class="bsa-step-num">3</div>
            <span>Lacag bixi</span>
        </div>
    </div>

    <?php if (!$is_logged_in): ?>
    <!-- AUTH SECTION -->
    <div class="bsa-auth-card" id="bsa-auth-section">
        <div class="bsa-auth-tabs">
            <div class="bsa-auth-tab active" onclick="bsaSwitchAuth('login')">Gal Akoonkaaga</div>
            <div class="bsa-auth-tab" onclick="bsaSwitchAuth('register')">Isdiiwaangeli</div>
        </div>

        <div id="bsa-auth-error" class="bsa-error bsa-hidden"></div>

        <!-- Login panel -->
        <div class="bsa-auth-panel active" id="bsa-auth-login">
            <div class="bsa-field">
                <label class="bsa-label">Email</label>
                <input type="email" id="bsa-login-email" class="bsa-input" placeholder="email@tusaale.com" />
            </div>
            <div class="bsa-field">
                <label class="bsa-label">Password</label>
                <input type="password" id="bsa-login-pass" class="bsa-input" placeholder="Password-kaaga geli" />
            </div>
            <button type="button" class="bsa-btn bsa-btn-primary" id="bsa-login-btn" onclick="bsaDoLogin()" style="margin-top:6px">Gal</button>
        </div>

        <!-- Register panel -->
        <div class="bsa-auth-panel" id="bsa-auth-register">
            <div class="bsa-field">
                <label class="bsa-label">Magacaaga oo buuxa</label>
                <input type="text" id="bsa-reg-name" class="bsa-input" placeholder="Tusaale: Axmed Maxamed" />
            </div>
            <div class="bsa-field">
                <label class="bsa-label">Email</label>
                <input type="email" id="bsa-reg-email" class="bsa-input" placeholder="email@tusaale.com" />
            </div>
            <div class="bsa-field">
                <label class="bsa-label">Password</label>
                <input type="password" id="bsa-reg-pass" class="bsa-input" placeholder="Ugu yaraan 6 xaraf" />
            </div>
            <button type="button" class="bsa-btn bsa-btn-primary" id="bsa-reg-btn" onclick="bsaDoRegister()" style="margin-top:6px">Isdiiwaangeli</button>
        </div>
    </div>
    <?php endif; ?>

    <!-- PAYMENT SECTION -->
    <div id="bsa-payment-area" <?php echo $is_logged_in ? '' : 'style="display:none"'; ?>>

        <!-- User info bar -->
        <div class="bsa-user-bar" id="bsa-user-bar">
            <div class="bsa-user-avatar" id="bsa-avatar"><?php echo $user_name ? mb_strtoupper(mb_substr($user_name, 0, 1)) : '?'; ?></div>
            <div class="bsa-user-info">
                <div class="bsa-user-name" id="bsa-display-name"><?php echo esc_html($user_name); ?></div>
                <div class="bsa-user-email" id="bsa-display-email"><?php echo esc_html($user_email); ?></div>
            </div>
        </div>

        <input type="hidden" id="bsa-name" value="<?php echo esc_attr($user_name); ?>" />
        <input type="hidden" id="bsa-email" value="<?php echo esc_attr($user_email); ?>" />

        <div id="bsa-error-msg" class="bsa-error bsa-hidden"></div>

        <!-- Mobile success -->
        <div id="bsa-mobile-success" class="bsa-hidden">
            <div class="bsa-card">
                <div class="bsa-success-page">
                    <div class="bsa-success-circle" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">&#128233;</div>
                    <h2>Rasiidkaaga waa la helay!</h2>
                    <p>Waxaan ku ogeysiin doonaa email-kaaga marka la ansixiyo. Caadi ahaan 24 saac gudahood.</p>
                    <a href="https://appbarbaarintasan.com/courses" class="bsa-btn bsa-btn-primary" style="margin-bottom:12px">Arag Koorsadaada</a>
                    <a href="<?php echo esc_url(home_url('/')); ?>" class="bsa-btn bsa-btn-outline">Ku noqo Bogga Hore</a>
                </div>
            </div>
        </div>

        <form id="bsa-payment-form" enctype="multipart/form-data">
            <?php wp_nonce_field('bsa_payment_nonce', 'bsa_nonce_field'); ?>

            <!-- STEP 2: Plan selection -->
            <div class="bsa-card" id="bsa-plan-card">
                <div class="bsa-card-title">Dooro Qorshahaaga</div>
                <div class="bsa-card-sub">Dhammaan koorsoyinka waa laguu furaa marka aad lacag bixiso</div>

                <div class="bsa-plans">
                    <div class="bsa-plan" data-plan="monthly" onclick="bsaSelectPlan('monthly')">
                        <div class="bsa-check">&#10003;</div>
                        <div class="bsa-plan-icon">&#128197;</div>
                        <div class="bsa-plan-name">Bishii</div>
                        <div class="bsa-plan-price">$15</div>
                        <div class="bsa-plan-period">bishii</div>
                        <div class="bsa-plan-desc">Bil walba cusboonaysii</div>
                    </div>
                    <div class="bsa-plan" data-plan="yearly" onclick="bsaSelectPlan('yearly')">
                        <div class="bsa-plan-tag">Ugu Fiican!</div>
                        <div class="bsa-check">&#10003;</div>
                        <div class="bsa-plan-icon">&#11088;</div>
                        <div class="bsa-plan-name">Xubin Dahabi</div>
                        <div class="bsa-plan-price">$114</div>
                        <div class="bsa-plan-period">sannadkii</div>
                        <div class="bsa-plan-desc">Badbaadi $66 sannadkii</div>
                    </div>
                    <div class="bsa-plan" data-plan="onetime" onclick="bsaSelectPlan('onetime')">
                        <div class="bsa-check">&#10003;</div>
                        <div class="bsa-plan-icon">&#9889;</div>
                        <div class="bsa-plan-name">Hal Mar</div>
                        <div class="bsa-plan-price">$70</div>
                        <div class="bsa-plan-period">weligaa</div>
                        <div class="bsa-plan-desc">Hal mar bixi, weligaa isticmaal</div>
                    </div>
                </div>
            </div>

            <!-- STEP 3: Payment method -->
            <div class="bsa-card bsa-hidden" id="bsa-method-card">
                <div class="bsa-card-title">Habka Lacag Bixinta</div>
                <div class="bsa-card-sub">Dooro sida aad lacagta u bixin rabto</div>

                <div class="bsa-pay-tabs">
                    <div class="bsa-pay-tab active" onclick="bsaSelectMethod('mobile')" data-method="mobile">
                        <span class="bsa-pay-tab-icon">&#128241;</span> Mobile Money
                    </div>
                    <div class="bsa-pay-tab" onclick="bsaSelectMethod('stripe')" data-method="stripe">
                        <span class="bsa-pay-tab-icon">&#128179;</span> Kaarka Bangigaaga
                    </div>
                </div>

                <!-- Mobile Money Panel -->
                <div class="bsa-pay-panel active" id="bsa-panel-mobile">
                    <div class="bsa-mm-box">
                        <div class="bsa-mm-header">&#128176; Lacagta u dir lambaryadan midkood</div>
                        <div class="bsa-mm-body">
                            <div class="bsa-mm-item">
                                <div class="bsa-mm-icon">&#128241;</div>
                                <div class="bsa-mm-detail">
                                    <div class="bsa-mm-label">EVC Plus</div>
                                    <div class="bsa-mm-value">0907790584</div>
                                    <div style="font-size:12px;color:#475569;margin-top:2px">Musse Said Aw-Musse</div>
                                </div>
                            </div>
                            <div class="bsa-mm-item">
                                <div class="bsa-mm-icon">&#128241;</div>
                                <div class="bsa-mm-detail">
                                    <div class="bsa-mm-label">E-Dahab</div>
                                    <div class="bsa-mm-value">0667790584</div>
                                    <div style="font-size:12px;color:#475569;margin-top:2px">Musse Said Aw-Musse</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p style="font-size:13px;color:#64748b;margin:0 0 14px;line-height:1.5">EVC Plus, Zaad, E-Dahab, Sahal, Taaj, ama Dahabshiil - mid kasta waa la aqbalaa. Marka aad lacagta dirto, sawirka rasiidka halkan soo geli.</p>

                    <div class="bsa-upload" id="bsa-upload-area" onclick="document.getElementById('bsa-receipt-file').click()">
                        <div class="bsa-upload-icon">&#128247;</div>
                        <div class="bsa-upload-text">Riix halkan sawirka rasiidka soo geli</div>
                        <div class="bsa-upload-hint">JPG, PNG ama WebP - ilaa 10MB</div>
                        <div id="bsa-file-name" style="margin-top:8px;font-weight:600;color:#10b981;display:none"></div>
                        <img id="bsa-preview" class="bsa-preview-img" style="display:none" alt="Preview" />
                    </div>
                    <input type="file" id="bsa-receipt-file" accept="image/*" style="display:none" onchange="bsaHandleFile(this)" />

                    <button type="button" id="bsa-mobile-submit" class="bsa-btn bsa-btn-green" onclick="bsaSubmitMobile()" disabled>
                        Rasiidka Dir
                    </button>
                </div>

                <!-- Stripe Panel -->
                <div class="bsa-pay-panel" id="bsa-panel-stripe">
                    <div class="bsa-stripe-box">
                        <div class="bsa-stripe-logos">
                            &#128179; Visa &bull; Mastercard &bull; Stripe
                        </div>
                        <p>Lacag bixintaada waxay ku dhacaysaa Stripe oo ah nidaam aad u ammaan badan.</p>
                        <button type="button" id="bsa-stripe-submit" class="bsa-btn bsa-btn-primary" onclick="bsaSubmitStripe()">
                            Kaarka ku Bixi
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>

    <script>
    var bsaAjaxUrl = '<?php echo esc_js(admin_url('admin-ajax.php')); ?>';
    var bsaSelectedPlan = '';
    var bsaSelectedMethod = 'mobile';
    var bsaSelectedCourse = 'all-access';

    /* Auth tabs */
    function bsaSwitchAuth(tab) {
        document.querySelectorAll('.bsa-auth-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelectorAll('.bsa-auth-panel').forEach(function(p){ p.classList.remove('active'); });
        if (tab === 'login') {
            document.querySelectorAll('.bsa-auth-tab')[0].classList.add('active');
            document.getElementById('bsa-auth-login').classList.add('active');
        } else {
            document.querySelectorAll('.bsa-auth-tab')[1].classList.add('active');
            document.getElementById('bsa-auth-register').classList.add('active');
        }
        document.getElementById('bsa-auth-error').classList.add('bsa-hidden');
    }

    function bsaShowAuthError(msg) {
        var el = document.getElementById('bsa-auth-error');
        el.textContent = msg;
        el.classList.remove('bsa-hidden');
    }

    function bsaDoLogin() {
        var email = document.getElementById('bsa-login-email').value.trim();
        var pass = document.getElementById('bsa-login-pass').value;
        if (!email || !pass) { bsaShowAuthError('Fadlan geli email iyo password.'); return; }

        var btn = document.getElementById('bsa-login-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="bsa-spinner"></span> Waa la galayaa...';

        var fd = new FormData();
        fd.append('log', email);
        fd.append('pwd', pass);
        fd.append('wp-submit', 'Log In');
        fd.append('redirect_to', window.location.href);

        fetch('<?php echo esc_js(wp_login_url()); ?>', { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'manual' })
        .then(function(r) {
            if (r.type === 'opaqueredirect' || r.status === 302 || r.status === 200) {
                window.location.reload();
            } else {
                bsaShowAuthError('Email ama password-ku khalad ayey yihiin.');
                btn.disabled = false;
                btn.textContent = 'Gal';
            }
        })
        .catch(function() {
            window.location.reload();
        });
    }

    function bsaDoRegister() {
        var name = document.getElementById('bsa-reg-name').value.trim();
        var email = document.getElementById('bsa-reg-email').value.trim();
        var pass = document.getElementById('bsa-reg-pass').value;

        if (!name || !email || !pass) { bsaShowAuthError('Fadlan buuxi dhammaan meelaha.'); return; }
        if (pass.length < 6) { bsaShowAuthError('Password-ku waa inuu ugu yaraan 6 xaraf ahaadaa.'); return; }

        var btn = document.getElementById('bsa-reg-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="bsa-spinner"></span> Waa la diiwaangelinayaa...';

        var fd = new FormData();
        fd.append('action', 'bsa_ajax_register');
        fd.append('nonce', '<?php echo wp_create_nonce('bsa_ajax_register_nonce'); ?>');
        fd.append('name', name);
        fd.append('email', email);
        fd.append('password', pass);

        fetch(bsaAjaxUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                window.location.reload();
            } else {
                bsaShowAuthError(data.data.message || 'Khalad ayaa dhacay.');
                btn.disabled = false;
                btn.textContent = 'Isdiiwaangeli';
            }
        })
        .catch(function(err) {
            bsaShowAuthError('Khalad: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Isdiiwaangeli';
        });
    }

    /* Plan selection */
    function bsaSelectPlan(plan) {
        bsaSelectedPlan = plan;
        document.querySelectorAll('.bsa-plan').forEach(function(el) { el.classList.remove('active'); });
        document.querySelector('.bsa-plan[data-plan="' + plan + '"]').classList.add('active');
        document.getElementById('bsa-method-card').classList.remove('bsa-hidden');
        document.getElementById('bsa-method-card').scrollIntoView({behavior:'smooth', block:'start'});

        var s2 = document.getElementById('bsa-step-2');
        s2.classList.remove('active');
        s2.classList.add('done');
        s2.querySelector('.bsa-step-num').innerHTML = '&#10003;';
        document.querySelectorAll('.bsa-step-line')[1].classList.add('done');
        var s3 = document.getElementById('bsa-step-3');
        s3.classList.add('active');
    }

    /* Payment method tabs */
    function bsaSelectMethod(method) {
        bsaSelectedMethod = method;
        document.querySelectorAll('.bsa-pay-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelector('.bsa-pay-tab[data-method="' + method + '"]').classList.add('active');
        document.querySelectorAll('.bsa-pay-panel').forEach(function(p){ p.classList.remove('active'); });
        document.getElementById('bsa-panel-' + method).classList.add('active');
    }

    /* File upload */
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
        el.innerHTML = msg;
        el.classList.remove('bsa-hidden');
        el.scrollIntoView({behavior:'smooth', block:'center'});
    }
    function bsaHideError() { document.getElementById('bsa-error-msg').classList.add('bsa-hidden'); }

    function bsaValidateForm() {
        var name = document.getElementById('bsa-name').value.trim();
        var email = document.getElementById('bsa-email').value.trim();
        if (!name || !email) { bsaShowError('Fadlan geli magacaaga iyo email-kaaga.'); return false; }
        if (!bsaSelectedPlan) { bsaShowError('Fadlan dooro qorshahaaga.'); return false; }
        bsaHideError();
        return true;
    }

    function bsaSubmitMobile() {
        if (!bsaValidateForm()) return;
        var fileInput = document.getElementById('bsa-receipt-file');
        if (!fileInput.files || !fileInput.files[0]) { bsaShowError('Fadlan soo geli sawirka rasiidka.'); return; }

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
        formData.append('phone', '');
        formData.append('receipt', fileInput.files[0]);

        fetch(bsaAjaxUrl, { method: 'POST', body: formData, credentials: 'same-origin' })
        .then(function(r) {
            return r.text();
        })
        .then(function(text) {
            var data;
            try { data = JSON.parse(text); } catch(e) {
                console.error('BSA Server response:', text.substring(0, 500));
                if (text === '0' || text === '-1') {
                    throw new Error('Session-kaagu wuu dhacay. Fadlan page-ka refresh garee (F5) oo mar kale isku day.');
                }
                throw new Error('Server-ku jawaab khaldan ayuu soo celiyay. Fadlan page-ka refresh garee (F5) oo mar kale isku day.');
            }
            if (data.success) {
                document.getElementById('bsa-payment-form').style.display = 'none';
                if (data.data.auto_approved && data.data.redirect) {
                    document.getElementById('bsa-mobile-success').innerHTML = '<div class="bsa-card"><div class="bsa-success-page"><div class="bsa-success-circle" style="background:linear-gradient(135deg,#10b981,#059669)">&#10003;</div><h2>Hambalyo! Rasiidkaagu waa la xaqiijiyay!</h2><p>Koorsadaada waa laguu furay. Waxaa lagu geynayaa bogga koorsada...</p><a href="' + data.data.redirect + '" class="bsa-btn bsa-btn-green">Bilow Waxbarashada</a></div></div>';
                    document.getElementById('bsa-mobile-success').classList.remove('bsa-hidden');
                    setTimeout(function(){ window.location.href = data.data.redirect; }, 3000);
                } else {
                    document.getElementById('bsa-mobile-success').classList.remove('bsa-hidden');
                }
                document.getElementById('bsa-mobile-success').scrollIntoView({behavior:'smooth'});
            } else {
                bsaShowError((data.data && data.data.message) || 'Khalad ayaa dhacay. Fadlan mar kale isku day.');
                btn.disabled = false;
                btn.textContent = 'Rasiidka Dir';
            }
        })
        .catch(function(err) {
            bsaShowError(err.message);
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

        fetch(bsaAjaxUrl, { method: 'POST', body: formData, credentials: 'same-origin' })
        .then(function(r) {
            var contentType = r.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Server-ku jawaab khaldan ayuu soo celiyay. Fadlan page-ka refresh garee oo mar kale isku day.');
            }
            return r.json();
        })
        .then(function(data) {
            if (data.success && data.data.url) {
                window.location.href = data.data.url;
            } else {
                bsaShowError(data.data.message || 'Stripe khalad ayaa dhacay.');
                btn.disabled = false;
                btn.textContent = 'Kaarka ku Bixi';
            }
        })
        .catch(function(err) {
            bsaShowError('Khalad: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Kaarka ku Bixi';
        });
    }
    </script>
    <?php
}
