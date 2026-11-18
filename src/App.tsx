import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AttackInput,
  calculateChargeFuelRecovery,
  EnemyCombatant,
  EtherSkill,
  PartyMemberState,
  resolveAttackChain,
  resolveComboBankChain,
  stepAtbGauge,
  ZoneId,
} from './game/rules';
import {
  DialogueLine,
  ENCOUNTERS,
  INITIAL_INVENTORY,
  INITIAL_PARTY,
  InventoryItem,
  WorldEntity,
  ZONE_ENTITIES,
  ZONE_METADATA,
} from './game/lore';
import { getPortraitDataUrl } from './game/sprites';
import { spuAudio } from './game/audio';
import { ActiveVisualEffect, ResonanceCanvas } from './components/ResonanceCanvas';
import { BattleHUD, FloatingDamageNumber } from './components/BattleHUD';
import { MainMenuModal, ShaderConfig } from './components/MainMenuModal';
import { LiveSpriteLoader } from './components/LiveSpriteLoader';

type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<GameShellState>(
    isAutostart ? 'playing' : 'title'
  );
  const [mode, setMode] = useState<'field' | 'battle'>('field');
  const [zone, setZone] = useState<ZoneId>('lahan');
  const [party, setParty] = useState<PartyMemberState[]>(() =>
    INITIAL_PARTY.map((m) => ({ ...m, gear: { ...m.gear } }))
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    INITIAL_INVENTORY.map((i) => ({ ...i }))
  );
  const [defeatedEncounterIds, setDefeatedEncounterIds] = useState<string[]>([]);

  // Field Camera & Interaction State
  const [cameraYawTarget, setCameraYawTarget] = useState<number>(0);
  const [nearEntity, setNearEntity] = useState<WorldEntity | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Dialogue & Cutscene State
  const [dialogueQueue, setDialogueQueue] = useState<DialogueLine[]>([]);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [typedText, setTypedText] = useState<string>('');
  const [pendingEncounterAfterDialogue, setPendingEncounterAfterDialogue] = useState<
    string | null
  >(null);
  const [screenFlashColor, setScreenFlashColor] = useState<string | null>(null);
  const [battleSwirlActive, setBattleSwirlActive] = useState<boolean>(false);

  // Main Menu, Live Sprite Loader [F4] & Post-FX Shaders State
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [spriteLoaderOpen, setSpriteLoaderOpen] = useState<boolean>(false);
  const [shaderConfig, setShaderConfig] = useState<ShaderConfig>({
    crtScanlines: false,
    ps1Dither: false,
    dofVignette: false,
    audioMuted: false,
  });

  // Battle State
  const [activeEncounterId, setActiveEncounterId] = useState<string>('gebler-vanguard');
  const [enemies, setEnemies] = useState<EnemyCombatant[]>([]);
  const [activeActorId, setActiveActorId] = useState<string | null>(null);
  const [selectedEnemyIdx, setSelectedEnemyIdx] = useState<number>(0);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingDamageNumber[]>([]);
  const [combatLog, setCombatLog] = useState<string>(
    'Stand by for tactical command input...'
  );
  const [visualEffect, setVisualEffect] = useState<ActiveVisualEffect | null>(null);

  // End-of-Run / Mastery Telemetry Snapshot
  const [runOutcome, setRunOutcome] = useState<'victory' | 'defeat'>('victory');
  const [masteryStats, setMasteryStats] = useState({
    battlesWon: 0,
    maxComboDamage: 0,
    deathblowsUnleashed: 0,
  });

  // High-frequency refs shared with Three.js canvas
  const hitstopTimerRef = useRef<number>(0);
  const traumaRef = useRef<number>(0);
  const externalMoveIntentRef = useRef<{ dx: number; dz: number; jump: boolean }>({
    dx: 0,
    dz: 0,
    jump: false,
  });

  // Mirror game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Sync BGM with active state & zone
  useEffect(() => {
    if (gameState !== 'playing') {
      spuAudio.stopBgm();
      return;
    }
    if (mode === 'battle') {
      const enc = ENCOUNTERS[activeEncounterId];
      spuAudio.playBgm(enc?.bgm || 'battle');
    } else {
      const zMeta = ZONE_METADATA[zone];
      spuAudio.playBgm(zMeta.bgm);
    }
  }, [gameState, mode, zone, activeEncounterId]);

  // Typewriter Effect for PS1 Cutscene Dialogue Box
  const activeDialogueLine =
    dialogueQueue.length > 0 && dialogueIndex < dialogueQueue.length
      ? dialogueQueue[dialogueIndex]
      : null;

  useEffect(() => {
    if (!activeDialogueLine) {
      setTypedText('');
      return;
    }
    setTypedText('');
    if (activeDialogueLine.screenShake) {
      traumaRef.current = 0.85;
    }
    if (activeDialogueLine.flashColor) {
      setScreenFlashColor(activeDialogueLine.flashColor);
      const t = window.setTimeout(() => setScreenFlashColor(null), 260);
      return () => clearTimeout(t);
    }
  }, [activeDialogueLine]);

  useEffect(() => {
    if (!activeDialogueLine) return;
    const full = activeDialogueLine.text;
    if (typedText.length >= full.length) return;

    const timer = window.setTimeout(() => {
      const nextLen = Math.min(full.length, typedText.length + 2);
      setTypedText(full.slice(0, nextLen));
      if (nextLen % 4 === 0) {
        spuAudio.playDialogueBleep(
          activeDialogueLine.speakerId === 'elly' ? 1.25 : 1.0
        );
      }
    }, 22);

    return () => clearTimeout(timer);
  }, [activeDialogueLine, typedText]);

  const pushFloatingNumber = useCallback(
    (
      label: string,
      amount: number,
      isCrit: boolean,
      isDeathblow: boolean,
      color: string,
      targetSide: 'enemy' | 'party',
      isHeal = false
    ) => {
      const id = Date.now() + Math.random();
      setFloatingNumbers((prev) => [
        ...prev.slice(-3),
        { id, label, amount, isCrit, isDeathblow, color, targetSide, isHeal },
      ]);
      window.setTimeout(() => {
        setFloatingNumbers((prev) => prev.filter((item) => item.id !== id));
      }, 1150);
    },
    []
  );

  // Trigger Battle Encounter with Iconic PS1 Swirl Transition
  const startEncounter = useCallback((encounterId: string) => {
    const enc = ENCOUNTERS[encounterId] || ENCOUNTERS['gebler-vanguard'];
    spuAudio.playBattleSwirl();
    setBattleSwirlActive(true);
    setActiveEncounterId(enc.id);
    setEnemies(enc.enemies.map((e) => ({ ...e })));
    setSelectedEnemyIdx(0);
    setCombatLog(`Engaging ${enc.title}!`);

    setParty((prev) =>
      prev.map((m, idx) => ({
        ...m,
        atb: idx === 0 ? 100 : 55 + idx * 15,
        inGear: enc.autoGear ? true : m.inGear,
        isDefending: false,
      }))
    );
    setActiveActorId('fei');
    setMode('battle');

    window.setTimeout(() => {
      setBattleSwirlActive(false);
    }, 380);
  }, []);

  // Advance or Finish Cutscene Dialogue
  const handleAdvanceDialogue = useCallback(() => {
    if (!activeDialogueLine) return;
    const full = activeDialogueLine.text;
    if (typedText.length < full.length) {
      setTypedText(full);
      return;
    }
    spuAudio.playConfirm();
    if (dialogueIndex + 1 < dialogueQueue.length) {
      setDialogueIndex((i) => i + 1);
    } else {
      setDialogueQueue([]);
      setDialogueIndex(0);
      if (pendingEncounterAfterDialogue) {
        const encId = pendingEncounterAfterDialogue;
        setPendingEncounterAfterDialogue(null);
        startEncounter(encId);
      }
    }
  }, [
    activeDialogueLine,
    typedText,
    dialogueIndex,
    dialogueQueue.length,
    pendingEncounterAfterDialogue,
    startEncounter,
  ]);

  // Refill all HP/EP/Frame HP/Fuel helper
  const handleRefuelAndHealAll = useCallback(() => {
    setParty((prev) =>
      prev.map((m) => ({
        ...m,
        hp: m.maxHp,
        ep: m.maxEp,
        gear: {
          ...m.gear,
          frameHp: m.gear.maxFrameHp,
          fuel: m.gear.maxFuel,
        },
      }))
    );
  }, []);

  // Trigger Field Entity (NPC / Portal / Gear Dock / Enemy / Boss)
  const handleTriggerEntity = useCallback(
    (entity: WorldEntity) => {
      if (dialogueQueue.length > 0 || menuOpen || mode === 'battle') return;

      if (entity.role === 'portal' && entity.targetZone) {
        spuAudio.playConfirm();
        setScreenFlashColor('#38bdf8');
        window.setTimeout(() => setScreenFlashColor(null), 220);
        setZone(entity.targetZone);
        setNearEntity(null);
        return;
      }

      if (entity.role === 'gear-dock') {
        handleRefuelAndHealAll();
      }

      if (entity.dialogue && entity.dialogue.length > 0) {
        spuAudio.playConfirm();
        setDialogueQueue(entity.dialogue);
        setDialogueIndex(0);
        setPendingEncounterAfterDialogue(entity.encounterId || null);
        return;
      }

      if (entity.encounterId) {
        startEncounter(entity.encounterId);
      }
    },
    [dialogueQueue.length, menuOpen, mode, handleRefuelAndHealAll, startEncounter]
  );

  // Start / Restart Game Handshake
  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    spuAudio.playConfirm();
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setMode('field');
    setMenuOpen(false);
    setDialogueQueue([]);
    setParty(INITIAL_PARTY.map((m) => ({ ...m, gear: { ...m.gear } })));
    setInventory(INITIAL_INVENTORY.map((i) => ({ ...i })));
  }, []);

  // Global Keyboard Shortcuts (Title Start, F2 CRT Scanlines, F4 Live Sprite Loader, Menu M, Pause P/Esc, Dialogue Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F2') {
        e.preventDefault();
        spuAudio.playCursor();
        setShaderConfig((prev) => ({
          ...prev,
          crtScanlines: !prev.crtScanlines,
        }));
        return;
      }

      if (e.code === 'F4') {
        e.preventDefault();
        spuAudio.playConfirm();
        setSpriteLoaderOpen((prev) => !prev);
        return;
      }

      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.code === 'KeyH' && gameState === 'playing' && mode === 'field') {
        setDockCollapsed((prev) => !prev);
        return;
      }

      if (e.code === 'KeyB' && gameState === 'playing' && mode === 'field' && !menuOpen && dialogueQueue.length === 0) {
        startEncounter(zone === 'hangar' ? 'zohar-boss' : 'gebler-vanguard');
        return;
      }

      if (e.code === 'KeyM' && gameState === 'playing' && mode === 'field') {
        e.preventDefault();
        spuAudio.playConfirm();
        setMenuOpen((prev) => !prev);
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        if (dialogueQueue.length > 0) {
          handleAdvanceDialogue();
          return;
        }
        if (gameState === 'playing') {
          spuAudio.playCancel();
          setGameState('paused');
        } else if (gameState === 'paused') {
          spuAudio.playConfirm();
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    mode,
    zone,
    menuOpen,
    dialogueQueue.length,
    handleStartGame,
    handleAdvanceDialogue,
    startEncounter,
  ]);

  // Active Time Battle (ATB) Tick Loop during Battle Mode
  useEffect(() => {
    if (gameState !== 'playing' || mode !== 'battle') return;

    const timer = window.setInterval(() => {
      // Check Victory or Defeat
      const aliveEnemies = enemies.filter((e) => e.hp > 0);
      if (aliveEnemies.length === 0 && enemies.length > 0) {
        spuAudio.playVictoryFanfare();
        setDefeatedEncounterIds((prev) =>
          prev.includes(activeEncounterId) ? prev : [...prev, activeEncounterId]
        );
        setMasteryStats((prev) => ({
          ...prev,
          battlesWon: prev.battlesWon + 1,
        }));
        if (activeEncounterId === 'zohar-boss') {
          setRunOutcome('victory');
          setGameState('gameover');
        } else {
          setMode('field');
        }
        return;
      }

      const aliveParty = party.filter((m) =>
        m.inGear ? m.gear.frameHp > 0 : m.hp > 0
      );
      if (aliveParty.length === 0) {
        setRunOutcome('defeat');
        setGameState('gameover');
        return;
      }

      // If a party member is already waiting for player command, pause ATB advancement
      if (activeActorId) return;

      // Advance Party & Enemy ATB
      let nextReadyPartyId: string | null = null;
      setParty((prev) =>
        prev.map((m) => {
          const isAlive = m.inGear ? m.gear.frameHp > 0 : m.hp > 0;
          if (!isAlive) return { ...m, atb: 0 };
          const nextAtb = stepAtbGauge(
            m.atb,
            m.agility,
            0.12,
            m.inGear && m.gear.boosterActive
          );
          // Drain 5 Fuel per tick if Booster is active in Gear
          const nextFuel =
            m.inGear && m.gear.boosterActive
              ? Math.max(0, m.gear.fuel - 4)
              : m.gear.fuel;
          if (nextAtb >= 100 && !nextReadyPartyId) {
            nextReadyPartyId = m.id;
          }
          return {
            ...m,
            atb: nextAtb,
            isDefending: nextAtb >= 100 ? false : m.isDefending,
            gear: {
              ...m.gear,
              fuel: nextFuel,
              boosterActive: nextFuel > 0 ? m.gear.boosterActive : false,
            },
          };
        })
      );

      if (nextReadyPartyId) {
        spuAudio.playCursor();
        setActiveActorId(nextReadyPartyId);
        return;
      }

      // Advance Enemy ATB & Execute Enemy Attacks
      setEnemies((prevEnemies) => {
        let enemyAttacked = false;
        return prevEnemies.map((en) => {
          if (en.hp <= 0) return en;
          const nextAtb = stepAtbGauge(en.atb, en.agility, 0.12, false);
          if (nextAtb >= 100 && !enemyAttacked) {
            enemyAttacked = true;
            // Pick a live party member target
            const liveTargets = party.filter((m) =>
              m.inGear ? m.gear.frameHp > 0 : m.hp > 0
            );
            if (liveTargets.length > 0) {
              const target =
                liveTargets[Math.floor(Math.random() * liveTargets.length)];
              const guardMult = target.isDefending ? 0.5 : 1.0;
              const rawDmg = target.inGear
                ? Math.max(65, (en.atk * 4.2 - target.gear.armor * 0.6) * guardMult)
                : Math.max(18, (en.atk * 1.4 - target.def * 0.5) * guardMult);
              const dmg = Math.round(rawDmg);

              spuAudio.playMartialStrike('S');
              traumaRef.current = 0.45;
              setCombatLog(
                `${en.name} strikes ${target.inGear ? target.gear.name : target.name} for ${dmg} DMG!`
              );
              pushFloatingNumber(
                `${en.name} Strike`,
                dmg,
                false,
                false,
                '#fb7185',
                'party'
              );

              setParty((currParty) =>
                currParty.map((pm) => {
                  if (pm.id !== target.id) return pm;
                  if (pm.inGear) {
                    return {
                      ...pm,
                      gear: {
                        ...pm.gear,
                        frameHp: Math.max(0, pm.gear.frameHp - dmg),
                      },
                    };
                  }
                  return {
                    ...pm,
                    hp: Math.max(0, pm.hp - dmg),
                  };
                })
              );
            }
            return { ...en, atb: 0 };
          }
          return { ...en, atb: nextAtb };
        });
      });
    }, 120);

    return () => clearInterval(timer);
  }, [
    gameState,
    mode,
    enemies,
    party,
    activeActorId,
    activeEncounterId,
    pushFloatingNumber,
  ]);

  // Keep selectedEnemyIdx pointing to a live enemy
  useEffect(() => {
    if (enemies[selectedEnemyIdx] && enemies[selectedEnemyIdx].hp > 0) return;
    const firstAlive = enemies.findIndex((e) => e.hp > 0);
    if (firstAlive !== -1) {
      setSelectedEnemyIdx(firstAlive);
    }
  }, [enemies, selectedEnemyIdx]);

  // Execute On-Foot AP Chain or Gear Fuel Attack Chain sequentially step-by-step
  // (avvicinamento -> frame di attacco -> Hit-Stop di 75ms -> numero danno flottante -> pausa 180ms -> colpo successivo)
  const handleExecuteAttackSequence = useCallback(
    (sequence: AttackInput[]) => {
      const actor = party.find((p) => p.id === activeActorId);
      const target = enemies[selectedEnemyIdx] || enemies.find((e) => e.hp > 0);
      if (!actor || !target) return;

      const res = resolveAttackChain(actor, target, sequence);
      const steps = res.hits;
      setActiveActorId(null);

      steps.forEach((step, idx) => {
        const delayMs = idx * (step.hitstopMs + step.pauseAfterMs); // 80ms Hit-Stop + 180ms inter-strike pause
        window.setTimeout(() => {
          if (step.isDeathblow) {
            spuAudio.playDeathblowFinisher();
            hitstopTimerRef.current = step.hitstopMs / 1000;
            traumaRef.current = 0.9;
            setScreenFlashColor(step.color);
            window.setTimeout(() => setScreenFlashColor(null), 190);
          } else {
            spuAudio.playMartialStrike(step.inputTier);
            hitstopTimerRef.current = step.hitstopMs / 1000;
            traumaRef.current = 0.45;
          }

          setVisualEffect({
            id: Date.now() + idx,
            type: step.isDeathblow ? 'deathblow' : 'strike',
            color: step.color,
            targetX: target.xOffset,
            targetZ: target.zOffset,
            actorId: actor.id,
            inputTier: step.inputTier,
            deathblowId: step.isDeathblow ? res.triggeredDeathblow?.id : undefined,
            stepIndex: idx,
            totalSteps: steps.length,
          });

          pushFloatingNumber(
            step.label,
            step.damage,
            step.isCrit,
            step.isDeathblow,
            step.color,
            'enemy'
          );

          setCombatLog(
            `${actor.inGear ? actor.gear.name : actor.name} -> ${step.label} (${step.damage} DMG)!`
          );

          setEnemies((prev) =>
            prev.map((en) =>
              en.id === target.id
                ? { ...en, hp: Math.max(0, en.hp - step.damage) }
                : en
            )
          );
        }, delayMs);
      });

      // Trigger leap-back arc to starting position after the last strike finishes
      const totalDurationMs =
        steps.length * 260 + (res.triggeredDeathblow ? 260 : 120);
      window.setTimeout(() => {
        setVisualEffect({
          id: Date.now() + 999,
          type: 'leap-back',
          color: '#38bdf8',
          targetX: target.xOffset,
          targetZ: target.zOffset,
          actorId: actor.id,
        });
      }, totalDurationMs);

      setMasteryStats((prev) => ({
        ...prev,
        maxComboDamage: Math.max(prev.maxComboDamage, res.totalDamage),
        deathblowsUnleashed:
          prev.deathblowsUnleashed + (res.triggeredDeathblow ? 1 : 0),
      }));

      setParty((prev) =>
        prev.map((m) =>
          m.id === actor.id
            ? {
                ...m,
                atb: 0,
                comboBank: res.newComboBank,
                deathblowProgress: res.updatedProgress,
                gear: {
                  ...m.gear,
                  fuel: res.newFuel,
                  attackLevel: res.newGearAttackLevel,
                },
              }
            : m
        )
      );
    },
    [party, activeActorId, enemies, selectedEnemyIdx, pushFloatingNumber]
  );

  // Execute Multi-Deathblow Combo AP Bank Barrage (up to 4 consecutive Deathblows when comboBank >= 12)
  const handleExecuteComboBankBarrage = useCallback(() => {
    const actor = party.find((p) => p.id === activeActorId);
    const target = enemies[selectedEnemyIdx] || enemies.find((e) => e.hp > 0);
    if (!actor || !target || actor.comboBank < 12) return;

    const chainRes = resolveComboBankChain(actor, target);
    setActiveActorId(null);

    chainRes.steps.forEach((step, idx) => {
      const delayMs = idx * (step.hitstopMs + step.pauseAfterMs);
      window.setTimeout(() => {
        spuAudio.playDeathblowFinisher();
        hitstopTimerRef.current = step.hitstopMs / 1000;
        traumaRef.current = 0.95;
        setScreenFlashColor(step.color);
        window.setTimeout(() => setScreenFlashColor(null), 190);

        setVisualEffect({
          id: Date.now() + idx,
          type: 'deathblow',
          color: step.color,
          targetX: target.xOffset,
          targetZ: target.zOffset,
          actorId: actor.id,
          inputTier: step.inputTier,
          stepIndex: idx,
          totalSteps: chainRes.steps.length,
        });

        pushFloatingNumber(
          step.label,
          step.damage,
          true,
          true,
          step.color,
          'enemy'
        );

        setCombatLog(
          `${actor.name} chains ${step.label} for ${step.damage} DMG!`
        );

        setEnemies((prev) =>
          prev.map((en) =>
            en.id === target.id ? { ...en, hp: Math.max(0, en.hp - step.damage) } : en
          )
        );
      }, delayMs);
    });

    const totalBarrageMs = chainRes.steps.length * 260 + 260;
    window.setTimeout(() => {
      setVisualEffect({
        id: Date.now() + 999,
        type: 'leap-back',
        color: '#f59e0b',
        targetX: target.xOffset,
        targetZ: target.zOffset,
        actorId: actor.id,
      });
    }, totalBarrageMs);

    setMasteryStats((prev) => ({
      ...prev,
      maxComboDamage: Math.max(prev.maxComboDamage, chainRes.totalDamage),
      deathblowsUnleashed:
        prev.deathblowsUnleashed + chainRes.steps.length,
    }));

    setParty((prev) =>
      prev.map((m) =>
        m.id === actor.id
          ? { ...m, atb: 0, comboBank: chainRes.remainingComboBank }
          : m
      )
    );
  }, [party, activeActorId, enemies, selectedEnemyIdx, pushFloatingNumber]);

  // Cast Chi / Ether Skill
  const handleCastEther = useCallback(
    (skill: EtherSkill) => {
      const actor = party.find((p) => p.id === activeActorId);
      if (!actor || actor.ep < skill.epCost) return;

      spuAudio.playEtherCast();
      const ampMult = actor.inGear ? actor.gear.etherAmp / 100 : 1.0;

      if (skill.isHeal) {
        const healAmt = Math.round(skill.power * ampMult * (actor.inGear ? 3.2 : 1.0));
        pushFloatingNumber(
          skill.name,
          healAmt,
          false,
          false,
          '#34d399',
          'party',
          true
        );
        setCombatLog(`${actor.name} invokes ${skill.name}, restoring +${healAmt} vitality!`);
        setParty((prev) =>
          prev.map((m) => ({
            ...m,
            ep: m.id === actor.id ? m.ep - skill.epCost : m.ep,
            atb: m.id === actor.id ? 0 : m.atb,
            hp: Math.min(m.maxHp, m.hp + healAmt),
            gear: {
              ...m.gear,
              frameHp: Math.min(m.gear.maxFrameHp, m.gear.frameHp + healAmt),
            },
          }))
        );
      } else if (skill.isBuff) {
        setScreenFlashColor('#f43f5e');
        window.setTimeout(() => setScreenFlashColor(null), 200);
        setCombatLog(
          `${actor.name} awakens Zohar System Id! Attack +50% and Gear Attack Level ∞!`
        );
        setParty((prev) =>
          prev.map((m) =>
            m.id === actor.id
              ? {
                  ...m,
                  ep: m.ep - skill.epCost,
                  atb: 0,
                  idAwakened: true,
                  gear: { ...m.gear, attackLevel: 4 },
                }
              : m
          )
        );
      } else {
        const target = enemies[selectedEnemyIdx] || enemies.find((e) => e.hp > 0);
        if (!target) return;
        const dmg = Math.round((skill.power + actor.ether * 2.4) * ampMult);
        traumaRef.current = 0.65;
        setVisualEffect({
          id: Date.now(),
          type: 'ether',
          color: '#38bdf8',
          targetX: target.xOffset,
          targetZ: target.zOffset,
          actorId: actor.id,
        });
        pushFloatingNumber(skill.name, dmg, true, false, '#38bdf8', 'enemy');
        setCombatLog(`${actor.name} channels ${skill.name} for ${dmg} Ether DMG!`);

        setEnemies((prev) =>
          prev.map((en) => {
            if (skill.targetType === 'all-enemies' || en.id === target.id) {
              return { ...en, hp: Math.max(0, en.hp - dmg) };
            }
            return en;
          })
        );
        setParty((prev) =>
          prev.map((m) =>
            m.id === actor.id ? { ...m, ep: m.ep - skill.epCost, atb: 0 } : m
          )
        );
      }

      setActiveActorId(null);
    },
    [party, activeActorId, enemies, selectedEnemyIdx, pushFloatingNumber]
  );

  // Call or Exit Gear Mecha
  const handleToggleGear = useCallback(() => {
    if (!activeActorId) return;
    setParty((prev) =>
      prev.map((m) => {
        if (m.id !== activeActorId) return m;
        const nextGear = !m.inGear;
        setCombatLog(
          nextGear
            ? `${m.name} boards Gear [${m.gear.name}]! Frame HP & Fuel Systems Online!`
            : `${m.name} disembarks from ${m.gear.name} to fight on foot.`
        );
        return { ...m, inGear: nextGear };
      })
    );
  }, [activeActorId]);

  // Toggle Gear Booster (2x ATB Speed)
  const handleToggleBooster = useCallback(() => {
    if (!activeActorId) return;
    setParty((prev) =>
      prev.map((m) => {
        if (m.id !== activeActorId) return m;
        const nextBoost = !m.gear.boosterActive;
        setCombatLog(
          `${m.gear.name} Booster ${
            nextBoost ? 'IGNITED (2x ATB Speed)' : 'Deactivated'
          }!`
        );
        return {
          ...m,
          gear: { ...m.gear, boosterActive: nextBoost },
        };
      })
    );
  }, [activeActorId]);

  // Defend (On-Foot) or Charge Fuel (In Gear)
  const handleDefendOrCharge = useCallback(() => {
    const actor = party.find((p) => p.id === activeActorId);
    if (!actor) return;

    if (actor.inGear) {
      const recovered = calculateChargeFuelRecovery(actor.gear);
      pushFloatingNumber(
        `CHARGE FUEL +${recovered}`,
        recovered,
        false,
        false,
        '#38bdf8',
        'party',
        true
      );
      setCombatLog(
        `${actor.gear.name} enters Charge stance and recovers +${recovered} Zohar Fuel!`
      );
      setParty((prev) =>
        prev.map((m) =>
          m.id === actor.id
            ? {
                ...m,
                atb: 0,
                isDefending: true,
                gear: {
                  ...m.gear,
                  fuel: Math.min(m.gear.maxFuel, m.gear.fuel + recovered),
                },
              }
            : m
        )
      );
    } else {
      setCombatLog(
        `${actor.name} assumes a defensive martial stance (+4 Combo AP Banked)!`
      );
      setParty((prev) =>
        prev.map((m) =>
          m.id === actor.id
            ? {
                ...m,
                atb: 0,
                isDefending: true,
                comboBank: Math.min(28, m.comboBank + 4),
              }
            : m
        )
      );
    }
    setActiveActorId(null);
  }, [party, activeActorId, pushFloatingNumber]);

  // Repair Gear Frame HP using Fuel
  const handleRepairGearFrame = useCallback(() => {
    const actor = party.find((p) => p.id === activeActorId);
    if (!actor || !actor.inGear) return;
    if (actor.gear.fuel < 120) {
      spuAudio.playCancel();
      setCombatLog('Insufficient Fuel for Frame Repair (Requires 120 Fuel)!');
      return;
    }
    spuAudio.playEtherCast();
    pushFloatingNumber('FRAME REPAIR', 1100, false, false, '#34d399', 'party', true);
    setCombatLog(`${actor.gear.name} repairs +1,100 Frame HP!`);
    setParty((prev) =>
      prev.map((m) =>
        m.id === actor.id
          ? {
              ...m,
              atb: 0,
              gear: {
                ...m.gear,
                fuel: m.gear.fuel - 120,
                frameHp: Math.min(m.gear.maxFrameHp, m.gear.frameHp + 1100),
              },
            }
          : m
      )
    );
    setActiveActorId(null);
  }, [party, activeActorId, pushFloatingNumber]);

  // Use Inventory Item
  const handleUseItem = useCallback(
    (item: InventoryItem) => {
      const actor = party.find((p) => p.id === activeActorId);
      if (!actor || item.quantity <= 0) return;

      spuAudio.playConfirm();
      setInventory((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, quantity: it.quantity - 1 } : it
        )
      );

      setParty((prev) =>
        prev.map((m) => {
          if (m.id !== actor.id) return m;
          if (item.effectType === 'hp') {
            return { ...m, atb: 0, hp: Math.min(m.maxHp, m.hp + item.amount) };
          }
          if (item.effectType === 'ep') {
            return { ...m, atb: 0, ep: Math.min(m.maxEp, m.ep + item.amount) };
          }
          if (item.effectType === 'fuel') {
            return {
              ...m,
              atb: 0,
              gear: {
                ...m.gear,
                fuel: Math.min(m.gear.maxFuel, m.gear.fuel + item.amount),
              },
            };
          }
          return {
            ...m,
            atb: 0,
            idAwakened: true,
            gear: { ...m.gear, attackLevel: 4 },
          };
        })
      );

      setCombatLog(`${actor.name} uses ${item.name}!`);
      setActiveActorId(null);
    },
    [party, activeActorId]
  );

  const currentZoneMeta = ZONE_METADATA[zone];

  return (
    <main className="relative w-full h-full overflow-hidden select-none">
      {/* 1. Three.js 2.5D HD-2D Rotatable Pixel-Art World & Battle Arena */}
      <ResonanceCanvas
        gameState={gameState}
        mode={mode}
        zone={zone}
        party={party}
        enemies={enemies}
        activeActorId={activeActorId}
        selectedEnemyIdx={selectedEnemyIdx}
        cameraYawTarget={cameraYawTarget}
        onRotateCamera={(delta) => setCameraYawTarget((prev) => prev + delta)}
        onNearEntityChange={setNearEntity}
        onTriggerEntity={handleTriggerEntity}
        visualEffect={visualEffect}
        hitstopTimerRef={hitstopTimerRef}
        traumaRef={traumaRef}
        externalMoveIntentRef={externalMoveIntentRef}
        defeatedEncounterIds={defeatedEncounterIds}
        crtScanlines={shaderConfig.crtScanlines}
      />

      {/* Dramatic Screen Flash / Battle Swirl Overlay */}
      {screenFlashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-150"
          style={{ backgroundColor: screenFlashColor, opacity: 0.42 }}
        />
      )}
      {battleSwirlActive && (
        <div className="fixed inset-0 pointer-events-none z-30 bg-amber-300/60 flex items-center justify-center">
          <div className="text-3xl font-display font-bold tracking-widest text-slate-950">
            COMBAT ENGAGED
          </div>
        </div>
      )}

      {/* 3. TITLE SCREEN OVERLAY (Live 3D World Camera Tour + Custom SVG Zohar Emblem) */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between p-8 md:p-14 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-transparent pointer-events-auto">
          <div className="max-w-xl my-auto space-y-5">
            {/* Custom Inline SVG Golden Zohar Modifier Emblem Lockup */}
            <div className="flex items-center gap-4">
              <svg
                viewBox="0 0 64 64"
                className="w-16 h-16 shrink-0"
                aria-hidden="true"
              >
                <polygon
                  points="32,2 48,18 48,46 32,62 16,46 16,18"
                  fill="#ca8a04"
                  stroke="#fef08a"
                  strokeWidth="2.5"
                />
                <polygon
                  points="32,8 42,20 42,44 32,56 22,44 22,20"
                  fill="#eab308"
                />
                <rect x="6" y="24" width="10" height="16" fill="#a16207" stroke="#fde047" strokeWidth="1.5" />
                <rect x="48" y="24" width="10" height="16" fill="#a16207" stroke="#fde047" strokeWidth="1.5" />
                <polygon
                  points="32,23 39,32 32,41 25,32"
                  fill="#38bdf8"
                  stroke="#e0f2fe"
                  strokeWidth="1.5"
                />
              </svg>
              <div>
                <div className="text-xs font-mono-tabular tracking-widest text-amber-300">
                  EPISODE V · THE ZOHAR MODIFIER
                </div>
                <h1
                  className="text-4xl md:text-6xl font-display font-bold tracking-tight text-white stroke-text"
                  style={{ textWrap: 'balance' }}
                >
                  XENORESONANCE
                </h1>
              </div>
            </div>

            <p className="text-sm md:text-base text-slate-200 max-w-lg leading-relaxed">
              Peace in the frontier village of Lahan shatters as Imperial Gebler
              forces and ancient excavated Gears converge upon the golden Zohar
              Modifier. Master real-time AP Deathblows on foot and pilot Weltall,
              Vierge, and Heimdal in full 3D HD-2D combat.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                data-start="true"
                onClick={handleStartGame}
                className="ps1-btn ps1-btn-active px-7 py-3.5 text-sm font-display font-bold cursor-pointer"
              >
                ▶ Start Game [Enter]
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartGame();
                  window.setTimeout(() => startEncounter('gebler-vanguard'), 60);
                }}
                className="ps1-btn px-5 py-3.5 text-sm font-display font-bold text-[#00ffff] cursor-pointer"
              >
                Instant Combat Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  spuAudio.playConfirm();
                  setSpriteLoaderOpen(true);
                }}
                className="ps1-btn px-5 py-3.5 text-sm font-display font-bold text-amber-300 cursor-pointer"
              >
                ★ Bake Hand-Drawn Pixel Assets [F4]
              </button>
            </div>
          </div>

          {/* Flat Single-Line Control Hint in Bottom Safe Margin */}
          <div className="text-xs font-mono-tabular text-slate-300">
            WASD / Arrows Move · Space Jump · Q / E Rotate 360° Camera · Enter Talk / Interact · F4 Bake Pixel Assets · F2 Toggle CRT · M Main Menu · P Pause
          </div>
        </div>
      )}

      {/* 4. FIELD EXPLORATION HUD (Top Perimeter Clusters + Collapsible Bottom Dock) */}
      {gameState === 'playing' && mode === 'field' && (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
          {/* Top Perimeter Row: Zone & Party Vitality (Left) + Utility Icon Controls (Right) */}
          <div className="flex items-start justify-between gap-4">
            <div className="ps1-window px-4 py-2.5 pointer-events-auto">
              <div className="text-[11px] font-mono-tabular text-amber-300">
                {currentZoneMeta.name}
              </div>
              <div className="text-xs text-slate-200">{currentZoneMeta.subtitle}</div>
              <div className="flex items-center gap-4 mt-2 pt-1.5 border-t border-slate-600/70 text-xs font-mono-tabular">
                {party.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{m.name}</span>
                    <span className="text-emerald-300">
                      {m.hp}/{m.maxHp}
                    </span>
                    <span className="text-amber-300">
                      [{m.gear.name} {m.gear.fuel}F]
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top-Right Compact Utility Buttons */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                aria-label="Bake Hand-Drawn Pixel Assets"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  spuAudio.playConfirm();
                  setSpriteLoaderOpen((prev) => !prev);
                }}
                className="ps1-window px-3 py-2 text-xs font-mono-tabular text-amber-300 hover:text-white cursor-pointer whitespace-nowrap"
              >
                Bake Pixel Assets [F4]
              </button>
              <button
                type="button"
                aria-label="Toggle CRT Scanlines"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  spuAudio.playCursor();
                  setShaderConfig((prev) => ({
                    ...prev,
                    crtScanlines: !prev.crtScanlines,
                  }));
                }}
                className="ps1-window px-3 py-2 text-xs font-mono-tabular text-emerald-300 hover:text-white cursor-pointer whitespace-nowrap"
              >
                {shaderConfig.crtScanlines ? 'CRT [F2]: ON' : 'CRT [F2]: OFF'}
              </button>
              <button
                type="button"
                aria-label="Open Main Menu"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  spuAudio.playConfirm();
                  setMenuOpen(true);
                }}
                className="ps1-window px-3 py-2 text-xs font-display font-bold text-amber-300 hover:text-white cursor-pointer whitespace-nowrap"
              >
                Menu [M]
              </button>
              <button
                type="button"
                aria-label="Toggle Mute Audio"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const next = !shaderConfig.audioMuted;
                  spuAudio.setMuted(next);
                  setShaderConfig((prev) => ({ ...prev, audioMuted: next }));
                }}
                className="ps1-window px-3 py-2 text-xs font-mono-tabular text-sky-300 hover:text-white cursor-pointer whitespace-nowrap"
              >
                {shaderConfig.audioMuted ? 'Audio: OFF' : 'Audio: SPU'}
              </button>
              <button
                type="button"
                aria-label="Pause Game"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  spuAudio.playCancel();
                  setGameState('paused');
                }}
                className="ps1-window px-3 py-2 text-xs font-display font-bold text-slate-200 hover:text-white cursor-pointer whitespace-nowrap"
              >
                Pause [P]
              </button>
            </div>
          </div>

          {/* Center Proximity Interaction Prompt or Classic PS1 Cutscene Dialogue Box */}
          <div className="flex flex-col items-center justify-end my-auto pointer-events-none">
            {activeDialogueLine && (
              <div className="ps1-window w-full max-w-3xl p-4 pointer-events-auto flex items-start gap-4">
                <img
                  src={getPortraitDataUrl(
                    activeDialogueLine.speakerId,
                    activeDialogueLine.mood
                  )}
                  alt={activeDialogueLine.speakerName}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 pixelated border-2 border-amber-400 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-bold text-amber-300">
                      {activeDialogueLine.speakerName} · [{activeDialogueLine.mood}]
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-300">
                      {dialogueIndex + 1} / {dialogueQueue.length}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-white mt-1.5 min-h-[3rem] leading-relaxed">
                    {typedText}
                  </p>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleAdvanceDialogue}
                      className="px-4 py-1 text-xs font-display font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
                    >
                      {dialogueIndex + 1 < dialogueQueue.length
                        ? 'Next [Enter]'
                        : 'Finish [Enter]'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!activeDialogueLine && nearEntity && (
              <button
                type="button"
                onClick={() => handleTriggerEntity(nearEntity)}
                className="ps1-window-gold px-5 py-2.5 pointer-events-auto text-sm font-display font-bold text-amber-200 hover:text-white cursor-pointer animate-bounce"
              >
                ★ {nearEntity.promptLabel} [Enter / Click]
              </button>
            )}
          </div>

          {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion in Center) */}
          <div className="flex flex-col items-center pointer-events-auto">
            <button
              type="button"
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="ps1-window px-3 py-1 text-[11px] font-mono-tabular text-slate-200 hover:text-white mb-1 cursor-pointer"
            >
              {dockCollapsed ? '▴ Show Field Controls [H]' : '▾ Hide Controls [H]'}
            </button>

            {!dockCollapsed && (
              <div className="ps1-window px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 max-w-4xl">
                {/* 360 Camera Rotation Controls */}
                <button
                  type="button"
                  onClick={() => {
                    spuAudio.playCursor();
                    setCameraYawTarget((prev) => prev - Math.PI / 4);
                  }}
                  className="ps1-btn px-3 py-1.5 text-xs font-mono-tabular whitespace-nowrap cursor-pointer"
                >
                  ↺ Cam Left [Q]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spuAudio.playCursor();
                    setCameraYawTarget((prev) => prev + Math.PI / 4);
                  }}
                  className="ps1-btn px-3 py-1.5 text-xs font-mono-tabular whitespace-nowrap cursor-pointer"
                >
                  ↻ Cam Right [E]
                </button>

                {/* Jump Button (Babel Tower Platforming) */}
                <button
                  type="button"
                  onClick={() => {
                    externalMoveIntentRef.current.jump = true;
                  }}
                  className="ps1-btn px-3 py-1.5 text-xs font-display font-bold text-[#00ffff] whitespace-nowrap cursor-pointer"
                >
                  Jump [Space]
                </button>

                {/* Zone Switcher */}
                {(
                  [
                    { id: 'lahan', label: 'Zone 1: Lahan' },
                    { id: 'mountain', label: 'Zone 2: Mt. Path' },
                    { id: 'hangar', label: 'Zone 3: Gear Hangar' },
                  ] as const
                ).map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => {
                      spuAudio.playConfirm();
                      setZone(z.id);
                    }}
                    className={`ps1-btn px-3 py-1.5 text-xs font-display font-bold whitespace-nowrap cursor-pointer ${
                      zone === z.id ? 'ps1-btn-active' : ''
                    }`}
                  >
                    {z.label}
                  </button>
                ))}

                {/* Quick Dialogue / Cutscene Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const firstNpc = ZONE_ENTITIES[zone].find(
                      (e) => e.dialogue && e.dialogue.length > 0
                    );
                    if (firstNpc) handleTriggerEntity(firstNpc);
                  }}
                  className="ps1-btn px-3 py-1.5 text-xs font-display font-bold text-[#38bdf8] whitespace-nowrap cursor-pointer"
                >
                  Talk to Party
                </button>

                {/* Direct On-Foot Skirmish & Gear Boss Battle Triggers */}
                <button
                  type="button"
                  onClick={() => startEncounter('gebler-vanguard')}
                  className="ps1-btn px-3 py-1.5 text-xs font-display font-bold text-[#ff8888] whitespace-nowrap cursor-pointer"
                >
                  Skirmish [B]
                </button>
                <button
                  type="button"
                  onClick={() => startEncounter('zohar-boss')}
                  className="ps1-btn px-3 py-1.5 text-xs font-display font-bold text-[#ffe866] whitespace-nowrap cursor-pointer"
                >
                  Gear Boss Clash
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BATTLE MODE HUD */}
      {gameState === 'playing' && mode === 'battle' && (
        <BattleHUD
          encounterTitle={ENCOUNTERS[activeEncounterId]?.title || 'Gebler Skirmish'}
          isBoss={Boolean(ENCOUNTERS[activeEncounterId]?.isBoss)}
          party={party}
          enemies={enemies}
          activeActorId={activeActorId}
          selectedEnemyIdx={selectedEnemyIdx}
          onSelectEnemy={setSelectedEnemyIdx}
          onExecuteAttackSequence={handleExecuteAttackSequence}
          onExecuteComboBankBarrage={handleExecuteComboBankBarrage}
          onCastEther={handleCastEther}
          onToggleGear={handleToggleGear}
          onToggleBooster={handleToggleBooster}
          onDefendOrCharge={handleDefendOrCharge}
          onRepairGearFrame={handleRepairGearFrame}
          onUseItem={handleUseItem}
          onFleeBattle={() => {
            spuAudio.playCancel();
            setMode('field');
          }}
          inventory={inventory}
          floatingNumbers={floatingNumbers}
          combatLog={combatLog}
        />
      )}

      {/* 6. MAIN MENU MODAL (Status, Deathblows, Gear Garage, Shaders Config) */}
      {menuOpen && gameState === 'playing' && (
        <MainMenuModal
          party={party}
          shaderConfig={shaderConfig}
          onUpdateShaderConfig={setShaderConfig}
          onRefuelAndHealAll={handleRefuelAndHealAll}
          onToggleIdPersona={() => {
            setParty((prev) =>
              prev.map((m, idx) =>
                idx === 0
                  ? {
                      ...m,
                      idAwakened: !m.idAwakened,
                      gear: {
                        ...m.gear,
                        attackLevel: !m.idAwakened ? 4 : 1,
                      },
                    }
                  : m
              )
            );
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* 7. PAUSE MODAL */}
      {gameState === 'paused' && (
        <div
          role="dialog"
          aria-label="Game Paused"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 pointer-events-auto"
        >
          <div className="ps1-window w-full max-w-md p-6 text-center space-y-5">
            <div>
              <div className="text-xs font-mono-tabular text-amber-300">
                SYSTEM STANDBY · IGNIS SECTOR
              </div>
              <h2 className="text-2xl font-display font-bold text-white mt-1">
                CHRONICLE PAUSED
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono-tabular bg-slate-950/80 border border-slate-600 p-3">
              <div>
                <div className="text-slate-400">SECTOR</div>
                <div className="text-white font-bold mt-0.5">{zone.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-slate-400">VICTORIES</div>
                <div className="text-amber-300 font-bold mt-0.5">
                  {masteryStats.battlesWon}
                </div>
              </div>
              <div>
                <div className="text-slate-400">DEATHBLOWS</div>
                <div className="text-sky-300 font-bold mt-0.5">
                  {masteryStats.deathblowsUnleashed}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  spuAudio.playConfirm();
                  setGameState('playing');
                }}
                className="w-full py-2.5 text-sm font-display font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
              >
                Resume Game [P / Esc]
              </button>
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-2.5 text-xs font-display font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-500 cursor-pointer"
              >
                Restart Sector
              </button>
              <button
                type="button"
                onClick={() => {
                  spuAudio.playCancel();
                  setGameState('title');
                }}
                className="w-full py-2.5 text-xs font-display font-bold bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-400 cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. VICTORY / GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <div
          role="dialog"
          aria-label={
            runOutcome === 'victory' ? 'Zohar Modifier Secured' : 'Party Defeated'
          }
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-4 pointer-events-auto"
        >
          <div
            className={`w-full max-w-lg p-6 text-center space-y-5 ${
              runOutcome === 'victory' ? 'ps1-window-gold' : 'ps1-window-crimson'
            }`}
          >
            <div>
              <div className="text-xs font-mono-tabular text-amber-300">
                {runOutcome === 'victory'
                  ? 'EPISODE V VERTICAL SLICE COMPLETE'
                  : 'CALAMITY OVERWHELMED'}
              </div>
              <h2 className="text-3xl font-display font-bold text-white mt-1">
                {runOutcome === 'victory'
                  ? 'THE ZOHAR MODIFIER IS SECURED'
                  : 'WELTALL SIGNAL LOST'}
              </h2>
              <p className="text-xs text-slate-200 mt-2">
                {runOutcome === 'victory'
                  ? 'Fei, Elly, and Citan repelled the Solaris Achtzehn siege and stabilized the golden monolith beneath Mount Lahan.'
                  : 'Gebler forces overwhelmed the party. Re-calibrate your Gears and unleash chained AP Deathblows to prevail.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono-tabular bg-slate-950/85 border border-slate-600 p-3.5">
              <div>
                <div className="text-slate-400">BATTLES WON</div>
                <div className="text-lg text-emerald-300 font-bold">
                  {masteryStats.battlesWon}
                </div>
              </div>
              <div>
                <div className="text-slate-400">MAX COMBO DMG</div>
                <div className="text-lg text-amber-300 font-bold">
                  {masteryStats.maxComboDamage}
                </div>
              </div>
              <div>
                <div className="text-slate-400">DEATHBLOWS</div>
                <div className="text-lg text-sky-300 font-bold">
                  {masteryStats.deathblowsUnleashed}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                data-start="true"
                onClick={handleStartGame}
                className="flex-1 py-3 text-sm font-display font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
              >
                Play Again / Continue Exploration
              </button>
              <button
                type="button"
                onClick={() => setGameState('title')}
                className="px-5 py-3 text-xs font-display font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-500 cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 9. LIVE SPRITE SHEET LOADER MODAL [F4] */}
      <LiveSpriteLoader
        open={spriteLoaderOpen}
        onClose={() => setSpriteLoaderOpen(false)}
      />
    </main>
  );
}
