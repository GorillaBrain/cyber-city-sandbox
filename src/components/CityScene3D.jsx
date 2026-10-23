import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.js';
import { DEFENSIVE_CONTROLS } from '../engine/catalog.js';

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
 * Generates a procedural emissive window grid texture for voxel skyscrapers
 * so hundreds of windows render with zero extra draw calls.
 */
function useWindowGridTexture(primaryColor, secondaryColor, seedOffset = 0, isCompromised = false) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0d132a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 8;
    const rows = 18;
    const padX = 4;
    const padY = 4;
    const cellW = (canvas.width - padX * (cols + 1)) / cols;
    const cellH = (canvas.height - padY * (rows + 1)) / rows;

    let s = Math.floor((seedOffset + 1) * 9973);
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    for (let r = 0; r < rows; r++) {
      const bandRow = r % 6 === 0;
      for (let c = 0; c < cols; c++) {
        const litChance = isCompromised ? 0.65 : 0.72;
        if (rand() < litChance) {
          if (isCompromised && rand() < 0.6) {
            ctx.fillStyle = '#ff2a55';
          } else if (bandRow || rand() < 0.28) {
            ctx.fillStyle = secondaryColor;
          } else {
            ctx.fillStyle = primaryColor;
          }
        } else {
          ctx.fillStyle = '#151f42';
        }
        const x = padX + c * (cellW + padX);
        const y = padY + r * (cellH + padY);
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [primaryColor, secondaryColor, seedOffset, isCompromised]);
}

function CameraController({ focusTarget, resetCounter }) {
  const controlsRef = useRef();
  const { camera } = useThree();
  const desiredTarget = useRef(new THREE.Vector3(0, 2.5, 0));
  const desiredPosition = useRef(new THREE.Vector3(18, 17, 19));
  const isTransitioning = useRef(false);

  useEffect(() => {
    if (focusTarget && focusTarget.position) {
      const [x, , z] = focusTarget.position;
      const h = Math.min(10, (focusTarget.height || 7) * 0.55);
      desiredTarget.current.set(x, h, z);
      desiredPosition.current.set(x + 9.5, h + 7.5, z + 9.5);
      isTransitioning.current = true;
    }
  }, [focusTarget]);

  useEffect(() => {
    if (resetCounter > 0) {
      desiredTarget.current.set(0, 2.5, 0);
      desiredPosition.current.set(18, 17, 19);
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
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 2.5, 0]}
    />
  );
}

/**
 * Individual Procedural Voxel Cyberpunk Building
 */
