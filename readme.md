# Forest Survivor

**Chop trees. Gather resources. Fortify your camp. Survive the nights.**

Version: `0.2.2-alpha-build`

A top-down survival action game built with **Phaser 3** (WebGL) + TypeScript + Vite, packaged with Electron. Play as a lumberjack in a hostile forest: chop wood, hunt beasts, build defenses, pick level-up cards, and hold the camp against raids.

---

## Game description

You start with a camp and a basic palisade. Explore the forest, gather **wood**, **meat**, and **gold**, then spend them on fortifications and gear. Experience from kills levels you up; each level offers weapon, passive, elemental infusion, or bonus cards.

Threat grows over time. Beasts gain **veterancy stars** and sometimes **elements** or **variants** (dire / necromantic / demonic). Some animals are melee chargers; sheep, raccoons, and beavers fight at range.

### Core loop

1. **Chop & hunt** — fell trees, mine ore, defeat wildlife for resources and XP.
2. **Level up** — choose weapons, passives, elemental infusions, or bonuses.
3. **Fortify** — upgrade the camp: walls, towers, production buildings, blacksmith.
4. **Survive the cycle** — night brings assault waves and raids on the camp.

### Defenses & camp

| Building | Role |
|---|---|
| **Camp** | Core HP and passive resource income. If it falls, the run ends. |
| **Palisade** | Walls that block raiders. |
| **Watchtower / Archers / Barrage / Volley** | Auto-firing tower defenses. |
| **Campfire** | Heals you while inside the camp. |
| **Lumber Mill / Gold Mine / Butcher** | Periodic resource production. |
| **Blacksmith** | Gear shop (unique slots; buying replaces equipped items). |

### Combat systems

- **Auto weapons** — orbiting axes, hatchets, saws, auras, and more; level them via cards.
- **Unique weapons** — at max level with an element infusion, a weapon awakens into a named unique form.
- **Elements** — fire, water, nature, earth, light, darkness.
- **Variants** — necromantic splits on death; demonic leaves a fire pool.
- **Power-ups** — magnet, fury, regen, haste, rare nuke.
- **Gear** — blacksmith stock with quality tiers.

### Meta progress

Credits earned at the end of a run buy **permanent character upgrades** between runs. Progress is saved via Electron `userData` (`forestSave`).

---

## Controls

| Input | Action |
|---|---|
| **WASD** | Move |
| **Space** / **Shift** | Dash |
| **B** | Camp / blacksmith panel |
| **1–5** | Pick a level-up card |
| **Esc** | Pause / resume |
| **M** | Mute / unmute (menu options) |

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

Outputs under `dist/`. Packaged app loads `dist-web/` (Phaser build). Auto-update via GitHub releases is unchanged.

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
│   ├── systems/            # Combat, animals, arsenal, camp, day/night, lighting
│   ├── data/               # Species, weapons, passives, shop, constants
│   ├── world/              # Procedural world
│   ├── meta/               # Credits & permanent upgrades
│   ├── ui/                 # DomUI + overlay.css
│   └── audio/
├── electron/               # Main, preload, updater (unchanged bridges)
├── dist-web/               # Vite production output (Electron loads this)
├── legacy/                 # Pre-migration Canvas 2D game (reference only)
└── package.json            # 0.2.x
```

---

## License

UNLICENSED — personal / private project unless otherwise stated by the author.
