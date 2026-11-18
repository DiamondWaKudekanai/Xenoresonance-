import { EnemyCombatant, PartyMemberState, PortraitMood, ZoneId } from './rules';

export interface DialogueLine {
  speakerId: 'fei' | 'elly' | 'citan' | 'ramsus' | 'villager' | 'system';
  speakerName: string;
  mood: PortraitMood;
  text: string;
  cameraZoom?: number;
  screenShake?: boolean;
  flashColor?: string;
}

export interface WorldEntity {
  id: string;
  name: string;
  role: 'npc' | 'portal' | 'enemy' | 'boss' | 'zohar' | 'gear-dock';
  spriteType: 'fei' | 'elly' | 'citan' | 'villager' | 'gebler' | 'weltall' | 'vierge' | 'heimdal' | 'boss-gear' | 'zohar';
  x: number;
  z: number;
  promptLabel: string;
  targetZone?: ZoneId;
  spawnX?: number;
  spawnZ?: number;
  dialogue?: DialogueLine[];
  encounterId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  description: string;
  effectType: 'hp' | 'ep' | 'fuel' | 'id-trigger';
  amount: number;
}

export const INITIAL_PARTY: PartyMemberState[] = [
  {
    id: 'fei',
    name: 'Fei',
    archetypeTitle: 'Martial Artist · Latent Id',
    level: 14,
    hp: 480,
    maxHp: 480,
    ep: 68,
    maxEp: 68,
    maxAp: 7,
    comboBank: 7,
    atk: 54,
    def: 36,
    ether: 42,
    agility: 14,
    atb: 65,
    inGear: false,
    isDefending: false,
    idAwakened: false,
    gear: {
      id: 'weltall',
      name: 'WELTALL',
      title: 'Dark Blue Melee Calamity Gear',
      primaryColor: '#1e3a8a',
      secondaryColor: '#94a3b8',
      glowColor: '#ef4444',
      maxFrameHp: 3200,
      frameHp: 3200,
      maxFuel: 1000,
      fuel: 1000,
      attackLevel: 1,
      boosterActive: false,
      armor: 120,
      etherAmp: 135,
      weightTons: 41.5,
    },
    deathblowProgress: {
      raijin: 100,
      senretsu: 88,
      tenbu: 74,
      kishin: 60,
    },
    etherSkills: [
      {
        id: 'inner-healing',
        name: 'Inner Healing (Chi)',
        epCost: 8,
        targetType: 'ally',
        power: 240,
        isHeal: true,
        element: 'Light',
        description: 'Restores 240 HP (or 950 Frame HP in Gear) via focused breathing.',
      },
      {
        id: 'iron-valor',
        name: 'Iron Valor (Chi)',
        epCost: 12,
        targetType: 'ally',
        power: 1.35,
        isBuff: true,
        element: 'Fire',
        description: 'Channels Zohar resonance, awakening System Id (+50% Attack & Infinity Level).',
      },
      {
        id: 'radiance',
        name: 'Guided Shot (Chi)',
        epCost: 14,
        targetType: 'enemy',
        power: 185,
        element: 'Light',
        description: 'Fires a concentrated sphere of golden Chi energy.',
      },
    ],
  },
  {
    id: 'elly',
    name: 'Elly',
    archetypeTitle: 'Gebler Officer · High Ether',
    level: 14,
    hp: 390,
    maxHp: 390,
    ep: 110,
    maxEp: 110,
    maxAp: 7,
    comboBank: 6,
    atk: 42,
    def: 30,
    ether: 68,
    agility: 15,
    atb: 45,
    inGear: false,
    isDefending: false,
    idAwakened: false,
    gear: {
      id: 'vierge',
      name: 'VIERGE',
      title: 'White/Violet Aerod Ether Gear',
      primaryColor: '#f8fafc',
      secondaryColor: '#a855f7',
      glowColor: '#38bdf8',
      maxFrameHp: 2600,
      frameHp: 2600,
      maxFuel: 1000,
      fuel: 1000,
      attackLevel: 1,
      boosterActive: false,
      armor: 95,
      etherAmp: 185,
      weightTons: 34.2,
    },
    deathblowProgress: {
      raijin: 100,
      senretsu: 82,
      tenbu: 70,
      kishin: 45,
    },
    etherSkills: [
      {
        id: 'thermidor',
        name: 'Thermidor Flame',
        epCost: 12,
        targetType: 'all-enemies',
        power: 210,
        element: 'Fire',
        description: 'Incinerates all targets with an Imperial thermal Ether pillar.',
      },
      {
        id: 'anisoptera',
        name: 'Aerod Resonance',
        epCost: 18,
        targetType: 'all-enemies',
        power: 320,
        element: 'Wind',
        description: 'Deploys psychokinetic Aerods to pierce enemy armor from all vectors.',
      },
      {
        id: 'aegis-mist',
        name: 'Albero Mist',
        epCost: 10,
        targetType: 'ally',
        power: 280,
        isHeal: true,
        element: 'Water',
        description: 'Restores party vitality with purified Solaris Ether.',
      },
    ],
  },
  {
    id: 'citan',
    name: 'Citan',
    archetypeTitle: 'Village Doctor · Strategist',
    level: 15,
    hp: 450,
    maxHp: 450,
    ep: 85,
    maxEp: 85,
    maxAp: 7,
    comboBank: 9,
    atk: 50,
    def: 38,
    ether: 52,
    agility: 18,
    atb: 82,
    inGear: false,
    isDefending: false,
    idAwakened: false,
    gear: {
      id: 'heimdal',
      name: 'HEIMDAL',
      title: 'Emerald High-Mobility Tactical Gear',
      primaryColor: '#059669',
      secondaryColor: '#d97706',
      glowColor: '#34d399',
      maxFrameHp: 2950,
      frameHp: 2950,
      maxFuel: 1000,
      fuel: 1000,
      attackLevel: 1,
      boosterActive: false,
      armor: 115,
      etherAmp: 140,
      weightTons: 38.8,
    },
    deathblowProgress: {
      raijin: 100,
      senretsu: 95,
      tenbu: 88,
      kishin: 72,
    },
    etherSkills: [
      {
        id: 'renki',
        name: 'Renki (Arcane Heal)',
        epCost: 8,
        targetType: 'ally',
        power: 310,
        isHeal: true,
        element: 'Light',
        description: 'Eastern medical art that rapidly mends severe wounds.',
      },
      {
        id: 'suikei',
        name: 'Suikei Tempest',
        epCost: 14,
        targetType: 'enemy',
        power: 235,
        element: 'Wind',
        description: 'High-velocity vacuum blade that ignores enemy guard.',
      },
    ],
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'aquasol-s',
    name: 'Aquasol S',
    quantity: 5,
    description: 'Restores 250 HP to an on-foot party member.',
    effectType: 'hp',
    amount: 250,
  },
  {
    id: 'rosesol',
    name: 'Rosesol DX',
    quantity: 4,
    description: 'Restores 45 EP for Chi and Ether arts.',
    effectType: 'ep',
    amount: 45,
  },
  {
    id: 'charger-pack',
    name: 'Zohar Fuel Cell',
    quantity: 4,
    description: 'Replenishes +350 Gear Fuel immediately.',
    effectType: 'fuel',
    amount: 350,
  },
  {
    id: 'id-catalyst',
    name: 'Red Testament Shard',
    quantity: 2,
    description: 'Awakens Fei’s latent Id persona and sets Gear Attack Level to ∞.',
    effectType: 'id-trigger',
    amount: 1,
  },
];

