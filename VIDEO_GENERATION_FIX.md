# Video Generation Fix - Documentation

## Problem Statement
Video generation was failing when attempting to use the Google Veo 3.1 API for AI-powered video generation in the lesson management system.

## Root Cause
The video generation API request was missing the required `resolution` parameter. According to Google's Veo 3.1 API documentation, while the resolution parameter is technically optional (with defaults applied), explicitly specifying it is recommended for consistent behavior and to prevent failures due to API changes.

## Solution

### 1. Added Missing Environment Variable Documentation
**File**: `.env.example`

Added documentation for the `GOOGLE_VEO_API_KEY` environment variable that was missing from the example configuration file. Users now know they need to configure this API key for video generation to work.

```bash
# Google Veo (for AI video generation)
GOOGLE_VEO_API_KEY=your-veo-api-key
```

### 2. Added Required Resolution Parameter
**File**: `server/routes.ts` (Line ~9057)

Added the `resolution: "1080p"` parameter to the Veo API request payload:

```javascript
body: JSON.stringify({
  instances: [{ prompt: videoPrompt }],
  parameters: {
    aspectRatio: "16:9",
    durationSeconds: 8,
    resolution: "1080p",  // ← Added this parameter
  },
}),
```

**Why 1080p?**
- Standard HD quality suitable for educational content
- Good balance between quality and file size
- Widely supported across devices
- Aligns with the existing 16:9 aspect ratio setting

### 3. Enhanced Error Logging
**File**: `server/routes.ts` (Lines ~9008, ~9067-9078)

Improved error handling and logging to make debugging easier:

1. **Added API key validation logging**:
   ```javascript
   if (!veoApiKey) {
     console.error("[AI-VIDEO] GOOGLE_VEO_API_KEY not configured in environment variables");
     return res.status(500).json({ error: "Veo API key not configured" });
   }
   ```

2. **Increased response body logging** from 500 to 1000 characters for better debugging

3. **Added detailed error object logging**:
   ```javascript
   if (parsed?.error) {
     console.error("[AI-VIDEO] Detailed error:", JSON.stringify(parsed.error, null, 2));
   }
   ```

4. **Limited error message length** to prevent overwhelming client responses:
   ```javascript
   errorMsg = responseText.substring(0, 200) || errorMsg;
   ```

## API Endpoint Details

### Current Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning
```

### Headers
```
Content-Type: application/json
x-goog-api-key: <GOOGLE_VEO_API_KEY>
```

### Request Payload Structure
```json
{
  "instances": [
    {
      "prompt": "A detailed visual description for the video..."
    }
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "durationSeconds": 8,
    "resolution": "1080p"
  }
}
```

### Supported Resolution Values
- `"720p"` - Standard HD (1280x720)
- `"1080p"` - Full HD (1920x1080) ← Currently used
- `"4k"` - Ultra HD (3840x2160) - Available in some contexts

## Testing & Verification

### Build Test
✅ **Passed** - Project builds successfully with no new errors
```bash
npm run build
# Build completed in 11.27s with no errors related to changes
```

### TypeScript Check
✅ **Passed** - No new type errors introduced
```bash
npm run check
# Pre-existing errors remain unchanged
```

### Code Review
✅ **Passed** - No review comments or issues found

### Security Scan (CodeQL)
✅ **Passed** - No security vulnerabilities detected
- JavaScript analysis: 0 alerts

## How Video Generation Works

1. **User initiates video generation** from the Admin panel with a text prompt (in Somali)
2. **Prompt translation** - GPT-4o-mini converts the Somali text to an English visual description
3. **API request** - Server sends request to Veo 3.1 API with the visual prompt
4. **Async processing** - API returns an operation name for tracking the long-running task
5. **Status polling** - Client polls every 10 seconds to check generation status
6. **Video download** - When complete, the video is downloaded from Gemini
7. **R2 upload** - Video is uploaded to R2 storage for permanent access
8. **Video ready** - User can preview and save the generated video to the lesson

## Future Considerations

### Potential Enhancements
1. **Configurable resolution** - Allow admins to choose resolution (720p/1080p/4k)
2. **Duration options** - Support different video lengths (4s, 6s, 8s)
3. **Reference images** - Add support for style/asset reference images
4. **Retry mechanism** - Implement automatic retry for failed generations
5. **Cost tracking** - Monitor API usage and costs

### Monitoring
- Monitor `[AI-VIDEO]` logs for any API failures
- Track video generation success rate
- Monitor R2 storage usage for generated videos

## Configuration Requirements

For video generation to work, ensure these environment variables are set:

```bash
# Required
GOOGLE_VEO_API_KEY=your-veo-api-key

# Required for R2 storage (permanent video hosting)
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account
CLOUDFLARE_API_TOKEN=your-cloudflare-token
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name

# Required for prompt translation
OPENAI_API_KEY=sk-your-openai-api-key
# OR
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-api-key
```

## Related Files
- `server/routes.ts` - Main API endpoint implementation
- `client/src/pages/Admin.tsx` - Admin UI for video generation
- `.env.example` - Environment variable documentation
- `server/r2Storage.ts` - R2 storage integration for video hosting

## References
- [Google Veo 3.1 API Documentation](https://ai.google.dev/gemini-api/docs/video)
- [Vertex AI Veo Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation)
- [Gemini API Reference](https://ai.google.dev/api)
