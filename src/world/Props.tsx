/**
 * Accessoires réutilisables : panneaux-textes, vortex d'aspiration, chaîne de production (convoyeur),
 * mur de vidéos, grande horloge, console, bâtiment-usine, plateforme flottante.
 */
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { P2, canvasTexture } from "./World";
import { clamp01, rng } from "../film/timeline";

const Mat: React.FC<{ color: string; emissive?: string; ei?: number; rough?: number; flat?: boolean; metal?: number }> = ({ color, emissive = "#000000", ei = 0, rough = 0.8, flat = true, metal = 0.05 }) => (
  <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={ei} roughness={rough} metalness={metal} flatShading={flat} />
);

// ──────────────────────────────────────────────── panneau texte (canvas → plane lumineux)
export const Sign: React.FC<{ position: [number, number, number]; text: string; sub?: string; color?: string; width?: number; rotationY?: number; glow?: number }> = ({ position, text, sub, color = P2.orange, width = 6, rotationY = 0, glow = 1 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(
        512,
        (g, s) => {
          g.clearRect(0, 0, s, s);
          g.fillStyle = "rgba(6,10,30,0.82)";
          const r = 40;
          g.beginPath();
          g.roundRect(8, s * 0.3, s - 16, s * 0.4, r);
          g.fill();
          g.strokeStyle = color;
          g.lineWidth = 8;
          g.stroke();
          g.fillStyle = "#ffffff";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.font = `bold ${sub ? 64 : 76}px Poppins, Segoe UI, Arial, sans-serif`;
          g.fillText(text.toUpperCase(), s / 2, sub ? s * 0.45 : s * 0.5, s - 60);
          if (sub) {
            g.fillStyle = color;
            g.font = `500 40px Poppins, Segoe UI, Arial, sans-serif`;
            g.fillText(sub, s / 2, s * 0.6, s - 60);
          }
        },
        1,
        false
      ),
    [text, sub, color]
  );
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, width]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} opacity={glow} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

// ──────────────────────────────────────────────── vortex d'aspiration (anneaux hexagonaux + traînées)
export const Vortex: React.FC<{ position: [number, number, number]; t: number; k: number; dir?: [number, number, number] }> = ({ position, t, k }) => {
  const rings = 16;
  const r = useMemo(() => rng(31), []);
  const streaks = useMemo(() => Array.from({ length: 60 }, () => ({ a: r() * Math.PI * 2, d: 0.6 + r() * 2.2, l: 2 + r() * 6, s: 0.5 + r() })), [r]);
  if (k <= 0) return null;
  return (
    <group position={position}>
      {Array.from({ length: rings }, (_, i) => {
        const z = -i * 1.6 * k - 0.5;
        const sc = (0.6 + i * 0.35) * k;
        return (
          <mesh key={i} position={[0, 0, z]} rotation={[0, 0, t * (1.5 + i * 0.1) + i * 0.4]} scale={sc}>
            <torusGeometry args={[1, 0.05 + i * 0.006, 6, 6]} />
            <meshBasicMaterial color={i % 3 === 0 ? P2.cream : i % 3 === 1 ? P2.orange : P2.violet} toneMapped={false} transparent opacity={0.9 - i * 0.03} />
          </mesh>
        );
      })}
      {streaks.map((s, i) => (
        <mesh key={i} position={[Math.cos(s.a) * s.d * k, Math.sin(s.a) * s.d * k, -((t * 18 * s.s + i * 3) % 26) * k]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, s.l * k]} />
          <meshBasicMaterial color={P2.cream} toneMapped={false} transparent opacity={0.7} />
        </mesh>
      ))}
      <pointLight color={P2.orange} intensity={60 * k} distance={14} decay={2} />
    </group>
  );
};

