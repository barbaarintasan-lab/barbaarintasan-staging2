<?php
/**
 * Plugin Name: Barbaarintasan Academy Sync
 * Description: Syncs WooCommerce purchases with Barbaarintasan Academy app
 * Version: 1.0.0
 * Author: Barbaarintasan Academy
 * Text Domain: barbaarintasan-sync
 */

if (!defined('ABSPATH')) {
    exit;
}

class Barbaarintasan_Sync {
    
    private $api_url;
    private $api_key;
    
    public function __construct() {
        $this->api_url = get_option('barbaarintasan_api_url', 'https://appbarbaarintasan.com');
        $this->api_key = get_option('barbaarintasan_api_key', '');
        
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        
        add_action('woocommerce_order_status_processing', array($this, 'sync_order'), 10, 1);
        add_action('woocommerce_order_status_completed', array($this, 'sync_order'), 10, 1);
        
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_product_fields'));
        
        add_action('add_meta_boxes', array($this, 'add_order_meta_box'));
        add_action('wp_ajax_barbaarintasan_resync_order', array($this, 'ajax_resync_order'));
        
        // Redirect to app instead of WooCommerce cart
        add_filter('woocommerce_loop_add_to_cart_link', array($this, 'redirect_to_app_button'), 10, 2);
        add_action('woocommerce_single_product_summary', array($this, 'remove_default_add_to_cart'), 1);
        add_action('woocommerce_single_product_summary', array($this, 'render_single_product_app_button'), 30);
    }
    
    /**
     * Replace "Add to Cart" button with "Buy in App" button on shop/archive pages
     */
    public function redirect_to_app_button($html, $product) {
        $course_slug = get_post_meta($product->get_id(), '_barbaarintasan_course_slug', true);
        
        if (empty($course_slug)) {
            return $html; // Keep original button if no course slug
        }
        
        $app_url = $this->get_app_purchase_url($course_slug, $product);
        
        return sprintf(
            '<a href="%s" target="_blank" rel="noopener" class="button alt barbaarintasan-buy-btn" style="background: linear-gradient(135deg, #0284c7 0%%, #0369a1 100%%); color: white; border: none; border-radius: 12px; padding: 14px 24px; font-weight: 600; display: block; text-align: center;">%s</a>',
            esc_url($app_url),
            esc_html__('Iibso App-ka 📱', 'barbaarintasan-sync')
        );
    }
    
