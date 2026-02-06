import {App, SuggestModal} from "obsidian";

interface AztecAction {
	label: string
	actionType: string
}

export enum AIModalMode {
	SELECTION = "selection",
	GENERAL = "general"
}

const SELECTION_ACTIONS: AztecAction[] = [
	{label: "Fill In", actionType: "fill-in"},
	{label: "Fix", actionType: "fix"},
	{label: "Rewrite", actionType: "rewrite"},
	{label: "Expound", actionType: "expound"},
	{label: "Extend", actionType: "extend"},
	{label: "Summarize", actionType: "summarize"},
];

const GENERAL_ACTIONS: AztecAction[] = [
	{label: "Summarize", actionType: "summarize"},
	{label: "Extract Action Items", actionType: "action_items"},
	{label: "Generate Title", actionType: "generate_title"},
	{label: "Identify Key Themes", actionType: "key_themes"},
]

function actionToInitialInstructions(actionType: string): string {
	switch (actionType) {
		case "fill-in":
			return `
			Within the provided text, there are instances of -- where information is missing.
			 Please fill in these gaps based on the surrounding context and return the full text.
			 Do not change any other part of the text except to fill in the missing information and return the completed text.
		 `;
		case "fix":
			return `
			The provided text may contain grammatical or punctuation errors.
			 Please correct these errors while preserving the original meaning and style as much as possible.
			  Return the corrected text, do not change anything else.
			  `;
		case "rewrite":
			return `
			Rewrite the provided text to improve its clarity, flow, and overall quality while preserving the original meaning.
			 Focus on enhancing readability and coherence without altering the core message.
			  Return the rewritten text, do not change anything else.
			  `;
		case "expound":
			return `
			Expound upon the provided text by adding more detail, examples, or explanations to enhance understanding.
			 Expand on the ideas presented while maintaining the original intent and meaning.
			  Return the expanded text, do not change anything else.
			  `;
		case "extend":
			return `
			Extend the provided text by adding new content that logically follows from the existing text.
			 Build upon the ideas presented to create a longer piece of writing while maintaining coherence and relevance.
			  Return the extended text, do not change anything else.
			  `;
		case "summarize":
			return `
			Summarize the provided text by condensing it into a shorter version that captures the main points and essential information.
			 Focus on conveying the core message while omitting unnecessary details.
			  Return the summarized text, do not change anything else.
			  `;
		default:
			return `Perform the following action on the provided text: ${actionType}. Return the modified text, do not change anything else.`
	}

}

export function createPrompt(action_type: string, context: string, custom_instructions?: string): string {
	const initial_instructions = actionToInitialInstructions(action_type);
	return `
		${initial_instructions}

		Context:
		${context}

		${custom_instructions ? `Additional Instructions: ${custom_instructions}` : ""}	
	`

}

class AIActionModal extends SuggestModal<AztecAction> {
	contextText: string;
	onSubmit: (action: AztecAction, context: string) => void;

	constructor(app: App, contextText: string, mode: AIModalMode, onSubmit: (action: AztecAction, context: string) => void) {
		super(app);
		this.contextText = contextText;
		this.onSubmit = onSubmit;
	}

	getSuggestions(query: string): AztecAction[] {
		const actions = this.contextText ? SELECTION_ACTIONS : GENERAL_ACTIONS;
		return actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
	}

	renderSuggestion(action: AztecAction, el: HTMLElement) {
		el.createEl("div", {text: action.label});
	}

	onChooseSuggestion(action: AztecAction, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(action, this.contextText);
	}
}

export default AIActionModal;
