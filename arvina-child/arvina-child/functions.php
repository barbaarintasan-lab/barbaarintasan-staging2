<?php
/**
 * Arvina Child Theme - Barbaarintasan Academy
 * Safe child theme with WooCommerce login/registration customization
 */

// Load parent theme styles
function arvina_child_enqueue_styles() {
    wp_enqueue_style('parent-style', get_template_directory_uri() . '/style.css');
}
add_action('wp_enqueue_scripts', 'arvina_child_enqueue_styles');

// ========================================
// Wait for all plugins to load before running our code
// ========================================
add_action('init', 'bsac_init_features', 20);

function bsac_init_features() {
    // Only run WooCommerce features if WooCommerce is active
    if (class_exists('WooCommerce')) {
        bsac_setup_woo_registration();
        bsac_setup_login_menu();
    }

    // Only run Elementor features if Elementor is active
    if (defined('ELEMENTOR_VERSION')) {
        bsac_setup_elementor();
    }

    // Shortcode always available
    bsac_setup_video_shortcode();

    // Video player JS
    add_action('wp_footer', 'bsac_video_player_js_output');
}

// ========================================
// WOOCOMMERCE REGISTRATION & LOGIN
// ========================================
function bsac_setup_woo_registration() {
    // Custom login page assets
    add_action('wp_enqueue_scripts', function() {
        if (!function_exists('is_account_page') || !is_account_page()) return;
        if (is_user_logged_in()) return;
        wp_enqueue_style('bsac-inter-font', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap', array(), null);
        wp_enqueue_style('bsac-registration', false);
        wp_add_inline_style('bsac-registration', bsac_get_registration_css());
    });

    // Override WooCommerce login template
    add_filter('woocommerce_locate_template', function($template, $template_name, $template_path) {
        if ($template_name === 'myaccount/form-login.php' && !is_user_logged_in()) {
            $child = get_stylesheet_directory() . '/woocommerce/myaccount/form-login.php';
            if (file_exists($child)) return $child;
        }
        return $template;
    }, 9999, 3);

    add_filter('wc_get_template', function($template, $template_name, $args, $template_path, $default_path) {
        if ($template_name === 'myaccount/form-login.php' && !is_user_logged_in()) {
            $child = get_stylesheet_directory() . '/woocommerce/myaccount/form-login.php';
            if (file_exists($child)) return $child;
        }
        return $template;
    }, 9999, 5);

    // Save custom registration fields
    add_action('woocommerce_created_customer', function($customer_id, $new_customer_data, $password_generated) {
        if (!empty($_POST['bsa_full_name'])) {
            $name = sanitize_text_field($_POST['bsa_full_name']);
            $parts = explode(' ', $name, 2);
            wp_update_user(array(
                'ID' => $customer_id,
                'first_name' => $parts[0],
                'last_name' => isset($parts[1]) ? $parts[1] : '',
                'display_name' => $name,
            ));
        }
        if (!empty($_POST['bsa_phone'])) {
            update_user_meta($customer_id, 'billing_phone', sanitize_text_field($_POST['bsa_phone']));
            update_user_meta($customer_id, 'phone', sanitize_text_field($_POST['bsa_phone']));
        }
        if (!empty($_POST['bsa_country'])) {
            $country = sanitize_text_field($_POST['bsa_country']);
            update_user_meta($customer_id, 'bsa_country', $country);
            update_user_meta($customer_id, 'billing_country', $country);
        }
        update_user_meta($customer_id, 'bsa_registered_via', 'wordpress_custom_form');
    }, 10, 3);

    // Validate registration
    add_filter('woocommerce_registration_errors', function($errors, $username, $email) {
        if (empty($_POST['bsa_full_name'])) {
            $errors->add('bsa_name_error', '<strong>Khalad:</strong> Magacaaga waa khasab.');
        }
        if (empty($_POST['bsa_phone'])) {
            $errors->add('bsa_phone_error', '<strong>Khalad:</strong> Taleefankaaga waa khasab.');
        }
        if (empty($_POST['bsa_country'])) {
            $errors->add('bsa_country_error', '<strong>Khalad:</strong> Wadanka waa khasab.');
        }
        if (!empty($_POST['bsa_confirm_password']) && $_POST['password'] !== $_POST['bsa_confirm_password']) {
            $errors->add('bsa_password_match', '<strong>Khalad:</strong> Password-yada ma iska mid ahiin.');
        }
        return $errors;
    }, 10, 3);

    // Set display name on registration
    add_filter('woocommerce_new_customer_data', function($data) {
        if (!empty($_POST['bsa_full_name'])) {
            $name = sanitize_text_field($_POST['bsa_full_name']);
            $parts = explode(' ', $name, 2);
            $data['display_name'] = $name;
            $data['first_name'] = $parts[0];
            $data['last_name'] = isset($parts[1]) ? $parts[1] : '';
        }
        return $data;
    }, 10, 1);

    // Registration settings
    add_filter('woocommerce_registration_error_username_required', '__return_false');
    add_filter('pre_option_woocommerce_registration_generate_username', function() { return 'yes'; });
    add_filter('pre_option_woocommerce_registration_generate_password', function() { return 'no'; });

    // Redirect after registration
    add_filter('woocommerce_registration_redirect', function($redirect) {
        return add_query_arg('bsa_registered', '1', wc_get_page_permalink('myaccount'));
    });

    // Show success message
    add_action('woocommerce_before_customer_login_form', function() {
        if (isset($_GET['bsa_registered']) && $_GET['bsa_registered'] === '1' && is_user_logged_in()) {
            echo '<div style="max-width:420px;margin:0 auto 16px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center;font-family:Inter,sans-serif;">';
            echo '<p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">Hambalyo! Akoonkaaga waa la sameeyey.</p>';
            echo '<p style="margin:8px 0 0;color:#166534;font-size:13px;">Hadda waxaad ku geli kartaa app-ka email-kaaga iyo password-kaaga.</p>';
            echo '<a href="https://appbarbaarintasan.com/login" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">App-ka ku Gal</a>';
            echo '</div>';
        }
    });
}

// ========================================
// NAV MENU LOGIN/LOGOUT
// ========================================
function bsac_setup_login_menu() {
    add_filter('wp_nav_menu_items', function($items, $args) {
        if (!function_exists('wc_get_page_permalink')) return $items;

        if (is_user_logged_in()) {
            $current_user = wp_get_current_user();
            $name = esc_html($current_user->display_name ? $current_user->display_name : $current_user->user_email);
            $logout_url = esc_url(wp_logout_url(home_url()));
            $account_url = esc_url(wc_get_page_permalink('myaccount'));

            $items .= '<li class="menu-item bsa-menu-user"><a href="' . $account_url . '" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;text-decoration:none;margin-left:8px;">';
            $items .= $name . '</a></li>';

            $items .= '<li class="menu-item bsa-menu-logout"><a href="' . $logout_url . '" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;font-weight:600;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;text-decoration:none;margin-left:4px;">';
            $items .= 'Ka Bax</a></li>';
        } else {
            $login_url = esc_url(wc_get_page_permalink('myaccount'));
            $items .= '<li class="menu-item bsa-menu-login"><a href="' . $login_url . '" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;font-size:14px;font-weight:700;color:#fff;background:#2563eb;border-radius:10px;text-decoration:none;box-shadow:0 1px 2px rgba(37,99,235,0.3);margin-left:8px;">';
            $items .= 'Soo Gal</a></li>';
        }

        return $items;
    }, 10, 2);
}

// ========================================
// ELEMENTOR WIDGET (only if Elementor active)
// ========================================
function bsac_setup_elementor() {
    add_action('elementor/widgets/register', function($widgets_manager) {
        $file = get_stylesheet_directory() . '/elementor/bsa-video-widget.php';
        if (file_exists($file)) {
            require_once $file;
            if (class_exists('BSA_Video_Widget')) {
                $widgets_manager->register(new BSA_Video_Widget());
            }
        }
    });

    add_action('elementor/elements/categories_registered', function($elements_manager) {
        $elements_manager->add_category('bsa-widgets', [
            'title' => 'BSA Widgets',
            'icon'  => 'fa fa-plug',
        ]);
    });
}

// ========================================
// VIDEO SHORTCODE: [bsa_video url="..." title="..." desc="..." thumbnail="..."]
// ========================================
function bsac_setup_video_shortcode() {
    add_shortcode('bsa_video', function($atts) {
        $atts = shortcode_atts(array(
            'url'       => '',
            'title'     => '',
            'desc'      => '',
            'thumbnail' => '',
        ), $atts);

        if (empty($atts['url'])) return '';

        $embed_url = bsac_get_embed_url($atts['url']);
        $thumb = !empty($atts['thumbnail']) ? $atts['thumbnail'] : bsac_get_video_thumbnail($atts['url']);
        $vid_id = 'bsa-vid-' . wp_rand(1000, 9999);

        ob_start();
        ?>
        <div class="bsa-single-video" id="<?php echo esc_attr($vid_id); ?>" style="max-width:100%;margin:16px 0;font-family:'Inter',-apple-system,sans-serif;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <div class="bsa-vid-thumb" style="position:relative;width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#eff6ff,#dbeafe);cursor:pointer;overflow:hidden;"
                     onclick="bsaPlayVideo('<?php echo esc_attr($vid_id); ?>','<?php echo esc_attr($embed_url); ?>')">
                    <?php if ($thumb) : ?>
                        <img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr($atts['title']); ?>" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                    <?php endif; ?>
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);">
                        <div style="width:64px;height:64px;background:rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                            <svg width="24" height="24" fill="#2563eb" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                    </div>
                </div>
                <?php if (!empty($atts['title'])) : ?>
                <div style="padding:14px 16px;">
                    <h4 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 4px;"><?php echo esc_html($atts['title']); ?></h4>
                    <?php if (!empty($atts['desc'])) : ?>
                        <p style="font-size:13px;color:#6b7280;margin:0;"><?php echo esc_html($atts['desc']); ?></p>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    });
}

