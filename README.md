# threejs-code-video — des vidéos 100 % en code (Three.js + Remotion)

Template prêt à l'emploi pour créer des vidéos **sans logiciel de montage ni modèle 3D téléchargé** : tout est écrit en TypeScript (géométries Three.js, lumières, caméra, textes), rendu image par image par [Remotion](https://remotion.dev), avec des voix générées (ElevenLabs) et une musique mixées en ffmpeg.

Il condense ce qui a été appris en fabriquant un court-métrage de 4 min 30 (« Projeté dans Agentic OS ») et deux écrans de live en boucle : un **personnage sculpté d'après une photo**, une **mascotte en voxels**, un **monde néon** immense, une **caméra par plan** calée sur les répliques, des **boucles parfaites** de 60 s.

Trois compositions sont fournies :

| Composition | Ce que c'est | Commande |
|---|---|---|
| `CharacterLab` | votre personnage à côté de votre photo, pour itérer la ressemblance | `npm run still:lab` |
| `ExampleFilm` | mini-film de 20 s : 3 répliques, monde, caméra, sous-titres, carte titre | `npm run render:film` |
| `ExampleLoop` | boucle parfaite de 60 s (route de montagne, tapis roulant, éléphant) | `npm run render:loop` |

## Installation en 5 commandes

```bash
git clone https://github.com/Alex-sia99/threejs-code-video.git && cd threejs-code-video
npm install
node scripts/timeline-placeholder.js      # timeline + voix muettes de travail (sans clé)
npx remotion still src/index.ts CharacterLab out/lab.png --frame=0 --gl=angle
npx remotion render src/index.ts ExampleFilm out/film.mp4 --gl=angle
```

Prérequis : Node ≥ 20, **ffmpeg et ffprobe dans le PATH**, Python 3 + Pillow pour `scripts/check-loop.py`. Sous Windows, `--gl=angle` évite les écrans noirs.

## Faire son personnage

1. Photo de face dans `public/characters/ref.jpg`.
2. `npm run still:lab` puis ouvrez `out/lab.png` : photo à gauche, modèle à droite. Autres vues : `--props='{"view":"front"}'` (`face`, `front`, `profile`, `body`, `claude`, `duo`).
3. Ajustez `src/characters/Person.tsx` : `HEAD_R` (proportions du crâne), `FEATURES` (reliefs gaussiens : menton, joues, arcades, orbites, nez, lèvres — direction, largeur, amplitude), `LOCKS` (mèches), `PERSON` (couleurs), et les blocs moustache / bouc / plugs (supprimez ce qui ne vous ressemble pas).
4. Règle d'or : **un trait = un volume**. Jamais un relief sculpté et une pièce rapportée pour le même nez. Regardez chaque rendu avant de conclure.

La mascotte (`src/characters/Mascot.tsx`) se construit depuis un sprite pixel-art : remplacez `MASCOT_PIXELS` et les couleurs.

## Faire son film

1. Écrivez `src/film/script.json` : voix (`"me"` = `VOICE_ME` du `.env`, ou un `voice_id` ElevenLabs), scènes, répliques avec `pauseBefore`, `mood`, balises `[sighs]`…
2. Voix : copiez `.env.example` en `.env`, lancez `npx -y @elevenlabs/cli@latest onboard init` (écrit la clé) puis `node scripts/tts.js` → `public/vo/*.mp3` + `src/film/timeline.json` (début, durée, enveloppe de la bouche pour chaque réplique). Sans clé : `node scripts/timeline-placeholder.js`.
3. Mettez en scène dans `src/film/Film.tsx` : `stage(t)` (qui est où, quelle humeur, quels accessoires) et `cameraAt(t)` (liste de plans par scène, calés sur `at("l02")`, `sceneById("title")`). Le monde vient de `src/world/World.tsx` et `Props.tsx`.
4. Contrôlez par des images fixes : `npx remotion still src/index.ts ExampleFilm out/f.png --frame=300 --gl=angle` — **ouvrez-les et regardez**.
5. Rendez (`npm run render:film`), déposez une musique dans `public/music/`, puis `node scripts/mix.js` → `out/film-final.mp4` (−16 LUFS) et `out/film-telegram.mp4` (< 48 Mo).

## Faire une boucle (écran de live)

`src/loops/ExampleLoop.tsx` montre les règles : `LOOP = 60`, toute oscillation via `cyc(T, k)` avec `k` entier, toute traversée via `frac`, le personnage avec le temps dilaté `CT(T) = T·π/3` (10·f cycles par boucle pour toute fréquence f), décor en tapis roulant modulo `DIST`, nuages qui dérivent d'exactement une largeur par boucle, événements au milieu de la boucle. Vérifiez : `npm run render:loop` puis `python scripts/check-loop.py out/loop.mp4` (le raccord doit être du même ordre que deux images consécutives). Musique bouclée : `public/music/loop-1.mp3` puis `node scripts/loop-mix.js`.

## Pièges connus

Voir `skills/threejs-code-video/references/pitfalls.md` (LatheGeometry et normales inversées, Tailwind `img{max-width:100%}`, bundles séparés pendant un rendu, pop-ups sur les sous-titres, fichiers > 50 Mo…). Le dossier `skills/` contient le skill complet (méthode en 7 étapes + références) utilisable tel quel par un agent de code.

## Licence

MIT. Aucune clé, aucune photo ni voix personnelle ne doit être commitée (`.env` et les mp3 générés sont ignorés par git).
