// filepath: c:\Users\Admin\Desktop\AughtDev\Aztec\src\chat\types.ts

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: number;
	tokenCount?: number;
}

export interface ChatSession {
	id: string;
	name: string;
	articlePath: string;  // The path of the note this session belongs to
	messages: ChatMessage[];
	initialContext: string;  // The selection or full text that started this chat
	createdAt: number;
	updatedAt: number;
}

export interface ChatSessionsStore {
	sessions: { [articlePath: string]: ChatSession[] };
}

export const TOKEN_THRESHOLD = 10000;  // Summarize when past this many tokens
export const SUMMARIZATION_MODEL = "anthropic/claude-3-haiku-20240307";

// Rough token estimation (approximately 4 chars per token for English)
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

export function generateSessionId(): string {
	return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

