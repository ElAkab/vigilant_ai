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
		id: "openrouter/free",
		name: "OpenRouter Free Auto-Router",
		provider: "openrouter",
		endpoint: "https://openrouter.ai/api/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
	{
		id: "nvidia/nemotron-3-ultra-550b-a55b:free",
		name: "NVIDIA Nemotron 3 Ultra 55B (Free)",
		provider: "openrouter",
		endpoint: "https://openrouter.ai/api/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
	{
		id: "meta-llama/llama-3.3-70b-instruct:free",
		name: "Meta Llama 3.3 70B Instruct (Free)",
		provider: "openrouter",
		endpoint: "https://openrouter.ai/api/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
	{
		id: "google/gemma-4-31b-it:free",
		name: "Google Gemma 4 31B (Free)",
		provider: "openrouter",
		endpoint: "https://openrouter.ai/api/v1/chat/completions",
		maxTokens: 2000,
		temperature: 0.3,
		costPer1kTokens: 0,
	},
];
