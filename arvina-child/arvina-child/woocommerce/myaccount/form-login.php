<?php
/**
 * BSA Custom Login/Registration Form
 * Overrides: woocommerce/myaccount/form-login.php
 * 
 * Beautiful, app-style login and registration form
 * matching the Barbaarintasan Academy app design.
 */

if (!defined('ABSPATH')) exit;

$app_url = 'https://appbarbaarintasan.com';
$logo_url = get_theme_mod('custom_logo') ? wp_get_attachment_image_url(get_theme_mod('custom_logo'), 'full') : '';
if (empty($logo_url)) {
    $logo_url = get_template_directory_uri() . '/assets/images/logo.png';
}
?>

<?php do_action('woocommerce_before_customer_login_form'); ?>

<div class="bsa-auth-wrapper">
    <div class="bsa-auth-container">
        
        <div class="bsa-auth-logo">
            <?php if ($logo_url): ?>
                <img src="<?php echo esc_url($logo_url); ?>" alt="Barbaarintasan Academy">
            <?php endif; ?>
            <h1 id="bsa-auth-title">Soo Gal</h1>
            <p id="bsa-auth-subtitle">Ku soo dhawoow Barbaarintasan Academy</p>
        </div>

        <div class="bsa-auth-tabs">
            <button type="button" class="bsa-auth-tab active" data-tab="login" onclick="bsaSwitchTab('login')">Soo Gal</button>
            <button type="button" class="bsa-auth-tab" data-tab="register" onclick="bsaSwitchTab('register')">Is Diiwaangeli</button>
        </div>

        <?php wc_print_notices(); ?>

        <!-- LOGIN PANEL -->
        <div class="bsa-auth-panel active" id="bsa-panel-login">
            <form method="post" id="bsa-login-form">
                <?php do_action('woocommerce_login_form_start'); ?>
                
                <div class="bsa-form-group">
                    <input type="email" name="username" id="username" autocomplete="email" placeholder="Email" required />
                </div>
                
                <div class="bsa-form-group">
                    <div class="bsa-password-wrapper">
                        <input type="password" name="password" id="password" autocomplete="current-password" placeholder="Password" required />
                        <button type="button" class="bsa-password-toggle" onclick="bsaTogglePassword('password', this)">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </div>

                <div class="bsa-remember-row">
                    <input type="checkbox" name="rememberme" id="rememberme" value="forever" />
                    <label for="rememberme">Xusuuso</label>
                </div>
                
                <?php wp_nonce_field('woocommerce-login', 'woocommerce-login-nonce'); ?>
                
                <button type="submit" name="login" value="<?php esc_attr_e('Log in', 'woocommerce'); ?>" class="bsa-submit-btn">Soo Gal</button>
                
                <a href="<?php echo esc_url(wp_lostpassword_url()); ?>" class="bsa-forgot-link">Password-ka ma ilowday?</a>

                <?php do_action('woocommerce_login_form_end'); ?>
            </form>

            <div class="bsa-app-link-section">
                <p>Horey app-ka u akoon uga samaystay?</p>
                <a href="<?php echo esc_url($app_url . '/login'); ?>" class="bsa-app-link-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    App-ka ka gal
                </a>
            </div>
        </div>

        <!-- REGISTER PANEL -->
        <div class="bsa-auth-panel" id="bsa-panel-register">
            <form method="post" id="bsa-register-form" <?php do_action('woocommerce_register_form_tag'); ?>>
                <?php do_action('woocommerce_register_form_start'); ?>
                
                <div class="bsa-form-group">
                    <input type="text" name="bsa_full_name" id="bsa_full_name" placeholder="Magacaaga oo dhamaystiran" required />
                </div>

                <div class="bsa-form-group">
                    <input type="email" name="email" id="reg_email" autocomplete="email" placeholder="Email" required />
                </div>

                <div class="bsa-form-group">
                    <input type="tel" name="bsa_phone" id="bsa_phone" placeholder="Taleefankaaga (+252...)" required />
                </div>

                <div class="bsa-form-row">
                    <div class="bsa-form-group">
                        <div class="bsa-password-wrapper">
                            <input type="password" name="password" id="reg_password" autocomplete="new-password" placeholder="Password" required minlength="6" />
                            <button type="button" class="bsa-password-toggle" onclick="bsaTogglePassword('reg_password', this)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="bsa-form-group">
                        <div class="bsa-password-wrapper">
                            <input type="password" name="bsa_confirm_password" id="bsa_confirm_password" autocomplete="new-password" placeholder="Xaqiiji Password" required minlength="6" />
                            <button type="button" class="bsa-password-toggle" onclick="bsaTogglePassword('bsa_confirm_password', this)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bsa-form-group">
                    <select name="bsa_country" id="bsa_country" required>
                        <option value="" disabled selected>Wadanka</option>
                        <option value="Somalia">Soomaaliya</option>
                        <option value="Djibouti">Jabuuti</option>
                        <option value="Ethiopia">Itoobiya</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Eritrea">Eritrea</option>
                        <option value="Sudan">Suudaan</option>
                        <option value="Egypt">Masar</option>
                        <option value="USA">Maraykanka (USA)</option>
                        <option value="Canada">Kanada</option>
                        <option value="UK">Ingiriiska (UK)</option>
                        <option value="Germany">Jarmalka</option>
                        <option value="France">Faransiiska</option>
                        <option value="Italy">Talyaaniga</option>
                        <option value="Spain">Isbaaniya</option>
                        <option value="Netherlands">Holland</option>
                        <option value="Belgium">Beljiyam</option>
                        <option value="Switzerland">Swiiserlaand</option>
                        <option value="Sweden">Iswiidhan</option>
                        <option value="Norway">Noorweey</option>
                        <option value="Denmark">Denmark</option>
                        <option value="Finland">Finland</option>
                        <option value="Austria">Osteeriya</option>
                        <option value="Turkey">Turkiga</option>
                        <option value="Saudi Arabia">Sacuudi Carabiya</option>
                        <option value="UAE">Imaaraadka (UAE)</option>
                        <option value="Qatar">Qadar</option>
                        <option value="Kuwait">Kuwait</option>
                        <option value="Bahrain">Baxrayn</option>
                        <option value="Oman">Cumaan</option>
                        <option value="Yemen">Yaman</option>
                        <option value="Jordan">Urdun</option>
                        <option value="Iraq">Ciraaq</option>
                        <option value="Australia">Awsteeraaliya</option>
                        <option value="New Zealand">Niyuu Siilaan</option>
                        <option value="South Africa">Koonfur Afrika</option>
                        <option value="India">Hindiya</option>
                        <option value="Pakistan">Bakistaan</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="Other">Wadan Kale</option>
                    </select>
                </div>

                <?php wp_nonce_field('woocommerce-register', 'woocommerce-register-nonce'); ?>
                
                <button type="submit" name="register" value="<?php esc_attr_e('Register', 'woocommerce'); ?>" class="bsa-submit-btn">Is Diiwaan Geli</button>

                <?php do_action('woocommerce_register_form_end'); ?>
            </form>

            <div class="bsa-app-link-section">
                <p>Horey app-ka u akoon uga samaystay?</p>
                <a href="<?php echo esc_url($app_url . '/login'); ?>" class="bsa-app-link-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    App-ka ka gal
                </a>
            </div>
        </div>

    </div>
