/**
 * Charge les variables d'environnement depuis le fichier .env correspondant à APP_ENV.
 *
 * Ordre de priorité :
 * 1. APP_ENV=development → .env.development
 * 2. APP_ENV=production  → .env.production
 * 3. Fallback → .env (compatibilité legacy)
 *
 * Vercel injecte directement les variables d'environnement, donc en production
 * Vercel ce fichier n'est pas nécessaire — le runtime a déjà les variables.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");

function loadEnvFile(path: string): void {
	if (!existsSync(path)) return;

	const content = readFileSync(path, "utf-8");
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		// Ignorer les commentaires et lignes vides
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;

		const key = trimmed.slice(0, eqIndex).trim();
		const value = trimmed.slice(eqIndex + 1).trim();

		// Ne pas écraser les variables déjà définies (ex: Vercel les injecte en premier)
		if (key && !(key in process.env)) {
			process.env[key] = value;
		}
	}
}

const appEnv = process.env.APP_ENV?.toLowerCase();

if (appEnv === "development") {
	loadEnvFile(join(projectRoot, ".env.development"));
} else if (appEnv === "production") {
	loadEnvFile(join(projectRoot, ".env.production"));
} else {
	// Fallback legacy
	loadEnvFile(join(projectRoot, ".env"));
}
