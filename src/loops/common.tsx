/**
 * Briques communes des écrans de live (boucles de 60 s, 1800 images) : ciel dégradé, soleil, nuages,
 * oiseaux, cocotiers aux palmes arquées, arbres, rochers, karsts, textures canvas, matériaux.
 * RÈGLE DE BOUCLE : toute animation est périodique avec un nombre ENTIER de cycles par boucle
 * (cyc/frac), et aucun événement ne traverse le point de raccord (T = 0 ≡ T = LOOP).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { loadFont } from "@remotion/google-fonts/Poppins";

export const LOOP = 60; // secondes
export const FPS = 30;
export const FRAMES = LOOP * FPS;
/** Phase périodique : k cycles par boucle. */
export const cyc = (T: number, k: number, phase = 0) => Math.sin((2 * Math.PI * k * T) / LOOP + phase);
/** Fraction périodique 0→1, k fois par boucle. */
export const frac = (T: number, k = 1, phase = 0) => ((((k * T) / LOOP + phase) % 1) + 1) % 1;
/** Temps « personnage » tel que les cycles de marche (6,2 rad/s) tombent juste : `cycles` cycles par boucle. */
export const walkTime = (T: number, cycles = 60) => (T * 2 * Math.PI * cycles) / (6.2 * LOOP);

export const { fontFamily: POPPINS } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });
export const BRAND = "MA CHAÎNE";

export const Flat: React.FC<{ color: string; rough?: number; emissive?: string; ei?: number }> = ({ color, rough = 0.9, emissive = "#000000", ei = 0 }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} flatShading emissive={emissive} emissiveIntensity={ei} />
);
export const Smooth: React.FC<{ color: string; rough?: number; emissive?: string; ei?: number }> = ({ color, rough = 0.8, emissive = "#000000", ei = 0 }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} emissive={emissive} emissiveIntensity={ei} />
);

