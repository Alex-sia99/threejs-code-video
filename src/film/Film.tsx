/**
 * ExampleFilm — mini-film de 20 s qui montre le pipeline complet : timeline (script.json → scripts/tts.js ou
 * scripts/timeline-placeholder.js), monde néon, personnage + mascotte qui parlent (bouche et rebond pilotés
 * par l'enveloppe de la voix), caméra par plan calée sur les répliques (at("lNN")), sous-titres, flash de
 * transition, carte titre. Copiez ce fichier pour démarrer votre propre film.
 */
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { FPS, TIMELINE, TOTAL_FRAMES, at, sceneAt, sceneById, amp, moodAt, subtitleAt, ramp, easeOut, easeIn, ease, lerp, mix3, window01, V3 } from "./timeline";
import { Sky, GridFloor, Skyline, CoreHex, Motes, LightPillars, Fog2, Lights2, P2 } from "../world/World";
import { Person, Mascot } from "../characters";

export const FILM_FPS = FPS;
export const FILM_FRAMES = TOTAL_FRAMES;
const { fontFamily } = loadFont("normal", { weights: ["600", "800"], subsets: ["latin", "latin-ext"] });
const ORANGE = "#ff7a1a";
const CORE: V3 = [0, 14, -150];
const CLEARINGS = [{ x: 0, z: 0, r: 40 }, { x: 0, z: -150, r: 62 }];
const PILLARS: V3[] = [[-40, 0, -70], [40, 0, -70], [-120, 0, -90], [120, 0, -90], [-150, 0, 20], [150, 0, 20]];
const PERSON_POS: V3 = [-1.3, 0, 0];
const MASCOT_POS: V3 = [1.5, 1.5, 0.2];

// ──────────────────────────────────────────────── caméra : liste de plans calés sur les répliques
interface Cam { pos: V3; look: V3; fov: number }
interface Shot { a: number; b: number; from: Cam; to: Cam; fn?: (x: number) => number }
const cam = (pos: V3, look: V3, fov = 40): Cam => ({ pos, look, fov });
const lin = (x: number) => Math.max(0, Math.min(1, x));
/** Gros plan : base au sol du personnage, orientation (rad), hauteur de la tête, distance, décalage latéral. */
function cu(base: V3, rot: number, h: number, dist = 2.7, side = 0.8, fov = 28): Cam {
  const dx = Math.sin(rot), dz = Math.cos(rot);
  const px = Math.cos(rot), pz = -Math.sin(rot);
  return cam([base[0] + dx * dist + px * side, base[1] + h + 0.08, base[2] + dz * dist + pz * side], [base[0], base[1] + h, base[2]], fov);
}
function pick(shots: Shot[], t: number): Cam {
  let s = shots[0];
  for (const x of shots) if (t >= x.a) s = x;
  const k = (s.fn || ease)((t - s.a) / Math.max(0.0001, s.b - s.a));
  return { pos: mix3(s.from.pos, s.to.pos, k), look: mix3(s.from.look, s.to.look, k), fov: lerp(s.from.fov, s.to.fov, k) };
}
function cameraAt(t: number): Cam {
  const title = sceneById("title");
  return pick(
    [
      { a: 0, b: at("l01"), from: cam([0, 2.2, 7.5], [0, 1.8, 0], 36), to: cam([0.3, 2.3, 6], [0, 1.9, 0], 34), fn: easeOut },
      { a: at("l01"), b: at("l02"), from: cu(PERSON_POS, 0.75, 2.4, 2.8, 0.9, 27), to: cu(PERSON_POS, 0.75, 2.4, 2.5, 0.8, 27), fn: lin },
      { a: at("l02"), b: at("l03"), from: cu(MASCOT_POS, -0.8, 0.52, 4.8, -1.1, 30), to: cu(MASCOT_POS, -0.8, 0.52, 4.3, -0.9, 30), fn: lin },
      { a: at("l03"), b: title.start, from: cam([0.3, 2.4, 6.5], [0, 1.8, 0], 34), to: cam([2, 30, 70], [0, 12, -80], 52), fn: ease },
      { a: title.start, b: TIMELINE.total, from: cam([0, 22, 30], CORE, 50), to: cam([0, 26, 0], CORE, 46), fn: lin },
    ],
    t
  );
}
function lookQuat(pos: V3, look: V3) {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...pos), new THREE.Vector3(...look), new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

