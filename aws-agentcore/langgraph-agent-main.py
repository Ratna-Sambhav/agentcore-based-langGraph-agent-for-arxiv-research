from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Dict, Literal
import asyncio
import os
import uuid
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage, AnyMessage
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field
from prompts import LLM_GUARDRAIL_PROMPT, TOPIC_CLASSIFIER_PROMPT, MAIN_TOOL_PROMPT
from langgraph_checkpoint_aws import AgentCoreMemorySaver, AgentCoreMemoryStore
from langgraph.graph.message import add_messages
from datetime import datetime, timedelta

from langchain_mcp_adapters.client import MultiServerMCPClient
from fetch_access_token import fetch_access_token

from typing import Annotated
from openai import OpenAI
from dotenv import load_dotenv
import logging
import sys

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout) # This is the critical part for AgentCore
    ]
)

logger = logging.getLogger(__name__)
load_dotenv()

try:
    client = OpenAI()
    gemini_chat = ChatGoogleGenerativeAI(
        api_key=os.getenv("GEMINI_API_KEY"),
        model="gemini-2.5-pro",
        temperature=0.7
    )
    gemini = ChatGoogleGenerativeAI(
        api_key=os.getenv("GEMINI_API_KEY"),
        model="gemini-2.5-pro",
        temperature=0.7
    )
except Exception as e:
    logger.info(f"Failed to initialize client: {e}")







# Global MCP tools storage (add this before your nodes)
mcp_tools_cache = {"tools": None, "expiry_time": None}

async def get_or_initialize_mcp_tools():
    """Initialize MCP tools once and cache them"""
    if mcp_tools_cache["tools"] is None or mcp_tools_cache["expiry_time"] < datetime.now():

        try:
            access_token, expires_in = fetch_access_token()
            client = MultiServerMCPClient({
                "research-paper-server": {
                    "transport": "http",
                    "url": os.getenv("GATEWAY_URL"),
                    "headers": {
                        "Authorization": f"Bearer {access_token}"
                    }
                }
            })

            # This gets ALL tools from that server automatically
            tools = await client.get_tools()  
            mcp_tools_cache["tools"] = tools
            mcp_tools_cache["expiry_time"] = datetime.now() + timedelta(seconds=expires_in)
            logger.info("MCP tools initialized successfully")
        
        except Exception as e:
            logger.info(f"Failed to initialize MCP tools: {e}")
    
    return mcp_tools_cache["tools"]










def check_query_safety(
    query: str,
) -> Literal["LLM_GUARDRAIL", "NO_GUARDRAIL"]:
    try:
        # Search the vector store
        results = client.vector_stores.search(
            vector_store_id=os.getenv("VECTOR_STORE_ID"),
            query=query,
        )
        matches = [i.score for i in results.data if i.score > 0.2]
        logger.info(f"Matching for harmful content done. Following matches found: {matches}")
        if not matches:
            return "LLM_GUARDRAIL"
        return "NO_GUARDRAIL"
        
    except Exception as e:
        logger.error(f"Error during safety check: {e}")
        return "NO_GUARDRAIL"


class MyAgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    user_input: str
    in_type: str
    llm_g: str
    no_g: str
    response: str
    pass_down: str
    block: str

class TopicClassifier(BaseModel):
    response: str = Field(description="Response to the user's query")
    pass_down: str = Field(description="Pass down to the research agent, either true or false")
class LGParser(BaseModel):
    block: str = Field(description="Block the user's query, either true or false")

topic_class_parser = PydanticOutputParser(pydantic_object=TopicClassifier)
lg_parser = PydanticOutputParser(pydantic_object=LGParser)
checkpointer = AgentCoreMemorySaver(os.getenv("MEMORY_ID"), region_name=os.getenv("AWS_REGION_NAME"))

store = AgentCoreMemoryStore(memory_id=os.getenv("MEMORY_ID"), region_name=os.getenv("AWS_REGION_NAME"))

## DEFINING THE NODES
async def entry_node(state: MyAgentState):
    logger.info("ENTRY NODE")
    return state

