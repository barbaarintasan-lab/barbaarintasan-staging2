<?php
/**
 * Plugin Name: BSA SSO & Payment Webhook
 * Description: Barbaarintasan Academy - App SSO auto-login, WooCommerce → App enrollment, AI receipt verification
 * Version: 3.0.0
 * Author: Barbaarintasan Academy
 */

if (!defined('ABSPATH')) exit;

define('BSA_APP_URL', 'https://appbarbaarintasan.com');


// ==================== REST API ENDPOINTS ====================

add_action('rest_api_init', function () {
    register_rest_route('bsa/v1', '/sso-login', array(
        'methods'  => 'GET',
        'callback' => 'bsa_sso_login',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('bsa/v1', '/validate-receipt', array(
        'methods'  => 'POST',
        'callback' => 'bsa_validate_receipt',
        'permission_callback' => function() {
            return is_user_logged_in();
        },
    ));

    register_rest_route('bsa/v1', '/sync-user', array(
        'methods'  => 'POST',
        'callback' => 'bsa_sync_user_from_app',
        'permission_callback' => '__return_true',
    ));
});


// ==================== USER SYNC FROM APP ====================

function bsa_sync_user_from_app(WP_REST_Request $request) {
    $api_key = $request->get_header('X-API-Key');
    $saved_key = get_option('bsa_api_key', '');

    if (empty($saved_key) || $api_key !== $saved_key) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Unauthorized'), 403);
    }

    $email = sanitize_email($request->get_param('email'));
    $name = sanitize_text_field($request->get_param('name'));
    $phone = sanitize_text_field($request->get_param('phone'));
    $password_hash = $request->get_param('password_hash');

    if (empty($email)) {
        return new WP_REST_Response(array('success' => false, 'error' => 'Email required'), 400);
    }

    $existing_user = get_user_by('email', $email);
    if ($existing_user) {
        return new WP_REST_Response(array('success' => true, 'action' => 'exists', 'user_id' => $existing_user->ID), 200);
    }

    $username = sanitize_user(strtolower(str_replace(' ', '', $name)) . '_' . wp_rand(100, 999));
    $password = wp_generate_password(24, true, true);
    $user_id = wp_create_user($username, $password, $email);

    if (is_wp_error($user_id)) {
        return new WP_REST_Response(array('success' => false, 'error' => $user_id->get_error_message()), 500);
    }

    update_user_meta($user_id, 'bsa_app_password_hash', $password_hash);

    wp_update_user(array(
        'ID'           => $user_id,
        'display_name' => $name,
        'first_name'   => explode(' ', $name)[0],
        'last_name'    => implode(' ', array_slice(explode(' ', $name), 1)),
    ));

    if (!empty($phone)) {
        update_user_meta($user_id, 'phone', $phone);
    }

    update_user_meta($user_id, 'bsa_synced_from_app', true);

    error_log('[BSA] User created from app: ' . $email . ' (ID: ' . $user_id . ')');

    return new WP_REST_Response(array('success' => true, 'action' => 'created', 'user_id' => $user_id), 200);
}


// ==================== APP PASSWORD AUTHENTICATION ====================

add_filter('authenticate', 'bsa_authenticate_via_app', 30, 3);
function bsa_authenticate_via_app($user, $username, $password) {
    if ($user instanceof WP_User) {
        return $user;
    }

    if (empty($username) || empty($password)) {
        return $user;
    }

    $wp_user = get_user_by('email', $username);
    if (!$wp_user) {
        $wp_user = get_user_by('login', $username);
    }
    if (!$wp_user) {
        return $user;
    }

    if (wp_check_password($password, $wp_user->user_pass, $wp_user->ID)) {
        return $wp_user;
    }

    $response = wp_remote_post(BSA_APP_URL . '/api/wordpress/verify-password', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-API-Key'    => get_option('bsa_api_key', ''),
        ),
        'body'    => wp_json_encode(array(
            'email'    => $wp_user->user_email,
            'password' => $password,
        )),
        'timeout' => 10,
    ));

    if (is_wp_error($response)) {
        return $user;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (!empty($body['verified']) && $body['verified'] === true) {
        wp_set_password($password, $wp_user->ID);
        return $wp_user;
    }

    return $user;
}


// ==================== SSO LOGIN ====================

