import aioboto3
import boto3
import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime
from fastapi.responses import StreamingResponse
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from auth import get_current_user


app = FastAPI(title="Agent Local Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv(override=True)

session = aioboto3.Session()
agent_core_client = boto3.client('bedrock-agentcore', region_name='us-east-1')

class InvocationRequest(BaseModel):
    input: Dict[str, Any]


async def stream_agent_response(prompt: str, actor_id: str, thread_id: str):
    
    async with session.client('bedrock-agentcore', region_name='us-east-1') as client:
        response = await client.invoke_agent_runtime(
            agentRuntimeArn=os.getenv("AGENT_RUNTIME_ID"),
            runtimeSessionId=os.getenv("RUNTIME_SESSION_ID"),
            payload=json.dumps({"input": {"prompt": prompt, "actor_id": actor_id, "thread_id": thread_id}}).encode(),
            qualifier="DEFAULT"
        )
        
        async for chunk in response['response']:
            decoded = chunk.decode('utf-8')
            print(f"Yielding chunk: {decoded}")
            yield decoded + "\n"  # Add newline to help with buffering
            await asyncio.sleep(0)  # Force immediate flush


async def getHistory(actor_id: str, thread_id: str):

    print("INVOKING GET HISTORY ENDPOINT **********************************************************************")
    print("actor_id: ", actor_id)
    print("thread_id: ", thread_id)

    response = agent_core_client.invoke_agent_runtime(
        agentRuntimeArn=os.getenv("AGENT_RUNTIME_ID"),
        runtimeSessionId=os.getenv("RUNTIME_SESSION_ID"),
        payload=json.dumps({"input": {"prompt": "#*HIST*#", "actor_id": actor_id, "thread_id": thread_id}}),
        qualifier="DEFAULT"
    )

    response_body = response['response'].read()
    response_data = json.loads(response_body)
    return response_data


@app.post("/invocations")
async def invoke_agent(
    request: InvocationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Invoke agent endpoint with JWT token validation
    The current_user dependency will automatically validate the token
    """
    try:
        # Log the authenticated user info (optional)
        print(f"Authenticated user: {current_user.get('sub')} - {current_user.get('email', 'N/A')}")
        
        user_message = request.input.get("prompt", "")
        actor_id = request.input.get("actor_id", "")
        thread_id = request.input.get("thread_id", "")
        
        if user_message == "#*HIST*#":
            return await getHistory(actor_id, thread_id)

        if user_message == "":
            return ""

        return StreamingResponse(
            stream_agent_response(user_message, actor_id, thread_id),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint (no auth required)"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)