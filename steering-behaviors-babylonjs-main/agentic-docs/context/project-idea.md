# Project Idea

## Context
This project is built as a practical reactive AI game for the MASTER 2 MIAGE course by Michel Buffa in the course Systèmes-IA-Réactifs.
The objective is to apply steering behavior concepts in a real interactive game loop with dynamic decisions, obstacle avoidance, and evolving swarm behavior.
On top of Reynolds reactive steering behaviors, the project also aims to train evolutionary algorithms that learn to play as the mosquitos.

## Core Concept
The game simulates a mosquito swarm hunting humans to collect blood.
The player controls targeting and movement influence through mouse mode or headtracking mode.
Mosquitos must continuously navigate in a 3D world, chase viable human targets, avoid static obstacles, and survive lethal human traps.

## Gameplay Vision
- A swarm of mosquitos moves as autonomous agents using steering behaviors
- Humans act as moving blood sources and strategic targets
- Traps represent kill zones that eliminate mosquitos on contact
- The swarm wins by harvesting blood efficiently while minimizing losses

## Reactive AI Goals
Each mosquito agent combines multiple steering forces in real time:
- Seek and pursue humans carrying blood value
- Avoid obstacles and trap zones
- Keep swarm cohesion while preserving separation and alignment
- Re-target dynamically when danger or better opportunities appear

This creates emergent behavior where the swarm looks alive and adaptive instead of scripted.

## Progression And Evolution
Blood gathered by successful attacks becomes the swarm resource.
When enough blood is collected:
- The swarm reproduces and increases in size
- New agents are spawned into the active flock
- Steering components are improved through configurable upgrades

Examples of upgrade directions:
- Better avoidance quality near traps
- Stronger target prediction and pursuit
- More stable flocking under high density
- Faster reaction to sudden environmental changes

## Pedagogical Objective
The project demonstrates how reactive AI from the course can be translated into a full game system:
- Multi-agent locomotion with steering forces
- Behavior blending and weighted decision loops
- Runtime tuning and debugging of emergent systems
- Human input integration with headtracking for interactive control

The final experience is a mosquito swarm hunting game where AI behavior quality directly impacts survival, growth, and strategic success.