function bsa_sso_login(WP_REST_Request $request) {
    $token    = sanitize_text_field($request->get_param('token'));
    $redirect = esc_url_raw($request->get_param('redirect'));

    if (empty($token)) {
        wp_die('Token not provided.', 'SSO Error', array('response' => 400));
    }

    if (empty($redirect)) {
        $redirect = home_url('/koorso-iibso/');
    }

    $api_key = get_option('bsa_api_key', '');
    $response = wp_remote_post(BSA_APP_URL . '/api/sso/validate-token', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-API-Key'    => $api_key,
        ),
        'body'    => wp_json_encode(array('token' => $token)),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        error_log('[BSA-SSO] Failed to validate token: ' . $response->get_error_message());
        wp_redirect($redirect);
        exit;
    }

    $status_code = wp_remote_retrieve_response_code($response);
    $body        = json_decode(wp_remote_retrieve_body($response), true);

    if ($status_code !== 200 || empty($body['email'])) {
        error_log('[BSA-SSO] Token validation failed. Status: ' . $status_code);
        wp_redirect($redirect);
        exit;
    }

    $email = sanitize_email($body['email']);
    $name  = sanitize_text_field($body['name']);

    $user = get_user_by('email', $email);

    if (!$user) {
        $username = sanitize_user(strtolower(str_replace(' ', '', $name)) . '_' . wp_rand(100, 999));
        $password = wp_generate_password(24, true, true);
        $user_id = wp_create_user($username, $password, $email);

        if (is_wp_error($user_id)) {
            error_log('[BSA-SSO] Failed to create user: ' . $user_id->get_error_message());
            wp_redirect($redirect);
            exit;
        }

        wp_update_user(array(
            'ID'           => $user_id,
            'display_name' => $name,
            'first_name'   => explode(' ', $name)[0],
            'last_name'    => implode(' ', array_slice(explode(' ', $name), 1)),
        ));

        $user = get_user_by('ID', $user_id);
        error_log('[BSA-SSO] Created new WP user: ' . $email . ' (ID: ' . $user_id . ')');
    }

    wp_clear_auth_cookie();
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    do_action('wp_login', $user->user_login, $user);

    error_log('[BSA-SSO] User logged in: ' . $email);

    wp_redirect($redirect);
    exit;
}


// ==================== WOOCOMMERCE → APP ENROLLMENT ====================

add_action('woocommerce_order_status_completed', 'bsa_woo_enroll_in_app', 10, 1);
add_action('woocommerce_order_status_processing', 'bsa_woo_enroll_in_app', 10, 1);
add_action('woocommerce_payment_complete', 'bsa_woo_enroll_in_app', 10, 1);

function bsa_woo_enroll_in_app($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;

    if ($order->get_meta('_bsa_app_enrolled') === 'yes') return;

    $api_key = get_option('bsa_api_key', '');
    if (empty($api_key)) {
        $order->add_order_note('[BSA] API Key ma jiro. Settings > BSA App Integration ku geli.');
        error_log('[BSA] ERROR: No API key configured');
        return;
    }

    $billing_email = $order->get_billing_email();
    if (empty($billing_email)) return;

    $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
    $customer_phone = $order->get_billing_phone();

    $all_success = true;
    $enrolled_courses = array();

    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        if (!$product) continue;

        $product_id = $item->get_product_id();

        $course_slug = get_post_meta($product_id, '_bsa_course_slug', true);

        if (empty($course_slug)) {
            $course_slug = $product->get_meta('_bsa_course_id');
        }

        if (empty($course_slug)) {
            $sku = strtolower(trim($product->get_sku()));
            if (!empty($sku)) {
                $course_slug = bsa_sku_to_course_slug($sku);
            }
        }

        if (empty($course_slug)) {
            $order->add_order_note('[BSA] Product "' . $product->get_name() . '" - course slug ma jiro, skip.');
            continue;
        }

        $plan_type = get_post_meta($product_id, '_bsa_plan_type', true);

        if (empty($plan_type)) {
            $sku = strtolower(trim($product->get_sku()));
            if (strpos($sku, 'yearly') !== false || strpos($sku, 'sanadlaha') !== false) {
                $plan_type = 'yearly';
            } elseif (strpos($sku, 'monthly') !== false || strpos($sku, 'bilaha') !== false) {
                $plan_type = 'monthly';
            } elseif (strpos($sku, 'onetime') !== false) {
                $plan_type = 'onetime';
            } elseif (strpos($sku, 'lifetime') !== false) {
                $plan_type = 'lifetime';
            } else {
                $plan_type = 'monthly';
            }
        }

        $txn_id = $order->get_transaction_id();
        if (empty($txn_id)) {
            $txn_id = 'woo-' . $order_id;
        }

        $payload = array(
            'email'          => strtolower(trim($billing_email)),
            'name'           => $customer_name,
            'phone'          => $customer_phone,
            'course_id'      => $course_slug,
            'plan_type'      => $plan_type,
            'amount'         => (float) $order->get_total(),
            'currency'       => $order->get_currency(),
            'payment_method' => $order->get_payment_method_title(),
            'transaction_id' => $txn_id,
        );

        error_log('[BSA] Sending enrollment: ' . wp_json_encode($payload));

        $response = wp_remote_post(BSA_APP_URL . '/api/wordpress/purchase', array(
            'body'    => wp_json_encode($payload),
            'headers' => array(
                'Content-Type'        => 'application/json',
                'X-API-Key'           => $api_key,
                'x-wordpress-api-key' => $api_key,
            ),
            'timeout' => 30,
        ));

        if (is_wp_error($response)) {
            $order->add_order_note('[BSA] FAILED (' . $course_slug . '): ' . $response->get_error_message());
            error_log('[BSA] ERROR: ' . $response->get_error_message());
            $all_success = false;
            continue;
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ($code === 200 && is_array($data) && !empty($data['success'])) {
            $enrolled_courses[] = $course_slug . ' (' . $plan_type . ')';
            $order->add_order_note('[BSA] Enrolled: ' . $course_slug . ' (' . $plan_type . ')');
            error_log('[BSA] OK: ' . $billing_email . ' enrolled in ' . $course_slug);
        } else {
            $error_msg = (is_array($data) && isset($data['error'])) ? $data['error'] : 'HTTP ' . $code;
            $order->add_order_note('[BSA] FAILED (' . $course_slug . '): ' . $error_msg);
            error_log('[BSA] FAILED: ' . $error_msg . ' | Body: ' . $body);
            $all_success = false;
        }
    }

    if ($all_success && !empty($enrolled_courses)) {
        $order->update_meta_data('_bsa_app_enrolled', 'yes');
        $order->update_meta_data('_bsa_enrolled_courses', implode(', ', $enrolled_courses));
        $order->save();
    }
}