// ========================================
// VIDEO HELPERS
// ========================================
function bsac_get_embed_url($url) {
    if (preg_match('/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/', $url, $m)) {
        return 'https://drive.google.com/file/d/' . $m[1] . '/preview';
    }
    if (preg_match('/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/', $url, $m)) {
        return 'https://drive.google.com/file/d/' . $m[1] . '/preview';
    }
    if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/', $url, $m)) {
        return 'https://www.youtube.com/embed/' . $m[1] . '?autoplay=1&rel=0';
    }
    if (preg_match('/vimeo\.com\/(\d+)/', $url, $m)) {
        return 'https://player.vimeo.com/video/' . $m[1] . '?autoplay=1';
    }
    return $url;
}

function bsac_get_video_thumbnail($url) {
    if (preg_match('/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/', $url, $m)) {
        return 'https://drive.google.com/thumbnail?id=' . $m[1] . '&sz=w480';
    }
    if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/', $url, $m)) {
        return 'https://img.youtube.com/vi/' . $m[1] . '/hqdefault.jpg';
    }
    return '';
}

function bsac_video_player_js_output() {
    ?>
    <script>
    function bsaPlayVideo(cardId, embedUrl) {
        var card = document.getElementById(cardId);
        if (!card) return;
        var thumb = card.querySelector('.bsa-vid-thumb');
        if (!thumb) return;
        var wrap = document.createElement('div');
        wrap.className = 'bsa-vid-iframe-wrap';
        wrap.style.cssText = 'position:relative;width:100%;aspect-ratio:16/9;background:#000;';
        wrap.innerHTML = '<iframe src="' + embedUrl + '" style="width:100%;height:100%;border:none;" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe>' +
            '<button onclick="bsaCloseVideo(\'' + cardId + '\')" style="position:absolute;top:8px;right:8px;width:32px;height:32px;background:rgba(0,0,0,0.6);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;">' +
            '<svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        thumb.style.display = 'none';
        thumb.parentNode.insertBefore(wrap, thumb);
    }
    function bsaCloseVideo(cardId) {
        var card = document.getElementById(cardId);
        if (!card) return;
        var wrap = card.querySelector('.bsa-vid-iframe-wrap');
        var thumb = card.querySelector('.bsa-vid-thumb');
        if (wrap) wrap.remove();
        if (thumb) thumb.style.display = '';
    }
    </script>
    <?php
}

