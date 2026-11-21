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
- `mercenaries/act{1,2,3,5}.png`: the four original hireling portraits from
  Blizzless Glossary, downloaded unchanged on 2026-11-18:
  https://blizzless.info/media/mercs/act{1,2,3,5}merc.png
  Source page: https://blizzless.info/breakpoints (Hit Recovery / Blocking tables).
  Specialization icons reuse the local Blizzless skill artwork listed below;
  `mercenaries[].skillId` identifies the native hireling's skill or aura.
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
- `items/misc/amulet/highlords_wrath.png`: original Blizzless Highlord's Wrath
  inventory sprite, downloaded 2026-11-18 from
  https://blizzless.info/api/launcher-mods/manifest.
  Native path: `data/hd/global/ui/items/misc/amulet/highlords_wrath.sprite`;
  blob SHA-256 `6f79a8f6fa91c472dbc4c30eba6b40e456dc8852a4328195a906238991bdc9fe`.
  The original 98×98 RGBA pixels are losslessly encoded as PNG. The sync script
  resolves the unique item by name instead of its generic `invamu2` filename.
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
- `items/misc/shard/cont_xa1.png` through `cont_xa5.png`: the five Worldstone
  Shards for acts I–V, checked 2026-11-20 against launcher manifest
  `1795131992295`. Native paths: `data/hd/global/ui/items/misc/shard/cont_xaN.sprite`.
  Original 98×98 RGBA pixels are losslessly encoded as PNG. Base codes `xa1`–`xa5`
  and SHA-256 values are pinned in `src/shared/planner-native-art.json`.
- RotW artwork corrected 2026-10-28: Hellwarden's Will and Measured Wrath use
  `armor/helmet/unique_warlock_helm.webp` and `armor/grimoires/measured_wrath.webp`
  from the same LootCube image source. Stable unique names take precedence over
  shared legacy inventory filenames for these and Dreadfang, Wraithstep,
  Gheed's Wager. Sling, Opalvein and Entropy Locket now use the native Blizzless
  mappings documented below (2026-11-18).
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
- `sockets/colossal_jewel_{talic,korlic,madawc}.webp`: retained legacy Colossal Jewel
  bust artwork from `https://lootcube.net/images/items/misc/gem/` (2026-10-28).
  Defender's Bile/Fire use Talic; Protector's Frost/Stone use Korlic;
  Guardian's Thunder/Light use Madawc. The named mapping follows LootCube's
  `spriteOverride` item definitions and image manifest, not positional unique IDs.
  Current rendering uses the native fragment mappings documented below.
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
- Rainbow Facet now uses the four native elemental sprites documented below.

# Native unique jewelry and jewels — 2026-11-18

- `src/shared/planner-native-art.json` pins the official Blizzless launcher
  manifest version `1794765706633` and `data/hd/items/uniques.json` SHA-256
  `4c4dcac0732a34d6264437a5e7a392ce93f36dc10ef2de37bbf17bf202bde072`.
  Source: https://blizzless.info/api/launcher-mods/manifest.
  Stable internal names map all 34 selectable unique rings/amulets and all
  14 unique jewels, including Chronicle variants, eight Rainbow Facets and
  six Colossal Jewels. The Eye of Etlich explicitly retains the shared
  `misc/amulet/amulet` sprite, as specified by the native mapping.
- `items/misc/{ring,amulet}/*.png` and
  `items/misc/gem/{light,cold,fire,pois}_facet.png`: 29 original 98×98 RGBA
  sprites from the official manifest/blob API, encoded losslessly as PNG.
  Individual source hashes are pinned in `planner-native-art.json` and the
  generated artwork manifest. Both death/level-up Facets use their elemental art.
- `items/misc/body_part/fragment_{poison,lightning,cold,fire,physical,magic}.webp`:
  original inventory images from https://lootcube.net/images/items/misc/body_part/,
  following the six Colossal Jewel paths in the official `uniques.json`.
  Original files are preserved; each download is pinned by SHA-256.
- `items/misc/gem/perfect_diamond1.webp` through `perfect_diamond6.webp`:
  the six ordinary Jewel inventory graphics from
  https://lootcube.net/images/items/misc/gem/, using the native `jew` asset
  and `jewl.varinvgfx` count. Their native picture indices 0–5 are preserved
  in planner JSON and game-save import/export.
- Item cards, stash icons, tooltips and socket overlays share the same artwork
  mappings. `sync-planner-items.mjs` and `sync-planner-sockets.mjs` preserve them.

