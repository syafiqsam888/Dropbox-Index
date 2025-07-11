# Upload by URL Feature

This feature allows users to upload files to Dropbox directly by providing a URL to the file.

## Features

### 🔗 URL Support
- Works with simple URLs: `https://example.com/file.pdf`
- Handles complex URLs with query parameters: `https://example.com/file.pdf?token=abc123&hash=xyz`
- Supports authentication tokens in URLs
- Automatically extracts clean filenames (removes query parameters)

### 🚀 Upload Methods

#### Direct Upload
- Uses Dropbox's `save_url` API
- Faster for URLs that Dropbox can directly access
- Preferred method, attempted first

#### Proxy Upload
- Downloads file through the server first
- Uploads to Dropbox using `files/upload` API
- Handles large files with chunked upload sessions (>150MB)
- Fallback method when direct upload fails

### 🛡️ Error Handling
- Client-side URL validation
- Server-side URL accessibility checks
- Automatic fallback between upload methods
- Detailed error messages with suggestions

## Usage

1. Click the "Upload by URL" button in the navigation
2. Enter the URL of the file you want to upload
3. Optionally modify the filename (auto-generated from URL)
4. Click "Upload"

The system will:
1. Validate the URL format
2. Check if the URL is accessible
3. Try direct upload first
4. Fall back to proxy upload if needed
5. Show success/error message with method used

## API Endpoint

### POST `/api/upload/by-link`

**Request Body:**
```json
{
  "url": "https://example.com/file.pdf",
  "fileName": "document.pdf",
  "folderPath": "optional/folder/path"
}
```

**Response:**
```json
{
  "success": true,
  "method": "direct|proxy",
  "message": "Upload successful",
  "file_path": "/path/to/uploaded/file"
}
```

## Configuration

The upload feature requires valid Dropbox credentials in environment variables:
- `APP_ID`: Dropbox App Client ID
- `APP_SECRET`: Dropbox App Client Secret
- `REFRESH_TOKEN`: Dropbox refresh token

## Technical Implementation

### Client-side (`/components/Upload.tsx`)
- React component with modal interface
- URL validation and filename extraction
- Progress indicators and error handling
- Toast notifications for feedback

### Server-side (`/pages/api/upload/by-link.ts`)
- RESTful API endpoint
- Input validation and error handling
- Integration with upload utilities

### Upload Logic (`/lib/upload.ts`)
- URL validation function
- Direct upload using Dropbox save_url API
- Proxy upload with chunked sessions for large files
- Comprehensive error handling and fallback logic

## Error Messages

- **Invalid URL format**: "Please enter a valid HTTP or HTTPS URL"
- **URL not accessible**: "URL returned status XXX: Error message"
- **Direct upload failed**: Automatically tries proxy method
- **Upload successful**: Shows method used (direct vs proxy)

## File Size Limits

- Small files (<150MB): Single upload request
- Large files (>150MB): Chunked upload sessions
- Upload sessions use 8MB chunks for optimal performance