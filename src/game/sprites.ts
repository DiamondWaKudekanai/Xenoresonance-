// ============================================================================
// FILE UNICO DI UPGRADE HD-2D: SOSTITUISCI src/game/sprites.ts CON QUESTO CODICE
// E USA buildPropBillboard() / createPropBillboardMesh() IN src/components/ResonanceCanvas.tsx
// ============================================================================
import * as THREE from 'three';
import { PortraitMood } from './rules';

export type SpriteArchetype =
  | 'fei'
  | 'elly'
  | 'citan'
  | 'villager'
  | 'gebler'
  | 'weltall'
  | 'vierge'
  | 'heimdal'
  | 'boss-gear'
  | 'zohar';

export type SpritePose =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'guard'
  | 'weak_hit'
  | 'strong_kick'
  | 'ether_cast'
  | 'raijin'
  | 'senretsu'
  | 'tenbu'
  | 'kishin';

export type TerrainTextureKind = 'grass' | 'cobble' | 'cliff' | 'hangar' | 'wood' | 'roof';

export type PropSpriteKind =
  | 'cottage'
  | 'zohar_monolith'
  | 'pine_1'
  | 'pine_2'
  | 'rock_1'
  | 'rock_2'
  | 'fence'
  | 'barrels'
  | 'crates'
  | 'lantern';

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const STORAGE_PREFIX = 'xenoresonance_live_asset_';

export const ExternalAssetsRegistry: Record<string, string | null> = {
  fei_sheet: '/assets/fei_sheet.png',
  party_sheet: '/assets/party_sheet.png',
  weltall_sheet: '/assets/weltall_sheet.png',
  gears_sheet: '/assets/gears_sheet.png',
  portraits_sheet: '/assets/portraits_sheet.png',
  props_sheet: '/assets/props_sheet.png',
  terrain_tiles: '/assets/terrain_tiles.png',
  backdrop_lahan: '/assets/backdrop_lahan.png',
};

type AssetListener = (slotKey: string, dataUrl: string | null) => void;
const assetListeners = new Set<AssetListener>();

export function onLiveAssetChanged(listener: AssetListener): () => void {
  assetListeners.add(listener);
  return () => assetListeners.delete(listener);
}

export function setLiveExternalAsset(slotKey: string, dataUrl: string | null): void {
  ExternalAssetsRegistry[slotKey] = dataUrl;
  try {
    if (typeof window !== 'undefined') {
      if (dataUrl) {
        window.localStorage.setItem(STORAGE_PREFIX + slotKey, dataUrl);
      } else {
        window.localStorage.removeItem(STORAGE_PREFIX + slotKey);
      }
    }
  } catch {
    // Ignore storage quota errors
  }
  sheetImageCache.delete(slotKey);
  sheetLoadingSet.delete(slotKey);
  spriteBundleCache.clear();
  portraitCache.clear();
  assetListeners.forEach((fn) => fn(slotKey, dataUrl));
}

export function isGearArchetype(archetype: SpriteArchetype): boolean {
  return (
    archetype === 'weltall' ||
    archetype === 'vierge' ||
    archetype === 'heimdal' ||
    archetype === 'boss-gear'
  );
}

export function getSpriteDimensions(archetype: SpriteArchetype): {
  width: number;
  height: number;
} {
  if (isGearArchetype(archetype)) return { width: 256, height: 256 };
  if (archetype === 'zohar') return { width: 160, height: 270 };
  return { width: 160, height: 240 };
}

// ============================================================================
// COORDINATE ESATTE AL PIXEL DELLE 8 TAVOLE HAND-DRAWN (1376x768 & 1024x1024)
// ============================================================================

export const FEI_CROPS: Record<SpritePose, CropBox[]> = {
  idle: [
    { x: 26, y: 11, w: 94, h: 143 },
    { x: 162, y: 11, w: 96, h: 143 },
    { x: 299, y: 11, w: 96, h: 143 },
    { x: 433, y: 10, w: 99, h: 144 },
  ],
  walk: [
    { x: 27, y: 160, w: 87, h: 147 },
    { x: 171, y: 161, w: 81, h: 148 },
    { x: 305, y: 161, w: 85, h: 148 },
    { x: 439, y: 160, w: 85, h: 147 },
    { x: 577, y: 161, w: 83, h: 147 },
    { x: 709, y: 160, w: 96, h: 149 },
    { x: 849, y: 161, w: 79, h: 148 },
    { x: 985, y: 160, w: 90, h: 149 },
  ],
  jump: [{ x: 285, y: 325, w: 132, h: 138 }],
  guard: [{ x: 29, y: 337, w: 91, h: 126 }],
  weak_hit: [{ x: 19, y: 475, w: 128, h: 143 }],
  strong_kick: [{ x: 424, y: 317, w: 131, h: 146 }],
  raijin: [{ x: 559, y: 315, w: 132, h: 148 }],
  senretsu: [{ x: 552, y: 475, w: 135, h: 143 }],
  tenbu: [{ x: 302, y: 617, w: 109, h: 151 }],
  kishin: [{ x: 830, y: 615, w: 140, h: 153 }],
  ether_cast: [{ x: 425, y: 615, w: 126, h: 153 }],
};