</div>

<script>
function bsaSwitchTab(tab) {
    document.querySelectorAll('.bsa-auth-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.bsa-auth-panel').forEach(function(p) { p.classList.remove('active'); });
    document.querySelector('[data-tab="' + tab + '"]').classList.add('active');
    document.getElementById('bsa-panel-' + tab).classList.add('active');
    
    var title = document.getElementById('bsa-auth-title');
    var subtitle = document.getElementById('bsa-auth-subtitle');
    if (tab === 'login') {
        title.textContent = 'Soo Gal';
        subtitle.textContent = 'Ku soo dhawoow Barbaarintasan Academy';
    } else {
        title.textContent = 'Sameyso Akoon';
        subtitle.textContent = 'Bilow safarka waxbarashada tarbiyadda';
    }
}

function bsaTogglePassword(inputId, btn) {
    var input = document.getElementById(inputId);
    var eyeOpen = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var eyeClosed = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = eyeClosed;
    } else {
        input.type = 'password';
        btn.innerHTML = eyeOpen;
    }
}

// Auto-switch to register tab if URL has #register or if registration error
(function() {
    if (window.location.hash === '#register') {
        bsaSwitchTab('register');
    }
    // If there's a registration error, switch to register tab
    var notices = document.querySelectorAll('.woocommerce-error li');
    notices.forEach(function(notice) {
        if (notice.textContent.indexOf('email') > -1 && notice.textContent.indexOf('account') > -1) {
            bsaSwitchTab('register');
        }
    });
})();

// Confirm password validation
document.getElementById('bsa-register-form').addEventListener('submit', function(e) {
    var pass = document.getElementById('reg_password').value;
    var confirm = document.getElementById('bsa_confirm_password').value;
    if (pass !== confirm) {
        e.preventDefault();
        alert('Password-yada ma iska mid ahiin. Fadlan hubi.');
        return false;
    }
});
</script>

<?php do_action('woocommerce_after_customer_login_form'); ?>