export const ZONE_METADATA: Record<
  ZoneId,
  {
    name: string;
    subtitle: string;
    skyColor: string;
    fogColor: string;
    bgm: 'field' | 'boss';
  }
> = {
  lahan: {
    name: 'LAHAN VILLAGE',
    subtitle: 'Ignis Frontier Sector · Twilight Before the Clash',
    skyColor: '#131d38',
    fogColor: '#1a2747',
    bgm: 'field',
  },
  mountain: {
    name: 'MOUNT LAHAN CREST',
    subtitle: 'Excavation Ridge & Ancient Babel Steps',
    skyColor: '#1c1936',
    fogColor: '#251f42',
    bgm: 'field',
  },
  hangar: {
    name: 'UNDERGROUND EXCAVATION HANGAR',
    subtitle: 'Subterranean Zohar Modifier Containment Vault',
    skyColor: '#090d1a',
    fogColor: '#0d1326',
    bgm: 'boss',
  },
};

export const ZONE_ENTITIES: Record<ZoneId, WorldEntity[]> = {
  lahan: [
    {
      id: 'npc-citan',
      name: 'Doc Citan Uzuki',
      role: 'npc',
      spriteType: 'citan',
      x: -3.8,
      z: 2.2,
      promptLabel: 'Talk to Citan',
      dialogue: [
        {
          speakerId: 'citan',
          speakerName: 'Citan',
          mood: 'Normal',
          text: 'Fei! Look toward the northern ridge. Solaris aerial cruisers have breached the Ignis border.',
        },
        {
          speakerId: 'fei',
          speakerName: 'Fei',
          mood: 'Shocked',
          text: 'Doc! Those mechanized silhouettes descending on the mountain path... they are after the excavated Gear hangar!',
        },
        {
          speakerId: 'citan',
          speakerName: 'Citan',
          mood: 'Angry',
          text: 'The Zohar Modifier beneath the mountain is resonating. Take the northern path up Mount Lahan before Gebler seals the hangar!',
          cameraZoom: 1.2,
        },
      ],
    },
    {
      id: 'npc-elly',
      name: 'Lieutenant Elly',
      role: 'npc',
      spriteType: 'elly',
      x: 3.6,
      z: 1.8,
      promptLabel: 'Talk to Elly',
      dialogue: [
        {
          speakerId: 'elly',
          speakerName: 'Elly',
          mood: 'Shocked',
          text: 'My squadron was ordered only to secure the Zohar Modifier... we were never told Lahan Village would be targeted!',
        },
        {
          speakerId: 'fei',
          speakerName: 'Fei',
          mood: 'Normal',
          text: 'Elly, if your Commander activates that golden monolith by force, this entire valley will be vaporized. Fight with us!',
        },
        {
          speakerId: 'elly',
          speakerName: 'Elly',
          mood: 'Angry',
          text: 'Understood. My Gear, Vierge, is calibrated and ready. Let us stop the Gebler vanguard together!',
        },
      ],
    },
    {
      id: 'npc-elder',
      name: 'Chief Lee',
      role: 'npc',
      spriteType: 'villager',
      x: -7.5,
      z: -1.8,
      promptLabel: 'Talk to Chief Lee',
      dialogue: [
        {
          speakerId: 'villager',
          speakerName: 'Chief Lee',
          mood: 'Normal',
          text: 'Remember your martial arts training, Fei! Chain Weak (Triangle), Medium (Square), and Strong (Cross) strikes to unleash Deathblows.',
        },
        {
          speakerId: 'villager',
          speakerName: 'Chief Lee',
          mood: 'Shocked',
          text: 'T + X triggers Raijin! T + T + X unleashes Senretsu! S + T + X invokes Tenbu! And S + S + X awakens the forbidden Kishin!',
        },
      ],
    },
    {
      id: 'enemy-lahan-scout',
      name: 'Gebler Recon Unit',
      role: 'enemy',
      spriteType: 'gebler',
      x: 0.0,
      z: -6.8,
      promptLabel: 'Engage Gebler Recon Unit',
      encounterId: 'gebler-vanguard',
    },
    {
      id: 'portal-to-mountain',
      name: 'Mountain Path Gate',
      role: 'portal',
      spriteType: 'zohar',
      x: 0.0,
      z: -12.5,
      promptLabel: 'Ascend Mountain Path',
      targetZone: 'mountain',
      spawnX: 0,
      spawnZ: 10.5,
    },
  ],
  mountain: [
    {
      id: 'portal-to-lahan',
      name: 'Return to Lahan Village',
      role: 'portal',
      spriteType: 'zohar',
      x: 0,
      z: 12.5,
      promptLabel: 'Descend to Lahan Village',
      targetZone: 'lahan',
      spawnX: 0,
      spawnZ: -10.0,
    },
    {
      id: 'enemy-mountain-patrol',
      name: 'Solaris Heavy Assault',
      role: 'enemy',
      spriteType: 'gebler',
      x: -1.2,
      z: 0.5,
      promptLabel: 'Battle Solaris Heavy Patrol',
      encounterId: 'mountain-ambush',
    },
    {
      id: 'npc-mountain-scientist',
      name: 'Ministry Excavator',
      role: 'npc',
      spriteType: 'villager',
      x: 3.2,
      z: 5.0,
      promptLabel: 'Speak with Excavator',
      dialogue: [
        {
          speakerId: 'villager',
          speakerName: 'Excavator',
          mood: 'Shocked',
          text: 'Press SPACE to jump up the ancient Babel stone ledges! The underground Gear Hangar entrance lies at the summit platform.',
        },
      ],
    },
    {
      id: 'portal-to-hangar',
      name: 'Underground Gear Hangar Lift',
      role: 'portal',
      spriteType: 'zohar',
      x: 0,
      z: -11.5,
      promptLabel: 'Enter Underground Gear Hangar',
      targetZone: 'hangar',
      spawnX: 0,
      spawnZ: 9.5,
    },
  ],
  hangar: [
    {
      id: 'portal-back-mountain',
      name: 'Lift to Mountain Crest',
      role: 'portal',
      spriteType: 'zohar',
      x: 0,
      z: 11.8,
      promptLabel: 'Return to Mountain Path',
      targetZone: 'mountain',
      spawnX: 0,
      spawnZ: -9.0,
    },
    {
      id: 'gear-dock-weltall',
      name: 'Weltall Maintenance Bay',
      role: 'gear-dock',
      spriteType: 'weltall',
      x: -5.8,
      z: 2.5,
      promptLabel: 'Inspect Weltall & Restore Party/Fuel',
      dialogue: [
        {
          speakerId: 'citan',
          speakerName: 'Citan',
          mood: 'Normal',
          text: 'Weltall, Vierge, and Heimdal have been fully refueled to 1000 Units and their Frame HP is restored to 100%!',
        },
        {
          speakerId: 'fei',
          speakerName: 'Fei',
          mood: 'Id-Awakened',
          text: 'That crimson cockpit... it is calling to me. Whether on foot or inside Weltall, I will not let Solaris take the Zohar!',
          flashColor: '#ef4444',
        },
      ],
    },
    {
      id: 'boss-zohar-trigger',
      name: 'Commander Ramsus & Achtzehn Gear',
      role: 'boss',
      spriteType: 'boss-gear',
      x: 0,
      z: -4.2,
      promptLabel: 'Confront Gebler Boss at the Zohar',
      encounterId: 'zohar-boss',
      dialogue: [
        {
          speakerId: 'ramsus',
          speakerName: 'Commander Kahr',
          mood: 'Angry',
          text: 'So the Demon of Elru dares approach the Zohar Modifier! Witness the supreme might of Solaris’s Achtzehn Gear!',
          screenShake: true,
        },
        {
          speakerId: 'fei',
          speakerName: 'Fei (Id Resonance)',
          mood: 'Id-Awakened',
          text: 'Stand back, everyone... Weltall! Come forth and shatter their false divinity!',
          flashColor: '#f43f5e',
          cameraZoom: 1.35,
        },
      ],
    },
  ],
};

