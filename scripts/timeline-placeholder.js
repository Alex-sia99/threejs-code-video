/**
 * Sans clé ElevenLabs : fabrique une timeline de travail à partir de src/film/script.json — durée estimée
 * par réplique (0,9 s + 0,055 s par caractère), mp3 SILENCIEUX de la bonne durée dans public/vo/ (ffmpeg),
 * enveloppe d'amplitude synthétique pour que la bouche bouge. Même format de sortie que scripts/tts.js,
 * donc le film se rend tel quel ; remplacez ensuite par les vraies voix (node scripts/tts.js).
 *
 *   node scripts/timeline-placeholder.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "src", "film", "script.json");
const OUT_DIR = path.join(ROOT, "public", "vo");
const TIMELINE = path.join(ROOT, "src", "film", "timeline.json");
const FPS = 30;
fs.mkdirSync(OUT_DIR, { recursive: true });

const stripTags = (t) => t.replace(/\[[^\]]+\]\s*/g, "").trim();
const script = JSON.parse(fs.readFileSync(SCRIPT, "utf8"));
const lines = [];
let t = 0;
for (const line of script.lines) {
  const text = stripTags(line.text);
  const dur = +(0.9 + text.length * 0.055).toFixed(3);
  const file = path.join(OUT_DIR, line.id + ".mp3");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(dur), "-q:a", "9", file]);
  // enveloppe synthétique : « mots » de 0,3 s séparés par de courtes pauses
  const n = Math.ceil(dur * FPS);
  const env = Array.from({ length: n }, (_, i) => {
    const s = i / FPS;
    const word = Math.sin((s / 0.3) * Math.PI);
    return Math.round(Math.max(0, word) * (60 + 40 * Math.abs(Math.sin(s * 7.3))));
  });
  t += line.pauseBefore || 0.6;
  lines.push({ ...line, subtitle: text, start: +t.toFixed(3), dur, file: `vo/${line.id}.mp3`, env });
  t += dur;
}
const lastEnd = t;
const total = +(t + (script.outroSeconds || 6)).toFixed(3);
const order = (script.scenes || []).map((s) => s.id);
const scenes = [];
for (const id of order) {
  const first = lines.find((l) => l.scene === id);
  scenes.push({ id, start: first ? +(first.start - (first.pauseBefore || 0.6)).toFixed(3) : +(lastEnd + 1.2).toFixed(3) });
}
scenes.sort((a, b) => a.start - b.start);
scenes.forEach((s, i) => { s.end = i + 1 < scenes.length ? scenes[i + 1].start : total; });
fs.writeFileSync(TIMELINE, JSON.stringify({ total, lines, scenes }, null, 2));
console.log(`timeline (placeholder) : ${lines.length} répliques, ${scenes.length} scènes, ${total.toFixed(1)} s`);
for (const s of scenes) console.log(`  ${s.id.padEnd(8)} ${s.start.toFixed(1).padStart(6)} → ${s.end.toFixed(1).padStart(6)} s`);
