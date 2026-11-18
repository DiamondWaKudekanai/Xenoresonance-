import React, { useState } from 'react';
import { DEATHBLOWS, PartyMemberState } from '../game/rules';
import { getPortraitDataUrl } from '../game/sprites';
import { spuAudio } from '../game/audio';

export interface ShaderConfig {
  crtScanlines: boolean;
  ps1Dither: boolean;
  dofVignette: boolean;
  audioMuted: boolean;
}

interface MainMenuModalProps {
  party: PartyMemberState[];
  shaderConfig: ShaderConfig;
  onUpdateShaderConfig: (cfg: ShaderConfig) => void;
  onRefuelAndHealAll: () => void;
  onToggleIdPersona: () => void;
  onClose: () => void;
}

type MenuTab = 'status' | 'deathblows' | 'garage' | 'config';

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  party,
  shaderConfig,
  onUpdateShaderConfig,
  onRefuelAndHealAll,
  onToggleIdPersona,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('status');

  return (
    <div
      role="dialog"
      aria-label="Tactical Main Menu"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 pointer-events-auto"
    >
      <div className="ps1-window w-full max-w-4xl p-6 text-slate-100">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-500/60 pb-3 mb-4">
          <div>
            <div className="text-xs font-mono-tabular text-amber-300">
              IGNIS SECTOR · SQUARESOFT 1998 TACTICAL FIELD TERMINAL
            </div>
            <h2 className="text-xl font-display font-bold text-white">
              SYSTEM MENU & GEAR GARAGE
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              spuAudio.playCancel();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-display font-bold bg-rose-700 hover:bg-rose-600 text-white border border-rose-300 cursor-pointer"
          >
            Close Menu [M / Esc]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {(
            [
              { id: 'status', label: '01. Party Status' },
              { id: 'deathblows', label: '02. Deathblow Mastery' },
              { id: 'garage', label: '03. Gear Garage' },
              { id: 'config', label: '04. Shaders & Audio Config' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                spuAudio.playCursor();
                setActiveTab(t.id);
              }}
              className={`px-4 py-2 text-xs font-display font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-slate-900/90 text-slate-200 border-slate-600 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Party Status */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {party.map((m) => (
                <div key={m.id} className="bg-slate-950/85 border border-slate-600 p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getPortraitDataUrl(
                        m.id,
                        m.idAwakened ? 'Id-Awakened' : 'Normal'
                      )}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 pixelated border border-amber-400 shrink-0"
                    />
                    <div>
                      <div className="text-xs font-mono-tabular text-amber-300">
                        LV {m.level} · {m.gear.name}
                      </div>
                      <h3 className="text-base font-display font-bold text-white">
                        {m.name}
                      </h3>
                      <div className="text-xs text-slate-300">{m.archetypeTitle}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs font-mono-tabular">
                    <div className="flex justify-between">
                      <span className="text-slate-400">HP (On-Foot)</span>
                      <span className="text-emerald-300 font-bold">
                        {m.hp} / {m.maxHp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">EP (Chi / Ether)</span>
                      <span className="text-sky-300 font-bold">
                        {m.ep} / {m.maxEp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Turn AP / Combo Bank</span>
                      <span className="text-amber-300 font-bold">
                        {m.maxAp} AP · Bank {m.comboBank}/28
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ATK / DEF / ETHER / AGI</span>
                      <span className="text-slate-200">
                        {m.atk} / {m.def} / {m.ether} / {m.agility}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => {
                  spuAudio.playConfirm();
                  onRefuelAndHealAll();
                }}
                className="px-4 py-2 text-xs font-display font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300 cursor-pointer"
              >
                Full Party Heal & Gear Fuel Resupply
              </button>

              <button
                type="button"
                onClick={() => {
                  spuAudio.playDeathblowFinisher();
                  onToggleIdPersona();
                }}
                className="px-4 py-2 text-xs font-display font-bold bg-rose-700 hover:bg-rose-600 text-white border border-rose-300 cursor-pointer"
              >
                {party[0]?.idAwakened
                  ? 'Suppress Fei Latent Id Persona'
                  : 'Awaken Fei Latent Id Persona (Hyper Mode)'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Deathblow Learning Progress */}
        {activeTab === 'deathblows' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEATHBLOWS.map((db) => {
              const feiProg = party[0]?.deathblowProgress[db.id] ?? 100;
              return (
                <div
                  key={db.id}
                  className="bg-slate-950/85 border border-slate-600 p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-display font-bold"
                        style={{ color: db.color }}
                      >
                        {db.name} · {db.japaneseTitle}
                      </span>
                      <span className="text-xs font-mono-tabular text-amber-300">
                        {db.apCost} AP ({db.sequence.join(' + ')})
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{db.description}</p>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-mono-tabular text-slate-300">
                      <span>Gear Sync: {db.gearName} (Lv {db.gearLevelReq})</span>
                      <span>Mastery: {feiProg}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 border border-slate-600 mt-1 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 origin-left"
                        style={{ transform: `scaleX(${feiProg / 100})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Gear Garage */}
        {activeTab === 'garage' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {party.map((m) => (
              <div
                key={m.gear.id}
                className="ps1-window-gold p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono-tabular text-amber-300">
                    PILOT: {m.name.toUpperCase()}
                  </div>
                  <h3 className="text-lg font-display font-bold text-white mt-0.5">
                    {m.gear.name}
                  </h3>
                  <div className="text-xs text-slate-300 mb-3">{m.gear.title}</div>

                  <div className="space-y-1.5 text-xs font-mono-tabular">
                    <div className="flex justify-between">
                      <span className="text-slate-400">FRAME HP</span>
                      <span className="text-amber-300 font-bold">
                        {m.gear.frameHp} / {m.gear.maxFrameHp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ZOHAR FUEL</span>
                      <span className="text-sky-300 font-bold">
                        {m.gear.fuel} / {m.gear.maxFuel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ARMOR PLATING</span>
                      <span className="text-slate-200">{m.gear.armor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ETHER AMPLIFIER</span>
                      <span className="text-slate-200">{m.gear.etherAmp}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">WEIGHT</span>
                      <span className="text-slate-200">{m.gear.weightTons} Tons</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Post-Processing Shaders & Audio Config */}
        {activeTab === 'config' && (
          <div className="space-y-3">
            {(
              [
                {
                  key: 'crtScanlines',
                  title: 'CRT Trinitron Scanlines Shader',
                  desc: 'Overlays authentic 240p horizontal scanlines and subtle aperture curvature.',
                },
                {
                  key: 'ps1Dither',
                  title: '32-Bit PS1 Ordered Bayer Dithering',
                  desc: 'Applies classic late-90s 15-bit framebuffer color dither matrix.',
                },
                {
                  key: 'dofVignette',
                  title: 'FF Resonance Tilt-Shift Depth of Field',
                  desc: 'Enhances HD-2D diorama focus with upper and lower atmospheric framing.',
                },
                {
                  key: 'audioMuted',
                  title: 'Mute PS1 SPU Web Audio Synthesizer',
                  desc: 'Silences procedural BGM and sound effects.',
                },
              ] as const
            ).map((item) => {
              const enabled = shaderConfig[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between bg-slate-950/85 border border-slate-600 p-3.5"
                >
                  <div>
                    <div className="text-sm font-display font-bold text-white">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-300">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = {
                        ...shaderConfig,
                        [item.key]: !enabled,
                      };
                      if (item.key === 'audioMuted') {
                        spuAudio.setMuted(next.audioMuted);
                      } else {
                        spuAudio.playConfirm();
                      }
                      onUpdateShaderConfig(next);
                    }}
                    className={`px-4 py-1.5 text-xs font-mono-tabular font-bold border cursor-pointer ${
                      enabled
                        ? 'bg-emerald-600 border-emerald-300 text-white'
                        : 'bg-slate-800 border-slate-500 text-slate-300'
                    }`}
                  >
                    {enabled ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
