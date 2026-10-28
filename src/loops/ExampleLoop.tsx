/**
 * ExampleLoop — boucle PARFAITE de 60 s pour un écran de live : le personnage, de dos, marche sur une route
 * de montagne. Tapis roulant périodique (le décor défile d'exactement une période DIST par boucle), nuages
 * qui dérivent d'une largeur de champ par boucle, oiseaux, un éléphant qui traverse AU MILIEU de la boucle
 * (jamais au raccord). Toute fréquence est un nombre entier de cycles par boucle (cyc / frac / CT).
 * Vérification : node scripts/check-loop.py out/loop.mp4
 */
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Person } from "../characters";
import { LOOP, BRAND, POPPINS, Sky, Clouds, Birds, Palm, Tree, Rock, Karsts, Flat, Smooth, canvasTexture, cyc, rngOf } from "./common";

const DIST = 72; // mètres parcourus par boucle
const V = DIST / LOOP; // 1,2 m/s
/** Temps « personnage » : toute fréquence f (rad/s) fait 10·f cycles par boucle (entier). */
const CT = (T: number) => (T * Math.PI) / 3;
/** Position d'un élément du tapis roulant : toujours dans [-64, 8), identique en T = 0 et T = LOOP. */
const treadZ = (z0: number, T: number) => ((((z0 + V * T + 64) % DIST) + DIST) % DIST) - 64;
const smooth = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };

// ──────────────────────────────────────────────── textures
function useRoadTexture() {
  return useMemo(
    () =>
      canvasTexture(256, 512, (g) => {
        g.fillStyle = "#4a4d55";
        g.fillRect(0, 0, 256, 512);
        const rnd = rngOf(11);
        for (let i = 0; i < 2500; i++) {
          g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
          g.fillRect(rnd() * 256, rnd() * 512, 2, 2);
        }
        // bandes latérales blanches + tirets centraux (une période de 6 m par tuile)
        g.fillStyle = "#e9e6dc";
        g.fillRect(10, 0, 8, 512);
        g.fillRect(238, 0, 8, 512);
        g.fillStyle = "#f2d35b";
        g.fillRect(122, 40, 12, 230);
      }),
    []
  );
}
function useBackTexture() {
  return useMemo(
    () =>
      canvasTexture(512, 512, (g) => {
        g.clearRect(0, 0, 512, 512);
        g.fillStyle = "#ff3d3d";
        g.beginPath();
        g.roundRect(196, 118, 120, 84, 22);
        g.fill();
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.moveTo(240, 140);
        g.lineTo(288, 160);
        g.lineTo(240, 180);
        g.closePath();
        g.fill();
        g.fillStyle = "#1c1c22";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = "800 76px Poppins, Segoe UI, Arial, sans-serif";
        g.fillText(BRAND, 256, 296);
      }),
    []
  );
}
// ──────────────────────────────────────────────── route (tirets qui défilent : 12 périodes par boucle)
const Road: React.FC<{ T: number }> = ({ T }) => {
  const tex = useRoadTexture();
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useLayoutEffect(() => {
    tex.repeat.set(1, 240 / 6);
    tex.offset.set(0, -(V * T) / 6);
    tex.needsUpdate = true;
  }, [T, tex]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -100]} receiveShadow>
        <planeGeometry args={[7, 240]} />
        <meshStandardMaterial ref={ref} map={tex} roughness={0.95} />
      </mesh>
      {/* bas-côtés en terre et herbe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -100]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <Smooth color="#6f9a46" rough={1} />
      </mesh>
      {[-4.6, 4.6].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, -100]} receiveShadow>
          <planeGeometry args={[2.2, 240]} />
          <Smooth color="#b08a5a" rough={1} />
        </mesh>
      ))}
    </group>
  );
};

// ──────────────────────────────────────────────── personnage de dos, nom de la chaîne dans le dos
const Walker: React.FC<{ T: number }> = ({ T }) => {
  const back = useBackTexture();
  const t = CT(T);
  const bob = Math.abs(Math.sin(t * 6.2)) * 0.05;
  return (
    <group position={[0.9, 0, 0]}>
      <Person position={[0, 0, 0]} rotationY={Math.PI} t={t} pose="walk" mood="happy" />
      <mesh position={[0, 1.4 + bob, 0.255]}>
        <planeGeometry args={[0.66, 0.66]} />
        <meshStandardMaterial map={back} transparent roughness={0.9} />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────── éléphant qui traverse (T 22 → 34, sur le tapis roulant)
const Elephant: React.FC<{ T: number }> = ({ T }) => {
  const k = (T - 22) / 12;
  if (k < -0.02 || k > 1.02) return null;
  const x = 17 - 34 * smooth(k);
  const z = treadZ(-80, T);
  const step = cyc(T, 60); // 60 pas par boucle
  const legs = [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]];
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 2.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[1.15, 2.2, 8, 16]} />
        <Smooth color="#8e8c94" />
      </mesh>
      <group position={[0, 2.5, 1.9]}>
        <mesh castShadow>
          <sphereGeometry args={[0.95, 16, 12]} />
          <Smooth color="#8e8c94" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.95, 0.1, -0.1]} rotation={[0, s * 0.5, s * 0.2 + step * 0.08 * s]}>
            <boxGeometry args={[0.12, 1.3, 1.1]} />
            <Smooth color="#7f7d86" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={"e" + s} position={[s * 0.4, 0.25, 0.8]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <Smooth color="#15131a" />
          </mesh>
        ))}
        {/* trompe en 5 segments qui se balance */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={"t" + i} position={[Math.sin(step * 0.3) * i * 0.08, -0.45 - i * 0.42, 0.75 + i * 0.12 - i * i * 0.03]} rotation={[0.15 * i, 0, 0]}>
            <cylinderGeometry args={[0.26 - i * 0.035, 0.3 - i * 0.035, 0.48, 10]} />
            <Smooth color="#8e8c94" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={"d" + s} position={[s * 0.35, -0.35, 0.85]} rotation={[0.6, 0, s * 0.3]}>
            <cylinderGeometry args={[0.04, 0.09, 0.7, 8]} />
            <Smooth color="#f3ecd8" />
          </mesh>
        ))}
      </group>
      {legs.map(([lx, lz], i) => (
        <mesh key={i} position={[lx * 0.5, 0.95, lz]} rotation={[step * 0.35 * (i % 2 ? 1 : -1), 0, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.38, 1.9, 10]} />
          <Smooth color="#86848c" />
        </mesh>
      ))}
      <mesh position={[0, 2.3, -2.2]} rotation={[0.5 + step * 0.2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 1.2, 6]} />
        <Smooth color="#7f7d86" />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────── décor du tapis roulant (périodique sur DIST)
