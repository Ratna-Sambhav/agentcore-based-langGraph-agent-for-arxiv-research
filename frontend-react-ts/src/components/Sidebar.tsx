import { Trash2 } from "lucide-react";
import type { ChatSession } from "../types/ChatTypes";
import { authService } from "../api/AuthCognito";

interface SidebarProps {
    sessions: ChatSession[];
    currentSessionId: string;
    onNewChat: () => void;
    onSessionClick: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    isDisabled: boolean;
}

export function Sidebar({
    sessions,
    currentSessionId,
    onNewChat,
    onSessionClick,
    onDeleteSession,
    isDisabled
}: SidebarProps) {
    const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat session?')) {
            onDeleteSession(sessionId);
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <button
                    onClick={onNewChat}
                    disabled={isDisabled}
                    className="new-chat-button"
                >
                    New Chat
                </button>
            </div>

            <div className="sessions-list">
                {sessions.map((session) => (
                    <div
                        key={session.sessionId}
                        onClick={() => onSessionClick(session.sessionId)}
                        className={`session-item ${currentSessionId === session.sessionId ? 'active' : ''}`}
                    >
                        <div className="session-info">
                            <div className="session-id">
                                {session.sessionId}
                            </div>
                            <div className="session-timestamp">
                                {new Date(session.timestamp).toLocaleString()}
                            </div>
                        </div>
                        <button
                            className="delete-session-button"
                            onClick={(e) => handleDeleteClick(e, session.sessionId)}
                            aria-label="Delete session"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="sidebar-footer">
                <button
                    onClick={authService.handleSignOut}
                    className="logout-button"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}