function VoxelBuilding({
  building,
  isSelected,
  isHovered,
  overlays,
  onSelect,
  onDoubleClick,
  onHover,
}) {
  const beaconRef = useRef();
  const shieldRingRef = useRef();
  const { width, depth, height, antennaHeight, hasBillboard, palette, seedOffset } =
    building.dimensions;

  const isCompromised =
    building.compromiseState !== 'NONE' && !building.isolated;
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

  const windowTex = useWindowGridTexture(
    palette.windowPrimary,
    palette.windowSecondary,
    seedOffset,
    isCompromised
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
        ? 0.65 + Math.sin(t * 7) * 0.35
        : 0.8 + Math.sin(t * 2 + seedOffset) * 0.2;
      beaconRef.current.scale.setScalar(pulse);
    }
    if (shieldRingRef.current) {
      shieldRingRef.current.rotation.y = t * 0.6;
    }
  });

  const lowerH = height * 0.58;
  const midH = height * 0.28;
  const topH = height * 0.14;

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
      {/* Ground Plinth / Sidewalk Pad */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[width + 0.6, 0.24, depth + 0.6]} />
        <meshStandardMaterial color="#151d38" roughness={0.85} />
      </mesh>

      {/* Ground-Floor Glowing Lobby Entrance */}
      <mesh position={[0, 0.45, depth / 2 + 0.02]}>
        <boxGeometry args={[width * 0.48, 0.65, 0.08]} />
        <meshStandardMaterial
          color={isCompromised ? '#ff2a55' : palette.windowPrimary}
          emissive={isCompromised ? '#ff2a55' : palette.windowPrimary}
          emissiveIntensity={1.3}
        />
      </mesh>

      {/* Main Lower Voxel Tower Body */}
      <mesh position={[0, lowerH / 2 + 0.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, lowerH, depth]} />
        <meshStandardMaterial
          color={palette.body}
          map={windowTex}
          emissive={isCompromised ? '#ff1e42' : palette.windowPrimary}
          emissiveMap={windowTex}
          emissiveIntensity={isCompromised ? 1.15 : 0.85}
          roughness={0.4}
          metalness={0.25}
        />
      </mesh>

      {/* Glowing Neon Wrap Band 1 (inspired by reference image horizontal neon ledges) */}
      <mesh position={[0, lowerH + 0.26, 0]}>
        <boxGeometry args={[width + 0.16, 0.18, depth + 0.16]} />
        <meshStandardMaterial
          color={isCompromised ? '#ff2a55' : palette.signColor}
          emissive={isCompromised ? '#ff2a55' : palette.signColor}
          emissiveIntensity={1.6}
        />
      </mesh>

      {/* Mid Tier Voxel Body */}
      <mesh
        position={[0, lowerH + midH / 2 + 0.34, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.82, midH, depth * 0.82]} />
        <meshStandardMaterial
          color={palette.trim}
          map={windowTex}
          emissive={isCompromised ? '#ff2a55' : palette.windowSecondary}
          emissiveMap={windowTex}
          emissiveIntensity={0.9}
          roughness={0.4}
        />
      </mesh>

      {/* Glowing Neon Wrap Band 2 */}
      <mesh position={[0, lowerH + midH + 0.36, 0]}>
        <boxGeometry args={[width * 0.88, 0.15, depth * 0.88]} />
        <meshStandardMaterial
          color={isCompromised ? '#ff5500' : palette.windowPrimary}
          emissive={isCompromised ? '#ff5500' : palette.windowPrimary}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Upper Penthouse Voxel Tier */}
      <mesh position={[0, lowerH + midH + topH / 2 + 0.42, 0]} castShadow>
        <boxGeometry args={[width * 0.62, topH, depth * 0.62]} />
        <meshStandardMaterial
          color={palette.body}
          map={windowTex}
          emissive={isCompromised ? '#ff2a55' : palette.windowPrimary}
          emissiveMap={windowTex}
          emissiveIntensity={0.8}
          roughness={0.45}
        />
      </mesh>

      {/* Crown Neon Rim on Penthouse */}
      <mesh position={[0, lowerH + midH + topH + 0.45, 0]}>
        <boxGeometry args={[width * 0.66, 0.12, depth * 0.66]} />
        <meshStandardMaterial
          color={isCompromised ? '#ff1e42' : palette.signColor}
          emissive={isCompromised ? '#ff1e42' : palette.signColor}
          emissiveIntensity={1.6}
        />
      </mesh>

      {/* Blocky Side Balconies / Voxel Ledges */}
      {[-1, 1].map((dir) => (
        <mesh
          key={dir}
          position={[dir * (width / 2 + 0.12), lowerH * 0.55, 0]}
        >
          <boxGeometry args={[0.22, lowerH * 0.5, depth * 0.55]} />
          <meshStandardMaterial
            color={palette.trim}
            emissive={palette.windowSecondary}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}

      {/* Projecting Cyberpunk Neon Billboard Sign */}
      {hasBillboard && (
        <group position={[width / 2 + 0.28, lowerH * 0.72, 0]}>
          {/* Support arm */}
          <mesh position={[-0.15, 0, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.08]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Glowing sign panel */}
          <mesh>
            <boxGeometry args={[0.12, 1.55, 0.95]} />
            <meshStandardMaterial
              color={isCompromised ? '#ff1e42' : palette.signColor}
              emissive={isCompromised ? '#ff1e42' : palette.signColor}
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      )}

      {/* Rooftop HVAC & Antenna Mast */}
      <group position={[0, height + 0.45, 0]}>
        <mesh position={[-width * 0.15, 0.2, -depth * 0.12]}>
          <boxGeometry args={[0.45, 0.4, 0.45]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[width * 0.12, antennaHeight / 2, depth * 0.1]}>
          <boxGeometry args={[0.09, antennaHeight, 0.09]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        {/* Rooftop Status Beacon */}
        <mesh
          ref={beaconRef}
          position={[width * 0.12, antennaHeight + 0.15, depth * 0.1]}
        >
          <boxGeometry args={[0.26, 0.26, 0.26]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={2.2}
          />
        </mesh>
      </group>

      {/* Selection / Hover Ground Ring */}
      {(isSelected || isHovered) && (
        <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.72,
              Math.max(width, depth) * 0.86,
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
        <mesh position={[0, height * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.75,
              Math.max(width, depth) * 0.9,
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
          position={[0, 0.55, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.65,
              Math.max(width, depth) * 0.73,
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
        <mesh position={[-width * 0.18, height + 0.95, -depth * 0.12]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={1.8}
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
            opacity={0.45}
          />
        </mesh>
      )}

      {/* Floating HUD Badge over Building */}
      {(overlays.labels ||
        isSelected ||
        isHovered ||
        (overlays.threats && isCompromised) ||
        (overlays.vulnerabilities && discoveredUnmitigatedVulns.length > 0)) && (
        <Html
          position={[0, height + antennaHeight + 0.85, 0]}
          center
          distanceFactor={22}
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
            <span className="node-status-dot" />
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
 * Animated Network Connections & Traffic Pulses
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

        const start = new THREE.Vector3(
          src.position[0],
          Math.min(2.2, src.dimensions.height * 0.3),
          src.position[2]
        );
        const end = new THREE.Vector3(
          dst.position[0],
          Math.min(2.2, dst.dimensions.height * 0.3),
          dst.position[2]
        );
        const mid = start
          .clone()
          .add(end)
          .multiplyScalar(0.5);
        mid.y += 1.4;

        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const points = curve.getPoints(18);

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
          : 0.3;
      let progress = (t * speed + idx * 0.17) % 1;
      // If traffic is blocked, stop the pulse at the midpoint firewall barrier!
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
                ? 3.2
                : item.isConnectedToSelected
                ? 2.2
                : 1.2
            }
            transparent
            opacity={
              item.conn.trafficState === 'ISOLATED'
                ? 0.25
                : item.isHighlighted || item.isConnectedToSelected
                ? 0.95
                : 0.48
            }
          />

          {/* Blocked Firewall Interception Barrier */}
          {item.conn.trafficState === 'BLOCKED' && (
            <mesh position={[item.mid.x, item.mid.y, item.mid.z]}>
              <octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color="#ff2a55"
                emissive="#ff2a55"
                emissiveIntensity={2}
              />
            </mesh>
          )}

          {/* Moving Packet Pulse */}
          {enableParticles && (
            <mesh
              ref={(el) => {
                pulseRefs.current[idx] = el;
              }}
            >
              <sphereGeometry args={[item.isHighlighted ? 0.22 : 0.13, 8, 8]} />
              <meshBasicMaterial color={item.color} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Ambient Cyberpunk Flying Vehicles & Ground Street Cars (matches reference artwork)
 */
function AmbientCyberTraffic({ enabled }) {
  const flyersRef = useRef([]);
  const groundCarsRef = useRef([]);

  const flyers = useMemo(
    () => [
      { radius: 8.5, height: 6.8, speed: 0.42, phase: 0.2, color: '#ff2a55' },
      { radius: 9.2, height: 5.4, speed: -0.36, phase: 2.1, color: '#ffb800' },
      { radius: 6.4, height: 8.2, speed: 0.5, phase: 4.0, color: '#00f0ff' },
      { radius: 11.0, height: 7.2, speed: -0.3, phase: 1.1, color: '#a855f7' },
    ],
    []
  );

  const groundCars = useMemo(
    () => [
      { axis: 'x', laneZ: -3.3, range: 9.5, speed: 2.4, phase: 0, color: '#ffb800' },
      { axis: 'x', laneZ: 2.1, range: 9.5, speed: -2.1, phase: 3.2, color: '#00f0ff' },
      { axis: 'z', laneX: -3.8, range: 8.5, speed: 2.0, phase: 1.5, color: '#ff2a85' },
      { axis: 'z', laneX: 1.2, range: 8.5, speed: -2.3, phase: 4.4, color: '#38bdf8' },
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!enabled) return;
    const t = clock.getElapsedTime();

    flyers.forEach((f, idx) => {
      const group = flyersRef.current[idx];
      if (!group) return;
      const angle = t * f.speed + f.phase;
      group.position.set(
        Math.cos(angle) * f.radius,
        f.height + Math.sin(t * 1.8 + idx) * 0.25,
        Math.sin(angle) * f.radius
      );
      group.rotation.y = -angle + (f.speed > 0 ? 0 : Math.PI);
    });

    groundCars.forEach((c, idx) => {
      const mesh = groundCarsRef.current[idx];
      if (!mesh) return;
      const pos = ((t * c.speed + c.phase) % (c.range * 2)) - c.range;
      const coord = c.speed > 0 ? pos : -pos;
      if (c.axis === 'x') {
        mesh.position.set(coord, 0.22, c.laneZ);
      } else {
        mesh.position.set(c.laneX, 0.22, coord);
      }
    });
  });

  if (!enabled) return null;

  return (
    <group>
      {flyers.map((f, idx) => (
        <group
          key={`flyer-${idx}`}
          ref={(el) => {
            flyersRef.current[idx] = el;
          }}
        >
          {/* Voxel Hover Vehicle Body */}
          <mesh>
            <boxGeometry args={[0.38, 0.2, 0.68]} />
            <meshStandardMaterial
              color="#1e293b"
              emissive={f.color}
              emissiveIntensity={0.9}
            />
          </mesh>
          {/* Glowing Light Trail */}
          <mesh position={[0, 0, -0.55]}>
            <boxGeometry args={[0.24, 0.08, 0.65]} />
            <meshBasicMaterial color={f.color} transparent opacity={0.75} />
          </mesh>
        </group>
      ))}

      {groundCars.map((c, idx) => (
        <mesh
          key={`car-${idx}`}
          ref={(el) => {
            groundCarsRef.current[idx] = el;
          }}
        >
          <boxGeometry
            args={c.axis === 'x' ? [0.52, 0.2, 0.28] : [0.28, 0.2, 0.52]}
          />
          <meshStandardMaterial
            color={c.color}
            emissive={c.color}
            emissiveIntensity={1.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Miniature Diorama Platform, Streets, Crosswalks & Streetlamps
 */
function DioramaBasePlatform({ citySize }) {
  const halfSize = citySize === 'large' ? 24 : citySize === 'medium' ? 18 : 12.5;

  return (
    <group>
      {/* Thick Dark Diorama Pedestal Base */}
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <boxGeometry args={[halfSize * 2, 1.1, halfSize * 2]} />
        <meshStandardMaterial color="#0b1024" roughness={0.9} metalness={0.15} />
      </mesh>

      {/* Glowing Cyan Neon Rim around Diorama Pedestal */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[halfSize * 2 + 0.12, 0.06, halfSize * 2 + 0.12]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.35} />
      </mesh>

      {/* Main East-West & North-South Asphalt Streets */}
      {[-3.3, 2.1].map((z, idx) => (
        <group key={`road-x-${idx}`} position={[0, 0.02, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[halfSize * 1.92, 1.55]} />
            <meshStandardMaterial color="#070a17" roughness={0.95} />
          </mesh>
          {/* Glowing Amber Center Divider */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[halfSize * 1.85, 0.06]} />
            <meshBasicMaterial color="#ffb800" transparent opacity={0.65} />
          </mesh>
        </group>
      ))}

      {[-3.8, 1.2].map((x, idx) => (
        <group key={`road-z-${idx}`} position={[x, 0.03, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1.55, halfSize * 1.92]} />
            <meshStandardMaterial color="#070a17" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.06, halfSize * 1.85]} />
            <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* Streetlamps at Junctions */}
      {[
        [-4.8, -4.3],
        [-2.8, -4.3],
        [0.2, -4.3],
        [2.2, -4.3],
        [-4.8, 1.1],
        [2.2, 1.1],
        [-4.8, 3.1],
        [2.2, 3.1],
      ].map(([lx, lz], i) => (
        <group key={`lamp-${i}`} position={[lx, 0, lz]}>
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[0.06, 1.3, 0.06]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0.12, 1.28, 0]}>
            <boxGeometry args={[0.28, 0.08, 0.12]} />
            <meshStandardMaterial
              color="#00f0ff"
              emissive="#00f0ff"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
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
        camera={{ position: [18, 17, 19], fov: 42, near: 0.5, far: 140 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#060919']} />
        <fog attach="fog" args={['#060919', 24, 68]} />

        {/* Controlled Cyberpunk Night Lighting */}
        <ambientLight intensity={graphics.bloom ? 0.65 : 0.5} color="#1e295e" />
        <directionalLight
          position={[16, 28, 14]}
          intensity={graphics.bloom ? 1.35 : 1.0}
          color="#a5f3fc"
          castShadow={graphics.shadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-12, 14, -10]} intensity={1.8} color="#ff2a85" distance={38} />
        <pointLight position={[12, 12, 10]} intensity={1.6} color="#00f0ff" distance={38} />
        <pointLight position={[0, 8, 0]} intensity={1.1} color="#ffb800" distance={26} />

        <CameraController
          focusTarget={cameraFocusTarget}
          resetCounter={cameraResetCounter}
        />

        <DioramaBasePlatform citySize={simState.size} />

        {/* All Voxel Buildings */}
        {simState.buildings.map((building) => (
          <VoxelBuilding
            key={building.id}
            building={building}
            isSelected={building.id === selectedBuildingId}
            isHovered={building.id === hoveredBuildingId}
            overlays={overlays}
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

        {/* Ambient Flying Hover Vehicles & Street Cars */}
        <AmbientCyberTraffic enabled={graphics.flyingTraffic} />
      </Canvas>
    </div>
  );
}
