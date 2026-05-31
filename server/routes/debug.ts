import { json } from "../lib/http";
import { globalAIService } from "../lib/aiService";

export function handleGetModelStatus(req: Request): Response {
	if (req.method !== "GET") {
		return new Response("Method not allowed", { status: 405 });
	}

	const status = globalAIService.getModelStatus();
	return json({
		data: {
			currentModel: status.current,
			modelIndex: status.index,
			failureLog: status.failureLog,
			timestamp: new Date().toISOString(),
		},
	});
}