export const ELLY_CROPS: Record<'idle' | 'walk' | 'attack' | 'ether', CropBox[]> = {
  idle: [{ x: 17, y: 17, w: 97, h: 173 }],
  walk: [
    { x: 17, y: 17, w: 97, h: 173 },
    { x: 159, y: 17, w: 91, h: 173 },
    { x: 284, y: 17, w: 102, h: 168 },
    { x: 391, y: 18, w: 110, h: 172 },
    { x: 538, y: 18, w: 110, h: 172 },
  ],
  attack: [
    { x: 13, y: 212, w: 164, h: 169 },
    { x: 218, y: 199, w: 176, h: 180 },
    { x: 414, y: 217, w: 142, h: 162 },
  ],
  ether: [
    { x: 881, y: 180, w: 106, h: 199 },
    { x: 1031, y: 217, w: 160, h: 162 },
    { x: 1192, y: 205, w: 165, h: 174 },
  ],
};

export const CITAN_CROPS: Record<'idle' | 'walk' | 'attack' | 'ether', CropBox[]> = {
  idle: [{ x: 29, y: 389, w: 86, h: 188 }],
  walk: [
    { x: 29, y: 389, w: 86, h: 188 },
    { x: 159, y: 389, w: 86, h: 187 },
    { x: 294, y: 394, w: 93, h: 180 },
    { x: 427, y: 394, w: 95, h: 181 },
    { x: 561, y: 394, w: 102, h: 180 },
  ],
  attack: [
    { x: 544, y: 590, w: 133, h: 178 },
    { x: 836, y: 593, w: 170, h: 175 },
    { x: 1167, y: 590, w: 183, h: 178 },
  ],
  ether: [{ x: 279, y: 590, w: 120, h: 178 }],
};

export const WELTALL_CROPS: Record<
  'idle' | 'walk' | 'dash' | 'attack' | 'deathblow',
  CropBox[]
> = {
  idle: [
    { x: 39, y: 16, w: 165, h: 179 },
    { x: 243, y: 16, w: 165, h: 179 },
    { x: 447, y: 15, w: 166, h: 180 },
    { x: 651, y: 14, w: 168, h: 181 },
  ],
  walk: [
    { x: 44, y: 202, w: 163, h: 185 },
    { x: 297, y: 202, w: 170, h: 185 },
    { x: 572, y: 203, w: 173, h: 184 },
    { x: 831, y: 203, w: 172, h: 180 },
    { x: 1092, y: 203, w: 168, h: 184 },
  ],
  dash: [
    { x: 56, y: 395, w: 250, h: 169 },
    { x: 379, y: 395, w: 251, h: 169 },
    { x: 696, y: 395, w: 251, h: 169 },
    { x: 1021, y: 395, w: 252, h: 169 },
  ],
  attack: [
    { x: 70, y: 580, w: 205, h: 188 },
    { x: 316, y: 583, w: 242, h: 185 },
  ],
  deathblow: [
    { x: 586, y: 576, w: 247, h: 192 },
    { x: 849, y: 569, w: 242, h: 199 },
  ],
};

export const GEARS_CROPS: Record<'vierge' | 'heimdal' | 'boss-gear', CropBox[]> = {
  vierge: [
    { x: 79, y: 18, w: 179, h: 239 },
    { x: 412, y: 30, w: 197, h: 225 },
    { x: 693, y: 31, w: 277, h: 224 },
    { x: 1074, y: 10, w: 228, h: 230 },
  ],
  heimdal: [
    { x: 76, y: 264, w: 199, h: 234 },
    { x: 422, y: 263, w: 184, h: 231 },
    { x: 697, y: 272, w: 273, h: 226 },
    { x: 1097, y: 274, w: 224, h: 223 },
  ],
  'boss-gear': [
    { x: 12, y: 505, w: 284, h: 263 },
    { x: 356, y: 510, w: 329, h: 258 },
    { x: 702, y: 512, w: 326, h: 256 },
    { x: 1069, y: 487, w: 273, h: 281 },
  ],
};

