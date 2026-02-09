# WordPress User Migration Guide

## Overview

One-time migration of all Barbaarintasan Academy app users to WordPress + Tutor LMS with seamless password preservation.

## Components

### 1. Export Endpoint (App Side)
**Endpoint:** `GET /api/admin/export-users-wp`  
**Auth:** Admin login required  
**Location:** Admin Panel > Waalidka tab > "WordPress Export" button

Exports JSON file with all users including:
- Email, name, phone, country, city
- Bcrypt password hash
- Active course enrollments

### 2. WordPress Auth Plugin
**File:** `barbaarintasan-legacy-auth.php`

Install in WordPress `wp-content/plugins/` directory and activate.

How it works:
1. User logs into WordPress with their app email + password
2. Plugin checks for `legacy_bcrypt` usermeta
3. If found, verifies password against bcrypt hash
4. On success: converts to WordPress native hash, deletes legacy meta
5. Future logins use standard WordPress authentication

### 3. WordPress Import Plugin  
**File:** `barbaarintasan-user-import.php`

Install in WordPress `wp-content/plugins/` directory and activate.

Usage:
1. Go to WordPress Admin > Tools > BSA User Import
2. Upload the JSON file exported from the app
3. Click "Import Users"

What it does:
- Creates WordPress user accounts with email as login
- Stores bcrypt hash in `legacy_bcrypt` usermeta (NOT in user_pass)
- Sets Tutor LMS student role
- Enrolls users in matching Tutor LMS courses
- Skips duplicate users (by email)

## Step-by-Step Migration

1. **App Admin:** Go to Admin Panel > Waalidka tab
2. **Export:** Click "WordPress Export" button to download JSON
3. **WordPress:** Install & activate `barbaarintasan-legacy-auth.php`
4. **WordPress:** Install & activate `barbaarintasan-user-import.php`
5. **WordPress:** Set `bsa_course_id` meta on Tutor LMS courses to match app course IDs (e.g., "0-6", "intellect")
6. **WordPress Admin:** Go to Tools > BSA User Import
7. **Upload:** Select the exported JSON file and click Import
8. **Done!** Users can now login to barbaarintasan.com with their app credentials

## Course Mapping

For enrollment import to work, Tutor LMS courses need a custom field:
- **Meta key:** `bsa_course_id`
- **Meta value:** The app's course identifier (e.g., "0-6", "intellect", "autism")

The import plugin also tries to match by course slug as fallback.

## Security Notes

- Bcrypt hashes are stored in usermeta, NOT in user_pass
- On first successful login, hash is converted to WordPress native format
- Legacy meta is deleted after conversion
- No plain text passwords are ever stored or transmitted
