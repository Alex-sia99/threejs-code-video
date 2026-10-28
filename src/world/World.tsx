/**
 * Monde « néon » réutilisable : un monde IMMENSE et spectaculaire — plaine quadrillée lumineuse jusqu'à
 * l'horizon, mégapole de tours de données, cœur hexagonal géant au centre, piliers de
 * lumière, particules flottantes, ciel dégradé étoilé. Tout est déterministe (rng à graine).
 */
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "../film/timeline";

export const P2 = {
  bg: "#05081a", fog: "#070b24", sky1: "#0b1444", sky2: "#1c0f3d", sky3: "#040615",
  grid: "#16245c", gridLine: "#4a6bff", tower: "#0b1230", towerHi: "#182454", window: "#ffd9a0", windowCool: "#b9d4ff",
  orange: "#ff7a1a", orangeDeep: "#c9500e", cream: "#fff4df", violet: "#a78bfa", blue: "#6fa8ff", teal: "#52d8c8", gold: "#f2c14e", red: "#ff5d5d", green: "#9adf9a",
  dawn: "#ffb27a",
};

export function canvasTexture(size: number, paint: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1, wrap = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  paint(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat); }
  tex.anisotropy = 8;
  return tex;
}

/** Zones dégagées (quartiers) où aucune tour n'est posée. */
export interface Clearing { x: number; z: number; r: number }

// ──────────────────────────────────────────────── sol quadrillé lumineux
export const GridFloor: React.FC<{ size?: number; center?: [number, number]; glow?: number }> = ({ size = 1600, center = [0, 0], glow = 1 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(
        512,
        (g, s) => {
          g.fillStyle = "#070c26";
          g.fillRect(0, 0, s, s);
          const n = 4;
          const step = s / n;
          for (let i = 0; i <= n; i++) {
            const p = i * step;
            g.strokeStyle = "rgba(74,107,255,0.22)";
            g.lineWidth = 10;
            g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke();
            g.strokeStyle = "rgba(140,170,255,0.95)";
            g.lineWidth = 2.2;
            g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke();
          }
        },
        size / 16
      ),
    [size]
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.42 * glow} color="#5a6aa8" roughness={0.95} />
    </mesh>
  );
};

