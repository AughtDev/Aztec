import { Modal, App, Setting, ButtonComponent } from "obsidian";

export class MultiChoiceModal extends Modal {
	constructor(
		app: App,
		private originalText: string,
		private options: string[],
		private onSelect: (choice: string) => void,
		private onGenerateMore: () => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ai-multi-choice-modal");

		contentEl.createEl("h2", { text: "Review AI Options" });

		// 1. Original Text Section
		const originalContainer = contentEl.createDiv({ cls: "ai-original-container" });
		originalContainer.createEl("strong", { text: "Original Text" });
		originalContainer.createDiv({ text: this.originalText, cls: "ai-original-box" });

		contentEl.createEl("hr");

		// 2. AI Options Section
		const optionsContainer = contentEl.createDiv({ cls: "ai-options-list" });

		this.options.forEach((option, index) => {
			const optionWrapper = optionsContainer.createDiv({ cls: "ai-option-item" });

			// Text Preview
			optionWrapper.createDiv({ text: option, cls: "ai-option-text" });

			// Select Button
			new ButtonComponent(optionWrapper)
				.setButtonText(`Use Option ${index + 1}`)
				.setCta()
				.onClick(() => {
					this.onSelect(option);
					this.close();
				});
		});

		// 3. Footer Actions
		const footer = contentEl.createDiv({ cls: "ai-modal-footer" });

		new ButtonComponent(footer)
			.setButtonText("Generate More / Refine...")
			.onClick(() => {
				this.close();
				this.onGenerateMore();
			});
	}
}
