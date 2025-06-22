import * as express from "express";
import * as crypto from "crypto";
import type { Container, Resource } from "@canva/app-components";
const mailchimp = require('@mailchimp/mailchimp_marketing');
const { TwitterApi } = require('twitter-api-v2');

/**
 * Generates a unique hash for a url.
 */
export async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

const imageUrls = [
  "https://images.pexels.com/photos/1495580/pexels-photo-1495580.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/3943197/pexels-photo-3943197.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/7195267/pexels-photo-7195267.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/2904142/pexels-photo-2904142.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/5403478/pexels-photo-5403478.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
];
export const createDamRouter = () => {
  const router = express.Router();

  /**
   * This endpoint returns the data for the app.
   */
  router.post("/resources/find", async (req, res) => {
    const {
      types,
      continuation,
      locale,
    } = req.body;

    let resources: Resource[] = [];
    if (types.includes("IMAGE")) {
      resources = await Promise.all(
        Array.from({ length: 40 }, async (_, i) => ({
          id: await generateHash(i + ""),
          mimeType: "image/jpeg",
          name: `My new thing in ${locale}`,
          type: "IMAGE",
          thumbnail: {
            url: imageUrls[i % imageUrls.length],
          },
          url: imageUrls[i % imageUrls.length],
        })),
      );
    }

    if (types.includes("CONTAINER")) {
      const containers = await Promise.all(
        Array.from(
          { length: 10 },
          async (_, i) =>
            ({
              id: await generateHash(i + ""),
              containerType: "folder",
              name: `My folder ${i}`,
              type: "CONTAINER",
            }) satisfies Container,
        ),
      );

      resources = resources.concat(containers);
    }

    res.send({
      resources,
      continuation: +(continuation || 0) + 1,
    });
  });

  /**
   * Simple ping endpoint for connectivity test.
   */
  router.get("/ping", (req, res) => {
    res.json({ ok: true, message: "pong" });
  });

  /**
   * Generate campaign copy using OpenAI API for Twitter, LinkedIn, or Mailchimp.
   */
  router.post("/publish", async (req, res) => {
    const { platform, ...fields } = req.body;
    let prompt = "";
    let postProcess = (text) => text;

    if (platform === "twitter") {
      const userHashtags = fields.hashtags || '';
      const hashtagInstruction = userHashtags 
        ? `The user has provided these hashtags: ${userHashtags}. These will be added separately at the end.`
        : 'Do not include any hashtags in the main content.';
      
      prompt = `Write an engaging tweet based on this prompt: "${fields.prompt}"
      
      Requirements:
      • Make it relevant to the user's specific prompt
      • Energetic and engaging tone
      • Include a clear call-to-action
      • Keep the main content under 200 characters (to leave room for hashtags)
      • Make it specific to what the user is promoting
      • ${hashtagInstruction}
      • Do NOT include any hashtags in the main tweet content
      • Do NOT include any hashtag symbols (#) in your response`;
      postProcess = (text) => {
        const lines = text.split('\n');
        const mainContent = lines
          .filter(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('#') || /^[#\s]+$/.test(trimmedLine)) {
              return false;
            }
            const hashtagCount = (trimmedLine.match(/#/g) || []).length;
            const wordCount = trimmedLine.split(/\s+/).length;
            if (hashtagCount > 0 && hashtagCount >= wordCount) {
              return false;
            }
            return true;
          })
          .join('\n')
          .trim();
        
        const cleanContent = mainContent
          .replace(/\s+#\w+/g, '')
          .replace(/#\w+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (userHashtags) {
          return `${cleanContent}\n\n${userHashtags}`;
        }
        return cleanContent;
      };
    } else if (platform === "linkedin") {
      prompt = `Compose a professional LinkedIn post (~150 words) based on this prompt: "${fields.post}"
      
      Requirements:
      • Professional yet approachable tone
      • Use 2–3 bullet points to highlight key benefits or points
      • Include a clear call-to-action
      • Make it relevant to the user's specific prompt
      • Format with proper paragraphs and bullet points`;
      postProcess = (text) => text.replace(/\n?•/g, '\n\n•');
    } else if (platform === "mailchimp") {
      prompt = `You're an email marketer.\n1) Suggest 5 subject lines (≤60 chars) to promote a 20%-off summer drop\n2) Write corresponding preview texts (≤100 chars)\n3) Draft a 3-paragraph HTML snippet (with <h1>, <p>, <a href=…>) that:\n   • Opens with benefit ("Stay cool & stylish…")\n   • Shows image via this URL: ${(fields.exportUrl || '')}\n   • Includes a 'Shop Now' button linking to ${(fields.landingPage || '')}`;
    }

    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
        }),
      });
      const data: any = await openaiRes.json();
      let generated = data.choices?.[0]?.message?.content || "No response from OpenAI";
      if (platform === "twitter" || platform === "linkedin") {
        generated = postProcess(generated);
      }
      res.json({ ok: true, platform, generated });
    } catch (err: any) {
      console.error("OpenAI error:", err);
      res.status(500).json({ ok: false, error: "OpenAI API error", details: err.message });
    }
  });

  //Mailchimp integration - moved inside router function
  mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
  });

  router.post('/mailchimp/create-campaign', async (req, res) => {
    const { exportUrl, subject, fromName, fromEmail, content } = req.body;
    if (!exportUrl || !subject || !fromName || !fromEmail) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
      //1) create the campaign
      const { id: campaignId } = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: { list_id: process.env.MAILCHIMP_LIST_ID },
        settings: {
          subject_line: subject,
          title: `Campaign – ${new Date().toISOString()}`,
          from_name: fromName,
          reply_to: fromEmail,
        },
      });
      //2) set the content with your Canva PNG and generated content
      const htmlContent = content 
        ? `${content}<br><br><img src="${exportUrl}" alt="Campaign graphic" />`
        : `<h1>${subject}</h1><img src="${exportUrl}" alt="Campaign graphic" />`;
      
      await mailchimp.campaigns.setContent(campaignId, {
        html: htmlContent,
      });
      //3) send immediately
      await mailchimp.campaigns.send(campaignId);
      res.status(200).json({ campaignId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Mailchimp error', details: err.message });
    }
  });

  /**
   * Generate content using OpenAI API (for email content generation)
   */
  router.post("/generate", async (req, res) => {
    const { prompt, platform } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ 
            role: "user", 
            content: `${prompt}\n\nIMPORTANT: Do not include the original prompt or any instructions in your response. Only provide the email content itself.` 
          }],
          max_tokens: 800,
        }),
      });
      
      const data: any = await openaiRes.json();
      let generated = data.choices?.[0]?.message?.content || "No response from OpenAI";
      
      // Post-process to remove any prompt references
      if (platform === "email") {
        const lines = generated.split('\n');
        const filteredLines = lines.filter(line => {
          const lowerLine = line.toLowerCase();
          return !lowerLine.includes('create engaging email content for:') &&
                 !lowerLine.includes('make it professional') &&
                 !lowerLine.includes('include a clear call-to-action') &&
                 !lowerLine.includes('format it as html') &&
                 !lowerLine.includes('important: do not include') &&
                 !lowerLine.includes('only provide the email content');
        });
        generated = filteredLines.join('\n').trim();
      }
      
      res.json({ 
        ok: true, 
        generated,
        content: generated
      });
    } catch (err: any) {
      console.error("OpenAI error:", err);
      res.status(500).json({ ok: false, error: "OpenAI API error", details: err.message });
    }
  });

  /**
   * Post tweet using Twitter API v2 (Free tier - text only)
   */
  router.post("/twitter/post", async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Tweet text is required' });
    }

    try {
      //Initialize Twitter client with user OAuth tokens
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

      //Post the tweet
      const tweet = await client.v2.tweet(text);
      
      //Construct the tweet URL for manual image addition but needs Twitter Premium
      const tweetUrl = `https://twitter.com/user/status/${tweet.data.id}`;
      
      res.json({ 
        ok: true, 
        tweetId: tweet.data.id,
        text: tweet.data.text,
        tweetUrl: tweetUrl,
        message: 'Tweet posted successfully! Now add your image manually.'
      });
    } catch (err: any) {
      console.error("Twitter API error:", err);
      res.status(500).json({ 
        ok: false, 
        error: "Twitter API error", 
        details: err.message 
      });
    }
  });

  /**
   * Post to LinkedIn using LinkedIn API v2
   */
  router.post("/linkedin/post", async (req, res) => {
    const { text, imageUrl } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'LinkedIn post text is required' });
    }

    try {
      //Get the user's profile ID (organization or personal)
      const profileId = process.env.LINKEDIN_PROFILE_ID;
      const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      
      if (!profileId || !accessToken) {
        return res.status(400).json({ 
          error: 'LinkedIn configuration missing. Please set LINKEDIN_PROFILE_ID and LINKEDIN_ACCESS_TOKEN environment variables.' 
        });
      }

      //Prepare the post data
      const postData: any = {
        author: `urn:li:person:${profileId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      //If image is provided, add it to the post
      if (imageUrl) {
        //First, register the image upload
        const registerUploadResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: `urn:li:person:${profileId}`,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent'
                }
              ]
            }
          })
        });

        if (!registerUploadResponse.ok) {
          throw new Error(`Failed to register upload: ${registerUploadResponse.statusText}`);
        }

        const uploadData = await registerUploadResponse.json();
        const uploadUrl = uploadData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = uploadData.value.asset;

        //Download the image from the provided URL and upload to LinkedIn
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();

        //Upload the image
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream'
          },
          body: imageBuffer
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
        }

        //Add the uploaded image to the post
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: 'Campaign design from Canva'
            },
            media: asset,
            title: {
              text: 'Campaign Design'
            }
          }
        ];
      }

      //Create the post
      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postData)
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.text();
        throw new Error(`Failed to create post: ${postResponse.statusText} - ${errorData}`);
      }

      const postResult = await postResponse.json();
      
      //Construct the post URL
      const postUrl = `https://www.linkedin.com/feed/update/${postResult.id}/`;
      
      res.json({ 
        ok: true, 
        postId: postResult.id,
        text: text,
        postUrl: postUrl,
        message: 'LinkedIn post published successfully!'
      });
    } catch (err: any) {
      console.error("LinkedIn API error:", err);
      res.status(500).json({ 
        ok: false, 
        error: "LinkedIn API error", 
        details: err.message 
      });
    }
  });

  return router;
};
