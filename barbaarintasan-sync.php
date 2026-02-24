<?php
  /*
  Plugin Name: Barbaarintasan Academy Sync
  Description: Syncs WooCommerce purchases to Barbaarintasan Academy Platform.
  Version: 1.1
  Author: Replit Agent
  */

  add_action('woocommerce_order_status_completed', 'bsa_sync_order_to_platform', 10, 1);

  function bsa_sync_order_to_platform($order_id) {
      $order = wc_get_order($order_id);
      $user = $order->get_user();
      
      if (!$user) return;

      $items = $order->get_items();
      $course_ids = [];
      foreach ($items as $item) {
          $product_id = $item->get_product_id();
          // Assuming course ID is stored in a meta field or matches product ID
          $course_ids[] = get_post_meta($product_id, '_course_id', true) ?: $product_id;
      }

      $payload = [
          'email' => $user->user_email,
          'first_name' => $user->first_name,
          'last_name' => $user->last_name,
          'order_id' => $order_id,
          'course_ids' => $course_ids,
          'api_key' => 'f6f7ce5e91c6b9a1' // Matches WORDPRESS_API_KEY
      ];

      $response = wp_remote_post('https://appbarbaarintasan.com/api/wordpress/purchase', [
          'body' => json_encode($payload),
          'headers' => ['Content-Type' => 'application/json'],
          'timeout' => 15
      ]);
  }
  