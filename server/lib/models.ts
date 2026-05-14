export interface AIModel {
	id: string;
	name: string;
	provider: "openrouter";
	endpoint: string;
	maxTokens?: number;
	temperature?: number;
	costPer1kTokens?: number;
}

export const DEFAULT_MODELS: AIModel[] = [
	{
		id: "llama-3.1-8b",
		name: "Meta Llama 3.1 8B Instruct (Free)",
		provider: "openrouter",
		endpoint: "https://api.openrouter.ai/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
	{
		id: "mixtral-8x7b",
		name: "Mistral Mixtral 8x7B Instruct (Free)",
		provider: "openrouter",
		endpoint: "https://api.openrouter.ai/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
	{
		id: "qwen-72b",
		name: "Qwen 72B Chat (Free)",
		provider: "openrouter",
		endpoint: "https://api.openrouter.ai/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
];