// ==================== SKU → COURSE SLUG MAPPING ====================

function bsa_sku_to_course_slug($sku) {
    $mapping = array(
        'course-0-6-bilood'     => '0-6-bilood',
        'course-6-12-bilood'    => '6-12-bilood',
        'course-1-2-sano'       => '1-2-sano',
        'course-2-4-sano'       => '2-4-sano',
        'course-4-7-sano'       => '4-7-sano',
        'course-ilmo-is-dabira' => 'ilmo-is-dabira',
        'course-autism'         => 'autism',
        'course-caqli-sare'     => 'caqli-sare',
        'course-aabe'           => 'aabe',
        'course-khilaaf'        => 'khilaaf',
        'course-all-access'     => 'all-access',
        'subscription-monthly'  => 'all-access',
        'subscription-yearly'   => 'all-access',
        '0-6-bilood'            => '0-6-bilood',
        '6-12-bilood'           => '6-12-bilood',
        '1-2-sano'              => '1-2-sano',
        '2-4-sano'              => '2-4-sano',
        '4-7-sano'              => '4-7-sano',
        'ilmo-is-dabira'        => 'ilmo-is-dabira',
        'autism'                => 'autism',
        'caqli-sare'            => 'caqli-sare',
        'aabe'                  => 'aabe',
        'khilaaf'               => 'khilaaf',
        'all-access'            => 'all-access',
    );

    $sku_lower = strtolower(trim($sku));
    if (isset($mapping[$sku_lower])) return $mapping[$sku_lower];
    if (strpos($sku_lower, 'course-') === 0) return substr($sku_lower, 7);
    return $sku_lower;
}


// ==================== PRODUCT META BOX ====================

add_action('add_meta_boxes', function() {
    add_meta_box(
        'bsa_course_settings',
        'BSA - Koorsada iyo Plan',
        'bsa_render_course_meta_box',
        'product',
        'side',
        'high'
    );
});

function bsa_render_course_meta_box($post) {
    $course_slug = get_post_meta($post->ID, '_bsa_course_slug', true);
    if (empty($course_slug)) {
        $course_slug = get_post_meta($post->ID, '_bsa_course_id', true);
    }
    $plan_type = get_post_meta($post->ID, '_bsa_plan_type', true);
    if (empty($plan_type)) $plan_type = 'monthly';

    wp_nonce_field('bsa_course_meta_save', 'bsa_course_meta_nonce');

    $courses = array(
        ''               => '-- Dooro Koorsada --',
        '0-6-bilood'     => '0-6 Bilood Jir',
        '6-12-bilood'    => '6-12 Bilood',
        '1-2-sano'       => '1-2 Sano',
        '2-4-sano'       => '2-4 Sano',
        '4-7-sano'       => '4-7 Sano',
        'ilmo-is-dabira' => 'Ilmo Is-Dabira',
        'autism'         => 'Autism',
        'caqli-sare'     => 'Caqli Sare',
        'aabe'           => 'Aabe',
        'khilaaf'        => 'Khilaaf',
        'all-access'     => 'All Access (Dhammaan)',
    );

    $plans = array(
        'monthly'  => 'Billeh (1 bil)',
        '6month'   => '6 Bilood',
        'yearly'   => 'Sanadleh (12 bilood)',
        'onetime'  => 'Hal mar (6 bilood)',
        'lifetime' => 'Nolol oo dhan',
    );

    echo '<p><label><strong>Course:</strong></label><br>';
    echo '<select name="bsa_course_slug" style="width:100%">';
    foreach ($courses as $slug => $label) {
        $sel = ($course_slug === $slug) ? ' selected' : '';
        echo '<option value="' . esc_attr($slug) . '"' . $sel . '>' . esc_html($label) . '</option>';
    }
    echo '</select></p>';

    echo '<p><label><strong>Plan:</strong></label><br>';
    echo '<select name="bsa_plan_type" style="width:100%">';
    foreach ($plans as $val => $label) {
        $sel = ($plan_type === $val) ? ' selected' : '';
        echo '<option value="' . esc_attr($val) . '"' . $sel . '>' . esc_html($label) . '</option>';
    }
    echo '</select></p>';

    echo '<p style="color:#666;font-size:11px;">Order completed/processing = auto-enroll app-ka.<br>';
    echo 'Koorsada dooro, haddii kale SKU-da ayaa loo isticmaalayaa.</p>';

    if (!empty($course_slug)) {
        echo '<p style="color:green;font-size:11px;">&#10003; Course: <strong>' . esc_html($course_slug) . '</strong></p>';
    }
}

