# WordPress Integration Documentation

## Overview

This document describes how to integrate the WordPress website (barbaarintasan.com) with the Barbaarintasan Academy app (appbarbaarintasan.com).

## Authentication

All API requests (except health check) require the `X-API-Key` header:

```
X-API-Key: YOUR_WORDPRESS_API_KEY
```

**Important:** The API key must be sent via header only, not as a query parameter.

---

## API Endpoints

Base URL: `https://appbarbaarintasan.com`

### 1. Health Check

Check if the API is available.

**Endpoint:** `GET /api/wordpress/health`

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. User Lookup by Phone

Find a user by their phone number.

**Endpoint:** `GET /api/wordpress/user-by-phone?phone=PHONE_NUMBER`

**Authentication:** Required (X-API-Key header)

**Parameters:**
- `phone` (required): Phone number in any format (will be normalized)

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "phone": "+252612345678",
    "fullName": "Cabdi Maxamed"
  }
}
```

**User Not Found (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 3. Check User Access

Check if a user has access to a course or subscription.

**Endpoint:** `GET /api/wordpress/check-access?phone=PHONE&course_id=COURSE_ID`

**Authentication:** Required (X-API-Key header)

**Parameters:**
- `phone` (required): User's phone number
- `course_id` (optional): Course slug to check. Omit to check for any active access.

**Valid Course IDs (slugs):**
- `0-6` - Ages 0-6 course
- `6-12` - Ages 6-12 course
- `12-18` - Ages 12-18 course
- `intellect` - Intelligence/IQ course
- `autism` - Autism awareness course
- `all-access` - Full platform subscription

**Response (200):**
```json
{
  "success": true,
  "hasAccess": true,
  "accessType": "subscription",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

**Access Types:**
- `subscription` - All-access monthly or yearly subscription
- `enrollment` - Single course purchase
- `none` - No active access

---

### 4. Record Purchase

Record a purchase made through WordPress.

**Endpoint:** `POST /api/wordpress/purchase`

**Authentication:** Required (X-API-Key header)

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phone": "+252612345678",
  "course_id": "all-access",
  "plan_type": "yearly",
  "amount": 120,
  "currency": "USD",
  "payment_method": "flutterwave",
  "transaction_id": "FLW-123456789"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone | string | Yes | User's phone number |
| course_id | string | Yes | Course slug or "all-access" for subscription |
| plan_type | string | Yes | "monthly", "yearly", or "lifetime" |
| amount | number | Yes | Payment amount |
| currency | string | Yes | Currency code (USD, EUR, etc.) |
| payment_method | string | Yes | Payment provider name |
| transaction_id | string | Yes | Unique transaction reference |

**Success Response (200):**
```json
{
  "success": true,
  "enrollment": {
    "id": 456,
    "parentId": 123,
    "courseId": "all-access-id",
    "status": "active",
    "planType": "yearly",
    "accessStart": "2024-01-15T10:30:00.000Z",
    "accessEnd": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error - User Not Found (404):**
```json
{
  "success": false,
  "error": "User not found. Please ensure the user has registered in the app first."
}
```

**Error - Course Not Found (404):**
```json
{
  "success": false,
  "error": "Course not found"
}
```

---

### 5. Flutterwave Payment Webhook

Automatically activate subscriptions when payment is confirmed.

**Endpoint:** `POST /api/wordpress/webhook/payment`

**Authentication:** Webhook signature verification (Flutterwave secret)

**Content-Type:** `application/json`

**Request Body (from Flutterwave):**
```json
{
  "event": "charge.completed",
  "data": {
    "id": 123456789,
    "tx_ref": "WP-ORDER-123",
    "status": "successful",
    "amount": 120,
    "currency": "USD",
    "customer": {
      "phone_number": "+252612345678"
    },
    "meta": {
      "course_id": "all-access",
      "plan_type": "yearly"
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully"
}
```

---

### 6. Course Catalog

Get all available courses for display on WordPress.

**Endpoint:** `GET /api/wordpress/courses`

**Authentication:** Required (X-API-Key header)

**Response (200):**
```json
{
  "success": true,
  "courses": [
    {
      "id": "course-uuid-1",
      "courseId": "0-6",
      "title": "Caruurta 0-6 Sano",
      "description": "Koorso loogu talagalay waalidka carruurta yar yar",
      "imageUrl": "/images/course-0-6.jpg",
      "ageRange": "0-6",
      "priceMonthly": 15,
      "priceYearly": 120,
      "isLive": true
    }
  ]
}
```

---

## WordPress PHP Integration Examples

### Setting Up the API Client

```php
<?php
class BarbaarintasanAPI {
    private $api_key;
    private $base_url = 'https://appbarbaarintasan.com';
    
    public function __construct($api_key) {
        $this->api_key = $api_key;
    }
    
    private function request($method, $endpoint, $data = null) {
        $url = $this->base_url . $endpoint;
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'X-API-Key' => $this->api_key,
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30
        );
        
        if ($data && $method === 'POST') {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return array('success' => false, 'error' => $response->get_error_message());
        }
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
    
    public function checkUserAccess($phone, $courseId = null) {
        $endpoint = '/api/wordpress/check-access?phone=' . urlencode($phone);
        if ($courseId) {
            $endpoint .= '&course_id=' . urlencode($courseId);
        }
        return $this->request('GET', $endpoint);
    }
    
    public function recordPurchase($phone, $courseId, $planType, $amount, $currency, $paymentMethod, $transactionId) {
        return $this->request('POST', '/api/wordpress/purchase', array(
            'phone' => $phone,
            'course_id' => $courseId,
            'plan_type' => $planType,
            'amount' => $amount,
            'currency' => $currency,
            'payment_method' => $paymentMethod,
            'transaction_id' => $transactionId
        ));
    }
    
    public function getCourses() {
        return $this->request('GET', '/api/wordpress/courses');
    }
}
```

### Example: After Successful Payment

```php
<?php
// Initialize API client
$api = new BarbaarintasanAPI('YOUR_API_KEY_HERE');

// After Flutterwave payment success
function handle_payment_success($order) {
    global $api;
    
    $result = $api->recordPurchase(
        $order->customer_phone,
        $order->course_slug,      // e.g., "all-access", "0-6", "intellect"
        $order->plan_type,        // "monthly" or "yearly"
        $order->amount,
        $order->currency,
        'flutterwave',
        $order->transaction_id
    );
    
    if ($result['success']) {
        // Purchase recorded successfully
        // User now has access in the app
        return true;
    } else {
        // Log error
        error_log('Barbaarintasan API Error: ' . $result['error']);
        return false;
    }
}
```

### Example: Check Access Before Showing Content

```php
<?php
function user_has_app_access($phone, $course_slug = null) {
    global $api;
    
    $result = $api->checkUserAccess($phone, $course_slug);
    
    if ($result['success'] && $result['hasAccess']) {
        return true;
    }
    
    return false;
}

// Usage
if (user_has_app_access($user_phone, 'all-access')) {
    // Show subscriber content
} else {
    // Show purchase options
}
```

---

## Course ID Mapping

When sending purchases from WordPress, use these course slugs:

| WordPress Slug | App Course | Description |
|---------------|------------|-------------|
| `all-access` | All-Access Subscription | Full platform access |
| `0-6` | Ages 0-6 Course | Early childhood |
| `6-12` | Ages 6-12 Course | Middle childhood |
| `12-18` | Ages 12-18 Course | Adolescence |
| `intellect` | Intelligence Course | Child intelligence |
| `autism` | Autism Course | Autism awareness |

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid API key)
- `404` - Not found (user or course doesn't exist)
- `500` - Server error

---

## Security Notes

1. **Never expose the API key** in client-side JavaScript
2. **Always use HTTPS** for all API requests
3. **Store the API key** in WordPress wp-config.php:
   ```php
   define('BARBAARINTASAN_API_KEY', 'your_api_key_here');
   ```
4. **Validate webhook signatures** for payment webhooks

---

## Testing

Use the health check endpoint to verify connectivity:

```bash
curl https://appbarbaarintasan.com/api/wordpress/health
```

Test authentication:

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://appbarbaarintasan.com/api/wordpress/courses
```

---

## Support

For technical issues with the API, contact the app development team.
