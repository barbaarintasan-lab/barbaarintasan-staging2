# Finding and Restoring Lost Muscab Stories

## Problem Summary
Waxaa jira dhawr ilaa laba sheeko oo ah kuwa caruurta oo hadda ka hor iga dhumay ee ku saabsanaayeen Muscab. (There were approximately two children's stories about Muscab that were previously deleted.)

## Investigation Results

### Character Information
- **Character Name (English)**: Mus'ab ibn Umair
- **Character Name (Somali)**: Muscab bin Cumair
- **Character Type**: Sahabi (Companion of the Prophet Muhammad ﷺ)
- **Location in Code**: `server/bedtimeStories.ts` line 26

### Where Stories Are Stored

1. **Primary Storage**: PostgreSQL database
   - Table: `bedtime_stories`
   - Fields: id, title, titleSomali, content, characterName, characterType, moralLesson, storyDate, etc.

2. **Backup Storage**: Google Drive
   - Folder: `Barbaarintasan/Maaweelada Caruurta`
   - File Format: Text files named `{date} - {title}.txt`
   - All stories are automatically backed up to Google Drive when generated

## Solution: How to Find the Lost Stories

### Option 1: Using the CLI Script (Recommended)

Run the search script to find all Muscab stories in Google Drive backups:

```bash
npx tsx scripts/search-muscab-stories.ts
```

This will:
- Search Google Drive for all stories about "Muscab bin Cumair"
- Display the title, date, content preview, and moral lesson
- Show how many stories were found

### Option 2: Using the API Endpoint

Admin users can use the REST API to search for stories:

```bash
GET /api/admin/bedtime-stories/search/Muscab
```

Response:
```json
{
  "success": true,
  "count": 2,
  "stories": [
    {
      "id": "file-id",
      "name": "2025-12-15 - Story Title.txt",
      "date": "2025-12-15",
      "title": "Story Title",
      "titleSomali": "Cinwaanka Soomaaliga",
      "characterName": "Muscab bin Cumair",
      "content": "Full story content...",
      "moralLesson": "Moral lesson text"
    }
  ]
}
```

### Option 3: Manual Google Drive Check

1. Log in to the Google Drive account connected to the system
2. Navigate to: `Barbaarintasan/Maaweelada Caruurta`
3. Search for files containing "Muscab" in the name or content
4. Look for files with dates around when the stories were deleted

## How to Restore Stories to Database

### Using the API Endpoint

Once you've found the lost stories, restore them using:

```bash
POST /api/admin/bedtime-stories/restore
Content-Type: application/json

{
  "title": "Story Title (English)",
  "titleSomali": "Cinwaanka Soomaaliga",
  "content": "Full story content in Somali...",
  "characterName": "Muscab bin Cumair",
  "moralLesson": "Moral lesson text",
  "storyDate": "2025-12-15"
}
```

Response:
```json
{
  "success": true,
  "message": "Sheekada waa la soo celiyay",
  "story": { ... }
}
```

### Steps:

1. **Find the stories** using one of the methods above
2. **Copy the story data** from the Google Drive backups
3. **Restore each story** using the POST endpoint
4. **Publish the stories** by setting `isPublished: true` via PATCH `/api/bedtime-stories/:id`

## New Features Added

### API Endpoints

1. **Search stories by character name**
   - `GET /api/admin/bedtime-stories/search/:characterName`
   - Returns all stories from Google Drive backups for the specified character
   - Admin authentication required

2. **Restore story from backup**
   - `POST /api/admin/bedtime-stories/restore`
   - Restores a story from Google Drive backup to the database
   - Checks for duplicate dates
   - Stories are restored as unpublished for review
   - Admin authentication required

### Code Changes

1. **server/googleDrive.ts**
   - Added `searchMaaweelByCharacter()` function to search Google Drive backups by character name
   - Searches all backup files and filters by character name
   - Returns parsed story data ready for restoration

2. **server/bedtimeStories.ts**
   - Imported `searchMaaweelByCharacter` function
   - Added GET endpoint to search for stories by character name
   - Added POST endpoint to restore stories from backups
   - Handles duplicate date conflicts
   - Automatically determines character type (sahabi/tabiyin)

3. **scripts/search-muscab-stories.ts**
   - New CLI script to search for Muscab stories
   - User-friendly output showing all found stories
   - Instructions for restoration

## Expected Results

When you run the search, you should find:
- **2 stories** about Muscab bin Cumair in the Google Drive backups
- Each story will have:
  - Title (English and Somali)
  - Full content in Somali
  - Character name
  - Moral lesson
  - Original date when the story was created

## Next Steps

1. **Run the search** to confirm the stories exist in Google Drive
2. **Review the stories** to ensure they are the correct ones
3. **Restore them** to the database using the API
4. **Publish them** so they are visible to users
5. **Verify** they appear correctly in the app

## Troubleshooting

### Google Drive Not Connected
If you get authentication errors:
- Ensure Replit's Google Drive connector is configured
- Check that the environment variables are set
- The app needs `REPL_IDENTITY` or `WEB_REPL_RENEWAL` token

### Stories Not Found
If no stories are found:
- The stories might have been deleted before the Google Drive backup feature was implemented
- The character name might be spelled differently in the backup
- Try searching for variations: "Mus'ab", "Musab", "Muscab"

### Duplicate Date Error
If you get a duplicate date error when restoring:
- A story already exists for that date in the database
- Either delete the existing story or change the date of the restored story

## Prevention

To prevent future data loss:
- All stories are automatically backed up to Google Drive
- Admin deletion requires authentication
- Consider implementing soft deletes (marking as deleted rather than removing from database)
- Regular database backups should be configured

## Contact

If you need assistance finding the stories, contact the system administrator or the person with access to the Google Drive account: **Barbaarintasan Akademi**.
