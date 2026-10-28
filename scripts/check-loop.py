"""Vérifie qu'une vidéo boucle sans saut : compare la différence moyenne de luminance entre la DERNIÈRE image
et la PREMIÈRE (le raccord) à celle de deux images consécutives. Si le raccord est du même ordre, la boucle
est propre ; s'il est nettement plus grand, un élément n'est pas périodique.

    python scripts/check-loop.py out/loop.mp4
Dépendances : ffmpeg dans le PATH, Pillow (pip install pillow).
"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageStat

video = sys.argv[1] if len(sys.argv) > 1 else "out/loop.mp4"
n = int(subprocess.check_output(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "default=nw=1:nk=1", video]).decode().strip())
tmp = tempfile.mkdtemp()
sel = f"eq(n\\,0)+eq(n\\,1)+eq(n\\,{n-2})+eq(n\\,{n-1})"
subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", f"select='{sel}',scale=480:-1", "-vsync", "0", os.path.join(tmp, "f-%d.png")])
a, b, c, d = [Image.open(os.path.join(tmp, f"f-{i}.png")).convert("L") for i in (1, 2, 3, 4)]
diff = lambda x, y: ImageStat.Stat(ImageChops.difference(x, y)).mean[0]
d01, dEnd, dSeam = diff(a, b), diff(c, d), diff(d, a)
print(f"{os.path.basename(video)} : {n} images | diff 0-1 {d01:.2f} | diff {n-2}-{n-1} {dEnd:.2f} | raccord {n-1}-0 {dSeam:.2f}")
ok = dSeam <= 2.5 * max(d01, dEnd, 0.3)
print("boucle OK : le raccord est du même ordre qu'entre deux images consécutives." if ok else "ATTENTION : saut au raccord — un élément n'est pas périodique (événement au point de boucle, fréquence non entière…).")
sys.exit(0 if ok else 1)
