# Votre photo de référence

1. Mettez une photo de face, bien éclairée, dans `public/characters/ref.jpg` (celle du dépôt est un simple cadre vide).
2. Rendez l'atelier : `npx remotion still src/index.ts CharacterLab out/lab.png --frame=0 --gl=angle`
   (vues possibles via `--props='{"view":"front"}'` : `face` (3/4), `front`, `profile`, `body`, `claude` (mascotte), `duo`).
3. Ouvrez `out/lab.png` : la photo à gauche, le modèle à droite. Comparez trait par trait (forme du visage, ligne de cheveux,
   sourcils, yeux, nez, bouche, barbe, oreilles, teint) et ajustez `src/characters/Person.tsx` :
   `HEAD_R` (proportions), `FEATURES` (reliefs), `LOCKS` (mèches), `PERSON` (couleurs).
4. Itérez jusqu'à la ressemblance. Regardez vraiment chaque rendu avant de conclure ; gardez un seul volume par trait.

Ne commitez pas de photo personnelle si le dépôt est public.