export const PROP_CROPS: Record<PropSpriteKind, CropBox> = {
  cottage: { x: 21, y: 7, w: 385, h: 400 },
  zohar_monolith: { x: 441, y: 28, w: 189, h: 394 },
  pine_1: { x: 645, y: 20, w: 206, h: 413 },
  pine_2: { x: 858, y: 23, w: 186, h: 410 },
  rock_1: { x: 1178, y: 49, w: 161, h: 174 },
  rock_2: { x: 1184, y: 252, w: 166, h: 184 },
  fence: { x: 24, y: 453, w: 216, h: 86 },
  barrels: { x: 505, y: 449, w: 128, h: 148 },
  crates: { x: 759, y: 499, w: 270, h: 253 },
  lantern: { x: 1025, y: 499, w: 125, h: 246 },
};

export const PORTRAIT_CROPS: Record<string, CropBox> = {
  fei_Normal: { x: 20, y: 12, w: 303, h: 355 },
  fei_Angry: { x: 365, y: 12, w: 303, h: 355 },
  'fei_Id-Awakened': { x: 708, y: 12, w: 308, h: 355 },
  elly_Normal: { x: 1053, y: 12, w: 303, h: 355 },
  elly_Shocked: { x: 20, y: 402, w: 303, h: 355 },
  elly_Angry: { x: 365, y: 402, w: 303, h: 355 },
  citan_Normal: { x: 708, y: 402, w: 303, h: 355 },
  citan_Angry: { x: 1053, y: 402, w: 303, h: 355 },
};

// ============================================================================
// CHROMA-KEY (#FF00FF) + DE-SPILL + 1PX BORDER EROSION + SOBEL NORMAL MAP
// ============================================================================

const sheetImageCache = new Map<string, HTMLCanvasElement>();
const sheetLoadingSet = new Set<string>();

function createSafeCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }
  return {
    width,
    height,
    getContext: () => null,
    toDataURL: () => '',
  } as unknown as HTMLCanvasElement;
}

export function applyChromaKeyAndDespill(imgData: ImageData): void {
  const d = imgData.data;
  const w = imgData.width;
  const h = imgData.height;

  // Pass 1: Wide Magenta Chroma-Key for JPEG compression artifacts around #FF00FF
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (r > 135 && b > 135 && g < 135 && r - g > 35 && b - g > 35) {
      d[i + 3] = 0;
    } else if (r > 120 && b > 120 && r - g > 25 && b - g > 25) {
      // De-spill magenta tint
      const clampVal = Math.min(r, b, g + 22);
      d[i] = clampVal;
      d[i + 2] = clampVal;
    }
  }

  // Pass 2: Erode 1px of magenta fringe on border pixels adjacent to transparent background
  if (w > 2 && h > 2) {
    const alphaSnap = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      alphaSnap[p] = d[p * 4 + 3];
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (alphaSnap[idx] === 0) continue;

        const hasTransparentNeighbor =
          alphaSnap[idx - 1] === 0 ||
          alphaSnap[idx + 1] === 0 ||
          alphaSnap[idx - w] === 0 ||
          alphaSnap[idx + w] === 0;

        if (hasTransparentNeighbor) {
          const p4 = idx * 4;
          const r = d[p4];
          const g = d[p4 + 1];
          const b = d[p4 + 2];
          // Erode 1px border pixel if it has any residual purple/magenta fringe
          if (r > 95 && b > 95 && r - g > 14 && b - g > 14) {
            d[p4 + 3] = 0;
          } else if (r > g && b > g) {
            d[p4] = g;
            d[p4 + 2] = g;
          }
        }
      }
    }
  }
}

export function applyMagentaChromaKey(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyChromaKeyAndDespill(imgData);
  ctx.putImageData(imgData, 0, 0);
}

