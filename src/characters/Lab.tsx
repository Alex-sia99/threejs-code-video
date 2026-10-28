/**
 * Atelier personnages : rendu 3D à côté de la référence (VOTRE photo dans public/characters/ref.jpg, ou le sprite de la mascotte) pour comparer
 * et itérer jusqu'à la ressemblance. Vues : face (3/4 comme la photo), front, profile, body, claude, duo.
 *   npx remotion still src/index.ts CharacterLab out/lab.png --frame=0 --props='{"view":"face"}' --gl=angle
 */
import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { z } from "zod";
import { Person, PERSON } from "./Person";
import { Mascot, MASCOT, MASCOT_PIXELS } from "./Mascot";

export const labSchema = z.object({
  view: z.enum(["face", "front", "profile", "body", "claude", "duo"]),
  yaw: z.number(),
  tilt: z.number(),
  mood: z.enum(["neutral", "happy", "surprised", "tired", "focused", "wow"]),
  talk: z.number(),
});
export type LabProps = z.infer<typeof labSchema>;
export const LAB_FPS = 30;

function lookQuat(pos: [number, number, number], look: [number, number, number]) {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...pos), new THREE.Vector3(...look), new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

const Scene: React.FC<LabProps & { t: number; aspect: number }> = ({ view, yaw, tilt, mood, talk, t, aspect }) => {
  const headY = PERSON.headY;
  const cam = useMemo(() => {
    switch (view) {
      case "face": return { pos: [0.1, headY + 0.05, 2.55] as [number, number, number], look: [0, headY - 0.02, 0] as [number, number, number], fov: 32 };
      case "front": return { pos: [0, headY, 2.6] as [number, number, number], look: [0, headY - 0.02, 0] as [number, number, number], fov: 32 };
      case "profile": return { pos: [2.6, headY, 0] as [number, number, number], look: [0, headY - 0.02, 0] as [number, number, number], fov: 32 };
      case "body": return { pos: [0.6, 1.6, 6.6] as [number, number, number], look: [0, 1.4, 0] as [number, number, number], fov: 30 };
      case "claude": return { pos: [1.6, 1.5, 4.6] as [number, number, number], look: [0, 0.4, 0] as [number, number, number], fov: 30 };
      default: return { pos: [0.4, 1.7, 7.2] as [number, number, number], look: [0, 1.35, 0] as [number, number, number], fov: 32 };
    }
  }, [view, headY]);
  const quat = useMemo(() => lookQuat(cam.pos, cam.look), [cam]);
  const yawEff = view === "profile" ? 0 : yaw;
  return (
    <>
      <PerspectiveCamera makeDefault fov={cam.fov} aspect={aspect} near={0.05} far={60} position={cam.pos} quaternion={quat} />
      <color attach="background" args={["#232a3c"]} />
      <hemisphereLight args={["#dfe6ff", "#4a3a2c", 0.7]} />
      <ambientLight color="#9aa2bb" intensity={0.3} />
      <directionalLight position={[-2.2, 3.6, 4.2]} color="#fff0dc" intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} />
      <directionalLight position={[3.5, 2.0, 2.5]} color="#a9bcff" intensity={0.9} />
      <directionalLight position={[1.5, 3, -4]} color="#ffd2a4" intensity={1.6} />
      <pointLight position={[0, 2.2, 2.4]} color="#ffe2c4" intensity={2.5} distance={6} decay={2} />
      {/* sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1e2330" roughness={1} />
      </mesh>
      {view === "claude" ? (
        <Mascot position={[0, 0, 0]} rotationY={yaw} t={t} unit={0.13} talk={talk} glow={1} />
      ) : view === "duo" ? (
        <>
          <Person position={[-0.95, 0, 0]} rotationY={0.35} t={t} mood={mood} talk={talk} turnHead={0.2} />
          <Mascot position={[1.0, 1.35, 0]} rotationY={-0.5} t={t} unit={0.13} float talk={talk} />
        </>
      ) : (
        <Person position={[0, 0, 0]} rotationY={yawEff} t={t} mood={mood} talk={talk} turnHead={view === "face" ? 0.1 : 0} tiltHead={view === "face" ? tilt : 0} />
      )}
    </>
  );
};

const Pixels: React.FC = () => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${MASCOT_PIXELS[0].length}, 36px)`, gap: 0, background: "#0d0d0d", padding: 40, borderRadius: 16 }}>
    {MASCOT_PIXELS.flatMap((row, y) => row.map((v, x) => <div key={`${x}-${y}`} style={{ width: 36, height: 36, background: v ? MASCOT.orange : "transparent" }} />))}
  </div>
);

export const CharacterLab: React.FC<LabProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const half = Math.floor(width / 2);
  const showRef = props.view !== "duo";
  const w3d = showRef ? width - half : width;
  return (
    <AbsoluteFill style={{ background: "#14171f", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      {showRef && (
        <div style={{ position: "absolute", left: 0, top: 0, width: half, height, overflow: "hidden", background: "#0f1116" }}>
          {props.view === "claude" ? (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pixels />
            </div>
          ) : props.view === "body" ? (
            <Img src={staticFile("characters/ref.jpg")} style={{ position: "absolute", width: half * 1.6, maxWidth: "none", left: -half * 0.3, top: 60 }} />
          ) : (
            <Img src={staticFile("characters/ref.jpg")} style={{ position: "absolute", width: 3072, maxWidth: "none", left: -933, top: -62 }} />
          )}
          <div style={{ position: "absolute", left: 24, top: 20, color: "#fff", fontSize: 30, fontWeight: 700, textShadow: "0 2px 8px #000" }}>RÉFÉRENCE</div>
        </div>
      )}
      <div style={{ position: "absolute", left: showRef ? half : 0, top: 0, width: w3d, height }}>
        <ThreeCanvas width={w3d} height={height} dpr={1} shadows="percentage" gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: THREE.SRGBColorSpace }}>
          <Scene {...props} t={t} aspect={w3d / height} />
        </ThreeCanvas>
        <div style={{ position: "absolute", left: 24, top: 20, color: "#fff", fontSize: 30, fontWeight: 700, textShadow: "0 2px 8px #000" }}>3D · {props.view}</div>
      </div>
    </AbsoluteFill>
  );
};
