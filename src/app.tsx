import React, { useState } from "react";
import {
  Button,
  Text,
  TextInput,
  Box,
} from "@canva/app-ui-kit";

const PLATFORMS = ["Mailchimp", "Twitter", "LinkedIn"] as const;
type Platform = typeof PLATFORMS[number];

interface TwitterPublishResult {
  content?: string;
  preview_url?: string;
  status?: string;
  message?: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<Platform>("Mailchimp");
  // Mailchimp fields
  const [mailchimpSubject, setMailchimpSubject] = useState("");
  const [mailchimpBody, setMailchimpBody] = useState("");
  const [mailchimpCTA, setMailchimpCTA] = useState("");
  // Twitter fields
  const [tweet, setTweet] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [twitterResult, setTwitterResult] = useState<TwitterPublishResult | null>(null);
  // LinkedIn fields
  const [linkedinPost, setLinkedinPost] = useState("");
  const [linkedinHashtags, setLinkedinHashtags] = useState("");
  // Status
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePublish = async () => {
    setIsLoading(true);
    setStatus("Publishing...");
    setTwitterResult(null);
    try {
      const BACKEND_HOST = process.env.CANVA_BACKEND_HOST || "http://localhost:3001";
      console.log("Publish button clicked!");
      let body: any = {};
      let endpoint = "";
      if (activeTab === "Mailchimp") {
        endpoint = "/api/publish";
        body = {
          channels: { mailchimp: true },
          campaignBrief: `${mailchimpSubject}\n${mailchimpBody}\n${mailchimpCTA}`,
        };
      } else if (activeTab === "Twitter") {
        endpoint = "/api/publish";
        body = {
          channels: { twitter: true },
          campaignBrief: `${tweet}\nHashtags: ${hashtags}`,
        };
      } else if (activeTab === "LinkedIn") {
        endpoint = "/api/publish";
        body = {
          channels: { linkedin: true },
          campaignBrief: `${linkedinPost}\nHashtags: ${linkedinHashtags}`,
        };
      }
      const response = await fetch(`${BACKEND_HOST}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setStatus(data.status === "success" ? "Published successfully!" : data.message || "Error publishing");
      if (activeTab === "Twitter" && data.results && data.results.twitter) {
        setTwitterResult(data.results.twitter);
      }
    } catch (error) {
      setStatus("Error publishing campaign");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render the generated tweet and hashtags
  const renderTwitterResult = () => {
    if (!twitterResult) return null;
    let tweetText = "";
    let hashtagsArr: string[] = [];
    try {
      if (twitterResult.content) {
        const parsed = JSON.parse(twitterResult.content);
        tweetText = parsed.tweet || "";
        hashtagsArr = parsed.hashtags || [];
      }
    } catch (e) {
      // ignore parse error
    }
      return (
      <Box paddingTop="2u">
        {tweetText && (
          <Box paddingBottom="1u">
            <Text><strong>Generated Tweet:</strong> {tweetText}</Text>
            </Box>
          )}
        {hashtagsArr.length > 0 && (
          <Box paddingBottom="1u">
            <Text><strong>Hashtags:</strong> {hashtagsArr.join(" ")}</Text>
            </Box>
          )}
        {twitterResult.preview_url && (
          <Button
            variant="secondary"
            onClick={() => window.open(`${process.env.CANVA_BACKEND_HOST || "http://localhost:3001"}${twitterResult.preview_url}`, '_blank')}
            stretch={false}
          >
            Preview Tweet
          </Button>
          )}
        </Box>
    );
  };

  return (
    <div style={{ width: "100%", padding: "16px" }}>
      <Box paddingBottom="2u">
        <Text>
          <h1>Campaign Orchestrator</h1>
        </Text>
      </Box>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '16px' }}>
        {PLATFORMS.map((platform) => (
          <Button
            key={platform}
            variant={activeTab === platform ? "primary" : "secondary"}
            onClick={() => setActiveTab(platform)}
            stretch={false}
          >
            {platform}
          </Button>
        ))}
      </div>
      {activeTab === "Mailchimp" && (
        <Box padding="2u">
          <Text>Subject Line</Text>
          <TextInput
            value={mailchimpSubject}
            onChange={setMailchimpSubject}
            placeholder="Subject line"
          />
          <Box paddingTop="1u">
            <Text>Email Body</Text>
            <TextInput
              value={mailchimpBody}
              onChange={setMailchimpBody}
              placeholder="Email body"
            />
            </Box>
          <Box paddingTop="1u">
            <Text>Call to Action</Text>
            <TextInput
              value={mailchimpCTA}
              onChange={setMailchimpCTA}
              placeholder="Call to action"
            />
            </Box>
          <Box paddingTop="2u">
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!mailchimpSubject || !mailchimpBody || isLoading}
              loading={isLoading}
              stretch
            >
              Publish to Mailchimp
            </Button>
            </Box>
        </Box>
      )}
      {activeTab === "Twitter" && (
        <Box padding="2u">
          <Text>Tweet</Text>
          <TextInput
            value={tweet}
            onChange={setTweet}
            placeholder="Tweet text (max 280 chars)"
            maxLength={280}
          />
          <Box paddingTop="1u">
            <Text>Hashtags</Text>
            <TextInput
              value={hashtags}
              onChange={setHashtags}
              placeholder="#hashtag1 #hashtag2"
            />
          </Box>
          <Box paddingTop="2u">
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!tweet || isLoading}
              loading={isLoading}
              stretch
            >
              Publish to Twitter
            </Button>
          </Box>
          {renderTwitterResult()}
        </Box>
      )}
      {activeTab === "LinkedIn" && (
        <Box padding="2u">
          <Text>Post Content</Text>
          <TextInput
            value={linkedinPost}
            onChange={setLinkedinPost}
            placeholder="LinkedIn post content"
          />
          <Box paddingTop="1u">
            <Text>Hashtags</Text>
            <TextInput
              value={linkedinHashtags}
              onChange={setLinkedinHashtags}
              placeholder="#hashtag1 #hashtag2"
          />
        </Box>
          <Box paddingTop="2u">
        <Button
          variant="primary"
          onClick={handlePublish}
              disabled={!linkedinPost || isLoading}
          loading={isLoading}
          stretch
        >
              Publish to LinkedIn
        </Button>
          </Box>
        </Box>
      )}
        {status && (
        <Box paddingTop="2u">
          <Text tone={status.includes("Error") ? "critical" : "secondary"}>
            {status}
          </Text>
          </Box>
        )}
    </div>
  );
}