type Item = { kind: "tree" | "palm" | "rock" | "bush" | "post"; x: number; z0: number; s: number; seed: number };
const ITEMS: Item[] = (() => {
  const rnd = rngOf(23);
  const out: Item[] = [];
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const kind: Item["kind"] = rnd() < 0.72 ? "tree" : "palm";
    out.push({ kind, x: side * (6.5 + rnd() * 9), z0: -64 + rnd() * DIST, s: 0.8 + rnd() * 0.9, seed: i + 1 });
  }
  for (let i = 0; i < 14; i++) out.push({ kind: "rock", x: (i % 2 ? 1 : -1) * (5.2 + rnd() * 5), z0: -64 + rnd() * DIST, s: 0.35 + rnd() * 0.9, seed: 100 + i });
  for (let i = 0; i < 18; i++) out.push({ kind: "bush", x: (i % 2 ? 1 : -1) * (4.6 + rnd() * 4), z0: -64 + rnd() * DIST, s: 0.4 + rnd() * 0.5, seed: 200 + i });
  for (let i = 0; i < 12; i++) out.push({ kind: "post", x: (i % 2 ? 1 : -1) * 4.1, z0: -64 + (i / 12) * DIST, s: 1, seed: 300 + i });
  return out;
})();
const TreadItem: React.FC<{ it: Item; T: number }> = ({ it, T }) => {
  const z = treadZ(it.z0, T);
  if (z > 7) return null;
  switch (it.kind) {
    case "tree":
      return <Tree position={[it.x, 0, z]} scale={it.s} seed={it.seed} T={T} />;
    case "palm":
      return <Palm position={[it.x, 0, z]} T={T} scale={it.s * 0.8} rotationY={it.seed} lean={0.2} phase={it.seed} />;
    case "rock":
      return <Rock position={[it.x, it.s * 0.5, z]} scale={it.s} seed={it.seed} />;
    case "bush":
      return (
        <mesh position={[it.x, it.s * 0.6, z]} scale={it.s} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <Flat color={it.seed % 2 ? "#3f9a4c" : "#2f8a40"} />
        </mesh>
      );
    case "post":
    default:
      return (
        <group position={[it.x, 0, z]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.16, 0.9, 0.16]} />
            <Smooth color="#f2efe6" />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[0.17, 0.2, 0.17]} />
            <Smooth color="#e0362f" />
          </mesh>
        </group>
      );
  }
};

