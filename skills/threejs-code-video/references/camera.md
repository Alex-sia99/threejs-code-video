# Mise en scène et caméra

## `stage(t)` : où est qui, et dans quel état
Une fonction pure du temps qui renvoie tout ce que la scène 3D et les overlays ont besoin de savoir : positions/rotations/poses/humeurs des personnages, paramètres des accessoires (`pipelineK`, `wallLit`, `vaultOpen`…), `flash`, `fade`, cartes UI (`planCard`, `runStep`, `notif`). Tout est exprimé avec `at("lNN")` / `endOf("lNN")` / `sceneById(id)` :
```ts
case "machines": {
  const k = ramp(t, at("l14") - 0.5, endOf("l16"), (x) => clamp01(x));
  const z = lerp(D.machines[2] + 8, D.machines[2] - 44, k);
  st.alex.pos = [D.machines[0] - 1.2, 0, z]; st.alex.rot = Math.PI; st.alex.pose = walking ? "walk" : "stand";
  st.alex.armRaise = window01(t, at("l15"), at("l15") + 0.4, endOf("l15") - 0.3, endOf("l15")) * 0.6;   // il montre du doigt pendant sa réplique
  st.claude.pos = [D.machines[0] + 1.6, 1.6, z + 0.6]; st.claude.walking = walking;
}
```
Dialogue type : `duo(center, zOff, rotA, xOff)` — le personnage à gauche (`rot 0.75`, tête tournée 0,25), la mascotte à droite (`rot −0.8`), tous deux tournés vers la caméra en +z. Décaler le duo (`xOff ±7`) quand la caméra doit traverser le quartier, sinon la mascotte bouche l'objectif.

## `cameraAt(t, st)` : une liste de plans par scène
```ts
interface Shot { a: number; b: number; from: Cam; to: Cam; fn?: (x: number) => number }
function pick(shots: Shot[], t: number): Cam {
  let s = shots[0]; for (const x of shots) if (t >= x.a) s = x;
  const k = (s.fn || ease)((t - s.a) / Math.max(0.0001, s.b - s.a));
  return { pos: mix3(s.from.pos, s.to.pos, k), look: mix3(s.from.look, s.to.look, k), fov: lerp(s.from.fov, s.to.fov, k) };
}
/** Gros plan : base au sol, orientation, hauteur de tête, distance, décalage latéral, fov. */
function cu(base: V3, rot: number, h: number, dist = 2.7, side = 0.8, fov = 28): Cam {
  const dx = Math.sin(rot), dz = Math.cos(rot); const px = Math.cos(rot), pz = -Math.sin(rot);
  return cam([base[0] + dx * dist + px * side, base[1] + h + 0.08, base[2] + dz * dist + pz * side], [base[0], base[1] + h, base[2]], fov);
}
// scène « lancement » :
{ a: s0, b: at("l30") + 0.5, from: cam([0, 24, 44], [0, 2, -6], 48), to: cam([0, 3.2, 12], [0, 2, -5], 44), fn: easeOut }, // arrivée par téléportation : plongée qui descend
{ a: at("l31"), b: at("l32"), from: cu(A, st.alex.rot, hA, 2.8, 0.9, 27), to: cu(A, st.alex.rot, hA, 2.6, 0.8, 27), fn: lin }, // gros plan qui pousse doucement
{ a: at("l34"), b: at("l35"), from: cam([0, 3.2, 9], [0, 3, -20], 44), to: cam([0, 11, 18], [0, 4, -30], 46), fn: ease },  // grue vers le cœur
```
La caméra reçoit `position` + `quaternion` (`Matrix4.lookAt(eye, target, up)` → `Quaternion.setFromRotationMatrix`).

## Distances qui marchent (personnage de 2,85 m, tête à 2,4 m)
- Gros plan humain : 2,5-2,8 m, décalage latéral 0,8-0,9, fov 27-28.
- Gros plan mascotte (corps à 0,52 m au-dessus de sa base, 1,56 m de large) : 4,3-4,8 m, fov 30 — à 3,4 m elle remplit le cadre.
- Plan à deux : 5-7 m devant, fov 34-40.
- Révélation : grue de (0,5, 1,6, 7) à (2, 34, 80) en 3 s, fov 42 → 52.
- Marche dans une avenue : plan d'épaule `A + (2.4, 3.6, 7.5)` regardant `A + (0, 2.2, −16)` pour voir l'avenue, puis plan de face `A + (−3.6, 3.2, −8)`.

## Erreurs vues (et corrigées)
- Caméra **dans le t-shirt** : au moment de l'aspiration, caméra derrière le personnage qui recule vers l'écran → le passer sur le côté (`R + (2.2, 2.0, 1.4)` → `(1.1, 1.6, 0.4)`).
- Caméra **derrière l'écran / face au dos** : au bureau, le personnage est `rot = π` (face à −z) ; pour voir son visage, caméra en −z (`R + (1.25, 2.05, −1.35)` regardant la chaise).
- Caméra **dans l'épaule de celui qui écoute** (v1 portrait) : écarter les personnages de 2,3 m et décaler la caméra de 1,5 m.
- Caméra **à l'intérieur d'un accessoire** (coffre) : espacer les quartiers.
- Visage caché par la coiffure vue de dessus : baisser la caméra au niveau des yeux.

## Téléportations entre quartiers
À l'entrée de chaque scène du monde : `st.flash = 1 − ramp(local, 0, 0.5, easeOut)` (overlay radial blanc → orange) + premier plan en plongée qui descend (`easeOut`) + effet sonore « warp ». Pas de longue marche entre quartiers.
