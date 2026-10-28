/**
 * Finalisation du film : mixe une musique (public/music/*.mp3) sous les voix et les effets (volume bas,
 * fondu d'entrée/sortie, bouclée si plus courte), normalise à -16 LUFS, puis produit une version < 48 Mo
 * (Telegram / messageries).
 *
 *   node scripts/mix.js [--music ma-musique.mp3] [--vol 0.14] [--voice 1.0]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "out", "film.mp4");
const MUSIC_DIR = path.join(ROOT, "public", "music");
const OUT_DIR = path.join(ROOT, "out");
const OUT = path.join(OUT_DIR, "film-final.mp4");
const OUT_TG = path.join(OUT_DIR, "film-telegram.mp4");
fs.mkdirSync(OUT_DIR, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const VOL = Number(arg("--vol", "0.14"));
const VOICE = Number(arg("--voice", "1.0"));

const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString().trim());
if (!fs.existsSync(SRC)) throw new Error("Rendu introuvable : " + SRC);
const filmDur = dur(SRC);

let music = arg("--music", null);
if (music) music = path.isAbsolute(music) ? music : path.join(MUSIC_DIR, music);
else {
  const cands = fs.readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".mp3") && !f.startsWith("loop")).map((f) => path.join(MUSIC_DIR, f));
  if (!cands.length) throw new Error("Aucune musique dans " + MUSIC_DIR);
  music = cands.map((f) => ({ f, d: dur(f) })).sort((a, b) => b.d - a.d)[0].f;
}
const musicDur = dur(music);
const loops = Math.max(0, Math.ceil(filmDur / musicDur) - 1);
console.log(`film ${filmDur.toFixed(1)} s · musique ${path.basename(music)} ${musicDur.toFixed(1)} s (${loops ? loops + " boucle(s)" : "pas de boucle"}) · volume ${VOL}`);

const fadeOutStart = Math.max(0, filmDur - 7);
const filter = `[0:a]volume=${VOICE}[v];[1:a]aloop=loop=${loops}:size=2e9,atrim=0:${filmDur.toFixed(2)},volume=${VOL},afade=t=in:d=3,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=7[m];[v][m]amix=inputs=2:duration=first:dropout_transition=4:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", SRC, "-i", music, "-filter_complex", filter, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT], { stdio: "inherit" });
console.log("final :", OUT, Math.round(fs.statSync(OUT).size / 1048576) + " Mo");

const encode = (scale, crf) => execFileSync("ffmpeg", ["-v", "error", "-y", "-i", OUT, "-vf", `scale=${scale}:-2`, "-c:v", "libx264", "-preset", "medium", "-crf", String(crf), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", OUT_TG], { stdio: "inherit" });
encode(1920, 27);
let mb = fs.statSync(OUT_TG).size / 1048576;
if (mb > 48) { encode(1920, 30); mb = fs.statSync(OUT_TG).size / 1048576; }
if (mb > 48) { encode(1280, 27); mb = fs.statSync(OUT_TG).size / 1048576; }
console.log("telegram :", OUT_TG, mb.toFixed(1) + " Mo");