export const ENCOUNTERS: Record<
  string,
  {
    id: string;
    title: string;
    isBoss: boolean;
    autoGear?: boolean;
    bgm: 'battle' | 'boss';
    enemies: EnemyCombatant[];
  }
> = {
  'gebler-vanguard': {
    id: 'gebler-vanguard',
    title: 'Gebler Frontier Vanguard',
    isBoss: false,
    bgm: 'battle',
    enemies: [
      {
        id: 'trooper-alpha',
        name: 'Gebler Trooper Alpha',
        title: 'Imperial Shock Infantry',
        isGearSize: false,
        hp: 460,
        maxHp: 460,
        atk: 34,
        def: 18,
        agility: 11,
        atb: 30,
        color: '#dc2626',
        accentColor: '#fbbf24',
        xOffset: 2.6,
        zOffset: -1.1,
      },
      {
        id: 'trooper-beta',
        name: 'Solaris Cyber-Hound',
        title: 'Ether Tracking Unit',
        isGearSize: false,
        hp: 380,
        maxHp: 380,
        atk: 38,
        def: 14,
        agility: 14,
        atb: 55,
        color: '#9333ea',
        accentColor: '#38bdf8',
        xOffset: 3.4,
        zOffset: 1.3,
      },
    ],
  },
  'mountain-ambush': {
    id: 'mountain-ambush',
    title: 'Solaris Mountain Mechanized Squad',
    isBoss: false,
    bgm: 'battle',
    enemies: [
      {
        id: 'peone-gear',
        name: 'Schpariel Guard Gear',
        title: 'Light Recon Mecha',
        isGearSize: true,
        hp: 1150,
        maxHp: 1150,
        atk: 52,
        def: 28,
        agility: 12,
        atb: 40,
        color: '#b91c1c',
        accentColor: '#f59e0b',
        xOffset: 3.1,
        zOffset: -0.4,
      },
      {
        id: 'trooper-officer',
        name: 'Gebler Ether Commander',
        title: 'Field Officer',
        isGearSize: false,
        hp: 520,
        maxHp: 520,
        atk: 42,
        def: 22,
        agility: 13,
        atb: 60,
        color: '#1d4ed8',
        accentColor: '#fde047',
        xOffset: 2.3,
        zOffset: 1.6,
      },
    ],
  },
  'zohar-boss': {
    id: 'zohar-boss',
    title: 'CALAMITY CLASH: ACHTZEHN & ZOHAR GUARDIAN',
    isBoss: true,
    autoGear: true,
    bgm: 'boss',
    enemies: [
      {
        id: 'boss-achtzehn',
        name: 'ACHTZEHN-TYPE',
        title: 'Solaris Heavy Siege Gear',
        isGearSize: true,
        hp: 2600,
        maxHp: 2600,
        atk: 68,
        def: 36,
        agility: 13,
        atb: 45,
        color: '#be123c',
        accentColor: '#facc15',
        xOffset: 3.5,
        zOffset: 0,
      },
      {
        id: 'zohar-seraph',
        name: 'Zohar Seraph Drone',
        title: 'Monolith Defense Node',
        isGearSize: true,
        hp: 950,
        maxHp: 950,
        atk: 48,
        def: 26,
        agility: 15,
        atb: 70,
        color: '#eab308',
        accentColor: '#38bdf8',
        xOffset: 2.4,
        zOffset: -2.0,
      },
    ],
  },
};
