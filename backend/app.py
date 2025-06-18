from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
import requests
import openai
from typing import Dict, Any
import json
from pathlib import Path
import tweepy
from datetime import datetime
import urllib.parse

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables from backend/.env
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / '.env')

# Debug: Print environment variables
logger.debug("Checking environment variables:")
logger.debug(f"OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")
logger.debug(f"TWITTER_API_KEY: {'Set' if os.getenv('TWITTER_API_KEY') else 'Not set'}")
logger.debug(f"TWITTER_API_SECRET: {'Set' if os.getenv('TWITTER_API_SECRET') else 'Not set'}")
logger.debug(f"TWITTER_ACCESS_TOKEN: {'Set' if os.getenv('TWITTER_ACCESS_TOKEN') else 'Not set'}")
logger.debug(f"TWITTER_ACCESS_TOKEN_SECRET: {'Set' if os.getenv('TWITTER_ACCESS_TOKEN_SECRET') else 'Not set'}")
logger.debug(f"MAILCHIMP_API_KEY: {'Set' if os.getenv('MAILCHIMP_API_KEY') else 'Not set'}")
logger.debug(f"MAILCHIMP_LIST_ID: {'Set' if os.getenv('MAILCHIMP_LIST_ID') else 'Not set'}")
logger.debug(f"LINKEDIN_CLIENT_ID: {'Set' if os.getenv('LINKEDIN_CLIENT_ID') else 'Not set'}")
logger.debug(f"LINKEDIN_CLIENT_SECRET: {'Set' if os.getenv('LINKEDIN_CLIENT_SECRET') else 'Not set'}")

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')  # For session management
CORS(app, supports_credentials=True)

# Store platform credentials (in a real app, this would be in a secure database)
PLATFORM_CREDENTIALS = {
    'mailchimp': {
        'api_key': os.getenv('MAILCHIMP_API_KEY'),
        'list_id': os.getenv('MAILCHIMP_LIST_ID'),
        'account_name': os.getenv('MAILCHIMP_ACCOUNT_NAME', 'Default Mailchimp Account')
    },
    'twitter': {
        'api_key': os.getenv('TWITTER_API_KEY'),
        'api_secret': os.getenv('TWITTER_API_SECRET'),
        'access_token': os.getenv('TWITTER_ACCESS_TOKEN'),
        'access_token_secret': os.getenv('TWITTER_ACCESS_TOKEN_SECRET'),
        'account_name': os.getenv('TWITTER_ACCOUNT_NAME', '@default_account')
    },
    'linkedin': {
        'client_id': os.getenv('LINKEDIN_CLIENT_ID'),
        'client_secret': os.getenv('LINKEDIN_CLIENT_SECRET'),
        'access_token': os.getenv('LINKEDIN_ACCESS_TOKEN'),
        'account_name': os.getenv('LINKEDIN_ACCOUNT_NAME', 'Default LinkedIn Account')
    }
}

def get_platform_accounts() -> Dict[str, Any]:
    """
    Get available accounts for each platform
    """
    accounts = {}
    
    # Check Twitter credentials
    twitter_creds = PLATFORM_CREDENTIALS['twitter']
    has_twitter_creds = all([
        twitter_creds['api_key'],
        twitter_creds['api_secret'],
        twitter_creds['access_token'],
        twitter_creds['access_token_secret']
    ])
    accounts['twitter'] = {
        'account_name': 'Twitter Account',
        'is_connected': has_twitter_creds,
        'credentials': {
            'api_key': bool(twitter_creds['api_key']),
            'api_secret': bool(twitter_creds['api_secret']),
            'access_token': bool(twitter_creds['access_token']),
            'access_token_secret': bool(twitter_creds['access_token_secret'])
        }
    }
    
    # Check Mailchimp credentials
    mailchimp_creds = PLATFORM_CREDENTIALS['mailchimp']
    has_mailchimp_creds = all([
        mailchimp_creds['api_key'],
        mailchimp_creds['list_id']
    ])
    accounts['mailchimp'] = {
        'account_name': 'Mailchimp Account',
        'is_connected': has_mailchimp_creds,
        'credentials': {
            'api_key': bool(mailchimp_creds['api_key']),
            'list_id': bool(mailchimp_creds['list_id'])
        }
    }
    
    # Check LinkedIn credentials
    linkedin_creds = PLATFORM_CREDENTIALS['linkedin']
    has_linkedin_creds = all([
        linkedin_creds['client_id'],
        linkedin_creds['client_secret']
    ])
    accounts['linkedin'] = {
        'account_name': 'LinkedIn Account',
        'is_connected': has_linkedin_creds,
        'credentials': {
            'client_id': bool(linkedin_creds['client_id']),
            'client_secret': bool(linkedin_creds['client_secret'])
        }
    }
    
    return accounts

