import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useGameStore } from '../store/useGameStore.js';

function checkWebGLAvailable() {
  try {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Generates a crisp pixel-art cyberpunk sign/window texture on a canvas.
 */
function useVoxelSignTexture(bg, fg, glyphSeed = 1) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 64, 32);

    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 60, 28);

    ctx.fillStyle = fg;
    // Draw blocky cyberpunk pixel glyphs
    const blocks = [
      [8, 8, 6, 16],
      [18, 8, 10, 4],
      [22, 12, 4, 12],
      [32, 8, 4, 16],
      [36, 14, 8, 4],
      [44, 8, 4, 16],
      [52, 8, 6, 6],
      [52, 18, 6, 6],
    ];
    blocks.forEach(([x, y, w, h], i) => {
      if ((i + glyphSeed) % 7 !== 0) {
        ctx.fillRect(x, y, w, h);
      }
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [bg, fg, glyphSeed]);
}

/**
 * Generates a high-contrast recessed voxel window facade texture.
 */
function useFacadeTexture(bodyColor, litColor1, litColor2, cols = 6, rows = 14, seed = 1, isCompromised = false) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = bodyColor;
    ctx.fillRect(0, 0, 128, 256);

    const padX = 6;
    const padY = 5;
    const cellW = (128 - padX * (cols + 1)) / cols;
    const cellH = (256 - padY * (rows + 1)) / rows;

    let s = Math.floor((seed + 3) * 7919);
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (cellW + padX);
        const y = padY + r * (cellH + padY);
        const roll = rand();
        if (roll < 0.72) {
          if (isCompromised && roll < 0.45) {
            ctx.fillStyle = '#ff2a55';
          } else if (roll < 0.25 || r % 5 === 0) {
            ctx.fillStyle = litColor2;
          } else {
            ctx.fillStyle = litColor1;
          }
          ctx.fillRect(x, y, cellW, cellH);
          // Bright inner core for bloom warmth
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.38;
          ctx.fillRect(x + 2, y + 2, Math.max(2, cellW - 4), Math.max(2, cellH - 4));
          ctx.globalAlpha = 1.0;
        } else {
          ctx.fillStyle = '#0c1228';
          ctx.fillRect(x, y, cellW, cellH);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [bodyColor, litColor1, litColor2, cols, rows, seed, isCompromised]);
}

let cachedGlowTex = null;
function getRadialGlowTexture() {
  if (cachedGlowTex) return cachedGlowTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  cachedGlowTex = new THREE.CanvasTexture(canvas);
  cachedGlowTex.needsUpdate = true;
  return cachedGlowTex;
}

function GlowBox({ args, position, rotation, color, intensity = 1.6 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function BloomPostProcessing({ enabled }) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      composerRef.current = null;
      return undefined;
    }
    try {
      const composer = new EffectComposer(gl);
      const renderPass = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        0.34, // subtle, crisp neon bloom strength
        0.38, // tight halo radius
        0.88  // high threshold so dark navy sky & building walls stay deep and rich
      );
      const outputPass = new OutputPass();
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);
      composerRef.current = composer;
      return () => {
        composer.dispose();
        composerRef.current = null;
      };
    } catch {
      composerRef.current = null;
      return undefined;
    }
  }, [enabled, gl, scene, camera]);

  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(size.width, size.height);
    }
  }, [size]);

  useFrame(() => {
    if (enabled && composerRef.current) {
      composerRef.current.render();
    }
  }, 1);

  return null;
}