add_action('save_post_product', function($post_id) {
    if (!isset($_POST['bsa_course_meta_nonce']) || !wp_verify_nonce($_POST['bsa_course_meta_nonce'], 'bsa_course_meta_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    if (isset($_POST['bsa_course_slug'])) {
        $slug = sanitize_text_field($_POST['bsa_course_slug']);
        update_post_meta($post_id, '_bsa_course_slug', $slug);
        update_post_meta($post_id, '_bsa_course_id', $slug);
    }
    if (isset($_POST['bsa_plan_type'])) {
        update_post_meta($post_id, '_bsa_plan_type', sanitize_text_field($_POST['bsa_plan_type']));
    }
});


// ==================== ADMIN: Manual Resync ====================

add_action('woocommerce_order_actions', function($actions) {
    $actions['bsa_resync_enrollment'] = 'BSA: Dib u enroll garee App-ka';
    return $actions;
});

add_action('woocommerce_order_action_bsa_resync_enrollment', function($order) {
    $order->delete_meta_data('_bsa_app_enrolled');
    $order->delete_meta_data('_bsa_app_notified');
    $order->save();
    bsa_woo_enroll_in_app($order->get_id());
    $order->add_order_note('[BSA] Admin manual re-sync triggered.');
});


// ==================== AI RECEIPT VERIFICATION ====================

function bsa_validate_receipt(WP_REST_Request $request) {
    $openai_key = get_option('bsa_openai_api_key', '');
    if (empty($openai_key)) {
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'OpenAI API key not configured. Settings > BSA App Integration ka geli.'
        ), 500);
    }

    $image_url  = sanitize_text_field($request->get_param('image_url'));
    $image_data = $request->get_param('image_data');
    $plan_type  = sanitize_text_field($request->get_param('plan_type'));
    $order_id   = absint($request->get_param('order_id'));

    if (empty($image_url) && empty($image_data)) {
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'Sawirka rasiidka ma jiro. Fadlan sawir soo geli.'
        ), 400);
    }

    $image_content = '';

    if (!empty($image_data)) {
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $image_data, $matches)) {
            $image_content = $matches[2];
        } else {
            $image_content = $image_data;
        }
    } elseif (!empty($image_url)) {
        $img_response = wp_remote_get($image_url, array('timeout' => 15));
        if (is_wp_error($img_response)) {
            return new WP_REST_Response(array(
                'valid' => false,
                'error' => 'Sawirka ma la heli karo. Fadlan isku day mar kale.'
            ), 400);
        }
        $image_content = base64_encode(wp_remote_retrieve_body($img_response));
    }

    if (empty($image_content)) {
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'Sawirka wax laga aqrin karo ma jiraan.'
        ), 400);
    }

    $system_prompt = 'You are an EXTREMELY STRICT and SUSPICIOUS receipt fraud detection system for Barbaarintasan Academy (Somali education platform). You MUST assume every image is FAKE until proven otherwise. Your DEFAULT response is REJECTION.

AUTOMATIC REJECTION (is_valid_receipt = false, confidence = 0):
IMMEDIATELY REJECT if ANY of these are true:
1. Image shows a person\'s face, child, baby, selfie, human body, or any non-financial photo
2. Image is a random photo, screenshot of social media, chat, browser, meme, or ANY non-payment content
3. Image does NOT clearly show a GENUINE mobile money app interface or remittance receipt
4. Image has no visible monetary amount with currency symbol ($ or USD)
5. Image has no transaction reference/ticket number (Tix:, Ref:, ID:, RID:)
6. Image looks edited, photoshopped, cropped to hide info, or artificially created/generated
7. Image is blurry, too dark, too small, or key details are unreadable
8. Image shows a PREVIOUS/OLD transaction list or history screen (not a single payment confirmation)
9. Image is a screenshot of another screenshot or photo of a screen showing another photo
10. The transaction status shows "FAILED", "PENDING", "CANCELLED", or anything other than SUCCESS/COMPLETED
11. Image shows an incoming payment (money RECEIVED) instead of outgoing (money SENT)
12. Numbers or text appear inconsistent, misaligned, or show signs of digital editing
13. The app UI colors, fonts, or layout do not match known genuine mobile money apps
14. Reference number format does not match expected patterns for the claimed payment system

