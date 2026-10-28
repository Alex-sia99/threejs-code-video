# Le monde : grand, lisible, déterministe

Reproche sur la v1 : « on avait l'impression d'être dans un tunnel ». La v2 pose un monde de 760 m de côté, des quartiers reliés par des téléportations (flash), et des plans larges qui montrent l'immensité.

## Briques (`World2.tsx` → `world/World.tsx`)
- **Sol** `GridFloor` : plan 1600 m avec une texture canvas de grille (lignes larges translucides + fines brillantes) en `map` **et** `emissiveMap` (emissiveIntensity 0,42) → lignes qui luisent ; `receiveShadow`.
- **Mégapole** `Skyline` : 1 100 tours en **deux `instancedMesh`** (texture de fenêtres chaudes / froides en `map`+`emissiveMap`), hauteurs 6-70 m, plus hautes au loin ; positions tirées au sort avec `rng(seed)` et **refusées dans les clairières** (`clearings: { x, z, r }[]`) où vivent les scènes. `useLayoutEffect` pose les matrices (`makeScale` + `setPosition`, `instanceMatrix.needsUpdate = true`).
- **Cœur hexagonal** `CoreHex` : prisme à 6 faces (émissif) + wireframe + noyau `meshBasicMaterial` (`toneMapped={false}`) + 3 anneaux `torusGeometry(r, tube, 6, 6)` (= hexagones) en rotation lente + faisceau vertical translucide + `pointLight` intensité 400, distance 9r. Rayon 40 pour dominer les plans larges.
- **Particules** `Motes` : `<points>` + `bufferAttribute` de 1 500 positions, dérive `sin(t·0.3 + phase)`, `pointsMaterial size 0.7 sizeAttenuation depthWrite={false}`.
- **Ciel** `Sky` : sphère 900 m `BackSide` avec un dégradé canvas (3 teintes + 700 étoiles) ; variante « aube » = seconde sphère teintée en transparence.
- **Piliers de lumière** : cylindres ouverts translucides (`opacity 0.16 + 0.06·sin`).
- **Brouillard** `fog` linéaire : monde 70 → 560 m, intérieur 5 → 32 m.
- **Lumières** `Lights2` : hémisphère + ambiance faibles, **clé directionnelle avec ombres qui suit le personnage** (`shadow-camera` ±16 m autour de la cible, `shadow-bias −0.0004`, map 2048) + fill bleu + contre-jour orange. Mettre `castShadow` sur les personnages et les accessoires proches, `receiveShadow` sur le sol.

## Quartiers
```ts
export const D = { plaza: [0,0,0], dashboard: [-80,0,-30], machines: [70,0,10], pipeline: [170,0,-60], bank: [-90,0,60], studio: [10,0,95], brain: [100,0,95], time: [0,26,60] };
export const CLEARINGS = [{ x: 0, z: 0, r: 42 }, { x: -80, z: -30, r: 32 }, …, { x: 0, z: -150, r: 62 }];
```
Chaque scène rend seulement les accessoires de son quartier (`{s === "bank" && <group>…</group>}`) : le reste du monde (sol, tours, cœur, particules) est toujours là, ce qui donne l'échelle.

## Accessoires (`Props2.tsx` → `world/Props.tsx`)
`Sign` (texte canvas sur un plan, `roundRect` + `fillText`), `Conveyor` (tapis + 8 stations avec bras qui travaillent + objets qui se transforment selon `k`), `VideoWall` (instancedMesh d'écrans allumés progressivement avec `setColorAt`), `BigClock` (aiguilles `k·2π·1.5`), `Console`, `MachineBuilding` (usine avec enseigne et emblème sur le toit), `Platform`, `Vortex` (16 anneaux hexagonaux + 60 traînées pour l'aspiration). Tout est `déterministe` : `rng(seed)` (mulberry32), jamais `Math.random()`.

## Champ de vision
Three.js prend un **FOV vertical**. En portrait (9:16) on pense en horizontal et on convertit : `vfov = 2·atan(tan(fov/2)·(H/W))`. En 16:9, 26-30° pour un gros plan, 34-46° pour un plan moyen, 48-56° pour un plan large.

## Intérieur (bureau)
Le « monde réel » (`Room` + `Desk` : écran à z −0,3, chaise à z +0,55, personnage `rot = π` face à l'écran) est placé loin (`ROOM = [500, 0, 0]`) pour ne jamais apparaître dans le monde. Lumières : point froid + point chaud la nuit ; au matin, directionnel chaud + ambiance + plan lumineux dans l'embrasure.
