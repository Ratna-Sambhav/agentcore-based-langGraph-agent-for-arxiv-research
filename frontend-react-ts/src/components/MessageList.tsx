import { useState } from "react";
import type { MessageWithSteps, StreamStep } from "../types/ChatTypes";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
    messages: MessageWithSteps[];
    streamingSteps: StreamStep[];
    isLoadingHistory: boolean;
}

export function MessageList({ messages, streamingSteps, isLoadingHistory }: MessageListProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

    const toggleSteps = (index: number) => {
        setExpandedSteps(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    if (isLoadingHistory) {
        return (
            <div className="messages-container">
                <div className="loading-indicator">Loading chat history...</div>
            </div>
        );
    }

    return (
        <div className="messages-container">
            {messages.map((message, index) => (
                <MessageBubble
                    key={index}
                    message={message}
                    index={index}
                    isExpanded={expandedSteps.has(index)}
                    onToggleSteps={toggleSteps}
                />
            ))}

            {streamingSteps.length > 0 && (
                <MessageBubble
                    message={{
                        role: 'ai',
                        content: 'Processing...',
                        steps: streamingSteps
                    }}
                    index={-1}
                    isExpanded={true}
                    isStreaming={true}
                />
            )}
        </div>
    );
}