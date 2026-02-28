<?php
/**
 * Plugin Name: Barbaarintasan Academy Sync
 * Description: Waalidka WordPress-ka ka yimid wuxuu toos u tagaa App-ka koorsada + User sync + Purchase webhook
 * Version: 3.0.0
 * Author: Barbaarintasan Academy
 */

if (!defined('ABSPATH')) {
    exit;
}

define('BSA_SYNC_API_URL', 'https://appbarbaarintasan.com/api/wordpress/purchase');
define('BSA_SYNC_API_KEY', 'f6f7ce5e91c6b9a1');

class Barbaarintasan_Sync {
    
    private $app_url = 'https://appbarbaarintasan.com';
    
    public function __construct() {
        add_filter('woocommerce_loop_add_to_cart_link', array($this, 'app_button_archive'), 10, 2);
        
        add_action('woocommerce_single_product_summary', array($this, 'remove_add_to_cart'), 1);
        add_action('woocommerce_single_product_summary', array($this, 'app_button_single'), 30);
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        add_action('wp_head', array($this, 'add_custom_css'));

        add_action('woocommerce_order_status_completed', array($this, 'sync_order_to_platform'), 10, 1);

        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        add_action('add_meta_boxes', array($this, 'add_product_meta_box'));
        add_action('save_post_product', array($this, 'save_product_meta'));
    }

    // ==================== SHOP BUTTONS ====================
    
    public function add_custom_css() {
        ?>
        <style>
            .woocommerce ul.products li.product,
            ul.products li.product,
            .woocommerce-page ul.products li.product {
                display: flex !important;
                flex-direction: column !important;
                overflow: visible !important;
                position: relative !important;
                z-index: 1 !important;
                padding-bottom: 80px !important;
            }
            
            .barbaarintasan-btn-wrapper {
                position: absolute !important;
                bottom: 15px !important;
                left: 15px !important;
                right: 15px !important;
                z-index: 9999 !important;
            }
            
            .barbaarintasan-buy-btn,
            a.barbaarintasan-buy-btn,
            .woocommerce .barbaarintasan-buy-btn,
            .woocommerce a.barbaarintasan-buy-btn,
            .woocommerce ul.products li.product .barbaarintasan-buy-btn,
            .woocommerce ul.products li.product a.barbaarintasan-buy-btn {
                background: linear-gradient(135deg, #0284c7, #0369a1) !important;
                color: white !important;
                border: none !important;
                border-radius: 12px !important;
                padding: 16px 24px !important;
                font-weight: 700 !important;
                font-size: 15px !important;
                display: block !important;
                text-align: center !important;
                text-decoration: none !important;
                width: 100% !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 9999 !important;
                opacity: 1 !important;
                visibility: visible !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 50px !important;
                line-height: 1.4 !important;
                box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4) !important;
                pointer-events: auto !important;
                cursor: pointer !important;
            }
            
            .barbaarintasan-buy-btn:hover,
            a.barbaarintasan-buy-btn:hover {
                background: linear-gradient(135deg, #0369a1, #075985) !important;
                color: white !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5) !important;
            }
            
            .woocommerce ul.products li.product a.button:not(.barbaarintasan-buy-btn),
            .woocommerce ul.products li.product .button:not(.barbaarintasan-buy-btn),
            .woocommerce ul.products li.product a.add_to_cart_button {
                display: none !important;
            }
            
            .woocommerce ul.products li.product .woocommerce-loop-product__title,
            .woocommerce ul.products li.product h2 {
                margin-bottom: 10px !important;
            }
            
            .woocommerce ul.products li.product .price {
                margin-bottom: 15px !important;
            }
        </style>
        <?php
    }
    
    private function get_course_slug($sku) {
        $mapping = array(
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
        );
        
        $sku_lower = strtolower(trim($sku));
        
        if (isset($mapping[$sku_lower])) {
            return $mapping[$sku_lower];
        }
        
        if (strpos($sku_lower, 'course-') === 0) {
            return substr($sku_lower, 7);
        }
        
        return $sku_lower;
    }
    
    private function is_subscription($sku) {
        $sku_lower = strtolower(trim($sku));
        return strpos($sku_lower, 'subscription-') === 0 || $sku_lower === 'course-all-access';
    }
    
    private function get_app_url($sku) {
        $base = get_option('barbaarintasan_app_url', $this->app_url);
        $course_slug = $this->get_course_slug($sku);
        
        if ($this->is_subscription($sku)) {
            return $base . '/golden-membership?from=wordpress';
        }
        
        return $base . '/course/' . urlencode($course_slug) . '?from=wordpress';
    }
    
    public function app_button_archive($html, $product) {
        $sku = $product->get_sku();
        
        if (empty($sku)) {
            return $html;
        }
        
        $url = $this->get_app_url($sku);
        $is_sub = $this->is_subscription($sku);
        $button_text = $is_sub ? '🏆 Iibso Xubinnimada' : '📱 Eeg Koorsada';
        
        return '<div class="barbaarintasan-btn-wrapper"><a href="' . esc_url($url) . '" target="_blank" rel="noopener" class="button barbaarintasan-buy-btn">' . esc_html($button_text) . '</a></div>';
    }
    