// ==================== CSS STYLES ====================
function bsac_get_registration_css() {
    return '
    .woocommerce-account:not(.logged-in) .site-header,
    .woocommerce-account:not(.logged-in) .site-footer,
    .woocommerce-account:not(.logged-in) footer,
    .woocommerce-account:not(.logged-in) .bsa-header,
    .woocommerce-account:not(.logged-in) .bsa-footer,
    .woocommerce-account:not(.logged-in) nav.navbar,
    .woocommerce-account:not(.logged-in) .site-navigation,
    .woocommerce-account:not(.logged-in) .wp-block-header,
    .woocommerce-account:not(.logged-in) .entry-header,
    .woocommerce-account:not(.logged-in) .page-header,
    .woocommerce-account:not(.logged-in) .page-title,
    .woocommerce-account:not(.logged-in) header,
    .woocommerce-account:not(.logged-in) .woocommerce-breadcrumb {
        display: none !important;
    }
    .woocommerce-account:not(.logged-in) {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    .woocommerce-account:not(.logged-in) .site-content,
    .woocommerce-account:not(.logged-in) .entry-content,
    .woocommerce-account:not(.logged-in) .woocommerce,
    .woocommerce-account:not(.logged-in) main,
    .woocommerce-account:not(.logged-in) #primary,
    .woocommerce-account:not(.logged-in) #content,
    .woocommerce-account:not(.logged-in) .content-area {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
    }
    .woocommerce-account:not(.logged-in) .u-columns,
    .woocommerce-account:not(.logged-in) .col-1,
    .woocommerce-account:not(.logged-in) .col-2,
    .woocommerce-account:not(.logged-in) #customer_login {
        display: none !important;
    }
    .bsa-auth-wrapper {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 100vh; background: #ffffff;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 24px 16px; box-sizing: border-box;
    }
    .bsa-auth-container { width: 100%; max-width: 420px; }
    .bsa-auth-logo { display: flex; flex-direction: column; align-items: center; margin-bottom: 32px; }
    .bsa-auth-logo img { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 16px; }
    .bsa-auth-logo h1 { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
    .bsa-auth-logo p { font-size: 14px; color: #6b7280; margin: 0; }
    .bsa-auth-tabs { display: flex; background: #f3f4f6; border-radius: 12px; padding: 4px; margin-bottom: 24px; }
    .bsa-auth-tab { flex: 1; padding: 10px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280; border: none; background: transparent; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
    .bsa-auth-tab.active { background: #ffffff; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .bsa-auth-panel { display: none; }
    .bsa-auth-panel.active { display: block; }
    .bsa-form-group { margin-bottom: 16px; }
    .bsa-form-group label { display: none; }
    .bsa-form-group input[type="text"],
    .bsa-form-group input[type="email"],
    .bsa-form-group input[type="password"],
    .bsa-form-group input[type="tel"],
    .bsa-form-group select {
        width: 100%; height: 48px; padding: 0 16px; font-size: 16px;
        font-family: "Inter", sans-serif; color: #111827; background: #ffffff;
        border: 2px solid #d1d5db; border-radius: 12px; outline: none;
        transition: border-color 0.2s; box-sizing: border-box; -webkit-appearance: none;
    }
    .bsa-form-group input:focus, .bsa-form-group select:focus {
        border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    }
    .bsa-form-group input::placeholder { color: #9ca3af; }
    .bsa-form-group select {
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%236b7280\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11L3 6h10z\'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 16px center; padding-right: 40px;
    }
    .bsa-password-wrapper { position: relative; }
    .bsa-password-wrapper input { padding-right: 48px; }
    .bsa-password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; padding: 4px; display: flex; align-items: center; }
    .bsa-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .bsa-submit-btn { width: 100%; height: 48px; padding: 0 24px; font-size: 16px; font-weight: 700; font-family: "Inter", sans-serif; color: #ffffff; background: #2563eb; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
    .bsa-submit-btn:hover { background: #1d4ed8; }
    .bsa-forgot-link { display: block; text-align: center; font-size: 14px; color: #2563eb; text-decoration: none; margin-top: 16px; font-weight: 500; }
    .bsa-app-link-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
    .bsa-app-link-section p { font-size: 14px; color: #6b7280; margin: 0 0 12px 0; }
    .bsa-app-link-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 48px; font-size: 15px; font-weight: 600; font-family: "Inter", sans-serif; color: #2563eb; background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; text-decoration: none; transition: all 0.2s; cursor: pointer; box-sizing: border-box; }
    .bsa-app-link-btn:hover { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
    .woocommerce-error, .woocommerce-message, .woocommerce-info { max-width: 420px !important; margin: 0 auto 16px auto !important; border-radius: 12px !important; font-family: "Inter", sans-serif !important; font-size: 14px !important; padding: 12px 16px !important; list-style: none !important; }
    .woocommerce-error { background: #fef2f2 !important; border: 1px solid #fecaca !important; color: #dc2626 !important; }
    .bsa-remember-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .bsa-remember-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer; }
    .bsa-remember-row label { font-size: 14px; color: #6b7280; cursor: pointer; display: inline !important; }
    .woocommerce-account:not(.logged-in) .woocommerce-notices-wrapper { max-width: 420px; margin: 0 auto; padding: 0 16px; }
    @media (max-width: 480px) { .bsa-auth-wrapper { padding: 16px; justify-content: flex-start; padding-top: 40px; } .bsa-form-row { grid-template-columns: 1fr; } }
    ';
}
