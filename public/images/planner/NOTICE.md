# Planner interface artwork

Downloaded 2026-10-26. No user screenshots are included in the site.

- `inventory.webp`: original Diablo II: Resurrected inventory interface, served by LootCube:
  https://lootcube.net/images/ui/panel/inventory/background_cropped.webp
  Source page: https://lootcube.net/en/builds/abyss-warlock
- `mercenary.webp`: original Diablo II: Resurrected hireling equipment panel, downloaded 2026-10-27:
  https://lootcube.net/images/ui/panel/hireling/hirelingpanel_cropped.webp
  Source page: https://lootcube.net/en/builds/lightning-javazon-amazon
  The unmodified 1036×790 image is displayed through an SVG viewport without its header/footer.
- `classes/*.png`: class portraits from Blizzless Glossary:
  https://blizzless.info/media/chars/hd/{classId}.png
- `items/{weapon,armor,misc}/**/*.webp`: 254 referenced original D2R inventory images from
  https://lootcube.net/images/items/, downloaded 2026-10-27.
  Source example: https://lootcube.net/en/sets/aldurs-watchtower
  `scripts/sync-planner-items.mjs` resolves Blizzless inventory filenames through
  the `d2r-saver` artwork dictionary; positional unique/set IDs are not used as
  artwork identifiers. `src/shared/planner-item-art.json` records all 555 bases,
  433 unique items, 140 set items and their normal/exceptional/elite variants.
  Item-type `varinvgfx`/`invgfx1` selects real charm/jewelry artwork instead of
  placeholder base graphics. The disabled `cs2` crafted-sunder placeholder has
  no known invp10 asset and deliberately has no substitute weapon picture.
  Inventory dimensions and name aliases are also used by equipment previews.
- `items/classic/invhaxu.gif` and `items/classic/invuhms.gif`: original inventory
  graphics for the two unavailable HD resources, from Blizzard's Arreat Summit:
  https://classic.battle.net/images/battle/diablo2exp/images/items/uniques/thegnasher.gif
  https://classic.battle.net/images/battle/diablo2exp/images/items/sets/ondalsalmighty.gif
- `skill-tree.jpg`: Diablo II skill-tree panel background served by Wowhead/ZAM:
  https://wow.zamimg.com/images/diablo-2/skill-calc/bg-single.jpg
  Source page: https://www.wowhead.com/diablo-2/skill-calc/sorceress
- `skill-reset.webp`: four-state reset-button sprite from the same calculator:
  https://wow.zamimg.com/images/diablo-2/skill-calc/delete2.webp
- `wowhead/trees/*.webp`: 21 original connection/socket layers:
  https://wow.zamimg.com/images/diablo-2/skill-calc/trees/{class}{page}.webp?2
- `wowhead/icons/*.webp`: 209 original two-frame icon sprites:
  https://wow.zamimg.com/images/diablo-2/skill-calc/icons/{skill}.webp
  The source's unavailable `blade-mastery.webp` uses the Blizzless icon instead.
- Skill icons in `../skills/`: Blizzless Glossary skill dataset, imported by
  `scripts/sync-planner.mjs`.

The equipment panel and skill trees are displayed through CSS/SVG viewports
of the unmodified online assets. All text, interactive controls, skill-tree
connections and build data are implemented separately.

`src/shared/planner-wowhead-art.json` records original positions/prerequisites.
Connection layers are used only where those match Blizzless. Custom server
trees reuse the same socket/arrow artwork in SVG viewports with server links.
For Necromancer Curses, `PlannerSkillBranches.vue` keeps the original layer and
uses SVG viewports to extend Confuse's native arrow and move Focus Minions'
socket from level 24 to level 30. The source image is unmodified.
The same component adapts Druid Summoning and Shapeshifting: Solar Creeper's
socket is kept at level 24 with an extended native arrow from Poison Creeper;
Call of the Wild has a native socket and arrow below Shock Wave at level 30.
The other native connections, including diagonal and horizontal arrows, are preserved.
Warlock is absent from the Wowhead calculator's seven-class selector (checked
2026-10-27). `PlannerNativeSkillBranches.vue` composes its three trees from SVG
viewports of the same native Paladin, Druid and Necromancer socket/arrow layers.
Their placement follows the Blizzless skill data; only plain vertical shafts stretch.
Focus Minions, Call of the Wild and Warlock retain their Blizzless icons.
No screenshot pixels or calculator implementation code are included.

Socket insert artwork (added 2026-10-27):
- `sockets/*.webp`: 35 gem/skull images downloaded from
  `https://lootcube.net/images/items/misc/{hd}.webp` using the `misc[code].hd`
  mapping in the bundled Blizzless game tables. No screenshot crops are used.
- Rune and pure-rune images reuse the existing local `../{rune}.webp` assets.
- `scripts/sync-planner-sockets.mjs` regenerates artwork and
  `src/shared/planner-sockets.json` from the bundled game data, with its SHA-256.

Diablo game artwork belongs to Blizzard Entertainment. Interface layout reference:
https://maxroll.gg/d2/d2planner
# Horadric Cube

- `items/horadric-cube.webp`: https://lootcube.net/images/items/misc/quest/horadric_cube.webp
  Downloaded 2026-10-28; inventory size 2×2 from bundled Blizzless `misc.box`.