# Native Renewed Sunder talismans — 2026-11-19

- `items/misc/charm/talisman.png` and `talisman1.png` through `talisman3.png`:
  original 294×98 RGBA sprites from the official Blizzless launcher manifest
  `1795062639216`, encoded losslessly as PNG. Source:
  https://blizzless.info/api/launcher-mods/manifest and its SHA-256 blob API.
  Individual hashes are pinned in `src/shared/planner-native-art.json`.
- `data/hd/items/items.json` maps `cs2` to `charm/talisman`; `itemtypes.txt`
  specifies three inventory graphics (`invp10`, `invp11`, `invp12`). All six
  Renewed uniques inherit this base art; their `uniqueItems.txt` records do not
  define separate elemental images. Explicit saved picture IDs select variants.
- The verified `misc.txt` defines a 3×1 inventory footprint for `cs2`, matching
  the original sprite aspect ratio. Planner dimensions retain that native size.
- These Latent/Renewed records are disabled in the current Blizzless launcher;
  they were previously enabled explicitly for offline planner experiments.
  They are not part of the six currently available Blizzless Sunder charms.

# Available Sunder charm colours — 2026-11-19

- The six `cm4` uniques (`unique401`–`unique406`) are vertical 1×3 Grand Charms.
  Their native `invtransform` values are `lblu`, `lred`, `lyel`, `lgrn`, `whit`
  and `lgry`. The official HD mapping and glossary use the shared Grand Charm
  graphic, rather than six distinct elemental shapes.
- `items/misc/charm/sunder_*.svg` embeds the unchanged Grand Charm WebP and
  applies its respective RGB tint from `ClassInvGreyBrownTable` (native
  `cm4.InvTrans = 8`) in `data/hd/global/palette/itemtransforms.json`.
  Official source blob SHA-256:
  `df4b76b3b284dd9e2e0eb8c38c5575a5dddd04b126d7d29bc9f337c9ed439a5b`.
  Alpha and native inventory footprint are preserved. The luminance/tint SVG
  filter approximates the client's HD colour shader; it is not a separate
  extracted elemental sprite. No colour is applied to ordinary magic charms.

# Magic charm skins — 2026-11-20

- Small, Large and Grand Charms (`cm1`, `cm2`, `cm3`) each have three native
  inventory picture IDs, confirmed by Blizzless `itemtypes.txt` (`scha`, `mcha`,
  `lcha`). The existing default graphic is retained for picture ID 0.
- Alternate pictures use LootCube `misc/charm/charm_{small,medium,large}{2,3}.webp`.
  Source URLs and SHA-256 hashes are pinned in `src/shared/planner-native-art.json`.
  Fixed unique charm artwork is unaffected by the magic charm selector.

# Bartuc portal ingredients — 2026-11-20

- `p14` (Tattered Scroll), `p20` (Bloodstone), and `p21` (Demon Paw) are the
  three inputs for the Demon’s Refuge portal, verified in official `cubemain.txt`
  SHA-256 `9c433e140eb6f93aab839502bc0da847542686cb492c2ca7bb49a79e145e1fc6`.
  All three occupy 1×1 cells in the current `misc.txt`; the scroll uses `invcscr`.
- Original Blizzless `items.json` maps them to `quest/tattered_scroll`,
  `gem/bloodstone`, and `quest/ceremonial_claws`. The corresponding original
  RGBA sprites are decoded to PNG without changing pixels. Source hashes are
  pinned in `src/shared/planner-native-art.json` (manifest 1795131992295).

- Container artwork audited 2026-11-20: all 68 enabled `bg1`/`bg2` unique
  containers use their own mapping from `data/hd/items/uniques.json` in launcher
  manifest `1795131992295` (mapping SHA-256
  `4c4dcac0732a34d6264437a5e7a392ce93f36dc10ef2de37bbf17bf202bde072`).
  Rune/gem stacks, quest/material containers, Worldstone Shards and Ancients
  containers are lossless PNG conversions of the corresponding original
  `data/hd/global/ui/items/misc/**/*.sprite` resources. Exact names and blob
  checksums are pinned in `src/shared/planner-native-art.json`.

- Set inventory images in `items/sets/` come from the [Blizzless set catalogue](https://blizzless.info/ru/sets).
  The catalogue maps each native set-item name to an AVIF with its inventory
  tint. The normal, exceptional and elite models match in the launcher’s
  `data/hd/items/sets.json` (SHA-256
  `63f6b2ffb0c1df6d26414b1a55261c22a04fc095b04c37e600e7650ca5444308`).
