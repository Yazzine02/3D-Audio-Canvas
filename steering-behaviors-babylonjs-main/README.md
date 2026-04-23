Tristan Patout

Master 2 MIAGE IA \
Systèmes-IA-Réactifs \
Mr Michel Buffa \

Avril 2026

---

Github web Page : 
https://3st1.github.io/steering-behaviors-babylonjs/

Video Youtube: https://youtu.be/QoFm1FfOaJU

---

## MON EXPERIENCE 

Suite à la réalisation des TPs du cours, j'ai fait un premier petit jeu en P5 (principalement vibe codé) à partir de la classe Steering et de ses algos donnés lors des séances. 
Participant au concours Games On Web 2026, j'ai par la suite souhaité étendre l'implémentation des steering behaviors à la 3D avec Babylon.js. C'est cette implémentation qui peut-être retrouvée dans ce TP et particulièrement dans la classe `js/SteeringVehicle.js` pour les algos réactifs inspirés de Reynolds.   
Lors de la réalisation des tps, j'ai principalement utilisé l'IDE VsCode avec github copilot et des modèles comme GPT 5.3 Codex, Gemini 3.1 Pro et Raptor mini. 
J'ai également utilisé l'interface web de Gemini avec mon abonnement Gemini Pro et pas directement pour ce repo mais durant les séances de cours/tps, j'ai aussi expérimenté avec Antigravity.s

Pour le TP, ce repo n'est pas un jeu en tant que tel mais plus une démonstration des steering behaviors sous Babylon.js avec sliders et paramètrages intéractifs. 
Un gestionnaire de comportements (`js/BehaviorManager.js`) vient compléter l'implémentation afin de gérer le cumul de plusieurs behaviors. Tous les comportements vus en cours ont été réécris pour Babylon.js. ``
Afin de tester ML5 et FaceMesh, j'ai souhaité implémenter un eye-tracking pour que les vehicules suivent notre regard. 
J'ai rencontré quelques difficultés à ce niveau car la zone des yeux est trop petite et si l'utilisateur recule ou avance par rapport à la calibration initiale, la détection des zones était faussée (ratio pupille / centre et bords de l'oeil). Pour pallier à cela je l'ai alors couplé à de l'head tracking avec inclinaison et propartionalité (voir `js/EyeTracking.js`). 

Pour la poursuite du projet et le developpement du jeu avec algos neuro-évolutionnaires; j'ai réalisé un workflow de spécifications (tools / skills + context + refs + specs docs) que les agents peuvent lire et utiliser (agent-first workspace) afin d'expérimenter et voir le gain potentiel de performances / respect des requirements avec une telle architecture (comparé à un simple prompt bien structuré). 

## Tech Stack
- Babylon.js pour 3D et rendu
- p5.js & ml5.js FaceMesh pour headtracking 
- Reynolds steering behaviors pour agents réactifs

## Modes
- Mouse mode pour controller la target directement avec la souris 
- Headtracking mode avec calibration pour controller avec le reagard ert direction de la tête. 

## Run le projet localement
1. Ouvrir VS Code
2. Lancer un local static server from the project root
3. Choisir mouse ou headtracking mode dans le start screen 

## Structure
- `index.html`: app bootstrap and script loading order
- `style.css`: overlays and start screen styles
- `js/BabylonApp.js`: scene creation and update loop
- `js/BabylonGUI.js`: runtime control panel and sliders
- `js/EyeTracking.js`: headtracking and calibration runtime
- `js/SteeringVehicle.js`: steering physics and behavior primitives
- `js/BehaviorManager.js`: behavior weighting and flock orchestration
- `assets/aedes.glb`: mosquito mesh asset


## Objectif du projet donnant suite à cette impléméntation des TPs
Dans le futur mini-projet, je souhaite poursuivre l'implémentation avec Babylon.js. Le principe de base repose sur un essaim de moustiques qui chasse des humains pour se nourrir de leur sang. Les moustiques évitent les obstacles et pièges tendus par les humains (zaps electriques par exemple), se reproduisent après avoir réussi à se nourrir, et amélioration progressivement des poids des behaviors au fur et à mesure que l'essaim grossit.

En plus des steering behaviors, pour le rendu final, l'objectif est aussi d'entraîner des algorithmes évolutifs qui apprennent à jouer le rôle des moustiques.

---