function loadImgAsync(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('No Image constructor'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function drawBoxFitted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  src: CropBox,
  dest: CropBox
): void {
  const scale = Math.min(dest.w / src.w, dest.h / src.h);
  const dw = Math.round(src.w * scale);
  const dh = Math.round(src.h * scale);
  const dx = dest.x + Math.round((dest.w - dw) / 2);
  const dy = dest.y + (dest.h - dh);
  ctx.drawImage(img, src.x, src.y, src.w, src.h, dx, dy, dw, dh);
}

/**
 * Se i file `/assets/*.png` della repository GitHub non sono ancora presenti nel container locale,
 * assembla dinamicamente una tavola 1376x768 (o 1024x1024 per `terrain_tiles`) popolando
 * esattamente le coordinate `CropBox` (`FEI_CROPS`, `ELLY_CROPS`, `CITAN_CROPS`, `WELTALL_CROPS`,
 * `GEARS_CROPS`, `PROP_CROPS`, `PORTRAIT_CROPS`) usando i bounding box misurati al pixel
 * in `/src/assets/images/*.jpg`.
 */
async function synthesizeFallbackSheetIfMissing(
  slotKey: string,
  applyChroma: boolean
): Promise<HTMLCanvasElement | null> {
  const isTerrain = slotKey === 'terrain_tiles';
  const c = createSafeCanvas(isTerrain ? 1024 : 1376, isTerrain ? 1024 : 768);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  if (applyChroma) {
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0, 0, c.width, c.height);
  }

  try {
    if (slotKey === 'fei_sheet') {
      const img = await loadImgAsync('/src/assets/images/fei_sheet_1794971744775.jpg');
      // Exact measured bounding boxes inside fei_sheet_1794971744775.jpg (1024x1024)
      const walkFrames: CropBox[] = [
        { x: 11, y: 72, w: 252, h: 432 },
        { x: 278, y: 75, w: 230, h: 436 },
        { x: 531, y: 75, w: 233, h: 436 },
        { x: 779, y: 77, w: 232, h: 435 },
      ];
      const attackFrames: CropBox[] = [
        { x: 134, y: 554, w: 269, h: 428 },
        { x: 624, y: 551, w: 247, h: 439 },
      ];

      (Object.keys(FEI_CROPS) as SpritePose[]).forEach((pose) => {
        FEI_CROPS[pose].forEach((dest, i) => {
          const src =
            pose === 'idle' || pose === 'walk' || pose === 'guard'
              ? walkFrames[i % walkFrames.length]
              : attackFrames[i % attackFrames.length];
          drawBoxFitted(ctx, img, src, dest);
        });
      });
    } else if (slotKey === 'party_sheet') {
      const [ellyImg, citanImg] = await Promise.all([
        loadImgAsync('/src/assets/images/elly_sheet_1794971745906.jpg'),
        loadImgAsync('/src/assets/images/citan_sheet_1794971745932.jpg'),
      ]);

      // Exact measured full-body row inside elly_sheet_1794971745906.jpg (1024x1024)
      const ellyFrames: CropBox[] = [
        { x: 26, y: 328, w: 219, h: 398 },
        { x: 282, y: 328, w: 199, h: 398 },
        { x: 533, y: 328, w: 224, h: 404 },
        { x: 789, y: 328, w: 209, h: 398 },
      ];

      (Object.keys(ELLY_CROPS) as Array<keyof typeof ELLY_CROPS>).forEach((k) => {
        ELLY_CROPS[k].forEach((dest, i) => {
          const src = ellyFrames[i % ellyFrames.length];
          drawBoxFitted(ctx, ellyImg, src, dest);
        });
      });

      // Exact measured frames inside citan_sheet_1794971745932.jpg (1024x1024) avoiding text labels
      const citanWalkFrames: CropBox[] = [
        { x: 26, y: 37, w: 244, h: 433 },
        { x: 267, y: 42, w: 249, h: 428 },
        { x: 513, y: 47, w: 244, h: 423 },
        { x: 764, y: 37, w: 234, h: 433 },
      ];
      const citanKatanaFrames: CropBox[] = [
        { x: 119, y: 535, w: 315, h: 437 },
        { x: 600, y: 544, w: 295, h: 428 },
      ];

      (Object.keys(CITAN_CROPS) as Array<keyof typeof CITAN_CROPS>).forEach((k) => {
        CITAN_CROPS[k].forEach((dest, i) => {
          const src =
            k === 'attack' || k === 'ether'
              ? citanKatanaFrames[i % citanKatanaFrames.length]
              : citanWalkFrames[i % citanWalkFrames.length];
          drawBoxFitted(ctx, citanImg, src, dest);
        });
      });
    } else if (slotKey === 'weltall_sheet') {
      const img = await loadImgAsync('/src/assets/images/weltall_sprite_1794971746779.jpg');
      const weltallSrc: CropBox = { x: 165, y: 6, w: 694, h: 1012 };
      (Object.keys(WELTALL_CROPS) as Array<keyof typeof WELTALL_CROPS>).forEach((k) => {
        WELTALL_CROPS[k].forEach((dest) => {
          drawBoxFitted(ctx, img, weltallSrc, dest);
        });
      });
    } else if (slotKey === 'gears_sheet') {
      const img = await loadImgAsync('/src/assets/images/gears_sheet_1794976755099.jpg');
      ctx.drawImage(img, 0, 0, 1376, 768);
    } else if (slotKey === 'portraits_sheet') {
      const img = await loadImgAsync('/src/assets/images/portraits_sheet_1794976757708.jpg');
      const cellW = img.width / 4;
      const cellH = img.height / 2;
      const sourceCells: Record<string, { cx: number; cy: number }> = {
        fei_Normal: { cx: 0, cy: 0 },
        fei_Angry: { cx: 3, cy: 0 },
        'fei_Id-Awakened': { cx: 2, cy: 1 },
        elly_Normal: { cx: 1, cy: 0 },
        elly_Shocked: { cx: 3, cy: 1 },
        elly_Angry: { cx: 0, cy: 1 },
        citan_Normal: { cx: 2, cy: 0 },
        citan_Angry: { cx: 1, cy: 1 },
      };
      Object.entries(PORTRAIT_CROPS).forEach(([k, dest]) => {
        const sc = sourceCells[k] || { cx: 0, cy: 0 };
        ctx.drawImage(
          img,
          sc.cx * cellW + 8,
          sc.cy * cellH + 8,
          cellW - 16,
          cellH - 16,
          dest.x,
          dest.y,
          dest.w,
          dest.h
        );
      });
    } else if (slotKey === 'props_sheet') {
      const [propsImg, pineImg] = await Promise.all([
        loadImgAsync('/src/assets/images/props_sheet_1794976758063.jpg'),
        loadImgAsync('/src/assets/images/octopath_pine_tree_1794971749857.jpg'),
      ]);
      // Exact measured bounding box for octopath_pine_tree_1794971749857.jpg (1024x1024)
      const pineSrc: CropBox = { x: 47, y: 21, w: 910, h: 1003 };
      drawBoxFitted(ctx, pineImg, pineSrc, PROP_CROPS.pine_1);
      drawBoxFitted(ctx, pineImg, pineSrc, PROP_CROPS.pine_2);

      // Exact measured bounding boxes inside props_sheet_1794976758063.jpg (1376x768)
      const exactPropsSources: Record<Exclude<PropSpriteKind, 'pine_1' | 'pine_2'>, CropBox> = {
        cottage: { x: 9, y: 8, w: 480, h: 355 },
        zohar_monolith: { x: 530, y: 15, w: 192, h: 324 },
        barrels: { x: 788, y: 10, w: 97, h: 120 },
        crates: { x: 1218, y: 6, w: 133, h: 132 },
        rock_1: { x: 557, y: 432, w: 182, h: 148 },
        rock_2: { x: 745, y: 411, w: 200, h: 175 },
        fence: { x: 560, y: 650, w: 179, h: 111 },
        lantern: { x: 1155, y: 552, w: 109, h: 209 },
      };

      (Object.keys(exactPropsSources) as Array<keyof typeof exactPropsSources>).forEach((pk) => {
        drawBoxFitted(ctx, propsImg, exactPropsSources[pk], PROP_CROPS[pk]);
      });
    } else if (slotKey === 'terrain_tiles') {
      const [cobble, grass, wood] = await Promise.all([
        loadImgAsync('/src/assets/images/octopath_cobblestone_tile_1794971747325.jpg'),
        loadImgAsync('/src/assets/images/octopath_grass_tile_1794971748107.jpg'),
        loadImgAsync('/src/assets/images/octopath_wood_wall_1794971749535.jpg'),
      ]);
      ctx.drawImage(cobble, 0, 0, 512, 512);
      ctx.drawImage(grass, 512, 0, 512, 512);
      ctx.drawImage(wood, 0, 512, 512, 512);
      ctx.drawImage(cobble, 512, 512, 512, 512);
    } else if (slotKey === 'backdrop_lahan') {
      const img = await loadImgAsync('/src/assets/images/backdrop_lahan_1794976758920.jpg');
      ctx.drawImage(img, 0, 0, 1376, 768);
    }
  } catch {
    return null;
  }

  if (applyChroma) applyMagentaChromaKey(c);
  return c;
}

