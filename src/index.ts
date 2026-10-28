// Point d'entrée Remotion : npx remotion render src/index.ts <Composition> out.mp4 --gl=angle
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
