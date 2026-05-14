function getEnv(key: string): string | undefined {
	return process.env[key]?.trim() || undefined;
}

export type OpenRouterConfig = {
	baseUrl?: string;
	model?: string;
};

export async function fetchOpenRouterConfig(): Promise<OpenRouterConfig | null> {
	const apiKey = getEnv("CONTEXT7_API_KEY");
	if (!apiKey) return null;

	const base = getEnv("CONTEXT7_URL") || "https://api.context7.ai/v1";

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const res = await fetch(`${base}/integrations/openrouter`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!res.ok) return null;
		const data = await res.json().catch(() => null);
		if (!data) return null;

		const cfg: OpenRouterConfig = {};
		if (typeof data.baseUrl === "string") cfg.baseUrl = data.baseUrl;
		if (typeof data.model === "string") cfg.model = data.model;
		return cfg;
	} catch (err) {
		return null;
	}
}

export default fetchOpenRouterConfig;