export function getProcessedSheetCanvas(
  slotKey: string,
  applyChroma = true
): HTMLCanvasElement | null {
  if (sheetImageCache.has(slotKey)) return sheetImageCache.get(slotKey)!;

  const url =
    (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_PREFIX + slotKey)) ||
    ExternalAssetsRegistry[slotKey];

  if (!url || sheetLoadingSet.has(slotKey) || typeof Image === 'undefined') return null;

  sheetLoadingSet.add(slotKey);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const c = createSafeCanvas(img.width, img.height);
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    if (applyChroma) applyMagentaChromaKey(c);
    sheetImageCache.set(slotKey, c);
    sheetLoadingSet.delete(slotKey);
    spriteBundleCache.clear();
    portraitCache.clear();
    assetListeners.forEach((fn) => fn(slotKey, url));
  };
  img.onerror = () => {
    // Se il file `/assets/*.png` non è presente in locale, assembla la tavola 1376x768 / 1024x1024
    // con le coordinate esatte dei CropBox dalle risorse hand-drawn presenti nel progetto.
    void synthesizeFallbackSheetIfMissing(slotKey, applyChroma).then((fallbackCanvas) => {
      sheetLoadingSet.delete(slotKey);
      if (fallbackCanvas) {
        sheetImageCache.set(slotKey, fallbackCanvas);
        spriteBundleCache.clear();
        portraitCache.clear();
        assetListeners.forEach((fn) => fn(slotKey, url));
      }
    });
  };
  img.src = url;
  return null;
}

