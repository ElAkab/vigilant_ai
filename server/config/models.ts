import type { AIModel } from "../lib/models";
import { DEFAULT_MODELS } from "../lib/models";

function getEnv(key: string): string | undefined {
	return process.env[key]?.trim() || undefined;
}

export async function loadModelConfig(): Promise<AIModel[]> {
	try {
		console.log("[Models] Récupération des modèles depuis OpenRouter...");
		const res = await fetch("https://openrouter.ai/api/v1/models");
		if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
		
		const data = (await res.json()) as { data: Array<{ id: string; name: string; pricing?: { prompt?: string; completion?: string }; context_length?: number }> };
		
		// Filtre les modèles gratuits
		const freeModels = data.data.filter((m) => {
			const promptCost = Number(m.pricing?.prompt || 0);
			const completionCost = Number(m.pricing?.completion || 0);
			return promptCost === 0 && completionCost === 0;
		});

		// Trie par taille de contexte décroissante
		freeModels.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));

		const aiModels: AIModel[] = freeModels.map((m) => ({
			id: m.id,
			name: m.name,
			provider: "openrouter",
			endpoint: "https://openrouter.ai/api/v1/chat/completions",
			maxTokens: 2000, // Token max de réponse
			temperature: 0.3,
		}));

		console.log(`[Models] ${aiModels.length} modèles gratuits trouvés et triés.`);
		
		if (aiModels.length > 0) {
			const configuredModel = getEnv("OPENROUTER_MODEL");
			if (configuredModel) {
				// Si un modèle est forcé dans l'env, on le met en premier
				const index = aiModels.findIndex(m => m.id === configuredModel);
				if (index > 0) {
					const [model] = aiModels.splice(index, 1);
					aiModels.unshift(model);
				}
			}
			return aiModels;
		}
	} catch (err) {
		console.error("[Models] Impossible de charger les modèles dynamiques, repli sur le dur :", err);
	}

	return DEFAULT_MODELS;
}
