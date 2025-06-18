import openai
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from backend/.env
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / '.env')

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

try:
    # Try a simple completion
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "Say hello!"}
        ]
    )
    print("\nAPI Test Successful!")
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("\nError:", str(e)) 