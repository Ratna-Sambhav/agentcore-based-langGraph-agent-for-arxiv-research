import { useState } from "react";
import type { MessageWithSteps, StreamStep, InvokeInput, InvokeForHistory } from "../types/ChatTypes";
import { BackendInvoke } from "../api/Invoke";
import { parseStreamChunk, parseContent } from "../utils/messageUtils";

export function useChatManagement(IdentityId?: string) {
    const [messages, setMessages] = useState<MessageWithSteps[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [streamingSteps, setStreamingSteps] = useState<StreamStep[]>([]);

    const loadChatHistory = async (sessionId: string) => {
        if (!IdentityId) return [];

        try {
            const historyRequest: InvokeForHistory = {
                actor_id: IdentityId.split(":")[1],
                thread_id: sessionId
            };

            const history = await BackendInvoke.getHistory(historyRequest);

            if (history instanceof Error) {
                console.error("Error fetching history:", history);
                return [];
            }

            return history;
        } catch (error) {
            console.error("Error loading chat history:", error);
            return [];
        }
    };

    const handleSessionClick = async (sessionId: string) => {
        setCurrentSessionId(sessionId);
        setIsLoadingHistory(true);
        try {
            const chatHistory = await loadChatHistory(sessionId);
            setMessages(chatHistory);
        } catch (error) {
            console.error("Error loading chat history:", error);
            setMessages([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const sendMessage = async (userInput: string) => {
        if (!userInput.trim() || !currentSessionId || !IdentityId) return;

        const userMessage: MessageWithSteps = {
            role: 'human',
            content: userInput,
        };

        setMessages(prev => [...prev, userMessage]);
        setStreamingSteps([]);

        const chatInput: InvokeInput = {
            prompt: userInput,
            actor_id: IdentityId.split(":")[1],
            thread_id: currentSessionId
        };

        let accumulatedSteps: StreamStep[] = [];

        try {
            await BackendInvoke.invokeAgentAsync(chatInput, (chunk: string) => {
                console.log("Received chunk:", chunk);

                const parsedSteps = parseStreamChunk(chunk);
                if (parsedSteps.length > 0) {
                    console.log("Parsed steps:", parsedSteps);

                    if (parsedSteps.length <= 2) {
                        accumulatedSteps = [...accumulatedSteps, ...parsedSteps];
                        setStreamingSteps(accumulatedSteps);
                    }
                }
            });

            setStreamingSteps([]);

            if (accumulatedSteps.length > 0) {
                let finalContent = '';
                for (let i = accumulatedSteps.length - 1; i >= 0; i--) {
                    const parsedContent = parseContent(accumulatedSteps[i].content);
                    if (parsedContent && parsedContent.trim()) {
                        finalContent = parsedContent;
                        break;
                    }
                }

                const aiMessage: MessageWithSteps = {
                    role: 'ai',
                    content: finalContent,
                    steps: accumulatedSteps
                };

                setMessages(prev => [...prev, aiMessage]);
            }

        } catch (error) {
            console.error("Error sending message:", error);
            setStreamingSteps([]);

            const errorMessage: MessageWithSteps = {
                role: 'ai',
                content: 'Sorry, there was an error processing your request.',
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const setSession = (sessionId: string) => {
        setCurrentSessionId(sessionId);
        setMessages([]);
    };

    return {
        messages,
        currentSessionId,
        isLoadingHistory,
        streamingSteps,
        handleSessionClick,
        sendMessage,
        setSession
    };
}