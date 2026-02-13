import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import AIActionModal, {AIModalMode, createPrompt} from "./commands";
import {InputModal} from "./modals/input";
import {MultiChoiceModal} from "./modals/multichoice";
import {fetchOpenRouter} from "./ai";
import {ChatView, CHAT_VIEW_TYPE} from "./chat";

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the chat view
		this.registerView(
			CHAT_VIEW_TYPE,
			(leaf) => new ChatView(leaf, this)
		);

		// Add command to open chat directly
		this.addCommand({
			id: 'open-chat',
			name: 'Open AI Chat',
			hotkeys: [{modifiers: ["Alt", "Shift"], key: "Enter"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				const context = selection || editor.getValue();
				const articlePath = view.file?.path || "untitled";
				this.openChatView(articlePath, context);
			}
		});


		// 2. Command (Selection Context)
		this.addCommand({
			id: 'ai-actions',
			name: 'Aztec AI Actions',
			hotkeys: [{modifiers: ["Alt"], key: "Enter"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (!selection) {
					// Fallback if nothing selected
					// new AIActionModal(this.app, editor.getValue(), AIModalMode.GENERAL, (action, context) => {
					// 	console.log(`Selected action: ${action.label} on full file context ${context}`);
					// 	this.handleAIAction(action, context, editor);
					// }).open();
					console.log("No selection, skipping AI Actions command.");
					return;
				}

				new AIActionModal(this.app, selection, AIModalMode.SELECTION, (action, context) => {
					console.log(`Selected action: ${action.label} on selection context: ${context}`);
					this.handleAIAction(action, context, editor, view);
				}).open();
			}
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selection = editor.getSelection();

				menu.addItem((item) => {
					item
						.setTitle("AI Actions...")
						.setIcon("bot") // You can use any Lucide icon name
						.onClick(() => {
							// Use selection if available, otherwise full file
							const contextText = selection || editor.getValue();

							new AIActionModal(
								this.app,
								contextText,
								contextText ? AIModalMode.SELECTION : AIModalMode.GENERAL,
								(action, context) => {
									// Cast to MarkdownView if it has the required properties
									const markdownView = view instanceof MarkdownView ? view : undefined;
									this.handleAIAction(action, context, editor, markdownView);
								}).open();
						});
				});
			})
		);

		// region SAMPLE CODE
		// ? ........................

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// ? ........................
		// endregion ........................


	}


	handleAIAction(action: { actionType: string; label: string }, context: string, editor: Editor, view?: MarkdownView) {
		console.log(`Performing ${action.actionType} on context: ${context}`);
		switch (action.actionType) {
			case "rewrite":
			case "extend":
			case "expound":
			case "summarize":
				new InputModal(
					this.app,
					"Custom Instructions", (instructions) => {
						console.log(`Received custom instructions: ${instructions} for action ${action.actionType}`);
						this.runActionFlow(action.actionType, context, editor, instructions);
					}).open();
				break;

			// some cases do not need additional instructions, we can call the flow directly
			case "fix":
			case "fill-in":
				this.runActionFlow(action.actionType, context, editor, "");
				break;

			// Chat action opens the chat panel
			case "chat":
				const articlePath = view?.file?.path || this.app.workspace.getActiveFile()?.path || "untitled";
				this.openChatView(articlePath, context);
				break;

			default:
				new Notice(`Action "${action.label}" is not yet implemented.`);
		}
	}

	/**
	 * Opens the chat view in the right sidebar
	 */
	async openChatView(articlePath: string, context: string): Promise<void> {
		const { workspace } = this.app;

		// Check if a chat view is already open
		let leaf = workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];

		if (!leaf) {
			// Open in the right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: CHAT_VIEW_TYPE,
					active: true
				});
			}
		}

		if (leaf) {
			// Reveal the leaf
			workspace.revealLeaf(leaf);

			// Initialize the chat view with context
			const chatView = leaf.view as ChatView;
			if (chatView && chatView.initializeChat) {
				await chatView.initializeChat(articlePath, context);
			}
		}
	}

	async callOpenRouter(prompt: string): Promise<string | null> {
		return await fetchOpenRouter(this.settings.openRouterApiKey, prompt, this.settings.selectedModel);
	}

	async runActionFlow(action_type: string, context: string, editor: Editor, instructions: string, prev_options: string[] = []) {
		// 1. Show a loading notice (optional but helpful)
		new Notice("AI is thinking...");

		// 2. Fetch the data
		const rawResult = await this.callOpenRouter(
			createPrompt(action_type, context, instructions),
		);

		if (!rawResult) {
			new Notice("AI failed to respond.");
			return;
		}

		// 3. Split the result into the 3 options
		const choices = [
			...rawResult.split("---").map(s => s.trim()).filter(s => s.length > 0),
			...prev_options // Include previous options if this is a refinement round
		]

		// 4. Open the Multi-Choice Modal
		new MultiChoiceModal(
			this.app,
			context,
			choices,
			(selectedChoice) => {
				// SUCCESS: Replace the text in the editor
				editor.replaceSelection(selectedChoice);

				// (Future: add to history here)
				new Notice("Text replaced!");
			},
			() => {
				// RECURSION: The user clicked "Generate More"
				// Open the input modal again to get new instructions
				new InputModal(this.app, "Refine Instructions", (newInstruction) => {
					this.runActionFlow(action_type, context, editor, newInstruction);
				}).open();
			}
		).open();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
	}

}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
