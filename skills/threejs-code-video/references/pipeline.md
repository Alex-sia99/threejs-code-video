# Pipeline complet d'un film en code

```
script.json ──(scripts/tts.js : ElevenLabs)──► public/vo/lNN.mp3 + enveloppes ──► src/film/timeline.json
                                                                                     │
            World (décor) + Props + characters  ◄── stage(t) / cameraAt(t) (Shots) ◄─┘  at("lNN"), sceneById()
                                                                                     │
            Overlays (sous-titres, cartes, flash, fondus) ─────────────────────────► index.tsx (ThreeCanvas + <Audio>)
                                                                                     │
                                  bundle ──► stills de contrôle ──► render ──► scripts/mix.js (musique, loudnorm, < 48 Mo)
```

## 1. script.json
```json
{
  "model": "eleven_v4", "language": "fr", "outroSeconds": 9,
  "voices": { "alex": { "voice": "alex", "stability": 0.45, "similarity": 0.85 }, "claude": { "voice": "bIHbv24MWmeRgasZH58o", "stability": 0.5, "similarity": 0.75 } },
  "scenes": [ { "id": "desk", "note": "…" }, { "id": "pull" }, …, { "id": "title" } ],
  "lines": [ { "id": "l01", "who": "alex", "scene": "desk", "pauseBefore": 1.6, "mood": "tired", "text": "[sighs] Il est deux heures du matin…" } ]
}
```
- `pauseBefore` = silence avant la réplique ; les scènes commencent à la première réplique moins ce silence ; une scène sans réplique (carte titre) commence 1,2 s après la dernière réplique.
- Les balises audio v4 (`[sighs]`, `[gasps]`, `[laughs]`) sont retirées des sous-titres (`subtitle = text.replace(/\[[^\]]+\]\s*/g, "")`).
- Ordre de grandeur : 42 répliques ≈ 3 500 caractères ≈ 4 min 30 de film.

## 2. Timeline (`src/film/timeline.ts`)
```ts
export const TIMELINE = data as unknown as { total: number; lines: TLine[]; scenes: TScene[] };
export const TOTAL_FRAMES = Math.ceil(TIMELINE.total * FPS);
export const at = (id: string) => lineById(id).start;          // début d'une réplique
export const endOf = (id: string) => { const l = lineById(id); return l.start + l.dur; };
export function amp(who: Who, t: number): number { /* enveloppe 0-1 interpolée à 30 i/s */ }
export function subtitleAt(t: number) { return TIMELINE.lines.find((l) => t >= l.start - 0.1 && t < l.start + l.dur + 0.4) || null; }
export const ramp = (t, a, b, fn = ease) => fn((t - a) / Math.max(0.0001, b - a));   // 0→1 entre a et b
export const window01 = (t, a, b, c, d) => Math.min(ramp(t, a, b, easeOut), 1 - ramp(t, c, d, easeIn)); // 0→1→0
```
Tout le reste du film (décors, actions, caméra, cartes) se cale sur `at("l14")`, `endOf("l16")`, `sceneById("bank").start` : si le texte change, on relance le TTS et la mise en scène suit.

## 3. Composition (`index.tsx`)
```tsx
const Scene3D: React.FC<{ t: number }> = ({ t }) => {
  const st = stage(t);
  const cam = cameraAt(t, st);
  const quat = useMemo(() => lookQuat(cam.pos, cam.look), [cam.pos[0], cam.pos[1], cam.pos[2], cam.look[0], cam.look[1], cam.look[2]]);
  return (
    <>
      <PerspectiveCamera makeDefault fov={cam.fov} near={0.1} far={1500} position={cam.pos} quaternion={quat} />
      <Fog2 near={inRoom ? 5 : 70} far={inRoom ? 32 : 560} />
      <Lights2 keyPos={add(A.pos, [6, 10, 8])} target={add(A.pos, [0, 1, 0])} />
      {inRoom ? <RoomScene st={st} t={t} /> : <WorldScene st={st} t={t} />}
      {A.visible && <group position={A.pos} scale={A.scale}><Alex position={[0, 0, 0]} rotationY={A.rot} t={t} talk={A.talk} pose={A.pose} mood={A.mood} … /></group>}
    </>
  );
};
export const AgenticTour: React.FC = () => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: P2.bg }}>
      <ThreeCanvas width={width} height={height} dpr={1} shadows="percentage" gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, outputColorSpace: THREE.SRGBColorSpace }}>
        <Scene3D t={t} />
      </ThreeCanvas>
      <UiOverlays t={t} st={st} /> <Grade st={st} /> <Subtitles t={t} />
      {TIMELINE.lines.map((l) => (
        <Sequence key={l.id} from={Math.round(l.start * fps)} durationInFrames={Math.ceil(l.dur * fps) + 2} layout="none"><Audio src={staticFile(l.file)} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
```
Règles : **jamais `useFrame`**, tout dérive de `useCurrentFrame()` (`t = frame / fps`) ; `useMemo` pour les géométries ; instancier ce qui se répète ; `dpr={1}`.

## 4. Rendu
```bash
npx remotion bundle --public-dir public-as --out-dir build --log=error         # une fois par changement de code
npx remotion still build AgenticTour out.png --frame=1800 --scale=0.5 --gl=angle # stills de contrôle (planche ffmpeg tile=4x4)
npx remotion render build AgenticTour out/agentic/agentic-tour.mp4 --gl=angle   # ≈ 0,1-0,2 s / image en 1080p
```
- `--public-dir public-as` : le dossier `public` du projet pesait 1,2 Go (sorties de machines) et était copié à chaque rendu (2 min 44) → un dossier léger dédié.
- Bundles séparés : `build/` (film) et `build-loops/` (boucles) — rebundler `build/` pendant un rendu du film casse le rendu.
- Pendant un rendu long, lancer le reste (TTS, musique, scripts) mais pas d'autre rendu lourd.
- Planche de contrôle : `ffmpeg -i final.mp4 -vf "fps=1/16.8,scale=640:-1,tile=4x4" -frames:v 1 sheet.png` puis **l'ouvrir et l'analyser**.

## 5. Mix et livraison (`scripts/mix.js`)
```js
const filter = `[0:a]volume=${VOICE}[v];[1:a]aloop=loop=${loops}:size=2e9,atrim=0:${filmDur},volume=${VOL},afade=t=in:d=3,afade=t=out:st=${fadeOutStart}:d=7[m];[v][m]amix=inputs=2:duration=first:dropout_transition=4:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
// puis : -map 0:v -map [a] -c:v copy -c:a aac -b:a 192k -movflags +faststart
```
Musique à 0,13-0,14 de volume sous des voix ElevenLabs ; version messagerie : `scale=1920:-2 -crf 27` puis 30 puis 720p jusqu'à < 48 Mo (un 720p CRF 26 peut peser PLUS qu'un 1080p CRF 30 sur un décor néon très détaillé).