function buildNormalAndEmissiveFromAlbedo(albedoCanvas: HTMLCanvasElement): {
  normalCanvas: HTMLCanvasElement;
  emissiveCanvas: HTMLCanvasElement;
} {
  const w = albedoCanvas.width;
  const h = albedoCanvas.height;
  const normalCanvas = createSafeCanvas(w, h);
  const emissiveCanvas = createSafeCanvas(w, h);
  const aCtx = albedoCanvas.getContext('2d', { willReadFrequently: true });
  const nCtx = normalCanvas.getContext('2d', { willReadFrequently: true });
  const eCtx = emissiveCanvas.getContext('2d', { willReadFrequently: true });
  if (!aCtx || !nCtx || !eCtx) {
    return { normalCanvas, emissiveCanvas };
  }

  const src = aCtx.getImageData(0, 0, w, h).data;
  const nImg = nCtx.createImageData(w, h);
  const nd = nImg.data;
  const eImg = eCtx.createImageData(w, h);
  const ed = eImg.data;

  const lum = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    const idx = (cy * w + cx) * 4;
    if (src[idx + 3] < 32) return 0;
    return (src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3];
      if (a < 32) {
        nd[i] = 128;
        nd[i + 1] = 128;
        nd[i + 2] = 255;
        nd[i + 3] = 0;
        continue;
      }
      const dx = lum(x + 1, y) - lum(x - 1, y);
      const dy = lum(x, y + 1) - lum(x, y - 1);
      nd[i] = Math.round(Math.max(0, Math.min(255, (0.5 - dx * 1.6) * 255)));
      nd[i + 1] = Math.round(Math.max(0, Math.min(255, (0.5 + dy * 1.6) * 255)));
      nd[i + 2] = 215;
      nd[i + 3] = 255;

      // Pixel ad alta luminanza (occhi Gear, aure Chi, lanterne, Zohar) diventano emissivi per il Bloom
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      if ((r > 220 && g > 170) || (b > 225 && g > 190)) {
        ed[i] = r;
        ed[i + 1] = g;
        ed[i + 2] = b;
        ed[i + 3] = 255;
      }
    }
  }
  nCtx.putImageData(nImg, 0, 0);
  eCtx.putImageData(eImg, 0, 0);
  return { normalCanvas, emissiveCanvas };
}

export interface PBRSpriteFrameBundle {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  depthMaterial: THREE.MeshDepthMaterial;
}

const spriteBundleCache = new Map<string, PBRSpriteFrameBundle>();

