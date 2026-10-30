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
  artwork identifiers. `src/shared/planner-item-art.json` records item images,
  unique/set identities and their normal/exceptional/elite variants.
  Item-type `varinvgfx`/`invgfx1` selects real charm/jewelry artwork instead of
  placeholder base graphics. The `cs2` crafted-sunder base (enabled in the planner
  on 2026-10-28) still has no known invp10 asset and deliberately uses the text
  fallback rather than a substitute weapon picture.
  Inventory dimensions cover all game bases, including miscellaneous items without
  artwork; stash placement does not depend on image coverage.
- `items/misc/key/mephisto_key.png`, `mephisto_key2.png`, `mephisto_key3.png`:
  original Blizzless Key of Destruction, Hate and Terror inventory sprites,
  downloaded 2026-10-30 from https://blizzless.info/api/launcher-mods/manifest.
  These map to `pk3`, `pk2`, `pk1` respectively via the game tables' `hd` field;
  the Black Tower Key (`luv`) also uses `mephisto_key`, as specified in the tables.
  `mephisto_sta.png`, `mephisto_stb.png`, `mephisto_stc.png` are the distinct
  container sprites for `unique447`, `unique448`, `unique449` on the `bg2` base.
  The corresponding `data/hd/global/ui/items/misc/key/*.sprite` files are fetched
  through `/api/launcher-mods/blobs/{sha256}`; hashes are pinned in
  `scripts/sync-planner-items.mjs` and recorded in the artwork manifest.
  Their original 98×196 RGBA pixels are losslessly encoded as PNG, with no cropping
  or repainting. Format reference: https://github.com/dzik87/d2r-sprites.
- `items/misc/key/skeleton_key.webp` and
  `items/misc/scroll/deciphered_bark_scroll.webp`: ordinary Key (`key`) and
  Key to the Cairn Stones (`bkd`) artwork downloaded 2026-10-30 from
  `https://lootcube.net/images/items/misc/`, following the game tables' `hd` field.
- `items/misc/shard/cont_ua1.png` through `cont_ua5.png`: the five Ancients
  summon statues from the same Blizzless launcher manifest and blob endpoint
  (2026-10-28). Original 99×196 RGBA pixels are losslessly encoded as PNG.
  SHA-256 values and the explicit `ua1`–`ua5` base mapping are maintained by
  `scripts/sync-planner-items.mjs`.
- RotW artwork corrected 2026-10-28: Hellwarden's Will and Measured Wrath use
  `armor/helmet/unique_warlock_helm.webp` and `armor/grimoires/measured_wrath.webp`
  from the same LootCube image source. Stable unique names take precedence over
  shared legacy inventory filenames for these and Dreadfang, Wraithstep,
  Gheed's Wager, Sling, Opalvein and Entropy Locket. Jewelry variants correspond to
  the inventory graphics shown at https://d2emu.com/db/unique/sling,
  https://d2emu.com/db/unique/opalvein and https://d2emu.com/db/unique/entropy-locket.
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
  The common Attack skill uses `../skills/skillicon_2.88c7e55dccaa.avif`,
  downloaded 2026-10-30 from
  https://blizzless.info/media/skills/icons/skillicon_2.88c7e55dccaa.avif.
  The Blizzless skill dataset identifies Attack as game ID 0, icon cell 2.

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
- `sockets/colossal_jewel_{talic,korlic,madawc}.webp`: original Colossal Jewel
  bust artwork from `https://lootcube.net/images/items/misc/gem/` (2026-10-28).
  Defender's Bile/Fire use Talic; Protector's Frost/Stone use Korlic;
  Guardian's Thunder/Light use Madawc. The named mapping follows LootCube's
  `spriteOverride` item definitions and image manifest, not positional unique IDs.
- `scripts/sync-planner-sockets.mjs` regenerates artwork and
  `src/shared/planner-sockets.json` from the bundled game data, with its SHA-256.

Diablo game artwork belongs to Blizzard Entertainment. Interface layout reference:
https://maxroll.gg/d2/d2planner
# Horadric Cube

- `items/horadric-cube.webp`: https://lootcube.net/images/items/misc/quest/horadric_cube.webp
  Downloaded 2026-10-28; inventory size 2×2 from bundled Blizzless `misc.box`.

# Rejuvenation potions

- `items/misc/quest/cont_rvl.png`: original Blizzless full rejuvenation potion
  container sprite, downloaded 2026-10-30 from the launcher manifest/blob API.
  SHA-256 `f8059926648c49c6913b2920ae40a1854082498a577a19df1738a770283e51c7`;
  original 98×98 RGBA pixels are losslessly encoded as PNG. This is the
  `cont_rvl` unique container (`unique456`, base `bg1`), not a loose potion.
- `items/misc/potion/rejuv_potion.webp` and `full_rejuv_potion.webp`:
  downloaded 2026-10-30 from `https://lootcube.net/images/items/misc/potion/`.
  Names, artwork mapping and 1×1 inventory sizes come from bundled Blizzless
  `misc.rvs` and `misc.rvl`.

# Inventory tomes

- `items/misc/book/town_portal_book.webp` and `identify_book.webp`: downloaded
  2026-10-30 from https://lootcube.net/images/items/misc/book/, using the native
  `tbk` / `ibk` records' `hd` fields. Original D2R inventory images, 1×2 cells.

# Loose recipe materials, runes, gems and quest items

- Added 2026-10-30: native inventory images from LootCube under
  `items/misc/{rune,gem,body_part,potion,quiver,scroll,quest}` and quest weapons
  under `items/weapon/{staff,mace}`. Mappings use native `hd`, not item/container names.
- `items/misc/quest/parts_1.png`, `parts_2.png`, `parts_3.png` and `jewel_dis.png`
  preserve original Blizzless sprite RGBA pixels, losslessly encoded as PNG.
  Source: https://blizzless.info/api/launcher-mods/blobs/; exact pinned SHA-256
  values are recorded in `src/shared/planner-item-art.json` and the sync script.
  These are loose Blacksmith Ingot, Horadric Sphere, Resplendent Spark and
  Disenchanted Jewel, separate from their stack containers.
- Rainbow Facet reuses the original Jewel graphic already bundled by the Cube
  and socket catalogs (`images/cube/c42fa7a7a08d52a172.png`).
