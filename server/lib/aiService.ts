import { HttpError } from "./http";
import type { AIModel } from "./models";
import { DEFAULT_MODELS } from "./models";
import { loadModelConfig } from "../config/models";

function getEnv(key: string): string | undefined {
	return process.env[key]?.trim() || undefined;
}

export type AIResponse = {
	response: {
		text: () => string;
	};
};

interface ModelFailureInfo {
	count: number;
	lastError: string;
	timestamp: number;
}

export class AIService {
	private models: AIModel[] = [];
	private currentModelIndex: number = 0;
	private modelFailureLog: Map<string, ModelFailureInfo> = new Map();
	private mockMode: boolean = false;
	private initialized: boolean = false;
	private initializingPromise: Promise<void> | null = null;

	constructor(models?: AIModel[]) {
		if (models) {
			this.models = models;
			this.initialized = true;
		}
		this.mockMode = (getEnv("MOCK_AI") || "").toLowerCase() === "true";
		this.validateConfiguration();
	}

	async ensureModelsLoaded(): Promise<void> {
		if (this.initialized) return;
		if (this.initializingPromise) return this.initializingPromise;

		this.initializingPromise = (async () => {
			try {
				this.models = await loadModelConfig();
				this.initialized = true;
			} finally {
				this.initializingPromise = null;
			}
		})();

		return this.initializingPromise;
	}

	private validateConfiguration(): void {
		// OpenRouter only mode: require OPENROUTER_API_KEY
		const apiKey = getEnv("OPENROUTER_API_KEY");
		if (!apiKey && !this.mockMode) {
			throw new Error("Missing OPENROUTER_API_KEY for AI service");
		}
	}

	async generateContent(prompt: string): Promise<AIResponse> {
		await this.ensureModelsLoaded();
		
		if (this.mockMode) {
			return this.generateMockContent(prompt);
		}

		const attempts = this.models.length;
		let lastError: Error | null = null;

		for (let i = 0; i < attempts; i++) {
			const model = this.models[this.currentModelIndex];

			try {
				const response = await this.callOpenRouter(model, prompt);
				// Reset to primary on success
				this.currentModelIndex = 0;
				return response;
			} catch (err) {
				lastError = err as Error;
				this.recordFailure(model.id, (err as Error).message);
				console.error(`[AI] Modèle ${model.id} en échec:`, (err as Error).message);
				this.currentModelIndex =
					(this.currentModelIndex + 1) % this.models.length;
			}
		}

		throw new HttpError(
			502,
			"AI_SERVICE_ERROR",
			`All OpenRouter models failed: ${lastError?.message}`,
		);
	}

	async generateContentStream(
		prompt: string,
	): Promise<{ stream: AsyncIterable<{ text: () => string }> }> {
		await this.ensureModelsLoaded();
		
		if (this.mockMode) {
			return this.generateMockContentStream(prompt);
		}

		// For now, generate full content and yield once
		// In future, could implement actual streaming per model
		const result = await this.generateContent(prompt);
		async function* gen() {
			yield { text: () => result.response.text() };
		}
		return { stream: gen() };
	}

	private async callOpenRouter(
		model: AIModel,
		prompt: string,
	): Promise<AIResponse> {
		const apiKey = getEnv("OPENROUTER_API_KEY");
		if (!apiKey) {
			throw new HttpError(500, "CONFIG_MISSING", "OPENROUTER_API_KEY manquant");
		}

		const body = {
			model: model.id,
			messages: [{ role: "user", content: prompt }],
			temperature: model.temperature ?? 0.3,
			top_p: 0.95,
		};

		const res = await this.fetchWithTimeout(model.endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new HttpError(
				502,
				"AI_SERVICE_ERROR",
				`OpenRouter erreur (${model.id}): ${res.status} ${text}`,
			);
		}

		const data = (await res.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		const content =
			(data?.choices?.[0] as Record<string, unknown>)?.message?.content ??
			(data?.choices?.[0] as Record<string, unknown>)?.text ??
			"";
		return {
			response: { text: () => (typeof content === "string" ? content : "") },
		};
	}

	private async fetchWithTimeout(
		url: string,
		init: RequestInit,
		timeoutMs = 30000, // 30 secondes pour les modèles gratuits lents
	): Promise<Response> {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(url, { ...init, signal: controller.signal });
		} finally {
			clearTimeout(id);
		}
	}

	private recordFailure(modelId: string, errorMsg: string): void {
		const existing = this.modelFailureLog.get(modelId) ?? {
			count: 0,
			lastError: "",
			timestamp: 0,
		};
		this.modelFailureLog.set(modelId, {
			count: existing.count + 1,
			lastError: errorMsg,
			timestamp: Date.now(),
		});
	}

	getModelStatus(): {
		current: string;
		index: number;
		failureLog: Record<string, ModelFailureInfo>;
	} {
		return {
			current: this.models[this.currentModelIndex].id,
			index: this.currentModelIndex,
			failureLog: Object.fromEntries(this.modelFailureLog),
		};
	}

	private generateMockContent(prompt: string): AIResponse {
		const text = `MOCK SUMMARY: ${prompt.split("\n")[0] || "article"}`;
		return { response: { text: () => text } };
	}

	private async generateMockContentStream(
		prompt: string,
	): Promise<{ stream: AsyncIterable<{ text: () => string }> }> {
		async function* gen() {
			const chunks = [
				`MOCK: start`,
				`MOCK: mid`,
				`MOCK: end for prompt ${prompt.split("\n")[0]}`,
			];
			for (const c of chunks) {
				yield { text: () => c };
			}
		}
		return { stream: gen() };
	}
}

export const globalAIService = new AIService();
