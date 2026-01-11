// Chat-related type definitions
export interface StreamStep {
    step: string;
    content: string;
    rawContent: string;
}

export interface MessageWithSteps extends Message {
    steps?: StreamStep[];
}

export interface Message {
    role: 'human' | 'ai';
    content: string;
}

export interface ChatSession {
    sessionId: string;
    timestamp: string;
}

export interface InvokeInput {
    prompt: string;
    actor_id: string;
    thread_id: string;
}

export interface InvokeForHistory {
    actor_id: string;
    thread_id: string;
}