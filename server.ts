import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ASSET_PROMPTS: Record<string, { prompt: string; aspectRatio: string }> = {
  fei_sheet: {
    prompt:
      '32-bit PS1 hand-drawn pixel art sprite sheet of Fei Fong Wong from Xenogears, martial artist in dark red sleeveless gi, long black ponytail, 4-frame walk cycle and fighting stance, crisp pixel art, no anti-aliasing, solid #FF00FF magenta background',
    aspectRatio: '1:1',
  },
  elly_sheet: {
    prompt:
      '32-bit PS1 hand-drawn pixel art sprite sheet of Elly from Xenogears, red hair, white military uniform, crisp pixel art, solid #FF00FF background',
    aspectRatio: '1:1',
  },
  citan_sheet: {
    prompt:
      '32-bit PS1 hand-drawn pixel art sprite sheet of Citan Uzuki from Xenogears, green coat, glasses, katana stance, crisp pixel art, solid #FF00FF background',
    aspectRatio: '1:1',
  },
  weltall_sprite: {
    prompt:
      '32-bit PS1 hand-drawn pixel art mecha sprite of Weltall from Xenogears, dark midnight blue biomechanical armor, glowing yellow eyes, sharp shoulder pads, crisp pixel art, solid #FF00FF background',
    aspectRatio: '1:1',
  },
  octopath_cobblestone_tile: {
    prompt:
      'Seamless 32-bit hand-drawn pixel art cobblestone village square texture tile in the style of Octopath Traveler, high contrast warm stones and deep mortar, top-down orthogonal tileable texture',
    aspectRatio: '1:1',
  },
  octopath_grass_tile: {
    prompt:
      'Seamless 32-bit hand-drawn pixel art lush emerald forest grass texture tile in the style of Octopath Traveler, high contrast pixel clusters, top-down orthogonal tileable texture',
    aspectRatio: '1:1',
  },
  octopath_wood_wall: {
    prompt:
      'Seamless 32-bit hand-drawn pixel art rustic timber beams and stone cottage wall texture tile in the style of Octopath Traveler, high contrast pixel art',
    aspectRatio: '1:1',
  },
  octopath_pine_tree: {
    prompt:
      '32-bit PS1 hand-drawn pixel art pine tree sprite in the style of Octopath Traveler, rich layered dark emerald foliage with warm golden highlights and bark trunk, crisp pixel art, no anti-aliasing, solid #FF00FF magenta background',
    aspectRatio: '1:1',
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Server-side @google/genai Image Generation Route for Hand-Drawn Pixel Art Assets
  app.post('/api/bake-asset', async (req, res) => {
    const { assetKey, customPrompt } = req.body || {};
    const spec = ASSET_PROMPTS[assetKey];
    const promptToUse = customPrompt || spec?.prompt;

    if (!promptToUse) {
      res.status(400).json({ error: `Unknown assetKey: ${String(assetKey)}` });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured in Settings > Secrets. Using pre-baked hand-drawn pixel art asset.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: promptToUse }],
        },
        config: {
          imageConfig: {
            aspectRatio: spec?.aspectRatio || '1:1',
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
          res.json({
            assetKey,
            dataUrl,
            model: 'gemini-3.1-flash-lite-image',
          });
          return;
        }
      }

      res.status(502).json({
        error: 'Model response did not contain an inlineData image part.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Xenoresonance server listening on http://localhost:${PORT}`);
  });
}

startServer();
