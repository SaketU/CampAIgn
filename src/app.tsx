import { SearchableListView } from "@canva/app-components";
import { Box } from "@canva/app-ui-kit";
import "@canva/app-ui-kit/styles.css";
import { useConfig } from "./config";
import { findResources } from "./adapter";
import * as styles from "./index.css";
import React, { useState } from "react";
import { auth } from "@canva/user";
import { requestExport } from "@canva/design";

const platforms = [
  { key: "mailchimp", label: "Mailchimp" },
  { key: "twitter", label: "Twitter" },
  { key: "linkedin", label: "LinkedIn" },
];

/**
 * Canva In-Editor App OAuth/Redirect Logic
 * ----------------------------------------
 * For in-editor Canva apps, authentication and redirect logic are handled entirely by the Canva Apps SDK.
 * You do NOT need to set or manage a redirect URI in your code or in the Developer Portal.
 * The SDK uses Canva's internal redirect URI and manages the OAuth flow for you.
 *
 * If you run this app outside the Canva editor (e.g., directly at localhost:8080),
 * authentication and export will NOT work and you may see redirect URI errors.
 *
 * Always test in Canva Preview mode from the Developer Portal.
 */
export function App() {
  const config = useConfig();
  const [selectedTab, setSelectedTab] = useState("linkedin");
  const [linkedinData, setLinkedinData] = useState({ post: "" });
  const [twitterData, setTwitterData] = useState({ prompt: "", hashtags: "" });
  const [mailchimpData, setMailchimpData] = useState({ subject: "", content: "" });
  const [linkedinResult, setLinkedinResult] = useState<string | null>(null);
  const [twitterResult, setTwitterResult] = useState<string | null>(null);
  const [mailchimpResult, setMailchimpResult] = useState<string | null>(null);
  const [twitterPreview, setTwitterPreview] = useState<string | null>(null);
  const [tweetPublished, setTweetPublished] = useState(false);
  const [tweetTimestamp, setTweetTimestamp] = useState("");
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null);
  const [mailchimpSubject, setMailchimpSubject] = useState("");
  const [mailchimpFromName, setMailchimpFromName] = useState("");
  const [mailchimpFromEmail, setMailchimpFromEmail] = useState("");
  const [mailchimpStatus, setMailchimpStatus] = useState<string | null>(null);
  const [mailchimpPrompt, setMailchimpPrompt] = useState("");
  const [mailchimpGeneratedContent, setMailchimpGeneratedContent] = useState<string | null>(null);
  const [postedTweetUrl, setPostedTweetUrl] = useState<string | null>(null);
  const [postedLinkedInUrl, setPostedLinkedInUrl] = useState<string | null>(null);

  //Helper function to strip HTML tags and get plain text with email formatting
  const stripHtmlTags = (html: string) => {
    //First remove style tags and their content
    let cleanText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    //Remove script tags and their content
    cleanText = cleanText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    //Remove CSS code blocks (anything that looks like CSS)
    cleanText = cleanText.replace(/\{[^}]*\}/g, '');
    cleanText = cleanText.replace(/[.#][a-zA-Z0-9_-]+\s*\{[^}]*\}/g, '');
    
    //Convert HTML elements to email-friendly formatting
    cleanText = cleanText.replace(/<h1[^>]*>/gi, '\n\n=== ');
    cleanText = cleanText.replace(/<h2[^>]*>/gi, '\n\n== ');
    cleanText = cleanText.replace(/<h3[^>]*>/gi, '\n\n= ');
    cleanText = cleanText.replace(/<\/h[1-6]>/gi, ' ===\n');
    
    cleanText = cleanText.replace(/<p[^>]*>/gi, '\n\n');
    cleanText = cleanText.replace(/<\/p>/gi, '\n');
    
    cleanText = cleanText.replace(/<br\s*\/?>/gi, '\n');
    cleanText = cleanText.replace(/<br\s*\/?>/gi, '\n');
    
    cleanText = cleanText.replace(/<ul[^>]*>/gi, '\n\n');
    cleanText = cleanText.replace(/<\/ul>/gi, '\n');
    cleanText = cleanText.replace(/<ol[^>]*>/gi, '\n\n');
    cleanText = cleanText.replace(/<\/ol>/gi, '\n');
    cleanText = cleanText.replace(/<li[^>]*>/gi, '• ');
    cleanText = cleanText.replace(/<\/li>/gi, '\n');
    
    cleanText = cleanText.replace(/<strong[^>]*>/gi, '**');
    cleanText = cleanText.replace(/<\/strong>/gi, '**');
    cleanText = cleanText.replace(/<b[^>]*>/gi, '**');
    cleanText = cleanText.replace(/<\/b>/gi, '**');
    
    cleanText = cleanText.replace(/<em[^>]*>/gi, '*');
    cleanText = cleanText.replace(/<\/em>/gi, '*');
    cleanText = cleanText.replace(/<i[^>]*>/gi, '*');
    cleanText = cleanText.replace(/<\/i>/gi, '*');
    
    //Remove link tags but keep the text
    cleanText = cleanText.replace(/<a[^>]*>/gi, '');
    cleanText = cleanText.replace(/<\/a>/gi, '');
    
    //Remove remaining HTML tags
    cleanText = cleanText.replace(/<[^>]*>/g, '');
    
    //Decode HTML entities
    const tmp = document.createElement('div');
    tmp.innerHTML = cleanText;
    let result = tmp.textContent || tmp.innerText || '';
    
    //Clean up extra whitespace and formatting
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
    result = result.replace(/^\s+|\s+$/g, ''); // Trim leading/trailing whitespace
    
    return result;
  };

  const handleExportDesign = async () => {
    //Warn if not running inside an iframe (i.e., not in Canva editor)
    if (window.top === window.self) {
      console.warn("[Canva App] Warning: This app is not running inside the Canva editor. OAuth and export will not work unless loaded in Canva Preview mode.");
    }
    try {
      const oauth = auth.initOauth();
      let accessToken;
      try {
        accessToken = await oauth.getAccessToken();
      } catch (e) {
        //Not authenticated, so trigger OAuth flow
        const authResponse = await oauth.requestAuthorization();
        if (authResponse.status !== "completed") {
          alert("Authorization failed or cancelled.");
          return;
        }
        accessToken = await oauth.getAccessToken();
      }
      //Proceed with export
      const result = await requestExport({
        acceptedFileTypes: ["png", "pdf_standard"],
      });
      if (result.status === "completed") {
        result.exportBlobs.forEach(blob => {
          setExportedImageUrl(blob.url);
        });
      } else {
        alert("User aborted export");
      }
    } catch (error) {
      console.error("Export failed:", error);
      setExportedImageUrl("https://via.placeholder.com/500x300/FF0000/FFFFFF?text=Export+Failed");
    }
  };

  const handleTwitterPublish = async () => {
    setTwitterResult(null);
    
    try {
      const res = await fetch(`${BACKEND_HOST}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "twitter",
          prompt: twitterData.prompt,
          hashtags: twitterData.hashtags,
          exportUrl: exportedImageUrl,
        }),
      });
      const result = await res.json();
      setTwitterResult(JSON.stringify(result));
    } catch (e) {
      setTwitterResult("Error contacting backend");
    }
  };

  const handleLinkedInPublish = async () => {
    setLinkedinResult(null);
    
    try {
      const res = await fetch(`${BACKEND_HOST}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "linkedin",
          post: linkedinData.post,
          exportUrl: exportedImageUrl,
        }),
      });
      const result = await res.json();
      setLinkedinResult(JSON.stringify(result));
    } catch (e) {
      setLinkedinResult("Error contacting backend");
    }
  };

  const handleMailchimpPublish = async () => {
    setMailchimpResult(null);
    
    try {
      const res = await fetch(`${BACKEND_HOST}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "mailchimp",
          content: mailchimpData.content,
          exportUrl: exportedImageUrl,
        }),
      });
      const result = await res.json();
      setMailchimpResult(JSON.stringify(result));
    } catch (e) {
      setMailchimpResult("Error contacting backend");
    }
  };

  const openPreviewInNewTab = () => {
    const previewTweet = twitterResult ? JSON.parse(twitterResult).generated || '' : '';
    const hashtags = twitterData.hashtags;
    const account = "YourBrand";
    const timestamp = tweetTimestamp || new Date().toLocaleString();
    
    //Create HTML content for the preview
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Tweet Preview</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  background-color: #15202B;
                  color: #FFFFFF;
                  padding: 20px;
                  max-width: 600px;
                  margin: 0 auto;
              }
              .tweet-container {
                  background-color: #192734;
                  border-radius: 15px;
                  padding: 15px;
                  margin: 20px 0;
              }
              .tweet-header {
                  display: flex;
                  align-items: center;
                  margin-bottom: 10px;
              }
              .profile-pic {
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  margin-right: 10px;
                  background-color: #657786;
              }
              .user-info {
                  flex-grow: 1;
              }
              .user-name {
                  font-weight: bold;
                  margin: 0;
              }
              .user-handle {
                  color: #8899A6;
                  margin: 0;
              }
              .tweet-content {
                  margin: 10px 0;
                  line-height: 1.4;
                  white-space: pre-wrap;
              }
              .tweet-image {
                  width: 100%;
                  max-width: 500px;
                  border-radius: 8px;
                  border: 1px solid #38444D;
                  margin: 10px 0;
              }
              .hashtags {
                  color: #1DA1F2;
                  margin-top: 10px;
              }
              .timestamp {
                  color: #8899A6;
                  font-size: 0.9em;
                  margin-top: 5px;
              }
              .tweet-stats {
                  display: flex;
                  justify-content: space-between;
                  color: #8899A6;
                  margin-top: 15px;
                  padding-top: 15px;
                  border-top: 1px solid #38444D;
              }
          </style>
      </head>
      <body>
          <div class="tweet-container">
              <div class="tweet-header">
                  <div class="profile-pic"></div>
                  <div class="user-info">
                      <p class="user-name">${account}</p>
                      <p class="user-handle">@${account}</p>
                  </div>
              </div>
              <div class="tweet-content">${previewTweet}</div>
              ${exportedImageUrl ? `<img src="${exportedImageUrl}" alt="Campaign Design" class="tweet-image">` : ''}
              ${hashtags ? `<div class="hashtags">${hashtags}</div>` : ''}
              <div class="timestamp">${timestamp}</div>
              <div class="tweet-stats">
                  <span>0 Comments</span>
                  <span>0 Retweets</span>
                  <span>0 Likes</span>
              </div>
          </div>
      </body>
      </html>
    `;
    
    //Open in new tab
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  const handleMailchimpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setMailchimpStatus(null);
    if (!exportedImageUrl) {
      setMailchimpStatus("Please export a Canva design first.");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_HOST}/mailchimp/create-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportUrl: exportedImageUrl,
          subject: mailchimpSubject,
          fromName: mailchimpFromName,
          fromEmail: mailchimpFromEmail,
          content: mailchimpGeneratedContent || "",
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setMailchimpStatus(`Campaign sent! ID: ${result.campaignId}`);
      } else {
        setMailchimpStatus(result.error || "Mailchimp error");
      }
    } catch (err: any) {
      setMailchimpStatus("Mailchimp error: " + err.message);
    }
  };

  const handleMailchimpGenerate = async () => {
    if (!mailchimpPrompt.trim()) {
      setMailchimpStatus("Please enter a prompt for email content generation.");
      return;
    }
    setMailchimpStatus("Generating email content...");
    try {
      const res = await fetch(`${BACKEND_HOST}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create engaging email content for: ${mailchimpPrompt}. Make it professional, compelling, and include a clear call-to-action. Format it as HTML with proper paragraphs and styling.`,
          platform: "email"
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setMailchimpGeneratedContent(result.generated || result.content || "");
        setMailchimpStatus("Email content generated successfully!");
      } else {
        setMailchimpStatus(result.error || "Failed to generate content");
      }
    } catch (err: any) {
      setMailchimpStatus("Generation error: " + err.message);
    }
  };

  const handlePostTweet = async () => {
    if (!twitterResult) {
      alert("Please generate a campaign first.");
      return;
    }
    
    const generatedTweet = JSON.parse(twitterResult).generated || '';
    const hashtags = twitterData.hashtags;
    
    //The generated content should now be clean without hashtags
    const mainContent = generatedTweet.trim();
    const fullTweetText = mainContent + (hashtags ? '\n\n' + hashtags : '');
    
    try {
      const res = await fetch(`${BACKEND_HOST}/twitter/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullTweetText
        }),
      });
      
      const result = await res.json();
      if (res.ok) {
        setPostedTweetUrl(result.tweetUrl);
        alert(`Tweet posted successfully! Click "Add Image to Tweet" to include your design.`);
      } else {
        alert(`Failed to post tweet: ${result.error || result.details}`);
      }
    } catch (err: any) {
      alert(`Error posting tweet: ${err.message}`);
    }
  };

  const handleAddImageToTweet = () => {
    if (!postedTweetUrl) {
      alert("Please post a tweet first.");
      return;
    }
    
    //Open the posted tweet in a new tab for manual image addition
    window.open(postedTweetUrl, '_blank');
  };

  const handlePostToLinkedIn = async () => {
    if (!linkedinResult) {
      alert("Please generate a LinkedIn campaign first.");
      return;
    }
    
    const generatedPost = JSON.parse(linkedinResult).generated || '';
    
    try {
      const res = await fetch(`${BACKEND_HOST}/linkedin/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: generatedPost,
          imageUrl: exportedImageUrl
        }),
      });
      
      const result = await res.json();
      if (res.ok) {
        setPostedLinkedInUrl(result.postUrl);
        alert(`LinkedIn post published successfully! View it here: ${result.postUrl}`);
      } else {
        alert(`Failed to post to LinkedIn: ${result.error || result.details}`);
      }
    } catch (err: any) {
      alert(`Error posting to LinkedIn: ${err.message}`);
    }
  };

  const renderForm = () => {
    switch (selectedTab) {
      case "linkedin":
        return (
          <>
            <form style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label>
                Prompt:
                <textarea
                  value={linkedinData.post}
                  onChange={e => setLinkedinData({ post: e.target.value })}
                  rows={4}
                  placeholder="Describe your LinkedIn campaign goal, product, or professional message..."
                  style={{ width: "100%" }}
                />
              </label>
            </form>
            <button 
              style={{ marginTop: 16, background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              onClick={handleLinkedInPublish}
            >
              Generate Campaign
            </button>
            {linkedinResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 8, border: '1px solid #dee2e6' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#0a66c2' }}>LinkedIn Post Preview:</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: 8 }}>{JSON.parse(linkedinResult).generated}</div>
                  {exportedImageUrl && <img src={exportedImageUrl} alt="Exported design" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #ccc', marginBottom: 8 }} />}
                </div>
                <button 
                  style={{ marginTop: 8, background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
                  onClick={handlePostToLinkedIn}
                >
                  Post to LinkedIn
                </button>
                {postedLinkedInUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a 
                      href={postedLinkedInUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#0a66c2', textDecoration: 'none' }}
                    >
                      View Posted LinkedIn Content →
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        );
      case "twitter":
        const generatedTweet = twitterResult ? JSON.parse(twitterResult).generated || '' : '';
        const hashtags = twitterData.hashtags;
        const account = "YourBrand";
        
        //The generated content should now be clean without hashtags
        const mainContent = generatedTweet.trim();
        
        //Compose the Twitter intent URL
        const tweetText = encodeURIComponent(mainContent + (hashtags ? '\n\n' + hashtags : ''));
        const imageUrl = exportedImageUrl ? encodeURIComponent(exportedImageUrl) : '';
        const intentUrl = `https://twitter.com/intent/tweet?text=${tweetText}${imageUrl ? `&url=${imageUrl}` : ''}`;
        return (
          <>
            <form style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label>
                Prompt:
                <textarea
                  value={twitterData.prompt}
                  onChange={e => setTwitterData({ ...twitterData, prompt: e.target.value })}
                  rows={4}
                  placeholder="Describe your campaign goal, product, or idea..."
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Hashtags (optional - will be added at the bottom):
                <input
                  type="text"
                  value={twitterData.hashtags}
                  onChange={e => setTwitterData({ ...twitterData, hashtags: e.target.value })}
                  placeholder="#marketing #launch"
                  style={{ width: "100%" }}
                />
              </label>
            </form>
            <button 
              style={{ marginTop: 16, background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              onClick={handleTwitterPublish}
            >
              Generate Campaign
            </button>
            {twitterResult && (
              <div style={{ marginTop: 8 }}>
                <div style={{ background: '#192734', borderRadius: 8, padding: 16, marginBottom: 8 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#fff' }}>Tweet Preview:</div>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8, color: '#fff' }}>{mainContent}</div>
                  {exportedImageUrl && <img src={exportedImageUrl} alt="Exported design" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #ccc', marginBottom: 8 }} />}
                  {hashtags && <div style={{ color: '#1DA1F2', marginTop: 8 }}>{hashtags}</div>}
                </div>
                <button
                  onClick={handlePostTweet}
                  style={{ display: 'inline-block', marginTop: 8, background: '#1DA1F2', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Post Tweet
                </button>
              </div>
            )}
          </>
        );
      case "mailchimp":
        return (
          <>
            <form style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label>
                Email Content Prompt:
                <textarea
                  value={mailchimpPrompt}
                  onChange={e => setMailchimpPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe your email campaign goal, product, or message..."
                  style={{ width: "100%" }}
                />
              </label>
              <button 
                type="button"
                onClick={handleMailchimpGenerate}
                style={{ marginTop: 8, background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              >
                Generate Email Content
              </button>
            </form>
            
            {mailchimpGeneratedContent && (
              <div style={{ marginTop: 16, padding: 16, background: '#ffffff', borderRadius: 8, border: '1px solid #e1e5e9', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#2c3e50', fontSize: '16px', borderBottom: '2px solid #3498db', paddingBottom: '8px' }}>Generated Email Content:</div>
                <div 
                  style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.6',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '14px',
                    color: '#2c3e50',
                    padding: '12px',
                    background: '#fafbfc',
                    borderRadius: '4px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  {stripHtmlTags(mailchimpGeneratedContent)}
                </div>
              </div>
            )}

            <form style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }} onSubmit={handleMailchimpSend}>
              <label>
                Email Subject:
                <input
                  type="text"
                  value={mailchimpSubject}
                  onChange={e => setMailchimpSubject(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                From Name:
                <input
                  type="text"
                  value={mailchimpFromName}
                  onChange={e => setMailchimpFromName(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                From Email:
                <input
                  type="email"
                  value={mailchimpFromEmail}
                  onChange={e => setMailchimpFromEmail(e.target.value)}
                  required
                  style={{ width: "100%" }}
                />
              </label>
              <button type="submit" style={{ marginTop: 16, background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
                Send Campaign to Mailchimp
              </button>
            </form>
            {mailchimpStatus && <div style={{ marginTop: 8 }}>{mailchimpStatus}</div>}
            {mailchimpResult && (
              <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 4, border: '1px solid #dee2e6' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Generated Mailchimp Content:</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {JSON.parse(mailchimpResult).generated}
                </div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {platforms.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            style={{
              flex: 1,
              padding: "8px 12px",
              height: "36px",
              borderRadius: 4,
              border: selectedTab === tab.key ? "2px solid #0073b1" : "1px solid #ccc",
              background: selectedTab === tab.key ? "#eaf4fb" : "#f9f9f9",
              fontWeight: selectedTab === tab.key ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "11px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Box padding="4u">
        <button onClick={handleExportDesign} style={{ padding: '10px 20px', fontSize: '16px', background: '#1DA1F2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Export Canva Design
        </button>
        {exportedImageUrl && (
          <div style={{ marginTop: '20px' }}>
            <p>Exported Design Preview:</p>
            <img src={exportedImageUrl} alt="Exported design" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
        )}
    </Box>
      <div>{renderForm()}</div>
    </div>
  );
}
