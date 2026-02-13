export interface AIModel {
	name: string;
	code: string;
}


export const AI_MODELS: AIModel[] = [
	{name: "Anthropic Claude 3.5 Sonnet", code: "anthropic/claude-3.5-sonnet"},
	{name: "Anthropic Claude 3 Opus", code: "anthropic/claude-3-opus-20240229"},
	{name: "Anthropic Claude 3 Sonnet", code: "anthropic/claude-3-sonnet-20240229"},
	{name: "Anthropic Claude 3 Haiku", code: "anthropic/claude-3-haiku-20240307"},
	{name: "Anthropic Claude 2", code: "anthropic/claude-2"},
	{name: "OpenAI GPT-4o", code: "openai/gpt-4o"},
	{name: "OpenAI GPT-4 Turbo", code: "openai/gpt-4-turbo"},
	{name: "OpenAI GPT-4", code: "gpt-4"},
	{name: "OpenAI GPT-3.5 Turbo", code: "gpt-3.5-turbo"},
];
