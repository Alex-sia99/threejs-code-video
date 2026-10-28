/**
 * Person — personnage SCULPTÉ en code (aucun modèle externe), à adapter d'après VOTRE photo :
 *  - HEAD_R : proportions du crâne (largeur / hauteur / profondeur) ;
 *  - FEATURES : reliefs gaussiens (menton, joues, pommettes, arcades, orbites, nez, lèvres…) — direction
 *    sur la sphère (+z = devant), largeur (s isotrope, ou sx/sy allongée) et amplitude (négatif = creux) ;
 *  - LOCKS : rangées de mèches (élévation, nombre, longueur, inclinaison, rayon, direction) ;
 *  - PERSON : couleurs (peau, cheveux, yeux, vêtements) ;
 *  - moustache / bouc / plugs : supprimez ou adaptez les blocs correspondants.
 * Règle d'or : UN trait = UN volume. Jamais un relief sculpté ET une pièce rapportée pour le même trait
 * (sinon « deux nez »). Comparez chaque essai à la photo avec la composition CharacterLab.
 *
 * API : position / rotationY, t (secondes), talk (0-1 ouverture de bouche), pose, mood, turnHead (lacet),
 * tiltHead (roulis), armRaise (bras droit tendu), lookDown (tête vers le bas).
 * Repère : le personnage regarde vers +z ; vu de face (caméra en +z), son +x est à DROITE de l'image.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";

export const PERSON = {
  skin: "#dfa57f", skinShade: "#c98a66", lip: "#c47a66", mouth: "#4a2222",
  hair: "#4a3320", hairHi: "#6e4e2f", brow: "#3a2616", eye: "#5c3a1c", pupil: "#0b0a0f",
  tee: "#f3f2ee", teeShade: "#dcdbd4", jeans: "#232b42", shoe: "#efefeb", sole: "#cfcfc8",
  plug: "#101014",
  height: 2.85, headY: 2.4, // hauteur totale et hauteur du centre de la tête (debout)
};
export type PersonPose = "stand" | "walk" | "sit" | "type" | "fall" | "lounge";
export type PersonMood = "neutral" | "happy" | "surprised" | "tired" | "focused" | "wow";
type V3 = [number, number, number];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const Skin: React.FC<{ shade?: boolean }> = ({ shade }) => <meshStandardMaterial color={shade ? PERSON.skinShade : PERSON.skin} roughness={0.62} metalness={0} />;
const Hair: React.FC<{ hi?: boolean }> = ({ hi }) => <meshStandardMaterial color={hi ? PERSON.hairHi : PERSON.hair} roughness={0.55} metalness={0} />;
const Smooth: React.FC<{ color: string; rough?: number }> = ({ color, rough = 0.6 }) => <meshStandardMaterial color={color} roughness={rough} metalness={0} />;

// ──────────────────────────────────────────────── crâne sculpté
/** Demi-axes de l'ellipsoïde de base (x = largeur, y = hauteur, z = profondeur). */
const HEAD_R = { x: 0.335, y: 0.44, z: 0.36 };
/** Reliefs : direction (repère tête, +z devant), largeur (radians) — isotrope `s` ou allongée `sx`/`sy` —, amplitude (m, négatif = creux). */
const FEATURES: { d: V3; k: number; s?: number; sx?: number; sy?: number }[] = [
  { d: [0, -0.9, 0.55], s: 0.42, k: 0.02 }, // menton
  { d: [0.85, -0.45, 0.35], s: 0.38, k: -0.03 }, // joues creusées → mâchoire
  { d: [-0.85, -0.45, 0.35], s: 0.38, k: -0.03 },
  { d: [0.8, -0.62, 0.2], s: 0.22, k: 0.008 }, // angles de la mâchoire
  { d: [-0.8, -0.62, 0.2], s: 0.22, k: 0.008 },
  { d: [0.7, 0.05, 0.55], s: 0.3, k: 0.016 }, // pommettes
  { d: [-0.7, 0.05, 0.55], s: 0.3, k: 0.016 },
  { d: [0.32, 0.3, 0.9], s: 0.3, k: 0.02 }, // arcades sourcilières
  { d: [-0.32, 0.3, 0.9], s: 0.3, k: 0.02 },
  { d: [0.38, 0.12, 0.9], s: 0.2, k: -0.03 }, // orbites
  { d: [-0.38, 0.12, 0.9], s: 0.2, k: -0.03 },
  { d: [0, -0.03, 1], sx: 0.075, sy: 0.24, k: 0.058 }, // arête du nez : crête étroite et allongée
  { d: [0, -0.25, 1], sx: 0.1, sy: 0.085, k: 0.068 }, // pointe du nez
  { d: [0.19, -0.3, 0.95], sx: 0.07, sy: 0.055, k: 0.018 }, // ailes du nez
  { d: [-0.19, -0.3, 0.95], sx: 0.07, sy: 0.055, k: 0.018 },
  { d: [0, -0.38, 1], sx: 0.06, sy: 0.05, k: -0.01 }, // creux sous la pointe
  { d: [0.95, 0.4, 0.25], s: 0.35, k: -0.018 }, // tempes
  { d: [-0.95, 0.4, 0.25], s: 0.35, k: -0.018 },
  { d: [0, 0.35, -1], s: 0.6, k: 0.02 }, // arrière du crâne
  { d: [0, -0.5, 0.95], sx: 0.14, sy: 0.05, k: 0.01 }, // lèvre supérieure (bourrelet horizontal)
  { d: [0, -0.66, 0.9], sx: 0.12, sy: 0.045, k: 0.012 }, // lèvre inférieure
  { d: [0, 0.6, 0.85], s: 0.4, k: -0.006 }, // front légèrement plat
  { d: [0, -1, 0.1], s: 0.35, k: -0.03 }, // dessous du menton qui rentre
];
const UP = new THREE.Vector3(0, 1, 0);
const FEAT = FEATURES.map((f) => {
  const v = new THREE.Vector3(...f.d).normalize();
  const e1 = new THREE.Vector3().crossVectors(UP, v).normalize(); // tangente horizontale
  const e2 = new THREE.Vector3().crossVectors(v, e1).normalize(); // tangente verticale
  return { v, e1, e2, k: f.k, s: f.s, sx: f.sx, sy: f.sy };
});
function relief(dir: THREE.Vector3): number {
  let d = 0;
  for (const f of FEAT) {
    const c = dir.dot(f.v);
    if (c < 0) continue;
    if (f.sx !== undefined && f.sy !== undefined) {
      const u = Math.asin(THREE.MathUtils.clamp(dir.dot(f.e1), -1, 1));
      const w = Math.asin(THREE.MathUtils.clamp(dir.dot(f.e2), -1, 1));
      d += f.k * Math.exp(-((u * u) / (2 * f.sx * f.sx) + (w * w) / (2 * f.sy * f.sy)));
    } else {
      const a = Math.acos(THREE.MathUtils.clamp(c, -1, 1));
      const sg = f.s || 0.3;
      d += f.k * Math.exp(-(a * a) / (2 * sg * sg));
    }
  }
  return d;
}
/** Point de la surface du crâne dans une direction donnée (repère tête). */
export function headSurface(d: V3): V3 {
  const v = new THREE.Vector3(...d).normalize();
  const r = relief(v);
  return [v.x * HEAD_R.x + v.x * r, v.y * HEAD_R.y + v.y * r, v.z * HEAD_R.z + v.z * r];
}
function sculpt(g: THREE.SphereGeometry, grow: number, pad: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const r = relief(v) + grow;
    pos.setXYZ(i, v.x * (HEAD_R.x + pad) + v.x * r, v.y * (HEAD_R.y + pad) + v.y * r, v.z * (HEAD_R.z + pad) + v.z * r);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}
