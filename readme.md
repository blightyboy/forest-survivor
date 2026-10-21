# Forest Survivor

**Chop trees. Gather resources. Fortify your camp. Survive the nights.**

Version: `0.1.25-alpha-build`

A top-down survival action game: play as a lumberjack in a hostile forest. Chop wood, hunt beasts, build defenses, pick level-up cards, and hold the camp against raids, assault waves, minibosses, and true bosses.

---

## Game description

You start with a camp and a basic palisade. Explore the forest, gather **wood**, **meat**, and **gold**, then spend them on fortifications and gear. Experience from kills levels you up; each level offers weapon, passive, elemental infusion, or bonus cards.

Threat grows over time. Beasts gain **veterancy stars** — bronze, then silver, then gold (up to 5 each) — and sometimes **elements**. Some animals are melee chargers; sheep and beavers fight at range.

### Core loop

1. **Chop & hunt** — fell trees, mine ore, defeat wildlife for resources and XP.
2. **Level up** — choose weapons, passives, elemental infusions, or bonuses.
3. **Fortify** — upgrade the camp: walls, towers, production buildings, blacksmith.
4. **Survive the cycle** — daytime assault waves march on camp; night brings full raids.

### Defenses & camp

| Building | Role |
|---|---|
| **Camp** | Core HP and passive resource income. If it falls, the run ends. |
| **Palisade** | Walls that block raiders. |
| **Watchtower / Archers / Barrage / Volley** | Auto-firing tower defenses. |
| **Campfire** | Heals you while inside the camp. |
| **Lumber Mill / Gold Mine / Butcher** | Periodic resource production. |
| **Blacksmith** | Gear shop (unique slots; buying replaces equipped items). |

Runs start with **Palisade level 1**.

### Day / night & bosses

- **Day** — chop, hunt, build; periodic **assault waves** spawn at the forest edge and march on camp (size and variety scale with threat).
- **Dusk** — warning; return to camp.
- **Night** — a **raid** attacks from one or more directions. A **miniboss** leads most nights; every **3rd night** a **true boss** arrives.
- **Dawn** — raiders retreat; the day counter advances.

### Combat systems

- **Auto weapons** — orbiting axes, throwing hatchets, saws, auras, and more; level them via cards.
- **Unique weapons** — at max level (8/8) with an element infusion, a weapon awakens into a named unique form (one per weapon×element) with stronger stats and elemental visuals.
- **Elements** — fire, water, nature, earth, light, darkness. Infuse weapons; matchups matter against elemental beasts.
- **Veterancy** — bronze → silver → gold stars (5 each) raise HP, damage, XP, and loot.
- **Power-ups** — magnet, fury, regen, haste, rare nuke orbs on the map.
- **Gear** — blacksmith stock with quality tiers; hover shop items to compare vs equipped.

### Meta progress

Credits earned at the end of a run buy **permanent character upgrades** between runs (vitality, damage, rerolls, camp bonuses, and more). Progress is saved locally.

---

## Controls

| Input | Action |
|---|---|
| **WASD** / **Arrow keys** | Move |
| **Space** | Dash |
| **F** | Aim lock (weapons track nearest threat) |
| **U** | Toggle camp upgrade panel |
| **B** | Open camp panel on the Smith tab |
| **1–9** | Buy corresponding camp upgrade (while allowed) |
| **1–5** | Pick a level-up card |
| **R** | Reroll level-up cards (limited) |
| **P** / **Esc** | Pause / resume (also closes some overlays) |
| **M** | Mute / unmute sound |
| Drag (touch) | Move |

Confirm dialogs: **Enter** confirms, **Esc** cancels.

---

## Requirements

- **Windows** (primary target for the packaged build)
- **Node.js** 18+ recommended (for development / building)
- npm (comes with Node)

---

## Setup (development)

```bash
# From the project root
npm install
npm start
```

`npm start` launches the game in Electron.

---

## Build (Windows)

```bash
# Installer + portable exe into dist/
npm run build

# Unpacked app folder only (faster iterate)
npm run build:dir

# Portable exe only
npm run build:portable
```

Outputs (under `dist/`):

