# LinkedIn API Integration Setup Guide

This guide explains how to set up LinkedIn API integration for posting content directly from your Canva app.

## Prerequisites

1. A LinkedIn Developer Account
2. A LinkedIn App created in the LinkedIn Developer Portal
3. Access to LinkedIn Marketing API

## Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create App"
3. Fill in the required information:
   - App name: Your app name
   - LinkedIn Page: Your company page
   - App Logo: Upload your app logo
4. Click "Create App"

## Step 2: Configure App Permissions

1. In your app dashboard, go to "Auth" tab
2. Add the following OAuth 2.0 scopes:
   - `r_liteprofile` - Read basic profile information
   - `w_member_social` - Write posts on behalf of the user
   - `r_organization_social` - Read organization posts (if posting to company page)
   - `w_organization_social` - Write posts to organization (if posting to company page)

## Step 3: Get Your Profile ID

### For Personal Profile:
1. Go to your LinkedIn profile
2. Copy your profile URL (e.g., `https://www.linkedin.com/in/yourusername/`)
3. Your profile ID is the part after `/in/` and before the next `/`

### For Company Page:
1. Go to your company page on LinkedIn
2. Copy the page URL (e.g., `https://www.linkedin.com/company/yourcompany/`)
3. Your organization ID is the part after `/company/` and before the next `/`

## Step 4: Generate Access Token

### Method 1: Using LinkedIn OAuth Flow (Recommended for Production)

1. Set up OAuth 2.0 redirect URLs in your app settings
2. Implement OAuth flow in your application
3. Exchange authorization code for access token

### Method 2: Using LinkedIn Developer Tools (For Testing)

1. Go to your app dashboard
2. Click "Tools" → "Access Token Generator"
3. Select the required scopes
4. Generate a token (valid for 60 days)

## Step 5: Environment Variables

Add the following environment variables to your `.env` file:

```env
# LinkedIn API Configuration
LINKEDIN_ACCESS_TOKEN=your_access_token_here
LINKEDIN_PROFILE_ID=your_profile_or_organization_id_here
```

## Step 6: API Endpoints

The app now includes the following LinkedIn endpoints:

### POST /linkedin/post
Posts content to LinkedIn with optional image.

**Request Body:**
```json
{
  "text": "Your LinkedIn post content here",
  "imageUrl": "https://example.com/image.png"
}
```

**Response:**
```json
{
  "ok": true,
  "postId": "urn:li:activity:123456789",
  "text": "Your LinkedIn post content here",
  "postUrl": "https://www.linkedin.com/feed/update/123456789/",
  "message": "LinkedIn post published successfully!"
}
```

## Step 7: Frontend Integration

The frontend now includes:
- LinkedIn tab with post generation
- "Post to LinkedIn" button
- Link to view posted content
- Support for Canva design export integration

## Troubleshooting

### Common Issues:

1. **"LinkedIn configuration missing"**
   - Ensure `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PROFILE_ID` are set in your environment variables

2. **"Failed to register upload"**
   - Check if your access token has the required `w_member_social` scope
   - Verify the profile ID is correct

3. **"Failed to create post"**
   - Ensure your access token is valid and not expired
   - Check if you have permission to post to the specified profile/organization

4. **Image upload failures**
   - Verify the image URL is accessible
   - Check if the image format is supported by LinkedIn

### API Rate Limits:

- LinkedIn has rate limits for API calls
- Monitor your usage in the LinkedIn Developer Portal
- Implement proper error handling for rate limit exceeded errors

## Security Considerations

1. **Never expose access tokens in client-side code**
2. **Store tokens securely on the server**
3. **Implement proper token refresh mechanisms**
4. **Use environment variables for sensitive data**
5. **Implement proper error handling**

## Testing

1. Start your development server
2. Navigate to the LinkedIn tab in your app
3. Generate a campaign post
4. Click "Post to LinkedIn"
5. Verify the post appears on your LinkedIn profile/page

## Production Deployment

1. Set up proper OAuth 2.0 flow for user authentication
2. Implement token refresh mechanisms
3. Add proper error handling and logging
4. Monitor API usage and rate limits
5. Test thoroughly before going live

## Support

For LinkedIn API issues:
- [LinkedIn Developer Documentation](https://developer.linkedin.com/)
- [LinkedIn API Reference](https://developer.linkedin.com/docs)
- [LinkedIn Developer Community](https://developer.linkedin.com/community)

For app-specific issues:
- Check the console logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure your LinkedIn app has the required permissions 