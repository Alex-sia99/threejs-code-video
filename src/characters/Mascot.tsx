/**
 * Mascot — une mascotte en VOXELS construite depuis un sprite pixel-art (ici celui de Claude Code, « Clawd »,
 * tel qu'affiché dans le terminal) : on décode le sprite en bitmap, puis corps / yeux / bras / pattes deviennent
 * des boîtes. Remplacez MASCOT_PIXELS et les couleurs par votre propre sprite.
 * Elle n'a pas de bouche : elle « parle » en rebondissant et ses yeux s'allument.
 */
import React from "react";
import { RoundedBox } from "@react-three/drei";

export const MASCOT = { orange: "#da7758", orangeDark: "#c0623f", eye: "#1a1419", glint: "#ffe9d6" };
/** Bitmap du sprite (1 = orange) : 5 lignes × 18 colonnes, utilisé aussi pour l'aperçu 2D. */
export const MASCOT_PIXELS: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * unit = taille d'un pixel (m). position = point au sol sous les pattes (ou point de flottement si float).
 * talk 0-1 : rebond + yeux qui s'allument ; walking : pattes qui trottinent ; wave 0-1 : bras droit levé ;
 * float : lévite avec une ondulation douce (entité numérique) ; glow : intensité de sa lueur.
 */
export const Mascot: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  t: number;
  unit?: number;
  talk?: number;
  walking?: boolean;
  wave?: number;
  float?: boolean;
  glow?: number;
  bounce?: number;
}> = ({ position, rotationY = 0, t, unit = 0.13, talk = 0, walking = false, wave = 0, float = false, glow = 1, bounce = 0 }) => {
  const u = unit;
  const tk = clamp01(talk);
  const hop = Math.max(tk * Math.abs(Math.sin(t * 14)) * 0.9, bounce) * u * 1.6;
  const squash = 1 + tk * Math.abs(Math.sin(t * 14)) * 0.12;
  const floatY = float ? Math.sin(t * 1.6) * 0.12 * u * 4 : 0;
  const tilt = float ? Math.sin(t * 1.1) * 0.05 : 0;
  const ph = t * 11;
  const legLift = (i: number) => (walking ? Math.max(0, Math.sin(ph + (i % 2 ? Math.PI : 0))) * u * 0.8 : 0);
  const eyeOn = 0.35 + tk * 1.4 + (Math.sin(t * 2.3) > 0.97 ? -0.3 : 0);
  return (
    <group position={[position[0], position[1] + hop + floatY, position[2]]} rotation={[0, rotationY, tilt]}>
      <group scale={[1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash)]}>
        {/* corps 12 × 4 × 5 */}
        <RoundedBox args={[12 * u, 4 * u, 5 * u]} radius={u * 0.18} smoothness={2} position={[0, 3 * u, 0]} castShadow>
          <meshStandardMaterial color={MASCOT.orange} roughness={0.6} metalness={0.05} emissive={MASCOT.orange} emissiveIntensity={0.12 * glow} />
        </RoundedBox>
        {/* yeux creux (pixels sombres, 2e ligne), légèrement enfoncés, avec une lueur quand il parle */}
        {[-3.5, 3.5].map((x) => (
          <group key={x} position={[x * u, 3.5 * u, 2.5 * u - 0.12 * u]}>
            <mesh>
              <boxGeometry args={[u, u, 0.4 * u]} />
              <meshStandardMaterial color={MASCOT.eye} roughness={0.35} emissive="#ffb48a" emissiveIntensity={0.08 * eyeOn} />
            </mesh>
            <mesh position={[u * 0.2, u * 0.2, 0.21 * u]}>
              <boxGeometry args={[0.28 * u, 0.28 * u, 0.02 * u]} />
              <meshBasicMaterial color={MASCOT.glint} />
            </mesh>
          </group>
        ))}
        {/* bras (3e ligne, 2 px de chaque côté) : pivotent à l'épaule */}
        {[-1, 1].map((s) => {
          const w = s === 1 ? wave : 0;
          return (
            <group key={s} position={[s * 6 * u, 2.5 * u, 0]} rotation={[0, 0, s * w * 1.6 + (walking ? Math.sin(ph) * 0.15 * s : 0)]}>
              <RoundedBox args={[2 * u, u, 3 * u]} radius={u * 0.12} smoothness={2} position={[s * u, 0, 0]} castShadow>
                <meshStandardMaterial color={MASCOT.orange} roughness={0.6} emissive={MASCOT.orange} emissiveIntensity={0.12 * glow} />
              </RoundedBox>
            </group>
          );
        })}
      </group>
      {/* pattes (colonnes 4, 6, 11, 13) */}
      {[-4.5, -2.5, 2.5, 4.5].map((x, i) => (
        <mesh key={x} position={[x * u, 0.5 * u + legLift(i), 0]} castShadow>
          <boxGeometry args={[u, u, 2.2 * u]} />
          <meshStandardMaterial color={MASCOT.orangeDark} roughness={0.7} />
        </mesh>
      ))}
      {/* lueur orange douce autour de lui (présence numérique) */}
      <pointLight position={[0, 7 * u, 6 * u]} color="#ff9a66" intensity={1.2 * glow + tk * 1.5} distance={7} decay={2} />
    </group>
  );
};
