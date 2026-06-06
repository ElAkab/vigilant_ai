import type { Lang } from './types'

type Key = string
export type TranslationMap = Record<Key, Record<Lang, string>>

const t: TranslationMap = {
  // ── Header ──
  'header.subtitle': {
    fr: 'Agrégateur · Veille sémantique',
    en: 'Aggregator · Semantic Watch',
    nl: 'Aggregator · Semantische Monitoring',
    ar: 'مجمع · مراقبة دلالية',
  },

  // ── SearchBar ──
  'search.placeholder': {
    fr: 'Rechercher un article…',
    en: 'Search articles…',
    nl: 'Zoek artikelen…',
    ar: 'قلّب على مقال…',
  },
  'search.source.all': {
    fr: 'Toutes sources',
    en: 'All sources',
    nl: 'Alle bronnen',
    ar: 'كل المصادر',
  },
  'search.category.all': {
    fr: 'Toutes catégories',
    en: 'All categories',
    nl: 'Alle categorieën',
    ar: 'كل الفئات',
  },
  'search.sort.recent': {
    fr: 'Récents',
    en: 'Recent',
    nl: 'Recent',
    ar: 'الجدد',
  },
  'search.sort.oldest': {
    fr: 'Anciens',
    en: 'Oldest',
    nl: 'Oudste',
    ar: 'القدام',
  },

  // ── Categories ──
  'category.tech': {
    fr: 'Tech',
    en: 'Tech',
    nl: 'Tech',
    ar: 'الطيكنولوجيا',
  },
  'category.geopolitique': {
    fr: 'Géopolitique',
    en: 'Geopolitics',
    nl: 'Geopolitiek',
    ar: 'الجيوپوليتيك',
  },
  'category.jeuxvideo': {
    fr: 'Jeux vidéo',
    en: 'Video games',
    nl: 'Videogames',
    ar: 'لوعاب الفيديو',
  },

  // ── ArticlesPage ──
  'articles.title': {
    fr: "Fil d'articles",
    en: 'Article feed',
    nl: 'Artikel feed',
    ar: 'خلاصة المقالات',
  },
  'articles.loading': {
    fr: 'Chargement de la sélection curatoriale…',
    en: 'Loading curated selection…',
    nl: 'Samengestelde selectie laden…',
    ar: 'كيتم تحميل التشكيلة المنسقة…',
  },
  'articles.empty.filtered': {
    fr: 'Aucun résultat pour ces filtres.',
    en: 'No results for these filters.',
    nl: 'Geen resultaten voor deze filters.',
    ar: 'ما كاينش نتائج لهاد الفلاتر.',
  },
  'articles.empty.default': {
    fr: 'Aucun article pour le moment.',
    en: 'No articles yet.',
    nl: 'Nog geen artikelen.',
    ar: 'ما كاينينش مقالات دابا.',
  },
  'articles.empty.hint.filtered': {
    fr: 'Essaie de modifier ou réinitialiser les filtres.',
    en: 'Try adjusting or resetting the filters.',
    nl: 'Probeer de filters aan te passen of te resetten.',
    ar: 'جرّب تبدّل ولا تصفّى الفلاتر من جديد.',
  },
  'articles.empty.hint.default': {
    fr: 'Les développeurs peuvent configurer leurs flux dans',
    en: 'Developers can configure their feeds in',
    nl: 'Ontwikkelaars kunnen hun feeds configureren in',
    ar: 'المطورين يقدرو يكونفيڭييو الخلاصات ديالهم فـ',
  },
  'articles.resetFilters': {
    fr: 'Réinitialiser les filtres',
    en: 'Reset filters',
    nl: 'Filters resetten',
    ar: 'رجّع الفلاتر',
  },
  'articles.rssExample': {
    fr: 'Exemple de flux RSS',
    en: 'RSS feed example',
    nl: 'RSS feed voorbeeld',
    ar: 'مثال ديال خلاصة RSS',
  },
  'articles.error.title': {
    fr: 'Impossible de charger les sources.',
    en: 'Unable to load sources.',
    nl: 'Kan bronnen niet laden.',
    ar: 'ما قدرناش نحمّلو المصادر.',
  },
  'articles.error.message': {
    fr: 'Merci de patienter, nous réessayons.',
    en: 'Please wait, we are retrying.',
    nl: 'Even geduld, we proberen opnieuw.',
    ar: 'سنّى شوية، غادي نعاودو نجربو.',
  },
  'articles.retry': {
    fr: 'Réessayer',
    en: 'Retry',
    nl: 'Opnieuw',
    ar: 'عاود جرّب',
  },
  'articles.checkConnection': {
    fr: 'Vérifier la connexion',
    en: 'Check connection',
    nl: 'Verbinding controleren',
    ar: 'تشافي لكونيكسيو',
  },

  // ── SummaryModal ──
  'summary.title': {
    fr: 'Résumé IA',
    en: 'AI Summary',
    nl: 'AI Samenvatting',
    ar: 'التلخيص ديال الـ AI',
  },
  'summary.cached': {
    fr: 'en cache',
    en: 'cached',
    nl: 'gecached',
    ar: 'مخزّن فـ الكاش',
  },
  'summary.readSource': {
    fr: 'Lire la source complète',
    en: 'Read full source',
    nl: 'Volledige bron lezen',
    ar: 'اقرا المصدر كامل',
  },
  'summary.close': {
    fr: 'Fermer',
    en: 'Close',
    nl: 'Sluiten',
    ar: 'سدّ',
  },
  'summary.regenerate': {
    fr: 'Régénérer',
    en: 'Regenerate',
    nl: 'Opnieuw',
    ar: 'عاود ولّد',
  },

  // ── Loading states ──
  'loading.connecting': {
    fr: 'Connexion au serveur IA…',
    en: 'Connecting to AI server…',
    nl: 'Verbinden met AI-server…',
    ar: 'كيتم الاتصال بالسيرڤور ديال الـ AI…',
  },
  'loading.serverSlow': {
    fr: 'Le serveur tarde un peu…',
    en: 'Server is a bit slow…',
    nl: 'Server is wat traag…',
    ar: 'السيرڤور تقيل شوية…',
  },
  'loading.serverUnreachable': {
    fr: "Le serveur ne répond pas — n'hésite pas à réessayer",
    en: "Server is not responding — feel free to retry",
    nl: 'Server reageert niet — probeer gerust opnieuw',
    ar: 'السيرڤور ما كيردش — ماتترددش تعاود تجرب',
  },
  'loading.modelStarting': {
    fr: 'Le modèle IA démarre…',
    en: 'AI model starting…',
    nl: 'AI-model start op…',
    ar: 'النموذج ديال الـ AI كيبدا…',
  },
  'loading.modelWriting': {
    fr: 'Le modèle IA rédige le résumé…',
    en: 'AI model is writing the summary…',
    nl: 'AI-model schrijft de samenvatting…',
    ar: 'النموذج كيكتب التلخيص…',
  },
  'loading.modelSlow': {
    fr: 'Modèle gratuit un peu lent, patience…',
    en: 'Free model a bit slow, please wait…',
    nl: 'Gratis model wat traag, even geduld…',
    ar: 'النموذج المجاني تقيل شوية، سنّى…',
  },
  'loading.modelLate': {
    fr: "Le modèle tarde — n'hésite pas à réessayer",
    en: 'Model is taking long — feel free to retry',
    nl: 'Model duurt lang — probeer gerust opnieuw',
    ar: 'النموذج كيطوّل — ماتترددش تعاود تجرب',
  },

  // ── Language switcher ──
  'lang.switcher': {
    fr: 'Langue',
    en: 'Language',
    nl: 'Taal',
    ar: 'اللوغة',
  },

  // ── ArticleCard ──
  'article.publishedOn': {
    fr: 'Publié le',
    en: 'Published on',
    nl: 'Gepubliceerd op',
    ar: 'تنشر فـ',
  },
  'article.aiSummary': {
    fr: '✨ Synthèse IA',
    en: '✨ AI Summary',
    nl: '✨ AI Samenvatting',
    ar: '✨ التلخيص ديال الـ AI',
  },
  'article.sourceFallback': {
    fr: 'Veille sémantique',
    en: 'Semantic monitoring',
    nl: 'Semantische monitoring',
    ar: 'مراقبة دلالية',
  },

  // ── Badge nouveaux articles ──
  'badge.new_one': {
    fr: 'nouvel article',
    en: 'new article',
    nl: 'nieuw artikel',
    ar: 'مقال جديد',
  },
  'badge.new_other': {
    fr: 'nouveaux articles',
    en: 'new articles',
    nl: 'nieuwe artikelen',
    ar: 'مقالات جدد',
  },
  'badge.title_one': {
    fr: '1 nouvel article — cliquer pour ignorer',
    en: '1 new article — click to dismiss',
    nl: '1 nieuw artikel — klik om te negeren',
    ar: 'مقال جديد — كليكي باش تتجاهلو',
  },
  'badge.title_other': {
    fr: '{count} nouveaux articles — cliquer pour ignorer',
    en: '{count} new articles — click to dismiss',
    nl: '{count} nieuwe artikelen — klik om te negeren',
    ar: '{count} مقال جدد — كليكي باش تتجاهلهم',
  },
}

export default t