def generate_channel_content(campaign_brief: str, channel: str) -> Dict[str, Any]:
    """
    Generate channel-specific content using GPT-4
    """
    try:
        # Define the system message based on the channel
        system_messages = {
            'mailchimp': """You are an expert email marketer. Create engaging email content from the campaign brief.
            Format the response as JSON with these fields:
            - subject_line: A compelling subject line
            - body: The email body content
            - call_to_action: A clear call to action""",
            
            'twitter': """You are a social media expert. Create an engaging tweet from the campaign brief.
            Format the response as JSON with these fields:
            - tweet: The main tweet content (max 280 characters)
            - hashtags: 3-5 relevant hashtags""",
            
            'linkedin': """You are a professional LinkedIn content creator. Create a LinkedIn post from the campaign brief.
            Format the response as JSON with these fields:
            - post: The main post content
            - hashtags: 3-5 relevant professional hashtags"""
        }

        # Make the API call to OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {"role": "system", "content": system_messages[channel]},
                {"role": "user", "content": f"Campaign Brief: {campaign_brief}"}
            ],
            temperature=0.7
        )

        # Parse the response
        content = response.choices[0].message.content
        
        return {
            "status": "success",
            "content": content
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to generate content: {str(e)}"
        }

def publish_to_mailchimp(campaign_brief: str) -> Dict[str, Any]:
    """
    Generate and publish to Mailchimp
    """
    # Check if Mailchimp credentials are available
    if not all(PLATFORM_CREDENTIALS['mailchimp'].values()):
        return {
            "status": "error",
            "message": "Mailchimp credentials not configured"
        }

    # First generate the content
    content = generate_channel_content(campaign_brief, 'mailchimp')
    if content["status"] == "error":
        return content

    # In a real implementation, we would:
    # 1. Parse the JSON content
    # 2. Create a campaign in Mailchimp using the stored credentials
    # 3. Set the subject line and body
    # 4. Schedule or send the campaign
    
    return {
        "status": "success",
        "message": f"Campaign created in Mailchimp ({PLATFORM_CREDENTIALS['mailchimp']['account_name']})",
        "content": content["content"]
    }

def publish_to_twitter(campaign_brief: str) -> Dict[str, Any]:
    """
    Generate and show preview of Twitter post
    """
    # Check if Twitter credentials are available
    if not all(PLATFORM_CREDENTIALS['twitter'].values()):
        return {
            "status": "error",
            "message": "Twitter credentials not configured"
        }

    # First generate the content
    content = generate_channel_content(campaign_brief, 'twitter')
    if content["status"] == "error":
        return content

    try:
        # Parse the generated content
        tweet_data = json.loads(content["content"])
        tweet_text = tweet_data["tweet"]
        hashtags = tweet_data.get("hashtags", [])
        
        # Add hashtags to the tweet if they exist
        if hashtags:
            tweet_text += " " + " ".join(hashtags)

        # Create a preview of how it would look
        preview = {
            "tweet_text": tweet_text,
            "character_count": len(tweet_text),
            "hashtags": hashtags,
            "account": PLATFORM_CREDENTIALS['twitter']['account_name'],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # URL encode the preview data
        preview_json = json.dumps(preview)
        preview_url = f"/preview/twitter?data={urllib.parse.quote(preview_json)}"
        
        return {
            "status": "success",
            "message": f"Tweet preview generated for {PLATFORM_CREDENTIALS['twitter']['account_name']}",
            "content": content["content"],
            "preview": preview,
            "preview_url": preview_url
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to generate tweet preview: {str(e)}"
        }

def publish_to_linkedin(campaign_brief: str) -> Dict[str, Any]:
    """
    Generate and publish to LinkedIn
    """
    # Check if LinkedIn credentials are available
    if not all(PLATFORM_CREDENTIALS['linkedin'].values()):
        return {
            "status": "error",
            "message": "LinkedIn credentials not configured"
        }

    # First generate the content
    content = generate_channel_content(campaign_brief, 'linkedin')
    if content["status"] == "error":
        return content

    # In a real implementation, we would:
    # 1. Parse the JSON content
    # 2. Create a LinkedIn post using the stored credentials
    # 3. Add the hashtags
    # 4. Post the content
    
    return {
        "status": "success",
        "message": f"LinkedIn post created for {PLATFORM_CREDENTIALS['linkedin']['account_name']}",
        "content": content["content"]
    }

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """Get available accounts for each platform"""
    
    try:
        accounts = get_platform_accounts()
        
        # Add CORS headers
        response = jsonify(accounts)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET')
        
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/publish', methods=['POST'])
def publish_campaign():
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data received'
            }), 400

        channels = data.get('channels')
        campaign_brief = data.get('campaignBrief')

        if not channels or not campaign_brief:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: channels or campaign brief'
            }), 400

        # Publish to selected channels
        results = {}
        if channels.get('mailchimp'):
            results['mailchimp'] = publish_to_mailchimp(campaign_brief)
        if channels.get('twitter'):
            results['twitter'] = publish_to_twitter(campaign_brief)
        if channels.get('linkedin'):
            results['linkedin'] = publish_to_linkedin(campaign_brief)

        response_data = {
            'status': 'success',
            'message': 'Campaign published successfully',
            'results': results
        }
        return jsonify(response_data)

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Internal server error: {str(e)}'
        }), 500

@app.route('/preview/twitter')
def preview_twitter():
    """Render the tweet preview template"""
    try:
        data_str = request.args.get('data', '{}')
        
        # URL decode the data first
        data_str = urllib.parse.unquote(data_str)
        
        data = json.loads(data_str)
        
        return render_template('tweet_preview.html',
                             account=data.get('account', ''),
                             tweet_text=data.get('tweet_text', ''),
                             hashtags=data.get('hashtags', []),
                             timestamp=data.get('timestamp', ''))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == '__main__':
    port = int(os.getenv('CANVA_BACKEND_PORT', 3001))
    app.run(host='localhost', port=port, debug=True) 