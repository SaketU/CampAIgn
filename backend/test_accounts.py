import requests
import json
from pprint import pprint

def test_accounts_endpoint():
    # Test the accounts endpoint
    url = "http://localhost:3001/api/accounts"
    print(f"\nTesting endpoint: {url}")
    
    try:
        # Make the request
        response = requests.get(url)
        
        # Print response status
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        # Try to parse and print the JSON response
        try:
            data = response.json()
            print("\nResponse Data:")
            print("=============")
            
            # Print each platform's data
            for platform, account in data.items():
                print(f"\n{platform.upper()}:")
                print(f"  Account Name: {account.get('account_name')}")
                print(f"  Is Connected: {account.get('is_connected')}")
                print("  Credentials:")
                for cred_name, cred_value in account.get('credentials', {}).items():
                    print(f"    - {cred_name}: {'✓ Present' if cred_value else '✗ Missing'}")
            
        except json.JSONDecodeError:
            print("Error: Response is not valid JSON")
            print("Raw response:", response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")

if __name__ == "__main__":
    test_accounts_endpoint() 