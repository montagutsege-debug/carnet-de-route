/**
 * Suggestions « aux alentours » d'une étape, via Gemini.
 * Shared by the local Express server (server.ts) and the Vercel function
 * (api/suggestions-etape.ts). Files under api/_lib are not deployed as functions.
 */
import { GoogleGenAI } from '@google/genai';

export interface SuggestionsResult {
  status: number;
  body: Record<string, unknown>;
}

function reply(status: number, body: Record<string, unknown>): SuggestionsResult {
  return { status, body };
}

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
// Read at call time: the local server loads .env.local after this module is imported.
const useMapsGrounding = () => process.env.GEMINI_MAPS_GROUNDING === 'true';
const geminiModels = () =>
  (process.env.GEMINI_MODELS || 'gemini-3.5-flash,gemini-4-hydrogen,gemini-3.8-flash')
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
  for (const model of geminiModels()) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: useMapsGrounding()
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSuggestions(input: any): Promise<SuggestionsResult> {
  const lat = Number(input?.lat);
  const lng = Number(input?.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return reply(400, {
      error: 'Coordonnées GPS invalides. Renseignez une latitude et une longitude valides.',
    });
  }

  const ai = createGenAIClient();
  if (!ai) {
    return reply(503, {
      error:
        'Clé GEMINI_API_KEY indisponible sur le serveur. Vérifiez les secrets dans les paramètres.',
    });
  }

  const nomAire = sanitizeText(input?.nomAire);
  const commune = sanitizeText(input?.commune);
  const regionPays = sanitizeText(input?.regionPays);

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
      return reply(502, {
        error: 'Aucune suggestion n’a pu être trouvée autour de ce point GPS.',
      });
    }

    return reply(200, {
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
      return reply(429, {
        error:
          'Quota temporairement atteint pour les suggestions. Réessayez dans quelques instants.',
      });
    }

    if (status === 401 || status === 403 || rawMessage.includes('API_KEY_INVALID')) {
      return reply(403, {
        error:
          'Accès refusé par le service Gemini. Vérifiez la clé dans Settings > Secrets.',
      });
    }

    console.error('Error generating stage suggestions:', err);
    return reply(500, {
      error: 'Impossible de récupérer les suggestions autour de ce point GPS pour le moment.',
    });
  }
}
