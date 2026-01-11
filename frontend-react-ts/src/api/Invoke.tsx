import type { InvokeInput, InvokeForHistory, Message } from "../types/ChatTypes";
import { authService } from "../api/AuthCognito";

export const BackendInvoke = {
    // Helper function to get token and make authenticated request
    async makeAuthenticatedRequest(url: string, payload: any, isStreaming: boolean = false) {
        let token = sessionStorage.getItem("id_key");

        if (!token) {
            throw new Error("No authentication token found");
        }

        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

        let response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        // If unauthorized (401), try to renew token and retry
        if (response.status === 401) {
            console.log("Token expired, attempting to renew...");

            const refreshToken = sessionStorage.getItem("refresh_token");
            if (!refreshToken) {
                throw new Error("No refresh token found");
            }

            // Renew the JWT token
            const renewed = await authService.renewJWT(refreshToken);

            if (!renewed) {
                throw new Error("Failed to renew token");
            }

            // Get the new token
            token = sessionStorage.getItem("id_key");
            if (!token) {
                throw new Error("Failed to get new token after renewal");
            }

            // Retry the request with new token
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    },

    // Invoke the agent for chat history
    async getHistory(Request: InvokeForHistory): Promise<Message[]> {
        try {
            const payload = {
                input: {
                    prompt: "#*HIST*#",
                    actor_id: Request.actor_id,
                    thread_id: Request.thread_id
                }
            };

            const response = await this.makeAuthenticatedRequest(
                "http://localhost:8080/invocations",
                payload
            );

            const bResponse = await response.json();
            const ChatHistory: Message[] = bResponse.map((item: any) => {
                let contentStr = '';

                // Handle content that might be an array or string
                if (Array.isArray(item.content)) {
                    // Extract text from array format: [{'type': 'text', 'text': '...'}]
                    const textContent = item.content.find((c: any) => c.type === 'text');
                    contentStr = textContent?.text || '';
                } else if (typeof item.content === 'string') {
                    contentStr = item.content;
                }

                // Remove "Some Previous Info: No Info" if present
                contentStr = contentStr.replace(/Some Previous Info: No Info\s*/g, '').trim();

                return {
                    role: item.type,
                    content: contentStr
                };
            });
            return ChatHistory;
        } catch (error) {
            console.error("Error invoking agent:", error);
            return []; // Return empty array instead of error
        }
    },

    async invokeAgentAsync(request: InvokeInput, onChunk?: (chunk: string) => void) {
        try {
            const payload = {
                input: {
                    prompt: request.prompt,
                    actor_id: request.actor_id,
                    thread_id: request.thread_id
                }
            };

            const response = await this.makeAuthenticatedRequest(
                "http://localhost:8080/invocations",
                payload,
                true
            );

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";
            let buffer = "";
            let chunkCount = 0;

            while (true) {
                const { value, done } = await reader.read();

                // DON'T break immediately - process what we have first
                if (value && value.length > 0) {
                    chunkCount++;
                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    if (onChunk) {
                        onChunk(chunk);
                    }
                    fullText += chunk;
                }

                if (done) {
                    // Process any remaining buffer
                    if (buffer && onChunk) {
                        onChunk(buffer);
                    }
                    break;
                }
            }

            return fullText;
        } catch (error) {
            throw error;
        }
    }
}