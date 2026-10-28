# Boucles parfaites (écrans de live, fonds animés)

Le client veut une boucle qu'on peut laisser tourner : **aucun saut au raccord**, et pas d'« événement qui passe à la dernière seconde » (un bateau qui traverse au moment du raccord n'est pas une boucle).

## Les trois outils (`LiveScreens/common.tsx` → `loops/common.tsx`)
```ts
export const LOOP = 60; export const FPS = 30; export const FRAMES = LOOP * FPS;
export const cyc = (T: number, k: number, phase = 0) => Math.sin((2 * Math.PI * k * T) / LOOP + phase); // k cycles ENTIERS par boucle
export const frac = (T: number, k = 1, phase = 0) => ((((k * T) / LOOP + phase) % 1) + 1) % 1;          // 0→1, k fois par boucle
```
- Tout ce qui oscille utilise `cyc(T, k)` avec `k` entier : palmiers `k=10`, respiration, oiseaux `k=120` pour le battement.
- Tout ce qui traverse utilise `frac(T, passes, phase)` : les oiseaux traversent `passes` fois, et sont **hors champ** quand `frac = 0` (choisir `span` plus large que le champ).
- Nuages : dérive d'**exactement une largeur de champ par boucle** → `x = ((x0 + (T / LOOP) * span + span / 2 + span * 10) % span) - span / 2`.

## Le temps « personnage » : `CT(T) = T·π/3`
Les composants personnages ont des fréquences internes fixes (marche 6,2 rad/s, respiration 2,1, flottement 1,6, rebond de la mascotte 14, clignement…). Pour qu'elles bouclent toutes, on leur passe un temps dilaté : avec `t = T·π/3`, une fréquence `f` rad/s fait `10·f` cycles en 60 s — entier dès que `f` est un multiple de 0,1 (6,2 → 62 pas, 2,1 → 21, 14 → 140). Le clignement (modulo 4,1 s) n'est pas périodique mais n'est pas déclenché à T = 0 ni à T = 60 : invisible.
```ts
const CT = (T: number) => (T * Math.PI) / 3;
<Alex position={[0, 0, 0]} rotationY={Math.PI} t={CT(T)} pose="walk" mood="happy" />
```

## Tapis roulant (décor qui défile)
```ts
const DIST = 72;            // mètres parcourus par boucle
const V = DIST / LOOP;      // 1,2 m/s
const treadZ = (z0: number, T: number) => ((((z0 + V * T + 64) % DIST) + DIST) % DIST) - 64; // toujours dans [-64, 8) : identique en T = 0 et T = LOOP
```
Les objets (arbres, rochers, bornes, panneau) ont un `z0` tiré dans `[-64, 8)` ; ils reviennent exactement à leur place après une boucle. La texture de la route défile de `V·T / 6` tuiles (tuile = 6 m) : 12 périodes exactes par boucle (`tex.offset.set(0, -(V * T) / 6)` dans un `useLayoutEffect`).

## Événements : au milieu, jamais au raccord
L'éléphant traverse pendant `T ∈ [22, 34]` (`k = (T − 22) / 12`, `x = 17 − 34·smooth(k)`, caché hors de la fenêtre), sur le tapis roulant (`treadZ(−80, T)` → il passe loin devant, pas dans les pieds du personnage). Le bateau de la v1 traversait à la dernière seconde : supprimé.

## Caméra et lumière
Caméra fixe ou **dérive 1 cycle/boucle** (`pos.x + 0.12·cyc(T, 1)`), lumières constantes. Les coups d'œil du personnage vers la caméra : `g = frac(T, 3, 0.5)` et un pic lissé quand `0.42 < g < 0.58` → jamais au raccord.

## Vérification (obligatoire avant d'envoyer)
```bash
ffmpeg -i out/loop.mp4 -vf "select='eq(n\,0)+eq(n\,1)+eq(n\,1798)+eq(n\,1799)',scale=480:-1" -vsync 0 seam-%d.png
python - <<'PY'
from PIL import Image, ImageChops, ImageStat
a,b,c,d=[Image.open('seam-%d.png'%i).convert('L') for i in (1,2,3,4)]
f=lambda x,y: ImageStat.Stat(ImageChops.difference(x,y)).mean[0]
print('diff 0-1 %.2f | 1798-1799 %.2f | raccord 1799-0 %.2f' % (f(a,b),f(c,d),f(d,a)))
PY
```
Boucle propre = le raccord est du même ordre que deux images consécutives (ex. intro : 0,46 / 0,36 / 0,72 ; outro : 1,42 / 1,34 / 1,58). Script prêt : `scripts/check-loop.py` du template. Écrire les scores en ASCII (la console Windows plante sur « → » dans un `print`).

## Musique bouclée (`live-screens-mix.js` → `loop-mix.js`)
Fenêtre `[start, start + LOOP]` dont la fin est fondue dans le début (`acrossfade` de 2 s avec les 2 s qui suivent la fenêtre), puis `loudnorm` et mux : la musique rejoint son propre début sans couture.
```js
const filter = `[0:a]atrim=${start + LOOP}:${start + LOOP + XF},asetpts=N/SR/TB[tail];[0:a]atrim=${start}:${start + LOOP + XF},asetpts=N/SR/TB[body];[tail][body]acrossfade=d=${XF}:c1=tri:c2=tri,atrim=0:${LOOP},volume=${vol},loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
```

## Mise en scène d'un écran d'attente qui tient la route
Ce qui a été rejeté : un transat réduit à une planche rayée, le personnage flottant au-dessus. Ce qui a marché : un vrai transat (4 pieds, 2 longerons, 8 lattes, dossier pivotant **vers l'arrière** avec ses lattes, coussin rayé, accoudoirs), une pose dédiée (`lounge` : jambes presque horizontales, buste à −0,52 rad, bras sur le laptop), le laptop sur les cuisses avec une dalle lumineuse côté visage et un logo sur le capot, une table avec noix de coco, un parasol dont la toile est **dans le cadre**, une mer en shader (normales analytiques, Fresnel modéré vers le ciel, écume seulement près du bord), des îlots karstiques dans la brume, le badge de la chaîne et le titre en bas. Rendre, regarder, corriger : trois passes ont été nécessaires (dossier à l'envers, mains en l'air, mer « tapis orange »).
