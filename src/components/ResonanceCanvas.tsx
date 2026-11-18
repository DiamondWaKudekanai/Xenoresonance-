import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  AttackInput,
  EnemyCombatant,
  getGroundHeightAt,
  PartyMemberState,
  ZONE_PLATFORMS,
  ZoneId,
} from '../game/rules';
import { WorldEntity, ZONE_ENTITIES, ZONE_METADATA } from '../game/lore';
import {
  buildPropBillboard,
  createBackdropMesh,
  createPixelEnvironmentTexture,
  getSpriteDimensions,
  getSpriteFrameBundle,
  isGearArchetype,
  onLiveAssetChanged,
  preloadAllSheets,
  PropSpriteKind,
  SpriteArchetype,
  SpritePose,
} from '../game/sprites';
import { HD2DPostProcessor } from '../game/hd2dPostProcessor';
import { spuAudio } from '../game/audio';

export interface ActiveVisualEffect {
  id: number;
  type: 'strike' | 'deathblow' | 'ether' | 'gear-call' | 'leap-back';
  color: string;
  targetX: number;
  targetZ: number;
  actorId: string;
  inputTier?: AttackInput;
  deathblowId?: string;
  stepIndex?: number;
  totalSteps?: number;
}

interface ResonanceCanvasProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  mode: 'field' | 'battle';
  zone: ZoneId;
  party: PartyMemberState[];
  enemies: EnemyCombatant[];
  activeActorId: string | null;
  selectedEnemyIdx?: number;
  cameraYawTarget: number;
  onRotateCamera: (deltaRad: number) => void;
  onNearEntityChange: (entity: WorldEntity | null) => void;
  onTriggerEntity: (entity: WorldEntity) => void;
  onPlayerCoordsChange?: (x: number, y: number, z: number) => void;
  visualEffect: ActiveVisualEffect | null;
  hitstopTimerRef: React.MutableRefObject<number>;
  traumaRef: React.MutableRefObject<number>;
  externalMoveIntentRef: React.MutableRefObject<{ dx: number; dz: number; jump: boolean }>;
  defeatedEncounterIds: string[];
  crtScanlines?: boolean;
}

// 3D Stone Retaining Wall with Coping Stones (Muretto 3D per terrazzamenti)
function buildStoneRetainingWall(
  cobbleTex: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture },
  length: number,
  height: number,
  thickness = 0.55
): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cobbleTex.map,
    bumpMap: cobbleTex.bumpMap,
    bumpScale: 0.06,
    roughness: 0.85,
  });
  const copingMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    map: cobbleTex.map,
    roughness: 0.75,
  });

  const wall = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), wallMat);
  wall.position.y = height / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const coping = new THREE.Mesh(
    new THREE.BoxGeometry(length + 0.16, 0.18, thickness + 0.14),
    copingMat
  );
  coping.position.y = height + 0.08;
  coping.castShadow = true;
  coping.receiveShadow = true;
  group.add(coping);

  return group;
}

// 3D Arched Wooden Bridge (Ponte in legno sopra il canale scavato)
function buildWoodenBridge(
  woodTex: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }
): THREE.Group {
  const group = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodTex.map,
    bumpMap: woodTex.bumpMap,
    bumpScale: 0.05,
    roughness: 0.82,
  });
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.9,
  });

  const plankCount = 9;
  for (let i = 0; i < plankCount; i++) {
    const t = (i / (plankCount - 1)) * 2 - 1;
    const archY = (1 - t * t) * 0.28 + 0.12;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.42), plankMat);
    plank.position.set(0, archY, t * 2.1);
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);
  }

  for (const side of [-1.55, 1.55]) {
    for (const zPos of [-2.0, 0, 2.0]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 0.18), postMat);
      post.position.set(side, 0.65, zPos);
      post.castShadow = true;
      group.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.3), postMat);
    rail.position.set(side, 1.08, 0);
    rail.castShadow = true;
    group.add(rail);
  }

  return group;
}