// ──────────────────────────────────────────────── chaîne de production (convoyeur + stations)
export const PIPE_STEPS = ["Idée", "Script", "Images", "Voix", "Montage", "Miniature", "SEO", "Publication"];
const STEP_COLORS = [P2.gold, P2.cream, P2.violet, P2.teal, P2.blue, P2.orange, P2.green, P2.red];
export const Conveyor: React.FC<{ position: [number, number, number]; t: number; k: number; length?: number }> = ({ position, t, k, length = 42 }) => {
  const n = PIPE_STEPS.length;
  const stepX = length / (n - 1);
  const items = [0, 0.33, 0.66];
  return (
    <group position={position}>
      {/* tapis */}
      <mesh position={[length / 2, 0.5, 0]}>
        <boxGeometry args={[length + 4, 1, 3.2]} />
        <Mat color="#101733" emissive={P2.blue} ei={0.08} />
      </mesh>
      {/* rayures défilantes */}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} position={[((i * 2 + t * 4 * k) % (length + 4)) - 2 + 0, 1.01, 0]}>
          <boxGeometry args={[0.25, 0.02, 3]} />
          <meshBasicMaterial color={P2.blue} toneMapped={false} transparent opacity={0.45} />
        </mesh>
      ))}
      {/* stations */}
      {PIPE_STEPS.map((name, i) => {
        const x = i * stepX;
        const lit = clamp01((k * (n - 1) - i + 0.6) * 1.5);
        const c = STEP_COLORS[i];
        return (
          <group key={name} position={[x, 0, 0]}>
            <mesh position={[0, 3.6, -2.6]}>
              <boxGeometry args={[0.35, 5.2, 0.35]} />
              <Mat color="#1a2550" emissive={c} ei={0.25 * lit} />
            </mesh>
            <mesh position={[0, 6.6, -2.6]} rotation={[0, 0, Math.PI / 6]} scale={0.8 + 0.25 * lit}>
              <torusGeometry args={[1.1, 0.12, 6, 6]} />
              <meshBasicMaterial color={c} toneMapped={false} transparent opacity={0.3 + 0.7 * lit} />
            </mesh>
            {/* bras qui travaille au-dessus du tapis */}
            <group position={[0, 4.2, -1.2]} rotation={[0.3 + Math.sin(t * 3 + i) * 0.25 * lit, 0, 0]}>
              <mesh position={[0, -1.3, 0.9]}>
                <boxGeometry args={[0.25, 0.25, 2.4]} />
                <Mat color="#2a3566" emissive={c} ei={0.15 * lit} />
              </mesh>
              <mesh position={[0, -1.3, 2.1]}>
                <sphereGeometry args={[0.35, 8, 6]} />
                <meshBasicMaterial color={c} toneMapped={false} transparent opacity={0.25 + 0.75 * lit} />
              </mesh>
            </group>
            <Sign position={[0, 8.6, -2.6]} text={name} color={c} width={4.6} glow={0.35 + 0.65 * lit} />
            <pointLight position={[0, 5, -1]} color={c} intensity={14 * lit} distance={10} decay={2} />
          </group>
        );
      })}
      {/* objets qui avancent et se transforment : cube → carte → vidéo */}
      {items.map((off, j) => {
        const p = (k * 1.15 + off) % 1.15;
        if (p > 1.02) return null;
        const x = p * length;
        const stage = Math.min(n - 1, Math.floor(p * (n - 1) + 0.5));
        const c = STEP_COLORS[stage];
        return (
          <group key={j} position={[x, 1.6, 0]} rotation={[0, t * 1.2 + j, 0]}>
            {stage < 2 ? (
              <mesh>
                <octahedronGeometry args={[0.6, 0]} />
                <meshBasicMaterial color={c} toneMapped={false} />
              </mesh>
            ) : stage < 5 ? (
              <RoundedBox args={[1.6, 1.0, 0.12]} radius={0.06} smoothness={2}>
                <meshStandardMaterial color="#101830" emissive={c} emissiveIntensity={0.9} />
              </RoundedBox>
            ) : (
              <group>
                <RoundedBox args={[2.0, 1.15, 0.14]} radius={0.06} smoothness={2}>
                  <meshStandardMaterial color="#0d1328" emissive={c} emissiveIntensity={0.7} />
                </RoundedBox>
                <mesh position={[0, 0, 0.1]} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.28, 0.5, 3]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
              </group>
            )}
            <pointLight color={c} intensity={6} distance={5} decay={2} />
          </group>
        );
      })}
    </group>
  );
};

// ──────────────────────────────────────────────── mur de vidéos (écrans instanciés qui s'allument)
export const VideoWall: React.FC<{ position: [number, number, number]; t: number; lit: number; cols?: number; rows?: number; cell?: number; rotationY?: number; seed?: number }> = ({ position, t, lit, cols = 14, rows = 6, cell = 3.2, rotationY = 0, seed = 9 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const order = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: cols * rows }, (_, i) => ({ i, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.i);
  }, [cols, rows, seed]);
  const palette = useMemo(() => [P2.orange, P2.violet, P2.teal, P2.gold, P2.blue, P2.red, P2.green, P2.cream].map((c) => new THREE.Color(c)), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const dark = new THREE.Color("#0a1028");
    const nLit = Math.floor(lit * order.length);
    const litSet = new Set(order.slice(0, nLit));
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols, rI = Math.floor(i / cols);
      m.makeTranslation((c - (cols - 1) / 2) * cell, (rI + 0.5) * cell, 0);
      mesh.setMatrixAt(i, m);
      const on = litSet.has(i);
      const col = on ? palette[(i * 7 + rI) % palette.length].clone().multiplyScalar(0.75 + 0.25 * Math.sin(t * 2 + i)) : dark;
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lit, t, cols, rows, cell, order, palette]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, cols * rows]}>
        <boxGeometry args={[cell * 0.92, cell * 0.6, 0.2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh position={[0, (rows * cell) / 2, -0.3]}>
        <boxGeometry args={[cols * cell + 1, rows * cell + 1, 0.3]} />
        <Mat color="#0a0f26" />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────── grande horloge (temps accéléré)
export const BigClock: React.FC<{ position: [number, number, number]; t: number; k: number; radius?: number }> = ({ position, t, k, radius = 9 }) => {
  const hours = k * Math.PI * 2 * 1.5 + t * 0.02;
  const minutes = hours * 12;
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[radius, radius * 0.05, 8, 48]} />
        <meshBasicMaterial color={P2.cream} toneMapped={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * radius * 0.86, Math.cos((i / 12) * Math.PI * 2) * radius * 0.86, 0]} rotation={[0, 0, -(i / 12) * Math.PI * 2]}>
          <boxGeometry args={[radius * 0.03, radius * 0.1, 0.2]} />
          <meshBasicMaterial color={i % 3 === 0 ? P2.orange : P2.cream} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, -hours]} position={[0, 0, 0.3]}>
        <boxGeometry args={[radius * 0.05, radius * 0.55, 0.2]} />
        <meshBasicMaterial color={P2.cream} toneMapped={false} />
        <mesh position={[0, radius * 0.25, 0]}>
          <boxGeometry args={[radius * 0.05, radius * 0.55, 0.2]} />
          <meshBasicMaterial color={P2.cream} toneMapped={false} />
        </mesh>
      </mesh>
      <mesh rotation={[0, 0, -minutes]} position={[0, 0, 0.5]}>
        <mesh position={[0, radius * 0.38, 0]}>
          <boxGeometry args={[radius * 0.03, radius * 0.76, 0.2]} />
          <meshBasicMaterial color={P2.orange} toneMapped={false} />
        </mesh>
      </mesh>
      <mesh position={[0, 0, 0.6]}>
        <sphereGeometry args={[radius * 0.06, 12, 8]} />
        <meshBasicMaterial color={P2.orange} toneMapped={false} />
      </mesh>
      <pointLight color={P2.cream} intensity={40} distance={40} decay={2} />
    </group>
  );
};