function useHeadGeometry() {
  return useMemo(() => sculpt(new THREE.SphereGeometry(1, 128, 96), 0, 0), []);
}
/** Calotte de cheveux : sphère sculptée dont les sommets sous la ligne de cheveux sont rentrés dans le crâne.
 *  La ligne est haute devant (front dégagé), passe au-dessus des oreilles et descend sur la nuque ; l'épaisseur
 *  diminue vers les côtés (dégradé court). */
function useHairCapGeometry() {
  return useMemo(() => {
    const g = new THREE.SphereGeometry(1, 128, 64);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const theta = Math.acos(THREE.MathUtils.clamp(v.y, -1, 1)); // 0 = sommet
      const front = THREE.MathUtils.clamp(v.z / Math.max(0.001, Math.hypot(v.x, v.z)), -1, 1); // 1 devant, -1 derrière
      const limit = Math.PI * (0.47 + 0.22 * Math.max(0, -front) - 0.06 * Math.max(0, front));
      const band = Math.PI * 0.03;
      const inside = THREE.MathUtils.clamp((theta - (limit - band)) / band, 0, 1); // 0 = cheveux, 1 = sous la peau
      const thick = THREE.MathUtils.lerp(0.038, 0.012, THREE.MathUtils.clamp((theta - Math.PI * 0.25) / (limit - Math.PI * 0.25), 0, 1));
      const r = relief(v) + (1 - inside) * thick - inside * 0.02;
      const pad = (1 - inside) * 0.01 - inside * 0.01;
      pos.setXYZ(i, v.x * (HEAD_R.x + pad) + v.x * r, v.y * (HEAD_R.y + pad) + v.y * r, v.z * (HEAD_R.z + pad) + v.z * r);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);
}

/** Place ses enfants sur la surface du crâne, orientés vers l'extérieur (+z local = normale). */
const OnHead: React.FC<{ dir: V3; out?: number; children?: React.ReactNode }> = ({ dir, out = 0, children }) => {
  const { pos, quat } = useMemo(() => {
    const n = new THREE.Vector3(...dir).normalize();
    const p = headSurface(dir);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    return { pos: [p[0] + n.x * out, p[1] + n.y * out, p[2] + n.z * out] as V3, quat: q };
  }, [dir[0], dir[1], dir[2], out]);
  return (
    <group position={pos} quaternion={quat}>
      {children}
    </group>
  );
};

/** Géométrie d'une mèche : goutte effilée le long de +y (racine épaisse en 0, pointe fine en 1). */
const LOCK_GEO = (() => {
  const prof: [number, number][] = [[0, 0], [0.55, 0.06], [0.85, 0.2], [1, 0.4], [0.92, 0.6], [0.7, 0.78], [0.38, 0.92], [0, 1]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  g.computeVertexNormals();
  return g;
})();
/** Géométrie du bouc : étroit à la racine (sous la lèvre), large au menton, pointe en bas. */
const GOATEE_GEO = (() => {
  const prof: [number, number][] = [[0, 0], [0.3, 0.08], [0.55, 0.3], [0.95, 0.55], [1, 0.68], [0.75, 0.85], [0.35, 0.96], [0, 1]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  g.computeVertexNormals();
  return g;
})();
/** Mèches de cheveux : posées sur le crâne, couchées vers l'avant/le haut et balayées vers +x. */
const LOCKS = (() => {
  const out: { pos: V3; quat: THREE.Quaternion; scale: V3; hi: boolean }[] = [];
  let s = 13;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const rows: { el: number; n: number; len: number; lean: number; rad: number; fwd: V3 }[] = [
    { el: 0.3, n: 11, len: 0.3, lean: 1.3, rad: 0.056, fwd: [0, 0.55, 0.84] }, // ligne du front : la mèche relevée
    { el: 0.55, n: 12, len: 0.29, lean: 1.2, rad: 0.056, fwd: [0, 0.6, 0.8] },
    { el: 0.8, n: 12, len: 0.27, lean: 1.05, rad: 0.054, fwd: [0, 0.66, 0.75] },
    { el: 1.05, n: 11, len: 0.24, lean: 0.9, rad: 0.052, fwd: [0, 0.74, 0.67] },
    { el: 1.3, n: 10, len: 0.21, lean: 0.75, rad: 0.05, fwd: [0, 0.82, 0.57] },
    { el: 1.58, n: 9, len: 0.18, lean: 0.6, rad: 0.048, fwd: [0, 0.9, 0.44] },
    { el: 1.88, n: 8, len: 0.15, lean: 0.45, rad: 0.046, fwd: [0, 0.95, 0.3] },
  ];
  rows.forEach((row) => {
    for (let i = 0; i < row.n; i++) {
      const az = ((i + 0.5) / row.n - 0.5) * 2.8 + (rnd() - 0.5) * 0.12; // azimut autour de y (0 = devant)
      const el = row.el + (rnd() - 0.5) * 0.08;
      const dir: V3 = [Math.sin(az) * Math.cos(el) * 0.95, Math.sin(el) + 0.1, Math.cos(az) * Math.cos(el)];
      const n = new THREE.Vector3(...dir).normalize();
      const len = row.len + (rnd() - 0.5) * 0.04;
      const rad = row.rad + (rnd() - 0.5) * 0.01;
      const lean = row.lean + (rnd() - 0.5) * 0.15;
      const sweep = 0.4 + (rnd() - 0.5) * 0.25;
      const fwd = new THREE.Vector3(...row.fwd).normalize();
      const a = n.clone().multiplyScalar(0.3).add(fwd.multiplyScalar(lean)).add(new THREE.Vector3(sweep, 0, 0)).normalize();
      const surf = headSurface(dir);
      const pos: V3 = [surf[0] - n.x * 0.03, surf[1] - n.y * 0.03, surf[2] - n.z * 0.03];
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a);
      out.push({ pos, quat, scale: [rad, len, rad * 0.85], hi: rnd() < 0.5 });
    }
  });
  return out;
})();

/** Œil : globe aplati enchâssé, iris brun, pupille, reflet, paupières en coques de peau. */
const Eye: React.FC<{ s: number; lid: number; squint: number; look: number }> = ({ s, lid, squint, look }) => (
  <OnHead dir={[s * 0.33, 0.07, 0.9]} out={-0.012}>
    <group rotation={[0, 0, s * -0.06]}>
      <mesh scale={[1, 0.64, 0.55]}>
        <sphereGeometry args={[0.062, 24, 16]} />
        <Smooth color="#f6f1e9" rough={0.35} />
      </mesh>
      <group position={[-s * 0.004, -0.003 - look * 0.012, 0]}>
        <mesh position={[0, 0, 0.034]}>
          <circleGeometry args={[0.034, 24]} />
          <Smooth color={PERSON.eye} rough={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <circleGeometry args={[0.015, 16]} />
          <Smooth color={PERSON.pupil} rough={0.2} />
        </mesh>
        <mesh position={[0.011, 0.011, 0.036]}>
          <circleGeometry args={[0.0045, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <mesh scale={[1.08, 0.7, 0.62]} position={[0, 0.004, -0.004]}>
        <sphereGeometry args={[0.064, 24, 16, 0, Math.PI * 2, 0, Math.PI * (0.28 + clamp01(lid) * 0.4)]} />
        <Skin />
      </mesh>
      <mesh scale={[1.08, 0.7, 0.62]} position={[0, -0.004, -0.004]}>
        <sphereGeometry args={[0.064, 24, 16, 0, Math.PI * 2, Math.PI * (0.82 - clamp01(squint) * 0.12), Math.PI * 0.3]} />
        <Skin />
      </mesh>
    </group>
  </OnHead>
);

export const PersonHead: React.FC<{ t: number; talk?: number; mood?: PersonMood; turnHead?: number; tiltHead?: number; lookDown?: number }> = ({ t, talk = 0, mood = "neutral", turnHead = 0, tiltHead = 0, lookDown = 0 }) => {
  const geo = useHeadGeometry();
  const cap = useHairCapGeometry();
  const blink = (t * 1.0 + 1.3) % 4.1 < 0.13 ? 1 : 0;
  const smile = mood === "happy" ? 1 : mood === "wow" ? 0.4 : mood === "neutral" ? 0.45 : 0;
  const browUp = mood === "surprised" || mood === "wow" ? 0.04 : mood === "tired" ? -0.01 : mood === "focused" ? -0.015 : 0;
  const browIn = mood === "focused" ? 0.25 : 0;
  const lid = Math.max(blink, mood === "tired" ? 0.45 : mood === "focused" ? 0.2 : mood === "surprised" || mood === "wow" ? -0.25 : 0.16);
  const squint = mood === "happy" ? 0.9 : mood === "neutral" ? 0.35 : mood === "tired" ? 0.5 : 0;
  const open = clamp01(talk) * 0.085 + (mood === "surprised" ? 0.05 : mood === "wow" ? 0.075 : 0);
  return (
    <group rotation={[lookDown * 0.35, turnHead, tiltHead]}>
      {/* crâne sculpté */}
      <mesh geometry={geo} castShadow>
        <Skin />
      </mesh>
      {/* cheveux : calotte pleine + côtés courts, puis mèches relevées vers l'avant */}
      <mesh geometry={cap} position={[0, 0.015, -0.005]} castShadow>
        <Hair />
      </mesh>
      {LOCKS.map((l, i) => (
        <mesh key={i} geometry={LOCK_GEO} position={l.pos} quaternion={l.quat} scale={l.scale} castShadow>
          <Hair hi={l.hi} />
        </mesh>
      ))}
      {/* sourcils : un volume lisse effilé, légèrement arqué, proche des yeux */}
      {[-1, 1].map((s) => (
        <OnHead key={s} dir={[s * 0.34, 0.23 + browUp * 2, 0.9]} out={0.004}>
          <group rotation={[0, 0, s * 0.06 - s * browIn * 0.3]}>
            <mesh position={[-s * 0.04, 0.0, 0]} scale={[0.082, 0.023, 0.013]}>
              <sphereGeometry args={[1, 14, 8]} />
              <Hair />
            </mesh>
            <mesh position={[s * 0.05, -0.002, 0]} rotation={[0, 0, s * -0.06]} scale={[0.078, 0.02, 0.012]}>
              <sphereGeometry args={[1, 14, 8]} />
              <Hair />
            </mesh>
          </group>
        </OnHead>
      ))}
      {/* yeux */}
      {[-1, 1].map((s) => <Eye key={s} s={s} lid={lid} squint={squint} look={lookDown} />)}
      {/* moustache : chevron continu en trois volumes lisses, juste au-dessus de la lèvre */}
      <OnHead dir={[0, -0.455, 0.95]} out={0.012}>
        <mesh scale={[0.032, 0.016, 0.012]}>
          <sphereGeometry args={[1, 16, 10]} />
          <Hair />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} rotation={[0, s * 0.55, 0]}>
            <mesh position={[s * 0.056, -0.009, 0]} rotation={[0, 0, s * -0.28]} scale={[0.07, 0.017, 0.012]}>
              <sphereGeometry args={[1, 16, 10]} />
              <Hair />
            </mesh>
          </group>
        ))}
      </OnHead>
      {/* bouche : une seule ligne fine entre les lèvres sculptées ; ouverture (voix) */}
      <OnHead dir={[0, -0.6, 0.95]} out={0.003}>
        <mesh position={[0, 0.11, 0]} rotation={[0, 0, Math.PI * 1.5 - (Math.PI * (0.38 + 0.12 * smile)) / 2]}>
          <torusGeometry args={[0.11, 0.0036, 6, 28, Math.PI * (0.38 + 0.12 * smile)]} />
          <Smooth color="#5a2e2e" rough={0.7} />
        </mesh>
        {open > 0.005 && (
          <mesh position={[0, -open / 2, -0.004]}>
            <boxGeometry args={[0.1 - open * 0.3, open, 0.03]} />
            <Smooth color={PERSON.mouth} />
          </mesh>
        )}
      </OnHead>
      {/* bouc : une seule pièce, étroite sous la lèvre, large au menton, pointe sous le menton */}
      <OnHead dir={[0, -0.7, 0.84]} out={0.004}>
        <mesh geometry={GOATEE_GEO} position={[0, 0.02, 0.002]} rotation={[0.42, 0, Math.PI]} scale={[0.062, 0.165, 0.034]}>
          <Hair />
        </mesh>
      </OnHead>
      {/* oreilles pleines + plug : disque noir sur le lobe */}
      {[-1, 1].map((s) => (
        <OnHead key={s} dir={[s * 1, -0.08, -0.12]} out={-0.022}>
          <mesh scale={[0.038, 0.08, 0.05]} position={[0, 0, 0.01]}>
            <sphereGeometry args={[1, 16, 12]} />
            <Skin />
          </mesh>
          <mesh scale={[0.028, 0.055, 0.03]} position={[0, 0.005, 0.03]}>
            <sphereGeometry args={[1, 12, 8]} />
            <Skin shade />
          </mesh>
          <mesh position={[0, -0.042, 0.046]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.012, 20]} />
            <Smooth color={PERSON.plug} rough={0.3} />
          </mesh>
        </OnHead>
      ))}
    </group>
  );
};