export const ResonanceCanvas: React.FC<ResonanceCanvasProps> = ({
  gameState,
  mode,
  zone,
  party,
  enemies,
  activeActorId,
  selectedEnemyIdx = 0,
  cameraYawTarget,
  onRotateCamera,
  onNearEntityChange,
  onTriggerEntity,
  onPlayerCoordsChange,
  visualEffect,
  hitstopTimerRef,
  traumaRef,
  externalMoveIntentRef,
  defeatedEncounterIds,
  crtScanlines = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    gameState,
    mode,
    zone,
    party,
    enemies,
    activeActorId,
    selectedEnemyIdx,
    cameraYawTarget,
    visualEffect,
    defeatedEncounterIds,
    crtScanlines,
  });
  stateRef.current = {
    gameState,
    mode,
    zone,
    party,
    enemies,
    activeActorId,
    selectedEnemyIdx,
    cameraYawTarget,
    visualEffect,
    defeatedEncounterIds,
    crtScanlines,
  };

  const callbacksRef = useRef({
    onRotateCamera,
    onNearEntityChange,
    onTriggerEntity,
    onPlayerCoordsChange,
  });
  callbacksRef.current = {
    onRotateCamera,
    onNearEntityChange,
    onTriggerEntity,
    onPlayerCoordsChange,
  };

  useEffect(() => {
    preloadAllSheets();
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isSoftwareGl ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;

    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width || window.innerWidth, rect.height || window.innerHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091024');
    scene.fog = new THREE.FogExp2('#0d1730', 0.024);

    const camera = new THREE.PerspectiveCamera(
      42,
      (rect.width || window.innerWidth) / (rect.height || window.innerHeight),
      0.1,
      140
    );
    camera.position.set(0, 7.8, 12.8);

    // ========================================================================
    // OCTOPATH-STYLE DRAMATIC LIGHTING:
    // - AmbientLight lowered to 0.25 with cold midnight blue (#1a2b4c)
    // - Warm vibrant PointLights (#ff8822, intensity: 3.5, distance: 12) on
    //   lanterns, windows, and village campfire with long crisp shadows
    // ========================================================================
    const ambientLight = new THREE.AmbientLight(0x4a5d80, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffe4b5, 1.35);
    dirLight.position.set(14, 19, 12);
    dirLight.castShadow = true;
    const shadowRes = isSoftwareGl ? 512 : 1024;
    dirLight.shadow.mapSize.width = shadowRes;
    dirLight.shadow.mapSize.height = shadowRes;
    const d = 18;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    // Primary Shadow-Casting Village Campfire / Lantern PointLight (#ff8822, intensity: 3.5, distance: 12)
    const primaryLanternLight = new THREE.PointLight(0xff8822, 3.5, 12, 0.75);
    primaryLanternLight.position.set(2.4, 2.35, 2.2);
    primaryLanternLight.castShadow = true;
    primaryLanternLight.shadow.mapSize.width = isSoftwareGl ? 256 : 512;
    primaryLanternLight.shadow.mapSize.height = isSoftwareGl ? 256 : 512;
    primaryLanternLight.shadow.bias = -0.001;
    scene.add(primaryLanternLight);

    // Additional Warm PointLights (#ff8822, intensity: 3.5, distance: 12) on lanterns, cottage windows & bonfire
    const warmPointLights: Array<{ light: THREE.PointLight; baseY: number; phase: number }> = [];
    const warmLightCoords = [
      { x: -5.2, y: 2.5, z: -1.2 }, // West cottage window & lantern
      { x: 5.8, y: 3.1, z: -3.8 },  // East upper stone terrace lantern
      { x: -2.6, y: 2.3, z: 5.8 },  // South wooden bridge lantern
      { x: 0.0, y: 2.8, z: -7.5 },  // North shrine steps brazier
      { x: -3.4, y: 2.2, z: 1.8 },  // Battle arena west lantern glow
      { x: 3.8, y: 2.2, z: -1.4 },  // Battle arena east lantern glow
    ];
    warmLightCoords.forEach((lc, idx) => {
      const pl = new THREE.PointLight(0xff8822, 3.5, 12, 0.75);
      pl.position.set(lc.x, lc.y, lc.z);
      scene.add(pl);
      warmPointLights.push({ light: pl, baseY: lc.y, phase: idx * 1.7 });
    });

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const grassTex = createPixelEnvironmentTexture('grass', maxAniso);
    grassTex.map.repeat.set(20, 20);
    grassTex.bumpMap.repeat.set(20, 20);

    const cobbleTex = createPixelEnvironmentTexture('cobble', maxAniso);
    cobbleTex.map.repeat.set(8, 8);
    cobbleTex.bumpMap.repeat.set(8, 8);

    const cliffTex = createPixelEnvironmentTexture('cliff', maxAniso);
    cliffTex.map.repeat.set(6, 3);
    cliffTex.bumpMap.repeat.set(6, 3);

    const hangarTex = createPixelEnvironmentTexture('hangar', maxAniso);
    hangarTex.map.repeat.set(12, 12);
    hangarTex.bumpMap.repeat.set(12, 12);

    const woodTex = createPixelEnvironmentTexture('wood', maxAniso);

    // Track all active character/NPC/Gear billboards so they refresh automatically when sprite sheets load
    const activeBillboards: Array<{ refreshCurrent: () => void }> = [];

    /**
     * HD-2D Billboarded 2.5D PBR Pixel-Art Sprite Builder
     * - 64x96 resolution for humans, 128x128 for Gears
     * - Applies Albedo (map), Sobel 2D Normal Map (normalMap), and Emissive Map (emissiveMap)
     * - Casts real dynamic 3D shadows using customDepthMaterial with alphaTest: 0.5
     */
    function createBillboardActor(archetype: SpriteArchetype, heightScale = 2.35) {
      const root = new THREE.Group();
      const dims = getSpriteDimensions(archetype);
      const aspect = dims.width / dims.height;
      const widthScale = heightScale * aspect;

      let curArch: SpriteArchetype = archetype;
      let curFrame = 0;
      let curAwakened = false;
      let curPose: SpritePose | undefined = 'idle';

      const bundle = getSpriteFrameBundle(archetype, 0, false, 'idle');
      const mat = new THREE.MeshStandardMaterial({
        map: bundle.map,
        normalMap: bundle.normalMap,
        normalScale: new THREE.Vector2(0.85, 0.85),
        emissive: new THREE.Color(0xffffff),
        emissiveMap: bundle.emissiveMap,
        emissiveIntensity: 1.25,
        transparent: true,
        alphaTest: 0.5,
        roughness: 0.6,
        metalness: 0.3,
        side: THREE.DoubleSide,
      });

      const depthMat = bundle.depthMaterial;

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(widthScale, heightScale), mat);
      plane.position.y = heightScale * 0.5;
      plane.castShadow = true;
      plane.receiveShadow = true;
      plane.customDepthMaterial = depthMat;
      root.add(plane);

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(widthScale * 0.45, 16),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      root.add(shadow);

      const setFrame = (
        nextArch: SpriteArchetype,
        frameIdx: number,
        idAwakened = false,
        pose?: SpritePose
      ) => {
        curArch = nextArch;
        curFrame = frameIdx;
        curAwakened = idAwakened;
        curPose = pose;
        const nextBundle = getSpriteFrameBundle(nextArch, frameIdx, idAwakened, pose);
        if (mat.map !== nextBundle.map) {
          mat.map = nextBundle.map;
          mat.normalMap = nextBundle.normalMap;
          mat.emissiveMap = nextBundle.emissiveMap;
          mat.needsUpdate = true;
          plane.customDepthMaterial = nextBundle.depthMaterial;
        }
      };

      activeBillboards.push({
        refreshCurrent: () => setFrame(curArch, curFrame, curAwakened, curPose),
      });

      return { root, plane, mat, depthMat, shadow, setFrame };
    }

    // Track all 2.5D prop billboards so they cylindrical-billboard toward camera Y-yaw in tick()
    const billboardProps: Array<{
      prop: THREE.Group;
      mesh: THREE.Object3D;
      worldHeight: number;
    }> = [];

    // Helper to place a single vertical 2.5D hand-drawn prop billboard using buildPropBillboard()
    function placePropBillboard(
      parent: THREE.Group,
      propKind: PropSpriteKind,
      worldHeight: number,
      x: number,
      y: number,
      z: number,
      rotY = 0
    ): THREE.Group {
      const prop = buildPropBillboard(propKind, worldHeight);
      prop.position.set(x, y, z);
      prop.rotation.y = rotY;
      parent.add(prop);
      const mesh = prop.children[0] || prop;
      billboardProps.push({ prop, mesh, worldHeight });
      return prop;
    }

    // Zone Root Groups
    const zoneGroups: Record<ZoneId, THREE.Group> = {
      lahan: new THREE.Group(),
      mountain: new THREE.Group(),
      hangar: new THREE.Group(),
    };
    scene.add(zoneGroups.lahan);
    scene.add(zoneGroups.mountain);
    scene.add(zoneGroups.hangar);

    // ========================================================================
    // ZONE 1: LAHAN VILLAGE 3D MULTI-TIERED DIORAMA + 2.5D HAND-DRAWN PROPS
    // ========================================================================
    {
      const g = zoneGroups.lahan;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(96, 96),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: grassTex.map,
          bumpMap: grassTex.bumpMap,
          bumpScale: 0.06,
          roughness: 0.88,
          metalness: 0.05,
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      g.add(ground);

      // Panoramic HD-2D Lahan Mountain Twilight Backdrop (backdrop_lahan.png)
      const lahanBackdrop = createBackdropMesh(92, 36);
      lahanBackdrop.position.set(0, 14.5, -30);
      g.add(lahanBackdrop);

      // Carved Sunken Dirt Road & Stone Curbs (Sentiero sterrato scavato con bordi in pietra)
      const dirtMat = new THREE.MeshStandardMaterial({
        color: 0x78472a,
        map: cliffTex.map,
        bumpMap: cliffTex.bumpMap,
        bumpScale: 0.06,
        roughness: 0.92,
      });
      const sunkenRoad = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 28), dirtMat);
      sunkenRoad.position.set(0, 0.02, 1.5);
      sunkenRoad.receiveShadow = true;
      g.add(sunkenRoad);

      const curbLeft = buildStoneRetainingWall(cobbleTex, 0.45, 0.36, 26);
      curbLeft.position.set(-2.5, 0, 1.5);
      g.add(curbLeft);

      const curbRight = buildStoneRetainingWall(cobbleTex, 0.45, 0.36, 26);
      curbRight.position.set(2.5, 0, 1.5);
      g.add(curbRight);

      // Sunken Water Stream & 3D Arched Wooden Bridge
      const streamChannel = new THREE.Mesh(
        new THREE.BoxGeometry(28, 0.12, 3.2),
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x0369a1,
          emissiveIntensity: 0.65,
          roughness: 0.18,
          metalness: 0.3,
        })
      );
      streamChannel.position.set(0, 0.03, 5.5);
      g.add(streamChannel);

      const woodenBridge = buildWoodenBridge(woodTex);
      woodenBridge.position.set(0, 0.05, 5.5);
      g.add(woodenBridge);

      // Multi-tiered Stone Terraces & Retaining Walls
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: cobbleTex.map,
        bumpMap: cobbleTex.bumpMap,
        bumpScale: 0.06,
        roughness: 0.72,
      });
      for (const p of ZONE_PLATFORMS.lahan) {
        const w = p.maxX - p.minX;
        const dSize = p.maxZ - p.minZ;
        const cx = (p.minX + p.maxX) / 2;
        const cz = (p.minZ + p.maxZ) / 2;

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, p.topY, dSize), stoneMat);
        mesh.position.set(cx, p.topY / 2, cz);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        g.add(mesh);
      }

      // Upper Northern Sanctuary Terrace
      const northTerrace = new THREE.Mesh(new THREE.BoxGeometry(26, 1.4, 8), stoneMat);
      northTerrace.position.set(0, 0.7, -14.5);
      northTerrace.receiveShadow = true;
      northTerrace.castShadow = true;
      g.add(northTerrace);

      // Low Village Fountain Basin in Central Plaza (does not block center view)
      const waterDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.65, 0.08, 20),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.95,
          roughness: 0.15,
        })
      );
      waterDisk.position.set(0, 0.48, -1.8);
      g.add(waterDisk);

      const fountainRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.34, 0.24, 8),
        stoneMat
      );
      fountainRim.position.set(0, 0.56, -1.8);
      fountainRim.castShadow = true;
      g.add(fountainRim);

      // 2.5D Hand-Drawn Village Cottages via buildPropBillboard('cottage', worldHeight)
      placePropBillboard(g, 'cottage', 5.4, -8.8, 0.5, -2.0, 0.24);
      placePropBillboard(g, 'cottage', 5.2, 8.6, 0.0, 2.6, -0.24);
      placePropBillboard(g, 'cottage', 5.6, 8.4, 1.8, -6.5, -0.18);
      placePropBillboard(g, 'cottage', 5.2, -8.2, 0.9, -7.2, 0.18);

      // 2.5D Hand-Drawn Zohar Monolith on Northern Sanctuary Terrace via buildPropBillboard('zohar_monolith', 6.8)
      placePropBillboard(g, 'zohar_monolith', 6.8, 0, 1.4, -15.2, 0);

      // 2.5D Hand-Drawn Street Lanterns via buildPropBillboard('lantern', 2.8)
      const lanternPositions = [
        { x: 2.4, y: 0.45, z: 2.2 },
        { x: -5.2, y: 0.5, z: -1.2 },
        { x: 5.8, y: 0.9, z: -3.8 },
        { x: -2.4, y: 0, z: 6.6 },
        { x: 2.6, y: 0, z: 10.5 },  // Foreground DoF lantern!
        { x: -3.2, y: 0, z: 11.2 }, // Foreground DoF lantern!
      ];
      lanternPositions.forEach((lp) => {
        placePropBillboard(g, 'lantern', 2.85, lp.x, lp.y, lp.z, 0);
      });

      // 2.5D Hand-Drawn Wooden Fences via buildPropBillboard('fence', 1.55)
      const fencePositions = [
        { x: -5.2, y: 0, z: 4.2, ry: 0 },
        { x: 5.2, y: 0, z: 4.2, ry: 0 },
        { x: -4.5, y: 0, z: 11.8, ry: 0.14 }, // Foreground fence blurred by DoF!
        { x: 4.8, y: 0, z: 12.2, ry: -0.14 }, // Foreground fence blurred by DoF!
      ];
      fencePositions.forEach((fp) => {
        placePropBillboard(g, 'fence', 1.55, fp.x, fp.y, fp.z, fp.ry);
      });

      // 2.5D Hand-Drawn Barrels & Crates via buildPropBillboard('barrels' | 'crates', ...)
      placePropBillboard(g, 'barrels', 1.45, -6.2, 0.5, 0.6, 0);
      placePropBillboard(g, 'crates', 1.55, 6.2, 0.0, 1.4, -0.1);
      placePropBillboard(g, 'barrels', 1.5, 2.9, 0.45, 2.4, 0.08);
      placePropBillboard(g, 'barrels', 1.6, -3.5, 0.0, 10.8, 0.12); // Foreground barrels
      placePropBillboard(g, 'crates', 1.65, 3.6, 0.0, 11.4, -0.12); // Foreground crates

      // 2.5D Hand-Drawn Rocks / Boulders via buildPropBillboard('rock_1' | 'rock_2', ...)
      placePropBillboard(g, 'rock_1', 1.85, -7.4, 0.0, 6.4, 0.1);
      placePropBillboard(g, 'rock_2', 2.1, 7.6, 0.0, 6.8, -0.12);
      placePropBillboard(g, 'rock_1', 1.95, -6.2, 0.0, 11.5, 0.08);
      placePropBillboard(g, 'rock_2', 2.15, 6.4, 0.0, 11.8, -0.08);

      // 2.5D Hand-Drawn Pine Trees (pine_1 & pine_2) via buildPropBillboard()
      const treeCount = 36;
      for (let i = 0; i < treeCount; i++) {
        let tx = 0;
        let tz = 0;
        let s = 1.0;

        if (i < 8) {
          // FOREGROUND DIORAMA TREES (close to camera so they blur under Tilt-Shift DoF!)
          const side = i % 2 === 0 ? -1 : 1;
          tx = side * (5.4 + (i % 4) * 2.3);
          tz = 10.8 + (i % 4) * 1.6;
          s = 1.12 + (i % 3) * 0.12;
        } else {
          const angle = ((i - 8) / (treeCount - 8)) * Math.PI * 2;
          const radius = 15.2 + (i % 3) * 2.8;
          tx = Math.sin(angle) * radius;
          tz = Math.cos(angle) * radius;
          if (Math.abs(tx) < 5.8 && tz < -8) {
            tx = tx < 0 ? -7.2 : 7.2;
          }
          s = 0.96 + (i % 5) * 0.1;
        }

        const pineKind: 'pine_1' | 'pine_2' = i % 2 === 0 ? 'pine_1' : 'pine_2';
        placePropBillboard(g, pineKind, 5.2 * s, tx, 0, tz, 0);
      }
    }

    // ========================================================================
    // ZONE 2: MOUNT LAHAN CREST (WITH 2.5D HAND-DRAWN ROCKS, PINES & ZOHAR)
    // ========================================================================
    {
      const g = zoneGroups.mountain;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: cliffTex.map,
          bumpMap: cliffTex.bumpMap,
          bumpScale: 0.07,
          roughness: 0.85,
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      g.add(ground);

      const mountainBackdrop = createBackdropMesh(92, 36);
      mountainBackdrop.position.set(0, 15.0, -28);
      g.add(mountainBackdrop);

      const stepMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: cobbleTex.map,
        roughness: 0.65,
      });

      for (const p of ZONE_PLATFORMS.mountain) {
        const w = p.maxX - p.minX;
        const dSize = p.maxZ - p.minZ;
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(w, p.topY, dSize), stepMat);
        stepMesh.position.set((p.minX + p.maxX) / 2, p.topY / 2, (p.minZ + p.maxZ) / 2);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        g.add(stepMesh);
      }

      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const rx = side * (6.8 + (i % 2) * 2.2);
        const rz = 11.5 - i * 2.2;
        const rockKind: 'rock_1' | 'rock_2' = i % 2 === 0 ? 'rock_1' : 'rock_2';
        placePropBillboard(g, rockKind, 2.8 + (i % 3) * 0.5, rx, 0, rz, side * -0.15);

        if (i % 2 === 0) {
          const pineKind: 'pine_1' | 'pine_2' = i % 4 === 0 ? 'pine_1' : 'pine_2';
          placePropBillboard(g, pineKind, 5.4, rx + side * 2.4, 0, rz - 0.6, 0);
        }
      }

      placePropBillboard(g, 'lantern', 2.8, -3.6, 0.8, 4.5, 0);
      placePropBillboard(g, 'lantern', 2.8, 3.6, 1.7, -1.0, 0);
      placePropBillboard(g, 'zohar_monolith', 6.2, 0, 3.3, -12.2, 0);
    }

    // ========================================================================
    // ZONE 3: UNDERGROUND GEAR HANGAR (WITH 2.5D ZOHAR, CRATES & DOCKED GEARS)
    // ========================================================================
    const hangarGears: Array<{ plane: THREE.Mesh; group: THREE.Group }> = [];
    {
      const g = zoneGroups.hangar;
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: hangarTex.map,
          bumpMap: hangarTex.bumpMap,
          bumpScale: 0.05,
          roughness: 0.45,
          metalness: 0.55,
        })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      g.add(floor);

      const daisMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.65,
        roughness: 0.35,
      });
      for (const p of ZONE_PLATFORMS.hangar) {
        const w = p.maxX - p.minX;
        const dSize = p.maxZ - p.minZ;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, p.topY, dSize), daisMat);
        mesh.position.set((p.minX + p.maxX) / 2, p.topY / 2, (p.minZ + p.maxZ) / 2);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        g.add(mesh);
      }

      placePropBillboard(g, 'zohar_monolith', 7.2, 0, 1.9, -9.2, 0);
      placePropBillboard(g, 'crates', 1.8, -5.8, 0, 2.4, 0.15);
      placePropBillboard(g, 'barrels', 1.65, -6.4, 0, -2.2, 0.1);
      placePropBillboard(g, 'lantern', 2.8, -4.5, 0, 4.2, 0);
      placePropBillboard(g, 'lantern', 2.8, 4.5, 0, 4.2, 0);

      const dockedVierge = createBillboardActor('vierge', 4.1);
      dockedVierge.root.position.set(6.4, 0, 1.2);
      g.add(dockedVierge.root);
      hangarGears.push({ plane: dockedVierge.plane, group: dockedVierge.root });

      const dockedHeimdal = createBillboardActor('heimdal', 4.1);
      dockedHeimdal.root.position.set(6.4, 0, -3.5);
      g.add(dockedHeimdal.root);
      hangarGears.push({ plane: dockedHeimdal.plane, group: dockedHeimdal.root });
    }

    // Field Player Actor ("Fei" - 64x96 PBR Sprite)
    const playerActor = createBillboardActor('fei', 2.45);
    scene.add(playerActor.root);

    // Dynamic World Entities Container
    const fieldEntitiesGroup = new THREE.Group();
    scene.add(fieldEntitiesGroup);
    let currentBuiltZone: ZoneId | null = null;
    let builtDefeatedKey = '';
    const entityMeshMap = new Map<
      string,
      { entity: WorldEntity; group: THREE.Group; plane?: THREE.Mesh }
    >();

    function rebuildFieldEntities(targetZone: ZoneId, defeatedIds: string[]) {
      fieldEntitiesGroup.clear();
      entityMeshMap.clear();
      const entities = ZONE_ENTITIES[targetZone] || [];

      for (const ent of entities) {
        if (ent.encounterId && defeatedIds.includes(ent.encounterId)) {
          continue;
        }
        const g = new THREE.Group();
        const elev = getGroundHeightAt(targetZone, ent.x, ent.z, 5);
        g.position.set(ent.x, elev, ent.z);

        if (ent.role === 'portal') {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.95, 0.08, 8, 24),
            new THREE.MeshStandardMaterial({
              color: 0x38bdf8,
              emissive: 0x0ea5e9,
              emissiveIntensity: 2.0,
            })
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.12;
          g.add(ring);

          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.65, 0.85, 2.2, 12, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0x38bdf8,
              transparent: true,
              opacity: 0.25,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          pillar.position.y = 1.1;
          g.add(pillar);
        } else {
          const isGear = isGearArchetype(ent.spriteType);
          const actor = createBillboardActor(ent.spriteType, isGear ? 4.2 : 2.4);
          g.add(actor.root);
          entityMeshMap.set(ent.id, { entity: ent, group: g, plane: actor.plane });
          fieldEntitiesGroup.add(g);
          continue;
        }

        entityMeshMap.set(ent.id, { entity: ent, group: g });
        fieldEntitiesGroup.add(g);
      }
    }

    // Battle Stage Group (64x96 Human PBR Sprites + 128x128 Gear Mecha PBR Sprites)
    const battleStageGroup = new THREE.Group();
    scene.add(battleStageGroup);

    const partyBattleNodes = (['fei', 'elly', 'citan'] as const).map((id, idx) => {
      const humanSprite = createBillboardActor(id, 2.45);
      const gearArchetype: SpriteArchetype =
        id === 'fei' ? 'weltall' : id === 'elly' ? 'vierge' : 'heimdal';
      const gearSprite = createBillboardActor(gearArchetype, 4.15);

      const containerNode = new THREE.Group();
      const basePos = new THREE.Vector3(-3.4, 0, (idx - 1) * 2.3);
      containerNode.position.copy(basePos);
      containerNode.add(humanSprite.root);
      containerNode.add(gearSprite.root);
      battleStageGroup.add(containerNode);
      return {
        id,
        gearArchetype,
        containerNode,
        basePos,
        humanSprite,
        gearSprite,
      };
    });

    const enemyBattleNodes = [0, 1].map((idx) => {
      const humanSprite = createBillboardActor('gebler', 2.5);
      const bossGearSprite = createBillboardActor('boss-gear', 4.5);
      const containerNode = new THREE.Group();
      containerNode.add(humanSprite.root);
      containerNode.add(bossGearSprite.root);
      battleStageGroup.add(containerNode);
      return { idx, containerNode, humanSprite, bossGearSprite };
    });

    // Warm Rising Lantern Embers & Blooming Ether Particle Ring Buffer
    const PARTICLE_COUNT = 108;
    const particleGeo = new THREE.OctahedronGeometry(0.09, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    particleInst.frustumCulled = false;
    scene.add(particleInst);

    const particleData = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 22,
      y: Math.random() * 5.5 + 0.2,
      z: (Math.random() - 0.5) * 22,
      vx: (Math.random() - 0.5) * 0.28,
      vy: 0.42 + Math.random() * 0.55,
      vz: (Math.random() - 0.5) * 0.28,
      life: Math.random() * 5,
      maxLife: 3 + Math.random() * 3,
      scale: 0.5 + (i % 4) * 0.2,
      isBurst: false,
    }));

    // Combat Camera Choreography State (Zoom-In Pulse, 120° Deathblow Orbit, Leap-Back Arc)
    let lastHandledEffectId = 0;
    let strikeZoomPulse = 0;
    let deathblowOrbitProgress = 0;
    let deathblowOrbitActive = false;
    let leapBackProgress = 0;
    let leapBackActorId: string | null = null;
    const leapBackStartPos = new THREE.Vector3();

    const keysPressed = new Set<string>();
    let jumpJustPressed = false;
    let interactJustPressed = false;

    const playerPhys = {
      x: 0,
      y: 0.45,
      z: 3.8,
      vy: 0,
      grounded: true,
      coyoteTimer: 0,
      walkDist: 0,
      cameraYaw: 0,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (!keysPressed.has(code)) {
        if (code === 'Space') jumpJustPressed = true;
        if (code === 'Enter' || code === 'KeyZ') interactJustPressed = true;
        if (code === 'KeyQ') callbacksRef.current.onRotateCamera(-Math.PI / 4);
        if (code === 'KeyE') callbacksRef.current.onRotateCamera(Math.PI / 4);
      }
      keysPressed.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      if (e.code === 'Space' && playerPhys.vy > 0) {
        playerPhys.vy *= 0.45;
      }
    };

    const clearKeys = () => {
      keysPressed.clear();
      jumpJustPressed = false;
      interactJustPressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);

    const initW = rect.width || window.innerWidth;
    const initH = rect.height || window.innerHeight;
    const postProcessor = new HD2DPostProcessor({
      width: initW,
      height: initH,
      crtEnabled: stateRef.current.crtScanlines,
      tiltShiftStrength: 1.15,
      bloomStrength: 0.95,
      bloomThreshold: 0.72,
    });

    const unsubscribeLiveAsset = onLiveAssetChanged(() => {
      activeBillboards.forEach((b) => b.refreshCurrent());
    });

    const handleResize = () => {
      if (!container) return;
      const r = container.getBoundingClientRect();
      const w = r.width || window.innerWidth;
      const h = r.height || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      postProcessor.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const _camTargetPos = new THREE.Vector3();
    const _camLookAt = new THREE.Vector3();
    const _currentLookAt = new THREE.Vector3(0, 1.5, 0);
    const _dummyObj = new THREE.Object3D();
    const _pColor = new THREE.Color();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const elapsed = now * 0.001;

      const st = stateRef.current;

      const defKey = st.defeatedEncounterIds.join(',');
      if (currentBuiltZone !== st.zone || builtDefeatedKey !== defKey) {
        currentBuiltZone = st.zone;
        builtDefeatedKey = defKey;
        zoneGroups.lahan.visible = st.zone === 'lahan';
        zoneGroups.mountain.visible = st.zone === 'mountain';
        zoneGroups.hangar.visible = st.zone === 'hangar';

        const meta = ZONE_METADATA[st.zone];
        (scene.background as THREE.Color).set(meta.skyColor);
        (scene.fog as THREE.FogExp2).color.set(meta.fogColor);

        rebuildFieldEntities(st.zone, st.defeatedEncounterIds);
        playerPhys.x = 0;
        playerPhys.z = st.zone === 'lahan' ? 3.8 : 8.5;
        playerPhys.y = getGroundHeightAt(st.zone, playerPhys.x, playerPhys.z, 2);
        playerPhys.vy = 0;
      }

      // Trigger Visual Effects, Rapid Zoom-In, 120° Deathblow Orbit & Blooming Ether Burst
      if (st.visualEffect && st.visualEffect.id !== lastHandledEffectId) {
        lastHandledEffectId = st.visualEffect.id;

        if (st.visualEffect.type === 'leap-back') {
          leapBackActorId = st.visualEffect.actorId;
          leapBackProgress = 0.01;
          leapBackStartPos.set(st.visualEffect.targetX - 1.0, 0, st.visualEffect.targetZ);
          deathblowOrbitActive = false;
        } else {
          // Rapid camera zoom-in on every strike!
          strikeZoomPulse = st.visualEffect.type === 'deathblow' ? 1.0 : 0.68;

          if (st.visualEffect.type === 'deathblow') {
            deathblowOrbitActive = true;
            deathblowOrbitProgress = 0;
          }

          // Blooming Ether Particle Explosion on target impact
          const burstCount = st.visualEffect.type === 'deathblow' ? 48 : 22;
          for (let i = 0; i < burstCount; i++) {
            const p = particleData[i];
            p.x = st.visualEffect.targetX + (Math.random() - 0.5) * 0.9;
            p.y = 1.4 + (Math.random() - 0.5) * 0.9;
            p.z = st.visualEffect.targetZ + (Math.random() - 0.5) * 0.9;
            const ang = Math.random() * Math.PI * 2;
            const spd =
              (st.visualEffect.type === 'deathblow' ? 4.2 : 2.6) + Math.random() * 5.0;
            p.vx = Math.cos(ang) * spd;
            p.vy = 1.8 + Math.random() * 4.8;
            p.vz = Math.sin(ang) * spd;
            p.life = 0;
            p.maxLife = st.visualEffect.type === 'deathblow' ? 0.85 : 0.55;
            p.isBurst = true;
          }
        }
      }

      strikeZoomPulse = Math.max(0, strikeZoomPulse - dt * 2.8);
      if (deathblowOrbitActive) {
        // 120 degrees (2*PI/3) camera orbit around the Deathblow impact!
        deathblowOrbitProgress = Math.min(1, deathblowOrbitProgress + dt * 2.3);
      }
      if (leapBackProgress > 0) {
        leapBackProgress = Math.min(1, leapBackProgress + dt * 3.4);
        if (leapBackProgress >= 1) {
          leapBackProgress = 0;
          leapBackActorId = null;
        }
      }

      let simDt = dt;
      if (hitstopTimerRef.current > 0) {
        hitstopTimerRef.current = Math.max(0, hitstopTimerRef.current - dt);
        simDt = 0;
      }

      const dampFactor = 1 - Math.exp(-8.5 * dt);
      playerPhys.cameraYaw = THREE.MathUtils.lerp(
        playerPhys.cameraYaw,
        st.cameraYawTarget,
        dampFactor
      );

      // Flickering Warm Octopath Lantern & Campfire Lights + Dimming during Deathblow Finisher
      const isDeathblowDimming =
        st.visualEffect?.type === 'deathblow' || deathblowOrbitActive;
      ambientLight.intensity = isDeathblowDimming ? 0.45 : 0.85;
      dirLight.intensity = isDeathblowDimming ? 0.75 : 1.35;
      primaryLanternLight.intensity = 3.5 + Math.sin(elapsed * 7.2) * 0.45;
      warmPointLights.forEach((wl) => {
        wl.light.intensity = 3.5 + Math.sin(elapsed * 6.5 + wl.phase) * 0.4;
      });

      const isBattle = st.mode === 'battle' && st.gameState === 'playing';
      playerActor.root.visible = !isBattle;
      fieldEntitiesGroup.visible = !isBattle;
      battleStageGroup.visible = isBattle;

      // Cylindrical Y-yaw billboarding on all 2.5D hand-drawn props
      billboardProps.forEach(({ prop, mesh, worldHeight }) => {
        prop.rotation.set(0, 0, 0);
        mesh.lookAt(
          camera.position.x,
          prop.position.y + worldHeight * 0.5,
          camera.position.z
        );
      });

      if (st.zone === 'hangar') {
        hangarGears.forEach((hg) => {
          hg.plane.lookAt(camera.position.x, hg.group.position.y + 2.0, camera.position.z);
        });
      }

      if (st.gameState === 'title') {
        const orbitAngle = elapsed * 0.22;
        _camTargetPos.set(
          Math.sin(orbitAngle) * 13.5,
          6.2 + Math.sin(elapsed * 0.5) * 0.7,
          Math.cos(orbitAngle) * 13.5
        );
        _camLookAt.set(0, 1.8, -1.5);
        camera.position.lerp(_camTargetPos, dampFactor);
        _currentLookAt.lerp(_camLookAt, dampFactor);
        camera.lookAt(_currentLookAt);
        playerActor.plane.lookAt(
          camera.position.x,
          playerActor.root.position.y + 1.2,
          camera.position.z
        );
      } else if (!isBattle && st.gameState === 'playing') {
        let moveX = externalMoveIntentRef.current.dx;
        let moveZ = externalMoveIntentRef.current.dz;

        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveZ -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveZ += 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;

        if (externalMoveIntentRef.current.jump) {
          jumpJustPressed = true;
          externalMoveIntentRef.current.jump = false;
        }

        const len = Math.hypot(moveX, moveZ);
        if (len > 0.01 && simDt > 0) {
          moveX /= len;
          moveZ /= len;
          const speed = 6.8;
          const sinY = Math.sin(playerPhys.cameraYaw);
          const cosY = Math.cos(playerPhys.cameraYaw);
          const worldDx = (moveX * cosY + moveZ * sinY) * speed * simDt;
          const worldDz = (-moveX * sinY + moveZ * cosY) * speed * simDt;

          playerPhys.x = THREE.MathUtils.clamp(playerPhys.x + worldDx, -13.5, 13.5);
          playerPhys.z = THREE.MathUtils.clamp(playerPhys.z + worldDz, -13.5, 13.5);
          playerPhys.walkDist += speed * simDt;
        }

        const floorY = getGroundHeightAt(st.zone, playerPhys.x, playerPhys.z, playerPhys.y);

        if (playerPhys.grounded) {
          playerPhys.coyoteTimer = 0.1;
        } else {
          playerPhys.coyoteTimer = Math.max(0, playerPhys.coyoteTimer - simDt);
        }

        if (jumpJustPressed && playerPhys.coyoteTimer > 0) {
          playerPhys.vy = 9.2;
          playerPhys.grounded = false;
          playerPhys.coyoteTimer = 0;
          spuAudio.playJump();
        }
        jumpJustPressed = false;

        playerPhys.vy -= 22.0 * simDt;
        playerPhys.y += playerPhys.vy * simDt;

        if (playerPhys.y <= floorY) {
          playerPhys.y = floorY;
          playerPhys.vy = 0;
          playerPhys.grounded = true;
        } else {
          playerPhys.grounded = false;
        }

        playerActor.root.position.set(playerPhys.x, playerPhys.y, playerPhys.z);
        playerActor.shadow.position.y = Math.max(0.02, floorY - playerPhys.y + 0.02);

        const feiState = st.party[0];
        if (!playerPhys.grounded) {
          playerActor.setFrame('fei', 8, feiState?.idAwakened, 'jump');
        } else if (len > 0.01) {
          const walkStep = Math.floor(playerPhys.walkDist * 2.6) % 8;
          playerActor.setFrame('fei', walkStep, feiState?.idAwakened, 'walk');
        } else {
          playerActor.setFrame('fei', 0, feiState?.idAwakened, 'idle');
        }
        playerActor.plane.lookAt(
          camera.position.x,
          playerActor.root.position.y + 1.2,
          camera.position.z
        );

        callbacksRef.current.onPlayerCoordsChange?.(playerPhys.x, playerPhys.y, playerPhys.z);

        let closestEnt: WorldEntity | null = null;
        let closestDist = 2.75;
        entityMeshMap.forEach(({ entity, group, plane }) => {
          if (plane) {
            plane.lookAt(camera.position.x, group.position.y + 1.2, camera.position.z);
          }
          const dist = Math.hypot(entity.x - playerPhys.x, entity.z - playerPhys.z);
          if (dist < closestDist) {
            closestDist = dist;
            closestEnt = entity;
          }
        });
        callbacksRef.current.onNearEntityChange(closestEnt);

        if (interactJustPressed && closestEnt) {
          callbacksRef.current.onTriggerEntity(closestEnt);
        }
        interactJustPressed = false;

        // Octopath Diorama Field Camera Angle
        const camDist = 10.6;
        const camHeight = 5.6;
        _camTargetPos.set(
          playerPhys.x + Math.sin(playerPhys.cameraYaw) * camDist,
          playerPhys.y + camHeight,
          playerPhys.z + Math.cos(playerPhys.cameraYaw) * camDist
        );
        _camLookAt.set(playerPhys.x, playerPhys.y + 1.15, playerPhys.z - 0.6);

        camera.position.lerp(_camTargetPos, dampFactor);
        _currentLookAt.lerp(_camLookAt, dampFactor);
        camera.lookAt(_currentLookAt);
      } else if (isBattle) {
        // ====================================================================
        // 3. REGIA CINEMATOGRAFICA DI COMBATTIMENTO IN 3D
        // ====================================================================
        const stageY = getGroundHeightAt(st.zone, 0, 0, 2);
        battleStageGroup.position.set(0, stageY, 0);

        const activeTargetEnemy =
          st.enemies[st.selectedEnemyIdx] ||
          st.enemies.find((e) => e.hp > 0) ||
          st.enemies[0];

        partyBattleNodes.forEach((node) => {
          const member = st.party.find((m) => m.id === node.id);
          if (!member) return;
          const isActing = st.activeActorId === member.id;
          const isEffectActor =
            st.visualEffect?.actorId === member.id &&
            st.visualEffect?.type !== 'leap-back';
          const isLeapingBack = leapBackActorId === member.id && leapBackProgress > 0;

          node.humanSprite.root.visible = !member.inGear;
          node.gearSprite.root.visible = member.inGear;

          if (isEffectActor && st.visualEffect) {
            // a) Scatto fisico in avanti nello spazio 3D fino a 1 unità di distanza dal bersaglio!
            const dashTargetX = st.visualEffect.targetX - 1.0;
            const dashTargetZ = st.visualEffect.targetZ;
            node.containerNode.position.x = THREE.MathUtils.lerp(
              node.containerNode.position.x,
              dashTargetX,
              Math.min(1, dampFactor * 3.4)
            );
            node.containerNode.position.z = THREE.MathUtils.lerp(
              node.containerNode.position.z,
              dashTargetZ,
              Math.min(1, dampFactor * 3.4)
            );
            node.containerNode.position.y =
              st.visualEffect.type === 'deathblow' ? 0.55 : 0;
          } else if (isLeapingBack) {
            // c) Balzo acrobatico all'indietro alla posizione iniziale dopo la sequenza/Deathblow!
            node.containerNode.position.x = THREE.MathUtils.lerp(
              leapBackStartPos.x,
              node.basePos.x,
              leapBackProgress
            );
            node.containerNode.position.z = THREE.MathUtils.lerp(
              leapBackStartPos.z,
              node.basePos.z,
              leapBackProgress
            );
            node.containerNode.position.y = Math.sin(leapBackProgress * Math.PI) * 2.15;
          } else {
            const readyStepX = isActing ? node.basePos.x + 0.85 : node.basePos.x;
            node.containerNode.position.x = THREE.MathUtils.lerp(
              node.containerNode.position.x,
              readyStepX,
              dampFactor * 1.6
            );
            node.containerNode.position.z = THREE.MathUtils.lerp(
              node.containerNode.position.z,
              node.basePos.z,
              dampFactor * 1.6
            );
            node.containerNode.position.y = THREE.MathUtils.lerp(
              node.containerNode.position.y,
              0,
              dampFactor * 2.0
            );
          }

          let pose: SpritePose = 'idle';
          let frameNum = 0;
          if (isLeapingBack) {
            pose = 'jump';
            frameNum = 8;
          } else if (isEffectActor && st.visualEffect) {
            if (st.visualEffect.type === 'deathblow') {
              const dbId = st.visualEffect.deathblowId;
              pose =
                dbId === 'raijin'
                  ? 'raijin'
                  : dbId === 'senretsu'
                  ? 'senretsu'
                  : dbId === 'tenbu'
                  ? 'tenbu'
                  : dbId === 'kishin'
                  ? 'kishin'
                  : 'strong_kick';
              frameNum = 10;
            } else if (st.visualEffect.type === 'ether') {
              pose = 'ether_cast';
              frameNum = 12;
            } else {
              const tier = st.visualEffect.inputTier;
              pose =
                tier === 'X'
                  ? 'strong_kick'
                  : tier === 'S'
                  ? 'senretsu'
                  : 'weak_hit';
              frameNum = tier === 'X' ? 10 : 9;
            }
          } else if (member.isDefending) {
            pose = 'guard';
            frameNum = 11;
          } else if (isActing) {
            pose = 'walk';
            frameNum = Math.floor(elapsed * 4.5) % 8;
          }

          if (member.inGear) {
            node.gearSprite.setFrame(node.gearArchetype, frameNum, member.idAwakened, pose);
            node.gearSprite.plane.lookAt(
              camera.position.x,
              stageY + node.containerNode.position.y + 2.0,
              camera.position.z
            );
          } else {
            node.humanSprite.setFrame(node.id, frameNum, member.idAwakened, pose);
            node.humanSprite.plane.lookAt(
              camera.position.x,
              stageY + node.containerNode.position.y + 1.2,
              camera.position.z
            );
          }
        });

        enemyBattleNodes.forEach((eNode, idx) => {
          const enemy = st.enemies[idx];
          if (!enemy || enemy.hp <= 0) {
            eNode.containerNode.visible = false;
            return;
          }
          eNode.containerNode.visible = true;
          eNode.containerNode.position.set(enemy.xOffset, 0, enemy.zOffset);
          eNode.humanSprite.root.visible = !enemy.isGearSize;
          eNode.bossGearSprite.root.visible = enemy.isGearSize;

          if (enemy.isGearSize) {
            eNode.bossGearSprite.plane.lookAt(
              camera.position.x,
              stageY + 2.2,
              camera.position.z
            );
          } else {
            eNode.humanSprite.plane.lookAt(
              camera.position.x,
              stageY + 1.2,
              camera.position.z
            );
          }
        });

        // REGIA DINAMICA DELLA TELECAMERA 3D IN BATTAGLIA:
        const activePartyNode = partyBattleNodes.find((n) => n.id === st.activeActorId);
        const effectPartyNode = partyBattleNodes.find(
          (n) => n.id === st.visualEffect?.actorId
        );

        if (
          st.visualEffect &&
          st.visualEffect.type !== 'leap-back' &&
          effectPartyNode
        ) {
          const impX = st.visualEffect.targetX;
          const impZ = st.visualEffect.targetZ;

          if (st.visualEffect.type === 'deathblow' || deathblowOrbitActive) {
            // c) Rotazione di 120 gradi (2*PI/3 rad) attorno al punto d'impatto durante il Deathblow!
            const startAngle = -0.35;
            const orbitSweep = (2 * Math.PI) / 3; // 120 gradi!
            const currentOrbitAngle = startAngle + deathblowOrbitProgress * orbitSweep;
            const orbitRadius = 4.6 - strikeZoomPulse * 0.9;

            _camTargetPos.set(
              impX + Math.sin(currentOrbitAngle) * orbitRadius,
              stageY + 2.15,
              impZ + Math.cos(currentOrbitAngle) * orbitRadius
            );
            _camLookAt.set(impX - 0.3, stageY + 1.35, impZ);
          } else {
            // b) Zoom-in rapido ravvicinato ad ogni singolo colpo della sequenza (▲, ■, ✕)
            const zoomRadius = 5.4 - strikeZoomPulse * 1.45;
            const stepShift = ((st.visualEffect.stepIndex ?? 0) % 2 === 0 ? 1 : -1) * 0.35;
            _camTargetPos.set(
              impX - 1.2 + Math.sin(stepShift) * zoomRadius * 0.5,
              stageY + 2.25 - strikeZoomPulse * 0.35,
              impZ + zoomRadius
            );
            _camLookAt.set(impX - 0.4, stageY + 1.3, impZ);
          }
        } else if (activePartyNode) {
          // Durante la scelta del comando: TAGLIO DINAMICO BASSO DIETRO LA SPALLA DEL PERSONAGGIO ATTIVO
          // (inquadrando i nemici in prospettiva drammatica)
          const actorWorldX = activePartyNode.containerNode.position.x;
          const actorWorldZ = activePartyNode.containerNode.position.z;
          const enemyWorldX = activeTargetEnemy ? activeTargetEnemy.xOffset : 2.6;
          const enemyWorldZ = activeTargetEnemy ? activeTargetEnemy.zOffset : 0;

          const shoulderSway = Math.sin(elapsed * 1.4) * 0.22;
          _camTargetPos.set(
            actorWorldX - 2.85,
            stageY + 1.85,
            actorWorldZ + 2.15 + shoulderSway
          );
          _camLookAt.set(
            (actorWorldX + enemyWorldX) * 0.5 + 0.9,
            stageY + 1.35,
            (actorWorldZ + enemyWorldZ) * 0.5
          );
        } else {
          // Panoramica dinamica in movimento continuo durante la ricarica ATB
          const idleOrbit = elapsed * 0.48 + playerPhys.cameraYaw;
          _camTargetPos.set(
            Math.sin(idleOrbit) * 8.6,
            stageY + 3.4 + Math.sin(elapsed * 0.9) * 0.4,
            Math.cos(idleOrbit) * 8.6
          );
          _camLookAt.set(0, stageY + 1.3, 0);
        }

        const camLerpSpeed = st.visualEffect ? Math.min(1, dampFactor * 2.6) : dampFactor * 1.35;
        camera.position.lerp(_camTargetPos, camLerpSpeed);
        _currentLookAt.lerp(_camLookAt, camLerpSpeed);
        camera.lookAt(_currentLookAt);
      }

      if (traumaRef.current > 0) {
        const shake = traumaRef.current * traumaRef.current * 0.52;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        traumaRef.current = Math.max(0, traumaRef.current - dt * 2.5);
      }

      // Update Warm Rising Embers & Blooming Ether Burst Particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleData[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.x = (Math.random() - 0.5) * 20;
          p.y = 0.2 + Math.random() * 1.2;
          p.z = (Math.random() - 0.5) * 20;
          p.vx = (Math.random() - 0.5) * 0.25;
          p.vy = 0.45 + Math.random() * 0.55;
          p.vz = (Math.random() - 0.5) * 0.25;
          p.life = 0;
          p.maxLife = 3.2 + Math.random() * 2.5;
          p.isBurst = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
        }
        const s = p.isBurst ? p.scale * 2.1 * (1 - p.life / p.maxLife) : p.scale;
        _dummyObj.position.set(p.x, p.y, p.z);
        _dummyObj.scale.set(s, s, s);
        _dummyObj.rotation.set(elapsed, elapsed * 1.3, 0);
        _dummyObj.updateMatrix();
        particleInst.setMatrixAt(i, _dummyObj.matrix);

        if (p.isBurst && st.visualEffect) {
          _pColor.set(st.visualEffect.color);
        } else {
          // Particelle luminose calde (#ff9933 / #ffdd66) che salgono verso l'alto stile Octopath
          _pColor.setHex(i % 3 === 0 ? 0xffdd66 : 0xff8822);
        }
        particleInst.setColorAt(i, _pColor);
      }
      particleInst.instanceMatrix.needsUpdate = true;
      if (particleInst.instanceColor) particleInst.instanceColor.needsUpdate = true;

      postProcessor.setCrtEnabled(Boolean(st.crtScanlines));
      postProcessor.render(renderer, scene, camera, elapsed);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      unsubscribeLiveAsset();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      window.removeEventListener('resize', handleResize);
      postProcessor.dispose();
      renderer.dispose();
    };
  }, [hitstopTimerRef, traumaRef, externalMoveIntentRef]);

  return (
    <div
      ref={mountRef}
      data-testid="resonance-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden"
    />
  );
};
