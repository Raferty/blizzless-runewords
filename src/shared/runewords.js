export const RUNEWORDS = [
  {
    id: 1,
    name: "Nadir",
    runes: [4, 3],
    types: ["Helms"],
    level: 13,
    ladder: false,
    stats: [
      "+50% Enhanced Defense",
      "+10 Defense",
      "+30 Defense vs. Missile",
      "Level 13 Cloak of Shadows (9 Charges)",
      "+2 To Mana After Each Kill",
      "+5 To Strength",
      "-33% Extra Gold From Monsters",
      "-3 To Light Radius",
    ],
  },
  {
    id: 2,
    name: "Steel",
    runes: [3, 1],
    types: ["Swords", "Axes", "Maces"],
    level: 13,
    ladder: false,
    stats: [
      "20% Enhanced Damage",
      "+3 To Minimum Damage",
      "+3 To Maximum Damage",
      "+50 To Attack Rating",
      "50% Chance Of Open Wounds",
      "25% Increased Attack Speed",
      "+2 To Mana After Each Kill",
      "+1 To Light Radius",
    ],
  },
  {
    id: 3,
    name: "Malice",
    runes: [6, 1, 5],
    types: ["Melee Weapons"],
    level: 15,
    ladder: false,
    stats: [
      "+33% Enhanced Damage",
      "+9 To Maximum Damage",
      "100% Chance Of Open Wounds",
      "-25% Target Defense",
      "-100 To Monster Defense Per Hit",
      "Prevent Monster Heal",
      "+50 To Attack Rating",
      "Drain Life -5",
    ],
  },
  {
    id: 4,
    name: "Stealth",
    runes: [7, 5],
    types: ["Body Armors"],
    level: 17,
    ladder: false,
    stats: [
      "Magic Damage Reduced By 3",
      "+6 To Dexterity",
      "+15 To Maximum Stamina",
      "Poison Resist +30%",
      "Regenerate Mana 15%",
      "25% Faster Cast Rate",
      "25% Faster Hit Recovery",
    ],
  },
  {
    id: 5,
    name: "Leaf",
    runes: [3, 8],
    types: ["Staves"],
    excluded: "Not Orbs/Wands",
    level: 19,
    ladder: false,
    stats: [
      "Adds 5-30 Fire Damage",
      "+3 To Fire Skills",
      "+3 To Fire Bolt (Sorceress Only)",
      "+3 To Inferno (Sorceress Only)",
      "+3 To Warmth (Sorceress Only)",
      "+2 To Mana After Each Kill",
      "+ (2 Per Character Level) +2-198 To Defense (Based On Character Level)",
      "Cold Resist +33%",
    ],
  },
  {
    id: 6,
    name: "Ancient's Pledge",
    runes: [8, 9, 7],
    types: ["Shields"],
    excluded: "",
    level: 21,
    ladder: false,
    stats: [
      "+50% Enhanced Defense",
      "Cold Resist +43%",
      "Fire Resist +48%",
      "Lightning Resist +48%",
      "Poison Resist +48%",
      "10% Damage Goes To Mana",
    ],
  },
  {
    id: 7,
    name: "Holy Thunder",
    runes: [5, 8, 9, 7],
    types: ["Scepters"],
    excluded: "",
    level: 21,
    ladder: false,
    stats: [
      "+60% Enhanced Damage",
      "-25% Target Defense",
      "Adds 5-30 Fire Damage",
      "Adds 21-110 Lightning Damage",
      "+75 Poison Damage Over 5 Seconds",
      "+10 To Maximum Damage",
      "Lightning Resistance +60%",
      "+5 To Maximum Lightning Resistance",
      "+3 To Holy Shock (Paladin Only)",
      "Level 7 Chain Lightning (60 Charges)",
    ],
  },
  {
    id: 8,
    name: "Zephyr",
    runes: [9, 5],
    types: ["Missile Weapons"],
    excluded: "",
    level: 21,
    ladder: false,
    stats: [
      "+33% Enhanced Damage",
      "+66 To Attack Rating",
      "Adds 1-50 Lightning Damage",
      "-25% Target Defense",
      "+25 Defense",
      "25% Faster Run/Walk",
      "25% Increased Attack Speed",
      "7% Chance To Cast Level 1 Twister When Struck",
    ],
  },
  {
    id: 9,
    name: "Pattern",
    runes: [7, 9, 10],
    types: ["Claws"],
    excluded: "",
    classes: ["Assassin"],
    patch: "2.4",
    level: 23,
    ladder: false,
    stats: [
      "+30% Faster Block Rate",
      "+40-80% Enhanced Damage (varies)",
      "10% Bonus to Attack Rating",
      "Adds 17-62 Fire Damage",
      "Adds 1-50 Lightning Damage",
      "Adds 3-14 Cold Damage",
      "+75 Poison Damage Over 5 Seconds",
      "+6 to Strength",
      "+6 to Dexterity",
      "All Resistances +15",
    ],
  },
  {
    id: 10,
    name: "King's Grace",
    runes: [11, 8, 10],
    types: ["Swords", "Scepters"],
    excluded: "",
    classes: [],
    patch: "",
    level: 25,
    ladder: false,
    stats: [
      "+100% Enhanced Damage",
      "+100% Damage To Demons",
      "+50% Damage To Undead",
      "Adds 5-30 Fire Damage",
      "Adds 3-14 Cold Damage - 3 Second Duration",
      "+150 To Attack Rating",
      "+100 To Attack Rating Against Demons",
      "+100 To Attack Rating Against Undead",
      "7% Life Stolen Per Hit",
    ],
  },
  {
    id: 11,
    name: "Strength",
    runes: [11, 3],
    types: ["Melee Weapons"],
    excluded: "",
    classes: [],
    patch: "",
    level: 25,
    ladder: false,
    stats: [
      "35% Enhanced Damage",
      "25% Chance Of Crushing Blow",
      "7% Life Stolen Per Hit",
      "+2 To Mana After Each Kill",
      "+ 20 To Strength",
      "+10 To Vitality",
    ],
  },
  {
    id: 12,
    name: "Edge",
    runes: [3, 7, 11],
    types: ["Melee Weapons"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 25,
    ladder: false,
    stats: [
      "Level 15 Thorns Aura When Equipped",
      "+35% Increased Attack Speed",
      "+320-380% Damage To Demons (varies)",
      "+280% Damage To Undead",
      "+75 Poison Damage Over 5 Seconds",
      "7% Life Stolen Per Hit",
      "Prevent Monster Heal",
      "+5-10 To All Attributes (varies)",
      "+2 To Mana After Each Kill",
      "Reduces All Vendor Prices 15%!!!",
    ],
  },
  {
    id: 13,
    name: "Spirit",
    runes: [7, 10, 9, 11],
    types: ["Swords", "Shields"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 25,
    ladder: false,
    stats: [
      "+2 To All Skills",
      "+25-35% Faster Cast Rate (varies)",
      "+55% Faster Hit Recovery",
      "Adds 1-50 Lightning Damage",
      "Adds 3-14 Cold Damage 3 Second Duration (Normal)",
      "+75 Poison Damage Over 5 Seconds",
      "7% Life Stolen Per Hit",
      "+250 Defense Vs. Missile",
      "+22 To Vitality",
      "+89-112 To Mana (varies)",
      "+3-8 Magic Absorb (varies)",
    ],
  },
  {
    id: 14,
    name: "Myth",
    runes: [15, 11, 4],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Barbarian"],
    patch: "1.11",
    level: 25,
    ladder: false,
    stats: [
      "3% Chance To Cast Level 1 Howl When Struck",
      "10% Chance To Cast Level 1 Taunt On Striking",
      "+2 To Barbarian Skill Levels",
      "+30 Defense Vs. Missile",
      "Replenish Life +10",
      "Attacker Takes Damage of 14",
      "Requirements -15%",
    ],
  },
  {
    id: 15,
    name: "Honor",
    runes: [11, 1, 6, 3, 12],
    types: ["Melee Weapons"],
    excluded: "",
    classes: [],
    patch: "",
    level: 27,
    ladder: false,
    stats: [
      "+160% Enhanced Damage",
      "+9 To Minimum Damage",
      "+9 To Maximum Damage",
      "25% Deadly Strike",
      "+250 To Attack Rating",
      "+1 to All Skills",
      "7% Life Stolen Per Hit",
      "Replenish Life +10",
      "+10 To Strength",
      "+1 To Light Radius",
      "+2 To Mana After Each Kill",
    ],
  },
  {
    id: 16,
    name: "Lore",
    runes: [9, 12],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "",
    level: 27,
    ladder: false,
    stats: [
      "+1 To All Skill Levels",
      "+10 To Energy",
      "+2 To Mana After Each Kill",
      "Lightning Resist +30%",
      "Damage Reduced By 7",
      "+2 To Light Radius",
    ],
  },
  {
    id: 17,
    name: "Radiance",
    runes: [4, 12, 6],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "",
    level: 27,
    ladder: false,
    stats: [
      "+75% Enhanced Defense",
      "+30 Defense Vs. Missile",
      "+10 To Energy",
      "+10 To Vitality",
      "15% Damage Goes To Mana",
      "Magic Damage Reduced By 3",
      "+33 To Mana",
      "Damage Reduced By 7",
      "+5 To Light Radius",
    ],
  },
  {
    id: 18,
    name: "Insight",
    runes: [8, 3, 7, 12],
    types: ["Missile Weapons", "Polearms", "Staves"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 27,
    ladder: false,
    stats: [
      "Level 12-17 Meditation Aura When Equipped (varies)",
      "+35% Faster Cast Rate",
      "+200-260% Enhanced Damage (varies)",
      "+9 To Minimum Damage",
      "180-250% Bonus to Attack Rating (varies)",
      "Adds 5-30 Fire Damage",
      "+75 Poison Damage Over 5 Seconds",
      "+1-6 To Critical Strike (varies)",
      "+5 To All Attributes",
      "+2 To Mana After Each Kill",
      "23% Better Chance of Getting Magic Items",
    ],
  },
  {
    id: 19,
    name: "Rhyme",
    runes: [13, 5],
    types: ["Shields"],
    excluded: "",
    classes: [],
    patch: "",
    level: 29,
    ladder: false,
    stats: [
      "20% Increased Chance of Blocking",
      "40% Faster Block Rate",
      "All Resistances +25",
      "Regenerate Mana 15%",
      "Cannot Be Frozen",
      "50% Extra Gold From Monsters",
      "25% Better Chance Of Getting Magic Items",
    ],
  },
  {
    id: 20,
    name: "Peace",
    runes: [13, 10, 11],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Amazon"],
    patch: "",
    level: 29,
    ladder: false,
    stats: [
      "4% Chance To Cast Level 5 Slow Missiles When Struck",
      "2% Chance To Cast level 15 Valkyrie On Striking",
      "+2 To Amazon Skill Levels",
      "+20% Faster Hit Recovery",
      "+2 To Critical Strike",
      "Cold Resist +30%",
      "Attacker Takes Damage of 14",
    ],
  },
  {
    id: 21,
    name: "Black",
    runes: [10, 16, 4],
    types: ["Clubs", "Hammers", "Maces"],
    excluded: "",
    classes: [],
    patch: "",
    level: 35,
    ladder: false,
    stats: [
      "+120% Enhanced Damage",
      "40% Chance Of Crushing Blow",
      "+200 To Attack Rating",
      "Adds 3-14 Cold Damage - Cold Duration 3 Seconds",
      "+10 To Vitality",
      "15% Increased Attack Speed",
      "Knockback",
      "Magic Damage Reduced By 2",
      "Level 4 Corpse Explosion (12 Charges)",
    ],
  },
  {
    id: 22,
    name: "White",
    runes: [14, 16],
    types: ["Wands"],
    excluded: "",
    classes: ["Necromancer"],
    patch: "",
    level: 35,
    ladder: false,
    stats: [
      "Hit Causes Monster To Flee 25%",
      "+10 To Vitality",
      "+3 To Poison And Bone Skills (Necromancer Only)",
      "+3 To Bone Armor (Necromancer Only)",
      "+2 To Bone Spear (Necromancer Only)",
      "+4 To Skeleton Mastery (Necromancer Only)",
      "Magic Damage Reduced By 4",
      "20% Faster Cast Rate",
      "+13 To Mana",
    ],
  },
  {
    id: 23,
    name: "Bulwark",
    runes: [13, 16, 12],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "2.6",
    level: 35,
    ladder: true,
    stats: [
      "+20% Faster Hit Recovery",
      "+4-6% Life stolen per hit",
      "+75-100% Enhanced Defense",
      "+10 to Vitality",
      "Increase Maximum Life 5%",
      "Replenish Life +30",
      "Damage Reduced by 7",
      "Physical Damage Received Reduced by 10-15%",
    ],
  },
  {
    id: 24,
    name: "Cure",
    runes: [13, 16, 7],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "",
    level: 35,
    ladder: true,
    stats: [
      "Level 1 Cleansing Aura when Equipped",
      "+20% Faster Hit Recovery",
      "+75-100% Enhanced Defense",
      "+10 to Vitality",
      "Increase Maximum Life 5%",
      "Poison Resist +40-60%",
      "Poison Length Reduced by 50%",
    ],
  },
  {
    id: 25,
    name: "Ground",
    runes: [13, 16, 9],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "",
    level: 35,
    ladder: true,
    stats: [
      "+20% Faster Hit Recovery",
      "+75-100% Enhanced Defense",
      "+10 to Vitality",
      "Increase Maximum Life 5%",
      "Lightning Resist +40-60%",
      "Lightning Absorb +10-15%",
    ],
  },
  {
    id: 26,
    name: "Hearth",
    runes: [13, 16, 10],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "",
    level: 35,
    ladder: true,
    stats: [
      "+20% Faster Hit Recovery",
      "+75-100% Enhanced Defense",
      "+10 to Vitality",
      "Increase Maximum Life 5%",
      "Cold Resist +40-60%",
      "Cold Absorb +10-15%",
      "Cannot be Frozen",
    ],
  },
  {
    id: 27,
    name: "Temper",
    runes: [13, 16, 8],
    types: ["Helms"],
    excluded: "",
    classes: [],
    patch: "",
    level: 35,
    ladder: true,
    stats: [
      "+20% Faster Hit Recovery",
      "+75-100% Enhanced Defense",
      "+10 to Vitality",
      "Increase Maximum Life 5%",
      "Fire Resist +40-60%",
      "Fire Absorb +10-15%",
    ],
  },
  {
    id: 28,
    name: "Memory",
    runes: [17, 16, 12, 5],
    types: ["Staves"],
    excluded: "Not Orbs/Wands",
    classes: [],
    patch: "",
    level: 37,
    ladder: false,
    stats: [
      "+3 to Sorceress Skill Levels",
      "33% Faster Cast Rate",
      "Increase Maximum Mana 20%",
      "+3 Energy Shield (Sorceress Only)",
      "+2 Static Field (Sorceress Only)",
      "+10 To Energy",
      "+10 To Vitality",
      "+9 To Minimum Damage",
      "-25% Target Defense",
      "Magic Damage Reduced By 7",
      "+50% Enhanced Defense",
    ],
  },
  {
    id: 29,
    name: "Smoke",
    runes: [4, 17],
    types: ["Body Armors"],
    excluded: "",
    classes: [],
    patch: "",
    level: 37,
    ladder: false,
    stats: [
      "+75% Enhanced Defense",
      "+280 Defense Vs. Missile",
      "All Resistances +50",
      "20% Faster Hit Recovery",
      "Level 6 Weaken (18 Charges)",
      "+10 To Energy",
      "-1 To Light Radius",
    ],
  },
  {
    id: 30,
    name: "Splendor",
    runes: [5, 17],
    types: ["Shields"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 37,
    ladder: false,
    stats: [
      "+1 To All Skills",
      "+10% Faster Cast Rate",
      "+20% Faster Block Rate",
      "+60-100% Enhanced Defense (varies)",
      "+10 To Energy",
      "Regenerate Mana 15%",
      "50% Extra Gold From Monsters",
      "20% Better Chance of Getting Magic Items",
      "+3 To Light Radius",
    ],
  },
  {
    id: 31,
    name: "Melody",
    runes: [13, 18, 4],
    types: ["Missile Weapons"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 39,
    ladder: false,
    stats: [
      "+50% Enhanced Damage",
      "+300% Damage To Undead",
      "+3 To Bow and Crossbow Skills (Amazon Only)",
      "+3 To Critical Strike (Amazon Only)",
      "+3 To Dodge (Amazon Only)",
      "+3 To Slow Missiles (Amazon Only)",
      "20% Increased Attack Speed",
      "+10 To Dexterity",
      "Knockback",
    ],
  },

  {
    id: 32,
    name: "Harmony",
    runes: [3, 6, 12, 18],
    types: ["Missile Weapons"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 39,
    ladder: false,
    stats: [],
  },
  {
    id: 33,
    name: "Hustle",
    runes: [13, 18, 2],
    types: ["Weapons", "Body Armors"],
    excluded: "",
    classes: [],
    patch: "2.6",
    level: 39,
    ladder: true,
    stats: [],
  },
  {
    id: 34,
    name: "Lionheart",
    runes: [15, 17, 19],
    types: ["Body Armors"],
    excluded: "",
    classes: [],
    patch: "2.6",
    level: 41,
    ladder: false,
    stats: [],
  },
  {
    id: 35,
    name: "Obedience",
    runes: [15, 18, 10, 5, 19],
    types: ["Polearms", "Spears"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 41,
    ladder: false,
    stats: [],
  },
  {
    id: 36,
    name: "Unbending Will",
    runes: [19, 16, 6, 2, 1, 15],
    types: ["Polearms", "Spears"],
    excluded: "",
    classes: [],
    patch: "2.4",
    level: 41,
    ladder: false,
    stats: [],
  },
  {
    id: 37,
    name: "Wealth",
    runes: [20, 18, 3],
    types: ["Body Armors"],
    excluded: "",
    classes: [],
    patch: "",
    level: 43,
    ladder: false,
    stats: [],
  },
  {
    id: 38,
    name: "Passion",
    runes: [14, 9, 2, 20],
    types: ["Weapons"],
    excluded: "",
    classes: [],
    patch: "",
    level: 43,
    ladder: false,
    stats: [],
  },
  {
    id: 39,
    name: "Lawbringer",
    runes: [11, 20, 18],
    types: ["Swords", "Hammers", "Scepters"],
    excluded: "",
    classes: [],
    patch: "",
    level: 43,
    ladder: false,
    stats: [],
  },
  {
    id: 40,
    name: "Voice of Reason",
    runes: [20, 18, 1, 2],
    types: ["Swords", "Maces"],
    excluded: "",
    classes: [],
    patch: "1.10",
    level: 43,
    ladder: false,
    stats: [],
  },
  {
    id: 41,
    name: "Treachery",
    runes: [13, 10, 20],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Assassin"],
    patch: "1.11",
    level: 43,
    ladder: false,
    stats: [],
  },
  {
    id: 42,
    name: "Enlightenment",
    runes: [21, 8, 12],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Assassin"],
    patch: "1.11",
    level: 43,
    ladder: false,
    stats: [],
  },
  {
    id: 43,
    name: "Wisdom",
    runes: [21, 6, 2],
    types: ["Helms"],
    excluded: "",
    classes: [""],
    patch: "2.4",
    level: 45,
    ladder: false,
    stats: [],
  },
  {
    id: 44,
    name: "Crescent Moon",
    runes: [13, 22, 3],
    types: ["Axes", "Swords", "Polearms"],
    excluded: "",
    classes: [""],
    patch: "2.4",
    level: 45,
    ladder: false,
    stats: [],
  },
  {
    id: 45,
    name: "Duress",
    runes: [13, 22, 10],
    types: ["Body Armors"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 45,
    ladder: false,
    stats: [],
  },
  {
    id: 46,
    name: "Gloom",
    runes: [19, 22, 21],
    types: ["Body Armors"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 47,
    ladder: false,
    stats: [],
  },
  {
    id: 47,
    name: "Stone",
    runes: [13, 22, 21, 17],
    types: ["Body Armors"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 47,
    ladder: false,
    stats: [],
  },
  {
    id: 48,
    name: "Bone",
    runes: [12, 22, 22],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Necromancer"],
    patch: "1.11",
    level: 47,
    ladder: false,
    stats: [],
  },
  {
    id: 49,
    name: "Venom",
    runes: [7, 14, 23],
    types: ["Weapons"],
    excluded: "",
    classes: [""],
    patch: "1.11",
    level: 49,
    ladder: false,
    stats: [],
  },
  {
    id: 50,
    name: "Prudence",
    runes: [23, 3],
    types: ["Body Armors"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 49,
    ladder: false,
    stats: [],
  },
  {
    id: 51,
    name: "Sanctuary",
    runes: [18, 18, 23],
    types: ["Shields"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 49,
    ladder: false,
    stats: [],
  },
  {
    id: 52,
    name: "Oath",
    runes: [13, 21, 23, 17],
    types: ["Swords", "Axes", "Maces"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 49,
    ladder: false,
    stats: [],
  },
  {
    id: 53,
    name: "Rain",
    runes: [9, 23, 6],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Druid"],
    patch: "1.11",
    level: 49,
    ladder: false,
    stats: [],
  },
  {
    id: 54,
    name: "Delirium",
    runes: [20, 24, 16],
    types: ["Helms"],
    excluded: "",
    classes: ["Druid"],
    patch: "1.11",
    level: 51,
    ladder: false,
    stats: [],
  },
  {
    id: 55,
    name: "Kingslayer",
    runes: [23, 22, 25, 19],
    types: ["Swords", "Axes"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 53,
    ladder: false,
    stats: [],
  },
  {
    id: 56,
    name: "Rift",
    runes: [15, 18, 20, 25],
    types: ["Polearms", "Scepters"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 53,
    ladder: false,
    stats: [],
  },
  {
    id: 57,
    name: "Principle",
    runes: [8, 25, 2],
    types: ["Body Armors"],
    excluded: "",
    classes: ["Paladin"],
    patch: "1.11",
    level: 53,
    ladder: false,
    stats: [],
  },
  {
    id: 58,
    name: "Mosaic",
    runes: [23, 25, 11],
    types: ["Claws"],
    excluded: "",
    classes: ["Assassin"],
    patch: "2.6",
    level: 53,
    ladder: true,
    stats: [],
  },
  {
    id: 59,
    name: "Silence",
    runes: [14, 2, 15, 24, 3, 26],
    types: ["Weapons"],
    excluded: "",
    classes: [""],
    patch: "",
    level: 55,
    ladder: false,
    stats: [],
  },
  {
    id: 60,
    name: "Heart of the Oak",
    runes: [18, 26, 21, 10],
    types: ["Staves", "Maces"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 55,
    ladder: false,
    stats: [],
  },
  {
    id: 61,
    name: "Death",
    runes: [15, 1, 26, 9, 25],
    types: ["Swords", "Axes"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 55,
    ladder: false,
    stats: [],
  },
  {
    id: 62,
    name: "Flickering Flame",
    runes: [4, 21, 26],
    types: ["Helms"],
    excluded: "",
    classes: [""],
    patch: "2.4",
    level: 55,
    ladder: false,
    stats: [],
  },
  {
    id: 63,
    name: "Call to Arms",
    runes: [11, 8, 23, 24, 27],
    types: ["Weapons"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 57,
    ladder: false,
    stats: [],
  },
  {
    id: 64,
    name: "Chaos",
    runes: [19, 27, 22],
    types: ["Claws"],
    excluded: "",
    classes: ["Assassin"],
    patch: "1.10",
    level: 57,
    ladder: false,
    stats: [],
  },
  {
    id: 65,
    name: "Exile",
    runes: [26, 27, 24, 14],
    types: ["Paladin Shields"],
    excluded: "",
    classes: ["Paladin"],
    patch: "1.10",
    level: 57,
    ladder: false,
    stats: [],
  },
  {
    id: 66,
    name: "Fortitude",
    runes: [1, 12, 14, 28],
    types: ["Weapons", "Body Armors"],
    excluded: "",
    classes: [""],
    patch: "1.10",
    level: 59,
    ladder: false,
    stats: [],
  },
  {
    id: 67,
    name: "Grief",
    runes: [5, 3, 28, 23, 8],
    types: ["Swords", "Axes"],
    excluded: "",
    patch: "1.10",
    level: 59,
    ladder: false,
    stats: [],
  },
  {
    id: 68,
    name: "Bramble",
    runes: [8, 27, 29, 5],
    types: ["Body Armors"],
    excluded: "",
    patch: "1.10",
    level: 61,
    ladder: false,
    stats: [],
  },
  {
    id: 69,
    name: "Wind",
    runes: [29, 1],
    types: ["Melee Weapons"],
    excluded: "",
    patch: "1.10",
    level: 61,
    ladder: false,
    stats: [],
  },
  {
    id: 70,
    name: "Dragon",
    runes: [29, 28, 12],
    types: ["Body Armors", "Shields"],
    excluded: "",
    patch: "1.10",
    level: 61,
    ladder: false,
    stats: [],
  },
  {
    id: 71,
    name: "Beast",
    runes: [30, 3, 22, 23, 17],
    types: ["Axes", "Scepters", "Hammers"],
    excluded: "",
    patch: "1.10",
    level: 63,
    ladder: false,
    stats: [],
  },
  {
    id: 72,
    name: "Chains of Honor",
    runes: [14, 22, 30, 24],
    types: ["Body Armors"],
    excluded: "",
    patch: "1.10",
    level: 63,
    ladder: false,
    stats: [],
  },
  {
    id: 73,
    name: "Eternity",
    runes: [11, 30, 24, 12, 29],
    types: ["Melee Weapons"],
    excluded: "",
    patch: "1.10",
    level: 63,
    ladder: false,
    stats: [],
  },
  {
    id: 74,
    name: "Infinity",
    runes: [30, 23, 30, 24],
    types: ["Polearms", "Spears"],
    excluded: "",
    patch: "1.10",
    level: 63,
    ladder: false,
    stats: [],
  },
  {
    id: 75,
    name: "Wrath",
    runes: [21, 17, 30, 23],
    types: ["Missile Weapons"],
    excluded: "",
    patch: "1.10",
    level: 63,
    ladder: false,
    stats: [],
  },
  {
    id: 76,
    name: "Fury",
    runes: [31, 25, 5],
    types: ["Melee Weapons"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 77,
    name: "Enigma",
    runes: [31, 6, 30],
    types: ["Body Armors"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 78,
    name: "Famine",
    runes: [19, 27, 9, 31],
    types: ["Axes", "Hammers"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 79,
    name: "Brand",
    runes: [31, 28, 23, 25],
    types: ["Missile Weapons"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 80,
    name: "Destruction",
    runes: [26, 28, 30, 31, 18],
    types: ["Polearms", "Swords"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 81,
    name: "Dream",
    runes: [16, 31, 21],
    types: ["Helms", "Shields"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 82,
    name: "Faith",
    runes: [27, 31, 20, 2],
    types: ["Missile Weapons"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 83,
    name: "Ice",
    runes: [11, 13, 31, 28],
    types: ["Missile Weapons"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 84,
    name: "Last Wish",
    runes: [31, 23, 31, 29, 31, 30],
    types: ["Swords", "Hammers", "Axes"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 85,
    name: "Phoenix",
    runes: [26, 26, 28, 31],
    types: ["Weapons", "Shields"],
    excluded: "",
    patch: "1.10",
    level: 65,
    ladder: false,
    stats: [],
  },
  {
    id: 86,
    name: "Doom",
    runes: [15, 27, 22, 28, 32],
    types: ["Axes", "Polearms", "Hammers"],
    excluded: "",
    patch: "1.10",
    level: 67,
    ladder: false,
    stats: [],
  },
  {
    id: 87,
    name: "Hand of Justice",
    runes: [29, 32, 11, 28],
    types: ["Weapons"],
    excluded: "",
    patch: "1.10",
    level: 67,
    ladder: false,
    stats: [],
  },
  {
    id: 88,
    name: "Pride",
    runes: [32, 29, 16, 28],
    types: ["Polearms", "Spears"],
    excluded: "",
    patch: "1.10",
    level: 67,
    ladder: false,
    stats: [],
  },
  {
    id: 89,
    name: "Plague",
    runes: [32, 13, 22],
    types: ["Swords", "Claws", "Daggers"],
    excluded: "",
    patch: "2.4",
    level: 67,
    ladder: false,
    stats: [],
  },
  {
    id: 90,
    name: "Mist",
    runes: [32, 13, 25, 10, 6],
    types: ["Missile Weapons"],
    excluded: "",
    patch: "2.4",
    level: 67,
    ladder: false,
    stats: [],
  },
  {
    id: 91,
    name: "Metamorphosis",
    runes: [16, 32, 19],
    types: ["Helms"],
    excluded: "",
    classes: ["Druid"],
    patch: "2.6",
    level: 67,
    ladder: true,
    stats: [],
  },
  {
    id: 92,
    name: "Breath of the Dying",
    runes: [26, 15, 1, 2, 33, 5],
    types: ["Weapons"],
    excluded: "",
    classes: ["Druid"],
    patch: "1.10",
    level: 69,
    ladder: false,
    stats: [],
  },
  {
    id: 93,
    name: "Obsession",
    runes: [33, 24, 20, 17, 16, 4],
    types: ["Staves"],
    excluded: "",
    classes: ["Druid"],
    patch: "2.4",
    level: 69,
    ladder: false,
    stats: [],
  },
];
