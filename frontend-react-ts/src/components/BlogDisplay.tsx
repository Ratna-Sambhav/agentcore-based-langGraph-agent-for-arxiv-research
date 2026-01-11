import blog1 from "../assets/blog1.png";
import blog2 from "../assets/blog2.jpg";

export function BlogDisplay() {
    return (
        <div className="blog-container">
            <div className="blog-header">
                <h1 className="blog-title">
                    Building Production-Grade Autonomous Research: A Multi-Node Agent Framework with LangGraph and AWS Bedrock AgentCore
                </h1>
            </div>

            <div className="blog-content">
                <p className="blog-intro">
                    I built a production-grade autonomous system that utilizes LangGraph, Google Gemini 2.5 Pro, and
                    AWS Bedrock AgentCore to turn complex academic exploration into a structured, self-correcting workflow.
                    This architecture leverages integrated long-short term memory for deep context retention and the Model Context Protocol (MCP)
                    to orchestrate specialized AWS Lambda tools for high-precision paper search and data extraction.
                </p>

                <section className="blog-section">
                    <h2>1. Inside the Brain: The LangGraph Orchestration</h2>
                    <p>
                        The architecture of Nexus Scholar is designed to move away from linear execution and toward a state-aware, iterative graph.
                    </p>

                    <img src={blog1} alt="LangGraph Architecture" className="blog-image" />

                    <h3>The Tool-Loop: Iterative Reasoning</h3>
                    <p>
                        At the heart of the agent lies the loop between the main_tool_llm and the tool_node. Unlike standard RAG, the Gemini 2.5 Pro engine doesn't just guess an answer. If the user's query requires external data, the LLM emits a tool_call. The graph routes this to the tool_node, executes the request via MCP, and feeds the observation back to the LLM. This loop continues until the agent has sufficient information to synthesize a final response.
                    </p>

                    <h3>The Semantic Guardrail: Intelligent Routing</h3>
                    <p>
                        Before any research begins, the semantic_guardrail node acts as the "Air Traffic Controller." It performs a vector search against an OpenAI Vector Store containing "allowed" research domains.
                    </p>
                    <ul>
                        <li>If the search returns a high similarity score (threshold &gt; 0.2), the query is deemed safe and routed to the no_guardrail node.</li>
                        <li>If the score is low, indicating a potential deviation from research topics, the system triggers the llm_guardrail for a deeper safety inspection.</li>
                    </ul>

                    <h3>Parallel Async Execution & Fan-Out</h3>
                    <p>
                        One of the most powerful features of this architecture is the Fan-out logic. In route_decision1, if the system detects a need for heightened scrutiny, it returns a list: ["LLM_GUARDRAIL", "NO_GUARDRAIL"].
                    </p>
                    <p>
                        Because these are async nodes, LangGraph executes them in parallel. This allows the system to simultaneously determine if the query is safe (llm_guardrail) while the no_guardrail node concurrently checks if the query can be answered using historical context. The assembler node then acts as a synchronization point, merging these parallel states before proceeding.
                    </p>

                    <h3>The "No Guardrail" History Specialist</h3>
                    <p>
                        The no_guardrail node isn't just a bypass; it's a context specialist. It uses a Topic Classifier to determine if the user is asking something that was already discussed. By searching the long-term memory store, it can decide to answer the user immediately—saving time and compute—without ever invoking the expensive research tools.
                    </p>
                </section>

                <section className="blog-section">
                    <h2>2. Integrated Memory: Persistence via Bedrock AgentCore</h2>
                    <p>
                        Traditional agents lose their "soul" the moment the session ends. Nexus Scholar uses a dual-layered memory system integrated directly from AWS Bedrock AgentCore:
                    </p>
                    <ul>
                        <li><strong>Short-Term Memory (AgentCoreMemorySaver):</strong> This acts as our graph's checkpointer. It saves the exact state of the TypedDict after every node execution. If a tool call takes too long or a connection flickers, the agent resumes exactly where it left off.</li>
                        <li><strong>Long-Term Memory (AgentCoreMemoryStore):</strong> This is our semantic memory layer. It stores user preferences and historical interactions across different threads. In the no_guardrail node, I perform a semantic search against this store to inject "Previous Info" into the prompt, making the agent feel truly personalized.</li>
                    </ul>
                </section>

                <section className="blog-section">
                    <h2>3. The Hands: MCP-Powered Lambda Tools</h2>
                    <img src={blog2} alt="MCP Architecture" className="blog-image" />

                    <p>
                        To give the agent real-world utility, I implemented the Model Context Protocol (MCP). This allows the agent to treat remote AWS Lambda functions as local tools.
                    </p>
                    <p>
                        Using the MultiServerMCPClient, the agent fetches an access token and connects to a Gateway URL. This enables two high-performance research tools:
                    </p>
                    <ul>
                        <li><strong>ArXiv Paper Finder:</strong> A tool that interfaces with the ArXiv API to find the most recent and relevant papers based on complex search queries.</li>
                        <li><strong>Section-Wise Extractor:</strong> A specialized tool that navigates the HTML version of ArXiv papers. Instead of dumping a 50-page PDF into the context window, it extracts specific sections (like "Methodology" or "Results"), allowing the agent to perform granular analysis without hitting token limits.</li>
                    </ul>
                </section>

                <section className="blog-section">
                    <h2>4. Deployment: Containerized Efficiency</h2>
                    <p>The deployment pipeline is built for speed and reliability:</p>
                    <ul>
                        <li><strong>The Environment:</strong> I used the uv package manager for ultra-fast dependency resolution.</li>
                        <li><strong>The Build:</strong> The agent is packaged into a Docker container targeting the linux/arm64 platform (optimized for AWS Graviton).</li>
                        <li><strong>The Registry:</strong> The image is pushed to AWS ECR.</li>
                        <li><strong>The Runtime:</strong> Finally, the agent is deployed using the bedrock-agentcore-control client, which creates a managed Agent Runtime. This allows the agent to scale automatically while providing a dedicated ARN for the backend to invoke.</li>
                    </ul>
                </section>

                <section className="blog-section">
                    <h2>5. Security and the Frontend</h2>
                    <p>
                        The user interface is a modern React application, but the real story is the security layer.
                    </p>
                    <ul>
                        <li><strong>Authentication:</strong> I used AWS Cognito to manage user identities and secure the API endpoints.</li>
                        <li><strong>Session Persistence:</strong> While AgentCore handles the LLM state, the frontend communicates with AWS DynamoDB to store session names and metadata. This allows users to see a history of their research "projects" and resume them instantly, with all security measures in place to ensure users can only access their own data.</li>
                    </ul>
                </section>

                <div className="blog-conclusion">
                    <p>
                        Nexus Scholar isn't just an LLM with tools—it's a demonstration of how modular graph architectures and managed cloud memory can create an AI partner that is both safe and remarkably capable.
                    </p>
                </div>
            </div>
        </div>
    );
}