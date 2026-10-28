---
name: threejs-code-video
description: "Créer des VIDÉOS 100 % EN CODE avec Three.js + Remotion (@remotion/three, React Three Fiber) : personnage sculpté en primitives d'après une photo (sosie), mascotte en voxels, monde néon immense, film narré (script → voix ElevenLabs → timeline → mise en scène et caméra par plan → sous-titres/cartes → rendu → mix), et boucles parfaites de 60 s pour écrans de live (début/fin de stream). À utiliser dès qu'on parle de « vidéo en code », « Three.js », « 3JS », « Remotion 3D », « personnage en primitives », « boucle parfaite », « écran de live », « film sans modèle externe ». Condensé de tout ce qui a été appris sur le film « Projeté dans Agentic OS » et les écrans de live, avec le template prêt à l'emploi (dépôt threejs-code-video)."
---

# Vidéos en code — Three.js + Remotion

## Quand l'utiliser
Dès qu'il faut produire une vidéo (film narré, boucle, écran de live, clip) **sans modèle 3D téléchargé ni montage manuel** : tout est écrit en TypeScript (géométries Three.js, matériaux, caméra, lumières, overlays HTML), rendu image par image par Remotion, avec des voix générées (ElevenLabs) et une musique (Suno/autre) mixées en ffmpeg.

## Le template (point de départ)
Dépôt **threejs-code-video** (copie locale : `D:/VS CODE FORMATION/threejs-code-video`, GitHub `Alex-sia99/threejs-code-video`). Il contient :
- `src/characters/Person.tsx` (tête sculptée paramétrable), `Mascot.tsx` (voxels depuis un sprite), `Lab.tsx` (comparaison photo ↔ 3D) ;
- `src/world/World.tsx` + `Props.tsx` (plaine quadrillée, mégapole instanciée, cœur hexagonal, particules, ciel, lumières, panneaux, convoyeur, mur de vidéos, horloge…) ;
- `src/film/` (timeline, script.json, Film.tsx = mini-film de 20 s) et `src/loops/` (common.tsx + ExampleLoop.tsx = boucle 60 s) ;
- `scripts/` : `tts.js` (ElevenLabs → mp3 + enveloppes + timeline.json), `timeline-placeholder.js` (sans clé), `mix.js`, `loop-mix.js`, `check-loop.py`.

Installation en 5 commandes : `git clone … && cd threejs-code-video && npm install && node scripts/timeline-placeholder.js && npx remotion still src/index.ts CharacterLab out/lab.png --frame=0 --gl=angle`.

## Méthode en 7 étapes (détail dans references/)
1. **Script d'abord** (`script.json` : voix, scènes, répliques avec `pauseBefore`, humeur) → [pipeline.md](references/pipeline.md).
2. **Voix + timeline** : `node scripts/tts.js` (ElevenLabs eleven_v4, request stitching, enveloppe RMS 30 i/s) ou `timeline-placeholder.js` ; tout le film se cale ensuite sur `at("lNN")` → [audio.md](references/audio.md).
3. **Personnage** : sculpter la tête (sphère + reliefs gaussiens), comparer à la photo dans `CharacterLab`, itérer, **faire valider** → [characters.md](references/characters.md).
4. **Monde** : grand, lisible, déterministe (rng à graine), quartiers avec clairières → [world.md](references/world.md).
5. **Mise en scène et caméra** : `stage(t)` puis `cameraAt(t)` = listes de plans par scène, champ/contre-champ `cu()` → [camera.md](references/camera.md).
6. **Overlays** : sous-titres en bas, cartes compactes, une seule carte à la fois, jamais sur les sous-titres ni les visages.
7. **Rendu, mix, livraison** : bundle une fois, stills de contrôle, rendu `--gl=angle`, mix ffmpeg `loudnorm` −16 LUFS, version < 48 Mo → [pipeline.md](references/pipeline.md).

Pour une boucle d'écran de live : [loops.md](references/loops.md) (fréquences entières, tapis roulant modulo, rien au raccord, vérification PIL).

## Règles non négociables (apprises à la dure)
- **Regarder chaque rendu avant de l'envoyer** : rendre un still, l'ouvrir, l'analyser trait par trait (le client a vu « deux nez, deux bouches » que je n'avais pas regardés).
- **Un trait = un volume** : jamais un relief sculpté ET une pièce rapportée pour le même nez, la même bouche.
- **La ressemblance se valide par la personne** : envoyer des essais, attendre ses commentaires, ne rendre aucune vidéo avant son OK.
- **Caméra** : champ de vision three.js = VERTICAL ; penser les gros plans à 2,5-4,8 m avec décalage latéral, sinon la caméra finit dans l'épaule, le t-shirt ou derrière l'écran.
- **Boucles** : nombre ENTIER de cycles par boucle pour chaque fréquence, aucun événement au raccord, vérification par différence d'images.
- **Pop-ups** : petits, une seule carte à la fois, zone des sous-titres (y > ~880 px en 1080p) interdite.
- **Rendu** : bundler dans `build/` pour le film et `build-loops/` pour les boucles (un rendu en cours ne doit pas voir son bundle écrasé) ; dossier `public` léger (`--public-dir` si besoin).

## Pièges connus
Voir [pitfalls.md](references/pitfalls.md) : LatheGeometry (normales inversées si profil du haut vers le bas), Tailwind `img{max-width:100%}`, heredoc bash avec `'''`, Telegram bridé sur une IP, versions > 50 Mo, etc.
