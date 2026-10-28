# Personnages en code

## Ce qui NE marche pas
Boîtes et cônes empilés (tête RoundedBox, nez boîte, sourcils barres, cheveux cônes) : jugé « immonde, ça manque de matière ». Même « minimaliste », des traits en lignes fines restent plats. Il faut des **volumes lisses** (le style du reel hashhh.co : personnages sculptés, mèches pleines, éclairage doux).

## La tête sculptée (`characters/Alex.tsx` → `Person.tsx` dans le template)
Une sphère haute résolution déformée par des **reliefs gaussiens** sur la sphère unité, puis mise à l'échelle d'un ellipsoïde.
```ts
const HEAD_R = { x: 0.335, y: 0.44, z: 0.36 };   // largeur / hauteur / profondeur
const FEATURES: { d: V3; k: number; s?: number; sx?: number; sy?: number }[] = [
  { d: [0, -0.9, 0.55], s: 0.42, k: 0.02 },        // menton
  { d: [0.85, -0.45, 0.35], s: 0.38, k: -0.03 },   // joues creusées → mâchoire (négatif = creux)
  { d: [0.38, 0.12, 0.9], s: 0.2, k: -0.03 },      // orbites
  { d: [0, -0.03, 1], sx: 0.075, sy: 0.24, k: 0.058 }, // arête du nez : relief ALLONGÉ (étroit en x, long en y)
  { d: [0, -0.25, 1], sx: 0.1, sy: 0.085, k: 0.068 },  // pointe du nez
  { d: [0, -0.5, 0.95], sx: 0.14, sy: 0.05, k: 0.01 }, // lèvre supérieure (bourrelet horizontal)
  …
];
const FEAT = FEATURES.map((f) => {
  const v = new THREE.Vector3(...f.d).normalize();
  const e1 = new THREE.Vector3().crossVectors(UP, v).normalize(); // tangente horizontale
  const e2 = new THREE.Vector3().crossVectors(v, e1).normalize(); // tangente verticale
  return { v, e1, e2, k: f.k, s: f.s, sx: f.sx, sy: f.sy };
});
function relief(dir: THREE.Vector3): number {
  let d = 0;
  for (const f of FEAT) {
    const c = dir.dot(f.v);
    if (c < 0) continue;
    if (f.sx !== undefined && f.sy !== undefined) {
      const u = Math.asin(THREE.MathUtils.clamp(dir.dot(f.e1), -1, 1));
      const w = Math.asin(THREE.MathUtils.clamp(dir.dot(f.e2), -1, 1));
      d += f.k * Math.exp(-((u * u) / (2 * f.sx * f.sx) + (w * w) / (2 * f.sy * f.sy)));
    } else {
      const a = Math.acos(THREE.MathUtils.clamp(c, -1, 1));
      const sg = f.s || 0.3;
      d += f.k * Math.exp(-(a * a) / (2 * sg * sg));
    }
  }
  return d;
}
export function headSurface(d: V3): V3 {   // point de la surface dans une direction : pour POSER les yeux, sourcils, bouche…
  const v = new THREE.Vector3(...d).normalize();
  const r = relief(v);
  return [v.x * HEAD_R.x + v.x * r, v.y * HEAD_R.y + v.y * r, v.z * HEAD_R.z + v.z * r];
}
function sculpt(g: THREE.SphereGeometry, grow: number, pad: number) {
  const pos = g.attributes.position as THREE.BufferAttribute; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const r = relief(v) + grow;
    pos.setXYZ(i, v.x * (HEAD_R.x + pad) + v.x * r, v.y * (HEAD_R.y + pad) + v.y * r, v.z * (HEAD_R.z + pad) + v.z * r);
  }
  pos.needsUpdate = true; g.computeVertexNormals(); return g;
}
function useHeadGeometry() { return useMemo(() => sculpt(new THREE.SphereGeometry(1, 128, 96), 0, 0), []); }
```
`OnHead` place un enfant sur la surface, orienté selon la normale (+z local = dehors) :
```tsx
const OnHead: React.FC<{ dir: V3; out?: number; children?: React.ReactNode }> = ({ dir, out = 0, children }) => {
  const { pos, quat } = useMemo(() => {
    const n = new THREE.Vector3(...dir).normalize();
    const p = headSurface(dir);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    return { pos: [p[0] + n.x * out, p[1] + n.y * out, p[2] + n.z * out] as V3, quat: q };
  }, [dir[0], dir[1], dir[2], out]);
  return <group position={pos} quaternion={quat}>{children}</group>;
};
// ex. : <OnHead dir={[s * 0.33, 0.07, 0.9]} out={-0.012}> …œil… </OnHead>
```
Proportions qui ont marché (visage de 0,9 de haut) : yeux à y ≈ 0,07, sourcils 0,23, pointe du nez −0,25, moustache −0,455, bouche −0,6, bouc −0,7, oreilles à x = ±1 (dir), y −0,08.

