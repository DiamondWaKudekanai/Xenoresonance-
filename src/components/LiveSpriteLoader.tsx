import React, { useEffect, useState } from 'react';
import {
  ExternalAssetsRegistry,
  getProcessedSheetCanvas,
  onLiveAssetChanged,
  preloadAllSheets,
  setLiveExternalAsset,
} from '../game/sprites';
import { spuAudio } from '../game/audio';

interface LiveSpriteLoaderProps {
  open: boolean;
  onClose: () => void;
}

const SHEET_SLOTS: Array<{
  key: string;
  label: string;
  dims: string;
  description: string;
  chroma: boolean;
}> = [
  {
    key: 'fei_sheet',
    label: 'FEI FONG WONG SHEET',
    dims: '1376×768px',
    description: 'Walk, Idle, Martial Arts & Deathblow CropBoxes (FEI_CROPS)',
    chroma: true,
  },
  {
    key: 'party_sheet',
    label: 'ELLY & CITAN PARTY SHEET',
    dims: '1376×768px',
    description: 'Elly Van Houten & Citan Uzuki CropBoxes (ELLY_CROPS / CITAN_CROPS)',
    chroma: true,
  },
  {
    key: 'weltall_sheet',
    label: 'WELTALL & ID-WELTALL SHEET',
    dims: '1376×768px',
    description: 'Weltall Mecha & Crimson Id-Awakened CropBoxes (WELTALL_CROPS)',
    chroma: true,
  },
  {
    key: 'gears_sheet',
    label: 'VIERGE, HEIMDAL & BOSS GEARS',
    dims: '1376×768px',
    description: '3-Row Mecha Atlas (GEARS_CROPS: Vierge, Heimdal, Boss Gear)',
    chroma: true,
  },
  {
    key: 'portraits_sheet',
    label: 'PS1 DIALOGUE PORTRAITS SHEET',
    dims: '1376×768px',
    description: '4×2 Dialogue & Battle HUD Portraits (PORTRAIT_CROPS)',
    chroma: true,
  },
  {
    key: 'props_sheet',
    label: 'HD-2D DIORAMA PROPS SHEET',
    dims: '1376×768px',
    description: 'Cottage, Zohar, Pines, Rocks, Fence, Barrels, Crates & Lantern (PROP_CROPS)',
    chroma: true,
  },
  {
    key: 'terrain_tiles',
    label: 'SEAMLESS TERRAIN ATLAS',
    dims: '1024×1024px',
    description: 'Cobblestone, Grass, Timber Wall & Cliff Quadrants',
    chroma: false,
  },
  {
    key: 'backdrop_lahan',
    label: 'LAHAN MOUNTAIN BACKDROP',
    dims: '1376×768px',
    description: 'Panoramic Twilight Horizon Backdrop',
    chroma: false,
  },
];

export const LiveSpriteLoader: React.FC<LiveSpriteLoaderProps> = ({ open, onClose }) => {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string>(
    'HD-2D 8-Sheet CropBox Pipeline Active (#FF00FF Chroma-Key + De-Spill + Sobel PBR).'
  );

  const refreshPreviews = () => {
    const next: Record<string, string> = {};
    SHEET_SLOTS.forEach((slot) => {
      const c = getProcessedSheetCanvas(slot.key, slot.chroma);
      if (c) {
        try {
          next[slot.key] = c.toDataURL('image/png');
        } catch {
          next[slot.key] = ExternalAssetsRegistry[slot.key] || '';
        }
      }
    });
    setPreviews(next);
  };

  useEffect(() => {
    preloadAllSheets();
    refreshPreviews();
    const unsub = onLiveAssetChanged((slotKey) => {
      refreshPreviews();
      setStatusMessage(`Updated HD-2D sheet slot: ${slotKey} (#FF00FF Chroma-Key applied)`);
    });
    const onKeyDown = (e: KeyboardEvent) => {
      if (open && e.code === 'Escape') {
        e.stopPropagation();
        spuAudio.playCancel();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unsub();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleFileUpload = (slotKey: string, file: File | null) => {
    if (!file) return;
    spuAudio.playConfirm();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLiveExternalAsset(slotKey, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetSlot = (slotKey: string) => {
    spuAudio.playCancel();
    setLiveExternalAsset(slotKey, null);
    setStatusMessage(`Reset ${slotKey} to default repository /assets/${slotKey}.png`);
  };

  return (
    <div
      role="dialog"
      aria-label="HD-2D Sprite Sheet Registry"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pointer-events-auto select-none"
    >
      <div className="ps1-window-gold w-full max-w-5xl max-h-[90vh] flex flex-col p-5 space-y-4 overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-400 pb-3">
          <div>
            <div className="text-xs text-amber-300 font-bold">
              EXTERNAL ASSETS REGISTRY · 8 HAND-DRAWN SHEETS · #FF00FF CHROMA-KEY & DE-SPILL
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">
              HD-2D SPRITE & PROP SHEET LOADER [F4]
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                spuAudio.playCancel();
                onClose();
              }}
              className="ps1-btn px-3 py-2 text-xs font-bold text-rose-300"
            >
              Close [ESC]
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="ps1-window px-3.5 py-2 flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-bold">{statusMessage}</span>
          <span className="text-slate-300">
            Filter: THREE.NearestFilter · Chroma-Key: #FF00FF → Alpha 0
          </span>
        </div>

        {/* 8 Hand-Drawn Sheet Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {SHEET_SLOTS.map((slot) => {
            const previewUrl = previews[slot.key];
            return (
              <div
                key={slot.key}
                className="ps1-window p-3 flex items-start gap-3 border border-slate-500"
              >
                <div className="w-28 h-20 bg-[#080d1a] border-2 border-slate-400 flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={slot.label}
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full object-contain pixelated"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">LOADING</span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-center text-amber-300 py-0.5">
                    {slot.dims}
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-300 truncate">
                      {slot.label}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold border bg-emerald-950 border-emerald-400 text-emerald-300">
                      {previewUrl ? 'READY' : 'LOADING'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-300 truncate">{slot.description}</div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="ps1-btn px-2.5 py-1 text-[10px] font-bold text-amber-300 cursor-pointer">
                      Upload PNG Sheet
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(slot.key, e.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleResetSlot(slot.key)}
                      className="ps1-btn px-2.5 py-1 text-[10px] font-bold text-sky-300"
                    >
                      Default /assets/{slot.key}.png
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
