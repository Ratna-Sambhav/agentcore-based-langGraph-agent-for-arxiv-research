import { useEffect, useState } from "react";
import type { ServiceCredentials } from "../types/loginTypes";
import { idPoolService } from "../api/IdPoolCognito";
import "./Dashboard.css";
import { Sidebar } from "../components/Sidebar";
import { ChatInterface } from "../components/ChatInterface";
import { BlogDisplay } from "../components/BlogDisplay";
import { useSessionManagement } from "../hooks/useSessionManagement";
import { useChatManagement } from "../hooks/useChatManagement";

function Dashboard() {
    const [IdentityId, setIdentityId] = useState('');
    const [Credentials, setCredentials] = useState<ServiceCredentials>();

    // Initialize credentials
    useEffect(() => {
        async function init() {
            const id_key = sessionStorage.getItem("id_key");
            if (!id_key) return;

            const identityId = await idPoolService.GetId(id_key);
            if (!identityId) return;

            const credentials = await idPoolService.GetCredentials(id_key, identityId);
            if (!credentials) return;

            setIdentityId(identityId);
            setCredentials(credentials as ServiceCredentials);
        }
        init();
    }, []);

    // Session management hook
    const { sessions, createNewSession, deleteSession } = useSessionManagement(Credentials, IdentityId);

    // Chat management hook
    const {
        messages,
        currentSessionId,
        isLoadingHistory,
        streamingSteps,
        handleSessionClick,
        sendMessage,
        setSession
    } = useChatManagement(IdentityId);

    const handleNewChat = async () => {
        const newSession = await createNewSession();
        if (newSession) {
            setSession(newSession.sessionId);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        const success = await deleteSession(sessionId);
        if (success && currentSessionId === sessionId) {
            setSession("");
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={handleNewChat}
                onSessionClick={handleSessionClick}
                onDeleteSession={handleDeleteSession}
                isDisabled={!Credentials}
            />

            <div className="main-chat-area">
                {!currentSessionId ? (
                    <BlogDisplay />
                ) : (
                    <ChatInterface
                        currentSessionId={currentSessionId}
                        messages={messages}
                        streamingSteps={streamingSteps}
                        isLoadingHistory={isLoadingHistory}
                        isDisabled={!Credentials}
                        onSendMessage={sendMessage}
                    />
                )}
            </div>
        </div>
    );
}

export default Dashboard;