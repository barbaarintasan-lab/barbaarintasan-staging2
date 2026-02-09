<?php
/**
 * Plugin Name: Barbaarintasan Academy Sync v2
 * Description: Waalidka WordPress-ka ka yimid wuxuu toos u tagaa App-ka koorsada
 * Version: 2.1.0
 * Author: Barbaarintasan Academy
 */

if (!defined('ABSPATH')) {
    exit;
}

class Barbaarintasan_Sync_V2 {
    
    private $app_url = 'https://appbarbaarintasan.com';
    
    public function __construct() {
        // Shop page buttons
        add_filter('woocommerce_loop_add_to_cart_link', array($this, 'app_button_archive'), 10, 2);
        
        // Single product page
        add_action('woocommerce_single_product_summary', array($this, 'remove_add_to_cart'), 1);
        add_action('woocommerce_single_product_summary', array($this, 'app_button_single'), 30);
        
        // Admin settings
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Add CSS to fix button visibility
        add_action('wp_head', array($this, 'add_custom_css'));
    }
    
    /**
     * Add CSS to ensure buttons are visible
     */
    public function add_custom_css() {
        ?>
        <style>
            /* PRODUCT CARD - Flexbox layout to push button to bottom */
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
            
            /* BUTTON WRAPPER - Position at bottom */
            .barbaarintasan-btn-wrapper {
                position: absolute !important;
                bottom: 15px !important;
                left: 15px !important;
                right: 15px !important;
                z-index: 9999 !important;
            }
            
            /* BUTTON STYLES */
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
            
            /* Hide default WooCommerce buttons */
            .woocommerce ul.products li.product a.button:not(.barbaarintasan-buy-btn),
            .woocommerce ul.products li.product .button:not(.barbaarintasan-buy-btn),
            .woocommerce ul.products li.product a.add_to_cart_button {
                display: none !important;
            }
            
            /* Ensure title doesn't overlap */
            .woocommerce ul.products li.product .woocommerce-loop-product__title,
            .woocommerce ul.products li.product h2 {
                margin-bottom: 10px !important;
            }
            
            /* Price styling */
            .woocommerce ul.products li.product .price {
                margin-bottom: 15px !important;
            }
        </style>
        <?php
    }
    
    /**
     * SKU to Course Slug mapping
     */
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
    
    /**
     * Check if this is a subscription product
     */
    private function is_subscription($sku) {
        $sku_lower = strtolower(trim($sku));
        return strpos($sku_lower, 'subscription-') === 0 || $sku_lower === 'course-all-access';
    }
    
    /**
     * Get app URL - courses go to course page, subscriptions go to golden-membership
     */
    private function get_app_url($sku) {
        $base = get_option('barbaarintasan_app_url', $this->app_url);
        $course_slug = $this->get_course_slug($sku);
        
        // Subscriptions and all-access go to golden-membership
        if ($this->is_subscription($sku)) {
            return $base . '/golden-membership?from=wordpress';
        }
        
        // Individual courses go to course detail page
        return $base . '/course/' . urlencode($course_slug) . '?from=wordpress';
    }
    
    /**
     * Archive/Shop page button
     */
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
    
    /**
     * Remove default add to cart on single pages
     */
    public function remove_add_to_cart() {
        global $product;
        
        if (!$product) return;
        
        $sku = $product->get_sku();
        if (empty($sku)) return;
        
        remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30);
    }
    
    /**
     * Single product page button
     */
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
    
    /**
     * Admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'Barbaarintasan Sync',
            'Barbaarintasan',
            'manage_options',
            'barbaarintasan-sync',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('barbaarintasan_sync', 'barbaarintasan_app_url');
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>🎓 Barbaarintasan Academy Sync v2.1</h1>
            
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <strong>✓ Plugin waa shaqeynayaa!</strong><br>
                Koorsoyadu waxay u dirayaan waalidka App-ka bogga koorsada.
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
            <p>Laba nooc oo products ah:</p>
            
            <h3>1. Koorsooyin (Individual Courses)</h3>
            <table class="widefat" style="max-width: 600px;">
                <thead>
                    <tr><th>SKU</th><th>Qiimo</th><th>Wuxuu tagaa</th></tr>
                </thead>
                <tbody>
                    <tr><td>course-0-6-bilood</td><td>$0 (free preview)</td><td>/course/0-6-bilood</td></tr>
                    <tr><td>course-6-12-bilood</td><td>$0</td><td>/course/6-12-bilood</td></tr>
                    <tr><td>course-1-2-sano</td><td>$0</td><td>/course/1-2-sano</td></tr>
                    <tr><td>course-2-4-sano</td><td>$0</td><td>/course/2-4-sano</td></tr>
                    <tr><td>course-4-7-sano</td><td>$0</td><td>/course/4-7-sano</td></tr>
                    <tr><td>course-ilmo-is-dabira</td><td>$0</td><td>/course/ilmo-is-dabira</td></tr>
                    <tr><td>course-autism</td><td>$0</td><td>/course/autism</td></tr>
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
        </div>
        <?php
    }
}

new Barbaarintasan_Sync_V2();