## Règle d'or : UN trait = UN volume
Le client a vu « deux nez, deux bouches, deux moustaches et des excroissances » : la bosse sculptée du nez + une boule de pointe rapportée ; une ligne de bouche + une lèvre rose rapportée ; une mouche + des ailes de nez en boules. Correction : nez entièrement sculpté (arête `sx/sy` + pointe + ailes dans `FEATURES`), lèvres sculptées + **une** ligne de bouche (arc de tore fin), bouc d'une seule pièce, oreilles plaquées. Vérifier chaque rendu à l'œil.

## Cheveux : calotte sculptée + mèches en goutte
- Calotte : même sphère sculptée (`grow` 0,038 → 0,012 vers les côtés), sommets sous la **ligne de cheveux** rentrés dans le crâne (`limit = π·(0.47 + 0.22·max(0,−front) − 0.06·max(0,front))` : haute devant, au-dessus des oreilles, basse sur la nuque).
- Mèches : une `LatheGeometry` « goutte » (racine épaisse, pointe fine) posée sur la surface, axe = mélange normale / direction « avant-haut » / balayage latéral :
```ts
const LOCK_GEO = (() => {
  const prof: [number, number][] = [[0, 0], [0.55, 0.06], [0.85, 0.2], [1, 0.4], [0.92, 0.6], [0.7, 0.78], [0.38, 0.92], [0, 1]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20); g.computeVertexNormals(); return g;
})();
// rangées : { el: 0.3, n: 11, len: 0.3, lean: 1.3, rad: 0.056, fwd: [0, 0.55, 0.84] } … (7 rangées, 73 mèches)
const a = n.clone().multiplyScalar(0.3).add(fwd.multiplyScalar(lean)).add(new THREE.Vector3(sweep, 0, 0)).normalize();
const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a);
<mesh geometry={LOCK_GEO} position={l.pos} quaternion={l.quat} scale={[rad, len, rad * 0.85]} />
```
Deux tons (base + mèches plus claires à 50 %) suffisent pour les reflets. Fini les cônes isolés (effet « grappe » ou « hérisson »).

## Corps et poses
Capsules (`capsuleGeometry`) pour bras/jambes/cou, `RoundedBox` radius 0,17 pour le t-shirt, épaules en sphères. Poses : `stand | walk | sit | type | fall | lounge`. Le buste + cou + tête pivotent à la **hanche** (`lean`), et le cou + tête pivotent à la **base du cou** (sinon le cou sort de travers du col — remarque du client) :
```tsx
<group position={[0, bodyY, 0]} rotation={[lean, 0, 0]}>            // hanche
  …buste, bras…
  <mesh position={[0, 0.86, 0]} scale={[1.35, 0.55, 1.0]}>…trapèzes…</mesh>
  <group position={[0, 0.88, 0]} rotation={[-lean * 0.3, 0, 0]}>   // base du cou
    <Capsule r={0.12} len={0.2} … />
    <group position={[0, 0.57, 0]}><AlexHead … /></group>
  </group>
</group>
```
Bouche : `open = clamp01(talk) * 0.085` avec `talk = amp("alex", t)` (enveloppe de la voix). Clignement : `(t + 1.3) % 4.1 < 0.13`.

## L'atelier de comparaison (`Lab.tsx`)
Composition 1920×1080 : photo à gauche (`<Img src={staticFile("characters/ref.jpg")} style={{ width: 3072, maxWidth: "none", left: -933, top: -62 }} />` — **`maxWidth: "none"` obligatoire**, Tailwind limite les images à 100 %), rendu 3D à droite ; `--props='{"view":"face"}'` (3/4 comme la photo), `front`, `profile` (personnage non tourné, caméra sur le côté), `body`, `claude`, `duo`. Éclairage doux : clé chaude avant-gauche, fill froid, contre-jour chaud, ambiance. Itérer : rendre → **regarder** → corriger → renvoyer au client → attendre ses commentaires.

## Mascotte en voxels (`Claude.tsx` → `Mascot.tsx`)
Décoder le sprite (quarts de bloc ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝ → bitmap 18×5), puis : corps `RoundedBox(12u, 4u, 5u)`, yeux = boîtes sombres enfoncées sur la 2e ligne (+ reflet), bras = boîtes sur la 3e ligne (pivot épaule, `wave`), 4 pattes (`walking` les soulève en alternance). Pas de bouche : `talk` → rebond `hop = talk·|sin(14t)|·1.6u` + squash, yeux qui s'allument ; `float` = lévitation lente. `unit` = taille d'un pixel (0,13 m pour un compagnon à hauteur d'épaule, 0,05 posé sur un bureau).
