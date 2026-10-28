/**
 * Les trois compositions du template :
 *  - CharacterLab : votre personnage à côté de votre photo (public/characters/ref.jpg) pour itérer la ressemblance ;
 *  - ExampleFilm  : mini-film de 20 s (3 répliques, monde néon, caméra par plan, sous-titres, carte titre) ;
 *  - ExampleLoop  : boucle parfaite de 60 s pour un écran de live (route de montagne, tapis roulant périodique).
 * Rendu : npx remotion render src/index.ts ExampleFilm out/film.mp4 --gl=angle
 */
import { Composition } from "remotion";
import { CharacterLab, labSchema, LAB_FPS } from "./characters/Lab";
import { ExampleFilm, FILM_FPS, FILM_FRAMES } from "./film/Film";
import { ExampleLoop } from "./loops/ExampleLoop";
import { FPS as LOOP_FPS, FRAMES as LOOP_FRAMES } from "./loops/common";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CharacterLab" component={CharacterLab} durationInFrames={LAB_FPS * 4} fps={LAB_FPS} width={1920} height={1080} schema={labSchema} defaultProps={{ view: "face" as const, yaw: -0.28, tilt: 0.1, mood: "happy" as const, talk: 0 }} />
    <Composition id="ExampleFilm" component={ExampleFilm} durationInFrames={FILM_FRAMES} fps={FILM_FPS} width={1920} height={1080} />
    <Composition id="ExampleLoop" component={ExampleLoop} durationInFrames={LOOP_FRAMES} fps={LOOP_FPS} width={1920} height={1080} />
  </>
);