// ──────────────────────────────────────────────── montagnes proches (statiques) + brume
const Hills: React.FC = () => (
  <group>
    {[[-70, -120, 60, 34], [70, -140, 70, 40], [-130, -180, 90, 50], [140, -190, 80, 46], [0, -230, 120, 56]].map(([x, z, w, h], i) => (
      <group key={i} position={[x, 0, z]}>
        <mesh position={[0, h / 2, 0]}>
          <coneGeometry args={[w, h, 9]} />
          <Smooth color={i % 2 ? "#3e7d52" : "#357048"} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 14, -150]}>
      <planeGeometry args={[600, 40]} />
      <meshBasicMaterial color="#d8e8f0" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  </group>
);

function lookQuat(pos: [number, number, number], look: [number, number, number]) {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...pos), new THREE.Vector3(...look), new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
const RoadScene: React.FC<{ T: number }> = ({ T }) => {
  const pos: [number, number, number] = [2.3 + 0.1 * cyc(T, 1), 2.7 + 0.06 * cyc(T, 1, 1.5), 6.4];
  const look: [number, number, number] = [0.5, 1.5, -16];
  const quat = useMemo(() => lookQuat(pos, look), [pos[0], pos[1], pos[2]]);
  return (
    <>
      <PerspectiveCamera makeDefault fov={42} near={0.1} far={1500} position={pos} quaternion={quat} />
      <Sky top="#3f86d8" horizon="#dbeefc" bottom="#9fc3a0" />
      <hemisphereLight args={["#cfe4ff", "#5e8a46", 0.75]} />
      <ambientLight color="#dfe8ff" intensity={0.25} />
      <directionalLight position={[-24, 38, -18]} color="#fff2dc" intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-near={1} shadow-camera-far={120} shadow-bias={-0.0004} />
      <directionalLight position={[20, 12, 20]} color="#cfe0ff" intensity={0.5} />
      <fog attach="fog" args={["#d6e7ee", 70, 300]} />
      <Karsts z={-320} span={700} count={16} seed={5} color="#4d7f7a" hMin={50} hMax={130} />
      <Hills />
      <Clouds T={T} z={-300} y={70} span={560} count={7} seed={2} />
      <Birds T={T} z={-110} y={34} span={240} passes={2} count={6} dir={1} phase={0.25} />
      <Road T={T} />
      {ITEMS.map((it, i) => (
        <TreadItem key={i} it={it} T={T} />
      ))}
          <Elephant T={T} />
      <Walker T={T} />
    </>
  );
};

export const ExampleLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const T = frame / fps;
  const pulse = 0.55 + 0.45 * Math.max(0, cyc(T, 60));
  return (
    <AbsoluteFill style={{ background: "#dbeefc", fontFamily: POPPINS }}>
      <ThreeCanvas width={width} height={height} dpr={1} shadows="percentage" gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: THREE.SRGBColorSpace }}>
        <RoadScene T={T} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 56, top: 48 }}>
        <div style={{ color: "#fff", fontSize: 66, fontWeight: 800, letterSpacing: 3, textShadow: "0 6px 28px rgba(0,0,0,0.55)" }}>MERCI D'AVOIR SUIVI LE LIVE</div>
        <div style={{ color: "#fff", fontSize: 34, fontWeight: 600, marginTop: 8, textShadow: "0 3px 14px rgba(0,0,0,0.5)" }}>À la prochaine 👋</div>
      </div>
      <div style={{ position: "absolute", right: 56, top: 52, display: "flex", alignItems: "center", gap: 14, background: "rgba(10,8,14,0.55)", padding: "12px 22px", borderRadius: 999, backdropFilter: "blur(6px)" }}>
        <div style={{ width: 16, height: 16, borderRadius: 999, background: `rgba(255,70,70,${pulse})`, boxShadow: `0 0 ${12 * pulse}px rgba(255,70,70,0.9)` }} />
        <div style={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>{BRAND}</div>
      </div>
    </AbsoluteFill>
  );
};
