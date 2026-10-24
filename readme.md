# Forest Survivor

**Chop trees. Gather resources. Fortify your camp. Survive the nights.**

Version: `0.2.9-alpha-build`

A top-down survival action game built with **Phaser 3** (WebGL) + TypeScript + Vite, packaged with Electron. Play as a lumberjack in a hostile forest: chop wood, hunt beasts, build defenses, pick level-up cards, and hold the camp against raids.

---

## At a glance

| Content | Count |
|---|---|
| Beast species | **14** |
| Animal variants | **7** (Basic, Dire, Necromantic, Demonic, Armored, Frenzied, Blessed) |
| Elements | **6** (Fire, Water, Nature, Earth, Light, Darkness) |
| Elemental enemy abilities | **18** (3 per element; more unlock with veterancy) |
| True-boss signature moves | **10** (2 rolled per true boss) |
| Auto weapons | **18** (max level **8**; up to **5** equipped; **6** unlock via achievements) |
| Unique weapon forms | **108** (18 weapons × 6 element infusions) |
| Level-up passives | **20** (**4** unlock via achievements) |
| Element infusion cards | **6** |
| Bonus cards | **2** (gold pouch, full heal) |
| Level-up card pool | **46** kinds (weapons + passives + infusions + bonuses) |
| World power-ups | **6** |
| Camp upgrades | **26** (**11** buildings + **12** sub-upgrades + **3** camp risks) |
| Blacksmith gear slots | **14** |
| Gear quality tiers | **6** (Poor → Legendary) |
| Permanent meta upgrades | **15** |
| Achievements | **10** (credits ×10 + weapon/card unlocks) |
| World landmarks (POIs) | **4** kinds (den, wagon, shrine, vein; dawn reshuffle; Vanilla bans veins) |
| Run mutators | **6** (stackable challenges, including Vanilla) |
| Win goals | **4** (Endless / Easy 6 / Medium 12 / Hard 18) |
| Coach tutorials | **11** |
| Opening grace | **30s** (peaceful wildlife; assaults held) |
| Boss unlock | **60s** into the run (day champions + night mini/true) |
| Veterancy | up to **15★** (bronze → silver → gold) |

---

## Game description

You start with a camp and a palisade. Explore the forest, gather **wood**, **meat**, and **gold**, then spend them on fortifications and gear. Experience from kills levels you up; each level offers a weapon, passive, elemental infusion, or bonus card.

Threat grows over time. Beasts gain **veterancy stars** and can roll **elements** or **variants**. Melee chargers rush you; sheep, raccoons, and beavers fight at range. Elemental foes telegraph specials — higher stars mean more moves from their element pool.

### Core loop

1. **Chop & hunt** — fell trees, mine ore, defeat wildlife for resources and XP.
2. **Explore landmarks** — dens, wagons, shrines, and rich veins (**E** nearby; reshuffle each dawn).
3. **Level up** — choose from the **46**-kind card pool (weapons, passives, infusions, bonuses; **max 5** weapons; some unlock via achievements).
4. **Fortify** — upgrade the camp (**11** buildings + accordion sub-upgrades / risks), towers, production, and blacksmith.
5. **Survive the cycle** — daytime assault waves, dusk warnings, then night raids (miniboss most nights; true boss every **3rd** night with elite guards).

Optional **run mutators** on the main menu (Savage, No Grace, Glass, Siege, Scarcity, **Vanilla**) stack and persist between sessions. Vanilla strips the camp for a pure hunt-the-player run (XP-only loot).

Optional **win goals**: Endless, Easy (6 nights), Medium (12), Hard (18). Survive the final gauntlet night for a badge and bonus credits. Mid-run **checkpoints** save at dusk/dawn/pause; pause **Save & Quit** keeps Continue available.

**Raid telegraphs** show wave species (animal icons + pills). Active bosses use a top **multi-card HP HUD** (portrait + bar; move chips under each card). Boss and elemental moves, power-ups, elements, mutators, and major banners reuse the same **glossary icons** in-run.

### Opening grace

The first **30 seconds** are calm: wildlife ignores you and the camp unless you strike first. Daytime assaults wait until grace ends; day champions and night bosses unlock after **1 minute**.

### Beasts & combat pressure

- **14 species** — boar, wolf, bear (and dire forms), deer, fox, squirrel, rat, raccoon, duck, sheep, beaver.
- **7 variants** — Dire (tougher), Necromantic (splits on death), Demonic (fire pool on death), Armored (DR), Frenzied (ramps at low HP), Blessed (aura).
- **6 elements** with **18** enemy abilities total; veterancy unlocks more moves (1 → 2 → 3 → full pool). Telegraph → **0.5s** commit → act.
- **10 true-boss moves** — Rampage, Fiery Ground, Inspiring Aura, Water Breath, Titan Stomp, Bone Volley, Crushing Leap, Skyfall, Ruin Beam, Dread Howl.
- Status: poison and burn DoTs stack separately; slows; camp under attack uses a HUD status pulse (not a full-screen vignette).
- Player hits read with HP pulse, soft edge vignette, stronger i-frames, clearer damage floats, and brief hit-stop.