function makeNearestTexture(canvas: HTMLCanvasElement, isColor = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function getSpriteFrameBundle(
  archetype: SpriteArchetype,
  frameIdx: number,
  idAwakened = false,
  explicitPose?: SpritePose
): PBRSpriteFrameBundle {
  const pose: SpritePose = explicitPose || 'idle';
  const key = `${archetype}_${pose}_${frameIdx}_${idAwakened ? 1 : 0}`;
  if (spriteBundleCache.has(key)) return spriteBundleCache.get(key)!;

  const dims = getSpriteDimensions(archetype);
  const albedoCanvas = createSafeCanvas(dims.width, dims.height);
  const ctx = albedoCanvas.getContext('2d', { willReadFrequently: true });

  let sheetKey = 'fei_sheet';
  let crop: CropBox = FEI_CROPS.idle[0];

  if (archetype === 'fei' || archetype === 'villager') {
    sheetKey = 'fei_sheet';
    const list = FEI_CROPS[pose] || FEI_CROPS.idle;
    crop = list[Math.abs(frameIdx) % list.length];
  } else if (archetype === 'elly' || archetype === 'gebler') {
    sheetKey = 'party_sheet';
    const group =
      pose === 'walk'
        ? ELLY_CROPS.walk
        : pose === 'ether_cast'
        ? ELLY_CROPS.ether
        : pose === 'idle' || pose === 'guard'
        ? ELLY_CROPS.idle
        : ELLY_CROPS.attack;
    crop = group[Math.abs(frameIdx) % group.length];
  } else if (archetype === 'citan') {
    sheetKey = 'party_sheet';
    const group =
      pose === 'walk'
        ? CITAN_CROPS.walk
        : pose === 'ether_cast'
        ? CITAN_CROPS.ether
        : pose === 'idle' || pose === 'guard'
        ? CITAN_CROPS.idle
        : CITAN_CROPS.attack;
    crop = group[Math.abs(frameIdx) % group.length];
  } else if (archetype === 'weltall') {
    sheetKey = 'weltall_sheet';
    const group =
      pose === 'walk'
        ? WELTALL_CROPS.walk
        : pose === 'jump'
        ? WELTALL_CROPS.dash
        : pose === 'raijin' || pose === 'senretsu' || pose === 'tenbu' || pose === 'kishin'
        ? WELTALL_CROPS.deathblow
        : pose === 'idle' || pose === 'guard'
        ? WELTALL_CROPS.idle
        : WELTALL_CROPS.attack;
    crop = group[Math.abs(frameIdx) % group.length];
  } else if (archetype === 'vierge' || archetype === 'heimdal' || archetype === 'boss-gear') {
    sheetKey = 'gears_sheet';
    const list = GEARS_CROPS[archetype];
    const idx =
      pose === 'idle' ? 0 : pose === 'walk' || pose === 'jump' ? 1 : pose === 'guard' ? 3 : 2;
    crop = list[idx % list.length];
  } else if (archetype === 'zohar') {
    sheetKey = 'props_sheet';
    crop = PROP_CROPS.zohar_monolith;
  }

  const sheetCanvas = getProcessedSheetCanvas(sheetKey, true);
  if (sheetCanvas && ctx) {
    ctx.imageSmoothingEnabled = false;
    // Mantiene le proporzioni originali e allinea i piedi alla base del frame
    const scale = Math.min(dims.width / crop.w, dims.height / crop.h);
    const dw = Math.round(crop.w * scale);
    const dh = Math.round(crop.h * scale);
    const dx = Math.round((dims.width - dw) / 2);
    const dy = dims.height - dh;
    ctx.drawImage(sheetCanvas, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh);
  }

  const { normalCanvas, emissiveCanvas } = buildNormalAndEmissiveFromAlbedo(albedoCanvas);
  const map = makeNearestTexture(albedoCanvas, true);
  const normalMap = makeNearestTexture(normalCanvas, false);
  const emissiveMap = makeNearestTexture(emissiveCanvas, true);
  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map,
    alphaTest: 0.5,
  });

  const bundle: PBRSpriteFrameBundle = { map, normalMap, emissiveMap, depthMaterial };
  if (sheetCanvas) {
    spriteBundleCache.set(key, bundle);
  }
  return bundle;
}

export function getSpriteFrameTexture(
  archetype: SpriteArchetype,
  frameIdx: number,
  idAwakened = false,
  explicitPose?: SpritePose
): THREE.CanvasTexture {
  return getSpriteFrameBundle(archetype, frameIdx, idAwakened, explicitPose).map;
}

// ============================================================================
// RITRATTI PS1 HAND-DRAWN PER DIALOGHI E BATTLE HUD
// ============================================================================
const portraitCache = new Map<string, string>();

