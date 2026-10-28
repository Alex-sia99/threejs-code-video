/**
 * Finalisation d'une boucle : musique (public/music/loop-*.mp3) coupée à LOOP secondes avec raccord de
 * boucle (les 2 secondes qui suivent la fenêtre sont fondues dans les 2 premières : la fin rejoint le début
 * sans couture), loudnorm -16 LUFS, muxée sur le rendu Remotion → out/<nom>-final.mp4 (H.264 CRF 20).
 *
 *   node scripts/loop-mix.js [loop] [--music loop-1.mp3] [--vol 0.9]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const MUSIC_DIR = path.join(ROOT, "public", "music");
const OUT_DIR = path.join(ROOT, "out");
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOOP = 60;
const XF = 2; // secondes de fondu de raccord
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString().trim());

function mix(name) {
  const video = path.join(ROOT, "out", `${name}.mp4`);
  if (!fs.existsSync(video)) throw new Error("Rendu introuvable : " + video);
  let music = arg("--music", null);
  if (music) music = path.isAbsolute(music) ? music : path.join(MUSIC_DIR, music);
  else {
    const cands = fs.readdirSync(MUSIC_DIR).filter((f) => f.startsWith(name + "-") && f.endsWith(".mp3")).map((f) => path.join(MUSIC_DIR, f));
    if (!cands.length) throw new Error(`Aucune musique ${name}-*.mp3 dans ${MUSIC_DIR}`);
    music = cands[0];
  }
  const md = dur(music);
  const start = 1.0; // on saute l'amorce
  if (md < start + LOOP + XF + 0.5) throw new Error(`Musique trop courte (${md.toFixed(1)} s) pour une boucle de ${LOOP} s`);
  const vol = Number(arg("--vol", "0.9"));
  const loopWav = path.join(OUT_DIR, `${name}-loop.wav`);
  // [tail] = 2 s qui suivent la fenêtre, fondues dans [body] = 36 s : la sortie commence par le raccord fin→début
  const filter = `[0:a]atrim=${(start + LOOP).toFixed(3)}:${(start + LOOP + XF).toFixed(3)},asetpts=N/SR/TB[tail];[0:a]atrim=${start.toFixed(3)}:${(start + LOOP + XF).toFixed(3)},asetpts=N/SR/TB[body];[tail][body]acrossfade=d=${XF}:c1=tri:c2=tri,atrim=0:${LOOP},volume=${vol},loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", music, "-filter_complex", filter, "-map", "[a]", "-ar", "48000", loopWav], { stdio: "inherit" });
  const out = path.join(OUT_DIR, `${name}-final.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-i", loopWav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
  fs.unlinkSync(loopWav);
  console.log(`${name} : ${out} · ${dur(out).toFixed(2)} s · ${(fs.statSync(out).size / 1048576).toFixed(1)} Mo · musique ${path.basename(music)}`);
}

const which = process.argv[2] && !process.argv[2].startsWith("--") ? [process.argv[2]] : ["loop"];
for (const n of which) mix(n);
