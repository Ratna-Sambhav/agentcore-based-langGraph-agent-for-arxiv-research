import type { MessageWithSteps } from "../types/ChatTypes";
import { parseContent, shouldShowContent } from "../utils/messageUtils";

interface MessageBubbleProps {
    message: MessageWithSteps;
    index: number;
    isExpanded?: boolean;
    isStreaming?: boolean;
    onToggleSteps?: (index: number) => void;
}

export function MessageBubble({
    message,
    index,
    isExpanded = false,
    isStreaming = false,
    onToggleSteps
}: MessageBubbleProps) {
    return (
        <div className={`message-wrapper ${message.role}`}>
            {message.role === 'ai' && message.steps && message.steps.length > 0 && (
                <div className="message-with-steps">
                    <div
                        className={`steps-toggle ${isStreaming ? 'streaming' : ''}`}
                        onClick={() => onToggleSteps && onToggleSteps(index)}
                    >
                        {!isStreaming && (
                            <span className="toggle-icon">
                                {isExpanded ? '▼' : '▶'}
                            </span>
                        )}
                        <span className="steps-indicator">
                            {isStreaming ? `Processing... ${message.steps.length} steps` : `${message.steps.length} processing steps`}
                        </span>
                    </div>

                    {isExpanded && (
                        <div className="steps-container">
                            {message.steps.map((step, stepIndex) => (
                                <div key={stepIndex} className="step-item">
                                    <div className="step-header">
                                        <span className="step-checkmark">✓</span>
                                        <span className="step-name">{step.step}</span>
                                    </div>
                                    {shouldShowContent(step.step) && (
                                        <div className="step-content">
                                            {parseContent(step.content)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className={`message-bubble ${message.role}`}>
                <div className="message-content">
                    {message.content}
                </div>
            </div>
        </div>
    );
}