import { useState } from "react";
import type { MessageWithSteps, StreamStep } from "../types/ChatTypes";
import { MessageList } from "./MessageList";

interface ChatInterfaceProps {
    currentSessionId: string;
    messages: MessageWithSteps[];
    streamingSteps: StreamStep[];
    isLoadingHistory: boolean;
    isDisabled: boolean;
    onSendMessage: (message: string) => void;
}

export function ChatInterface({
    currentSessionId,
    messages,
    streamingSteps,
    isLoadingHistory,
    isDisabled,
    onSendMessage
}: ChatInterfaceProps) {
    const [userInput, setUserInput] = useState('');

    const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        if (!userInput.trim()) return;

        onSendMessage(userInput);
        setUserInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <>
            <div className="chat-header">
                <h1 className="chat-title">{currentSessionId}</h1>
            </div>

            <MessageList
                messages={messages}
                streamingSteps={streamingSteps}
                isLoadingHistory={isLoadingHistory}
            />

            <div className="input-area">
                <div className="input-wrapper">
                    <input
                        type="text"
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isDisabled || !currentSessionId}
                        placeholder={currentSessionId ? "Type your message..." : "Create or select a chat first"}
                        className="message-input"
                    />
                    <button
                        onClick={() => handleSubmit()}
                        disabled={isDisabled || !userInput.trim() || !currentSessionId}
                        className="send-button"
                    >
                        Send
                    </button>
                </div>
            </div>
        </>
    );
}