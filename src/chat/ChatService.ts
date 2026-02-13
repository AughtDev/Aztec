// filepath: c:\Users\Admin\Desktop\AughtDev\Aztec\src\chat\ChatService.ts
import { Notice, requestUrl } from "obsidian";
import { ChatMessage, ChatSession, estimateTokens, TOKEN_THRESHOLD, SUMMARIZATION_MODEL } from "./types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatCompletionMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export class ChatService {
	private apiKey: string;
	private model: string;
	private summarizedContext: string | null = null;

	constructor(apiKey: string, model: string) {
		this.apiKey = apiKey;
		this.model = model;
	}

	setModel(model: string) {
		this.model = model;
	}

	setApiKey(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * Build the messages array for the API call, handling token management
	 */
	async buildMessagesForAPI(
		session: ChatSession,
		newUserMessage: string
	): Promise<ChatCompletionMessage[]> {
		const messages: ChatCompletionMessage[] = [];

		// System message with context
		let systemContent = `You are a helpful AI assistant. The user is working on a document in Obsidian.`;

		if (session.initialContext) {
			systemContent += `\n\nHere is the relevant context from the user's document:\n\n${session.initialContext}`;
		}

		if (this.summarizedContext) {
			systemContent += `\n\nSummary of previous conversation:\n${this.summarizedContext}`;
		}

		messages.push({
			role: "system",
			content: systemContent
		});

		// Calculate total tokens in conversation history
		let totalTokens = estimateTokens(systemContent);
		const conversationMessages: ChatCompletionMessage[] = [];

		// Add conversation history
		for (const msg of session.messages) {
			conversationMessages.push({
				role: msg.role as "user" | "assistant",
				content: msg.content
			});
			totalTokens += estimateTokens(msg.content);
		}

		// Add the new user message
		totalTokens += estimateTokens(newUserMessage);

		// Check if we need to summarize
		if (totalTokens > TOKEN_THRESHOLD && conversationMessages.length > 4) {
			// Summarize older messages
			await this.summarizeOlderMessages(session, conversationMessages);

			// Rebuild system message with summary
			if (this.summarizedContext) {
				messages[0] = {
					role: "system",
					content: `You are a helpful AI assistant. The user is working on a document in Obsidian.
					
${session.initialContext ? `Context from user's document:\n${session.initialContext}\n\n` : ""}
Summary of previous conversation:\n${this.summarizedContext}`
				};
			}

			// Only include recent messages (last 4-6)
			const recentMessages = conversationMessages.slice(-4);
			messages.push(...recentMessages);
		} else {
			messages.push(...conversationMessages);
		}

		// Add the new user message
		messages.push({
			role: "user",
			content: newUserMessage
		});

		return messages;
	}

	/**
	 * Summarize older messages using a smaller model
	 */
	private async summarizeOlderMessages(
		session: ChatSession,
		messages: ChatCompletionMessage[]
	): Promise<void> {
		// Take all but the last 4 messages to summarize
		const messagesToSummarize = messages.slice(0, -4);

		if (messagesToSummarize.length === 0) return;

		const conversationText = messagesToSummarize
			.map(m => `${m.role.toUpperCase()}: ${m.content}`)
			.join("\n\n");

		const summaryPrompt = `Please provide a concise summary of the following conversation, capturing the key points, decisions made, and important context that should be remembered for the continuation of this discussion:

${conversationText}

Provide only the summary, no additional commentary.`;

		try {
			const response = await requestUrl({
				url: OPENROUTER_API_URL,
				method: "POST",
				headers: {
					"Authorization": `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": "https://obsidian.md",
					"X-Title": "Aztec AI Chat"
				},
				body: JSON.stringify({
					model: SUMMARIZATION_MODEL,
					messages: [
						{
							role: "user",
							content: summaryPrompt
						}
					],
					temperature: 0.3,
					max_tokens: 500
				})
			});

			if (response.status === 200) {
				const data = response.json;
				if (data.choices?.[0]?.message?.content) {
					this.summarizedContext = data.choices[0].message.content;
				}
			}
		} catch (error) {
			console.error("Failed to summarize conversation:", error);
			// Continue without summarization if it fails
		}
	}

	/**
	 * Send a chat message and get a response
	 */
	async sendMessage(
		session: ChatSession,
		userMessage: string
	): Promise<string | null> {
		if (!this.apiKey) {
			new Notice("OpenRouter API key not configured. Please add it in settings.");
			return null;
		}

		try {
			const messages = await this.buildMessagesForAPI(session, userMessage);

			const response = await requestUrl({
				url: OPENROUTER_API_URL,
				method: "POST",
				headers: {
					"Authorization": `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": "https://obsidian.md",
					"X-Title": "Aztec AI Chat"
				},
				body: JSON.stringify({
					model: this.model,
					messages: messages,
					temperature: 0.7,
					max_tokens: 2000
				})
			});

			if (response.status !== 200) {
				new Notice(`OpenRouter API error: ${response.status}`);
				return null;
			}

			const data = response.json;

			if (!data.choices?.[0]?.message?.content) {
				new Notice("No response from AI.");
				return null;
			}

			return data.choices[0].message.content;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Error calling OpenRouter: ${message}`);
			console.error("OpenRouter error:", error);
			return null;
		}
	}

	/**
	 * Reset summarized context (call when switching sessions)
	 */
	resetContext() {
		this.summarizedContext = null;
	}
}

