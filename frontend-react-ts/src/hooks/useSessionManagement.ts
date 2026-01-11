import { useState, useEffect } from "react";
import type { ServiceCredentials } from "../types/loginTypes";
import type { ChatSession } from "../types/ChatTypes";
import { DynamoService } from "../api/DynamoDb";

export function useSessionManagement(Credentials?: ServiceCredentials, IdentityId?: string) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);

    useEffect(() => {
        if (Credentials && IdentityId) {
            loadSessions();
        }
    }, [Credentials, IdentityId]);

    const loadSessions = async () => {
        if (!Credentials || !IdentityId) return;
        try {
            const sessionsData = await DynamoService.dynamoGet(Credentials, IdentityId);

            const parsed = sessionsData.map((item: string) => {
                try {
                    return JSON.parse(item);
                } catch (error) {
                    return null;
                }
            }).filter(Boolean);

            const dataArray = Array.isArray(parsed) ? parsed : [];

            const validSessions = dataArray.filter((item: any) => {
                return (
                    item &&
                    typeof item === 'object' &&
                    typeof item.sessionId === 'string' &&
                    typeof item.timestamp === 'string'
                );
            });

            const sortedSessions = validSessions.sort((a: ChatSession, b: ChatSession) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });

            setSessions(sortedSessions);
        } catch (error) {
            console.error("Error loading sessions:", error);
            setSessions([]);
        }
    };

    const createNewSession = async (): Promise<ChatSession | null> => {
        if (!Credentials || !IdentityId) return null;

        const newSession: ChatSession = {
            sessionId: `session_${Date.now()}`,
            timestamp: new Date().toISOString()
        };

        try {
            await DynamoService.addItemToList(JSON.stringify(newSession), Credentials, IdentityId);
            setSessions([newSession, ...sessions]);
            return newSession;
        } catch (error) {
            console.error("Error creating new chat:", error);
            return null;
        }
    };

    const deleteSession = async (sessionId: string) => {
        if (!Credentials || !IdentityId) return false;

        try {
            await DynamoService.removeItemBySessionId(sessionId, Credentials, IdentityId);
            setSessions(sessions.filter(s => s.sessionId !== sessionId));
            return true;
        } catch (error) {
            console.error("Error deleting session:", error);
            return false;
        }
    };

    return {
        sessions,
        loadSessions,
        createNewSession,
        deleteSession
    };
}