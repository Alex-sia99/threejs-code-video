# Pièges rencontrés (et leurs parades)

| Piège | Symptôme | Parade |
|---|---|---|
| Dossier `public` lourd | chaque rendu copie 1,2 Go (2 min 44 avant la première image) | `--public-dir public-as` (dossier léger dédié aux assets du film) |
| Bundle écrasé pendant un rendu | rendu qui plante ou images incohérentes | `build/` pour le film, `build-loops/` pour les boucles ; jamais de `remotion bundle` vers un dossier en cours de rendu |
| `LatheGeometry` profil parcouru du haut vers le bas | normales inversées : vu de dos, on voit à travers la tête (yeux et moustache sur la nuque) | parcourir le profil du BAS vers le HAUT (`prof.slice().reverse()`), ou `geometry.scale(1,1,-1)` + `computeVertexNormals()` |
| Tailwind preflight dans un projet Remotion | une `<Img>` de 3072 px rendue à 27 px de large (un sliver) | `style={{ maxWidth: "none" }}` sur l'image |
| `remotion still` d'une composition 3D | gros plans « dans l'écran du robot » en portrait | penser le FOV en HORIZONTAL et convertir : `vfov = 2·atan(tan(fov/2)·H/W)` ; en 16:9 le FOV three.js est déjà vertical |
| Heredoc bash contenant `'''` ou de longs blocs | `unexpected EOF while looking for matching ''` | écrire le script Python/JS dans un fichier (Write) puis `python -I fichier.py` |
| `print('…→…')` sous Windows | `UnicodeEncodeError: 'charmap'` | sorties en ASCII dans les scripts de contrôle |
| Trait sculpté + pièce rapportée | « deux nez, deux bouches, deux moustaches » | un trait = un volume ; relief dans `FEATURES` OU mesh posé par `OnHead`, jamais les deux |
| Sourcils en 3 segments, plugs en anneau + cylindre | « trois sourcils », « les plugs et les oreilles se superposent » | un seul volume lisse par sourcil ; plug = un disque plat sur le lobe |
| Mèches en cônes isolés | « grappe », « hérisson » | calotte sculptée avec ligne de cheveux + mèches en goutte couchées (lean 0,45-1,3), 70+ mèches, deux tons |
| Tête qui pivote sur son centre | le cou sort du col de travers en pose allongée | pivot du buste à la hanche ET pivot cou+tête à la base du cou, trapèzes qui remplissent le col |
| Dossier de transat pivoté du mauvais côté | le dossier couvre l'assise, le personnage flotte à côté | rotation +1,05 rad avec le contenu construit vers −z local ; rendre et REGARDER |
| Mer : Fresnel fort + écume sur toutes les crêtes | « tapis orange » à bandes | `fres·0.38` max 0,4, ciel reflété désaturé, écume `smoothstep(0.17, 0.26, h)` seulement à < 14 m du bord |
| Événement au raccord d'une boucle | « c'est pas une vraie boucle » (bateau à la dernière seconde) | événements au milieu (`T ∈ [22,34]`), fréquences entières, `check-loop.py` |
| Fréquences internes des personnages | léger saut au raccord | temps dilaté `CT(T) = T·π/3` (10·f cycles par boucle) |
| Cartes UI superposées / sur les sous-titres | « des pop-ups qui se chevauchent » | une carte à la fois (fenêtres qui ne se recouvrent pas), cartes compactes (titre 17 px, lignes 20 px), zone y > 880 px réservée aux sous-titres, colonne droite |
| Caméra dans un personnage | écran blanc (t-shirt), épaule, dos | distances 2,5-4,8 m, décalage latéral, placer le duo hors du trajet de la caméra |
| `sound-generation` avec `duration_seconds: 0.4` | 400 `invalid_generation_settings` | 0,5 ≤ durée ≤ 30 s |
| Upload Telegram qui stagne (0 octet après 20 min) | IP DNS 149.154.166.110 bridée à 15 Ko/s | `curl --resolve api.telegram.org:443:149.154.167.220` + `--speed-limit 20000 --speed-time 60` ; < 50 Mo |
| 720p plus lourd que 1080p | décor néon très détaillé | comparer les tailles, viser 1080p CRF 30 |
| Envoyer sans regarder | le client voit les défauts avant moi | rendre un still / une planche, l'ouvrir, l'analyser trait par trait, corriger, puis envoyer |
| Personnage non validé | refaire tout le film | faire valider le personnage (essais numérotés) avant tout rendu long |