// ──────────────────────────────────────────────── console de lancement (pupitre + hologramme)
export const Console: React.FC<{ position: [number, number, number]; t: number; on: number }> = ({ position, t, on }) => (
  <group position={position}>
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[1.1, 1.5, 1.1, 6]} />
      <Mat color="#121a3a" emissive={P2.orange} ei={0.12 * on} metal={0.3} />
    </mesh>
    <mesh position={[0, 1.12, 0]} rotation={[0, t * 0.5, 0]}>
      <cylinderGeometry args={[0.9, 0.9, 0.08, 6]} />
      <meshBasicMaterial color={P2.orange} toneMapped={false} transparent opacity={0.5 + 0.5 * on} />
    </mesh>
    {on > 0 && (
      <group position={[0, 2.4 + Math.sin(t * 2) * 0.1, 0]} rotation={[0, t * 0.8, 0]}>
        <mesh>
          <torusGeometry args={[0.9, 0.05, 6, 6]} />
          <meshBasicMaterial color={P2.cream} toneMapped={false} transparent opacity={on} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.05, 6, 6]} />
          <meshBasicMaterial color={P2.orange} toneMapped={false} transparent opacity={on} />
        </mesh>
        <pointLight color={P2.orange} intensity={20 * on} distance={10} decay={2} />
      </group>
    )}
  </group>
);

// ──────────────────────────────────────────────── bâtiment-machine (usine avec enseigne et emblème dessus)
export const MachineBuilding: React.FC<{ position: [number, number, number]; t: number; name: string; sub?: string; color: string; rotationY?: number; children?: React.ReactNode; lit?: number }> = ({ position, t, name, sub, color, rotationY = 0, children, lit = 1 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RoundedBox args={[9, 5, 8]} radius={0.3} smoothness={2} position={[0, 2.5, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#121a3c" emissive={color} emissiveIntensity={0.07 * lit} roughness={0.7} metalness={0.2} />
    </RoundedBox>
    {/* porte lumineuse */}
    <mesh position={[0, 1.6, 4.05]}>
      <planeGeometry args={[2.4, 3.2]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.55 + 0.25 * Math.sin(t * 2) * lit} />
    </mesh>
    {/* bandeau lumineux */}
    <mesh position={[0, 4.9, 4.05]}>
      <boxGeometry args={[9, 0.15, 0.05]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <Sign position={[0, 7.3, 4.2]} text={name} sub={sub} color={color} width={7} />
    <group position={[0, 5.2, 0]}>{children}</group>
    <pointLight position={[0, 3, 6]} color={color} intensity={18 * lit} distance={16} decay={2} />
  </group>
);

/** Plateforme hexagonale flottante (scène du temps). */
export const Platform: React.FC<{ position: [number, number, number]; radius?: number; t: number }> = ({ position, radius = 7, t }) => (
  <group position={position}>
    <mesh position={[0, -0.4, 0]}>
      <cylinderGeometry args={[radius, radius * 0.8, 0.8, 6]} />
      <Mat color="#121a3c" emissive={P2.orange} ei={0.1} metal={0.3} />
    </mesh>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, t * 0.1]}>
      <ringGeometry args={[radius * 0.92, radius, 6]} />
      <meshBasicMaterial color={P2.orange} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  </group>
);
