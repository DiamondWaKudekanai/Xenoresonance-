import React, { useEffect, useState } from 'react';
import {
  AttackInput,
  calculateChargeFuelRecovery,
  canAppendInput,
  DEATHBLOWS,
  detectDeathblow,
  EnemyCombatant,
  EtherSkill,
  getAttackApCost,
  getSequenceApCost,
  PartyMemberState,
} from '../game/rules';
import { InventoryItem } from '../game/lore';
import { spuAudio } from '../game/audio';

export interface FloatingDamageNumber {
  id: number;
  label: string;
  amount: number;
  isCrit: boolean;
  isDeathblow: boolean;
  isHeal?: boolean;
  color: string;
  targetSide: 'enemy' | 'party';
}

interface BattleHUDProps {
  encounterTitle: string;
  isBoss: boolean;
  party: PartyMemberState[];
  enemies: EnemyCombatant[];
  activeActorId: string | null;
  selectedEnemyIdx: number;
  onSelectEnemy: (idx: number) => void;
  onExecuteAttackSequence: (sequence: AttackInput[]) => void;
  onExecuteComboBankBarrage: () => void;
  onCastEther: (skill: EtherSkill) => void;
  onToggleGear: () => void;
  onToggleBooster: () => void;
  onDefendOrCharge: () => void;
  onRepairGearFrame: () => void;
  onUseItem: (item: InventoryItem) => void;
  onFleeBattle: () => void;
  inventory: InventoryItem[];
  floatingNumbers: FloatingDamageNumber[];
  combatLog: string;
}

type SubMenuState = 'cross' | 'attack-chain' | 'ether' | 'right-menu';

