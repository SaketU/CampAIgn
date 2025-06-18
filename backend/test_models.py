import openai
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from backend/.env
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / '.env')

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# List all models
models = openai.Model.list()
print("\nAvailable Models:")
for model in models.data:
    print(f"- {model.id}") 