async def semanticGuardrail(state: MyAgentState) -> Dict:
    logger.info("SEMANTIC GUARDRAIL NODE")
    latest_query = state["messages"][-1].content
    in_type = check_query_safety(latest_query)
    return {
        "in_type": in_type,
        "messages": state["messages"]
        }


async def llmGuardrail(state: MyAgentState) -> Dict: 
    logger.info("LLM GUARDRAIL NODE")
    llm_guardrail_system_message = SystemMessage(content=LLM_GUARDRAIL_PROMPT)
    lg_prompt = ChatPromptTemplate.from_messages([llm_guardrail_system_message, MessagesPlaceholder(variable_name="messages")])
    lg_chain = lg_prompt | gemini_chat | lg_parser
    response = await lg_chain.ainvoke({"messages": state["messages"]})
    if response.block == "false":
        return {
            "block": response.block,
            "messages": state["messages"]
        }
    else:
        return {
            "messages": [AIMessage(content="Sorry, but you are not allowed to ask this question.")],
            "block": response.block
        }


async def noGuardrail(state: MyAgentState, config: RunnableConfig) -> Dict:
    logger.info("NO GUARDRAIL NODE")
    topic_classifier_system_message = SystemMessage(content=TOPIC_CLASSIFIER_PROMPT)
    tc_prompt = ChatPromptTemplate.from_messages([topic_classifier_system_message, MessagesPlaceholder(variable_name="messages")])
    tc_chain = tc_prompt | gemini_chat | topic_class_parser

    ## Retrieving and Updating the memories
    actor_id = config["configurable"]["actor_id"]
    thread_id = config["configurable"]["thread_id"]
    context = store.search(("preferences", actor_id), query=state["messages"][-1].content, limit=5)
    logger.info(f"***** Memory was retrieved: {context}")
    context = context if context else "No Info"
    state["messages"][-1].content = "Some Previous Info: " + context + "\n\n" + state["messages"][-1].content

    ## Putting the latest query into the memory
    store.put((actor_id, thread_id), str(uuid.uuid4()), {"message": state["messages"][-1]})
    logger.info("***** Human latest message was uploaded.")

    response = await tc_chain.ainvoke({"messages": state["messages"]})
    logger.info(f"***** Topic Classifier Response: {response}")
    if response.pass_down == "false":
        return {
            "messages": [AIMessage(content=response.response)],
            "pass_down": response.pass_down
        }
    else:
        return {
            "pass_down": response.pass_down,
            "messages": state["messages"]
        }


async def assembler(state: MyAgentState):
    logger.info("ASSEMBLER NODE")
    state["pass_down"] = state.get("pass_down")
    state["block"] = state.get("block")
    state["messages"] = state.get("messages")
    return state

async def mainToolLLM(state: MyAgentState, config: RunnableConfig):  # ADD config parameter
    logger.info("MAIN TOOL LLM NODE")
    # ADD THESE LINES to get MCP tools from config:
    mcp_tools = config.get("configurable", {}).get("mcp_tools", [])
    
    gemini_with_all_tools = gemini.bind_tools(mcp_tools)
    
    promptTemplate = ChatPromptTemplate.from_messages([
        SystemMessage(content=MAIN_TOOL_PROMPT), 
        MessagesPlaceholder(variable_name="messages")
    ])
    chain = promptTemplate | gemini_with_all_tools  # Use gemini_with_all_tools
    response = await chain.ainvoke({"messages": state["messages"]})
    return {
        "messages": [response]
    }

async def toolNode(state: MyAgentState, config: RunnableConfig):  # ADD config parameter
    logger.info("TOOL NODE")
    # ADD THIS LINE to get MCP tools from config:
    mcp_tools = config.get("configurable", {}).get("mcp_tools", [])
    
    result = []
    for tool_call in state["messages"][-1].tool_calls:
        tool_name = tool_call["name"]
        
        # Check if it's a custom tool (your existing logic)
        if mcp_tools:
            mcp_tool = next((t for t in mcp_tools if t.name == tool_name), None)
            if mcp_tool:
                observation = await mcp_tool.ainvoke(tool_call["args"])
                result.append(ToolMessage(content=observation, tool_call_id=tool_call["id"]))
            else:
                result.append(ToolMessage(
                    content=f"Tool {tool_name} not found", 
                    tool_call_id=tool_call["id"]
                ))
        else:
            result.append(ToolMessage(
                content=f"Tool {tool_name} not found", 
                tool_call_id=tool_call["id"]
            ))
    
    return {"messages": result}



