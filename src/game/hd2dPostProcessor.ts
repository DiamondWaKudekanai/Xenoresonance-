import * as THREE from 'three';

export interface HD2DPostProcessorOptions {
  width: number;
  height: number;
  crtEnabled?: boolean;
  tiltShiftStrength?: number;
  bloomStrength?: number;
  bloomThreshold?: number;
}

/**
 * MODULO 1: HD2DPostProcessor
 * Custom WebGL Framebuffer / ShaderPass pipeline nativa (senza dipendenze esterne).
 * Implementa:
 *  a) Tilt-Shift Depth of Field (sfocatura gaussiana progressiva nel top 20% e bottom 20% di vUv.y)
 *  b) Bloom Thresholding (estrazione luminanza > 0.75 e alone luminoso additivo per Ether e occhi dei Gear)
 *  c) Color Grading & Vignette (contrasto alto, ombre fredde bluastre, luci calde ambrate stile Octopath / FF Resonance + scanline CRT)
 */
export class HD2DPostProcessor {
  public renderTarget: THREE.WebGLRenderTarget;
  public quadScene: THREE.Scene;
  public quadCamera: THREE.OrthographicCamera;
  public material: THREE.ShaderMaterial;
  private quadMesh: THREE.Mesh;

  constructor(options: HD2DPostProcessorOptions) {
    const width = Math.max(1, options.width);
    const height = Math.max(1, options.height);

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.renderTarget.texture.colorSpace = THREE.SRGBColorSpace;

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTime: { value: 0.0 },
        uCrtEnabled: { value: options.crtEnabled ? 1.0 : 0.0 },
        uTiltShiftStrength: { value: options.tiltShiftStrength ?? 1.0 },
        uBloomStrength: { value: options.bloomStrength ?? 0.85 },
        uBloomThreshold: { value: options.bloomThreshold ?? 0.75 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;

        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uCrtEnabled;
        uniform float uTiltShiftStrength;
        uniform float uBloomStrength;
        uniform float uBloomThreshold;

        varying vec2 vUv;

        // Calcolo della luminanza percettiva Rec.709
        float getLuminance(vec3 color) {
          return dot(color, vec3(0.2126, 0.7152, 0.0722));
        }

        // Estrazione dei pixel ad alta luminanza (> uBloomThreshold, default 0.75)
        vec3 extractBrightPass(vec2 uv, float threshold) {
          vec3 c = texture2D(tDiffuse, uv).rgb;
          float lum = getLuminance(c);
          float knee = smoothstep(threshold - 0.08, threshold + 0.15, lum);
          return c * knee;
        }

        void main() {
          vec2 texel = 1.0 / max(uResolution, vec2(1.0));

          // ====================================================================
          // A) TILT-SHIFT DEPTH OF FIELD (Top 20% vUv.y > 0.80 & Bottom 20% vUv.y < 0.20)
          // ====================================================================
          float topMask = smoothstep(0.80, 0.98, vUv.y);
          float bottomMask = smoothstep(0.20, 0.02, vUv.y);
          float dofFactor = clamp(topMask + bottomMask, 0.0, 1.0) * uTiltShiftStrength;

          vec3 baseColor = texture2D(tDiffuse, vUv).rgb;
          vec3 dofAccum = baseColor * 0.227027;

          if (dofFactor > 0.005) {
            float blurRadius = dofFactor * 3.2;
            // Campionamento gaussiano bidirezionale a 9 tap per effetto miniatura dioramas HD-2D
            vec2 off1 = texel * blurRadius * 1.2;
            vec2 off2 = texel * blurRadius * 2.6;

            dofAccum += texture2D(tDiffuse, vUv + vec2( off1.x,  0.0)).rgb * 0.12;
            dofAccum += texture2D(tDiffuse, vUv + vec2(-off1.x,  0.0)).rgb * 0.12;
            dofAccum += texture2D(tDiffuse, vUv + vec2( 0.0,  off1.y)).rgb * 0.12;
            dofAccum += texture2D(tDiffuse, vUv + vec2( 0.0, -off1.y)).rgb * 0.12;

            dofAccum += texture2D(tDiffuse, vUv + vec2( off2.x,  off2.y)).rgb * 0.073243;
            dofAccum += texture2D(tDiffuse, vUv + vec2(-off2.x,  off2.y)).rgb * 0.073243;
            dofAccum += texture2D(tDiffuse, vUv + vec2( off2.x, -off2.y)).rgb * 0.073243;
            dofAccum += texture2D(tDiffuse, vUv + vec2(-off2.x, -off2.y)).rgb * 0.073243;
          } else {
            dofAccum = baseColor;
          }

          vec3 color = mix(baseColor, dofAccum, dofFactor);

          // ====================================================================
          // B) BLOOM THRESHOLDING (Luminanza > 0.75 + Alone Luminoso Ether / Occhi Gear)
          // ====================================================================
          vec3 bloom = extractBrightPass(vUv, uBloomThreshold) * 0.24;
          vec2 bStep1 = texel * 2.5;
          vec2 bStep2 = texel * 5.5;

          bloom += extractBrightPass(vUv + vec2( bStep1.x,  0.0), uBloomThreshold) * 0.12;
          bloom += extractBrightPass(vUv + vec2(-bStep1.x,  0.0), uBloomThreshold) * 0.12;
          bloom += extractBrightPass(vUv + vec2( 0.0,  bStep1.y), uBloomThreshold) * 0.12;
          bloom += extractBrightPass(vUv + vec2( 0.0, -bStep1.y), uBloomThreshold) * 0.12;

          bloom += extractBrightPass(vUv + vec2( bStep2.x,  bStep2.y), uBloomThreshold) * 0.07;
          bloom += extractBrightPass(vUv + vec2(-bStep2.x,  bStep2.y), uBloomThreshold) * 0.07;
          bloom += extractBrightPass(vUv + vec2( bStep2.x, -bStep2.y), uBloomThreshold) * 0.07;
          bloom += extractBrightPass(vUv + vec2(-bStep2.x, -bStep2.y), uBloomThreshold) * 0.07;

          color += bloom * uBloomStrength;

          // ====================================================================
          // C) COLOR GRADING & VIGNETTE (Octopath / FF Resonance + Scanline CRT)
          // ====================================================================
          // Convert linear WebGLRenderTarget radiance to sRGB perceptual space
          color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.15));

          float luma = getLuminance(color);

          // Ombre fredde bluastre (#1a2b4c) e luci calde ambrate (#ffcf87)
          vec3 coldShadows = vec3(0.10, 0.17, 0.30);
          vec3 warmHighlights = vec3(1.08, 0.94, 0.76);

          float shadowWeight = clamp(1.0 - smoothstep(0.0, 0.52, luma), 0.0, 1.0);
          float highlightWeight = clamp(smoothstep(0.42, 0.95, luma), 0.0, 1.0);

          color = mix(color, color + coldShadows * 0.26, shadowWeight * 0.65);
          color = mix(color, color * warmHighlights, highlightWeight * 0.60);

          // Soft contrast curve preserving bright pixel-art midtones
          color = clamp((color - 0.42) * 1.06 + 0.47, 0.0, 1.0);

          // Gentle vignette at screen corners
          vec2 centeredUv = vUv - vec2(0.5);
          float distSq = dot(centeredUv, centeredUv);
          float vignette = smoothstep(0.75, 0.20, distSq);
          color *= mix(0.76, 1.0, vignette);

          // Optional CRT scanline modulation
          float scanlineFreq = vUv.y * uResolution.y * 3.14159265;
          float activeScanline = mix(1.0, 0.93 + 0.07 * sin(scanlineFreq), uCrtEnabled);
          color *= activeScanline;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeo, this.material);
    this.quadScene.add(this.quadMesh);
  }

  public setSize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.renderTarget.setSize(w, h);
    this.material.uniforms.uResolution.value.set(w, h);
  }

  public setCrtEnabled(enabled: boolean): void {
    this.material.uniforms.uCrtEnabled.value = enabled ? 1.0 : 0.0;
  }

  public render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    elapsedSeconds: number
  ): void {
    this.material.uniforms.uTime.value = elapsedSeconds;

    // 1. Renderizza la scena 3D nel Framebuffer offscreen
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. Renderizza il Fullscreen Quad con lo Shader HD-2D a schermo
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCamera);
  }

  public dispose(): void {
    this.renderTarget.dispose();
    this.quadMesh.geometry.dispose();
    this.material.dispose();
  }
}