VALID RECEIPT REQUIREMENTS (ALL must be TRUE simultaneously):
1. GENUINE mobile money app UI clearly visible: EVC Plus (green, Hormuud), Zaad (blue, Telesom), E-Dahab (Somtel), Sahal OR remittance receipt: Taaj Services, Dahabshiil, Amal, Kaah
2. Transaction type is OUTGOING/SENT payment (NOT incoming/received)
3. Transaction status is SUCCESS or COMPLETED
4. Clear monetary amount: exactly $30, $95, or $114 USD
5. Valid transaction reference number in correct format for the payment system
6. Date of transaction clearly visible (MUST be within last 7 days)
7. Recipient name visible and matches academy owner
8. All UI elements (fonts, colors, layout) consistent with genuine app

RECIPIENT VALIDATION (STRICT):
Payment MUST be sent to:
- Name: "MUSSE SAID AWMUSSE" or close variations (MUSE SAID, MUUSE SICIID, AW-MUSSE)
- Phone: 0907790584 or 907790584
- If recipient does NOT match = recipient_valid = false, reduce confidence by 50

AMOUNT VALIDATION:
- Monthly: exactly $30 (tolerance: $2)
- Yearly: exactly $114 (tolerance: $3) or $85 (early bird)
- One-time: exactly $95 (tolerance: $2)
- Any other amount = REJECT

Respond ONLY in this exact JSON format:
{
  "is_valid_receipt": boolean,
  "is_mobile_money_ui": boolean,
  "is_remittance_receipt": boolean,
  "has_amount": boolean,
  "has_reference": boolean,
  "is_human_photo": boolean,
  "is_outgoing_payment": boolean,
  "transaction_status": "SUCCESS/FAILED/PENDING/UNKNOWN",
  "confidence": number (0-100),
  "detected_amount": "exact amount shown",
  "detected_date": "DD/MM/YYYY format",
  "detected_time": "HH:MM:SS format",
  "reference_number": "exact transaction ID/Tix/RID",
  "recipient_name": "exact name shown on receipt",
  "recipient_valid": boolean,
  "sender_name": "exact name of sender",
  "sender_phone": "digits only",
  "fraud_indicators": ["list any suspicious elements found"],
  "rejection_reason": "detailed reason if invalid",
  "reason_so": "brief reason in Somali"
}';

    $user_message = 'CRITICAL INSTRUCTIONS: You are a FRAUD DETECTOR. Assume this image is FAKE until you can prove otherwise with 100% certainty.

Step 1: Is this even a payment receipt? If NO = is_valid_receipt=false, confidence=0. STOP.
Step 2: Is this a GENUINE mobile money app UI (EVC/Zaad/E-Dahab/Sahal) or remittance receipt (Taaj/Dahabshiil)? Check colors, fonts, layout against known real apps. If it does NOT look exactly like the real app = REJECT.
Step 3: Is this an OUTGOING/SENT payment (not received)? If money was RECEIVED = REJECT.
Step 4: Is the transaction SUCCESS/COMPLETED? If FAILED/PENDING = REJECT.
Step 5: Does the amount match $30, $95, or $114? If NO = REJECT.
Step 6: Is the recipient MUSSE SAID AWMUSSE or phone 0907790584? If NO = recipient_valid=false.
Step 7: Is there a valid reference number? If NO = REJECT.
Step 8: Is the date within the last 7 days? Check carefully.
Step 9: Are there ANY signs of editing, manipulation, or forgery? Check fonts, alignment, colors. If suspicious = REJECT.

