import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";
import {AI_MODELS} from "./models";

export interface MyPluginSettings {
	openRouterApiKey: string;
	selectedModel: string;
	chatModel: string;  // Separate model for chat feature
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	openRouterApiKey: '',
	selectedModel: AI_MODELS[0]!.code,
	chatModel: ''  // Empty means use selectedModel
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('OpenRouter API Key')
			.setDesc('Your OpenRouter API key for AI writing assistance')
			.addText(text => text
				.setPlaceholder('sk-or-v1-...')
				.setValue(this.plugin.settings.openRouterApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openRouterApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('AI Model')
			.setDesc('Select the AI model to use for writing assistance actions')
			.addDropdown(dropdown => {
				AI_MODELS.forEach(model => {
					dropdown.addOption(model.code, model.name);
				});
				dropdown
					.setValue(this.plugin.settings.selectedModel)
					.onChange(async (value) => {
						this.plugin.settings.selectedModel = value;
						await this.plugin.saveSettings();
					});
				return dropdown;
			});

		new Setting(containerEl)
			.setName('Chat Model')
			.setDesc('Select the AI model to use for chat (leave empty to use the default model)')
			.addDropdown(dropdown => {
				dropdown.addOption('', '(Use default model)');
				AI_MODELS.forEach(model => {
					dropdown.addOption(model.code, model.name);
				});
				dropdown
					.setValue(this.plugin.settings.chatModel)
					.onChange(async (value) => {
						this.plugin.settings.chatModel = value;
						await this.plugin.saveSettings();
					});
				return dropdown;
			});
	}
}
