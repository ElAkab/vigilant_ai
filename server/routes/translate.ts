import { HttpError, json } from "../lib/http";
import { globalAIService } from "../lib/aiService";
import { checkRateLimit } from "../lib/rateLimit";

type TranslateBody = {
  text: string;
  targetLang: string;
};

// Cache LRU simple pour les traductions
class SimpleLRU<K, V> {
  private max: number;
  private cache: Map<K, V>;
  constructor(max: number) {
    this.max = max;
    this.cache = new Map();
  }
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }
  set(key: K, value: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

const translateCache = new SimpleLRU<string, string>(500);

// Mapping code langue → nom complet pour le prompt
const LANG_NAMES: Record<string, string> = {
  fr: "français",
  en: "anglais",
  nl: "néerlandais",
  ar: "arabe marocain (darija)",
};

function cacheKey(text: string, targetLang: string): string {
  // Hash simple : longueur + premiers/derniers caractères + langue
  const head = text.slice(0, 30).replace(/\s+/g, " ").trim();
  const tail = text.slice(-20).replace(/\s+/g, " ").trim();
  return `${targetLang}:${text.length}:${head}:${tail}`;
}

export async function handleTranslate(req: Request): Promise<Response> {
  if (req.method !== "POST")
    throw new HttpError(405, "METHOD_NOT_ALLOWED", "Méthode non autorisée");

  const limit = checkRateLimit(req, {
    keyPrefix: "translate",
    windowMs: 60_000,
    max: 60,
  });
  if (!limit.ok) {
    throw new HttpError(
      429,
      "RATE_LIMITED",
      `Trop de traductions. Réessaie dans ${Math.ceil(limit.retryAfterMs / 1000)}s.`,
    );
  }

  const body = (await req.json()) as TranslateBody;
  if (!body?.text || !body?.targetLang) {
    throw new HttpError(
      400,
      "BAD_REQUEST",
      "Paramètres 'text' et 'targetLang' requis",
    );
  }

  const targetLang = body.targetLang;
  const langName = LANG_NAMES[targetLang];
  if (!langName) {
    throw new HttpError(
      400,
      "BAD_REQUEST",
      `Langue non supportée: ${targetLang}. Supportées: ${Object.keys(LANG_NAMES).join(", ")}`,
    );
  }

  const key = cacheKey(body.text, targetLang);
  const cached = translateCache.get(key);
  if (cached) return json({ translated: cached, cached: true });

  const prompt = [
    `Traduis le texte suivant en ${langName}. Retourne UNIQUEMENT la traduction, sans commentaire ni ponctuation superflue. Conserve le ton et le style du texte original.`,
    "",
    `<texte_a_traduire>`,
    body.text,
    `</texte_a_traduire>`,
  ].join("\n");

  const started = Date.now();
  const result = await globalAIService.generateContent(prompt);
  const translated = result.response.text()?.trim() ?? body.text;

  console.log(
    `[Translate] ${targetLang} (${body.text.length}c) → ${Date.now() - started}ms`,
  );

  translateCache.set(key, translated);
  return json({ translated, cached: false });
}
