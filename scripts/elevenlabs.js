/**
 * ElevenLabs en REST pur (zéro dépendance). La clé ELEVENLABS_API_KEY et l'identifiant de votre voix
 * (VOICE_ME) sont lus dans le fichier .env à la racine du dépôt — jamais affichés, jamais écrits dans le code.
 *
 *   const el = require("./elevenlabs");
 *   const mp3 = await el.tts({ text, voice: "me" | "<voice_id>", model: "eleven_v4", language: "fr", previousText, nextText });
 *   const fx  = await el.sfx({ text: "deep cinematic whoosh", durationSeconds: 2.5, loop: false });
 *   const list = await el.voices();
 *
 *   CLI : node scripts/elevenlabs.js tts "<texte>" sortie.mp3 [--voice me|<id>] [--model eleven_v4] [--lang fr]
 *         node scripts/elevenlabs.js sfx "<description>" sortie.mp3 [--seconds 3] [--loop]
 *         node scripts/elevenlabs.js voices
 */
const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, "..", ".env");
let envCache = null;
function env() {
  if (envCache) return envCache;
  envCache = {};
  try {
    for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m) envCache[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  if (process.env.ELEVENLABS_API_KEY) envCache.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  return envCache;
}
function key() {
  const k = env().ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY absente du .env (lancer : npx -y @elevenlabs/cli@latest onboard init)");
  return k;
}
/** Identifiant de voix : "me" → VOICE_ME du .env (votre voix clonée ou pré-faite) ; sinon un voice_id ElevenLabs. */
function voiceId(v) {
  if (!v || v === "me") {
    const id = env().VOICE_ME;
    if (!id) throw new Error("VOICE_ME absente du .env");
    return id;
  }
  return v;
}

const API = "https://api.elevenlabs.io/v1";
async function call(pathname, opts = {}) {
  const r = await fetch(API + pathname, { ...opts, headers: { "xi-api-key": key(), ...(opts.headers || {}) } });
  if (!r.ok) {
    let detail = "";
    try { detail = JSON.stringify((await r.json()).detail).slice(0, 300); } catch {}
    throw new Error(`ElevenLabs ${r.status} ${pathname.split("?")[0]} ${detail}`);
  }
  return r;
}

/**
 * Texte → parole. Retourne { buffer, characters }.
 * model eleven_v4 : meilleure fidélité de clonage, balises audio ([laughs], [whispers]…), seulement stability/similarity.
 */
async function tts({ text, voice = "me", model = "eleven_v4", language = "fr", stability = 0.5, similarity = 0.8, previousText, nextText, format = "mp3_44100_128", normalize = "auto" }) {
  const body = {
    text, model_id: model, language_code: language,
    voice_settings: { stability, similarity_boost: similarity },
    apply_text_normalization: normalize,
  };
  if (previousText) body.previous_text = previousText;
  if (nextText) body.next_text = nextText;
  const r = await call(`/text-to-speech/${voiceId(voice)}?output_format=${format}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const buffer = Buffer.from(await r.arrayBuffer());
  return { buffer, characters: Number(r.headers.get("x-character-count") || text.length) };
}

/** Description → effet sonore (0,5-30 s), optionnellement bouclable. Retourne un Buffer mp3. */
async function sfx({ text, durationSeconds = null, promptInfluence = 0.4, loop = false, format = "mp3_44100_128" }) {
  const body = { text, prompt_influence: promptInfluence, loop, model_id: "eleven_text_to_sound_v2" };
  if (durationSeconds) body.duration_seconds = durationSeconds;
  const r = await call(`/sound-generation?output_format=${format}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return Buffer.from(await r.arrayBuffer());
}

async function voices() {
  const j = await (await call("/voices?show_legacy=false")).json();
  return (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, category: v.category, labels: v.labels || {} }));
}

async function subscription() {
  const j = await (await call("/user/subscription")).json();
  return { tier: j.tier, used: j.character_count, limit: j.character_limit };
}

module.exports = { tts, sfx, voices, subscription, voiceId };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  const arg = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
  const has = (k) => rest.includes(k);
  (async () => {
    if (cmd === "voices") {
      for (const v of await voices()) console.log(`${v.id}  ${v.name} [${v.category}] ${Object.values(v.labels).join("/")}`);
      const s = await subscription();
      console.log(`abonnement ${s.tier} : ${s.used}/${s.limit} caractères`);
    } else if (cmd === "tts") {
      const [text, out] = rest;
      const r = await tts({ text, voice: arg("--voice", "me"), model: arg("--model", "eleven_v4"), language: arg("--lang", "fr") });
      fs.writeFileSync(out, r.buffer);
      console.log(`${out} : ${Math.round(r.buffer.length / 1024)} Ko, ${r.characters} caractères`);
    } else if (cmd === "sfx") {
      const [text, out] = rest;
      const b = await sfx({ text, durationSeconds: arg("--seconds") ? Number(arg("--seconds")) : null, loop: has("--loop") });
      fs.writeFileSync(out, b);
      console.log(`${out} : ${Math.round(b.length / 1024)} Ko`);
    } else {
      console.log("usage : elevenlabs.js voices | tts <texte> <sortie.mp3> [--voice me|id] [--model m] [--lang fr] | sfx <texte> <sortie.mp3> [--seconds n] [--loop]");
    }
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