    /**
     * Remove default add to cart on single product pages (for courses only)
     */
    public function remove_default_add_to_cart() {
        global $product;
        
        if (!$product) return;
        
        $course_slug = get_post_meta($product->get_id(), '_barbaarintasan_course_slug', true);
        
        if (empty($course_slug)) return;
        
        // Remove default add to cart button
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30);
    }
    
    /**
     * Render custom app button on single product pages
     */
    public function render_single_product_app_button() {
        global $product;
        
        if (!$product) return;
        
        $course_slug = get_post_meta($product->get_id(), '_barbaarintasan_course_slug', true);
        
        if (empty($course_slug)) return;
        
        $app_url = $this->get_app_purchase_url($course_slug, $product);
        ?>
        <div class="barbaarintasan-app-purchase" style="margin: 20px 0;">
            <a href="<?php echo esc_url($app_url); ?>" target="_blank" rel="noopener" 
               class="button alt" 
               style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; border: none; border-radius: 16px; padding: 18px 32px; font-weight: 700; font-size: 1.2rem; display: inline-block; text-align: center; text-decoration: none; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                📱 Iibso App-ka
            </a>
            <p style="margin-top: 12px; color: #64748b; font-size: 0.9rem;">
                Marka aad riixdo, App-ka Barbaarintasan ayaa furmaya si aad lacag bixinta u dhammaystirto.
            </p>
        </div>
        <?php
    }
    
    /**
     * Generate the app purchase URL with course info
     */
    private function get_app_purchase_url($course_slug, $product) {
        $base_url = get_option('barbaarintasan_api_url', 'https://appbarbaarintasan.com');
        
        // Build URL with course parameter
        $params = array(
            'course' => $course_slug,
            'from' => 'wordpress',
        );
        
        // All courses go to golden membership (iibso) page where parents can purchase
        return $base_url . '/golden-membership?' . http_build_query($params);
    }
    
    public function add_settings_page() {
        add_options_page(
            'Barbaarintasan Sync',
            'Barbaarintasan Sync',
            'manage_options',
            'barbaarintasan-sync',
            array($this, 'settings_page_html')
        );
    }
    
    public function register_settings() {
        register_setting('barbaarintasan_sync', 'barbaarintasan_api_url');
        register_setting('barbaarintasan_sync', 'barbaarintasan_api_key');
    }
    
    public function settings_page_html() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (isset($_GET['settings-updated'])) {
            add_settings_error('barbaarintasan_messages', 'barbaarintasan_message', 'Settings Saved', 'updated');
        }
        
        $courses = $this->get_courses();
        ?>
        <div class="wrap">
            <h1>Barbaarintasan Academy Sync</h1>
            
            <?php settings_errors('barbaarintasan_messages'); ?>
            
            <form method="post" action="options.php">
                <?php settings_fields('barbaarintasan_sync'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">API URL</th>
                        <td>
                            <input type="url" name="barbaarintasan_api_url" 
                                   value="<?php echo esc_attr(get_option('barbaarintasan_api_url', 'https://appbarbaarintasan.com')); ?>" 
                                   class="regular-text" />
                            <p class="description">App URL (https://appbarbaarintasan.com)</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">API Key</th>
                        <td>
                            <input type="password" name="barbaarintasan_api_key" 
                                   value="<?php echo esc_attr(get_option('barbaarintasan_api_key')); ?>" 
                                   class="regular-text" />
                            <p class="description">WORDPRESS_API_KEY from Replit secrets</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <hr />
            
            <h2>Available Courses</h2>
            <?php if (is_array($courses) && isset($courses['error'])): ?>
                <p style="color: red; font-weight: bold;">Error: <?php echo esc_html($courses['error']); ?></p>
                <p>Debug info:</p>
                <ul>
                    <li>API URL: <code><?php echo esc_html(get_option('barbaarintasan_api_url', 'not set')); ?></code></li>
                    <li>API Key set: <?php echo get_option('barbaarintasan_api_key') ? 'Yes (' . strlen(get_option('barbaarintasan_api_key')) . ' chars)' : 'No'; ?></li>
                </ul>
            <?php elseif (is_array($courses) && !empty($courses) && isset($courses[0]['courseId'])): ?>
                <p style="color: green; font-weight: bold;">✓ Connection successful!</p>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Course ID (Slug)</th>
                            <th>Title</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($courses as $course): ?>
                            <tr>
                                <td><code><?php echo esc_html($course['courseId']); ?></code></td>
                                <td><?php echo esc_html($course['title']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p class="description">Use these Course IDs in your WooCommerce products.</p>
            <?php else: ?>
                <p style="color: orange;">No courses found or empty response.</p>
            <?php endif; ?>
            
            <hr />
            
            <h2>How to Use</h2>
            <ol>
                <li>Enter your API URL and API Key above</li>
                <li>Edit each WooCommerce product</li>
                <li>In the "General" tab, set the <strong>Course Slug</strong> and <strong>Plan Type</strong></li>
                <li>When you mark an order as "Processing" or "Completed", it will automatically sync</li>
            </ol>
        </div>
        <?php
    }
    
    public function add_product_fields() {
        echo '<div class="options_group">';
        
        woocommerce_wp_text_input(array(
            'id' => '_barbaarintasan_course_slug',
            'label' => 'Barbaarintasan Course Slug',
            'description' => 'e.g., ilmo-is-dabira, caqli-sare, all-access',
            'desc_tip' => true,
        ));
        
        woocommerce_wp_select(array(
            'id' => '_barbaarintasan_plan_type',
            'label' => 'Barbaarintasan Plan Type',
            'options' => array(
                '' => 'Select plan type',
                'monthly' => 'Monthly (Bil)',
                'yearly' => 'Yearly (Sanadleh)',
                'lifetime' => 'Lifetime (Weligood)',
            ),
        ));
        
        echo '</div>';
    }
    
    public function save_product_fields($post_id) {
        $course_slug = isset($_POST['_barbaarintasan_course_slug']) ? sanitize_text_field($_POST['_barbaarintasan_course_slug']) : '';
        $plan_type = isset($_POST['_barbaarintasan_plan_type']) ? sanitize_text_field($_POST['_barbaarintasan_plan_type']) : '';
        
        update_post_meta($post_id, '_barbaarintasan_course_slug', $course_slug);
        update_post_meta($post_id, '_barbaarintasan_plan_type', $plan_type);
    }
    
    public function sync_order($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            $this->log("Order not found: $order_id");
            return;
        }
        
        $already_synced = $order->get_meta('_barbaarintasan_synced');
        if ($already_synced === 'yes') {
            $this->log("Order $order_id already synced, skipping");
            return;
        }
        
        $email = $order->get_billing_email();
        
        if (empty($email)) {
            $this->log("Order $order_id: No email found");
            return;
        }
        
        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            $course_slug = get_post_meta($product_id, '_barbaarintasan_course_slug', true);
            $plan_type = get_post_meta($product_id, '_barbaarintasan_plan_type', true);
            
            if (empty($course_slug)) {
                $this->log("Order $order_id: Product $product_id has no course slug, skipping");
                continue;
            }
            
            if (empty($plan_type)) {
                $plan_type = 'yearly';
            }
            
            $result = $this->create_enrollment($email, $course_slug, $plan_type, $order);
            
            if ($result['success']) {
                $order->add_order_note(sprintf(
                    'Barbaarintasan: Enrollment created for %s (%s, %s)',
                    $email,
                    $course_slug,
                    $plan_type
                ));
                $order->update_meta_data('_barbaarintasan_synced', 'yes');
                $order->update_meta_data('_barbaarintasan_sync_time', current_time('mysql'));
                $order->save();
            } else {
                $order->add_order_note(sprintf(
                    'Barbaarintasan: Sync failed for %s - %s',
                    $email,
                    $result['error']
                ));
            }
        }
    }
    
    private function create_enrollment($email, $course_slug, $plan_type, $order) {
        $api_url = get_option('barbaarintasan_api_url', 'https://appbarbaarintasan.com');
        $api_key = get_option('barbaarintasan_api_key', '');
        
        if (empty($api_key)) {
            return array('success' => false, 'error' => 'API key not configured');
        }
        
        $user_check = $this->check_user_exists($email);
        if (!$user_check['exists']) {
            return array(
                'success' => false, 
                'error' => 'User not registered in app. They must register first at ' . $api_url . '/register'
            );
        }
        
        $response = wp_remote_post($api_url . '/api/wordpress/purchase', array(
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key' => $api_key,
            ),
            'body' => json_encode(array(
                'email' => strtolower(trim($email)),
                'course_id' => $course_slug,
                'plan_type' => $plan_type,
                'amount' => $order->get_total(),
                'currency' => $order->get_currency(),
                'payment_method' => $order->get_payment_method_title(),
                'transaction_id' => $order->get_id(),
            )),
        ));
        
        if (is_wp_error($response)) {
            $this->log("API Error: " . $response->get_error_message());
            return array('success' => false, 'error' => $response->get_error_message());
        }
        
        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        $this->log("API Response ($code): " . wp_remote_retrieve_body($response));
        
        if ($code >= 200 && $code < 300 && isset($body['success']) && $body['success']) {
            return array('success' => true, 'data' => $body);
        }
        
        return array(
            'success' => false, 
            'error' => isset($body['error']) ? $body['error'] : 'Unknown error (HTTP ' . $code . ')'
        );
    }
    
    private function check_user_exists($email) {
        $api_url = get_option('barbaarintasan_api_url', 'https://appbarbaarintasan.com');
        $api_key = get_option('barbaarintasan_api_key', '');
        
        $response = wp_remote_get($api_url . '/api/wordpress/user-by-email?email=' . urlencode($email), array(
            'timeout' => 15,
            'headers' => array(
                'X-API-Key' => $api_key,
            ),
        ));
        
        if (is_wp_error($response)) {
            return array('exists' => false, 'error' => $response->get_error_message());
        }
        
        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if ($code === 200 && isset($body['user'])) {
            return array('exists' => true, 'user' => $body['user']);
        }
        
        return array('exists' => false);
    }
    
    private function get_courses() {
        $api_url = get_option('barbaarintasan_api_url', 'https://appbarbaarintasan.com');
        $api_key = get_option('barbaarintasan_api_key', '');
        
        if (empty($api_key)) {
            return array('error' => 'API key not set');
        }
        
        $full_url = $api_url . '/api/wordpress/courses';
        
        $response = wp_remote_get($full_url, array(
            'timeout' => 30,
            'sslverify' => true,
            'headers' => array(
                'X-API-Key' => $api_key,
            ),
        ));
        
        if (is_wp_error($response)) {
            $this->log("API Error: " . $response->get_error_message());
            return array('error' => 'Connection failed: ' . $response->get_error_message());
        }
        
        $code = wp_remote_retrieve_response_code($response);
        $body_raw = wp_remote_retrieve_body($response);
        $body = json_decode($body_raw, true);
        
        $this->log("Courses API response (HTTP $code): " . substr($body_raw, 0, 200));
        
        if ($code === 401) {
            return array('error' => 'API Key wrong (401 Unauthorized)');
        }
        
        if ($code !== 200) {
            return array('error' => "HTTP $code: " . (isset($body['error']) ? $body['error'] : 'Unknown error'));
        }
        
        return isset($body['courses']) ? $body['courses'] : array();
    }
    
    public function add_order_meta_box() {
        add_meta_box(
            'barbaarintasan_sync_status',
            'Barbaarintasan Sync',
            array($this, 'order_meta_box_html'),
            'shop_order',
            'side',
            'default'
        );
        
        add_meta_box(
            'barbaarintasan_sync_status',
            'Barbaarintasan Sync',
            array($this, 'order_meta_box_html'),
            'woocommerce_page_wc-orders',
            'side',
            'default'
        );
    }
    
    public function order_meta_box_html($post) {
        $order = wc_get_order($post->ID);
        if (!$order) {
            $order = wc_get_order($post);
        }
        
        if (!$order) {
            echo '<p>Order not found</p>';
            return;
        }
        
        $synced = $order->get_meta('_barbaarintasan_synced');
        $sync_time = $order->get_meta('_barbaarintasan_sync_time');
        
        if ($synced === 'yes') {
            echo '<p style="color: green;"><strong>✓ Synced</strong></p>';
            if ($sync_time) {
                echo '<p>Time: ' . esc_html($sync_time) . '</p>';
            }
        } else {
            echo '<p style="color: orange;"><strong>○ Not synced</strong></p>';
        }
        
        echo '<p>';
        echo '<button type="button" class="button" id="barbaarintasan-resync" data-order-id="' . esc_attr($order->get_id()) . '">';
        echo $synced === 'yes' ? 'Re-sync' : 'Sync Now';
        echo '</button>';
        echo '</p>';
        
        ?>
        <script>
        jQuery(document).ready(function($) {
            $('#barbaarintasan-resync').on('click', function() {
                var btn = $(this);
                var orderId = btn.data('order-id');
                
                btn.prop('disabled', true).text('Syncing...');
                
                $.post(ajaxurl, {
                    action: 'barbaarintasan_resync_order',
                    order_id: orderId,
                    nonce: '<?php echo wp_create_nonce('barbaarintasan_resync'); ?>'
                }, function(response) {
                    if (response.success) {
                        alert('Sync successful!');
                        location.reload();
                    } else {
                        alert('Sync failed: ' + response.data);
                        btn.prop('disabled', false).text('Retry');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    public function ajax_resync_order() {
        if (!wp_verify_nonce($_POST['nonce'], 'barbaarintasan_resync')) {
            wp_send_json_error('Invalid nonce');
        }
        
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Permission denied');
        }
        
        $order_id = intval($_POST['order_id']);
        $order = wc_get_order($order_id);
        
        if (!$order) {
            wp_send_json_error('Order not found');
        }
        
        $order->delete_meta_data('_barbaarintasan_synced');
        $order->save();
        
        $this->sync_order($order_id);
        
        $synced = $order->get_meta('_barbaarintasan_synced');
        
        if ($synced === 'yes') {
            wp_send_json_success('Synced');
        } else {
            wp_send_json_error('Sync failed - check order notes');
        }
    }
    
    private function log($message) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[Barbaarintasan Sync] ' . $message);
        }
        
        if (class_exists('WC_Logger')) {
            $logger = wc_get_logger();
            $logger->info($message, array('source' => 'barbaarintasan-sync'));
        }
    }
}

new Barbaarintasan_Sync();

class Barbaarintasan_Verify_Login {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    public function register_routes() {
        register_rest_route('bsa/v1', '/verify-login', array(
            'methods'  => 'POST',
            'callback' => array($this, 'verify_login'),
            'permission_callback' => array($this, 'check_api_key'),
        ));
    }
    
    public function check_api_key($request) {
        $api_key = $request->get_header('X-API-Key');
        $expected = get_option('barbaarintasan_api_key', '');
        
        if (empty($expected) || empty($api_key)) {
            return false;
        }
        
        return trim($api_key) === trim($expected);
    }
    
    public function verify_login($request) {
        $email = sanitize_email($request->get_param('email'));
        $password = $request->get_param('password');
        
        if (empty($email) || empty($password)) {
            return new WP_REST_Response(array(
                'verified' => false,
                'error' => 'Email and password required'
            ), 400);
        }
        
        $user = get_user_by('email', $email);
        
        if (!$user) {
            return new WP_REST_Response(array(
                'verified' => false,
                'error' => 'User not found'
            ), 200);
        }
        
        $legacy_hash = get_user_meta($user->ID, 'legacy_bcrypt', true);
        $password_valid = false;
        
        if (!empty($legacy_hash) && password_verify($password, $legacy_hash)) {
            $password_valid = true;
            wp_set_password($password, $user->ID);
            delete_user_meta($user->ID, 'legacy_bcrypt');
        }
        
        if (!$password_valid) {
            $password_valid = wp_check_password($password, $user->user_pass, $user->ID);
        }
        
        if ($password_valid) {
            return new WP_REST_Response(array(
                'verified' => true,
                'user' => array(
                    'email' => $user->user_email,
                    'name' => $user->display_name,
                    'phone' => get_user_meta($user->ID, 'billing_phone', true) ?: get_user_meta($user->ID, 'phone', true) ?: '',
                )
            ), 200);
        }
        
        return new WP_REST_Response(array(
            'verified' => false,
            'error' => 'Invalid password'
        ), 200);
    }
}

new Barbaarintasan_Verify_Login();
