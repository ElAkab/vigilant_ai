// ⚠️ Chargement des variables d'environnement — DOIT être le premier import
import "./lib/env";

import { errorResponse } from "./lib/http";
import { handleListArticles, handleRefreshRss, fetchAndUpsertAllSources } from "./routes/articles";
import { handleSummarize, handleSummarizeStream, handleSummarizeV2, handleSummarizeV2Stream } from "./routes/summarize";
import { handleTranslate } from "./routes/translate";
import { handleGetModelStatus } from "./routes/debug";
import { globalAIService } from "./lib/aiService";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const port = Number(process.env.PORT ?? "8787");
const distDir = process.env.STATIC_DIR
  ? join(import.meta.dir, "..", process.env.STATIC_DIR)
  : join(import.meta.dir, "..", "dist");

// MIME types pour les fichiers statiques
const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".ico": "image/x-icon",
	".svg": "image/svg+xml",
	".jpg": "image/jpeg",
	".woff2": "font/woff2",
};

function serveStatic(pathname: string): Response | null {
	// Securite : pas de path traversal
	if (pathname.includes("..")) return null;

	let filePath = join(distDir, pathname === "/" ? "index.html" : pathname);

	// Si le fichier n'existe pas, fallback SPA -> index.html
	if (!existsSync(filePath)) {
		filePath = join(distDir, "index.html");
		if (!existsSync(filePath)) return null;
	}

	try {
		const ext = extname(filePath).toLowerCase();
		const contentType = MIME[ext] || "application/octet-stream";
		const content = readFileSync(filePath);
		return new Response(content, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": ext === ".html"
					? "no-cache"
					: "public, max-age=3600",
			},
		});
	} catch {
		return null;
	}
}

function route(req: Request): Promise<Response> | Response {
	const url = new URL(req.url);
	const pathname = url.pathname;

		// Routes API
		if (pathname === "/api/articles") return handleListArticles(req);
		if (pathname === "/api/rss/refresh") return handleRefreshRss(req);
		if (pathname === "/api/summarize/v2/stream") return handleSummarizeV2Stream(req);
		if (pathname === "/api/summarize/v2") return handleSummarizeV2(req);
		if (pathname === "/api/summarize") return handleSummarize(req);
		if (pathname === "/api/summarize/stream") return handleSummarizeStream(req);
		if (pathname === "/api/translate") return handleTranslate(req);
		if (pathname === "/api/debug/models") return handleGetModelStatus(req);

		// Fichiers statiques (frontend)
		const staticRes = serveStatic(url.pathname);
		if (staticRes) return staticRes;

		return new Response("Not found", { status: 404 });
	}

	const server = Bun.serve({
		port,
		idleTimeout: 60,
		async fetch(req: Request) {
			try {
				const started = performance.now();
				const res = await route(req);
				const ms = Math.round(performance.now() - started);

				const url = new URL(req.url);
				console.log(
					JSON.stringify({
						method: req.method,
						path: url.pathname,
						status: res.status,
						ms,
					}),
				);
				return res;
			} catch (err) {
				return errorResponse(err);
			}
		},
	});

	console.log(`Server ready: http://localhost:${server.port}`);
	console.log(`  Frontend: http://localhost:${server.port}/`);
	console.log(`  API:      http://localhost:${server.port}/api/articles`);

	// Préchargement des modèles au démarrage
	globalAIService.ensureModelsLoaded().catch((err) => {
		console.error("[Models] Échec du préchargement des modèles:", err);
	});

	// Warmup RSS au démarrage — pré-remplit le cache et la DB
	fetchAndUpsertAllSources().then(({ newCount, errors }) => {
		console.log(`[RSS Warmup] ${newCount} articles traités, ${errors.length} erreurs`);
		if (errors.length > 0) {
			for (const e of errors) console.warn(`[RSS Warmup] Erreur: ${e.message}`);
		}
	}).catch((err) => {
		console.error("[RSS Warmup] Échec:", err);
	});
