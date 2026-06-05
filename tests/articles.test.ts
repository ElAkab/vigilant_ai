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

describe("stratifiedSort", () => {
  test("round-robin : alterne les sources, tri récent", async () => {
    const { __test } = await import("../server/routes/articles");

    // 3 sources, volumes différents
    const articles: Article[] = [
      // OpenAI: 3 articles
      makeArticle({ id: "o1", sourceLabel: "OpenAI", datePublication: "2026-06-05T00:00:00.000Z" }),
      makeArticle({ id: "o2", sourceLabel: "OpenAI", datePublication: "2026-06-01T00:00:00.000Z" }),
      makeArticle({ id: "o3", sourceLabel: "OpenAI", datePublication: "2026-05-01T00:00:00.000Z" }),
      // Cloudflare: 1 article
      makeArticle({ id: "c1", sourceLabel: "Cloudflare", datePublication: "2026-06-03T00:00:00.000Z" }),
      // BBC: 2 articles
      makeArticle({ id: "b1", sourceLabel: "BBC World", datePublication: "2026-06-04T00:00:00.000Z" }),
      makeArticle({ id: "b2", sourceLabel: "BBC World", datePublication: "2026-05-15T00:00:00.000Z" }),
    ];

    const sorted = __test.stratifiedSort(articles, "recent");

    // Round 1: o1(Jun5), c1(Jun3), b1(Jun4)
    expect(sorted[0]!.id).toBe("o1");
    expect(sorted[1]!.id).toBe("c1");
    expect(sorted[2]!.id).toBe("b1");
    // Round 2: o2(Jun1), b2(May15)
    expect(sorted[3]!.id).toBe("o2");
    expect(sorted[4]!.id).toBe("b2");
    // Round 3: o3(May1)
    expect(sorted[5]!.id).toBe("o3");

    // Toutes les sources sont représentées dans les 3 premiers
    const sourcesFirst3 = new Set(sorted.slice(0, 3).map(a => a.sourceLabel));
    expect(sourcesFirst3.size).toBe(3);
  });

  test("round-robin : tri ancien", async () => {
    const { __test } = await import("../server/routes/articles");

    const articles: Article[] = [
      makeArticle({ id: "a1", sourceLabel: "A", datePublication: "2026-01-01T00:00:00.000Z" }),
      makeArticle({ id: "a2", sourceLabel: "A", datePublication: "2026-03-01T00:00:00.000Z" }),
      makeArticle({ id: "b1", sourceLabel: "B", datePublication: "2026-02-01T00:00:00.000Z" }),
    ];

    const sorted = __test.stratifiedSort(articles, "ancien");

    // Round 1: a1(Jan) puis b1(Feb) — chaque source, son plus ancien
    expect(sorted[0]!.id).toBe("a1");
    expect(sorted[1]!.id).toBe("b1");
    // Round 2: a2(Mar)
    expect(sorted[2]!.id).toBe("a2");
  });

  test("liste vide", async () => {
    const { __test } = await import("../server/routes/articles");
    expect(__test.stratifiedSort([], "recent").length).toBe(0);
  });

  test("source unique : équivaut à un tri normal", async () => {
    const { __test } = await import("../server/routes/articles");

    const articles: Article[] = [
      makeArticle({ id: "1", sourceLabel: "Solo", datePublication: "2026-01-01T00:00:00.000Z" }),
      makeArticle({ id: "2", sourceLabel: "Solo", datePublication: "2026-06-01T00:00:00.000Z" }),
    ];

    const sorted = __test.stratifiedSort(articles, "recent");
    expect(sorted[0]!.id).toBe("2"); // plus récent d'abord
    expect(sorted[1]!.id).toBe("1");
  });

  test("sourceLabel absent → regroupé sous 'inconnu'", async () => {
    const { __test } = await import("../server/routes/articles");

    const a = makeArticle({ id: "x", sourceLabel: undefined });
    a.sourceLabel = undefined;

    const sorted = __test.stratifiedSort([a], "recent");
    expect(sorted.length).toBe(1);
  });
});
