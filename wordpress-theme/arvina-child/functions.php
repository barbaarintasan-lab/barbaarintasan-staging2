<?php
// Load parent theme styles
function arvina_child_enqueue_styles() {
    wp_enqueue_style('parent-style', get_template_directory_uri() . '/style.css');
}
add_action('wp_enqueue_scripts', 'arvina_child_enqueue_styles');

// ========================================
// BARBAARINTASAN APP INTEGRATION
// ========================================

// BSA Admin Menu
function bsa_admin_menu() {
    add_menu_page(
        'BSA Activation',
        'BSA Activation',
        'manage_options',
        'bsa-activation',
        'bsa_activation_page',
        'dashicons-unlock',
        30
    );
}
add_action('admin_menu', 'bsa_admin_menu');

// BSA Activation Page
function bsa_activation_page() {
    $api_url = 'https://appbarbaarintasan.com';
    $api_key = defined('WORDPRESS_API_KEY') ? WORDPRESS_API_KEY : '';
    ?>
    <div class="wrap">
        <h1>BSA Course Activation</h1>
        
        <div id="bsa-message" style="display:none; padding: 10px; margin: 10px 0; border-radius: 4px;"></div>
        
        <table class="form-table">
            <tr>
                <th>Email</th>
                <td>
                    <input type="email" id="bsa-email" class="regular-text" placeholder="macmiil@email.com">
                    <button type="button" id="bsa-lookup" class="button">Raadi</button>
                    <span id="bsa-lookup-status"></span>
                </td>
            </tr>
            <tr id="bsa-user-row" style="display:none;">
                <th>User</th>
                <td id="bsa-user-info"></td>
            </tr>
            <tr>
                <th>Course</th>
                <td>
                    <select id="bsa-course">
                        <option value="all-access">All-Access Subscription</option>
                        <option value="0-6">Carruurta 0-6 Jir</option>
                        <option value="7-12">Carruurta 7-12 Jir</option>
                        <option value="13-18">Carruurta 13-18 Jir</option>
                        <option value="intellect">Xirfadaha Ilmaha</option>
                        <option value="autism">Autism</option>
                        <option value="adhd">ADHD</option>
                        <option value="communication">Xiriirka Waalidka</option>
                        <option value="discipline">Edbinta Ilmaha</option>
                        <option value="development">Horumarinta Ilmaha</option>
                        <option value="health">Caafimaadka Ilmaha</option>
                        <option value="education">Waxbarashada</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th>Plan</th>
                <td>
                    <select id="bsa-plan">
                        <option value="monthly">Monthly - 30 maalmood</option>
                        <option value="yearly">Yearly - 365 maalmood</option>
                        <option value="lifetime">Lifetime - Weligiis</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th>Transaction ID (optional)</th>
                <td><input type="text" id="bsa-transaction" class="regular-text" placeholder="Optional"></td>
            </tr>
        </table>
        
        <p>
            <button type="button" id="bsa-activate" class="button button-primary button-large">Activate</button>
        </p>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        var apiUrl = '<?php echo esc_js($api_url); ?>';
        var apiKey = '<?php echo esc_js($api_key); ?>';
        var currentUser = null;
        
        function showMessage(msg, type) {
            $('#bsa-message').text(msg)
                .css('background', type === 'success' ? '#d4edda' : '#f8d7da')
                .css('border', '1px solid ' + (type === 'success' ? '#c3e6cb' : '#f5c6cb'))
                .show();
        }
        
        $('#bsa-lookup').click(function() {
            var email = $('#bsa-email').val().trim();
            if (!email) {
                showMessage('Fadlan geli email', 'error');
                return;
            }
            
            $('#bsa-lookup-status').text('Waa la raadiyaa...');
            
            $.ajax({
                url: apiUrl + '/api/wordpress/user-by-email',
                method: 'POST',
                headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
                data: JSON.stringify({ email: email }),
                success: function(res) {
                    if (res.found) {
                        currentUser = res.user;
                        $('#bsa-user-info').html('<strong>' + res.user.name + '</strong><br>' + res.user.email);
                        $('#bsa-user-row').show();
                        $('#bsa-lookup-status').text('✓ La helay!');
                    } else {
                        $('#bsa-lookup-status').text('❌ Lama helin');
                        $('#bsa-user-row').hide();
                        currentUser = null;
                    }
                },
                error: function() {
                    $('#bsa-lookup-status').text('❌ Error');
                }
            });
        });
        
        $('#bsa-activate').click(function() {
            if (!currentUser) {
                showMessage('Fadlan marka hore raadi user-ka', 'error');
                return;
            }
            
            var data = {
                email: currentUser.email,
                course_id: $('#bsa-course').val(),
                plan_type: $('#bsa-plan').val(),
                transaction_id: $('#bsa-transaction').val() || 'manual-' + Date.now()
            };
            
            $(this).prop('disabled', true).text('Waa la diraa...');
            
            $.ajax({
                url: apiUrl + '/api/wordpress/purchase',
                method: 'POST',
                headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                success: function(res) {
                    showMessage('Waad ku guulaysatay! ' + currentUser.email + ' hadda wuu geli karaa.', 'success');
                    $('#bsa-activate').prop('disabled', false).text('Activate');
                },
                error: function(xhr) {
                    var msg = xhr.responseJSON ? xhr.responseJSON.error : 'Error';
                    showMessage('Khalad: ' + msg, 'error');
                    $('#bsa-activate').prop('disabled', false).text('Activate');
                }
            });
        });
    });
    </script>
    <?php
}
