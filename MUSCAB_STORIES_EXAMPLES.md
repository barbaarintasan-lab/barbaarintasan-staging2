# Example: Restoring Muscab Stories

This document shows concrete examples of how to use the new API endpoints to find and restore the lost Muscab stories.

## Example 1: Search for Muscab Stories

### Request
```bash
curl -X GET "https://your-app-url.com/api/admin/bedtime-stories/search/Muscab" \
  -H "Cookie: connect.sid=your-session-cookie"
```

### Expected Response
```json
{
  "success": true,
  "count": 2,
  "stories": [
    {
      "id": "1ABC2DEF3GHI",
      "name": "2025-11-20 - The Young Messenger.txt",
      "createdTime": "2025-11-20T10:30:00.000Z",
      "title": "The Young Messenger",
      "titleSomali": "Wargeeyaha Dhallinyarada",
      "content": "Beri hore, waxaa jiray nin dhallinyar ah oo la odhan jiray Muscab bin Cumair...\n\n(Full story content continues here - typically 300-400 words in Somali about Muscab's bravery, faith, and dedication to spreading Islam)",
      "characterName": "Muscab bin Cumair",
      "moralLesson": "Muscab wuxuu ina bartay in qofka iimaanka qaba uu awood u leeyahay inuu wax kasta ka hortago xataa haddii ay adkaato.",
      "date": "2025-11-20"
    },
    {
      "id": "4JKL5MNO6PQR",
      "name": "2025-12-05 - The Brave Companion.txt",
      "createdTime": "2025-12-05T08:15:00.000Z",
      "title": "The Brave Companion",
      "titleSomali": "Saxiibka Geesiga Ahaa",
      "content": "Muscab bin Cumair wuxuu ahaa mid ka mid ah saxaabada ugu horreeyay ee Islaamka qaatay...\n\n(Full story content continues here - typically 300-400 words about Muscab's courage and sacrifice)",
      "characterName": "Muscab bin Cumair",
      "moralLesson": "Geesinnimo waa inaanu ka cabsan inaynu wax xun horteeno marka aynu runta ognahay.",
      "date": "2025-12-05"
    }
  ]
}
```

## Example 2: Restore First Story

### Request
```bash
curl -X POST "https://your-app-url.com/api/admin/bedtime-stories/restore" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "title": "The Young Messenger",
    "titleSomali": "Wargeeyaha Dhallinyarada",
    "content": "Beri hore, waxaa jiray nin dhallinyar ah oo la odhan jiray Muscab bin Cumair...\n\n(Full story from the search result)",
    "characterName": "Muscab bin Cumair",
    "moralLesson": "Muscab wuxuu ina bartay in qofka iimaanka qaba uu awood u leeyahay inuu wax kasta ka hortago xataa haddii ay adkaato.",
    "storyDate": "2025-11-20"
  }'
```

### Success Response
```json
{
  "success": true,
  "message": "Sheekada waa la soo celiyay",
  "story": {
    "id": "abc123-def456-ghi789",
    "title": "The Young Messenger",
    "titleSomali": "Wargeeyaha Dhallinyarada",
    "content": "Beri hore, waxaa jiray nin dhallinyar ah...",
    "characterName": "Muscab bin Cumair",
    "characterType": "sahabi",
    "moralLesson": "Muscab wuxuu ina bartay in qofka iimaanka qaba...",
    "ageRange": "3-8",
    "images": [],
    "thumbnailUrl": null,
    "audioUrl": null,
    "storyDate": "2025-11-20",
    "generatedAt": "2026-02-15T07:45:00.000Z",
    "updatedAt": null,
    "isPublished": false
  }
}
```

### Error Response (Duplicate Date)
```json
{
  "error": "Story already exists for this date",
  "existingStory": {
    "id": "existing-story-id",
    "titleSomali": "Existing Story Title",
    "storyDate": "2025-11-20"
  }
}
```

## Example 3: Publish the Restored Story

After restoring, the story is set to `isPublished: false` for review. To publish it:

### Request
```bash
curl -X PATCH "https://your-app-url.com/api/bedtime-stories/abc123-def456-ghi789" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-admin-session-cookie" \
  -d '{
    "isPublished": true
  }'
```

### Success Response
```json
{
  "id": "abc123-def456-ghi789",
  "title": "The Young Messenger",
  "titleSomali": "Wargeeyaha Dhallinyarada",
  "isPublished": true,
  "storyDate": "2025-11-20",
  ...
}
```

## Example 4: Search with Different Character Names

You can also search for other characters to see what other stories exist in backups:

```bash
# Search for Bilaal stories
curl -X GET "https://your-app-url.com/api/admin/bedtime-stories/search/Bilaal"

# Search for Khaalid stories
curl -X GET "https://your-app-url.com/api/admin/bedtime-stories/search/Khaalid"

# Search for Umar stories
curl -X GET "https://your-app-url.com/api/admin/bedtime-stories/search/Umar"
```

## Complete Workflow

Here's the complete step-by-step process:

1. **Search for Muscab stories**
   ```bash
   GET /api/admin/bedtime-stories/search/Muscab
   ```

2. **For each found story, restore it**
   ```bash
   POST /api/admin/bedtime-stories/restore
   {
     "title": "...",
     "titleSomali": "...",
     "content": "...",
     "characterName": "Muscab bin Cumair",
     "moralLesson": "...",
     "storyDate": "..."
   }
   ```

3. **Review the restored stories**
   ```bash
   GET /api/admin/bedtime-stories
   ```

4. **Publish each story**
   ```bash
   PATCH /api/bedtime-stories/{id}
   {
     "isPublished": true
   }
   ```

5. **Verify stories are visible to users**
   ```bash
   GET /api/bedtime-stories
   ```

## Notes

- All API endpoints require admin authentication
- Stories are restored as unpublished (`isPublished: false`) for review
- The `characterType` is automatically determined from the character roster
- If a story already exists for a date, you'll get a 409 Conflict error
- Empty `images` array is normal for restored stories (they didn't have images originally)
- You can regenerate images and audio after restoration if needed

## Testing Without Google Drive Access

If you don't have Google Drive access in your test environment, you can:

1. Manually create test story data based on the examples above
2. Use the restore endpoint directly with hardcoded story content
3. Test the database insertion and retrieval logic
4. Mock the Google Drive functions for unit tests

## Security Considerations

- All endpoints require admin authentication
- Search and restore operations are logged
- Restored stories start as unpublished for review
- Only admins can delete or restore stories
- Consider implementing audit logs for story deletions