Remember: Your DEFAULT answer is REJECT. Only approve if ALL checks pass with zero doubt.';

    $openai_body = array(
        'model' => 'gpt-4o',
        'messages' => array(
            array(
                'role' => 'system',
                'content' => $system_prompt,
            ),
            array(
                'role' => 'user',
                'content' => array(
                    array('type' => 'text', 'text' => $user_message),
                    array('type' => 'image_url', 'image_url' => array(
                        'url' => 'data:image/png;base64,' . $image_content,
                    )),
                ),
            ),
        ),
        'max_tokens' => 400,
        'response_format' => array('type' => 'json_object'),
    );

    $ai_response = wp_remote_post('https://api.openai.com/v1/chat/completions', array(
        'headers' => array(
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $openai_key,
        ),
        'body'    => wp_json_encode($openai_body),
        'timeout' => 30,
    ));

    if (is_wp_error($ai_response)) {
        error_log('[BSA-RECEIPT] OpenAI error: ' . $ai_response->get_error_message());
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'AI-ga ma suurtogelin in uu hubiyo sawirka. Fadlan isku day mar kale.'
        ), 500);
    }

    $ai_status = wp_remote_retrieve_response_code($ai_response);
    $ai_body   = json_decode(wp_remote_retrieve_body($ai_response), true);

    if ($ai_status !== 200) {
        error_log('[BSA-RECEIPT] OpenAI API error: ' . wp_remote_retrieve_body($ai_response));
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'AI-ga jawaab ma bixin. Fadlan isku day mar kale.'
        ), 500);
    }

    $ai_content = $ai_body['choices'][0]['message']['content'] ?? '';
    if (empty($ai_content)) {
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'Ma suurtogelin in la hubiyo sawirka. Fadlan isku day mar kale.'
        ), 500);
    }

    $result = json_decode($ai_content, true);
    if (!is_array($result)) {
        return new WP_REST_Response(array(
            'valid' => false,
            'error' => 'Jawaabta AI-ga waa khalad. Fadlan isku day mar kale.'
        ), 500);
    }

    error_log('[BSA-RECEIPT] AI Result: ' . $ai_content);

    $is_mobile_money = !empty($result['is_mobile_money_ui']) || !empty($result['is_remittance_receipt']);
    $has_amount      = !empty($result['has_amount']);
    $has_reference   = !empty($result['has_reference']);
    $is_human_photo  = !empty($result['is_human_photo']);
    $confidence      = isset($result['confidence']) ? (int) $result['confidence'] : 0;
    $is_outgoing     = !empty($result['is_outgoing_payment']);
    $tx_status       = isset($result['transaction_status']) ? strtoupper($result['transaction_status']) : 'UNKNOWN';
    $fraud_indicators = isset($result['fraud_indicators']) ? $result['fraud_indicators'] : array();

    if ($is_human_photo) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Sawirkaagu ma aha rasiid. Waxaad soo dirtay sawir qof. Fadlan soo dir sawirka rasiidka lacag bixinta.',
            'details' => $result,
        ), 200);
    }

    if (!$is_mobile_money) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Sawirkaagu ma aha rasiid lacag bixin (EVC, Zaad, E-Dahab, Sahal, ama xawilaad sida Taaj/Dahabshiil). Fadlan soo dir screenshot-ka rasiidka.',
            'details' => $result,
        ), 200);
    }

    if (!$is_outgoing) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Sawirkaagu wuxuu muujinayaa lacag la helay (incoming), maaha lacag la diray (outgoing). Fadlan soo dir sawirka lacagta aad DIRTAY.',
            'details' => $result,
        ), 200);
    }

    if ($tx_status !== 'SUCCESS' && $tx_status !== 'COMPLETED') {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Lacag bixintu ma guulaysan (' . $tx_status . '). Fadlan soo dir rasiid lacag bixin guulaysatay.',
            'details' => $result,
        ), 200);
    }

    if (!$has_amount) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Lacagta lama arko sawirka. Fadlan soo dir sawir cad oo lacagta lagu arko.',
            'details' => $result,
        ), 200);
    }

    if (!$has_reference) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Reference number-ka (Tix:) lama arko sawirka. Fadlan soo dir sawir buuxa.',
            'details' => $result,
        ), 200);
    }

    if (!empty($fraud_indicators) && count($fraud_indicators) >= 2) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Sawirkaaga waxaa laga helay calaamado shaki leh. Fadlan soo dir rasiid sax ah ama WhatsApp-ka noo soo dir.',
            'details' => $result,
        ), 200);
    }

    $ref_number = isset($result['reference_number']) ? sanitize_text_field($result['reference_number']) : '';
    if (!empty($ref_number) && strlen($ref_number) >= 5) {
        $existing_orders = wc_get_orders(array(
            'meta_key'   => '_bsa_receipt_reference',
            'meta_value' => $ref_number,
            'limit'      => 1,
        ));
        if (!empty($existing_orders)) {
            return new WP_REST_Response(array(
                'valid'   => false,
                'error'   => 'Reference number-kan (' . $ref_number . ') horay ayaa loo isticmaalay. Rasiid kasta hal mar keliya ayaa la isticmaali karaa.',
                'details' => $result,
            ), 200);
        }
    }

    $is_valid = !empty($result['is_valid_receipt']) && $confidence >= 90;

    if (!$is_valid) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => $result['reason_so'] ?? 'Rasiidka ma ansaxin. Fadlan hubi oo soo dir sawir cusub.',
            'details' => $result,
        ), 200);
    }

    if (isset($result['recipient_valid']) && $result['recipient_valid'] === false) {
        return new WP_REST_Response(array(
            'valid'   => false,
            'error'   => 'Lacagta waxaa loo diray qof kale oo aan ahayn Barbaarintasan Academy. Fadlan u dir lacagta MUSSE SAID AWMUSSE (0907790584).',
            'details' => $result,
        ), 200);
    }

    if (!empty($plan_type) && !empty($result['detected_amount'])) {
        $expected = array('monthly' => 30, 'yearly' => 114, 'onetime' => 95);
        if (isset($expected[$plan_type])) {
            preg_match('/(\d+(?:\.\d+)?)/', $result['detected_amount'], $amt_match);
            if (!empty($amt_match[1])) {
                $detected_dollars = floatval($amt_match[1]);
                $expected_amount  = $expected[$plan_type];
                $tolerance        = 5;
                $is_valid_amount  = abs($detected_dollars - $expected_amount) <= $tolerance;
                if ($plan_type === 'yearly') {
                    $is_valid_amount = $is_valid_amount || abs($detected_dollars - 85) <= $tolerance;
                }
                if (!$is_valid_amount) {
                    return new WP_REST_Response(array(
                        'valid'   => false,
                        'error'   => "Lacagta rasiidka (\${$detected_dollars}) kuma habboona qorshaha aad dooratay (\${$expected_amount}). Fadlan hubi lacagta saxda ah.",
                        'details' => $result,
                    ), 200);
                }
            }
        }
    }

    if (!empty($result['detected_date'])) {
        $date_valid = bsa_check_receipt_date($result['detected_date']);
        if (!$date_valid['valid']) {
            $error_msg = 'Taariikhda rasiidka lama aqrin karo.';
            if (isset($date_valid['is_future']) && $date_valid['is_future']) {
                $error_msg = 'Taariikhda rasiidka waa mid mustaqbalka ah. Fadlan soo dir rasiid sax ah.';
            } elseif (isset($date_valid['days_old']) && $date_valid['days_old'] !== null) {
                $error_msg = "Rasiidkan waa mid qadiim ah ({$date_valid['days_old']} maalmood ka hor). Fadlan soo dir rasiid cusub oo aan ka weynayn 7 maalmood.";
            }
            return new WP_REST_Response(array(
                'valid'   => false,
                'error'   => $error_msg,
                'details' => $result,
            ), 200);
        }
    }

    if ($order_id && function_exists('wc_get_order')) {
        $order = wc_get_order($order_id);
        if ($order) {
            $order->update_meta_data('_bsa_receipt_verified', 'yes');
            $order->update_meta_data('_bsa_receipt_confidence', $confidence);
            $order->update_meta_data('_bsa_receipt_reference', $result['reference_number'] ?? '');
            $order->update_meta_data('_bsa_receipt_amount', $result['detected_amount'] ?? '');
            $order->update_meta_data('_bsa_receipt_date', $result['detected_date'] ?? '');
            $order->update_meta_data('_bsa_receipt_sender', $result['sender_name'] ?? '');
            $order->save();

            $order->add_order_note(sprintf(
                'AI Receipt Verified (%d%% confidence). Ref: %s, Amount: %s, Date: %s, Sender: %s',
                $confidence,
                $result['reference_number'] ?? 'N/A',
                $result['detected_amount'] ?? 'N/A',
                $result['detected_date'] ?? 'N/A',
                $result['sender_name'] ?? 'N/A'
            ));

            if ($confidence >= 95) {
                $order->update_status('completed', 'AI auto-approved receipt (' . $confidence . '% confidence)');
            }
        }
    }

    return new WP_REST_Response(array(
        'valid'         => true,
        'autoApproved'  => $confidence >= 95,
        'confidence'    => $confidence,
        'message'       => $confidence >= 95
            ? 'Rasiidkaaga waa la ansixiyay! Lacag bixintaada waa la xaqiijiyay.'
            : 'Rasiidka waa la hubiyay. Admin-ku wuu xaqiijin doonaa.',
        'details'       => $result,
    ), 200);
}


