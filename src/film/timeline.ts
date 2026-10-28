/**
 * Timeline du film : répliques (voix + enveloppe d'amplitude) et scènes, générées par scripts/tts.js
 * (ou scripts/timeline-placeholder.js sans clé) à partir de script.json.
 */
import data from "./timeline.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type Who = string;
export type SceneId = string;
export type Mood = "neutral" | "happy" | "surprised" | "tired" | "focused" | "wow";
export interface TLine { id: string; who: Who; scene: SceneId; text: string; subtitle: string; mood?: Mood; start: number; dur: number; file: string; env: number[]; pauseBefore?: number }
export interface TScene { id: SceneId; start: number; end: number }

export const TIMELINE = data as unknown as { total: number; lines: TLine[]; scenes: TScene[] };
export const TOTAL_FRAMES = Math.ceil(TIMELINE.total * FPS);

export function sceneAt(t: number): TScene {
  const s = TIMELINE.scenes.find((x) => t >= x.start && t < x.end);
  return s || TIMELINE.scenes[TIMELINE.scenes.length - 1];
}
export function sceneById(id: SceneId): TScene {
  return TIMELINE.scenes.find((x) => x.id === id) as TScene;
}
/** Temps local dans une scène (0 au début de la scène). */
export function local(t: number, id: SceneId): number {
  return t - sceneById(id).start;
}
export function lineById(id: string): TLine {
  return TIMELINE.lines.find((l) => l.id === id) as TLine;
}
/** Début d'une réplique (secondes) — pour caler décors et actions sur le texte. */
export const at = (id: string) => lineById(id).start;
export const endOf = (id: string) => { const l = lineById(id); return l.start + l.dur; };
export function lineAt(t: number): TLine | null {
  return TIMELINE.lines.find((l) => t >= l.start && t < l.start + l.dur + 0.15) || null;
}
/** Amplitude 0-1 de la voix de `who` à l'instant t (0 s'il ne parle pas). */
export function amp(who: Who, t: number): number {
  const l = TIMELINE.lines.find((x) => x.who === who && t >= x.start && t < x.start + x.dur);
  if (!l) return 0;
  const i = Math.min(l.env.length - 1, Math.floor((t - l.start) * FPS));
  const a = (l.env[i] || 0) / 100;
  const b = (l.env[Math.min(l.env.length - 1, i + 1)] || 0) / 100;
  return (a + b) / 2;
}
/** Humeur d'un personnage à l'instant t : celle de sa dernière réplique commencée (neutral par défaut). */
export function moodAt(t: number, who = "me"): Mood {
  let m: Mood = "neutral";
  for (const l of TIMELINE.lines) { if (l.who === who && l.start <= t && l.mood) m = l.mood; if (l.start > t) break; }
  return m;
}
/** Ligne en cours de lecture pour les sous-titres (reste affichée 0,4 s après la fin). */
export function subtitleAt(t: number): TLine | null {
  return TIMELINE.lines.find((l) => t >= l.start - 0.1 && t < l.start + l.dur + 0.4) || null;
}

// ---------- Petites maths ----------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => { const c = clamp01(x); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x: number) => Math.pow(clamp01(x), 3);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export type V3 = [number, number, number];
export const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 0 → 1 entre a et b (secondes), avec easing. */
export const ramp = (t: number, a: number, b: number, fn: (x: number) => number = ease) => fn((t - a) / Math.max(0.0001, b - a));
/** Fenêtre 0→1→0 : monte entre a et b, redescend entre c et d. */
export const window01 = (t: number, a: number, b: number, c: number, d: number) => Math.min(ramp(t, a, b, easeOut), 1 - ramp(t, c, d, easeIn));