export function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  paint(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}
export function rngOf(seed: number) {
  let s = (seed * 9973) % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Ciel en dégradé (sphère vue de l'intérieur). */
export const Sky: React.FC<{ top: string; horizon: string; bottom?: string; radius?: number }> = ({ top, horizon, bottom = "#d9e6ef", radius = 600 }) => {
  const uniforms = useMemo(
    () => ({ top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) }, bottom: { value: new THREE.Color(bottom) } }),
    [top, horizon, bottom]
  );
  return (
    <mesh>
      <sphereGeometry args={[radius, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vW;
          void main(){ float h = normalize(vW).y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }`}
      />
    </mesh>
  );
};

export const Sun: React.FC<{ position: [number, number, number]; r?: number; color?: string }> = ({ position, r = 14, color = "#fff3c4" }) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[r, 24, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <mesh>
      <sphereGeometry args={[r * 2.2, 24, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} toneMapped={false} depthWrite={false} />
    </mesh>
    <mesh>
      <sphereGeometry args={[r * 4, 24, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.07} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>
);

/** Nuages doux qui dérivent d'exactement une largeur de champ par boucle (raccord parfait). */
export const Clouds: React.FC<{ T: number; z?: number; y?: number; span?: number; count?: number; seed?: number; tint?: string }> = ({ T, z = -220, y = 42, span = 320, count = 5, seed = 3, tint = "#ffffff" }) => {
  const list = useMemo(() => {
    const rnd = rngOf(seed);
    return Array.from({ length: count }, (_, i) => ({
      x0: (i / count) * span - span / 2 + rnd() * 30,
      y: y + rnd() * 14,
      sc: 1 + rnd() * 1.4,
      puffs: Array.from({ length: 5 + Math.floor(rnd() * 3) }, () => ({ dx: (rnd() - 0.5) * 18, dy: (rnd() - 0.5) * 3, r: 3.5 + rnd() * 3.5 })),
    }));
  }, [count, span, y, seed]);
  return (
    <group>
      {list.map((c, i) => {
        const x = ((c.x0 + (T / LOOP) * span + span / 2 + span * 10) % span) - span / 2;
        return (
          <group key={i} position={[x, c.y, z]} scale={c.sc}>
            {c.puffs.map((p, j) => (
              <mesh key={j} position={[p.dx, p.dy, 0]}>
                <sphereGeometry args={[p.r, 12, 9]} />
                <meshStandardMaterial color={tint} roughness={1} emissive={tint} emissiveIntensity={0.3} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/** Vol d'oiseaux en V, `passes` traversées par boucle (hors champ au raccord). */
export const Birds: React.FC<{ T: number; z?: number; y?: number; span?: number; passes?: number; count?: number; dir?: 1 | -1; phase?: number }> = ({ T, z = -40, y = 14, span = 90, passes = 2, count = 5, dir = 1, phase = 0 }) => {
  const x = (frac(T, passes, phase) * span - span / 2) * dir;
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: count }, (_, i) => {
        const k = i - (count - 1) / 2;
        const flap = cyc(T, 120, i) * 0.7;
        return (
          <group key={i} position={[-Math.abs(k) * 1.4 * dir, Math.abs(k) * 0.2, k * 1.1]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.3, 0, 0]} rotation={[0, 0, s * flap]}>
                <boxGeometry args={[0.65, 0.04, 0.16]} />
                <meshStandardMaterial color="#2a2a33" roughness={1} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/** Cocotier : tronc incliné en segments, 11 palmes arquées en trois tronçons, noix. Balancement k cycles/boucle. */
export const Palm: React.FC<{ position: [number, number, number]; T: number; rotationY?: number; scale?: number; lean?: number; phase?: number; k?: number }> = ({ position, T, rotationY = 0, scale = 1, lean = 0.2, phase = 0, k = 10 }) => {
  const sway = cyc(T, k, phase) * 0.045;
  const segs = 8;
  const top: [number, number, number] = [Math.sin(lean) * segs * 0.75 * 0.65, segs * 0.75 + 0.2, 0];
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {Array.from({ length: segs }, (_, i) => (
        <group key={i} position={[Math.sin(lean) * i * 0.75 * 0.65, i * 0.75, 0]} rotation={[0, 0, -lean * (i / segs)]}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.15 - i * 0.01, 0.19 - i * 0.01, 0.85, 8]} />
            <Smooth color={i % 2 ? "#8a6a48" : "#7a5c3e"} />
          </mesh>
        </group>
      ))}
      <group position={top} rotation={[sway, 0, -lean + sway * 0.5]}>
        {Array.from({ length: 11 }, (_, i) => {
          const a = (i / 11) * Math.PI * 2;
          const droop = -0.35 - (i % 2) * 0.25 + cyc(T, k, phase + i) * 0.035;
          const col = i % 3 === 0 ? "#3f9a4c" : i % 3 === 1 ? "#58b35f" : "#2f8a40";
          return (
            <group key={i} rotation={[0, a, 0]}>
              <group rotation={[0, 0, droop]} position={[0.2, 0, 0]}>
                {[0, 1, 2].map((j) => (
                  <group key={j} position={[j * 1.1, 0, 0]} rotation={[0, 0, -0.28 * j]}>
                    <mesh castShadow position={[0.6, 0, 0]}>
                      <boxGeometry args={[1.2, 0.05, 0.62 - j * 0.16]} />
                      <Smooth color={col} />
                    </mesh>
                    {/* folioles : deux ailes fines de part et d'autre */}
                    {[-1, 1].map((s) => (
                      <mesh key={s} position={[0.6, -0.02, s * (0.42 - j * 0.1)]} rotation={[s * 0.35, 0, 0]}>
                        <boxGeometry args={[1.1, 0.03, 0.28 - j * 0.06]} />
                        <Smooth color={col} />
                      </mesh>
                    ))}
                  </group>
                ))}
              </group>
            </group>
          );
        })}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.6) * 0.3, -0.3, Math.sin(i * 1.6) * 0.3]}>
            <sphereGeometry args={[0.2, 10, 8]} />
            <Smooth color="#6d4b2a" />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Arbre feuillu low-poly (tronc + 3-4 boules de feuillage). */
export const Tree: React.FC<{ position: [number, number, number]; scale?: number; seed?: number; T?: number; k?: number }> = ({ position, scale = 1, seed = 1, T = 0, k = 6 }) => {
  const parts = useMemo(() => {
    const rnd = rngOf(seed);
    return Array.from({ length: 4 }, (_, i) => ({ x: (rnd() - 0.5) * 1.6, y: 2.2 + rnd() * 1.4 + i * 0.3, z: (rnd() - 0.5) * 1.6, r: 1.1 + rnd() * 0.8, c: ["#2f8a40", "#3f9a4c", "#58b35f", "#2a7a3a"][i % 4] }));
  }, [seed]);
  const sway = cyc(T, k, seed) * 0.02;
  return (
    <group position={position} scale={scale} rotation={[0, 0, sway]}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 2.2, 7]} />
        <Smooth color="#6b4a2e" />
      </mesh>
      {parts.map((p, i) => (
        <mesh key={i} castShadow position={[p.x, p.y, p.z]}>
          <icosahedronGeometry args={[p.r, 1]} />
          <Flat color={p.c} />
        </mesh>
      ))}
    </group>
  );
};

/** Rocher low-poly. */
export const Rock: React.FC<{ position: [number, number, number]; scale?: number | [number, number, number]; seed?: number; color?: string }> = ({ position, scale = 1, seed = 1, color = "#8a8f94" }) => (
  <mesh position={position} scale={scale} rotation={[0, seed * 1.3, 0]} castShadow receiveShadow>
    <dodecahedronGeometry args={[1, 1]} />
    <Flat color={color} />
  </mesh>
);

/** Rideau de montagnes karstiques (pics arrondis) en couches, dans la brume. */
export const Karsts: React.FC<{ z?: number; span?: number; count?: number; seed?: number; color?: string; hMin?: number; hMax?: number }> = ({ z = -200, span = 600, count = 14, seed = 5, color = "#3d6b57", hMin = 40, hMax = 110 }) => {
  const list = useMemo(() => {
    const rnd = rngOf(seed);
    return Array.from({ length: count }, (_, i) => ({ x: (i / count) * span - span / 2 + (rnd() - 0.5) * 20, h: hMin + rnd() * (hMax - hMin), w: 18 + rnd() * 26, lean: (rnd() - 0.5) * 0.2 }));
  }, [count, span, seed, hMin, hMax]);
  return (
    <group position={[0, 0, z]}>
      {list.map((m, i) => (
        <group key={i} position={[m.x, 0, 0]} rotation={[0, 0, m.lean]}>
          <mesh position={[0, m.h / 2, 0]}>
            <cylinderGeometry args={[m.w * 0.35, m.w, m.h, 7]} />
            <Smooth color={color} />
          </mesh>
          <mesh position={[0, m.h - 2, 0]}>
            <sphereGeometry args={[m.w * 0.38, 10, 7]} />
            <Smooth color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