// ==================== RECEIPT DATE VALIDATION ====================

function bsa_check_receipt_date($date_string) {
    $date_string = trim($date_string);
    $receipt_date = null;

    if (preg_match('/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/', $date_string, $m)) {
        $day   = intval($m[1]);
        $month = intval($m[2]);
        $year  = intval($m[3]);
        if ($day >= 1 && $day <= 31 && $month >= 1 && $month <= 12 && $year >= 2020) {
            $receipt_date = new DateTime();
            $receipt_date->setDate($year, $month, $day);
            $receipt_date->setTime(0, 0, 0);
        }
    }

    if (!$receipt_date && preg_match('/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/', $date_string, $m)) {
        $receipt_date = new DateTime();
        $receipt_date->setDate(intval($m[1]), intval($m[2]), intval($m[3]));
        $receipt_date->setTime(0, 0, 0);
    }

    if (!$receipt_date) {
        $months = array('jan'=>1,'feb'=>2,'mar'=>3,'apr'=>4,'may'=>5,'jun'=>6,'jul'=>7,'aug'=>8,'sep'=>9,'oct'=>10,'nov'=>11,'dec'=>12);
        if (preg_match('/(\d{1,2})[\/\-\.]([a-zA-Z]{3})[\/\-\.](\d{4})/i', $date_string, $m)) {
            $mon = strtolower($m[2]);
            if (isset($months[$mon])) {
                $receipt_date = new DateTime();
                $receipt_date->setDate(intval($m[3]), $months[$mon], intval($m[1]));
                $receipt_date->setTime(0, 0, 0);
            }
        }
    }

    if (!$receipt_date) {
        try {
            $receipt_date = new DateTime($date_string);
            if ($receipt_date->format('Y') < 2020) $receipt_date = null;
        } catch (Exception $e) {
            $receipt_date = null;
        }
    }

    if (!$receipt_date) {
        return array('valid' => false, 'days_old' => null);
    }

    $today = new DateTime();
    $today->setTime(0, 0, 0);
    $diff = $today->diff($receipt_date);
    $days_old = $diff->days;

    if ($receipt_date > $today) {
        return array('valid' => false, 'days_old' => -$days_old, 'is_future' => true);
    }

    return array('valid' => $days_old <= 7, 'days_old' => $days_old);
}


// ==================== ADMIN SETTINGS PAGE ====================