export function getPortraitDataUrl(
  speakerId: string,
  mood: PortraitMood = 'Normal'
): string {
  const normSpeaker =
    speakerId === 'elly' ? 'elly' : speakerId === 'citan' ? 'citan' : 'fei';
  const key = `${normSpeaker}_${mood}`;
  if (portraitCache.has(key)) return portraitCache.get(key)!;

  const sheet = getProcessedSheetCanvas('portraits_sheet', true);
  const crop =
    PORTRAIT_CROPS[key] ||
    PORTRAIT_CROPS[`${normSpeaker}_Normal`] ||
    PORTRAIT_CROPS.fei_Normal;

  const c = createSafeCanvas(96, 96);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  if (sheet && ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, crop.x, crop.y, crop.w, crop.h, 0, 0, 96, 96);
    const url = c.toDataURL('image/png');
    portraitCache.set(key, url);
    return url;
  }
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
}

export function preloadAllSheets(): void {
  Object.keys(ExternalAssetsRegistry).forEach((slotKey) => {
    const applyChroma = slotKey !== 'terrain_tiles' && slotKey !== 'backdrop_lahan';
    getProcessedSheetCanvas(slotKey, applyChroma);
  });
}

// ============================================================================
// TEXTURE TERRENO HD-2D SEAMLESS (DA terrain_tiles.png 1024x1024)
// ============================================================================
export function createPixelEnvironmentTexture(
  kind: TerrainTextureKind,
  maxAnisotropy = 1
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const colorCanvas = createSafeCanvas(size, size);
  const ctx = colorCanvas.getContext('2d', { willReadFrequently: true });

  const bumpCanvas = createSafeCanvas(size, size);
  const bCtx = bumpCanvas.getContext('2d', { willReadFrequently: true });

  const map = makeNearestTexture(colorCanvas, true);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = makeNearestTexture(bumpCanvas, false);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const paintFromAtlas = () => {
    const atlas = getProcessedSheetCanvas('terrain_tiles', false);
    if (!atlas || !ctx || !bCtx) return;
    ctx.imageSmoothingEnabled = false;
    bCtx.imageSmoothingEnabled = false;
    const halfW = Math.floor(atlas.width / 2);
    const halfH = Math.floor(atlas.height / 2);
    const qx = kind === 'grass' || kind === 'cliff' ? halfW : 0;
    const qy = kind === 'wood' || kind === 'cliff' || kind === 'roof' ? halfH : 0;
    ctx.drawImage(atlas, qx, qy, halfW, halfH, 0, 0, size, size);
    bCtx.drawImage(atlas, qx, qy, halfW, halfH, 0, 0, size, size);
    map.needsUpdate = true;
    bumpMap.needsUpdate = true;
  };

  paintFromAtlas();
  onLiveAssetChanged((slot) => {
    if (slot === 'terrain_tiles') paintFromAtlas();
  });

  return { map, bumpMap };
}

// ============================================================================
// NUOVO GENERATORE DI ELEMENTI SCENICI 2.5D HAND-DRAWN (PER ResonanceCanvas.tsx)
// Sostituisce i coni 3D degli alberi e i cubi delle case con i veri sprite HD-2D!
// ============================================================================
export function createPropBillboardMesh(
  propKind: PropSpriteKind,
  worldHeight: number
): THREE.Group {
  const group = new THREE.Group();
  const crop = PROP_CROPS[propKind];
  const aspect = crop.w / crop.h;
  const worldWidth = worldHeight * aspect;

  const c = createSafeCanvas(crop.w, crop.h);
  const ctx = c.getContext('2d', { willReadFrequently: true });

  const tex = makeNearestTexture(c, true);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.5,
    roughness: 0.65,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const depthMat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: tex,
    alphaTest: 0.5,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldHeight), mat);
  mesh.position.y = worldHeight * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = depthMat;
  group.add(mesh);

  const refresh = () => {
    const sheet = getProcessedSheetCanvas('props_sheet', true);
    if (!sheet || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(sheet, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    tex.needsUpdate = true;
  };
  refresh();
  onLiveAssetChanged((slot) => {
    if (slot === 'props_sheet') refresh();
  });

  return group;
}

export const buildPropBillboard = createPropBillboardMesh;

/**
 * Crea un fondale panoramico HD-2D per il villaggio di Lahan (`backdrop_lahan.png`).
 */
export function createBackdropMesh(width = 76, height = 34): THREE.Mesh {
  const c = createSafeCanvas(1376, 768);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const tex = makeNearestTexture(c, true);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);

  const refresh = () => {
    const sheet = getProcessedSheetCanvas('backdrop_lahan', false);
    if (!sheet || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, 0, 0, c.width, c.height);
    tex.needsUpdate = true;
  };
  refresh();
  onLiveAssetChanged((slot) => {
    if (slot === 'backdrop_lahan') refresh();
  });

  return mesh;
}
