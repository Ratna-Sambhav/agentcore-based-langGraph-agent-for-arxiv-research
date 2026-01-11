import os
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv

load_dotenv(override=True)

# Load Cognito configuration from environment
COGNITO_REGION = os.getenv("COGNITO_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

# Construct the JWKS URL
COGNITO_JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
security = HTTPBearer()

def verify_cognito_token(token: str) -> Dict[str, Any]:
    """
    Verify JWT token from AWS Cognito
    """
    try:
        # Get the JWKS from Cognito
        jwks_client = PyJWKClient(COGNITO_JWKS_URL)
        
        # Get the signing key from the token
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and verify the token
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID,
            options={"verify_exp": True}
        )
        
        return decoded_token
    
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print("Invalid token")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        print("Token validation failed")
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to extract and verify the JWT token from Authorization header
    """
    token = credentials.credentials
    return verify_cognito_token(token)