- `ForestSurvivor-Portable.exe` — portable build  
- `ForestSurvivor-Setup-<version>.exe` — NSIS installer  
- `win-unpacked/` — unpacked app directory  

Build scripts back up and restore `save.json` so rebuilds do not wipe progress.

Windows builds embed `build/icon.ico` into the game `.exe` (generated from `icon.png` via `npm run icon`). Code signing is disabled (`win.sign: false` / `signAndEditExecutable: false`) so local builds do not need a certificate or Windows symlink privileges; an `afterPack` hook stamps the icon with `rcedit`.

### Auto-update (GitHub releases)

Packaged builds check the latest [GitHub release](https://github.com/blightyboy/forest-survivor/releases) tag on launch. If the installed version is older, the game prompts to **download and install inside the client** (no browser).

- **Installed (NSIS)** — downloads the Setup exe (via `electron-updater` when `latest.yml` is present, otherwise directly from the release asset), then runs the installer and relaunches.
- **Portable** — downloads the new portable exe and swaps it in after quit.

Publish a release with matching version tags (e.g. `v0.1.21-alpha-build`) and upload the built artifacts so update feeds (`latest.yml`) are generated.

**GitHub Actions (recommended):** bump `package.json` version, commit, then either:

```bash
git tag v0.1.21-alpha-build
git push origin v0.1.21-alpha-build
```

or run **Actions → Release → Run workflow** (optional version override). The workflow builds on Windows and publishes the NSIS setup, portable exe, and auto-update metadata.

Local publish (needs `GH_TOKEN`):

```bash
npm run release
```

---

## Save data

Progress (credits, meta upgrades, settings, tutorial flags) is stored as `save.json`.

| Mode | Location |
|---|---|
| **Packaged / played build** | `%APPDATA%\forest-survivor\save.json` |
| **Dev (`npm start`)** | Migrates/reads AppData; may also use project-root legacy saves |
| **Portable exe** | AppData primary; a copy may also sit next to the portable exe |

Saves survive `npm run build` because they live outside `dist/`. Old next-to-exe saves are migrated on launch when found.

---

## Options

Available from the **main menu** and the **pause** screen:

- Display mode: Windowed / Borderless / Fullscreen  
- Resolution (windowed)  
- Music volume  
- UI scale & font size  
- Screen shake intensity  
- Tutorials on/off (turning **On** resets tips so they play again)

---

## Tutorials (first run)

On a fresh save, popups pause the game to explain:

1. **Beasts** — bronze/silver/gold veterancy, elements, melee vs ranged  
2. **Building** — palisades, towers, and that losing the camp ends the run  
3. **Blacksmith** — slot-based gear and replacement on buy  
4. **First night** — minibosses, true bosses every 3 nights, defend the raid  

Replay them anytime via **Options → Tutorials → On**.

---

## Project layout

```
├── index.html          # UI shell
├── style.css           # Styles
├── icon.png            # App / window icon
├── electron/
│   ├── main.js         # Electron main process (window, display, save I/O)
│   ├── preload.js      # Bridge APIs
│   ├── updater.js      # GitHub release version check + auto-update
│   └── preserve-save.js
├── js/
│   ├── game.js         # Main loop, raids, waves, progression
│   ├── ui.js           # HUD, menus, tutorials, options
│   ├── animals.js      # Beasts & AI
│   ├── weapons.js      # Weapons, passives, cards
│   ├── base.js         # Camp, walls, towers
│   ├── world.js        # Map, trees, ore
│   ├── elements.js     # Elements, stars, gear shop
│   ├── meta.js         # Permanent upgrades & credits
│   ├── settings.js     # Options persistence
│   ├── audio.js / music.js
│   └── …
└── package.json
```

---

## Tips

- Stay near camp as dusk falls — raids punish stragglers.  
- Towers + walls matter more than raw damage once nights stack up.  
- Infuse weapons to exploit elemental beasts; check the Glossary for stats.  
- Blacksmith gear replaces the slot’s previous item permanently — compare before you buy.  
- Assault waves happen during the day; don’t ignore the cabin while exploring.

---

## License

UNLICENSED — personal / private project unless otherwise stated by the author.
