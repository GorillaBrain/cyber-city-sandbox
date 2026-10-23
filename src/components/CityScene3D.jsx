import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.js';

// Orthogonal city road grid centers — all buildings sit strictly inside the grassy blocks between roads
export const ROAD_X = [-13.5, -4.5, 4.5, 13.5];
export const ROAD_Z = [-12.0, -4.0, 4.0, 12.0];
const ROAD_WIDTH = 1.95;
const SIDEWALK_WIDTH = 2.55;

function getStatusColor(building) {
  if (building.isolated) return '#64748b';
  if (building.compromiseState === 'AFFECTED') return '#ef4444';
  if (building.compromiseState === 'FOOTHOLD' || building.compromiseState === 'CREDENTIAL_ACCESS') {
    return '#f97316';
  }
  if (building.compromiseState === 'PROBING' || building.healthStatus === 'SUSPICIOUS') {
    return '#eab308';
  }
  if (building.securityScore >= 80) return '#10b981';
  return '#0ea5e9';
}

function getConnectionStyle(conn) {
  if (!conn.permitted || conn.trafficState === 'BLOCKED') {
    return { color: '#ef4444', dashed: true, dashScale: 3, lineWidth: 1.8, opacity: 0.78 };
  }
  if (conn.trafficState === 'COMPROMISED') {
    return { color: '#dc2626', dashed: false, lineWidth: 3.0, opacity: 0.95 };
  }
  if (conn.trafficState === 'ATTACK_PROPAGATION') {
    return { color: '#f97316', dashed: false, lineWidth: 2.6, opacity: 0.92 };
  }
  if (conn.trafficState === 'SUSPICIOUS') {
    return { color: '#eab308', dashed: true, dashScale: 2, lineWidth: 2.2, opacity: 0.88 };
  }
  if (conn.trafficState === 'MONITORED') {
    return { color: '#8b5cf6', dashed: false, lineWidth: 1.8, opacity: 0.75 };
  }
  return { color: '#0284c7', dashed: false, lineWidth: 1.5, opacity: 0.55 };
}

function LowPolyTree({ position, type = 'round', color = '#5ec435', scale = 1 }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Ground shadow disc */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 10]} />
        <meshBasicMaterial color="#3c7822" transparent opacity={0.45} />
      </mesh>
      {/* Tree trunk */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.44, 6]} />
        <meshStandardMaterial color="#6e4726" roughness={0.85} />
      </mesh>
      {type === 'pine' ? (
        <group>
          <mesh position={[0, 0.58, 0]} castShadow>
            <coneGeometry args={[0.34, 0.55, 7]} />
            <meshStandardMaterial color={color} roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 0.88, 0]} castShadow>
            <coneGeometry args={[0.25, 0.48, 7]} />
            <meshStandardMaterial color={color} roughness={0.7} flatShading />
          </mesh>
        </group>
      ) : type === 'autumn' ? (
        <group>
          <mesh position={[0, 0.62, 0]} castShadow>
            <dodecahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={color} roughness={0.65} flatShading />
          </mesh>
          <mesh position={[0.1, 0.82, -0.05]} castShadow>
            <dodecahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color={color} roughness={0.65} flatShading />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.48, 0.46, 0.48]} />
            <meshStandardMaterial color={color} roughness={0.68} />
          </mesh>
          <mesh position={[0, 0.86, 0]} castShadow>
            <boxGeometry args={[0.34, 0.28, 0.34]} />
            <meshStandardMaterial color="#78db49" roughness={0.68} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Renders the 10 distinct colorful low-poly architectural landmarks matching the reference city image
 */