add_action('admin_menu', function () {
    add_options_page(
        'BSA App Integration',
        'BSA App Integration',
        'manage_options',
        'bsa-app-integration',
        'bsa_integration_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('bsa_settings', 'bsa_api_key');
    register_setting('bsa_settings', 'bsa_openai_api_key');
});

function bsa_integration_settings_page() {
    ?>
    <div class="wrap">
        <h1>BSA App Integration Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('bsa_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="bsa_api_key">App API Key</label></th>
                    <td>
                        <input type="text" id="bsa_api_key" name="bsa_api_key"
                               value="<?php echo esc_attr(get_option('bsa_api_key', '')); ?>"
                               class="regular-text" />
                        <p class="description">App-ka iyo WordPress-ka waa inay isku API key isticmaalaan (WORDPRESS_API_KEY).<br>
                        Fly.io: <code>WORDPRESS_API_KEY</code> = isku mid value-ga halkan ku jira.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="bsa_openai_api_key">OpenAI API Key</label></th>
                    <td>
                        <input type="password" id="bsa_openai_api_key" name="bsa_openai_api_key"
                               value="<?php echo esc_attr(get_option('bsa_openai_api_key', '')); ?>"
                               class="regular-text" />
                        <p class="description">OpenAI API key-ga rasiidka AI-ga ugu hubiso (GPT-4o Vision).</p>
                    </td>
                </tr>
            </table>

            <h2>Waxa Plugin-ku Qabtaa</h2>
            <table class="widefat" style="max-width: 700px;">
                <thead>
                    <tr><th>Feature</th><th>Sharaxaad</th></tr>
                </thead>
                <tbody>
                    <tr><td><strong>SSO Login</strong></td><td>App-ka user-ku toos ugu login garayaa WordPress-ka</td></tr>
                    <tr><td><strong>WooCommerce Enrollment</strong></td><td>Order completed/processing = auto-enroll app-ka</td></tr>
                    <tr><td><strong>AI Receipt Verify</strong></td><td>Sawirka rasiidka AI-ga ayuu hubiyaa (EVC, Zaad, Taaj)</td></tr>
                    <tr><td><strong>Password Sync</strong></td><td>App password-ka WordPress-ka ku login garee</td></tr>
                    <tr><td><strong>User Sync</strong></td><td>App-ka user cusub WordPress-ka ku samee</td></tr>
                </tbody>
            </table>

            <h2>API Endpoints</h2>
            <table class="widefat" style="max-width: 700px;">
                <tr><td><strong>SSO Login</strong></td><td><code><?php echo home_url('/wp-json/bsa/v1/sso-login?token=TOKEN'); ?></code></td></tr>
                <tr><td><strong>Receipt Verify</strong></td><td><code><?php echo home_url('/wp-json/bsa/v1/validate-receipt'); ?></code> (POST, login required)</td></tr>
                <tr><td><strong>User Sync</strong></td><td><code><?php echo home_url('/wp-json/bsa/v1/sync-user'); ?></code> (POST, X-API-Key)</td></tr>
            </table>

            <h2>WooCommerce Products Setup</h2>
            <p>Product kasta waxaad ku doorataa koorsada iyo plan-ka <strong>"BSA - Koorsada iyo Plan"</strong> meta box-ka (product edit page, midigta).</p>
            <ul style="list-style: disc; padding-left: 20px;">
                <li><strong>Meta Box</strong>: Course iyo Plan dooro — tani ayaa ugu fiican</li>
                <li><strong>SKU Fallback</strong>: Haddii meta box la isticmaalin, SKU-da ayaa loo isticmaalaa:
                    <ul style="list-style: circle; padding-left: 20px;">
                        <li><code>course-0-6-bilood</code>, <code>course-ilmo-is-dabira</code>, <code>course-autism</code>, iwm.</li>
                        <li><code>subscription-monthly</code> ama <code>subscription-yearly</code> = All Access</li>
                    </ul>
                </li>
            </ul>

            <h2>Sida uu u shaqaynayo (WooCommerce Flow)</h2>
            <ol style="padding-left: 20px;">
                <li>Customer-ku product-ka wuu iibsadaa WordPress-ka</li>
                <li>Order status "completed" ama "processing" markay noqoto...</li>
                <li>Plugin-ku toos u diraa app-ka <code>/api/wordpress/purchase</code></li>
                <li>App-ku user-ka enrollment-kiisa wuu sameeyaa (ama user cusub wuu sameeya)</li>
                <li>Order notes-ka waxaa ku qoran natiijooyinka</li>
            </ol>

            <h2>AI Receipt Verification Flow</h2>
            <ol style="padding-left: 20px;">
                <li>User-ku sawirka rasiidka ayuu soo geliyaa checkout page-ka</li>
                <li>AI-gu (GPT-4o) wuxuu hubiyaa: EVC/Zaad/Taaj, lacagta, reference, recipient</li>
                <li>Haddii confidence 95%+ = toos auto-approve + app-ka enrollment</li>
                <li>Haddii 90-94% = admin-ku wuu xaqiijin doonaa</li>
                <li>Haddii &lt; 90% = reject + Somali error message</li>
            </ol>

            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