function formatSequenceSymbols(seq: AttackInput[]): string {
  return seq.map((i) => (i === 'T' ? '▲' : i === 'S' ? '■' : '✕')).join(' + ');
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  encounterTitle,
  isBoss,
  party,
  enemies,
  activeActorId,
  selectedEnemyIdx,
  onSelectEnemy,
  onExecuteAttackSequence,
  onExecuteComboBankBarrage,
  onCastEther,
  onToggleGear,
  onToggleBooster,
  onDefendOrCharge,
  onRepairGearFrame,
  onUseItem,
  onFleeBattle,
  inventory,
  floatingNumbers,
  combatLog,
}) => {
  const [subMenu, setSubMenu] = useState<SubMenuState>('cross');
  const [inputChain, setInputChain] = useState<AttackInput[]>([]);

  const activeActor = party.find((p) => p.id === activeActorId) || null;
  const inGear = activeActor?.inGear ?? false;
  const maxApSlots = activeActor?.maxAp ?? 7;

  const currentApUsed = getSequenceApCost(inputChain);
  const currentFuelUsed = inputChain.reduce(
    (sum, i) => sum + (i === 'T' ? 10 : i === 'S' ? 20 : 30),
    0
  );

  const previewDeathblow = activeActor
    ? detectDeathblow(inputChain, activeActor.inGear, activeActor.gear.attackLevel)
    : null;

  const handleAppendInput = (inp: AttackInput) => {
    if (!activeActor) return;
    if (
      canAppendInput(
        inputChain,
        inp,
        activeActor.maxAp,
        activeActor.inGear,
        activeActor.gear.fuel
      )
    ) {
      spuAudio.playMartialStrike(inp);
      setInputChain((prev) => [...prev, inp]);
    } else {
      spuAudio.playCancel();
    }
  };

  const handlePresetSequence = (seq: AttackInput[]) => {
    if (!activeActor) return;
    spuAudio.playCursor();
    setInputChain(seq);
  };

  const handleFireSequence = () => {
    if (!activeActor || inputChain.length === 0) return;
    const seq = [...inputChain];
    setInputChain([]);
    setSubMenu('cross');
    onExecuteAttackSequence(seq);
  };

  useEffect(() => {
    const onBattleKey = (e: KeyboardEvent) => {
      if (!activeActor) return;

      if (subMenu === 'cross') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          spuAudio.playConfirm();
          setSubMenu('ether');
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'Enter') {
          e.preventDefault();
          spuAudio.playConfirm();
          setInputChain([]);
          setSubMenu('attack-chain');
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          spuAudio.playConfirm();
          setSubMenu('right-menu');
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyG') {
          e.preventDefault();
          spuAudio.playGearBooster();
          setInputChain([]);
          onToggleGear();
        }
      } else if (subMenu === 'attack-chain') {
        // [W / ▲ = 1 AP], [A / ■ = 2 AP], [S / ✕ = 3 AP], più tasti numerici/classici e Invio per confermare
        if (e.code === 'KeyW' || e.code === 'Digit1' || e.code === 'KeyT') {
          e.preventDefault();
          handleAppendInput('T');
        } else if (e.code === 'KeyA' || e.code === 'Digit2' || e.code === 'KeyY') {
          e.preventDefault();
          handleAppendInput('S');
        } else if (e.code === 'KeyS' || e.code === 'Digit3' || e.code === 'KeyX') {
          e.preventDefault();
          handleAppendInput('X');
        } else if (e.code === 'Backspace') {
          e.preventDefault();
          spuAudio.playCancel();
          setInputChain((prev) => prev.slice(0, -1));
        } else if (e.code === 'Escape') {
          e.preventDefault();
          spuAudio.playCancel();
          setInputChain([]);
          setSubMenu('cross');
        } else if (e.code === 'Enter' && inputChain.length > 0) {
          e.preventDefault();
          handleFireSequence();
        }
      } else if (e.code === 'Escape' || e.code === 'Backspace') {
        e.preventDefault();
        spuAudio.playCancel();
        setSubMenu('cross');
      }
    };
    window.addEventListener('keydown', onBattleKey);
    return () => window.removeEventListener('keydown', onBattleKey);
  });

  // Costruisce l'array dei 7 blocchi AP (verdi per AP spesi, gialli se Deathblow pronto, grigi per AP liberi)
  const apBlockColors: Array<'spent' | 'deathblow' | 'empty'> = [];
  for (let slot = 0; slot < maxApSlots; slot++) {
    if (slot < currentApUsed) {
      apBlockColors.push(previewDeathblow ? 'deathblow' : 'spent');
    } else {
      apBlockColors.push('empty');
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 z-20">
      {/* TOP BAR: Classic PS1 Action Message Window (Left) + Target Lock Window (Right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="ps1-window px-4 py-2 pointer-events-auto min-w-[320px] max-w-xl">
          <div className="text-[11px] text-amber-300 tracking-widest uppercase">
            {isBoss ? 'BOSS ENGAGEMENT' : 'BATTLE'} :: {encounterTitle}
          </div>
          <div className="text-xs text-white mt-0.5">{combatLog}</div>
        </div>

        {/* Classic PS1 Enemy Target Selector Window */}
        <div className="ps1-window p-2 pointer-events-auto flex flex-col gap-1.5 min-w-[250px]">
          <div className="text-[10px] text-sky-300 border-b border-slate-500 pb-0.5 flex justify-between">
            <span>TARGET LOCK</span>
            {!isBoss && (
              <button
                type="button"
                onClick={onFleeBattle}
                className="text-amber-300 hover:text-white underline cursor-pointer"
              >
                [ESCAPE]
              </button>
            )}
          </div>
          {enemies.map((en, idx) => {
            const isDead = en.hp <= 0;
            const isSelected = idx === selectedEnemyIdx;
            const hpPct = Math.max(0, Math.min(100, Math.round((en.hp / en.maxHp) * 100)));
            return (
              <button
                key={en.id}
                type="button"
                disabled={isDead}
                onClick={() => {
                  spuAudio.playCursor();
                  onSelectEnemy(idx);
                }}
                className={`px-2 py-1 text-left border ${
                  isSelected && !isDead
                    ? 'border-amber-400 bg-[#001d8a]'
                    : 'border-slate-600 bg-[#000938]'
                } ${isDead ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-bold">
                    {isSelected && !isDead ? '▶ ' : '  '}
                    {en.name}
                  </span>
                  <span className="text-[11px] text-white">
                    {Math.max(0, Math.round(en.hp))}/{en.maxHp}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black border border-slate-400 mt-1">
                  <div
                    className="h-full bg-rose-500 origin-left"
                    style={{ transform: `scaleX(${hpPct / 100})` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: Floating Hit / Deathblow Popups + Live Combo Input Bar when Attacking */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-3 pointer-events-none">
        {floatingNumbers.map((fn) => (
          <div key={fn.id} className="ps1-window-gold px-5 py-2 text-center">
            <div className="text-xs font-bold tracking-widest" style={{ color: fn.color }}>
              {fn.label}
            </div>
            <div className="text-2xl font-bold text-white">
              {fn.isHeal ? '+' : '-'}
              {Math.round(fn.amount)} {fn.isCrit ? 'CRITICAL!' : ''}
            </div>
          </div>
        ))}

        {/* COMBO INPUT BAR AL CENTRO DELLO SCHERMO QUANDO SI SELEZIONA ATTACK */}
        {activeActor && subMenu === 'attack-chain' && (
          <div className="ps1-window-gold p-4 w-full max-w-xl pointer-events-auto space-y-3">
            <div className="flex items-center justify-between border-b border-slate-400 pb-1.5">
              <span className="text-xs text-amber-300 font-bold">
                {inGear ? `GEAR ATTACK QUEUE [${activeActor.gear.name}]` : `COMBO INPUT BAR :: ${activeActor.name}`}
              </span>
              <span className="text-xs text-white font-bold">
                {inGear
                  ? `FUEL USED: ${currentFuelUsed} / ${activeActor.gear.fuel}`
                  : `AP SLOTS: ${maxApSlots - currentApUsed} REM / ${maxApSlots} MAX`}
              </span>
            </div>

            {/* 7 Blocchi AP Verdi / Gialli in Tempo Reale */}
            {!inGear ? (
              <div className="flex items-center gap-2 bg-black p-2 border-2 border-slate-400">
                <span className="text-xs text-sky-300 mr-2">AP GAUGE:</span>
                <div className="flex-1 grid grid-cols-7 gap-1.5">
                  {apBlockColors.map((status, i) => (
                    <div
                      key={i}
                      className={`h-4 border border-white ${
                        status === 'deathblow'
                          ? 'bg-amber-400'
                          : status === 'spent'
                          ? 'bg-emerald-400'
                          : 'bg-slate-900 opacity-45'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-black p-2 border-2 border-slate-400 text-xs">
                <span className="text-sky-300">
                  ATTACK LEVEL: Lv {activeActor.gear.attackLevel >= 4 ? '∞' : activeActor.gear.attackLevel}
                </span>
                <span className="text-amber-300">
                  {activeActor.gear.attackLevel >= 1
                    ? '2ND INPUT UNLEASHES GEAR DEATHBLOW!'
                    : '1ST HIT BUILDS ATTACK LEVEL (+1)'}
                </span>
              </div>
            )}

            {/* Sequenza tasti inseriti + Anteprima Live del Deathblow sbloccato (es. ▲ + ✕ = RAIJIN) */}
            <div className="bg-[#000622] border-2 border-slate-400 p-2.5 flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-300">BUFFER:</span>
                {inputChain.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Press [W / ▲ = 1 AP], [A / ■ = 2 AP], [S / ✕ = 3 AP]...
                  </span>
                ) : (
                  inputChain.map((inp, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs font-bold bg-[#001878] border border-slate-300 text-white"
                    >
                      {inp === 'T'
                        ? `▲ (${getAttackApCost('T')}AP)`
                        : inp === 'S'
                        ? `■ (${getAttackApCost('S')}AP)`
                        : `✕ (${getAttackApCost('X')}AP)`}
                    </span>
                  ))
                )}
              </div>

              {previewDeathblow && (
                <div className="px-2.5 py-1 bg-[#4a0418] text-amber-300 font-bold text-xs border-2 border-amber-400">
                  {formatSequenceSymbols(previewDeathblow.sequence)} ={' '}
                  {inGear
                    ? previewDeathblow.gearName.toUpperCase()
                    : previewDeathblow.name.toUpperCase()}
                </div>
              )}
            </div>

            {/* Pulsanti di Input ▲ / ■ / ✕ + Preset Rapidi Deathblow */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAppendInput('T')}
                className="ps1-btn py-2 px-2 text-xs font-bold"
              >
                [W] ▲ Weak ({inGear ? '10F' : '1 AP'})
              </button>
              <button
                type="button"
                onClick={() => handleAppendInput('S')}
                className="ps1-btn py-2 px-2 text-xs font-bold"
              >
                [A] ■ Med ({inGear ? '20F' : '2 AP'})
              </button>
              <button
                type="button"
                onClick={() => handleAppendInput('X')}
                className="ps1-btn py-2 px-2 text-xs font-bold"
              >
                [S] ✕ Strong ({inGear ? '30F' : '3 AP'})
              </button>
            </div>

            {/* Formule Deathblow Sbloccabili */}
            <div className="grid grid-cols-4 gap-1.5">
              {DEATHBLOWS.map((db) => {
                const lockedInGear = inGear && activeActor.gear.attackLevel < db.gearLevelReq;
                return (
                  <button
                    key={db.id}
                    type="button"
                    disabled={lockedInGear}
                    onClick={() => handlePresetSequence(db.sequence)}
                    className={`p-1.5 text-[10px] border text-left ${
                      lockedInGear
                        ? 'bg-black/60 border-slate-700 text-slate-600 cursor-not-allowed'
                        : 'ps1-btn'
                    }`}
                  >
                    <div className="text-amber-300 font-bold truncate">
                      {inGear ? db.gearName : db.name}
                    </div>
                    <div className="text-white">
                      {formatSequenceSymbols(db.sequence)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Barra di Conferma [Enter] / COMBO Bank / Indietro */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    spuAudio.playCancel();
                    setInputChain([]);
                    setSubMenu('cross');
                  }}
                  className="ps1-btn px-3 py-1 text-xs"
                >
                  [ESC] Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spuAudio.playCancel();
                    setInputChain([]);
                  }}
                  className="ps1-btn px-3 py-1 text-xs"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!inGear && activeActor.comboBank >= 12 && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputChain([]);
                      setSubMenu('cross');
                      onExecuteComboBankBarrage();
                    }}
                    className="ps1-window-crimson px-3 py-1 text-xs font-bold text-amber-300 cursor-pointer"
                  >
                    ★ COMBO ({activeActor.comboBank} AP)
                  </button>
                )}
                <button
                  type="button"
                  disabled={inputChain.length === 0}
                  onClick={handleFireSequence}
                  className={`px-4 py-1 text-xs font-bold ${
                    inputChain.length > 0
                      ? 'ps1-btn-active'
                      : 'bg-slate-900 border border-slate-700 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Execute [ENTER]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM DOCK: Croce Tattica Direzionale Xenogears (Center-Bottom) + Tabella Party PS1 (Bottom-Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        {/* Left/Center 7 Cols: CROCE TATTICA DIREZIONALE DI XENOGEARS */}
        <div className="lg:col-span-7 flex justify-center lg:justify-start pointer-events-auto">
          {activeActor ? (
            <>
              {subMenu === 'cross' && (
                <div className="grid grid-cols-3 gap-2 items-center w-full max-w-lg">
                  {/* TOP ROW: [SU] Chi / Ether */}
                  <div />
                  <button
                    type="button"
                    onClick={() => {
                      spuAudio.playConfirm();
                      setSubMenu('ether');
                    }}
                    className="ps1-window py-2 px-3 text-center hover:border-amber-400 cursor-pointer"
                  >
                    <div className="text-[10px] text-sky-300">[▲ UP / W]</div>
                    <div className="text-xs font-bold text-white">
                      {inGear ? 'ETHER AMP' : 'CHI / ETHER'}
                    </div>
                  </button>
                  <div />

                  {/* MIDDLE ROW: [SINISTRA] Attack | [CENTRO] Attore Attivo | [DESTRA] Item / Defend / Charge */}
                  <button
                    type="button"
                    onClick={() => {
                      spuAudio.playConfirm();
                      setInputChain([]);
                      setSubMenu('attack-chain');
                    }}
                    className="ps1-window-gold py-2.5 px-3 text-center cursor-pointer"
                  >
                    <div className="text-[10px] text-amber-300">[◀ LEFT / ENTER]</div>
                    <div className="text-xs font-bold text-white">
                      ATTACK ({inGear ? 'FUEL' : `${activeActor.maxAp} AP`})
                    </div>
                  </button>

                  <div className="ps1-window p-2 text-center">
                    <div className="text-[10px] text-amber-300 truncate">
                      {inGear ? activeActor.gear.name : activeActor.name}
                    </div>
                    <div className="text-xs font-bold text-white">
                      {inGear
                        ? `ATK Lv ${activeActor.gear.attackLevel >= 4 ? '∞' : activeActor.gear.attackLevel}`
                        : `BANK ${activeActor.comboBank}/28`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      spuAudio.playConfirm();
                      setSubMenu('right-menu');
                    }}
                    className="ps1-window py-2.5 px-3 text-center hover:border-amber-400 cursor-pointer"
                  >
                    <div className="text-[10px] text-emerald-300">[▶ RIGHT / D]</div>
                    <div className="text-xs font-bold text-white">
                      {inGear ? 'CHARGE / BOOST' : 'ITEM / DEFEND'}
                    </div>
                  </button>

                  {/* BOTTOM ROW: [GIÙ] Call Gear */}
                  <div />
                  <button
                    type="button"
                    onClick={() => {
                      spuAudio.playGearBooster();
                      setInputChain([]);
                      onToggleGear();
                    }}
                    className="ps1-window py-2 px-3 text-center hover:border-amber-400 cursor-pointer"
                  >
                    <div className="text-[10px] text-amber-300">[▼ DOWN / G]</div>
                    <div className="text-xs font-bold text-white">
                      {inGear ? 'EXIT GEAR' : `CALL ${activeActor.gear.name}`}
                    </div>
                  </button>
                  <div />
                </div>
              )}

              {/* SOTTOMENU [SU]: CHI / ETHER */}
              {subMenu === 'ether' && (
                <div className="ps1-window p-3 w-full max-w-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-500 pb-1 text-xs">
                    <span className="text-amber-300 font-bold">
                      ▲ CHI / ETHER ARTS ({activeActor.ep} EP)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        spuAudio.playCancel();
                        setSubMenu('cross');
                      }}
                      className="text-sky-300 hover:text-white cursor-pointer"
                    >
                      [ESC] BACK
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeActor.etherSkills.map((sk) => {
                      const canAfford = activeActor.ep >= sk.epCost;
                      return (
                        <button
                          key={sk.id}
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            setSubMenu('cross');
                            onCastEther(sk);
                          }}
                          className={`p-2 text-left ${
                            canAfford
                              ? 'ps1-btn'
                              : 'bg-black/60 border border-slate-700 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex justify-between text-xs font-bold text-amber-300">
                            <span>{sk.name}</span>
                            <span>{sk.epCost}EP</span>
                          </div>
                          <div className="text-[10px] text-slate-200 mt-1">
                            {sk.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SOTTOMENU [DESTRA]: ITEM / DEFEND oppure CHARGE / BOOSTER / REPAIR */}
              {subMenu === 'right-menu' && (
                <div className="ps1-window p-3 w-full max-w-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-500 pb-1 text-xs">
                    <span className="text-amber-300 font-bold">
                      ▶ {inGear ? 'GEAR TACTICAL SYSTEMS' : 'ITEMS & GUARD STANCE'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        spuAudio.playCancel();
                        setSubMenu('cross');
                      }}
                      className="text-sky-300 hover:text-white cursor-pointer"
                    >
                      [ESC] BACK
                    </button>
                  </div>

                  {inGear ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          spuAudio.playConfirm();
                          setSubMenu('cross');
                          onDefendOrCharge();
                        }}
                        className="ps1-btn p-2 text-left text-xs"
                      >
                        <div className="text-amber-300 font-bold">CHARGE FUEL</div>
                        <div className="text-[10px] mt-0.5">
                          +{calculateChargeFuelRecovery(activeActor.gear)} Fuel & Guard
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          spuAudio.playGearBooster();
                          setSubMenu('cross');
                          onToggleBooster();
                        }}
                        className="ps1-btn p-2 text-left text-xs"
                      >
                        <div className="text-sky-300 font-bold">
                          BOOSTER: {activeActor.gear.boosterActive ? 'ON' : 'OFF'}
                        </div>
                        <div className="text-[10px] mt-0.5">2x ATB Speed</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubMenu('cross');
                          onRepairGearFrame();
                        }}
                        className="ps1-btn p-2 text-left text-xs"
                      >
                        <div className="text-emerald-300 font-bold">FRAME REPAIR</div>
                        <div className="text-[10px] mt-0.5">-120F / +1100 HP</div>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          spuAudio.playConfirm();
                          setSubMenu('cross');
                          onDefendOrCharge();
                        }}
                        className="ps1-btn w-full py-1.5 px-3 text-xs font-bold text-amber-300 text-left"
                      >
                        ★ DEFEND STANCE (Halves Damage & Banks +4 Combo AP)
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        {inventory.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            disabled={item.quantity <= 0}
                            onClick={() => {
                              setSubMenu('cross');
                              onUseItem(item);
                            }}
                            className={`p-1.5 text-left text-xs ${
                              item.quantity > 0
                                ? 'ps1-btn'
                                : 'bg-black/60 border border-slate-700 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex justify-between font-bold text-amber-300">
                              <span>{item.name}</span>
                              <span>x{item.quantity}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="ps1-window px-5 py-3 text-xs text-sky-300">
              WAIT :: ATB TIME GAUGE CHARGING...
            </div>
          )}
        </div>

        {/* Right 5 Cols: Classic PS1 Tabular Party Status Window */}
        <div className="lg:col-span-5 pointer-events-auto">
          <div className="ps1-window p-2.5 space-y-1.5">
            <div className="grid grid-cols-12 text-[10px] text-sky-300 border-b border-slate-500 pb-1">
              <span className="col-span-4">NAME / UNIT</span>
              <span className="col-span-4">HP / FRAME</span>
              <span className="col-span-2">EP/FUEL</span>
              <span className="col-span-2 text-right">ATB</span>
            </div>
            {party.map((member) => {
              const isTurn = member.id === activeActorId;
              const vitCurrent = member.inGear ? member.gear.frameHp : member.hp;
              const vitMax = member.inGear ? member.gear.maxFrameHp : member.maxHp;
              const vitPct = Math.max(0, Math.min(100, Math.round((vitCurrent / vitMax) * 100)));

              return (
                <div
                  key={member.id}
                  className={`grid grid-cols-12 items-center gap-1 py-1 px-1.5 text-xs ${
                    isTurn ? 'bg-[#002299] border border-amber-400' : ''
                  }`}
                >
                  <div className="col-span-4 font-bold text-white truncate">
                    {isTurn ? '▶' : ' '}
                    {member.inGear ? member.gear.name : member.name}
                  </div>
                  <div className="col-span-4">
                    <div className="text-[11px] text-emerald-300">
                      {Math.round(vitCurrent)}/{vitMax}
                    </div>
                    <div className="w-full h-1.5 bg-black border border-slate-400">
                      <div
                        className={`h-full origin-left ${
                          member.inGear ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ transform: `scaleX(${vitPct / 100})` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-[11px] text-amber-300">
                    {member.inGear ? `${member.gear.fuel}F` : `${member.ep}EP`}
                  </div>
                  <div className="col-span-2">
                    <div className="w-full h-2 bg-black border border-slate-400">
                      <div
                        className="h-full bg-sky-400 origin-left"
                        style={{ transform: `scaleX(${Math.min(100, member.atb) / 100})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
