// filepath: c:\Users\Admin\Desktop\AughtDev\Aztec\src\chat\ChatView.ts
import { ItemView, WorkspaceLeaf, setIcon, DropdownComponent, Notice } from "obsidian";
import MyPlugin from "../main";
import { ChatSession, ChatMessage } from "./types";
import { ChatService } from "./ChatService";
import { SessionManager } from "./SessionManager";
import { AI_MODELS } from "../models";

export const CHAT_VIEW_TYPE = "aztec-chat-view";

export class ChatView extends ItemView {
	plugin: MyPlugin;
	private chatService: ChatService;
	private sessionManager: SessionManager;
	private currentSession: ChatSession | null = null;
	private currentArticlePath: string = "";
	private initialContext: string = "";

	// UI Elements
	private headerEl: HTMLElement;
	private messagesContainer: HTMLElement;
	private inputContainer: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private sessionDropdown: HTMLSelectElement;
	private settingsPanel: HTMLElement;
	private isSettingsPanelOpen: boolean = false;

	constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.sessionManager = new SessionManager(this.app);
		this.chatService = new ChatService(
			this.plugin.settings.openRouterApiKey,
			this.plugin.settings.chatModel || this.plugin.settings.selectedModel
		);
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Aztec Chat";
	}

	getIcon(): string {
		return "message-circle";
	}

	async onOpen(): Promise<void> {
		await this.sessionManager.loadSessions();
		this.buildUI();
	}

	async onClose(): Promise<void> {
		// Clean up
	}

	/**
	 * Initialize chat with context from the editor
	 */
	async initializeChat(articlePath: string, context: string): Promise<void> {
		this.currentArticlePath = articlePath;
		this.initialContext = context;

		// Update chat service with current API key and model
		this.chatService.setApiKey(this.plugin.settings.openRouterApiKey);
		this.chatService.setModel(this.plugin.settings.chatModel || this.plugin.settings.selectedModel);

		// Load sessions and get or create a session
		await this.sessionManager.loadSessions();
		this.currentSession = this.sessionManager.getOrCreateSession(articlePath, context);
		this.chatService.resetContext();

		// Update UI
		this.updateSessionDropdown();
		this.renderMessages();
		this.focusInput();
	}

	private buildUI(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("aztec-chat-container");

		// Header with session controls
		this.headerEl = container.createDiv({ cls: "aztec-chat-header" });
		this.buildHeader();

		// Settings Panel (hidden by default)
		this.settingsPanel = container.createDiv({ cls: "aztec-chat-settings-panel" });
		this.settingsPanel.style.display = "none";
		this.buildSettingsPanel();

		// Messages container
		this.messagesContainer = container.createDiv({ cls: "aztec-chat-messages" });

		// Input container
		this.inputContainer = container.createDiv({ cls: "aztec-chat-input-container" });
		this.buildInputArea();
	}

	private buildHeader(): void {
		this.headerEl.empty();

		// Left side: Session dropdown
		const leftSection = this.headerEl.createDiv({ cls: "aztec-chat-header-left" });

		this.sessionDropdown = leftSection.createEl("select", { cls: "aztec-session-dropdown" });
		this.sessionDropdown.addEventListener("change", () => this.onSessionChange());

		// Session actions
		const sessionActions = leftSection.createDiv({ cls: "aztec-session-actions" });

		// New session button
		const newSessionBtn = sessionActions.createEl("button", { cls: "aztec-icon-button", attr: { title: "New Session" } });
		setIcon(newSessionBtn, "plus");
		newSessionBtn.addEventListener("click", () => this.createNewSession());

		// Rename session button
		const renameBtn = sessionActions.createEl("button", { cls: "aztec-icon-button", attr: { title: "Rename Session" } });
		setIcon(renameBtn, "pencil");
		renameBtn.addEventListener("click", () => this.renameCurrentSession());

		// Delete session button
		const deleteBtn = sessionActions.createEl("button", { cls: "aztec-icon-button", attr: { title: "Delete Session" } });
		setIcon(deleteBtn, "trash-2");
		deleteBtn.addEventListener("click", () => this.deleteCurrentSession());

		// Right side: Settings button
		const rightSection = this.headerEl.createDiv({ cls: "aztec-chat-header-right" });

		const settingsBtn = rightSection.createEl("button", { cls: "aztec-icon-button", attr: { title: "Chat Settings" } });
		setIcon(settingsBtn, "settings");
		settingsBtn.addEventListener("click", () => this.toggleSettingsPanel());
	}

	private buildSettingsPanel(): void {
		this.settingsPanel.empty();

		const header = this.settingsPanel.createDiv({ cls: "aztec-settings-header" });
		header.createEl("h4", { text: "Chat Settings" });

		const closeBtn = header.createEl("button", { cls: "aztec-icon-button" });
		setIcon(closeBtn, "x");
		closeBtn.addEventListener("click", () => this.toggleSettingsPanel());

		// Model selection
		const modelSetting = this.settingsPanel.createDiv({ cls: "aztec-setting-item" });
		modelSetting.createEl("label", { text: "Chat Model:" });

		const modelSelect = modelSetting.createEl("select", { cls: "aztec-model-select" });

		AI_MODELS.forEach(model => {
			const option = modelSelect.createEl("option", { text: model.name, value: model.code });
			if (model.code === (this.plugin.settings.chatModel || this.plugin.settings.selectedModel)) {
				option.selected = true;
			}
		});

		modelSelect.addEventListener("change", async () => {
			this.plugin.settings.chatModel = modelSelect.value;
			await this.plugin.saveSettings();
			this.chatService.setModel(modelSelect.value);
			new Notice(`Chat model changed to ${AI_MODELS.find(m => m.code === modelSelect.value)?.name || modelSelect.value}`);
		});
	}

	private buildInputArea(): void {
		this.inputContainer.empty();

		const inputWrapper = this.inputContainer.createDiv({ cls: "aztec-input-wrapper" });

		this.inputEl = inputWrapper.createEl("textarea", {
			cls: "aztec-chat-input",
			attr: {
				placeholder: "Type your message...",
				rows: "3"
			}
		});

		// Handle Enter to send (Shift+Enter for newline)
		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		this.sendButton = inputWrapper.createEl("button", { cls: "aztec-send-button" });
		setIcon(this.sendButton, "send");
		this.sendButton.addEventListener("click", () => this.sendMessage());
	}

	private updateSessionDropdown(): void {
		this.sessionDropdown.empty();

		const sessions = this.sessionManager.getSessionsForArticle(this.currentArticlePath);

		sessions.sort((a, b) => b.updatedAt - a.updatedAt).forEach(session => {
			const option = this.sessionDropdown.createEl("option", {
				text: session.name,
				value: session.id
			});
			if (this.currentSession && session.id === this.currentSession.id) {
				option.selected = true;
			}
		});
	}

	private renderMessages(): void {
		this.messagesContainer.empty();

		if (!this.currentSession) {
			this.messagesContainer.createEl("p", {
				text: "Start a conversation by typing a message below.",
				cls: "aztec-chat-placeholder"
			});
			return;
		}

		if (this.currentSession.messages.length === 0) {
			const welcomeDiv = this.messagesContainer.createDiv({ cls: "aztec-chat-welcome" });
			welcomeDiv.createEl("p", { text: "Chat started! Ask questions about your document or get AI assistance." });

			if (this.currentSession.initialContext) {
				const contextPreview = welcomeDiv.createDiv({ cls: "aztec-context-preview" });
				contextPreview.createEl("strong", { text: "Context: " });
				const previewText = this.currentSession.initialContext.length > 200
					? this.currentSession.initialContext.substring(0, 200) + "..."
					: this.currentSession.initialContext;
				contextPreview.createEl("span", { text: previewText });
			}
			return;
		}

		this.currentSession.messages.forEach(message => {
			this.renderMessage(message);
		});

		// Scroll to bottom
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderMessage(message: ChatMessage): void {
		const messageEl = this.messagesContainer.createDiv({
			cls: `aztec-chat-message aztec-message-${message.role}`
		});

		const avatar = messageEl.createDiv({ cls: "aztec-message-avatar" });
		setIcon(avatar, message.role === "user" ? "user" : "bot");

		const content = messageEl.createDiv({ cls: "aztec-message-content" });

		// Simple markdown-like rendering
		const formattedContent = this.formatMessageContent(message.content);
		content.innerHTML = formattedContent;

		const timestamp = messageEl.createDiv({ cls: "aztec-message-timestamp" });
		timestamp.setText(new Date(message.timestamp).toLocaleTimeString());
	}

	private formatMessageContent(content: string): string {
		// Basic formatting - escape HTML first, then apply formatting
		let formatted = content
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		// Code blocks
		formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

		// Inline code
		formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

		// Bold
		formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

		// Italic
		formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

		// Line breaks
		formatted = formatted.replace(/\n/g, '<br>');

		return formatted;
	}

	private async sendMessage(): Promise<void> {
		const messageText = this.inputEl.value.trim();
		if (!messageText || !this.currentSession) return;

		// Clear input
		this.inputEl.value = "";

		// Add user message to session
		this.sessionManager.addMessage(
			this.currentArticlePath,
			this.currentSession.id,
			"user",
			messageText
		);

		// Refresh the session
		this.currentSession = this.sessionManager.getSession(this.currentArticlePath, this.currentSession.id)!;
		this.renderMessages();

		// Show typing indicator
		const typingIndicator = this.showTypingIndicator();

		// Get AI response
		const response = await this.chatService.sendMessage(this.currentSession, messageText);

		// Remove typing indicator
		typingIndicator.remove();

		if (response) {
			// Add assistant message to session
			this.sessionManager.addMessage(
				this.currentArticlePath,
				this.currentSession.id,
				"assistant",
				response
			);

			// Refresh the session and render
			this.currentSession = this.sessionManager.getSession(this.currentArticlePath, this.currentSession.id)!;
			this.renderMessages();
		}
	}

	private showTypingIndicator(): HTMLElement {
		const indicator = this.messagesContainer.createDiv({ cls: "aztec-typing-indicator" });
		indicator.createSpan({ cls: "aztec-typing-dot" });
		indicator.createSpan({ cls: "aztec-typing-dot" });
		indicator.createSpan({ cls: "aztec-typing-dot" });
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
		return indicator;
	}

	private onSessionChange(): void {
		const sessionId = this.sessionDropdown.value;
		const session = this.sessionManager.getSession(this.currentArticlePath, sessionId);

		if (session) {
			this.currentSession = session;
			this.chatService.resetContext();
			this.renderMessages();
		}
	}

	private createNewSession(): void {
		const newSession = this.sessionManager.createSession(
			this.currentArticlePath,
			this.initialContext
		);
		this.currentSession = newSession;
		this.chatService.resetContext();
		this.updateSessionDropdown();
		this.renderMessages();
		this.focusInput();
		new Notice("New chat session created!");
	}

	private renameCurrentSession(): void {
		if (!this.currentSession) return;

		const input = document.createElement("input");
		input.type = "text";
		input.value = this.currentSession.name;
		input.className = "aztec-rename-input";

		const dropdown = this.sessionDropdown;
		dropdown.style.display = "none";
		dropdown.parentElement?.insertBefore(input, dropdown);

		input.focus();
		input.select();

		const finishRename = () => {
			const newName = input.value.trim();
			if (newName && this.currentSession) {
				this.sessionManager.renameSession(
					this.currentArticlePath,
					this.currentSession.id,
					newName
				);
				this.currentSession = this.sessionManager.getSession(
					this.currentArticlePath,
					this.currentSession.id
				)!;
			}
			input.remove();
			dropdown.style.display = "";
			this.updateSessionDropdown();
		};

		input.addEventListener("blur", finishRename);
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				finishRename();
			} else if (e.key === "Escape") {
				input.remove();
				dropdown.style.display = "";
			}
		});
	}

	private deleteCurrentSession(): void {
		if (!this.currentSession) return;

		const sessions = this.sessionManager.getSessionsForArticle(this.currentArticlePath);

		if (sessions.length <= 1) {
			new Notice("Cannot delete the only session. Create a new one first.");
			return;
		}

		if (confirm(`Delete session "${this.currentSession.name}"?`)) {
			this.sessionManager.deleteSession(this.currentArticlePath, this.currentSession.id);

			// Switch to the most recent remaining session
			const remainingSessions = this.sessionManager.getSessionsForArticle(this.currentArticlePath);
			if (remainingSessions.length > 0) {
				const sorted = remainingSessions.sort((a, b) => b.updatedAt - a.updatedAt);
				const mostRecent = sorted[0];
				if (mostRecent) {
					this.currentSession = mostRecent;
					this.chatService.resetContext();
				}
			} else {
				this.currentSession = this.sessionManager.createSession(this.currentArticlePath, this.initialContext);
			}

			this.updateSessionDropdown();
			this.renderMessages();
			new Notice("Session deleted!");
		}
	}

	private toggleSettingsPanel(): void {
		this.isSettingsPanelOpen = !this.isSettingsPanelOpen;
		this.settingsPanel.style.display = this.isSettingsPanelOpen ? "block" : "none";
	}

	public focusInput(): void {
		setTimeout(() => {
			this.inputEl?.focus();
		}, 100);
	}
}

