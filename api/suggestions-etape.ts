/**
 * Vercel serverless function: POST /api/suggestions-etape
 * The GEMINI_API_KEY variable is set in the Vercel project settings.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { getSuggestions } from './_lib/suggestions.js';

type VercelRequest = IncomingMessage & { body?: unknown };

export default async function handler(req: VercelRequest, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Méthode non autorisée.' }));
    return;
  }
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const result = await getSuggestions(body);
  res.statusCode = result.status;
  res.end(JSON.stringify(result.body));
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