// ──────────────────────────────────────────────── mise en scène
function stage(t: number) {
  const scene = sceneAt(t).id;
  const title = sceneById("title");
  const appear = ramp(t, at("l02") - 1.2, at("l02") - 0.2, easeOut); // la mascotte se matérialise
  return {
    scene,
    personTalk: amp("me", t),
    mascotTalk: amp("mascot", t),
    mood: moodAt(t, "me"),
    appear,
    wave: window01(t, at("l02"), at("l02") + 0.4, at("l02") + 1.6, at("l02") + 2.2),
    flash: t >= title.start ? 1 - ramp(t, title.start, title.start + 0.5, easeOut) : 0, // flash de teleportation UNIQUEMENT a l entree de la carte titre
    fade: Math.max(1 - ramp(t, 0, 1.2, easeOut), ramp(t, TIMELINE.total - 1.5, TIMELINE.total - 0.1, easeIn)),
  };
}
type Stage = ReturnType<typeof stage>;

const Scene3D: React.FC<{ t: number; st: Stage }> = ({ t, st }) => {
  const c = cameraAt(t);
  const quat = useMemo(() => lookQuat(c.pos, c.look), [c.pos[0], c.pos[1], c.pos[2], c.look[0], c.look[1], c.look[2]]);
  return (
    <>
      <PerspectiveCamera makeDefault fov={c.fov} near={0.1} far={1500} position={c.pos} quaternion={quat} />
      <Fog2 near={70} far={560} />
      <Lights2 keyPos={[PERSON_POS[0] + 6, 10, PERSON_POS[2] + 8]} target={[PERSON_POS[0], 1, PERSON_POS[2]]} />
      <Sky />
      <GridFloor />
      <Skyline clearings={CLEARINGS} />
      <CoreHex position={CORE} t={t} radius={40} />
      <LightPillars positions={PILLARS} t={t} />
      <Motes t={t} />
      {st.scene !== "title" && (
        <>
          <Person position={PERSON_POS} rotationY={0.75} t={t} talk={st.personTalk} mood={st.mood} turnHead={0.25} />
          {st.appear > 0 && <Mascot position={[MASCOT_POS[0], MASCOT_POS[1] + (1 - st.appear) * 4, MASCOT_POS[2]]} rotationY={-0.8} t={t} talk={st.mascotTalk} wave={st.wave} float glow={st.appear * 1.4} />}
        </>
      )}
    </>
  );
};

const Subtitles: React.FC<{ t: number }> = ({ t }) => {
  const l = subtitleAt(t);
  if (!l) return null;
  const k = Math.min(1, (t - l.start + 0.1) / 0.25);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ marginBottom: 48, maxWidth: 1300, padding: "10px 26px", borderRadius: 16, background: "rgba(6,9,24,0.55)", opacity: k, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 16, height: 16, flex: "none", background: l.who === "mascot" ? ORANGE : "#f3f2ee", clipPath: l.who === "mascot" ? "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" : "circle(50%)" }} />
        <div style={{ fontFamily, fontWeight: 700, fontSize: 40, lineHeight: 1.18, color: "#fff", textAlign: "center", textShadow: "0 3px 12px rgba(0,0,0,0.9)" }}>{l.subtitle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const ExampleFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const st = stage(t);
  const title = sceneById("title");
  return (
    <AbsoluteFill style={{ background: P2.bg, fontFamily }}>
      <ThreeCanvas width={width} height={height} dpr={1} shadows="percentage" gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, outputColorSpace: THREE.SRGBColorSpace }}>
        <Scene3D t={t} st={st} />
      </ThreeCanvas>
      {/* carte titre */}
      {st.scene === "title" && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ opacity: ramp(t, title.start + 0.6, title.start + 1.4, easeOut), textAlign: "center" }}>
            <div style={{ width: 110, height: 110, margin: "0 auto 24px", background: ORANGE, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)", boxShadow: `0 0 60px ${ORANGE}` }} />
            <div style={{ fontSize: 120, fontWeight: 800, color: "#fff", letterSpacing: 10, lineHeight: 1 }}>VIDÉO EN CODE</div>
            <div style={{ fontSize: 40, fontWeight: 600, color: ORANGE, marginTop: 20 }}>Three.js · Remotion · ElevenLabs</div>
          </div>
        </AbsoluteFill>
      )}
      {/* étalonnage : vignette, flash de transition, fondus */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
      {st.flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(circle at center, #fff6e6 0%, ${ORANGE} 60%, #2b0d00 100%)`, opacity: st.flash }} />}
      {st.fade > 0 && <AbsoluteFill style={{ background: "#000", opacity: Math.min(1, st.fade) }} />}
      <Subtitles t={t} />
      {TIMELINE.lines.map((l) => (
        <Sequence key={l.id} from={Math.round(l.start * fps)} durationInFrames={Math.ceil(l.dur * fps) + 2} layout="none">
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
