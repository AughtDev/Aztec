import { Notice, requestUrl } from "obsidian";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterResponse {
	choices: {
		message?: {
			content?: string;
		};
	}[];
}

export async function fetchOpenRouter(
	apiKey: string,
	prompt: string,
	model: string = "anthropic/claude-3.5-sonnet"
): Promise<string | null> {
	if (!apiKey) {
		new Notice("OpenRouter API key not configured. Please add it in settings.");
		return null;
	}

	try {
		const response = await requestUrl({
			url: OPENROUTER_API_URL,
			method: "POST",
			headers: {
				"Authorization": `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "https://obsidian.md",
				"X-Title": "Aztec AI Writing Assistant"
			},
			body: JSON.stringify({
				model: model,
				messages: [
					{
						role: "system",
						content: "You are a helpful writing assistant. Provide exactly 3 variations of the response, separated by '---' (three dashes)."
					},
					{
						role: "user",
						content: prompt
					}
				],
				temperature: 0.7,
				max_tokens: 2000
			})
		});

		if (response.status !== 200) {
			new Notice(`OpenRouter API error: ${response.status}`);
			return null;
		}

		const data: OpenRouterResponse = response.json;
		
		if (!data.choices || data.choices.length === 0) {
			new Notice("No response from AI.");
			return null;
		}

		const firstChoice = data.choices[0];
		if (!firstChoice) {
			new Notice("No response from AI.");
			return null;
		}

		const message = firstChoice.message;
		if (!message) {
			new Notice("Empty response from AI.");
			return null;
		}

		const content = message.content;
		if (!content) {
			new Notice("Empty response from AI.");
			return null;
		}

		return content;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Error calling OpenRouter: ${message}`);
		console.error("OpenRouter error:", error);
		return null;
	}
}
