// filepath: c:\Users\Admin\Desktop\AughtDev\Aztec\src\chat\SessionManager.ts
import { App } from "obsidian";
import { ChatSession, ChatSessionsStore, generateSessionId, ChatMessage, estimateTokens } from "./types";

const SESSIONS_FILE = "aztec-chat-sessions.json";

export class SessionManager {
	private app: App;
	private store: ChatSessionsStore = { sessions: {} };
	private loaded: boolean = false;

	constructor(app: App) {
		this.app = app;
	}

	async loadSessions(): Promise<void> {
		if (this.loaded) return;

		try {
			const adapter = this.app.vault.adapter;
			const configDir = this.app.vault.configDir;
			const filePath = `${configDir}/plugins/aztec/${SESSIONS_FILE}`;

			if (await adapter.exists(filePath)) {
				const data = await adapter.read(filePath);
				this.store = JSON.parse(data);
			}
			this.loaded = true;
		} catch (error) {
			console.error("Failed to load chat sessions:", error);
			this.store = { sessions: {} };
			this.loaded = true;
		}
	}

	async saveSessions(): Promise<void> {
		try {
			const adapter = this.app.vault.adapter;
			const configDir = this.app.vault.configDir;
			const pluginDir = `${configDir}/plugins/aztec`;
			const filePath = `${pluginDir}/${SESSIONS_FILE}`;

			// Ensure plugin directory exists
			if (!(await adapter.exists(pluginDir))) {
				await adapter.mkdir(pluginDir);
			}

			await adapter.write(filePath, JSON.stringify(this.store, null, 2));
		} catch (error) {
			console.error("Failed to save chat sessions:", error);
		}
	}

	/**
	 * Get all sessions for a specific article
	 */
	getSessionsForArticle(articlePath: string): ChatSession[] {
		return this.store.sessions[articlePath] || [];
	}

	/**
	 * Get a specific session by ID
	 */
	getSession(articlePath: string, sessionId: string): ChatSession | undefined {
		const sessions = this.getSessionsForArticle(articlePath);
		return sessions.find(s => s.id === sessionId);
	}

	/**
	 * Create a new session for an article
	 */
	createSession(articlePath: string, initialContext: string, name?: string): ChatSession {
		const session: ChatSession = {
			id: generateSessionId(),
			name: name || `Chat ${new Date().toLocaleString()}`,
			articlePath: articlePath,
			messages: [],
			initialContext: initialContext,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		if (!this.store.sessions[articlePath]) {
			this.store.sessions[articlePath] = [];
		}

		this.store.sessions[articlePath].push(session);
		this.saveSessions();

		return session;
	}

	/**
	 * Add a message to a session
	 */
	addMessage(
		articlePath: string,
		sessionId: string,
		role: "user" | "assistant",
		content: string
	): ChatMessage | null {
		const session = this.getSession(articlePath, sessionId);
		if (!session) return null;

		const message: ChatMessage = {
			role: role,
			content: content,
			timestamp: Date.now(),
			tokenCount: estimateTokens(content)
		};

		session.messages.push(message);
		session.updatedAt = Date.now();
		this.saveSessions();

		return message;
	}

	/**
	 * Rename a session
	 */
	renameSession(articlePath: string, sessionId: string, newName: string): boolean {
		const session = this.getSession(articlePath, sessionId);
		if (!session) return false;

		session.name = newName;
		session.updatedAt = Date.now();
		this.saveSessions();

		return true;
	}

	/**
	 * Delete a session
	 */
	deleteSession(articlePath: string, sessionId: string): boolean {
		const sessions = this.store.sessions[articlePath];
		if (!sessions) return false;

		const index = sessions.findIndex(s => s.id === sessionId);
		if (index === -1) return false;

		sessions.splice(index, 1);
		this.saveSessions();

		return true;
	}

	/**
	 * Get the most recent session for an article, or create one if none exists
	 */
	getOrCreateSession(articlePath: string, initialContext: string): ChatSession {
		const sessions = this.getSessionsForArticle(articlePath);

		if (sessions.length > 0) {
			// Return the most recently updated session
			const sorted = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
			const mostRecent = sorted[0];
			if (mostRecent) {
				return mostRecent;
			}
		}

		return this.createSession(articlePath, initialContext);
	}
}
