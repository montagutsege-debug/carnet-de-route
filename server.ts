import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

interface GroundedPlaceItem {
  title: string;
  uri: string;
  reviewSnippets: string[];
}

interface RawGroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{
        content?: string;
        uri?: string;
      }>;
    };
  };
  web?: {
    uri?: string;
    title?: string;
  };
}

function createGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeText(value: unknown, maxLength = 120): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Free tier: Google Maps grounding needs billing, so it is opt-in.
const USE_MAPS_GROUNDING = process.env.GEMINI_MAPS_GROUNDING === 'true';
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-3.5-flash,gemini-4-hydrogen,gemini-3.8-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

function errorStatus(err: unknown): number {
  return typeof err === 'object' && err !== null && 'status' in err
    ? Number((err as { status?: number }).status)
    : 500;
}

async function generateWithFallback(ai: GoogleGenAI, prompt: string, lat: number, lng: number) {
  let lastErr: unknown;
  for (const model of GEMINI_MODELS) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: USE_MAPS_GROUNDING
          ? {
              tools: [{ googleMaps: {} }],
              toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } },
            }
          : undefined,
      });
    } catch (err) {
      lastErr = err;
      const status = errorStatus(err);
      // Try the next model when this one is overloaded, rate-limited or unavailable.
      if (![404, 429, 500, 503].includes(status)) throw err;
      console.warn(`Gemini model ${model} failed (${status}), trying next model.`);
    }
  }
  throw lastErr;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/suggestions-etape', async (req, res) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({
        error: 'Coordonnées GPS invalides. Renseignez une latitude et une longitude valides.',
      });
      return;
    }

    const ai = createGenAIClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Clé GEMINI_API_KEY indisponible sur le serveur. Vérifiez les secrets dans les paramètres.',
      });
      return;
    }

    const nomAire = sanitizeText(req.body?.nomAire);
    const commune = sanitizeText(req.body?.commune);
    const regionPays = sanitizeText(req.body?.regionPays);

    const contextParts = [nomAire, commune, regionPays].filter(Boolean);
    const locationHint =
      contextParts.length > 0
        ? `Lieu indiqué sur la fiche : ${contextParts.join(', ')}.`
        : 'Aucun nom de commune renseigné, base-toi uniquement sur le point GPS.';

    const prompt = [
      `Tu es un guide de voyage francophone pour voyageurs en camping-car et fourgon.`,
      `Point GPS exact de l'étape : latitude ${lat.toFixed(5)}, longitude ${lng.toFixed(5)}.`,
      locationHint,
      `Propose en français des suggestions concrètes, fiables et réellement situées autour de ce point GPS (dans un rayon raisonnable d'environ 15 à 25 km), organisées exactement en 3 rubriques Markdown :`,
      ``,
      `### Visites incontournables aux alentours`,
      `- 3 à 4 lieux à voir absolument (patrimoine, villages, sites remarquables, points de vue) avec une courte phrase utile et la distance approximative.`,
      ``,
      `### Randonnées & balades`,
      `- 2 à 3 idées de randonnées, sentiers côtiers, boucles nature ou balades accessibles autour du point GPS (avec niveau ou durée indicative).`,
      ``,
      `### À manger : plats locaux & bonnes adresses`,
      `- Les spécialités culinaires, plats typiques ou produits du terroir à goûter dans ce secteur, accompagnés de 2 à 3 bonnes adresses locales (restaurants, marchés, fermes, boulangeries ou crêperies) proches du point GPS.`,
      ``,
      `Reste concis, naturel et pratique pour un carnet de voyage. N'invente aucun lieu inexistant.`,
    ].join('\n');

    try {
      const response = await generateWithFallback(ai, prompt, lat, lng);

      const markdown = (response.text ?? '').trim();
      const rawChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ??
        []) as RawGroundingChunk[];

      const seenUris = new Set<string>();
      const places: GroundedPlaceItem[] = [];

      for (const chunk of rawChunks) {
        const mapsData = chunk?.maps;
        if (mapsData?.uri && isSafeHttpUrl(mapsData.uri) && !seenUris.has(mapsData.uri)) {
          seenUris.add(mapsData.uri);
          const snippets: string[] = [];
          const rawSnippets = mapsData.placeAnswerSources?.reviewSnippets ?? [];
          for (const snippet of rawSnippets) {
            if (snippet?.content && typeof snippet.content === 'string') {
              snippets.push(snippet.content.trim());
            }
          }
          places.push({
            title: mapsData.title?.trim() || 'Voir sur Google Maps',
            uri: mapsData.uri,
            reviewSnippets: snippets.slice(0, 2),
          });
        }
      }

      if (!markdown && places.length === 0) {
        res.status(502).json({
          error: 'Aucune suggestion n’a pu être trouvée autour de ce point GPS.',
        });
        return;
      }

      res.json({
        markdown,
        places,
        coordinatesKey: `${lat.toFixed(4)},${lng.toFixed(4)}`,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : 500;
      const rawMessage = err instanceof Error ? err.message : String(err);

      if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'Quota temporairement atteint pour les suggestions. Réessayez dans quelques instants.',
        });
        return;
      }

      if (status === 401 || status === 403 || rawMessage.includes('API_KEY_INVALID')) {
        res.status(403).json({
          error:
            'Accès refusé par le service Gemini. Vérifiez la clé dans Settings > Secrets.',
        });
        return;
      }

      console.error('Error generating stage suggestions:', err);
      res.status(500).json({
        error: 'Impossible de récupérer les suggestions autour de ce point GPS pour le moment.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Carnet de Route server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
