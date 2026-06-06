import { HttpError } from "./http";
import type { AIModel } from "./models";
import { loadModelConfig } from "../config/models";

function getEnv(key: string): string | undefined {
	return process.env[key]?.trim() || undefined;
}

// --- Helpers retry/fallback ---

function isRetryable(err: Error): boolean {
	const msg = err.message.toLowerCase();
	return (
		msg.includes("429") ||
		msg.includes("503") ||
		msg.includes("timeout") ||
		msg.includes("econnrefused") ||
		msg.includes("abort")
	);
}

async function withRetry<T>(
	fn: () => Promise<T>,
	options: {
		maxRetries: number;
		baseDelayMs: number;
		shouldRetry: (err: Error) => boolean;
	},
): Promise<T> {
	let lastError: Error;
	for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err as Error;
			if (
				attempt === options.maxRetries ||
				!options.shouldRetry(lastError)
			) {
				throw lastError;
			}
			const jitter = 0.5 + Math.random() * 0.5;
			const delay = options.baseDelayMs * Math.pow(2, attempt) * jitter;
			console.warn(
				`[AI] Retry ${attempt + 1}/${options.maxRetries} in ${Math.round(delay)}ms: ${lastError.message}`,
			);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	throw lastError!;
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
			const startedAt = Date.now();

			try {
				const response = await withRetry(
					() => this.callOpenRouter(model, prompt),
					{
						maxRetries: 2,
						baseDelayMs: 1000,
						shouldRetry: isRetryable,
					},
				);
				console.log(
					`[AI] ✅ ${model.id} (non-stream) — ${Date.now() - startedAt}ms`,
				);
				this.currentModelIndex = 0;
				return response;
			} catch (err) {
				lastError = err as Error;
				this.recordFailure(model.id, (err as Error).message);
				console.error(
					`[AI] ❌ ${model.id} — ${Date.now() - startedAt}ms — ${(err as Error).message}`,
				);
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

	/**
	 * Appelle le LLM avec response_format json_object pour obtenir une réponse JSON structurée.
	 * Avec fallback : si le JSON est invalide, tente d'extraire le JSON du texte brut.
	 */
	async generateJsonContent<T = Record<string, unknown>>(prompt: string): Promise<T> {
		await this.ensureModelsLoaded();

		if (this.mockMode) {
			return { summary_md: "Mock summary", insight: "Mock insight" } as unknown as T;
		}

		const attempts = this.models.length;
		let lastError: Error | null = null;

		for (let i = 0; i < attempts; i++) {
			const model = this.models[this.currentModelIndex];
			const startedAt = Date.now();

			try {
				const rawText = await withRetry(
					() => this.callOpenRouterJson(model, prompt),
					{
						maxRetries: 1,
						baseDelayMs: 1000,
						shouldRetry: isRetryable,
					},
				);

				// Tenter de parser le JSON directement
				const parsed = this.safeJsonParse<T>(rawText);
				if (parsed) {
					console.log(
						`[AI:JSON] ✅ ${model.id} — ${Date.now() - startedAt}ms`,
					);
					this.currentModelIndex = 0;
					return parsed;
				}

				// Fallback : extraction JSON du texte brut
				const extracted = this.extractJsonFromText<T>(rawText);
				if (extracted) {
					console.log(
						`[AI:JSON] ⚠️ ${model.id} — JSON extrait du texte — ${Date.now() - startedAt}ms`,
					);
					this.currentModelIndex = 0;
					return extracted;
				}

				throw new Error(`Réponse non parsable en JSON: ${rawText.slice(0, 200)}`);
			} catch (err) {
				lastError = err as Error;
				this.recordFailure(model.id, (err as Error).message);
				console.error(
					`[AI:JSON] ❌ ${model.id} — ${Date.now() - startedAt}ms — ${(err as Error).message}`,
				);
				this.currentModelIndex =
					(this.currentModelIndex + 1) % this.models.length;
			}
		}

		throw new HttpError(
			502,
			"AI_SERVICE_ERROR",
			`All models failed for JSON generation: ${lastError?.message}`,
		);
	}

	/** Parse JSON de manière tolérante, retourne null si échec */
	private safeJsonParse<T>(text: string): T | null {
		try {
			const trimmed = text.trim();
			return JSON.parse(trimmed) as T;
		} catch {
			return null;
		}
	}

	/** Extrait un objet JSON du texte même s'il est entouré de markdown ou prose */
	private extractJsonFromText<T>(text: string): T | null {
		// Stratégie 1: extraire du markdown code block ```json ... ```
		const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (fenceMatch?.[1]) {
			const parsed = this.safeJsonParse<T>(fenceMatch[1]);
			if (parsed) return parsed;
		}

		// Stratégie 2: premier bloc { ... } complet
		const braceMatch = text.match(/\{[\s\S]*\}/);
		if (braceMatch?.[0]) {
			const parsed = this.safeJsonParse<T>(braceMatch[0]);
			if (parsed) return parsed;
		}

		return null;
	}

	/** Appel OpenRouter avec response_format json_object */
	private async callOpenRouterJson(
		model: AIModel,
		prompt: string,
	): Promise<string> {
		const apiKey = getEnv("OPENROUTER_API_KEY");
		if (!apiKey) {
			throw new HttpError(500, "CONFIG_MISSING", "OPENROUTER_API_KEY manquant");
		}

		const body = {
			model: model.id,
			messages: [{ role: "user", content: prompt }],
			temperature: model.temperature ?? 0.3,
			top_p: 0.95,
			response_format: { type: "json_object" },
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
			// Si le modèle ne supporte pas json_object, réessayer sans
			if (res.status === 400) {
				const errText = await res.text().catch(() => "");
				if (errText.includes("json") || errText.includes("response_format")) {
					console.warn(`[AI:JSON] ${model.id} ne supporte pas response_format, fallback sans`);
					return this.callOpenRouterText(model, prompt);
				}
			}
			const text = await res.text().catch(() => "");
			throw new HttpError(
				502,
				"AI_SERVICE_ERROR",
				`OpenRouter erreur (${model.id}): ${res.status} ${text}`,
			);
		}

		const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		const content =
			(data?.choices?.[0] as Record<string, unknown>)?.message?.content ??
			(data?.choices?.[0] as Record<string, unknown>)?.text ??
			"";
		return typeof content === "string" ? content : "";
	}

	/** Appel OpenRouter sans response_format (fallback pour modèles incompatibles) */
	private async callOpenRouterText(
		model: AIModel,
		prompt: string,
	): Promise<string> {
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
			throw new HttpError(502, "AI_SERVICE_ERROR", `OpenRouter erreur (${model.id}): ${res.status} ${text}`);
		}

		const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		const content =
			(data?.choices?.[0] as Record<string, unknown>)?.message?.content ??
			(data?.choices?.[0] as Record<string, unknown>)?.text ??
			"";
		return typeof content === "string" ? content : "";
	}

	async generateContentStream(
		prompt: string,
	): Promise<{ stream: AsyncIterable<{ text: () => string }> }> {
		await this.ensureModelsLoaded();

		if (this.mockMode) {
			return this.generateMockContentStream(prompt);
		}

		return { stream: this.multiModelStreamGenerator(prompt) };
	}

	private async *multiModelStreamGenerator(
		prompt: string,
	): AsyncGenerator<{ text: () => string }, void, void> {
		const attempts = this.models.length;
		let lastError: Error | null = null;

		for (let i = 0; i < attempts; i++) {
			const model = this.models[this.currentModelIndex];
			const startedAt = Date.now();

			try {
				const modelStream = this.callOpenRouterStream(
					model,
					prompt,
				);
				for await (const chunk of modelStream) {
					yield { text: () => chunk };
				}
				console.log(
					`[AI] ✅ ${model.id} — ${Date.now() - startedAt}ms`,
				);
				this.currentModelIndex = 0;
				return;
			} catch (err) {
				lastError = err as Error;
				console.error(
					`[AI] ❌ ${model.id} — ${Date.now() - startedAt}ms — ${lastError.message}`,
				);
				this.recordFailure(model.id, lastError.message);
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

	private async *callOpenRouterStream(
		model: AIModel,
		prompt: string,
	): AsyncGenerator<string, void, unknown> {
		const apiKey = getEnv("OPENROUTER_API_KEY");
		if (!apiKey) {
			throw new HttpError(500, "CONFIG_MISSING", "OPENROUTER_API_KEY manquant");
		}

		const body = {
			model: model.id,
			messages: [{ role: "user", content: prompt }],
			temperature: model.temperature ?? 0.3,
			top_p: 0.95,
			stream: true,
		};

		const res = await this.fetchWithTimeout(model.endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		}); // default timeout = 45s

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new HttpError(
				502,
				"AI_SERVICE_ERROR",
				`OpenRouter erreur (${model.id}): ${res.status} ${text}`,
			);
		}

		const reader = res.body?.getReader();
		if (!reader) throw new Error("No response body");

		const decoder = new TextDecoder("utf-8");
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					if (trimmed === "data: [DONE]") return;
					if (trimmed.startsWith("data: ")) {
						const jsonStr = trimmed.slice(6);
						try {
							const data = JSON.parse(jsonStr);
							const text = data.choices?.[0]?.delta?.content;
							if (text) yield text;
						} catch {
							// Ignore parse errors for incomplete lines
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
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
		timeoutMs = 45000, // 45s pour les modèles gratuits lents
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
