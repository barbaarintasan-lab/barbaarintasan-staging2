<?php
if (!defined('ABSPATH')) exit;

class BSA_Video_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'bsa_video';
    }

    public function get_title() {
        return 'BSA Muuqaal';
    }

    public function get_icon() {
        return 'eicon-youtube';
    }

    public function get_categories() {
        return ['bsa-widgets', 'general'];
    }

    public function get_keywords() {
        return ['video', 'muuqaal', 'youtube', 'google drive', 'bsa'];
    }

    protected function register_controls() {

        $this->start_controls_section('content_section', [
            'label' => 'Muuqaalka',
            'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
        ]);

        $this->add_control('video_url', [
            'label'       => 'Video URL',
            'type'        => \Elementor\Controls_Manager::URL,
            'placeholder' => 'https://youtube.com/watch?v=... ama Google Drive link',
            'label_block' => true,
            'default'     => ['url' => ''],
        ]);

        $this->add_control('video_title', [
            'label'       => 'Cinwaanka',
            'type'        => \Elementor\Controls_Manager::TEXT,
            'placeholder' => 'Tusaale: Koorsada Cusub',
            'label_block' => true,
        ]);

        $this->add_control('video_description', [
            'label'       => 'Sharaxaad',
            'type'        => \Elementor\Controls_Manager::TEXTAREA,
            'placeholder' => 'Sharaxaad kooban...',
            'rows'        => 3,
        ]);

        $this->add_control('thumbnail', [
            'label' => 'Sawirka Muuqaalka (ikhtiyaari)',
            'type'  => \Elementor\Controls_Manager::MEDIA,
        ]);

        $this->end_controls_section();

        $this->start_controls_section('style_section', [
            'label' => 'Style',
            'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
        ]);

        $this->add_control('border_radius', [
            'label'      => 'Corner Radius',
            'type'       => \Elementor\Controls_Manager::SLIDER,
            'range'      => ['px' => ['min' => 0, 'max' => 30]],
            'default'    => ['size' => 16],
            'selectors'  => ['{{WRAPPER}} .bsa-el-video-card' => 'border-radius: {{SIZE}}px; overflow: hidden;'],
        ]);

        $this->add_control('show_shadow', [
            'label'   => 'Shadow',
            'type'    => \Elementor\Controls_Manager::SWITCHER,
            'default' => 'yes',
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $url = !empty($settings['video_url']['url']) ? $settings['video_url']['url'] : '';

        if (empty($url)) {
            if (\Elementor\Plugin::$instance->editor->is_edit_mode()) {
                echo '<div style="padding:40px;text-align:center;background:#f0f9ff;border:2px dashed #93c5fd;border-radius:16px;font-family:Inter,sans-serif;">';
                echo '<svg width="48" height="48" fill="none" stroke="#3b82f6" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 12px;display:block;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
                echo '<p style="color:#2563eb;font-weight:600;font-size:15px;margin:0;">BSA Muuqaal Widget</p>';
                echo '<p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Video URL ku geli settings-ka</p>';
                echo '</div>';
            }
            return;
        }

        $embed_url = bsac_get_embed_url($url);
        $thumb = '';
        if (!empty($settings['thumbnail']['url'])) {
            $thumb = $settings['thumbnail']['url'];
        } else {
            $thumb = bsac_get_video_thumbnail($url);
        }

        $vid_id = 'bsa-el-vid-' . $this->get_id();
        $shadow = $settings['show_shadow'] === 'yes' ? 'box-shadow:0 2px 8px rgba(0,0,0,0.08);' : '';
        ?>
        <div class="bsa-el-video-card" id="<?php echo $vid_id; ?>" style="background:#fff;border:1px solid #e5e7eb;overflow:hidden;<?php echo $shadow; ?>">
            <div class="bsa-vid-thumb" style="position:relative;width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#eff6ff,#dbeafe);cursor:pointer;overflow:hidden;"
                 onclick="bsaPlayVideo('<?php echo $vid_id; ?>','<?php echo esc_attr($embed_url); ?>')">
                <?php if ($thumb) : ?>
                    <img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr($settings['video_title']); ?>" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                <?php else : ?>
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                        <svg width="48" height="48" fill="none" stroke="#93c5fd" stroke-width="1.5" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    </div>
                <?php endif; ?>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);transition:background 0.2s;">
                    <div style="width:64px;height:64px;background:rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s;">
                        <svg width="24" height="24" fill="#2563eb" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                </div>
            </div>
            <?php if (!empty($settings['video_title'])) : ?>
            <div style="padding:14px 16px;">
                <h4 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 4px;font-family:'Inter',-apple-system,sans-serif;"><?php echo esc_html($settings['video_title']); ?></h4>
                <?php if (!empty($settings['video_description'])) : ?>
                    <p style="font-size:13px;color:#6b7280;margin:0;font-family:'Inter',-apple-system,sans-serif;"><?php echo esc_html($settings['video_description']); ?></p>
                <?php endif; ?>
            </div>
            <?php endif; ?>
        </div>
        <?php
    }
}