function CameraController({ focusTarget, resetCounter }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const desiredTarget = useRef(new THREE.Vector3(-0.3, 4.5, 0.2));
  const desiredPosition = useRef(new THREE.Vector3(-3.6, 9.8, 23.5));
  const isTransitioning = useRef(false);

  useEffect(() => {
    if (focusTarget && focusTarget.position) {
      const [x, , z] = focusTarget.position;
      const h = Math.min(9.5, (focusTarget.height || 7) * 0.55);
      desiredTarget.current.set(x, h, z);
      desiredPosition.current.set(x - 4.5, h + 5.5, z + 12.5);
      isTransitioning.current = true;
    }
  }, [focusTarget]);

  useEffect(() => {
    if (resetCounter > 0) {
      desiredTarget.current.set(-0.3, 4.5, 0.2);
      desiredPosition.current.set(-3.6, 9.8, 23.5);
      isTransitioning.current = true;
    }
  }, [resetCounter]);

  useFrame((_, delta) => {
    if (!controlsRef.current || !isTransitioning.current) return;
    const step = Math.min(1, delta * 5.5);
    controlsRef.current.target.lerp(desiredTarget.current, step);
    camera.position.lerp(desiredPosition.current, step);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(desiredPosition.current) < 0.15 &&
      controlsRef.current.target.distanceTo(desiredTarget.current) < 0.15
    ) {
      isTransitioning.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={46}
      maxPolarAngle={Math.PI / 2 - 0.04}
      target={[-0.3, 4.5, 0.2]}
    />
  );
}

/**
 * Handcrafted Voxel Cyberpunk Building Renderer with 5 Distinct Architectural Styles
 * inspired directly by the reference diorama artwork.
 */
function VoxelBuilding({
  building,
  isSelected,
  isHovered,
  overlays,
  bloomEnabled,
  onSelect,
  onDoubleClick,
  onHover,
}) {
  const beaconRef = useRef();
  const shieldRingRef = useRef();
  const { width, depth, height, antennaHeight, seedOffset } = building.dimensions;

  const isCompromised = building.compromiseState !== 'NONE' && !building.isolated;
  const isAffected = building.compromiseState === 'AFFECTED';
  const isIsolated = building.isolated;
  const discoveredUnmitigatedVulns = building.vulnerabilities.filter(
    (v) => v.discovered && !v.mitigated
  );
  const hasFirewallOrSeg = building.installedControls.some((c) =>
    ['firewall', 'segmentation'].includes(c)
  );
  const hasMonitoring = building.installedControls.some((c) =>
    ['logging', 'net_monitoring', 'edr', 'ids', 'anomaly_detection'].includes(c)
  );

  // Determine architectural style based on archetype (preserve signature neon colors; use red override only when severely AFFECTED)
  const arch = building.archetype;
  const primaryNeon = isAffected
    ? '#ff2a55'
    : arch === 'factory'
    ? '#00f5d4'
    : arch === 'power'
    ? '#ffb800'
    : arch === 'financial' || arch === 'datacenter'
    ? '#ff8800'
    : '#00f0ff';

  const secondaryNeon = isAffected
    ? '#ff5500'
    : arch === 'telecom'
    ? '#ffb800'
    : arch === 'corporate' || arch === 'government'
    ? '#ff2a85'
    : '#ffd166';

  const facadeTex = useFacadeTexture(
    '#141c38',
    arch === 'factory' ? '#00f5d4' : '#00e5ff',
    '#ffb800',
    5,
    12,
    seedOffset,
    isAffected
  );

  const signTex = useVoxelSignTexture(
    '#121936',
    isAffected ? '#ff2a55' : secondaryNeon,
    Math.floor(seedOffset)
  );

  const statusColor = isIsolated
    ? '#64748b'
    : isAffected
    ? '#ff1e42'
    : isCompromised
    ? '#ff5500'
    : discoveredUnmitigatedVulns.length > 0
    ? '#ffb800'
    : '#00f0ff';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      const pulse = isCompromised
        ? 0.7 + Math.sin(t * 8) * 0.35
        : 0.85 + Math.sin(t * 2.2 + seedOffset) * 0.15;
      beaconRef.current.scale.setScalar(pulse);
    }
    if (shieldRingRef.current) {
      shieldRingRef.current.rotation.y = t * 0.6;
    }
  });

  // Render specialized voxel silhouette per archetype family
  const renderArchetypeGeometry = () => {
    // STYLE 1: Cylindrical / Octagonal Ringed Mega-Tower (Telecom Spine - Top Left in reference)
    if (arch === 'telecom') {
      const r = Math.max(width, depth) * 0.56;
      return (
        <group>
          {/* Main Dark Indigo Octagonal Core */}
          <mesh position={[0, height * 0.5 + 0.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r * 0.88, r * 0.96, height, 8]} />
            <meshStandardMaterial color="#162044" roughness={0.5} metalness={0.3} />
          </mesh>

          {/* 4 Vertical Glowing Cyan/Blue Spine Columns */}
          {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((ang, i) => (
            <GlowBox
              key={i}
              position={[
                Math.cos(ang) * (r * 0.86),
                height * 0.44 + 0.2,
                Math.sin(ang) * (r * 0.86),
              ]}
              args={[0.24, height * 0.78, 0.24]}
              color={isCompromised ? '#ff2a55' : '#00d8ff'}
              intensity={2.0}
              bloomHalo={bloomEnabled}
            />
          ))}

          {/* Stepped Observation Deck Rings with Warm Gold & Cyan Bands */}
          {[0.62, 0.74, 0.86, 0.95].map((frac, idx) => (
            <group key={idx} position={[0, height * frac + 0.2, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[r * 1.12, r * 1.12, 0.42, 12]} />
                <meshStandardMaterial color="#3b4d7a" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.24, 0]}>
                <cylinderGeometry args={[r * 1.05, r * 1.05, 0.18, 12]} />
                <meshStandardMaterial
                  color={idx % 2 === 0 ? primaryNeon : secondaryNeon}
                  emissive={idx % 2 === 0 ? primaryNeon : secondaryNeon}
                  emissiveIntensity={2.2}
                />
              </mesh>
            </group>
          ))}

          {/* Hanging Pink/Gold Holo-Billboard on Upper Gantry Arm */}
          <group position={[r * 1.45, height * 0.78, 0]}>
            <mesh position={[-r * 0.4, 0.55, 0]}>
              <boxGeometry args={[r * 0.9, 0.1, 0.1]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.14, 1.85, 1.15]} />
              <meshStandardMaterial
                color="#ff7eb6"
                map={signTex}
                emissive="#ff4d94"
                emissiveIntensity={1.6}
              />
            </mesh>
          </group>
        </group>
      );
    }

    // STYLE 2: Stacked Ribbed Floor-Slab Towers (Smart Factory & Power Substation - Mid Left in reference)
    if (arch === 'factory' || arch === 'power') {
      const tiers = 6;
      const tierH = (height * 0.76) / tiers;
      const ribColor = isCompromised
        ? '#ff2a55'
        : arch === 'factory'
        ? '#00f5d4'
        : '#ffb800';
      const slabColor = arch === 'factory' ? '#25334a' : '#4a2c3a';

      return (
        <group>
          {/* Dark Ground Base with Twin Vertical Cyan/Amber Portal Slits */}
          <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 1.04, 1.6, depth * 1.04]} />
            <meshStandardMaterial color="#182238" roughness={0.7} />
          </mesh>
          {[-0.35, 0.35].map((ox, i) => (
            <GlowBox
              key={i}
              position={[ox, 0.95, depth * 0.53]}
              args={[0.22, 0.95, 0.08]}
              color={ribColor}
              intensity={2.1}
              bloomHalo={bloomEnabled}
            />
          ))}

          {/* Stacked Ribbed Voxel Tiers with Glowing Horizontal Light Bands */}
          {Array.from({ length: tiers }).map((_, idx) => {
            const y = 1.85 + idx * tierH;
            return (
              <group key={idx} position={[0, y, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[width * 0.95, tierH * 0.56, depth * 0.95]} />
                  <meshStandardMaterial color={slabColor} roughness={0.5} />
                </mesh>
                <GlowBox
                  position={[0, -tierH * 0.28, 0]}
                  args={[width * 0.88, tierH * 0.28, depth * 0.88]}
                  color={ribColor}
                  intensity={2.1}
                  bloomHalo={bloomEnabled}
                />
                {/* Red/Amber Side Module Indicator */}
                <GlowBox
                  position={[width * 0.48, 0, depth * 0.2]}
                  args={[0.12, 0.16, 0.26]}
                  color="#ff2a55"
                  intensity={1.9}
                  bloomHalo={false}
                />
              </group>
            );
          })}

          {/* Upper Mechanical Cube / Twin Striped Rooftop Masts */}
          <group position={[0, height * 0.76 + 1.4, 0]}>
            <mesh castShadow>
              <boxGeometry args={[width * 0.82, 1.35, depth * 0.82]} />
              <meshStandardMaterial
                color={arch === 'factory' ? '#94a3b8' : '#3b2439'}
                roughness={0.5}
              />
            </mesh>
            {/* Twin Red/White Rooftop Antennas */}
            {[-0.45, 0.45].map((ox, i) => (
              <group key={i} position={[ox, 1.0, 0]}>
                <mesh>
                  <boxGeometry args={[0.16, 0.9, 0.16]} />
                  <meshStandardMaterial color="#e2e8f0" />
                </mesh>
                <GlowBox
                  position={[0, 0.55, 0]}
                  args={[0.2, 0.35, 0.2]}
                  color="#ff2a55"
                  intensity={2.4}
                  bloomHalo={bloomEnabled}
                />
              </group>
            ))}
          </group>
        </group>
      );
    }

    // STYLE 3: Corner Neon Portal & Stepped Sign Tower (Residential & Transport - Front Left in reference)
    if (arch === 'residential' || arch === 'transport') {
      const baseH = height * 0.42;
      const upperH = height * 0.48;
      return (
        <group>
          {/* Wide Stepped Podium Base */}
          <mesh position={[0, baseH / 2 + 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 1.12, baseH, depth * 1.12]} />
            <meshStandardMaterial color="#1c2545" roughness={0.6} />
          </mesh>

          {/* Tall Glowing Cyan Corner Pillars Framing Podium */}
          {[
            [-width * 0.48, depth * 0.56],
            [width * 0.48, depth * 0.56],
            [width * 0.56, -depth * 0.38],
          ].map(([px, pz], idx) => (
            <GlowBox
              key={idx}
              position={[px, baseH * 0.48 + 0.24, pz]}
              args={[0.32, baseH * 0.82, 0.22]}
              color={isAffected ? '#ff2a55' : '#00f0ff'}
              intensity={2.2}
              bloomHalo={bloomEnabled}
            />
          ))}

          {/* Warm Amber Vertical Grille Bars Between Cyan Pillars */}
          {[-0.45, -0.15, 0.15, 0.45].map((ox, idx) => (
            <GlowBox
              key={idx}
              position={[ox, baseH * 0.42 + 0.24, depth * 0.57]}
              args={[0.1, baseH * 0.62, 0.08]}
              color="#ffb800"
              intensity={1.9}
              bloomHalo={false}
            />
          ))}

          {/* Glowing Yellow Pixel-Art Sign Above Podium ("5.754") */}
          <GlowBox
            position={[0, baseH + 0.55, depth * 0.42]}
            args={[width * 0.78, 0.58, 0.18]}
            color={isAffected ? '#ff2a55' : '#ffd000'}
            intensity={2.2}
            bloomHalo={bloomEnabled}
          />

          {/* Upper Stepped Cyan-Framed Voxel Tower */}
          <mesh
            position={[0, baseH + upperH / 2 + 0.3, -0.15]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.68, upperH, depth * 0.68]} />
            <meshStandardMaterial
              color="#232d54"
              map={facadeTex}
              emissive={primaryNeon}
              emissiveMap={facadeTex}
              emissiveIntensity={0.95}
            />
          </mesh>

          {/* Horizontal Cyan Bracket Ribs on Upper Tower */}
          {[0.25, 0.55, 0.82].map((f, i) => (
            <GlowBox
              key={i}
              position={[0, baseH + upperH * f + 0.3, -0.15]}
              args={[width * 0.74, 0.14, depth * 0.74]}
              color={primaryNeon}
              intensity={2.0}
              bloomHalo={bloomEnabled}
            />
          ))}
        </group>
      );
    }

    // STYLE 4: Orange/Gold Neon-Framed Mega-Skyscraper with Twin Crown Horns (Financial & Data Center - Right Side in reference)
    if (arch === 'financial' || arch === 'datacenter') {
      const h1 = height * 0.32;
      const h2 = height * 0.38;
      const h3 = height * 0.26;
      const frameColor = isCompromised ? '#ff1e42' : '#ff9900';

      return (
        <group>
          {/* Lower Storefront Block with Bright Cyan "1551" Portal */}
          <mesh position={[0, h1 / 2 + 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, h1, depth]} />
            <meshStandardMaterial color="#192140" roughness={0.55} />
          </mesh>
          <GlowBox
            position={[-0.1, h1 * 0.45 + 0.2, -depth * 0.51]}
            args={[width * 0.68, h1 * 0.65, 0.12]}
            color={isCompromised ? '#ff2a55' : '#00f0ff'}
            intensity={2.1}
            bloomHalo={bloomEnabled}
          />

          {/* Mid Skyscraper Section Framed in Glowing Orange/Gold Neon Rails */}
          <mesh
            position={[0, h1 + h2 / 2 + 0.28, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width * 0.88, h2, depth * 0.88]} />
            <meshStandardMaterial
              color="#141c38"
              map={facadeTex}
              emissive="#38bdf8"
              emissiveMap={facadeTex}
              emissiveIntensity={1.1}
            />
          </mesh>

          {/* Glowing Orange Horizontal & Vertical Frame Bars */}
          {[h1 + 0.3, h1 + h2 * 0.5 + 0.3, h1 + h2 + 0.3].map((hy, i) => (
            <GlowBox
              key={`hbar-${i}`}
              position={[0, hy, 0]}
              args={[width * 0.94, 0.16, depth * 0.94]}
              color={frameColor}
              intensity={2.2}
              bloomHalo={bloomEnabled}
            />
          ))}
          {[
            [-width * 0.44, -depth * 0.44],
            [width * 0.44, -depth * 0.44],
            [-width * 0.44, depth * 0.44],
            [width * 0.44, depth * 0.44],
          ].map(([vx, vz], i) => (
            <GlowBox
              key={`vbar-${i}`}
              position={[vx, h1 + h2 * 0.5 + 0.28, vz]}
              args={[0.14, h2 + h3, 0.14]}
              color={frameColor}
              intensity={2.0}
              bloomHalo={false}
            />
          ))}

          {/* Upper Red Holo-Screen & Crown Section */}
          <mesh position={[0, h1 + h2 + h3 / 2 + 0.32, 0]} castShadow>
            <boxGeometry args={[width * 0.76, h3, depth * 0.76]} />
            <meshStandardMaterial color="#1f294d" roughness={0.45} />
          </mesh>
          <GlowBox
            position={[0, h1 + h2 + h3 * 0.5 + 0.32, -depth * 0.39]}
            args={[width * 0.48, h3 * 0.55, 0.1]}
            color="#ff2a55"
            intensity={2.2}
            bloomHalo={bloomEnabled}
          />

          {/* Twin Golden Rooftop Horns + Sign ("17Hr" on top right of reference) */}
          <group position={[0, h1 + h2 + h3 + 0.95, 0]}>
            <mesh>
              <boxGeometry args={[width * 0.62, 0.75, 0.24]} />
              <meshStandardMaterial
                color="#ffffff"
                map={signTex}
                emissive="#ffe599"
                emissiveIntensity={1.5}
              />
            </mesh>
            {[-width * 0.26, width * 0.26].map((hx, i) => (
              <GlowBox
                key={i}
                position={[hx, 0.55, 0]}
                args={[0.18, 1.35, 0.18]}
                color={frameColor}
                intensity={2.3}
                bloomHalo={bloomEnabled}
              />
            ))}
          </group>
        </group>
      );
    }

    // STYLE 5: Deep Navy Mid-Rise with Recessed Blue Windows, Red Vertical Sign & White Penthouse (Corporate, Government, Hospital)
    const mainH = height * 0.72;
    const pentH = height * 0.28;
    return (
      <group>
        {/* Main Dark Navy Voxel Block with Bright Blue Recessed Windows */}
        <mesh position={[0, mainH / 2 + 0.24, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, mainH, depth]} />
          <meshStandardMaterial
            color="#10172e"
            map={facadeTex}
            emissive="#00d8ff"
            emissiveMap={facadeTex}
            emissiveIntensity={1.15}
            roughness={0.45}
          />
        </mesh>

        {/* Warm Gold Ground-Floor Storefront ("HLNOY" in reference) */}
        <GlowBox
          position={[0, 0.65, -depth * 0.51]}
          args={[width * 0.76, 0.62, 0.12]}
          color={isCompromised ? '#ff2a55' : '#ffcc33'}
          intensity={2.1}
          bloomHalo={bloomEnabled}
        />

        {/* Vertical Crimson/Pink Neon Strip Sign ("1.7.7.") */}
        <GlowBox
          position={[width * 0.36, mainH * 0.42, -depth * 0.52]}
          args={[0.26, 1.45, 0.1]}
          color="#ff2a55"
          intensity={2.3}
          bloomHalo={bloomEnabled}
        />

        {/* Projecting Cyan/White Horizontal Billboard */}
        <group position={[-width * 0.56, mainH * 0.62, 0]}>
          <mesh>
            <boxGeometry args={[0.14, 1.05, 1.45]} />
            <meshStandardMaterial
              color="#e0f2fe"
              map={signTex}
              emissive="#38bdf8"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>

        {/* White/Slate Stepped Penthouse Crown with Yellow/Cyan Highlights */}
        <mesh
          position={[0, mainH + pentH / 2 + 0.26, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width * 0.78, pentH, depth * 0.78]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} />
        </mesh>
        <GlowBox
          position={[-width * 0.4, mainH + pentH * 0.5 + 0.26, 0]}
          args={[0.12, pentH * 0.65, depth * 0.52]}
          color="#ffd000"
          intensity={2.1}
          bloomHalo={bloomEnabled}
        />
      </group>
    );
  };

  return (
    <group
      position={building.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(building.id, false);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(building.id, true);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(building.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
    >
      {/* Sidewalk Block Pad */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[width + 0.65, 0.24, depth + 0.65]} />
        <meshStandardMaterial color="#17203a" roughness={0.8} />
      </mesh>

      {/* Bespoke Voxel Building Architecture */}
      {renderArchetypeGeometry()}

      {/* Rooftop Status Beacon */}
      <group position={[0, height + 0.55, 0]}>
        <mesh
          ref={beaconRef}
          position={[0, antennaHeight * 0.35, 0]}
        >
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={2.4}
          />
        </mesh>
      </group>

      {/* Selection / Hover Ground Ring */}
      {(isSelected || isHovered) && (
        <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.68,
              Math.max(width, depth) * 0.8,
              32,
            ]}
          />
          <meshBasicMaterial
            color={isSelected ? '#00f0ff' : '#ffffff'}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Threat Overlay: Compromised / Affected Warning Ring */}
      {overlays.threats && isCompromised && (
        <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.72,
              Math.max(width, depth) * 0.88,
              24,
            ]}
          />
          <meshBasicMaterial
            color={isAffected ? '#ff1e42' : '#ff6b00'}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Security Control Overlay: Defensive Perimeter Ring */}
      {overlays.controls && hasFirewallOrSeg && (
        <mesh
          ref={shieldRingRef}
          position={[0, 0.38, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.64,
              Math.max(width, depth) * 0.72,
              6,
            ]}
          />
          <meshBasicMaterial
            color="#22d3ee"
            side={THREE.DoubleSide}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* Monitoring Sensor Beacon */}
      {overlays.controls && hasMonitoring && (
        <mesh position={[-width * 0.22, height + 0.75, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={2.0}
          />
        </mesh>
      )}

      {/* Quarantine / Isolation Wireframe Cage */}
      {isIsolated && (
        <mesh position={[0, height / 2 + 0.3, 0]}>
          <boxGeometry args={[width + 0.5, height + 0.8, depth + 0.5]} />
          <meshBasicMaterial
            color="#38bdf8"
            wireframe
            transparent
            opacity={0.42}
          />
        </mesh>
      )}

      {/* Compact Floating HUD Badge over Building */}
      {(isSelected ||
        isHovered ||
        (overlays.threats && isCompromised) ||
        (overlays.vulnerabilities && discoveredUnmitigatedVulns.length > 0)) && (
        <Html
          position={[0, height + antennaHeight * 0.4 + 0.85, 0]}
          center
          zIndexRange={[10, 0]}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(building.id, false);
            }}
            className={`city-node-label ${isSelected ? 'selected' : ''} ${
              isAffected
                ? 'state-affected'
                : isCompromised
                ? 'state-compromised'
                : isIsolated
                ? 'state-isolated'
                : discoveredUnmitigatedVulns.length > 0
                ? 'state-vulnerable'
                : 'state-healthy'
            }`}
          >
            <span className="node-code">{building.id.replace('BLD-', '')}</span>
            {isAffected && <span className="node-tag danger">AFFECTED</span>}
            {!isAffected && isCompromised && (
              <span className="node-tag warning">{building.compromiseState}</span>
            )}
            {isIsolated && <span className="node-tag muted">ISOLATED</span>}
            {overlays.vulnerabilities && discoveredUnmitigatedVulns.length > 0 && (
              <span className="node-tag vuln">
                {discoveredUnmitigatedVulns.length} VULN
              </span>
            )}
            {overlays.controls && building.installedControls.length > 0 && (
              <span className="node-tag shield">
                +{building.installedControls.length} CTRL
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Sleek Ground-Level Fiber Conduits & Packet Pulses
 */
function NetworkTopologyLayer({
  buildings,
  connections,
  activeHighlight,
  selectedBuildingId,
  enableParticles,
}) {
  const pulseRefs = useRef([]);

  const edgeData = useMemo(() => {
    const map = new Map(buildings.map((b) => [b.id, b]));
    return connections
      .map((conn) => {
        const src = map.get(conn.source);
        const dst = map.get(conn.target);
        if (!src || !dst) return null;

        const start = new THREE.Vector3(src.position[0], 0.35, src.position[2]);
        const end = new THREE.Vector3(dst.position[0], 0.35, dst.position[2]);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        mid.y = 0.75;

        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const points = curve.getPoints(16);

        const isHighlighted =
          activeHighlight &&
          ((activeHighlight.sourceId === conn.source &&
            activeHighlight.targetId === conn.target) ||
            (activeHighlight.sourceId === conn.target &&
              activeHighlight.targetId === conn.source));

        const isConnectedToSelected =
          selectedBuildingId === conn.source || selectedBuildingId === conn.target;

        let color = '#00f0ff';
        if (conn.trafficState === 'BLOCKED') color = '#ff2a55';
        else if (conn.trafficState === 'ISOLATED') color = '#475569';
        else if (conn.trafficState === 'SUSPICIOUS') color = '#ffb800';
        else if (conn.trafficState === 'HIGH') color = '#38bdf8';

        if (isHighlighted) {
          color = activeHighlight.outcome === 'BLOCKED' ? '#ff2a55' : '#ff6b00';
        }

        return {
          conn,
          curve,
          points,
          mid,
          color,
          isHighlighted,
          isConnectedToSelected,
        };
      })
      .filter(Boolean);
  }, [buildings, connections, activeHighlight, selectedBuildingId]);

  useFrame(({ clock }) => {
    if (!enableParticles) return;
    const t = clock.getElapsedTime();
    edgeData.forEach((item, idx) => {
      const mesh = pulseRefs.current[idx];
      if (!mesh) return;
      if (item.conn.trafficState === 'ISOLATED') {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const speed =
        item.conn.trafficState === 'HIGH' || item.conn.trafficState === 'SUSPICIOUS'
          ? 0.55
          : 0.28;
      let progress = (t * speed + idx * 0.17) % 1;
      if (item.conn.trafficState === 'BLOCKED') {
        progress = Math.min(0.48, (t * 0.45 + idx * 0.13) % 0.65);
      }
      const pos = item.curve.getPoint(progress);
      mesh.position.copy(pos);
    });
  });

  return (
    <group>
      {edgeData.map((item, idx) => (
        <group key={item.conn.id}>
          <Line
            points={item.points}
            color={item.color}
            lineWidth={
              item.isHighlighted
                ? 2.8
                : item.isConnectedToSelected
                ? 1.9
                : 1.0
            }
            transparent
            opacity={
              item.conn.trafficState === 'ISOLATED'
                ? 0.2
                : item.isHighlighted || item.isConnectedToSelected
                ? 0.85
                : 0.35
            }
          />

          {item.conn.trafficState === 'BLOCKED' && (
            <mesh position={[item.mid.x, item.mid.y, item.mid.z]}>
              <octahedronGeometry args={[0.24, 0]} />
              <meshStandardMaterial
                color="#ff2a55"
                emissive="#ff2a55"
                emissiveIntensity={2.2}
              />
            </mesh>
          )}

          {enableParticles && (
            <mesh
              ref={(el) => {
                pulseRefs.current[idx] = el;
              }}
            >
              <sphereGeometry args={[item.isHighlighted ? 0.18 : 0.11, 8, 8]} />
              <meshBasicMaterial color={item.color} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Collision-Free Flying Cars & Ground Street Traffic
 * Flying cars travel strictly along the open Central Avenue Canyon (`x = -1.2` and `x = -0.3`)
 * AND enforce real-time 3D bounding-box repulsion against every building so they NEVER hit any building!
 */
function AmbientCyberTraffic({ enabled, buildings }) {
  const flyersRef = useRef([]);
  const groundCarsRef = useRef([]);

  // Dedicated sky-lanes in the open central canyon between left & right building blocks
  const flyers = useMemo(
    () => [
      {
        // Red Voxel Spinner (Upper Central Canyon - matches reference top flying car)
        laneX: -0.95,
        height: 7.5,
        rangeZ: 6.5,
        speed: 1.4,
        phase: 5.2,
        bodyColor: '#ff2a55',
        cabinColor: '#fda4af',
        streakColor1: '#00f0ff',
        streakColor2: '#ff2a55',
      },
      {
        // Yellow Voxel Spinner (Mid Central Canyon - matches reference lower flying car)
        laneX: -1.25,
        height: 5.9,
        rangeZ: 6.5,
        speed: 1.25,
        phase: 4.8,
        bodyColor: '#ffb800',
        cabinColor: '#fef08a',
        streakColor1: '#ffffff',
        streakColor2: '#ffb800',
      },
      {
        // High-altitude Outer Perimeter Police Spinner
        laneX: -0.45,
        height: 9.1,
        rangeZ: 7.5,
        speed: -1.35,
        phase: 2.0,
        bodyColor: '#00d8ff',
        cabinColor: '#e0f2fe',
        streakColor1: '#00f0ff',
        streakColor2: '#ff2a85',
      },
    ],
    []
  );

  // Ground vehicles on the central avenue (x = -0.85)
  const groundCars = useMemo(
    () => [
      { laneX: -1.25, rangeZ: 9.5, speed: 2.1, phase: 1.0, color: '#ffb800', isTaxi: true },
      { laneX: -0.35, rangeZ: 9.5, speed: -1.8, phase: 3.5, color: '#34d399', isTaxi: false },
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!enabled) return;
    const t = clock.getElapsedTime();

    flyers.forEach((f, idx) => {
      const group = flyersRef.current[idx];
      if (!group) return;

      const cycle = ((t * Math.abs(f.speed) + f.phase) % (f.rangeZ * 2)) - f.rangeZ;
      const dir = f.speed >= 0 ? 1 : -1;
      let x = f.laneX;
      let y = f.height + Math.sin(t * 2.2 + idx) * 0.16;
      const z = cycle * dir;

      // Explicit 3D Building Collision Avoidance Guarantee:
      // Check every building's 3D bounding box + 1.45-unit safety margin
      if (buildings && buildings.length > 0) {
        for (const b of buildings) {
          const bx = b.position[0];
          const bz = b.position[2];
          const halfW = (b.dimensions?.width || 2.5) * 0.5 + 1.45;
          const halfD = (b.dimensions?.depth || 2.5) * 0.5 + 1.45;
          const topY = (b.dimensions?.height || 8) + 2.2;

          if (
            Math.abs(x - bx) < halfW &&
            Math.abs(z - bz) < halfD &&
            y < topY
          ) {
            // Smoothly steer into the clear central canyon or climb above rooftop
            if (Math.abs(-0.85 - bx) >= halfW) {
              x = -0.85;
            } else {
              y = topY + 0.8;
            }
          }
        }
      }

      group.position.set(x, y, z);
      group.rotation.y = dir > 0 ? 0 : Math.PI;
    });

    groundCars.forEach((c, idx) => {
      const group = groundCarsRef.current[idx];
      if (!group) return;
      const cycle = ((t * Math.abs(c.speed) + c.phase) % (c.rangeZ * 2)) - c.rangeZ;
      const dir = c.speed >= 0 ? 1 : -1;
      group.position.set(c.laneX, 0.24, cycle * dir);
      group.rotation.y = dir > 0 ? 0 : Math.PI;
    });
  });

  if (!enabled) return null;

  return (
    <group>
      {/* Flying Voxel Spinners with Horizontal Motion-Blur Light Streaks */}
      {flyers.map((f, idx) => (
        <group
          key={`flyer-${idx}`}
          ref={(el) => {
            flyersRef.current[idx] = el;
          }}
        >
          {/* Main Chunky Voxel Car Chassis */}
          <mesh castShadow>
            <boxGeometry args={[0.58, 0.34, 0.92]} />
            <meshStandardMaterial
              color={f.bodyColor}
              emissive={f.bodyColor}
              emissiveIntensity={0.85}
              roughness={0.3}
            />
          </mesh>
          {/* Glowing Voxel Cabin / Windshield */}
          <mesh position={[0, 0.2, 0.08]}>
            <boxGeometry args={[0.46, 0.2, 0.48]} />
            <meshStandardMaterial
              color={f.cabinColor}
              emissive={f.cabinColor}
              emissiveIntensity={1.4}
            />
          </mesh>
          {/* Soft Radial Glow Aura Around Flying Car */}
          <sprite scale={[2.2, 1.5, 1]}>
            <spriteMaterial
              map={getRadialGlowTexture()}
              color={f.bodyColor}
              transparent
              opacity={0.42}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
          {/* Twin Horizontal Light-Trail Streaks Behind Spinner (just like reference image!) */}
          <mesh position={[-0.18, 0.05, -0.95]}>
            <boxGeometry args={[0.1, 0.09, 1.15]} />
            <meshBasicMaterial
              color={f.streakColor1}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0.18, -0.04, -0.85]}>
            <boxGeometry args={[0.12, 0.09, 0.95]} />
            <meshBasicMaterial
              color={f.streakColor2}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Ground Voxel Street Cars with Headlights & Exhaust Puffs */}
      {groundCars.map((c, idx) => (
        <group
          key={`car-${idx}`}
          ref={(el) => {
            groundCarsRef.current[idx] = el;
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.46, 0.24, 0.78]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={1.1}
            />
          </mesh>
          {/* Glowing Headlight & Roof Streaks */}
          <GlowBox
            position={[0, 0.16, 0.05]}
            args={[0.28, 0.1, 0.45]}
            color="#ffffff"
            intensity={2.0}
            bloomHalo={true}
          />
          {/* Tiny White Voxel Exhaust Puffs */}
          {!c.isTaxi && (
            <group position={[0, 0.05, -0.55]}>
              <mesh position={[0.08, 0.04, 0]}>
                <boxGeometry args={[0.14, 0.14, 0.14]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[-0.06, 0.08, -0.16]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color="#e2e8f0" />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Miniature Diorama Platform, Wet-Look Asphalt Streets, Crosswalks, Streetlamps,
 * Traffic Signals, Catenary Cables & Voxel Pedestrians
 */
function DioramaBasePlatform({ citySize }) {
  const halfSize = citySize === 'large' ? 24 : citySize === 'medium' ? 18 : 11.2;

  // Voxel Pedestrians on the sidewalks (matching the tiny blocky people in the reference image)
  const pedestrians = useMemo(
    () => [
      { pos: [-2.4, 0.24, 5.2], shirt: '#00f0ff', pants: '#1e293b' },
      { pos: [-2.1, 0.24, 5.6], shirt: '#f97316', pants: '#334155' },
      { pos: [1.3, 0.24, 3.4], shirt: '#ff2a55', pants: '#1e293b' },
      { pos: [1.6, 0.24, 3.0], shirt: '#eab308', pants: '#1e293b' },
      { pos: [-2.3, 0.24, 1.4], shirt: '#38bdf8', pants: '#0f172a' },
      { pos: [1.1, 0.24, -1.8], shirt: '#a855f7', pants: '#1e293b' },
      { pos: [-6.4, 0.24, 5.8], shirt: '#ffffff', pants: '#334155' },
    ],
    []
  );

  // Hanging Catenary Cables between upper towers
  const cables = useMemo(() => {
    const c1 = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-3.2, 4.8, -1.2),
      new THREE.Vector3(-0.8, 3.4, -1.2),
      new THREE.Vector3(1.8, 4.6, -1.2)
    ).getPoints(14);
    const c2 = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-3.2, 4.2, -1.5),
      new THREE.Vector3(-0.8, 2.9, -1.5),
      new THREE.Vector3(1.8, 4.0, -1.5)
    ).getPoints(14);
    return [c1, c2];
  }, []);

  return (
    <group>
      {/* Thick Dark Beveled Diorama Pedestal Base */}
      <mesh position={[0, -0.48, 0]} receiveShadow>
        <boxGeometry args={[halfSize * 2, 0.96, halfSize * 2]} />
        <meshStandardMaterial color="#141a33" roughness={0.75} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.98, 0]}>
        <boxGeometry args={[halfSize * 2 + 0.3, 0.16, halfSize * 2 + 0.3]} />
        <meshStandardMaterial color="#0c1024" roughness={0.9} />
      </mesh>

      {/* Main North-South Central Cyberpunk Avenue (Wet-Look Dark Asphalt at x = -0.8) */}
      <group position={[-0.8, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.65, halfSize * 1.94]} />
          <meshStandardMaterial
            color="#0b0f22"
            roughness={0.25}
            metalness={0.55}
          />
        </mesh>
        {/* Double Glowing Amber Centerline */}
        {[-0.08, 0.08].map((ox, i) => (
          <mesh
            key={i}
            position={[ox, 0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.05, halfSize * 1.88]} />
            <meshBasicMaterial color="#ffb800" transparent opacity={0.85} />
          </mesh>
        ))}

        {/* White Crosswalk Stripes across the Avenue */}
        {[-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map((cx, i) => (
          <mesh
            key={`cw-${i}`}
            position={[cx, 0.015, 2.2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.14, 0.75]} />
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>

      {/* Cross-Alley Street */}
      <group position={[-0.8, 0.015, -3.4]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[halfSize * 1.85, 1.55]} />
          <meshStandardMaterial color="#0b0f22" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>

      {/* Arched Cyberpunk Streetlamps with Bright Light Pools on the Pavement */}
      {[
        [-2.25, 4.2, 1],
        [0.65, 3.2, -1],
        [-2.25, 0.6, 1],
        [0.65, -0.8, -1],
      ].map(([lx, lz, dir], i) => (
        <group key={`lamp-${i}`} position={[lx, 0, lz]}>
          {/* Pole */}
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.08, 1.7, 0.08]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {/* Overhanging Lamp Arm */}
          <GlowBox
            position={[dir * 0.24, 1.68, 0]}
            args={[0.48, 0.1, 0.16]}
            color="#e0f2fe"
            intensity={2.5}
            bloomHalo={true}
          />
          {/* Traffic Signal Lights on First Intersection Pole */}
          {i === 0 && (
            <group position={[0, 1.15, 0.09]}>
              <GlowBox
                position={[0, 0.12, 0]}
                args={[0.1, 0.1, 0.06]}
                color="#ff2a55"
                intensity={2.4}
                bloomHalo={false}
              />
              <GlowBox
                position={[0, -0.05, 0]}
                args={[0.1, 0.1, 0.06]}
                color="#10b981"
                intensity={2.4}
                bloomHalo={false}
              />
            </group>
          )}
          {/* Ground Light Pool */}
          <mesh
            position={[dir * 0.25, 0.025, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.95, 16]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Tiny Voxel Pedestrians on Sidewalks */}
      {pedestrians.map((p, idx) => (
        <group key={`ped-${idx}`} position={p.pos}>
          {/* Legs */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.14, 0.16, 0.12]} />
            <meshStandardMaterial color={p.pants} />
          </mesh>
          {/* Torso */}
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.18, 0.2, 0.14]} />
            <meshStandardMaterial color={p.shirt} />
          </mesh>
          {/* Voxel Head */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
            <meshStandardMaterial color="#f1c27d" />
          </mesh>
        </group>
      ))}

      {/* Hanging Catenary Cables */}
      {cables.map((pts, i) => (
        <Line key={`cable-${i}`} points={pts} color="#1e293b" lineWidth={1.5} />
      ))}
    </group>
  );
}

/**
 * 2D Interactive Isometric Topology Fallback when WebGL is disabled/unavailable
 */
function Fallback2DCityMap({
  buildings,
  connections,
  selectedBuildingId,
  onSelectBuilding,
}) {
  const map = new Map(buildings.map((b) => [b.id, b]));
  const scale = 18;
  const cx = 320;
  const cy = 230;

  return (
    <div className="fallback-map-container" data-testid="city-fallback-map">
      <div className="fallback-banner">
        Interactive Tactical Network Map (WebGL 2D Mode Active)
      </div>
      <svg viewBox="0 0 640 460" className="fallback-svg">
        {connections.map((conn) => {
          const src = map.get(conn.source);
          const dst = map.get(conn.target);
          if (!src || !dst) return null;
          const x1 = cx + src.position[0] * scale;
          const y1 = cy + src.position[2] * scale;
          const x2 = cx + dst.position[0] * scale;
          const y2 = cy + dst.position[2] * scale;
          const stroke =
            conn.trafficState === 'BLOCKED'
              ? '#ff2a55'
              : conn.trafficState === 'SUSPICIOUS'
              ? '#ffb800'
              : '#00f0ff';
          return (
            <line
              key={conn.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={conn.permitted ? 2 : 1.5}
              strokeDasharray={conn.permitted ? 'none' : '4 4'}
              opacity={0.75}
            />
          );
        })}

        {buildings.map((b) => {
          const x = cx + b.position[0] * scale;
          const y = cy + b.position[2] * scale;
          const isSelected = b.id === selectedBuildingId;
          const fill =
            b.compromiseState === 'AFFECTED'
              ? '#ff1e42'
              : b.compromiseState !== 'NONE'
              ? '#ff6b00'
              : b.isolated
              ? '#64748b'
              : '#00f0ff';

          return (
            <g
              key={b.id}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectBuilding(b.id, true)}
              style={{ cursor: 'pointer' }}
              data-testid={`map-node-${b.id}`}
            >
              <rect
                x={-22}
                y={-18}
                width={44}
                height={36}
                rx={6}
                fill="#0f172a"
                stroke={isSelected ? '#ffffff' : fill}
                strokeWidth={isSelected ? 3 : 2}
              />
              <circle cx={-12} cy={-6} r={4} fill={fill} />
              <text
                x={4}
                y={-3}
                fill="#e2e8f0"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {b.id.replace('BLD-', '')}
              </text>
              <text
                x={0}
                y={11}
                fill="#94a3b8"
                fontSize="7.5"
                fontFamily="Space Grotesk, sans-serif"
                textAnchor="middle"
              >
                {b.name.slice(0, 12)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CityScene3D() {
  const simState = useGameStore((s) => s.simState);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const hoveredBuildingId = useGameStore((s) => s.hoveredBuildingId);
  const overlays = useGameStore((s) => s.overlays);
  const graphics = useGameStore((s) => s.graphics);
  const cameraFocusTarget = useGameStore((s) => s.cameraFocusTarget);
  const cameraResetCounter = useGameStore((s) => s.cameraResetCounter);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const setHoveredBuilding = useGameStore((s) => s.setHoveredBuilding);

  const [webglSupported] = useState(() => checkWebGLAvailable());

  if (!webglSupported) {
    return (
      <Fallback2DCityMap
        buildings={simState.buildings}
        connections={simState.connections}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={selectBuilding}
      />
    );
  }

  return (
    <div className="city-canvas-wrapper" data-testid="city-3d-viewport">
      <Canvas
        shadows={graphics.shadows}
        camera={{ position: [-3.6, 10.6, 25.5], fov: 35, near: 0.5, far: 140 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
        }}
      >
        <color attach="background" args={['#070b1a']} />
        <fog attach="fog" args={['#070b1a', 28, 65]} />

        <BloomPostProcessing enabled={graphics.bloom} />

        {/* Atmospheric Cyberpunk Night Lighting */}
        <ambientLight intensity={0.55} color="#1e2b58" />
        <hemisphereLight
          skyColor="#2563eb"
          groundColor="#070b1a"
          intensity={0.45}
        />
        <directionalLight
          position={[-14, 26, 18]}
          intensity={1.05}
          color="#93c5fd"
          castShadow={graphics.shadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Warm & Cool Neon Fill Lights inside the Street Canyon */}
        <pointLight position={[-4.5, 7, 4]} intensity={1.3} color="#00f0ff" distance={22} />
        <pointLight position={[4.5, 8, 2]} intensity={1.3} color="#ff8800" distance={22} />
        <pointLight position={[-1, 5, -2]} intensity={1.1} color="#ff2a85" distance={18} />
        <pointLight position={[-1, 2.2, 3]} intensity={1.0} color="#ffb800" distance={14} />

        <CameraController
          focusTarget={cameraFocusTarget}
          resetCounter={cameraResetCounter}
        />

        <DioramaBasePlatform citySize={simState.size} />

        {/* All Handcrafted Voxel Buildings */}
        {simState.buildings.map((building) => (
          <VoxelBuilding
            key={building.id}
            building={building}
            isSelected={building.id === selectedBuildingId}
            isHovered={building.id === hoveredBuildingId}
            overlays={overlays}
            bloomEnabled={graphics.bloom}
            onSelect={selectBuilding}
            onDoubleClick={selectBuilding}
            onHover={setHoveredBuilding}
          />
        ))}

        {/* Network Topology Overlay */}
        {overlays.network && (
          <NetworkTopologyLayer
            buildings={simState.buildings}
            connections={simState.connections}
            activeHighlight={simState.activePropagationHighlight}
            selectedBuildingId={selectedBuildingId}
            enableParticles={graphics.particles}
          />
        )}

        {/* Collision-Free Flying Hover-Vehicles & Ground Street Cars */}
        <AmbientCyberTraffic
          enabled={graphics.flyingTraffic}
          buildings={simState.buildings}
        />
      </Canvas>
    </div>
  );
}
