import type { Article } from '../types/article'

export const mockArticles: Article[] = [
  {
    id: '1',
    titre: 'Comprendre la veille sémantique en 2026',
    resume:
      "Panorama des outils et méthodes pour transformer un flux d'articles bruts en informations réellement actionnables.",
    datePublication: '2026-05-05',
    urlSource: 'https://example.com/articles/veille-semantique-2026',
  },
  {
    id: '2',
    titre: 'LLM et agrégation de contenus : bonnes pratiques',
    resume:
      'Comment utiliser les modèles de langage pour résumer, classer et filtrer des centaines de sources sans noyer les utilisateurs.',
    datePublication: '2026-05-06',
    urlSource: 'https://example.com/articles/llm-aggregation-bonnes-pratiques',
  },
  {
    id: '3',
    titre: 'Construire un pipeline de veille robuste',
    resume:
      'Du scraping aux webhooks en passant par les API officielles : concevoir une architecture de veille résiliente et observable.',
    datePublication: '2026-05-07',
    urlSource: 'https://example.com/articles/pipeline-veille-robuste',
  },
]

