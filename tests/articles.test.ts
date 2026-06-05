import { describe, expect, test } from "bun:test";
import type { Article } from "../src/types/article";

// Helpers pour créer des articles de test
function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "a1",
    titre: "Test Article",
    resume: "Résumé test",
    datePublication: "2026-06-01T12:00:00.000Z",
    urlSource: "https://example.com/1",
    sourceLabel: "Test Source",
    categorie: "Tech",
    ...overrides,
  };
}

describe("dedupeAndSort", () => {
  test("tri récent : le plus récent en premier", async () => {
    const { __test } = await import("../server/routes/articles");
    const articles: Article[] = [
      makeArticle({ id: "1", datePublication: "2026-01-01T00:00:00.000Z" }),
      makeArticle({ id: "2", datePublication: "2026-06-01T00:00:00.000Z" }),
      makeArticle({ id: "3", datePublication: "2026-03-15T00:00:00.000Z" }),
    ];
    const sorted = __test.dedupeAndSort(articles, "recent");
    expect(sorted[0]!.id).toBe("2");
    expect(sorted[1]!.id).toBe("3");
    expect(sorted[2]!.id).toBe("1");
  });

  test("tri ancien : le plus ancien en premier", async () => {
    const { __test } = await import("../server/routes/articles");
    const articles: Article[] = [
      makeArticle({ id: "1", datePublication: "2026-01-01T00:00:00.000Z" }),
      makeArticle({ id: "2", datePublication: "2026-06-01T00:00:00.000Z" }),
      makeArticle({ id: "3", datePublication: "2026-03-15T00:00:00.000Z" }),
    ];
    const sorted = __test.dedupeAndSort(articles, "ancien");
    expect(sorted[0]!.id).toBe("1");
    expect(sorted[1]!.id).toBe("3");
    expect(sorted[2]!.id).toBe("2");
  });

  test("déduplication : IDs en double éliminés", async () => {
    const { __test } = await import("../server/routes/articles");
    const articles: Article[] = [
      makeArticle({ id: "dup", titre: "Premier" }),
      makeArticle({ id: "dup", titre: "Second" }),
      makeArticle({ id: "unique", titre: "Unique" }),
    ];
    const sorted = __test.dedupeAndSort(articles, "recent");
    expect(sorted.length).toBe(2);
  });

  test("liste vide", async () => {
    const { __test } = await import("../server/routes/articles");
    const sorted = __test.dedupeAndSort([], "recent");
    expect(sorted.length).toBe(0);
  });

  test("article unique", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle();
    const sorted = __test.dedupeAndSort([article], "recent");
    expect(sorted.length).toBe(1);
    expect(sorted[0]!.id).toBe(article.id);
  });
});

describe("matchQuery", () => {
  test("trouve dans le titre", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ titre: "OpenAI lance GPT-5" });
    expect(__test.matchQuery(article, "openai")).toBe(true);
    expect(__test.matchQuery(article, "gpt-5")).toBe(true);
  });

  test("trouve dans le résumé", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({
      titre: "Titre",
      resume: "Un nouveau modèle de langage",
    });
    expect(__test.matchQuery(article, "modèle")).toBe(true);
  });

  test("casse insensible", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ titre: "OpenAI" });
    expect(__test.matchQuery(article, "OPENAI")).toBe(true);
  });

  test("pas de match", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ titre: "Tech News" });
    expect(__test.matchQuery(article, "politique")).toBe(false);
  });
});

describe("matchSource", () => {
  test("match exact", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ sourceLabel: "OpenAI (blog)" });
    expect(__test.matchSource(article, "OpenAI (blog)")).toBe(true);
  });

  test("match partiel (substring)", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ sourceLabel: "OpenAI (blog)" });
    expect(__test.matchSource(article, "OpenAI")).toBe(true);
  });

  test("casse insensible", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ sourceLabel: "The Verge" });
    expect(__test.matchSource(article, "the verge")).toBe(true);
  });

  test("sourceLabel absent", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle();
    article.sourceLabel = undefined;
    expect(__test.matchSource(article, "anything")).toBe(false);
  });

  test("pas de match", async () => {
    const { __test } = await import("../server/routes/articles");
    const article = makeArticle({ sourceLabel: "BBC World" });
    expect(__test.matchSource(article, "OpenAI")).toBe(false);
  });
});

describe("Intégration filtres + tri", () => {
  test("filtre source + tri récent combinés", async () => {
    const { __test } = await import("../server/routes/articles");

    const articles: Article[] = [
      makeArticle({
        id: "1",
        sourceLabel: "OpenAI (blog)",
        datePublication: "2026-01-01T00:00:00.000Z",
      }),
      makeArticle({
        id: "2",
        sourceLabel: "Cloudflare",
        datePublication: "2026-06-01T00:00:00.000Z",
      }),
      makeArticle({
        id: "3",
        sourceLabel: "OpenAI (blog)",
        datePublication: "2026-03-15T00:00:00.000Z",
      }),
    ];

    const filtered = articles.filter((a) => __test.matchSource(a, "OpenAI"));
    expect(filtered.length).toBe(2);

    const sorted = __test.dedupeAndSort(filtered, "recent");
    expect(sorted[0]!.id).toBe("3");
    expect(sorted[1]!.id).toBe("1");
  });

  test("filtre catégorie (simulé)", async () => {
    const articles: Article[] = [
      makeArticle({ id: "1", categorie: "Tech" }),
      makeArticle({ id: "2", categorie: "Géopolitique" }),
      makeArticle({ id: "3", categorie: "Tech" }),
    ];

    const filtered = articles.filter((a) => a.categorie === "Tech");
    expect(filtered.length).toBe(2);
    expect(filtered.map((a) => a.id)).toEqual(["1", "3"]);
  });
});