const Capsule: React.FC<{ r: number; len: number; color: string; rough?: number; position?: V3; rotation?: V3; skin?: boolean }> = ({ r, len, color, rough = 0.7, position = [0, 0, 0], rotation = [0, 0, 0], skin }) => (
  <mesh position={position} rotation={rotation} castShadow>
    <capsuleGeometry args={[r, len, 6, 16]} />
    {skin ? <Skin /> : <Smooth color={color} rough={rough} />}
  </mesh>
);

export const Person: React.FC<{
  position: V3;
  rotationY?: number;
  t: number;
  talk?: number;
  pose?: PersonPose;
  mood?: PersonMood;
  turnHead?: number;
  tiltHead?: number;
  armRaise?: number;
  lookDown?: number;
}> = ({ position, rotationY = 0, t, talk = 0, pose = "stand", mood = "neutral", turnHead = 0, tiltHead = 0, armRaise = 0, lookDown = 0 }) => {
  const walking = pose === "walk";
  const lounge = pose === "lounge";
  const sit = pose === "sit" || pose === "type" || lounge;
  const typing = pose === "type" || lounge;
  const fall = pose === "fall";
  const ph = t * 6.2;
  const swing = walking ? Math.sin(ph) * 0.55 : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 1.4) * 0.012;
  const breathe = Math.sin(t * 2.1) * 0.006;
  const bodyY = lounge ? 0.5 : sit ? 0.55 : 0.95;
  const legRot = lounge ? -Math.PI / 2 + 0.1 : sit ? -Math.PI / 2 : 0;
  const lean = lounge ? -0.52 : 0; // inclinaison du buste (pivot à la hanche)
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[fall ? Math.sin(t * 3) * 0.35 : 0, rotationY, fall ? Math.cos(t * 2.3) * 0.25 : 0]}>
      {/* jambes (jean) + baskets */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.17, lounge ? 0.56 : sit ? 0.62 : 0.86, 0]} rotation={[legRot + swing * s, 0, 0]}>
          <Capsule r={0.125} len={0.58} color={PERSON.jeans} position={[0, -0.41, 0]} />
          <group position={[0, -0.84, 0.07]} rotation={[sit ? Math.PI / 2 : 0, 0, 0]}>
            <RoundedBox args={[0.25, 0.13, 0.4]} radius={0.05} smoothness={4} castShadow>
              <Smooth color={PERSON.shoe} rough={0.6} />
            </RoundedBox>
            <RoundedBox args={[0.26, 0.04, 0.41]} radius={0.015} smoothness={2} position={[0, -0.07, 0]}>
              <Smooth color={PERSON.sole} />
            </RoundedBox>
          </group>
        </group>
      ))}
      {/* buste + cou + tête : pivot à la hanche (inclinaison en arrière pour la pose allongée) */}
      <group position={[0, bodyY, 0]} rotation={[lean, 0, 0]}>
      {/* buste : t-shirt blanc ample, épaules rondes, col */}
      <group position={[0, 0.42, 0]} scale={[1, 1 + breathe, 1]}>
        <RoundedBox args={[0.82, 0.96, 0.48]} radius={0.17} smoothness={5} castShadow>
          <Smooth color={PERSON.tee} rough={0.85} />
        </RoundedBox>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.41, 0.35, 0]}>
            <sphereGeometry args={[0.14, 18, 12]} />
            <Smooth color={PERSON.tee} rough={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 0.49, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.028, 8, 24]} />
          <Smooth color={PERSON.teeShade} />
        </mesh>
        {/* bras : manche, avant-bras, main */}
        {[-1, 1].map((s) => {
          const raise = s === 1 ? armRaise : 0;
          const typeRot = lounge ? -0.55 + Math.sin(t * 9 + s) * 0.05 : typing ? -1.25 + Math.sin(t * 9 + s) * 0.08 : 0;
          return (
            <group key={s} position={[s * 0.5, 0.36, 0]} rotation={[-swing * s * 0.8 - raise * 1.3 + typeRot, 0, s * 0.1 - raise * s * 0.4 - (typing ? s * (lounge ? 0.32 : 0.2) : 0)]}>
              <Capsule r={0.12} len={0.16} color={PERSON.tee} rough={0.85} position={[0, -0.12, 0]} />
              <Capsule r={0.085} len={0.38} color={PERSON.skin} position={[0, -0.52, 0]} skin />
              <mesh position={[0, -0.8, 0]} scale={[1, 1.15, 0.8]}>
                <sphereGeometry args={[0.085, 14, 10]} />
                <Skin />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* base du cou (trapèzes) qui remplit le col */}
      <mesh position={[0, 0.86, 0]} scale={[1.35, 0.55, 1.0]}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <Skin />
      </mesh>
      {/* cou + tête : pivot à la BASE du cou — la tête s'incline sans décoller le cou du buste */}
      <group position={[0, 0.88, 0]} rotation={[-lean * 0.3, 0, 0]}>
        <Capsule r={0.12} len={0.2} color={PERSON.skin} position={[0, 0.14, 0]} skin />
        <group position={[0, 0.57, 0]}>
          <PersonHead t={t} talk={talk} mood={mood} turnHead={turnHead} tiltHead={tiltHead} lookDown={lookDown} />
        </group>
      </group>
      </group>
    </group>
  );
};
