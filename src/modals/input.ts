import {App, Modal, Setting} from "obsidian";

export class InputModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, title: string, onSubmit: (result: string) => void) {
		super(app);
		this.titleEl.setText(title);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		// Title and description as regular elements above the textarea
		contentEl.createEl("h3", { text: "Instructions" });
		contentEl.createEl("p", {
			text: "e.g., 'Make it sound more professional' or 'Translate to French'",
			cls: "setting-item-description"
		});

		// Text area for larger input
		const textarea = contentEl.createEl("textarea", {
			cls: "aztec-instructions-textarea",
			attr: {
				rows: "6",
				placeholder: "Enter your custom instructions here..."
			}
		});
		textarea.style.width = "100%";
		textarea.style.marginTop = "12px";
		textarea.style.marginBottom = "16px";
		textarea.style.resize = "vertical";

		textarea.addEventListener("input", (e) => {
			this.result = (e.target as HTMLTextAreaElement).value;
		});

		// Submit button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					})
			);
	}
}