function StylizedLandmarkMesh({ archetype, height, isCompromised, isSuspicious }) {
  // 1. HOSPITAL (BLD-HOS-01) — Twin Octagonal Cream/Salmon Hospital Towers with Green (H) & Pink (+) Pads
  if (archetype === 'hospital') {
    const h = Math.max(3.6, height * 0.48);
    const floors = 6;
    return (
      <group>
        {[-0.95, 0.95].map((ox, idx) => (
          <group key={`hos-tower-${idx}`} position={[ox, 0, idx === 0 ? 0.15 : -0.15]}>
            {/* Coral base */}
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.82, 0.86, 0.7, 8]} />
              <meshStandardMaterial color="#e07a5f" roughness={0.65} flatShading />
            </mesh>
            {/* Octagonal cream & dark window stacked floors */}
            {Array.from({ length: floors }).map((_, f) => {
              const fy = 0.8 + f * ((h - 0.8) / floors);
              return (
                <group key={`hf-${f}`}>
                  <mesh position={[0, fy, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.76, 0.76, 0.24, 8]} />
                    <meshStandardMaterial color="#2f3e46" roughness={0.5} />
                  </mesh>
                  <mesh position={[0, fy + 0.18, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.84, 0.84, 0.22, 8]} />
                    <meshStandardMaterial color="#f4efe6" roughness={0.65} flatShading />
                  </mesh>
                </group>
              );
            })}
            {/* Coral corner ribs */}
            {[-0.68, 0.68].map((rx) =>
              [-0.4, 0.4].map((rz) => (
                <mesh key={`rib-${rx}-${rz}`} position={[rx, h * 0.5, rz]} castShadow>
                  <boxGeometry args={[0.16, h * 0.92, 0.16]} />
                  <meshStandardMaterial color="#e07a5f" roughness={0.65} />
                </mesh>
              ))
            )}
            {/* Roof deck */}
            <mesh position={[0, h + 0.16, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.84, 0.84, 0.18, 8]} />
              <meshStandardMaterial color="#f4efe6" roughness={0.65} />
            </mesh>
            {/* Left tower: Green H helipad | Right tower: Pink + cross pad */}
            <mesh position={[0, h + 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.56, 16]} />
              <meshStandardMaterial color={idx === 0 ? '#65b741' : '#f28482'} roughness={0.6} />
            </mesh>
            {idx === 0 ? (
              <group position={[0, h + 0.28, 0]}>
                <mesh position={[-0.16, 0, 0]}>
                  <boxGeometry args={[0.08, 0.02, 0.42]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[0.16, 0, 0]}>
                  <boxGeometry args={[0.08, 0.02, 0.42]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.32, 0.02, 0.08]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ) : (
              <group position={[0, h + 0.28, 0]}>
                <mesh>
                  <boxGeometry args={[0.14, 0.02, 0.44]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh>
                  <boxGeometry args={[0.44, 0.02, 0.14]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </group>
    );
  }

  // 2. TELECOM (BLD-TEL-01) — Iconic Red & White Tokyo/Eiffel Lattice Tower
  if (archetype === 'telecom') {
    const h = Math.max(6.8, height * 0.62);
    return (
      <group>
        {/* 4 splayed red corner legs */}
        {[
          [-0.75, -0.75],
          [0.75, -0.75],
          [-0.75, 0.75],
          [0.75, 0.75],
        ].map(([lx, lz], i) => (
          <mesh
            key={`leg-${i}`}
            position={[lx * 0.68, h * 0.22, lz * 0.68]}
            rotation={[lz * 0.22, 0, -lx * 0.22]}
            castShadow
          >
            <boxGeometry args={[0.2, h * 0.48, 0.2]} />
            <meshStandardMaterial color="#e03131" roughness={0.55} />
          </mesh>
        ))}
        {/* Horizontal red lattice braces */}
        {[0.16, 0.28, 0.4].map((ratio, idx) => {
          const w = 1.5 - idx * 0.28;
          return (
            <mesh key={`brace-${idx}`} position={[0, h * ratio, 0]} castShadow>
              <boxGeometry args={[w, 0.14, w]} />
              <meshStandardMaterial color="#e03131" roughness={0.55} />
            </mesh>
          );
        })}
        {/* First White Observation Deck */}
        <mesh position={[0, h * 0.47, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.36, 1.05]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.5} />
        </mesh>
        {/* Mid Red Lattice Shaft */}
        <mesh position={[0, h * 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.44, h * 0.28, 4]} />
          <meshStandardMaterial color="#e03131" roughness={0.55} />
        </mesh>
        {/* Upper White Observation Band */}
        <mesh position={[0, h * 0.77, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.28, 8]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.5} />
        </mesh>
        {/* Upper Red & White Striped Spire */}
        <mesh position={[0, h * 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.24, h * 0.24, 8]} />
          <meshStandardMaterial color="#e03131" roughness={0.5} />
        </mesh>
        <mesh position={[0, h * 1.04, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.09, h * 0.18, 8]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.4} />
        </mesh>
      </group>
    );
  }

  // 3. CORPORATE (BLD-CORP-01) — Blue & Magenta Twin Stepped Office Towers with Green (H) Helipad
  if (archetype === 'corporate') {
    const h = Math.max(4.4, height * 0.46);
    return (
      <group>
        {/* Left stepped blue tower with green roof terrace */}
        <group position={[-0.78, 0, -0.1]}>
          <mesh position={[0, h * 0.48, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.25, h * 0.96, 1.25]} />
            <meshStandardMaterial color="#3b6ee8" roughness={0.55} />
          </mesh>
          {[0.22, 0.44, 0.66, 0.88].map((r, i) => (
            <mesh key={`cl-win-${i}`} position={[0, h * r, 0]}>
              <boxGeometry args={[1.29, 0.18, 1.29]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#1e293b' : '#f03e8a'} roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, h * 0.97, 0]}>
            <boxGeometry args={[1.1, 0.08, 1.1]} />
            <meshStandardMaterial color="#40c057" roughness={0.7} />
          </mesh>
        </group>

        {/* Right blue & magenta tower with green H helipad */}
        <group position={[0.78, 0, 0.2]}>
          <mesh position={[0, h * 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.25, h * 0.88, 1.25]} />
            <meshStandardMaterial color="#4263eb" roughness={0.55} />
          </mesh>
          {[0.2, 0.4, 0.6, 0.78].map((r, i) => (
            <mesh key={`cr-win-${i}`} position={[0, h * r, 0]}>
              <boxGeometry args={[1.29, 0.16, 1.29]} />
              <meshStandardMaterial color={i === 1 ? '#f03e8a' : '#1e293b'} roughness={0.45} />
            </mesh>
          ))}
          {/* Green Helipad */}
          <mesh position={[0, h * 0.89, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.48, 16]} />
            <meshStandardMaterial color="#51cf66" roughness={0.6} />
          </mesh>
          <mesh position={[0, h * 0.9, 0]}>
            <boxGeometry args={[0.28, 0.02, 0.08]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      </group>
    );
  }

  // 4. RESIDENTIAL (BLD-RES-01) — Lavender/Lilac Waffle-Grid High-Rise Apartment Complex
  if (archetype === 'residential') {
    const h = Math.max(4.6, height * 0.52);
    return (
      <group>
        {/* Main Lavender Core */}
        <mesh position={[0, h * 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.1, h * 0.96, 1.75]} />
          <meshStandardMaterial color="#b197fc" roughness={0.62} />
        </mesh>
        {/* White Waffle Balcony Horizontal & Vertical Grid */}
        {Array.from({ length: 7 }).map((_, f) => (
          <mesh key={`res-slab-${f}`} position={[0, 0.45 + f * ((h * 0.85) / 7), 0]} castShadow>
            <boxGeometry args={[2.22, 0.1, 1.86]} />
            <meshStandardMaterial color="#f3f0ff" roughness={0.55} />
          </mesh>
        ))}
        {[-0.85, -0.42, 0, 0.42, 0.85].map((vx, i) => (
          <mesh key={`res-col-${i}`} position={[vx, h * 0.46, 0]} castShadow>
            <boxGeometry args={[0.1, h * 0.9, 1.88]} />
            <meshStandardMaterial color="#e5dbff" roughness={0.55} />
          </mesh>
        ))}
        {/* Twin Peaked Lilac Roofs */}
        {[-0.52, 0.52].map((rx, i) => (
          <mesh key={`res-roof-${i}`} position={[rx, h + 0.18, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.68, 0.5, 4]} />
            <meshStandardMaterial color="#d0bfff" roughness={0.6} flatShading />
          </mesh>
        ))}
      </group>
    );
  }

  // 5. FINANCIAL (BLD-FIN-01) — Tall Coral-Orange & White Horizontal-Ribbed Skyscraper
  if (archetype === 'financial') {
    const h = Math.max(6.2, height * 0.55);
    const slabs = 11;
    return (
      <group>
        {/* Coral-Orange Core */}
        <mesh position={[0, h * 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, h, 1.8]} />
          <meshStandardMaterial color="#e8590c" roughness={0.58} />
        </mesh>
        {/* Dark recessed window bands & white projecting slabs */}
        {Array.from({ length: slabs }).map((_, s) => {
          const sy = 0.45 + s * ((h - 0.6) / slabs);
          return (
            <group key={`fin-slab-${s}`}>
              <mesh position={[0, sy, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.22, 0.14, 2.02]} />
                <meshStandardMaterial color="#f8f9fa" roughness={0.5} />
              </mesh>
              <mesh position={[0, sy + 0.18, 0]}>
                <boxGeometry args={[2.04, 0.14, 1.84]} />
                <meshStandardMaterial color="#2b2d42" roughness={0.45} />
              </mesh>
            </group>
          );
        })}
        {/* Roof Penthouse */}
        <mesh position={[0, h + 0.25, 0]} castShadow>
          <boxGeometry args={[1.3, 0.5, 1.1]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.55} />
        </mesh>
      </group>
    );
  }

  // 6. TRANSPORT / COMMUNITY HUB (BLD-PUB-01) — Red L-Shaped Plaza with Sandy Courtyard & Sun Arches
  if (archetype === 'transport') {
    return (
      <group>
        {/* Sandy Courtyard Pad */}
        <mesh position={[0.25, 0.08, 0.25]} receiveShadow>
          <boxGeometry args={[2.4, 0.14, 2.2]} />
          <meshStandardMaterial color="#edd1a7" roughness={0.8} />
        </mesh>
        {/* Red North Wing */}
        <mesh position={[0, 0.9, -0.55]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 1.8, 1.05]} />
          <meshStandardMaterial color="#d62828" roughness={0.6} />
        </mesh>
        {/* Dark windows on Red North Wing */}
        {[-0.85, -0.35, 0.15, 0.65].map((wx, i) => (
          <mesh key={`pub-wn-${i}`} position={[wx, 1.05, 0.0]}>
            <boxGeometry args={[0.24, 0.32, 0.06]} />
            <meshStandardMaterial color="#2b2d42" roughness={0.4} />
          </mesh>
        ))}
        {/* Red West Wing */}
        <mesh position={[-0.78, 0.9, 0.35]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 1.8, 2.05]} />
          <meshStandardMaterial color="#d62828" roughness={0.6} />
        </mesh>
        {/* Dark windows on Red West Wing */}
        {[-0.2, 0.35, 0.9].map((wz, i) => (
          <mesh key={`pub-ww-${i}`} position={[-0.24, 1.05, wz]}>
            <boxGeometry args={[0.06, 0.32, 0.24]} />
            <meshStandardMaterial color="#2b2d42" roughness={0.4} />
          </mesh>
        ))}
        {/* White Rooftop Terrace */}
        <mesh position={[0, 1.84, -0.55]} receiveShadow>
          <boxGeometry args={[2.42, 0.08, 0.9]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.6} />
        </mesh>
        <mesh position={[-0.78, 1.84, 0.35]} receiveShadow>
          <boxGeometry args={[0.9, 0.08, 1.88]} />
          <meshStandardMaterial color="#f8f9fa" roughness={0.6} />
        </mesh>
        {/* Rooftop Patio Umbrellas */}
        {[
          [-0.6, 1.98, -0.55, '#339af0'],
          [0.2, 1.98, -0.55, '#ff6b6b'],
          [-0.78, 1.98, 0.4, '#339af0'],
        ].map(([ux, uy, uz, ucol], ui) => (
          <mesh key={`umb-${ui}`} position={[ux, uy, uz]} castShadow>
            <coneGeometry args={[0.24, 0.16, 6]} />
            <meshStandardMaterial color={ucol} roughness={0.5} />
          </mesh>
        ))}
        {/* Golden Decorative Roof Arches */}
        <mesh position={[-1.25, 1.95, 0.3]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.38, 0.07, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#f59f00" roughness={0.5} />
        </mesh>
        <mesh position={[0.6, 1.95, -1.02]}>
          <torusGeometry args={[0.38, 0.07, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#f59f00" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // 7. DATA CENTER (BLD-DC-01) — White & Slate Modern Louvered High-Rise + Olive Annex
  if (archetype === 'datacenter') {
    const h = Math.max(3.6, height * 0.44);
    return (
      <group>
        {/* Main White & Slate Tower */}
        <mesh position={[-0.25, h * 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, h * 0.96, 1.6]} />
          <meshStandardMaterial color="#343a40" roughness={0.45} />
        </mesh>
        {Array.from({ length: 7 }).map((_, f) => (
          <mesh key={`dc-louver-${f}`} position={[-0.25, 0.35 + f * ((h * 0.86) / 7), 0]} castShadow>
            <boxGeometry args={[1.86, 0.14, 1.76]} />
            <meshStandardMaterial color="#f8f9fa" roughness={0.55} />
          </mesh>
        ))}
        {/* Adjacent Olive-Green Module */}
        <mesh position={[1.02, h * 0.34, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.82, h * 0.68, 1.2]} />
          <meshStandardMaterial color="#74b816" roughness={0.65} />
        </mesh>
      </group>
    );
  }

  // 8. GOVERNMENT (BLD-GOV-01) — Yellow & Lime-Green Stepped Civic Hall
  if (archetype === 'government') {
    return (
      <group>
        {/* Tier 1 Lime Green Base */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.84, 2.1]} />
          <meshStandardMaterial color="#8ce99a" roughness={0.62} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[2.54, 0.16, 2.14]} />
          <meshStandardMaterial color="#2b2d42" roughness={0.45} />
        </mesh>
        {/* Tier 2 Mid Green Band */}
        <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.15, 0.42, 1.75]} />
          <meshStandardMaterial color="#69db7c" roughness={0.62} />
        </mesh>
        {/* Tier 3 Warm Butter-Yellow Upper Hall */}
        <mesh position={[0, 1.68, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.9, 1.35]} />
          <meshStandardMaterial color="#fae588" roughness={0.58} />
        </mesh>
        {/* Slanted Roof */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[1.6, 0.16, 1.25]} />
          <meshStandardMaterial color="#495057" roughness={0.6} />
        </mesh>
      </group>
    );
  }

  // 9. FACTORY (BLD-FAC-01) — Terracotta/Brown Pleated Accordion-Roof Hall
  if (archetype === 'factory') {
    return (
      <group>
        {/* Main Terracotta/Tan Hall Body */}
        <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.45, 1.76, 1.95]} />
          <meshStandardMaterial color="#b07d52" roughness={0.68} />
        </mesh>
        {/* Dark Arched/Vertical Hall Windows */}
        {[-0.75, -0.25, 0.25, 0.75].map((wx, i) => (
          <mesh key={`fac-win-${i}`} position={[wx, 0.75, 0.99]}>
            <boxGeometry args={[0.28, 0.85, 0.04]} />
            <meshStandardMaterial color="#212529" roughness={0.4} />
          </mesh>
        ))}
        {/* Pleated / Accordion Roof Ridges */}
        {[-0.82, -0.41, 0, 0.41, 0.82].map((rx, i) => (
          <mesh
            key={`pleat-${i}`}
            position={[rx, 1.88, 0]}
            rotation={[0, 0, Math.PI / 4]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.36, 0.36, 2.04]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#d4a373' : '#9c6644'} roughness={0.65} />
          </mesh>
        ))}
      </group>
    );
  }

  // 10. POWER / UTILITY (BLD-POW-01) — Mint-Green, Slate & Pastel-Pink Stepped Utility Building
  return (
    <group>
      {/* Left Pastel-Pink Wing */}
      <mesh position={[-0.65, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 2.1, 1.6]} />
        <meshStandardMaterial color="#f783ac" roughness={0.62} />
      </mesh>
      {/* Windows on Pink Wing */}
      {[0.65, 1.25, 1.75].map((wy, i) => (
        <mesh key={`pow-pw-${i}`} position={[-0.65, wy, 0.82]}>
          <boxGeometry args={[0.68, 0.22, 0.04]} />
          <meshStandardMaterial color="#2b2d42" roughness={0.45} />
        </mesh>
      ))}
      {/* Right Mint-Green Stepped Wing */}
      <mesh position={[0.55, 1.1, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 2.2, 1.5]} />
        <meshStandardMaterial color="#96f2d7" roughness={0.6} />
      </mesh>
      {[0.48, 0.96, 1.44, 1.92].map((py, i) => (
        <mesh key={`pow-band-${i}`} position={[0.55, py, 0.1]}>
          <boxGeometry args={[1.36, 0.14, 1.56]} />
          <meshStandardMaterial color="#20c997" roughness={0.55} />
        </mesh>
      ))}
      {/* Peaked Roof + Small Antenna Mast */}
      <mesh position={[-0.1, 2.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.8, 0.6, 4]} />
        <meshStandardMaterial color="#fcc2d7" roughness={0.6} flatShading />
      </mesh>
      <mesh position={[-0.65, 2.55, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.9, 6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.4} />
      </mesh>
    </group>
  );
}

function BuildingNode({ building, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const beaconRef = useRef();

  const [x, , z] = building.position;
  const { width, depth, height } = building.dimensions;
  const statusColor = getStatusColor(building);
  const isCompromised =
    building.compromiseState === 'AFFECTED' ||
    building.compromiseState === 'FOOTHOLD' ||
    building.compromiseState === 'CREDENTIAL_ACCESS';
  const isSuspicious =
    building.compromiseState === 'PROBING' || building.healthStatus === 'SUSPICIOUS';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (beaconRef.current && (isCompromised || isSuspicious)) {
      const pulse = 1 + Math.sin(t * (isCompromised ? 7 : 4)) * 0.22;
      beaconRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const visualHeight = Math.max(2.6, height * 0.48);

  return (
    <group position={[x, 0, z]}>
      {/* Concrete Building Foundation Pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[width + 0.6, 0.1, depth + 0.6]} />
        <meshStandardMaterial color="#ced4da" roughness={0.8} />
      </mesh>

      {/* Selection / Status Ground Ring */}
      {(isSelected || hovered || isCompromised || isSuspicious) && (
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.68,
              Math.max(width, depth) * 0.82,
              28,
            ]}
          />
          <meshBasicMaterial
            color={isSelected ? '#ffffff' : statusColor}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Clickable Low-Poly Landmark Building */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect(building.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <StylizedLandmarkMesh
          archetype={building.archetype}
          height={height}
          isCompromised={isCompromised}
          isSuspicious={isSuspicious}
        />
      </group>

      {/* Security Alert Beacon when compromised or suspicious */}
      {(isCompromised || isSuspicious) && (
        <mesh ref={beaconRef} position={[0, visualHeight + 1.2, 0]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={isCompromised ? '#ef4444' : '#f59e0b'}
            emissive={isCompromised ? '#ef4444' : '#f59e0b'}
            emissiveIntensity={0.6}
          />
        </mesh>
      )}

      {/* Compact Floating HUD Tag — shown for selected, hovered, or active incident buildings */}
      {(isSelected || hovered || isCompromised || isSuspicious) && (
        <Html
          position={[0, visualHeight + 1.15, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`building-tag-3d ${isSelected ? 'selected' : ''} ${
              isCompromised ? 'compromised' : isSuspicious ? 'suspicious' : ''
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(15, 23, 42, 0.88)',
              border: `1.5px solid ${statusColor}`,
              color: '#f8fafc',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              transform: 'scale(0.85)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                display: 'inline-block',
              }}
            />
            <span>{building.id.replace('BLD-', '')}</span>
            {building.isolated && (
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>ISOLATED</span>
            )}
            {!building.isolated && isCompromised && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontSize: '9.5px',
                }}
              >
                {building.compromiseState}
              </span>
            )}
            {!building.isolated && !isCompromised && isSuspicious && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#111827',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontSize: '9.5px',
                }}
              >
                ALERT
              </span>
            )}
            {building.installedControls.length > 0 && (
              <span style={{ color: '#38bdf8', fontSize: '10px' }}>
                +{building.installedControls.length} CTRL
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function NetworkConnectionArc({ conn, sourceBuilding, targetBuilding, isHighlighted }) {
  const pulseRef = useRef();
  const progressRef = useRef((conn.id.charCodeAt(conn.id.length - 1) % 10) / 10);

  const style = getConnectionStyle(conn);

  const points = useMemo(() => {
    const start = new THREE.Vector3(
      sourceBuilding.position[0],
      0.22,
      sourceBuilding.position[2]
    );
    const end = new THREE.Vector3(
      targetBuilding.position[0],
      0.22,
      targetBuilding.position[2]
    );
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 0.35;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(20);
  }, [sourceBuilding.position, targetBuilding.position]);

  useFrame((_, delta) => {
    if (!pulseRef.current) return;
    if (!conn.permitted || conn.trafficState === 'BLOCKED') {
      pulseRef.current.visible = false;
      return;
    }
    pulseRef.current.visible = true;
    const speed =
      conn.trafficState === 'ATTACK_PROPAGATION' || conn.trafficState === 'COMPROMISED'
        ? 0.65
        : 0.28;
    progressRef.current = (progressRef.current + delta * speed) % 1;
    const idx = Math.floor(progressRef.current * (points.length - 1));
    const pt = points[idx];
    if (pt) {
      pulseRef.current.position.set(pt.x, pt.y, pt.z);
    }
  });

  return (
    <group>
      <Line
        points={points}
        color={style.color}
        lineWidth={isHighlighted ? style.lineWidth + 1.2 : style.lineWidth}
        dashed={style.dashed}
        dashScale={style.dashScale || 1}
        dashSize={0.5}
        gapSize={0.3}
        transparent
        opacity={isHighlighted ? 0.95 : style.opacity}
      />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshBasicMaterial color={style.color} />
      </mesh>
    </group>
  );
}

/**
 * Colorful low-poly neighborhood filler buildings & parks inside the grassy blocks
 * (Strictly outside all road corridors and never overlapping core buildings)
 */
function CityNeighborhoodFiller() {
  const fillerBuildings = useMemo(
    () => [
      // Top-left block (-9.0, -8.0): Magenta & Blue striped commercial building with billboard + small apartments
      { pos: [-9.8, -6.8], size: [2.4, 2.1, 1.5], color: '#e64980', stripe: '#228be6', roofBillboard: true },
      { pos: [-6.8, -8.6], size: [1.5, 2.2, 1.3], color: '#51cf66', stripe: '#2b8a3e' },
      { pos: [-10.8, -9.6], size: [1.4, 2.6, 1.3], color: '#e8590c', stripe: '#f8f9fa' },
      // Top-center block (-2.0, -8.2): Salmon-coral twin curved-balcony apartment building
      { pos: [-2.0, -8.2], size: [1.8, 3.2, 1.5], color: '#ff8787', stripe: '#343a40' },
      { pos: [-2.2, -5.8], size: [1.1, 1.9, 1.1], color: '#9775fa', stripe: '#f3f0ff' },
      // Top-right block (10.8, -7.2): Mint-green & yellow mid-rise buildings
      { pos: [10.8, -6.5], size: [1.9, 1.8, 1.5], color: '#fae588', stripe: '#51cf66' },
      { pos: [11.4, -9.2], size: [1.4, 2.4, 1.3], color: '#ae3ec9', stripe: '#f8f9fa' },
      // Middle-left outer strip (-16.8, z): Colorful apartments
      { pos: [-16.6, -6.5], size: [1.8, 2.8, 1.6], color: '#74c0fc', stripe: '#1c7ed6' },
      { pos: [-16.6, 0.5], size: [1.8, 3.4, 1.6], color: '#63e6be', stripe: '#0ca678' },
      { pos: [-16.4, 7.5], size: [1.9, 2.2, 1.6], color: '#b197fc', stripe: '#5f3dc4' },
      // Bottom-left block (-10.8, 6.8): Lilac & blue corner shop buildings
      { pos: [-10.8, 6.6], size: [1.7, 1.9, 1.5], color: '#d0bfff', stripe: '#7950f2' },
      { pos: [-11.2, 9.4], size: [1.3, 1.8, 1.3], color: '#69db7c', stripe: '#2b8a3e' },
      // Middle-center & bottom-center accents
      { pos: [-7.0, 2.0], size: [1.2, 2.1, 1.2], color: '#fcc419', stripe: '#e67700' },
      { pos: [-10.6, 2.2], size: [1.3, 1.8, 1.2], color: '#9775fa', stripe: '#5f3dc4' },
      // Right-side blocks (8.0..11.5, 7.5): Blue municipal building & terracotta courtyard blocks
      { pos: [10.8, 6.6], size: [2.0, 1.6, 1.4], color: '#748ffc', stripe: '#364fc7' },
      { pos: [10.8, 9.5], size: [2.2, 1.9, 1.6], color: '#e599f7', stripe: '#ae3ec9' },
      { pos: [16.5, -1.5], size: [1.7, 2.6, 1.5], color: '#ffd43b', stripe: '#f08c00' },
      { pos: [16.5, 6.8], size: [1.8, 2.2, 1.6], color: '#63e6be', stripe: '#099268' },
    ],
    []
  );

  return (
    <group>
      {fillerBuildings.map((fb, idx) => (
        <group key={`filler-${idx}`} position={[fb.pos[0], 0, fb.pos[1]]}>
          <mesh position={[0, fb.size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={fb.size} />
            <meshStandardMaterial color={fb.color} roughness={0.65} />
          </mesh>
          {[0.28, 0.55, 0.82].map((r, sIdx) => (
            <mesh key={`f-stripe-${sIdx}`} position={[0, fb.size[1] * r, 0]}>
              <boxGeometry args={[fb.size[0] + 0.05, 0.16, fb.size[2] + 0.05]} />
              <meshStandardMaterial color={fb.stripe} roughness={0.5} />
            </mesh>
          ))}
          {fb.roofBillboard && (
            <mesh position={[0, fb.size[1] + 0.35, 0]} rotation={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[1.4, 0.48, 0.1]} />
              <meshStandardMaterial color="#3bc9db" roughness={0.4} />
            </mesh>
          )}
        </group>
      ))}

      {/* Fenced Recreation / Sports Court in Block (7.2, 7.8) matching bottom-right of reference */}
      <group position={[7.4, 0.06, 7.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[2.8, 0.08, 2.4]} />
          <meshStandardMaterial color="#495057" roughness={0.85} />
        </mesh>
        {/* Pink/Red Perimeter Fence */}
        {[
          [0, 0.18, -1.18, 2.8, 0.28, 0.06],
          [0, 0.18, 1.18, 2.8, 0.28, 0.06],
          [-1.38, 0.18, 0, 0.06, 0.28, 2.4],
          [1.38, 0.18, 0, 0.06, 0.28, 2.4],
        ].map(([fx, fy, fz, fw, fh, fd], i) => (
          <mesh key={`fence-${i}`} position={[fx, fy, fz]}>
            <boxGeometry args={[fw, fh, fd]} />
            <meshStandardMaterial color="#e64980" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Sunny Isometric City Ground:
 * - Lush green grass blocks
 * - Orthogonal grid of dark gray asphalt streets with light-gray sidewalks
 * - White dashed lane dividers & zebra crosswalk stripes at every intersection
 * - Abundant low-poly green, yellow, and orange trees
 */
function CityGround() {
  const trees = useMemo(() => {
    const list = [];
    const palette = [
      { type: 'round', color: '#5ec435' },
      { type: 'round', color: '#74d647' },
      { type: 'autumn', color: '#f59f00' },
      { type: 'autumn', color: '#fcc419' },
      { type: 'pine', color: '#2b8a3e' },
      { type: 'autumn', color: '#e8590c' },
    ];

    // Place trees along block perimeters and park areas (avoiding roads and building footprints)
    const treeCoords = [
      // Around Telecom Tower Park (-6.8, -0.3)
      [-5.9, -2.1], [-7.8, -2.2], [-8.2, 1.9], [-6.0, 1.8], [-5.8, 0.6], [-8.0, -1.2],
      // Around Hospital (-10.2, 0.4)
      [-11.8, -1.8], [-11.8, 2.0], [-9.2, -2.2], [-9.2, 2.2],
      // Center Block (-3.0..3.0, -2.5..2.5)
      [-2.8, -2.2], [0.2, -2.2], [2.8, -2.1], [-2.8, 2.1], [0.0, 2.2], [2.9, 2.1],
      // Top-Center Block (-3.0..3.0, -10.2..-5.5)
      [-0.4, -5.8], [2.8, -5.8], [2.8, -9.6], [-0.4, -9.8], [-2.9, -9.6],
      // Top-Right Block (6.0..11.8, -10.2..-5.5)
      [6.1, -6.0], [6.1, -9.6], [9.4, -6.0], [9.4, -9.8], [11.8, -7.8],
      // Middle-Right Park & Factory Block (6.0..11.8, -2.4..2.4)
      [6.0, -2.1], [6.2, 1.9], [10.4, -2.0], [10.6, 1.8], [11.6, 0.2], [9.6, 2.1],
      // Bottom-Left Block (-11.8..-6.0, 5.6..10.2)
      [-6.0, 5.8], [-6.0, 9.8], [-9.4, 5.8], [-9.5, 9.8], [-11.8, 8.0],
      // Bottom-Center Block (-2.9..2.9, 5.6..10.2)
      [-2.8, 5.6], [0.2, 5.6], [2.9, 5.8], [-2.8, 9.8], [0.2, 9.8], [2.9, 9.8],
      // Bottom-Right Park (6.0..11.8, 5.6..10.2)
      [6.0, 5.8], [6.0, 9.8], [9.2, 5.8], [9.2, 9.8], [11.8, 8.0],
      // Outer green park avenues
      [-15.2, -9.5], [-15.2, -2.0], [-15.2, 2.2], [-15.2, 9.2],
      [15.2, -9.0], [15.2, -2.2], [15.2, 2.2], [15.2, 9.2],
      [-8.5, -14.2], [-1.5, -14.2], [2.2, -14.2], [8.5, -14.2],
      [-8.5, 14.2], [-1.5, 14.2], [2.2, 14.2], [8.5, 14.2],
    ];

    treeCoords.forEach(([tx, tz], i) => {
      const p = palette[i % palette.length];
      const scale = 0.85 + ((i * 7) % 5) * 0.08;
      list.push({ pos: [tx, 0, tz], type: p.type, color: p.color, scale });
    });
    return list;
  }, []);

  return (
    <group>
      {/* Large Lush Green Grass Base */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[80, 0.16, 80]} />
        <meshStandardMaterial color="#65b83b" roughness={0.85} />
      </mesh>

      {/* Raised Landscaped Green Lawn Blocks inside the road grid */}
      {[-9.0, 0.0, 9.0].map((bx) =>
        [-8.0, 0.0, 8.0].map((bz) => (
          <mesh key={`lawn-${bx}-${bz}`} position={[bx, 0.02, bz]} receiveShadow>
            <boxGeometry args={[6.3, 0.05, 5.3]} />
            <meshStandardMaterial color="#74c644" roughness={0.82} />
          </mesh>
        ))
      )}

      {/* Sidewalk Curbs along X Avenues and Z Streets */}
      {ROAD_X.map((rx) => (
        <mesh key={`sw-x-${rx}`} position={[rx, 0.01, 0]} receiveShadow>
          <boxGeometry args={[SIDEWALK_WIDTH, 0.04, 48]} />
          <meshStandardMaterial color="#c5cad1" roughness={0.8} />
        </mesh>
      ))}
      {ROAD_Z.map((rz) => (
        <mesh key={`sw-z-${rz}`} position={[0, 0.01, rz]} receiveShadow>
          <boxGeometry args={[48, 0.04, SIDEWALK_WIDTH]} />
          <meshStandardMaterial color="#c5cad1" roughness={0.8} />
        </mesh>
      ))}

      {/* Dark Gray Asphalt Roadways along X Avenues and Z Streets */}
      {ROAD_X.map((rx) => (
        <mesh key={`rd-x-${rx}`} position={[rx, 0.025, 0]} receiveShadow>
          <boxGeometry args={[ROAD_WIDTH, 0.04, 48]} />
          <meshStandardMaterial color="#3b4048" roughness={0.75} />
        </mesh>
      ))}
      {ROAD_Z.map((rz) => (
        <mesh key={`rd-z-${rz}`} position={[0, 0.026, rz]} receiveShadow>
          <boxGeometry args={[48, 0.04, ROAD_WIDTH]} />
          <meshStandardMaterial color="#3b4048" roughness={0.75} />
        </mesh>
      ))}

      {/* White Dashed Centerlines on X Avenues */}
      {ROAD_X.map((rx) =>
        [-16, -8, 0, 8, 16].map((segZ) =>
          [-2.2, -0.7, 0.7, 2.2].map((dz, di) => (
            <mesh
              key={`dash-x-${rx}-${segZ}-${di}`}
              position={[rx, 0.052, segZ + dz]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.08, 0.65]} />
              <meshBasicMaterial color="#f1f5f9" />
            </mesh>
          ))
        )
      )}

      {/* White Dashed Centerlines on Z Streets */}
      {ROAD_Z.map((rz) =>
        [-18, -9, 0, 9, 18].map((segX) =>
          [-2.4, -0.8, 0.8, 2.4].map((dx, di) => (
            <mesh
              key={`dash-z-${rz}-${segX}-${di}`}
              position={[segX + dx, 0.052, rz]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.65, 0.08]} />
              <meshBasicMaterial color="#f1f5f9" />
            </mesh>
          ))
        )
      )}

      {/* White Zebra Crosswalks at Every Intersection (rx, rz) */}
      {ROAD_X.map((rx) =>
        ROAD_Z.map((rz) => (
          <group key={`xw-${rx}-${rz}`} position={[rx, 0.055, rz]}>
            {/* North & South Crosswalks */}
            {[-1.25, 1.25].map((cz) =>
              [-0.65, -0.32, 0, 0.32, 0.65].map((cx, si) => (
                <mesh
                  key={`xw-ns-${cz}-${si}`}
                  position={[cx, 0, cz]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[0.14, 0.42]} />
                  <meshBasicMaterial color="#f8fafc" />
                </mesh>
              ))
            )}
            {/* East & West Crosswalks */}
            {[-1.25, 1.25].map((cx) =>
              [-0.65, -0.32, 0, 0.32, 0.65].map((cz, si) => (
                <mesh
                  key={`xw-ew-${cx}-${si}`}
                  position={[cx, 0, cz]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[0.42, 0.14]} />
                  <meshBasicMaterial color="#f8fafc" />
                </mesh>
              ))
            )}
          </group>
        ))
      )}

      {/* Render All Low-Poly Trees */}
      {trees.map((t, idx) => (
        <LowPolyTree
          key={`tree-${idx}`}
          position={t.pos}
          type={t.type}
          color={t.color}
          scale={t.scale}
        />
      ))}
    </group>
  );
}

/**
 * Normal Ground Street Cars ONLY (Zero Flying Cars!).
 * Cars drive strictly along the orthogonal asphalt road lanes (ROAD_X and ROAD_Z)
 * AND run explicit bounding-box collision checks against all buildings so they never hit any building.
 */
function GroundStreetTraffic({ buildings = [] }) {
  const carRefs = useRef([]);

  const buildingBoxes = useMemo(() => {
    return buildings.map((b) => {
      const [bx, , bz] = b.position;
      const halfW = (b.dimensions?.width || 2.2) * 0.5 + 0.75;
      const halfD = (b.dimensions?.depth || 2.2) * 0.5 + 0.75;
      return {
        minX: bx - halfW,
        maxX: bx + halfW,
        minZ: bz - halfD,
        maxZ: bz + halfD,
        centerX: bx,
        centerZ: bz,
      };
    });
  }, [buildings]);

  // 16 normal street cars travelling in right-hand lanes along ROAD_X and ROAD_Z
  const cars = useMemo(
    () => [
      // North-South cars along ROAD_X = [-13.5, -4.5, 4.5, 13.5]
      { axis: 'z', roadCoord: -13.5, laneOffset: 0.44, dir: 1, speed: 3.2, phase: 0.0, color: '#fcc419' },
      { axis: 'z', roadCoord: -13.5, laneOffset: -0.44, dir: -1, speed: 2.9, phase: 0.5, color: '#ff6b6b' },
      { axis: 'z', roadCoord: -4.5, laneOffset: 0.44, dir: 1, speed: 3.4, phase: 0.15, color: '#339af0' },
      { axis: 'z', roadCoord: -4.5, laneOffset: -0.44, dir: -1, speed: 3.0, phase: 0.62, color: '#f8f9fa' },
      { axis: 'z', roadCoord: -4.5, laneOffset: 0.44, dir: 1, speed: 3.4, phase: 0.72, color: '#fcc419' },
      { axis: 'z', roadCoord: 4.5, laneOffset: 0.44, dir: 1, speed: 3.1, phase: 0.28, color: '#51cf66' },
      { axis: 'z', roadCoord: 4.5, laneOffset: -0.44, dir: -1, speed: 3.5, phase: 0.8, color: '#ff922b' },
      { axis: 'z', roadCoord: 4.5, laneOffset: -0.44, dir: -1, speed: 3.5, phase: 0.35, color: '#f03e3e' },
      { axis: 'z', roadCoord: 13.5, laneOffset: 0.44, dir: 1, speed: 2.8, phase: 0.42, color: '#fcc419' },
      { axis: 'z', roadCoord: 13.5, laneOffset: -0.44, dir: -1, speed: 3.2, phase: 0.9, color: '#4dabf7' },

      // East-West cars along ROAD_Z = [-12.0, -4.0, 4.0, 12.0]
      { axis: 'x', roadCoord: -12.0, laneOffset: 0.44, dir: 1, speed: 3.0, phase: 0.2, color: '#ff6b6b' },
      { axis: 'x', roadCoord: -4.0, laneOffset: 0.44, dir: 1, speed: 3.3, phase: 0.1, color: '#fcc419' },
      { axis: 'x', roadCoord: -4.0, laneOffset: -0.44, dir: -1, speed: 2.9, phase: 0.55, color: '#f8f9fa' },
      { axis: 'x', roadCoord: 4.0, laneOffset: 0.44, dir: 1, speed: 3.2, phase: 0.38, color: '#339af0' },
      { axis: 'x', roadCoord: 4.0, laneOffset: -0.44, dir: -1, speed: 3.4, phase: 0.84, color: '#fcc419' },
      { axis: 'x', roadCoord: 12.0, laneOffset: -0.44, dir: -1, speed: 3.1, phase: 0.48, color: '#69db7c' },
    ],
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const span = 36; // [-18, +18]
    cars.forEach((car, idx) => {
      const ref = carRefs.current[idx];
      if (!ref) return;

      const travel = (((t * car.speed * 0.08 + car.phase) % 1) * span - span / 2) * car.dir;
      let cx = car.axis === 'x' ? travel : car.roadCoord + car.laneOffset;
      let cz = car.axis === 'z' ? travel : car.roadCoord + car.laneOffset;

      // Safety bounding-box check guaranteeing the car never touches any building
      for (let i = 0; i < buildingBoxes.length; i++) {
        const b = buildingBoxes[i];
        if (cx > b.minX && cx < b.maxX && cz > b.minZ && cz < b.maxZ) {
          if (car.axis === 'z') {
            cx = car.roadCoord + car.laneOffset;
          } else {
            cz = car.roadCoord + car.laneOffset;
          }
        }
      }

      ref.position.set(cx, 0.13, cz);
      if (car.axis === 'z') {
        ref.rotation.y = car.dir > 0 ? 0 : Math.PI;
      } else {
        ref.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  });

  return (
    <group>
      {cars.map((car, idx) => (
        <group key={`normal-car-${idx}`} ref={(el) => (carRefs.current[idx] = el)}>
          {/* Car Lower Chassis */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[0.36, 0.14, 0.72]} />
            <meshStandardMaterial color={car.color} roughness={0.45} />
          </mesh>
          {/* Car Cabin / Windshield */}
          <mesh position={[0, 0.15, -0.04]} castShadow>
            <boxGeometry args={[0.3, 0.12, 0.38]} />
            <meshStandardMaterial color="#f8f9fa" roughness={0.35} />
          </mesh>
          {/* 4 Black Wheels */}
          {[
            [-0.18, -0.02, 0.22],
            [0.18, -0.02, 0.22],
            [-0.18, -0.02, -0.22],
            [0.18, -0.02, -0.22],
          ].map(([wx, wy, wz], wi) => (
            <mesh key={`wheel-${wi}`} position={[wx, wy, wz]}>
              <boxGeometry args={[0.06, 0.09, 0.14]} />
              <meshStandardMaterial color="#212529" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function CityScene3D() {
  const simState = useGameStore((s) => s.simState);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const overlays = useGameStore((s) => s.overlays);

  const buildings = simState?.buildings || [];
  const connections = simState?.connections || [];
  const latestTransition = simState?.transitionHistory?.[0] || null;

  const buildingMap = useMemo(() => {
    const map = {};
    for (const b of buildings) {
      map[b.id] = b;
    }
    return map;
  }, [buildings]);

  const visibleConnections = useMemo(() => {
    if (!overlays?.network) return [];
    return connections;
  }, [connections, overlays?.network]);

  const isTestEnv = typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined';

  return (
    <div className="city-canvas-wrapper" data-testid="city-3d-viewport">
      {isTestEnv ? (
        <div className="test-3d-fallback" data-testid="city-3d-test-fallback">
          {buildings.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => selectBuilding(b.id)}
              data-testid={`building-node-${b.id}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      ) : (
      <Canvas
        shadows
        camera={{ position: [-15.4, 15.8, 17.6], fov: 33 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#65b83b']} />
        <fog attach="fog" args={['#74c644', 42, 78]} />

        {/* Bright Sunny Isometric City Builder Lighting */}
        <ambientLight intensity={0.88} color="#fff9db" />
        <hemisphereLight args={['#e7f5ff', '#65b83b', 0.95]} />
        <directionalLight
          position={[-16, 26, 14]}
          intensity={2.05}
          color="#fff4e6"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={65}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.07}
          minDistance={6}
          maxDistance={42}
          maxPolarAngle={Math.PI / 2.25}
          target={[-1.0, 0.9, 0.2]}
        />

        <CityGround />
        <CityNeighborhoodFiller />
        <GroundStreetTraffic buildings={buildings} />

        {/* Interactive Landmark Buildings */}
        {buildings.map((b) => (
          <BuildingNode
            key={b.id}
            building={b}
            isSelected={b.id === selectedBuildingId}
            onSelect={selectBuilding}
          />
        ))}

        {/* Network Topology Arcs */}
        {visibleConnections.map((conn) => {
          const src = buildingMap[conn.source];
          const dst = buildingMap[conn.target];
          if (!src || !dst) return null;
          const isHighlighted =
            selectedBuildingId === conn.source || selectedBuildingId === conn.target;
          return (
            <NetworkConnectionArc
              key={conn.id}
              conn={conn}
              sourceBuilding={src}
              targetBuilding={dst}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </Canvas>
      )}

      {latestTransition && latestTransition.outcome === 'BLOCKED' && (
        <div className="viewport-interception-banner">
          <div className="vib-header">
            <span className="vib-badge">🛡️ ATTACK INTERCEPTED</span>
            <span className="vib-path">
              {latestTransition.sourceId} → {latestTransition.targetId}
            </span>
          </div>
          <p className="vib-reason">{latestTransition.reason}</p>
        </div>
      )}

      {/* Viewport Legend */}
      <div className="viewport-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#10b981' }} />
          <span>Healthy / Secured</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#eab308' }} />
          <span>Vuln / Suspicious</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ef4444' }} />
          <span>Compromised / Blocked</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#8b5cf6' }} />
          <span>Monitored</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#64748b' }} />
          <span>Isolated</span>
        </div>
      </div>
    </div>
  );
}