// ──────────────────────────────────────────────── mégapole de tours (instanciée)
function windowTexture(cool: boolean) {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = "#0a1030";
    g.fillRect(0, 0, s, s);
    const r = rng(cool ? 3 : 5);
    const cols = 6, rows = 12;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        if (r() > 0.55) continue;
        const a = 0.55 + r() * 0.45;
        g.fillStyle = cool ? `rgba(185,212,255,${a})` : `rgba(255,217,160,${a})`;
        g.fillRect(i * (s / cols) + 6, j * (s / rows) + 4, s / cols - 12, s / rows - 8);
      }
  }, 1, true);
}
export const Skyline: React.FC<{ count?: number; area?: number; clearings?: Clearing[]; seed?: number }> = ({ count = 1100, area = 760, clearings = [], seed = 21 }) => {
  const warm = useRef<THREE.InstancedMesh>(null);
  const cool = useRef<THREE.InstancedMesh>(null);
  const texW = useMemo(() => windowTexture(false), []);
  const texC = useMemo(() => windowTexture(true), []);
  const towers = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; z: number; w: number; h: number; d: number; cool: boolean }[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 20) {
      const x = (r() - 0.5) * area, z = (r() - 0.5) * area;
      if (clearings.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r)) continue;
      const far = Math.hypot(x, z) / (area / 2);
      const h = 6 + r() * 26 + (r() < 0.12 ? 30 + r() * 40 : 0) + far * 10;
      out.push({ x, z, w: 3 + r() * 6, h, d: 3 + r() * 6, cool: r() < 0.45 });
    }
    return out;
  }, [count, area, clearings, seed]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const place = (mesh: THREE.InstancedMesh | null, list: typeof towers) => {
      if (!mesh) return;
      list.forEach((t, i) => {
        m.makeScale(t.w, t.h, t.d);
        m.setPosition(t.x, t.h / 2, t.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(warm.current, towers.filter((t) => !t.cool));
    place(cool.current, towers.filter((t) => t.cool));
  }, [towers]);
  const nW = towers.filter((t) => !t.cool).length, nC = towers.length - nW;
  return (
    <group>
      <instancedMesh ref={warm} args={[undefined, undefined, Math.max(1, nW)]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={texW} emissiveMap={texW} emissive="#ffffff" emissiveIntensity={0.9} color="#223060" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={cool} args={[undefined, undefined, Math.max(1, nC)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={texC} emissiveMap={texC} emissive="#ffffff" emissiveIntensity={0.9} color="#1c2a58" roughness={0.9} />
      </instancedMesh>
    </group>
  );
};

// ──────────────────────────────────────────────── cœur hexagonal géant
export const CoreHex: React.FC<{ position: [number, number, number]; t: number; radius?: number; spin?: number; pulse?: number; color?: string }> = ({ position, t, radius = 22, spin = 1, pulse = 1, color = P2.orange }) => {
  const p = 0.85 + 0.15 * Math.sin(t * 1.8) * pulse;
  return (
    <group position={position}>
      {/* prisme central sombre à arêtes lumineuses */}
      <mesh rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[radius * 0.55, radius * 0.55, radius * 0.5, 6]} />
        <meshStandardMaterial color="#1a1030" emissive={color} emissiveIntensity={0.45} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[radius * 0.56, radius * 0.56, radius * 0.5, 6, 1, true]} />
        <meshBasicMaterial color={color} wireframe toneMapped={false} />
      </mesh>
      {/* noyau */}
      <mesh scale={p}>
        <sphereGeometry args={[radius * 0.24, 24, 16]} />
        <meshBasicMaterial color={P2.cream} toneMapped={false} />
      </mesh>
      {/* trois anneaux hexagonaux en rotation */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[i * 0.9 + t * 0.12 * spin * (i % 2 ? -1 : 1), t * 0.2 * spin + i, i * 0.6]}>
          <torusGeometry args={[radius * (0.75 + i * 0.16), radius * 0.03, 6, 6]} />
          <meshBasicMaterial color={i === 1 ? P2.cream : color} toneMapped={false} />
        </mesh>
      ))}
      {/* faisceau vertical */}
      <mesh position={[0, radius * 3, 0]}>
        <cylinderGeometry args={[radius * 0.06, radius * 0.12, radius * 6, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={color} intensity={400 * p} distance={radius * 9} decay={1.6} />
    </group>
  );
};

// ──────────────────────────────────────────────── piliers de lumière
export const LightPillars: React.FC<{ positions: [number, number, number][]; t: number; color?: string; h?: number }> = ({ positions, t, color = P2.violet, h = 90 }) => (
  <group>
    {positions.map((p, i) => (
      <mesh key={i} position={[p[0], p[1] + h / 2, p[2]]}>
        <cylinderGeometry args={[0.5, 1.4, h, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.16 + 0.06 * Math.sin(t * 1.3 + i)} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </group>
);

// ──────────────────────────────────────────────── particules flottantes (points)
export const Motes: React.FC<{ t: number; count?: number; center?: [number, number, number]; spread?: [number, number, number]; size?: number; seed?: number; color?: string; opacity?: number }> = ({ t, count = 1500, center = [0, 20, 0], spread = [300, 40, 300], size = 0.7, seed = 4, color = P2.cream, opacity = 0.75 }) => {
  const ref = useRef<THREE.Points>(null);
  const base = useMemo(() => {
    const r = rng(seed);
    const arr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      arr[i * 4] = center[0] + (r() - 0.5) * spread[0];
      arr[i * 4 + 1] = center[1] + (r() - 0.5) * spread[1];
      arr[i * 4 + 2] = center[2] + (r() - 0.5) * spread[2];
      arr[i * 4 + 3] = r() * Math.PI * 2;
    }
    return arr;
  }, [count, center, spread, seed]);
  const pos = useMemo(() => new Float32Array(count * 3), [count]);
  useLayoutEffect(() => {
    for (let i = 0; i < count; i++) {
      const ph = base[i * 4 + 3];
      pos[i * 3] = base[i * 4] + Math.sin(t * 0.3 + ph) * 1.5;
      pos[i * 3 + 1] = base[i * 4 + 1] + Math.sin(t * 0.5 + ph * 1.7) * 1.2;
      pos[i * 3 + 2] = base[i * 4 + 2] + Math.cos(t * 0.25 + ph) * 1.5;
    }
    const g = ref.current?.geometry;
    if (g) {
      const attr = g.getAttribute("position") as THREE.BufferAttribute;
      if (attr) attr.needsUpdate = true;
    }
  }, [t, base, count, pos]);
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </points>
  );
};

// ──────────────────────────────────────────────── ciel (sphère dégradée + étoiles)
export const Sky: React.FC<{ dawn?: number }> = ({ dawn = 0 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(
        512,
        (g, s) => {
          const grad = g.createLinearGradient(0, 0, 0, s);
          grad.addColorStop(0, P2.sky3);
          grad.addColorStop(0.45, P2.sky1);
          grad.addColorStop(0.62, P2.sky2);
          grad.addColorStop(0.75, "#0a0c22");
          grad.addColorStop(1, "#05061a");
          g.fillStyle = grad;
          g.fillRect(0, 0, s, s);
          const r = rng(77);
          for (let i = 0; i < 700; i++) {
            const y = r() * s * 0.6;
            g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
            g.fillRect(r() * s, y, r() < 0.1 ? 2 : 1, r() < 0.1 ? 2 : 1);
          }
        },
        1,
        false
      ),
    []
  );
  return (
    <group>
      <mesh>
        <sphereGeometry args={[900, 32, 24]} />
        <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {dawn > 0 && (
        <mesh>
          <sphereGeometry args={[880, 32, 24]} />
          <meshBasicMaterial color={P2.dawn} side={THREE.BackSide} transparent opacity={0.55 * dawn} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

export const Fog2: React.FC<{ near?: number; far?: number; color?: string }> = ({ near = 40, far = 420, color = P2.fog }) => <fog attach="fog" args={[color, near, far]} />;

/** Éclairage : hémisphère froide + ambiance + clé chaude avec ombres (suit les personnages) + contre-jour. */
export const Lights2: React.FC<{ keyPos?: [number, number, number]; target?: [number, number, number]; warm?: number; dawn?: number }> = ({ keyPos = [8, 12, 10], target = [0, 1, 0], warm = 1, dawn = 0 }) => {
  const key = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    if (key.current) {
      key.current.target.position.set(...target);
      key.current.target.updateMatrixWorld();
    }
  }, [target]);
  return (
    <>
      <hemisphereLight args={["#3a4a8a", "#1a1420", 0.75 + dawn * 0.4]} />
      <ambientLight color="#2a2c48" intensity={0.55} />
      <directionalLight ref={key} position={keyPos} color={dawn > 0 ? "#ffd8b0" : "#ffe0b8"} intensity={2.4 * warm + dawn * 1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={80} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-bias={-0.0004} />
      <directionalLight position={[-12, 8, -6]} color="#6f8fff" intensity={0.7} />
      <directionalLight position={[0, 6, -14]} color="#ff9a5c" intensity={0.9} />
    </>
  );
};
