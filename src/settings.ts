import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";
import {AI_MODELS} from "./models";

export interface MyPluginSettings {
	openRouterApiKey: string;
	selectedModel: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	openRouterApiKey: '',
	selectedModel: AI_MODELS[0]!.code
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
			.setDesc('Select the AI model to use for writing assistance')
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
	}
}
