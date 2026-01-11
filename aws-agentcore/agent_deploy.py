import boto3
import os
from dotenv import load_dotenv
load_dotenv("")

client = boto3.client('bedrock-agentcore-control', region_name='us-east-1')

response = client.create_agent_runtime(
    agentRuntimeName='arxiv_research_agent',
    agentRuntimeArtifact={
        'containerConfiguration': {
            'containerUri': os.getenv("CONTAINER_URI")
        }
    },
    networkConfiguration={"networkMode": "PUBLIC"},
    roleArn=os.getenv("ROLE_ARN")
)

print(f"Agent Runtime created successfully!")
print(f"Agent Runtime ARN: {response['agentRuntimeArn']}")
print(f"Status: {response['status']}")