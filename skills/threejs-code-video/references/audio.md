# Audio : voix, enveloppes, effets, musique, mix

## ElevenLabs en REST pur (`scripts/elevenlabs.js`)
Clé `ELEVENLABS_API_KEY` et identifiant de voix lus dans `.env` (jamais affichés, jamais dans le code). Onboarding sans copier la clé : `npx -y @elevenlabs/cli@latest onboard init` (ouvre le navigateur, écrit la clé dans `.env`).
```js
async function tts({ text, voice = "me", model = "eleven_v4", language = "fr", stability = 0.5, similarity = 0.8, previousText, nextText, format = "mp3_44100_128", normalize = "auto" }) {
  const body = { text, model_id: model, language_code: language, voice_settings: { stability, similarity_boost: similarity }, apply_text_normalization: normalize };
  if (previousText) body.previous_text = previousText;   // request stitching : continuité d'intonation
  if (nextText) body.next_text = nextText;
  const r = await call(`/text-to-speech/${voiceId(voice)}?output_format=${format}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { buffer: Buffer.from(await r.arrayBuffer()), characters: Number(r.headers.get("x-character-count") || text.length) };
}
async function sfx({ text, durationSeconds = null, promptInfluence = 0.4, loop = false }) { /* POST /sound-generation, durée 0,5-30 s */ }
```
- `eleven_v4` : meilleure fidélité pour une voix clonée, balises `[sighs]`, `[gasps]`, `[laughs]` ; seuls `stability`/`similarity_boost` existent (pas de `style`/`speed`).
- Voix clonée : stabilité 0,45 / similarité 0,85 ; voix pré-faite pour la mascotte (Will) : 0,5 / 0,75. Tester 3 voix en français sur une phrase et vérifier la prononciation par transcription Whisper avant de choisir.
- Starter = 40 000 caractères/mois ; un film de 4 min 30 ≈ 3 500 caractères. Le cache (`index.json` : md5 de texte|voix|modèle|réglages) évite de regénérer les répliques inchangées.
- Durée réelle via `ffprobe -show_entries format=duration`.

## Enveloppe d'amplitude pour la bouche (`scripts/tts.js`)
```js
function envelope(file) {   // RMS par image à 30 i/s, normalisé 0-100
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const win = Math.round(8000 / FPS); const out = []; let peak = 1;
  for (let i = 0; i + win <= samples.length; i += win) { let s = 0; for (let j = i; j < i + win; j++) s += samples[j] * samples[j]; const rms = Math.sqrt(s / win); out.push(rms); if (rms > peak) peak = rms; }
  return out.map((v) => Math.round(Math.min(1, v / (peak * 0.7)) * 100));
}
```
Côté composition : `amp(who, t)` moyenne deux valeurs consécutives → `open = clamp01(talk) * 0.085` (bouche) ou rebond + yeux (mascotte).

## Effets sonores
`sound-generation` ElevenLabs (durée 0,5-30 s, sinon erreur 400) : « deep cinematic whoosh being sucked into a glowing digital portal » (2,6 s), « short sci-fi teleport zap » (1 s), « soft futuristic UI pop » (0,5 s), « gentle smartphone notification chime » (0,9 s), « bright digital success chime » (1,2 s), « soft thud of a person landing on a hard glowing floor » (0,8 s). Posés dans la composition par `<Sequence from><Audio src volume/></Sequence>` à `sceneById("pull").start − 0.2`, à chaque entrée de quartier (`warp`), à l'apparition des cartes (`ui`), etc.

## Musique
Suno V5_5 via Kie (`POST /api/v1/generate`, `instrumental: true`, style détaillé « Epic cinematic hybrid soundtrack, synthwave meets orchestral, 104 BPM… no vocals », puis `GET /api/v1/generate/record-info?taskId=` toutes les 20 s ; 2 titres de ~3 min pour 0,06 $). Pour un film de 4 min 30, la piste est bouclée (`aloop`) et fondue à la fin. Pour une boucle de 60 s : fenêtre + `acrossfade` (voir loops.md).

## Mix (`scripts/mix.js`)
Voix ElevenLabs ≈ −20 LUFS, musique Suno ≈ −14 : musique à 0,13-0,14, voix ×1, `amix … normalize=0`, puis `loudnorm=I=-16:TP=-1.5:LRA=11`. Vidéo copiée (`-c:v copy`), AAC 192 k, `+faststart`.

## Livraison Telegram
Bot API : 50 Mo max. 1080p CRF 27 → 66 Mo ; CRF 30 → 47 Mo ; le 720p CRF 26 → 55 Mo (le décor néon compresse mal) : viser le 1080p CRF 30. Envoi par `curl` multipart avec `--resolve api.telegram.org:443:149.154.167.220` (l'IP du DNS plafonne à 15 Ko/s) et `--speed-limit 20000 --speed-time 60`.
