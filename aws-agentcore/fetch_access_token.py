import requests
import os
from dotenv import load_dotenv
load_dotenv()

def fetch_access_token():
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    token_url = os.getenv("TOKEN_URL")
    response = requests.post(
        token_url,
        data="grant_type=client_credentials&client_id={client_id}&client_secret={client_secret}".format(client_id=client_id, client_secret=client_secret),
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    expires_in = response.json()['expires_in']
    access_token = response.json()['access_token']
    return access_token, expires_in

if __name__ == "__main__":
    print(fetch_access_token())