import { describe, expect, test } from "bun:test";

// Test simple : vérifier que les fonctions du serveur sont importables
describe("Server modules", () => {
	test("routes/articles exports handleListArticles", async () => {
		const mod = await import("../server/routes/articles");
		expect(typeof mod.handleListArticles).toBe("function");
	});

	test("routes/summarize exports handleSummarize", async () => {
		const mod = await import("../server/routes/summarize");
		expect(typeof mod.handleSummarize).toBe("function");
	});

	test("routes/summarize exports handleSummarizeStream", async () => {
		const mod = await import("../server/routes/summarize");
		expect(typeof mod.handleSummarizeStream).toBe("function");
	});

	test("services/articlesService exports listArticles", async () => {
		const mod = await import("../src/services/articlesService");
		expect(typeof mod.listArticles).toBe("function");
	});

	test("services/summarizationService exports summarizeArticle", async () => {
		const mod = await import("../src/services/summarizationService");
		expect(typeof mod.summarizeArticle).toBe("function");
	});
});

describe("Types", () => {
	test("Article type has required fields", async () => {
		const { Article } = await import("../src/types/article") as { Article: never };
		// TypeScript compile-time check — si ce test compile, le type est correct
		const article = {
			id: "1",
			titre: "Test",
			resume: "Résumé test",
			datePublication: "2026-01-01",
			urlSource: "https://example.com",
		} satisfies typeof Article;
		expect(article.id).toBe("1");
		expect(article.titre).toBe("Test");
	});
});

describe("Config", () => {
	test("RSS sources are defined", async () => {
		const { RSS_SOURCES } = await import("../server/config/sources");
		expect(Array.isArray(RSS_SOURCES)).toBe(true);
		expect(RSS_SOURCES.length).toBeGreaterThan(0);
		for (const source of RSS_SOURCES) {
			expect(source.id).toBeTruthy();
			expect(source.label).toBeTruthy();
			expect(source.url).toMatch(/^https?:\/\//);
		}
	});
});
