/**
 * Voix off du film : un mp3 par réplique via ElevenLabs (modèle eleven_v4, request stitching par
 * personnage), durées (ffprobe), enveloppe d'amplitude 30 i/s pour la bouche, et timeline
 * (src/film/timeline.json : début/durée de chaque réplique et de chaque scène).
 *
 *   node scripts/tts.js            # ne régénère que les répliques modifiées
 *   node scripts/tts.js --force    # tout régénérer
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const el = require("./elevenlabs");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "src", "film", "script.json");
const OUT_DIR = path.join(ROOT, "public", "vo");
const TIMELINE = path.join(ROOT, "src", "film", "timeline.json");
const FORCE = process.argv.includes("--force");
fs.mkdirSync(OUT_DIR, { recursive: true });

function duration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]).toString().trim();
  return Number(out) || 0;
}
/** Enveloppe d'amplitude (0-100) à 30 images/s, pour animer la bouche du personnage ou le rebond de la mascotte. */
const FPS = 30;
function envelope(file) {
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const win = Math.round(8000 / FPS);
  const out = [];
  let peak = 1;
  for (let i = 0; i + win <= samples.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += samples[j] * samples[j];
    const rms = Math.sqrt(s / win);
    out.push(rms);
    if (rms > peak) peak = rms;
  }
  return out.map((v) => Math.round(Math.min(1, v / (peak * 0.7)) * 100));
}
const stripTags = (t) => t.replace(/\[[^\]]+\]\s*/g, "").trim();

(async () => {
  const script = JSON.parse(fs.readFileSync(SCRIPT, "utf8"));
  const metaFile = path.join(OUT_DIR, "index.json");
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
  const lines = [];
  let t = 0, chars = 0;
  for (let i = 0; i < script.lines.length; i++) {
    const line = script.lines[i];
    const cfg = script.voices[line.who];
    if (!cfg) throw new Error(`voix inconnue : ${line.who}`);
    const prev = script.lines.slice(0, i).reverse().find((l) => l.who === line.who);
    const next = script.lines.slice(i + 1).find((l) => l.who === line.who);
    const hash = crypto.createHash("md5").update([line.text, cfg.voice, script.model, cfg.stability, cfg.similarity].join("|")).digest("hex").slice(0, 10);
    const file = path.join(OUT_DIR, line.id + ".mp3");
    if (FORCE || !fs.existsSync(file) || meta[line.id] !== hash) {
      process.stdout.write(`TTS ${line.id} (${line.who})… `);
      const r = await el.tts({ text: line.text, voice: cfg.voice, model: script.model || "eleven_v4", language: script.language || "fr", stability: cfg.stability, similarity: cfg.similarity, previousText: prev ? prev.text : undefined, nextText: next ? next.text : undefined });
      fs.writeFileSync(file, r.buffer);
      meta[line.id] = hash;
      chars += r.characters;
      console.log(`ok (${r.characters} car.)`);
    }
    const dur = duration(file);
    t += line.pauseBefore || 0.6;
    lines.push({ ...line, subtitle: stripTags(line.text), start: +t.toFixed(3), dur: +dur.toFixed(3), file: `vo/${line.id}.mp3`, env: envelope(file) });
    t += dur;
  }
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  const lastEnd = t;
  const total = +(t + (script.outroSeconds || 6)).toFixed(3);
  // Scènes dans l'ordre du script : début = première réplique moins son silence d'amorce ; les scènes
  // sans réplique (carte titre) commencent 1,2 s après la dernière réplique.
  const order = (script.scenes || []).map((s) => s.id);
  const scenes = [];
  for (const id of order) {
    const first = lines.find((l) => l.scene === id);
    scenes.push({ id, start: first ? +(first.start - (first.pauseBefore || 0.6)).toFixed(3) : +(lastEnd + 1.2).toFixed(3) });
  }
  scenes.sort((a, b) => a.start - b.start);
  scenes.forEach((s, i) => { s.end = i + 1 < scenes.length ? scenes[i + 1].start : total; });
  fs.writeFileSync(TIMELINE, JSON.stringify({ total, lines, scenes }, null, 2));
  const sub = await el.subscription().catch(() => null);
  console.log(`timeline : ${lines.length} répliques, ${scenes.length} scènes, ${total.toFixed(1)} s au total · ${chars} caractères générés${sub ? ` · quota ${sub.used}/${sub.limit}` : ""}`);
  for (const s of scenes) console.log(`  ${s.id.padEnd(10)} ${s.start.toFixed(1).padStart(6)} → ${s.end.toFixed(1).padStart(6)} s`);
})().catch((e) => { console.error(e); process.exit(1); });