## BUILDING THE GRAPH
graph = StateGraph(MyAgentState)

graph.add_node("semantic_guardrail", semanticGuardrail)
graph.add_node("llm_guardrail", llmGuardrail)
graph.add_node("no_guardrail", noGuardrail)
graph.add_node("assembler", assembler)
graph.add_node("main_tool_llm", mainToolLLM)
graph.add_node("tool_node", toolNode)

def route_decision1(state: MyAgentState):
    if state["in_type"] == "END":
        return "END"
    elif state["in_type"] == "LLM_GUARDRAIL":
        return ["LLM_GUARDRAIL", "NO_GUARDRAIL"]
    elif state["in_type"] == "NO_GUARDRAIL":
        return "NO_GUARDRAIL"
def route_decision2(state: MyAgentState):
    if state["block"] == "true":
        return "END"
    elif state["pass_down"] == "false":
        return "END"
    elif state["pass_down"] == "true":
        return "pass"
    else:
        return "END"
def route_decision3(state: MyAgentState):

    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tool_node"
    else:
        return "END"


# fan-out
graph.add_edge(START, "semantic_guardrail")
graph.add_conditional_edges(
    "semantic_guardrail",
    route_decision1,
    {
        "END": END,
        "LLM_GUARDRAIL": "llm_guardrail",
        "NO_GUARDRAIL": "no_guardrail",
    },
)

graph.add_edge("llm_guardrail", "assembler")
graph.add_edge("no_guardrail", "assembler")
graph.add_conditional_edges(
    "assembler",
    route_decision2,
    {
        "END": END,
        "pass": "main_tool_llm",
    },
)
graph.add_conditional_edges(
    "main_tool_llm",
    route_decision3,
    {
        "END": END,
        "tool_node": "tool_node",
    },
)
graph.add_edge("tool_node", "main_tool_llm")
app = graph.compile(checkpointer=checkpointer)



async def get_session_history(actor_id: str, thread_id: str):
    
    config = {
        "configurable": {
            "thread_id": thread_id, 
            "actor_id": actor_id
        }
    }

    state = await app.aget_state(config)
    if "messages" not in state.values:
        return []
    return state.values["messages"]
    

async def stream_response(query: str, actor_id: str, thread_id: str):

    mcp_tools = await get_or_initialize_mcp_tools()
    
    config = {
        "configurable": {
            "thread_id": thread_id, 
            "actor_id": actor_id,
            "mcp_tools": mcp_tools
        }
    }
    logger.info(f"Invoking agent for following Config: \nThread ID: {thread_id}\nActor ID: {actor_id}")

    # Rest of your existing main() code stays the same...
    async for message_chunk in app.astream(
        {"messages": [HumanMessage(content=query)]},
        config=config,
        stream_mode="updates",  
    ):
        for step, data in message_chunk.items():
            yield f"step: {step} \nContent: {data['messages'][-1].content_blocks}"





## FASTAPI RELATED CODE
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime
from fastapi.responses import StreamingResponse
import asyncio

fapi_app = FastAPI(title="Agent Server")

class InvocationRequest(BaseModel):
    input: dict

@fapi_app.post("/invocations")
async def invoke_agent(request: InvocationRequest):
    try:
        user_message = request.input.get("prompt", "")
        actor_id = request.input.get("actor_id", "")
        thread_id = request.input.get("thread_id", "")
        if user_message == "#*HIST*#":
            return await get_session_history(actor_id, thread_id)
        return StreamingResponse(stream_response(user_message, actor_id, thread_id))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")

@fapi_app.get("/ping")
async def ping():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(fapi_app, host="0.0.0.0", port=8080)