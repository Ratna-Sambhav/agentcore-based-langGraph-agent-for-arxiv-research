import boto3
import base64
import subprocess
import sys
import os
from dotenv import load_dotenv
load_dotenv("")

# Configuration
REGION = os.getenv("REGION")
IMAGE_TAG = os.getenv("IMAGE_TAG")
ecr_client = boto3.client('ecr', region_name=REGION)
account_id = os.getenv("ACCOUNT_ID")



def create_ecr_repository(repo_name):
    """Create ECR repository if it doesn't exist"""
    response = ecr_client.create_repository(
        repositoryName=repo_name,
        imageScanningConfiguration={'scanOnPush': True},
        imageTagMutability='MUTABLE'
    )
    print(f"✓ Created repository: {repo_name}")
    return response['repository']['repositoryUri']

def get_ecr_login_credentials(ecr_client):
    """Get ECR login credentials"""
    response = ecr_client.get_authorization_token()
    auth_data = response['authorizationData'][0]
    
    # Decode the authorization token
    auth_token = base64.b64decode(auth_data['authorizationToken']).decode('utf-8')
    username, password = auth_token.split(':')
    registry_url = auth_data['proxyEndpoint']
    
    return username, password, registry_url

def docker_login(username, password, registry_url):
    """Login to Docker registry"""
    try:
        cmd = f'echo {password} | sudo docker login --username {username} --password-stdin {registry_url}'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Successfully logged in to ECR")
            return True
        else:
            print(f"✗ Docker login failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error during docker login: {e}")
        return False

def build_and_push_image(repository_uri, tag, platform='linux/arm64'):
    """Build and push Docker image to ECR"""
    full_image_name = f"{repository_uri}:{tag}"
    
    print(f"\nBuilding image for platform: {platform}")
    build_cmd = [
        'sudo', 'docker', 'buildx', 'build',
        '--platform', platform,
        '-t', full_image_name,
        '--push',
        '.'
    ]
    
    try:
        result = subprocess.run(build_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Successfully built and pushed: {full_image_name}")
            return True
        else:
            print(f"✗ Build/push failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error during build/push: {e}")
        return False

def verify_image(ecr_client, repo_name, tag):
    """Verify the image was pushed successfully"""
    try:
        response = ecr_client.describe_images(
            repositoryName=repo_name,
            imageIds=[{'imageTag': tag}]
        )
        
        if response['imageDetails']:
            image = response['imageDetails'][0]
            print(f"\n✓ Image verified in ECR:")
            print(f"  - Digest: {image['imageDigest']}")
            print(f"  - Size: {image['imageSizeInBytes'] / (1024*1024):.2f} MB")
            print(f"  - Pushed: {image['imagePushedAt']}")
            return True
        else:
            print(f"✗ Image not found in repository")
            return False
    except Exception as e:
        print(f"✗ Error verifying image: {e}")
        return False




if __name__ == "__main__":

    print("Step 1: Creating ECR repository...")
    REPOSITORY_NAME = 'arxiv-research-agent2'
    repository_uri = create_ecr_repository(REPOSITORY_NAME)
    print("Repository URI: ", repository_uri)
    
    print("\nStep 2: Getting ECR login credentials...")
    username, password, registry_url = get_ecr_login_credentials(ecr_client)
    print("Username: ", username)
    print("Password: ", password)
    print("Registry URL: ", registry_url)
    
    print("Step 3: Logging in to Docker...")
    if not docker_login(username, password, registry_url):
        sys.exit(1)
    
    print("\nStep 4: Building and pushing Docker image...")
    if not build_and_push_image(repository_uri, IMAGE_TAG):
        sys.exit(1)
    
    if not verify_image(ecr_client, REPOSITORY_NAME, IMAGE_TAG):
        sys.exit(1)