    public function remove_add_to_cart() {
        global $product;
        
        if (!$product) return;
        
        $sku = $product->get_sku();
        if (empty($sku)) return;
        
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30);
    }
    
    public function app_button_single() {
        global $product;
        
        if (!$product) return;
        
        $sku = $product->get_sku();
        if (empty($sku)) return;
        
        $url = $this->get_app_url($sku);
        $is_sub = $this->is_subscription($sku);
        $button_text = $is_sub ? '🏆 Iibso Xubinnimada - Hel Dhammaan Koorsoyada' : '📱 Eeg Koorsada App-ka';
        $sub_text = $is_sub ? '✓ Sanadleh $114 &nbsp; ✓ Billeh $30' : '✓ EVC Plus &nbsp; ✓ SAAD &nbsp; ✓ SAHAL &nbsp; ✓ E-Dahab';
        ?>
        <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 16px; border: 2px solid #0284c7;">
            <a href="<?php echo esc_url($url); ?>" target="_blank" rel="noopener" class="barbaarintasan-buy-btn"
               style="padding: 18px 32px; font-size: 1.1rem; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                <?php echo esc_html($button_text); ?>
            </a>
            <p style="margin: 12px 0 0 0; color: #0369a1; font-size: 0.9rem; text-align: center;">
                <?php echo $sub_text; ?>
            </p>
        </div>
        <?php
    }

    // ==================== WOOCOMMERCE ORDER SYNC ====================
    
    public function sync_order_to_platform($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            $this->log("Order #{$order_id} not found");
            return;
        }

        $billing_email = $order->get_billing_email();
        if (!$billing_email) {
            $this->log("Order #{$order_id}: No billing email");
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
                $sku = $product->get_sku();
                if (!empty($sku)) {
                    $course_slug = $this->get_course_slug($sku);
                }
            }
            if (!$course_slug) {
                $this->log("Order #{$order_id}: Product #{$product_id} has no course slug, skipping");
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
                $this->log("Order #{$order_id}: API error for {$course_slug} - " . $response->get_error_message());
                $order->add_order_note("BSA Sync failed for {$course_slug}: " . $response->get_error_message());
            } else {
                $code = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);

                if ($code === 200 && !empty($data['success'])) {
                    $order->add_order_note("BSA Sync OK: {$course_slug} enrolled (plan: {$plan_type})");
                    $this->log("Order #{$order_id}: Enrolled {$billing_email} in {$course_slug}");
                } else {
                    $err = $data['error'] ?? $data['message'] ?? "HTTP {$code}";
                    $order->add_order_note("BSA Sync failed for {$course_slug}: {$err}");
                    $this->log("Order #{$order_id}: Failed {$course_slug} - {$err}");
                }
            }
        }
    }

    // ==================== REST API ENDPOINTS ====================
    
    public function register_rest_routes() {
        register_rest_route('bsa/v1', '/reset-password', [
            'methods'  => 'POST',
            'callback' => array($this, 'handle_password_reset'),
            'permission_callback' => array($this, 'verify_api_key'),
        ]);

        register_rest_route('bsa/v1', '/sync-user', [
            'methods'  => 'POST',
            'callback' => array($this, 'handle_sync_user'),
            'permission_callback' => array($this, 'verify_api_key'),
        ]);
    }

    public function verify_api_key($request) {
        $api_key = $request->get_header('X-API-Key');
        if (!$api_key || $api_key !== BSA_SYNC_API_KEY) {
            return new WP_Error('unauthorized', 'Invalid API key', ['status' => 401]);
        }
        return true;
    }

    public function handle_password_reset($request) {
        $email = sanitize_email($request->get_param('email'));
        $password_hash = $request->get_param('password_hash');
        if ($password_hash) {
            $password_hash = preg_replace('/^\$2b\$/', '$2y$', $password_hash);
        }

        if (!$email || !$password_hash) {
            return new WP_REST_Response(['success' => false, 'error' => 'Email and password_hash required'], 400);
        }

        $user = get_user_by('email', $email);
        if (!$user) {
            $this->log("Password reset: user not found for {$email}");
            return new WP_REST_Response(['success' => false, 'error' => 'User not found', 'action' => 'not_found'], 404);
        }

        global $wpdb;
        $wpdb->update(
            $wpdb->users,
            ['user_pass' => $password_hash],
            ['ID' => $user->ID]
        );

        clean_user_cache($user->ID);

        $this->log("Password reset synced for {$email} (user #{$user->ID})");

        return new WP_REST_Response([
            'success' => true,
            'action'  => 'password_updated',
            'user_id' => $user->ID,
        ]);
    }

    public function handle_sync_user($request) {
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

            $this->log("Sync user: updated existing user {$email} (#{$existing_user->ID})");
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
            $this->log("Sync user: failed to create user {$email} - " . $user_id->get_error_message());
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

        $this->log("Sync user: created new user {$email} (#{$user_id})");
        return new WP_REST_Response(['success' => true, 'action' => 'created', 'user_id' => $user_id]);
    }

    // ==================== PRODUCT META BOX ====================

    public function add_product_meta_box() {
        add_meta_box(
            'bsa_course_settings',
            'Barbaarintasan Academy',
            array($this, 'render_product_meta_box'),
            'product',
            'side',
            'default'
        );
    }

    public function render_product_meta_box($post) {
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

    public function save_product_meta($post_id) {
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

    // ==================== ADMIN SETTINGS ====================

    public function add_admin_menu() {
        add_options_page(
            'Barbaarintasan Sync',
            'Barbaarintasan',
            'manage_options',
            'barbaarintasan-sync',
            array($this, 'settings_page')
        );
    }

    public function register_settings() {
        register_setting('barbaarintasan_sync', 'barbaarintasan_app_url');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Barbaarintasan Academy Sync v3.0</h1>
            
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <strong>Plugin waa shaqeynayaa!</strong><br>
                Koorsoyadu waxay u dirayaan waalidka App-ka bogga koorsada.<br>
                User sync + Purchase webhook waa active.
            </div>
            
            <form method="post" action="options.php">
                <?php settings_fields('barbaarintasan_sync'); ?>
                
                <table class="form-table">
                    <tr>
                        <th>App URL</th>
                        <td>
                            <input type="url" name="barbaarintasan_app_url" 
                                   value="<?php echo esc_attr(get_option('barbaarintasan_app_url', 'https://appbarbaarintasan.com')); ?>" 
                                   class="regular-text" />
                        </td>
                    </tr>
                </table>
                
                <?php submit_button('Save'); ?>
            </form>
            
            <hr>
            
            <h2>Products Setup</h2>
            
            <h3>1. Koorsooyin (Individual Courses)</h3>
            <table class="widefat" style="max-width: 600px;">
                <thead>
                    <tr><th>SKU</th><th>Qiimo</th><th>Wuxuu tagaa</th></tr>
                </thead>
                <tbody>
                    <tr><td>course-0-6-bilood</td><td>$0</td><td>/course/0-6-bilood</td></tr>
                    <tr><td>course-6-12-bilood</td><td>$0</td><td>/course/6-12-bilood</td></tr>
                    <tr><td>course-1-2-sano</td><td>$0</td><td>/course/1-2-sano</td></tr>
                    <tr><td>course-2-4-sano</td><td>$0</td><td>/course/2-4-sano</td></tr>
                    <tr><td>course-4-7-sano</td><td>$0</td><td>/course/4-7-sano</td></tr>
                    <tr><td>course-ilmo-is-dabira</td><td>$0</td><td>/course/ilmo-is-dabira</td></tr>
                    <tr><td>course-caqli-sare</td><td>$0</td><td>/course/caqli-sare</td></tr>
                    <tr><td>course-aabe</td><td>$0</td><td>/course/aabe</td></tr>
                    <tr><td>course-khilaaf</td><td>$0</td><td>/course/khilaaf</td></tr>
                </tbody>
            </table>
            
            <h3 style="margin-top: 20px;">2. Subscriptions</h3>
            <table class="widefat" style="max-width: 600px;">
                <thead>
                    <tr><th>SKU</th><th>Qiimo</th><th>Wuxuu tagaa</th></tr>
                </thead>
                <tbody>
                    <tr style="background: #fef3c7;"><td>subscription-yearly</td><td><strong>$114</strong></td><td>/golden-membership</td></tr>
                    <tr style="background: #fef3c7;"><td>subscription-monthly</td><td><strong>$30</strong></td><td>/golden-membership</td></tr>
                    <tr style="background: #fef3c7;"><td>course-all-access</td><td><strong>$114</strong></td><td>/golden-membership</td></tr>
                </tbody>
            </table>

            <hr>
            <h2>API Endpoints (App-ka)</h2>
            <table class="widefat" style="max-width: 700px;">
                <thead><tr><th>Endpoint</th><th>Waxay qabtaa</th></tr></thead>
                <tbody>
                    <tr><td><code>/wp-json/bsa/v1/sync-user</code></td><td>App-ka user cusub uu WordPress-ka u diro</td></tr>
                    <tr><td><code>/wp-json/bsa/v1/reset-password</code></td><td>Password reset sync</td></tr>
                    <tr><td><code>woocommerce_order_status_completed</code></td><td>Order dhamaatay → App-ka enrollment u dir</td></tr>
                </tbody>
            </table>
        </div>
        <?php
    }

    private function log($message) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[BSA Sync] ' . $message);
        }
    }
}

new Barbaarintasan_Sync();