### Defenses & camp

| Building | Role |
|---|---|
| **Camp** | Core HP and passive resource income. If it falls, the run ends. |
| **Palisade** | Walls that block raiders. |
| **Watchtower / Archers / Barrage / Volley** | Auto-firing tower defenses (up to **8** towers). |
| **Campfire** | Heals inside the yard; **Eternal Fire** also heals outside the walls at half rate in an expanded ring. |
| **Lumber Mill / Gold Mine / Butcher** | Periodic resource production (+ yield / speed sub-upgrades). |
| **Blacksmith** | Gear shop across **14** slots and **6** quality tiers; buying replaces the slot (+ forge combat subs). |
| **Camp risks** | Predator's Bait, Forest Beckons, Cursed Totem — high reward, permanent pressure. |

Cabin and walls fully repair at dawn if you survive the night.

### Player arsenal

- **18 auto weapons** — starter kit (axe, hatchet, saw, aura, dynamite, pike, crossbow, spikes, hammerfall, longbow, knife, guard dog) plus achievement unlocks: chain & spikeball, snare trap, fishing pole, lightning flask, flash bomb, poison bottle.
- Max a weapon (**Lv 8**) and take its **infusion** to awaken a **unique elemental form** (**108** named forms).
- **20 passives** — damage, speed, armor, regen, crit, dash charges, greed/devil/angel trades (angel = **% max HP**), and **6** elemental masteries; greed/devil/angel/extra hands unlock via win goals / Fully Armed.
- **6 power-ups** — magnet, fury, regen, haste, hearts (kill heals), cataclysm nuke.
- Blacksmith gear: **2** weapon slots, **7** armor, **5** accessories.

### Tutorials & glossary

**11** coach tips can spotlight HUD and world targets each run while Tutorials are On (Options). After a run you can turn them off. The in-menu **Glossary** covers beasts (codex unlocks on first kill), cards, buildings, world systems, and **achievements**.

### Meta progress

Credits at end of run buy **15** permanent character upgrades (vitality, damage, rerolls, banishes, walls, towers, smith luck, and more). **Codex discoveries** and **achievements** grant permanent credits; achievements also unlock weapons and risk/reward cards in the level-up pool. Saved via Electron `userData` (`forestSave`).

---

## Controls

| Input | Action |
|---|---|
| **WASD** / stick | Move |
| **Space** / **Shift** | Dash |
| **E** | Interact with landmark (den, wagon, shrine, vein) |
| **F** | Aim lock (nearest foe) |
| **U** | Camp build panel |
| **B** | Blacksmith tab |
| **1–5** | Pick a level-up card |
| **Esc** / **P** | Pause / character sheet (Save & Quit or Abandon) |
| **M** | Mute / unmute |
| **R** | Reroll cards (when available) |

---

## Setup (development)

```bash
npm install
npm run dev          # Vite browser (http://localhost:5173)
npm run dev:electron # Vite + Electron shell
npm start            # Production web build + Electron
npm run typecheck
```

---

## Build (Windows)

```bash
npm run build           # Vite → dist-web, then NSIS + portable
npm run build:dir
npm run build:portable
npm run release         # publish to GitHub (needs GH_TOKEN)
```

Outputs under `dist/`. Packaged app loads `dist-web/` (Phaser build). Auto-update via GitHub releases.

---

## Save data

| Mode | Location |
|---|---|
| **Packaged** | `%APPDATA%\forest-survivor\save.json` |
| **Portable** | AppData primary; optional mirror next to the exe |

---

## Project layout

```
├── index.html              # Vite entry (Phaser + DOM UI)
├── src/
│   ├── main.ts             # Phaser boot
│   ├── scenes/             # Boot, Menu, Run
│   ├── systems/            # Combat, animals, arsenal, camp, abilities, day/night
│   ├── data/               # Species, weapons, passives, POIs, mutators, win goals, achievements
│   ├── world/              # Procedural world + biomes
│   ├── meta/               # Credits, upgrades, mid-run save, codex
│   ├── ui/                 # DomUI + overlay.css
│   └── audio/
├── electron/               # Main, preload, updater
├── dist-web/               # Vite production output (Electron loads this)
├── legacy/                 # Pre-migration Canvas 2D game (reference only)
└── package.json
```

---

## License

UNLICENSED — personal / private project unless otherwise stated by the author.
