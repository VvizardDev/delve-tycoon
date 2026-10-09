/* ===========================================================
   data.js  –  ALL GAME CONTENT. Edit this file to add/balance
   content; no logic lives here. Later this can move to
   Supabase tables (see README).
   Stats (see STATS below): might, agility, insight, presence, fortitude.
   =========================================================== */

/* ===========================================================
   TERMS: every game word shown to the player. Edit the VALUES freely (keep the keys). Values are lower-case
   (the UI capitalises where needed), except `game`, `gold`, `hp`, `xp`. Stat names/abbreviations/emoji are in STATS below,
   class/trait/item/dungeon/lore names are in their own tables. Internal ids (e.g. 'might', 'cellar') must NOT be renamed.
   Sentences are in TERMS.phrases below. Trait / stat / class descriptions in this file may also use {placeholders} (e.g. {party}, {hp}, {might}).
   =========================================================== */
const TERMS = {
  game: 'Delve Tycoon', gold: 'Genecreds', goldIcon: '🪙', hp: 'HP', xp: 'XP',
  dungeon: 'deployment', dungeons: 'deployments', room: 'stage', rooms: 'stages',
  adventurer: 'operative', adventurers: 'operatives', party: 'squad', team: 'team',
  guild: 'HQ', tavern: 'gene vats', roster: 'roster', armory: 'armory', codex: 'codex', missions: 'missions',
  expedition: 'expedition', expeditions: 'expeditions', battleReport: 'battle report', battleReports: 'battle reports', log: 'log',
  loyalty: 'loyalty', trait: 'trait', traits: 'traits', lore: 'lore',
  help: '? Help', close: 'Close', saveData: 'Save data', resetSave: 'Reset save', compactView: 'Compact view', detailView: 'Detailed view', items: 'items',
  attempt: 'attempt', attempts: 'attempts', lastParty: 'select last party',
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],   // day labels, index 0 = Sunday (used by class schedules)
  hire: 'hire', hired: 'hired', release: 'release', send: 'send', restore: 'restore', clearOdds: 'clear odds',

  /* ---- PHRASES: every sentence the UI/game writes. {name} = a value supplied by the code, {party} = a term above,
     {Party} = the term capitalised. Keep the {placeholders} each phrase uses (they are listed in the phrase text). ---- */
  phrases: {
    welcome: `Welcome to the {game}.`,
    capMax: `Maximum size reached.`, capNewDungeon: `First clear of a new {dungeon} = +{n} slot.`, capWins: `{n} more clears = +1 slot.`, capLevels: `{n} more total levels = +1 slot.`,
    buySlot: `Buy slot ({cost}{goldIcon})`, logSlot: `{Roster} slot bought for {cost}{goldIcon} (now {cap}).`,
    classDays: `Available on: {days}`, classEvent: `Limited-time class.`, faceBtn: `Change face`,
    unlockLore: `Uncover: {title}`, unlockClears: `Clear {name} {n}×`,
    reqClass: `with a {class} in the {party}`, reqItem: `with {name} equipped`, reqTrait: `with a {name}`, reqSolo: `solo`, reqFlawless: `without a failed {attempt}`, reqLevel: `with someone at level {n}+`,
    loreHint: `Clear {name} {n}× {req}`, loreDefault: `Keep exploring.`, locked: `Locked`, unseen: `???`,
    // battle report lines
    enter: `{names} enter {name}. {Party} {hp} {n}.`,
    roomHeader: `{Room} {i}/{total}: {name} (tests {emoji} {stat}, {pct}% per {attempt}).`,
    attempt: `{Attempt} {n}: {hero} {action}. {result} {hp} {cur}/{max}`, passed: `<span class="win">Cleared.</span>`, failedTry: `<span class="lose">Failed.</span>`,
    secondWind: `{name}'s second wind: no {hp} lost.`, lastBreath: `Last breath! The {party} hangs on at 1 {hp}.`, heal: `{name} patches up the {party} (+{n} {hp}).`,
    runFailed: `<span class="lose">Run failed after {n}/{total} {rooms}.</span> {gain} {xp} gained.`,
    resolveHolds: `{name}'s resolve holds: no {loyalty} lost.`, loyaltyLoss: `{name} loses 1 {loyalty} ({cur}/{max} left).`,
    departs: `<span class="lose">{name} has lost all faith and abandons the {guild}, taking their gear.</span>`,
    cleared: `{Dungeon} cleared! +{amount} {gold}, +{gain} {xp} each.`, loot: `Loot: {items}.`, levelUp: `Level up: {names}.`,
    loreUnlocked: `{Lore} unlocked: "{title}".`, revealed: `New {dungeon} revealed: {name}!`, gainsTrait: `<span class="win">{name} gains the {trait} {tname}!</span>`,
    // log lines
    logFail: `<span class="lose">{names} failed {name}</span> ({n}/{total} {rooms}); everyone loses 1 {loyalty}.`, logDeparted: ` <span class="lose">Departed: {names}.</span>`,
    logClear: `<span class="win">{names} cleared {name}!</span> +{amount} {gold}.`, logLore: ` {Lore} unlocked: "{title}".`, logRevealed: ` New {dungeon} revealed: {name}.`, logTrait: ` {name} gained {tname}.`,
    logHired: `{Hired} {name} the {cls}: {stats}{traits}.`, logPicked: `{name} gained the {trait} {tname}.`, logRestored: `{name}'s {loyalty} restored to {cur}/{max} (-{fee}{goldIcon}).`,
    confirmRelease: `{Release} {name}? Their gear returns to your inventory.`, confirmRisk: `{names} on 1 {loyalty}. If this run fails they leave for good, taking their equipped gear. Send anyway?`, confirmReset: `Delete your save?`,
    // tavern / roster
    tavernSub: `{Roster} {n}/{cap} · stats and {traits} are rolled when you {hire}. {hint}`, tavernLoyalty: `{Loyalty} {n}.`, tendencies: `Likely strong: {strong} · likely weak: {weak}`,
    rosterFull: `{Roster} full`, hireBtn: `{Hire}… {cost}{goldIcon}`, hireFree: `{Hire}… free`,
    rosterEmpty: `Your {roster} is empty. Visit the {tavern}.`, partySel: `Selected {party}: {n}/{max} · ❤️ <b>{hpv} {team} {hp}</b>`, partyHint: `Tick "{Party}" on {adventurers} to form a {party} and see its {team} {hp}.`,
    addsHp: `adds ❤️ {n} {team} {hp}`, level: `Lv {n}`, away: `AWAY`, noTraits: `No {traits}`, atRisk: `at risk`, remove: `Remove`, empty: `Empty`, equipOpt: `Equip…`, newTrait: `New {trait}! Choose one:`,
    expand: `Expand`, collapse: `Collapse`,
    // dungeons / missions / armory
    dungeonsParty: `{Party} of {n}: ❤️ {hpv} {hp} · a failed run costs everyone 1 {loyalty}`, dungeonsTick: `Tick "{Party}" on {adventurers} in the {Guild} tab to form a {party}.`,
    traitReward: `{Trait} reward`, dungeonLine1: `{n} {rooms} {emojis} · ~{dmg} expected damage · {sec}s`, dungeonLine2: `{min}–{max}{goldIcon} · {xpn} {xp} · cleared {times}×`,
    noParty: `No {party} out.`, teamLine: `{names} · ❤️ {hpv} {team} {hp}`, runsIdle: `No {expeditions} underway`, runBar: `{name} {pct}% · {sec}s`,
    armoryEmpty: `Empty. Win {dungeons} to find loot.`, armoryHint: `Equip items from a character's card in the {Guild} tab.`,
    // codex / reports / pop-ups
    loreTitle: `{Codex} ({n}/{total})`, dexTitle: `{Codex}: {name} ({n}/{total})`, foundIn: `Found in: {names}`, dropOnly: `Not found in any {dungeon} yet.`,
    reportsEmpty: `Reports appear here when a {party} returns.`, wordCleared: `cleared`, wordFailed: `failed`, resultCleared: `Cleared`, resultFailed: `Failed`,
    continue: `Continue`, continueMore: `Continue ({n} more)`, newEntry: `New {Codex} entry: {name}`,
    // hire pop-up
    draftTitle: `{Hire} a {cls}`, artNote: `Portrait & paper-doll customisation coming later`, nameLabel: `Name`, rerollName: `Re-roll name`, rerollStats: `Re-roll stats ({n} left)`,
    rangeNote: `({cls} range {lo}–{hi})`, traitHead: `{Trait} (fixed)`, noTrait: `No {trait}.`, hireFor: `{Hire} for {cost}{goldIcon}`, traitMod: `{n} {trait}`,
    // help window
    helpTitle: `How to play`, statsTitle: `Stats`,
    help1: `{Hire} {adventurers} at the {tavern} (their stats and {traits} are rolled when you {hire}), tick up to {maxParty} in the {roster} to form a {party}, and send them into a {dungeon}. The fight plays out automatically {room} by {room}: each {room} tests one stat, and every {attempt}, pass or fail, drains the {party}'s shared {hp}.`,
    help2: `Clear a {dungeon} for {gold}, {xp}, loot and {lore}, then equip loot to tackle harder ones. If {hp} runs out, the run fails and every {party} member loses 1 {loyalty}; at 0 they leave for good, taking their gear. Pay their {hire} cost to {restore} a point. Goons are free if you're broke. Your {roster} grows as you clear new {dungeons}. New {traits} and {items} you meet are recorded in the {codex}.`,
  },
};

// The five stats. Add/rename here; descriptions may use {placeholders} for TERMS words and stat names (filled at load: {party}, {hp}, {might}...); every loop in game.js uses these keys.
// emoji + abbr = short label in the UI. name = full name. role = shown in the How-to-play window.
const STATS = {
  might:     { emoji: '⚔️', abbr: 'MIT', name: 'Might',     role: 'Passes brute-force {rooms} (monsters, rockfalls, doors).' },
  agility:   { emoji: '🏹', abbr: 'AGI', name: 'Agility',   role: 'Passes trap, stealth and speed {rooms}. Also raises item drop chance.' },
  insight:   { emoji: '🧠', abbr: 'INS', name: 'Insight',   role: 'Passes puzzle, ward and hidden-danger {rooms}. Also raises {xp} earned.' },
  presence:  { emoji: '✨', abbr: 'PRE', name: 'Presence',  role: 'Passes fear, curse and unholy {rooms}. Also raises {gold} earned.' },
  fortitude: { emoji: '🛡️', abbr: 'FOR', name: 'Fortitude', role: 'Adds to the {party} {hp} pool that every {attempt} drains. Also passes poison/heat {rooms}.' },
};

/* Adventurer classes.
   name        : DISPLAY name shown to players (rename freely). The key (warrior, rogue...) is the internal id saved in games: NEVER rename a key that players may already have.
   unlock / hidden / schedule : availability in the Tavern. unlock = same rules as dungeons ({ lore:[ids], clears:{dungeonId:n} }). hidden:true = not listed until available
                (default: listed locked with its requirements). schedule = { days:[0-6] (0=Sunday), from:'YYYY-MM-DD', until:'YYYY-MM-DD' } (all optional), e.g. weekend-only classes.
                Hired adventurers are never removed when a class becomes unavailable. TODO server: today's date and the schedule will come from the server.
   portraits   : how many portrait variants (faces) this class has; default ART.portraitVariants. Files: art/portraits/<id>_1.webp ... <id>_N.webp
   emoji       : placeholder portrait (replaced by art later, see portraitHtml in game.js)
   cost        : gold to hire (0 = free). Also the gold fee to restore ONE loyalty point.
   maxLoyalty  : optional; overrides CONFIG.maxLoyalty for this class (goons have 1 and cannot be restored).
   maxTraits   : 1 = a hire rolls one trait, 0 = none.
   traitBias   : optional { traitId: weightMultiplier } making this class likelier to roll those traits (default weight 1).
   roll        : per-stat [min,max]; a hire's base stats are rolled uniformly in this range, so each
                 class is LIKELY good at some stats but any hire can be better or worse than average.
   grow        : fixed stats gained per level.
   hideTendencies : true = tavern shows only the blurb (used by the goon).
   blurb       : one line of tavern text. */
const CLASSES = {
  warrior: { name: 'Nephilim', emoji: '🧑‍🚀', cost: 50, maxTraits: 1, traitBias: { brawler: 2, stalwart: 2, bulwark: 2, hale: 2 }, roll: { might: [4, 6], agility: [1, 3], insight: [0, 2], presence: [1, 3], fortitude: [5, 7] }, grow: { might: 2, agility: 0, insight: 0, presence: 1, fortitude: 2 }, blurb: 'Vat-born and amenesia-conditioned super soliders. Born to serve The Demiurge.' },
  rogue:   { name: 'Pleiadean', emoji: '🧝', cost: 60, maxTraits: 1, unlock: { clears: { mine: 1 } }, traitBias: { nimble: 2, keen: 2, duelist: 2, lucky_find: 2, second_wind: 2 }, roll: { might: [2, 4], agility: [5, 7], insight: [1, 3], presence: [0, 2], fortitude: [2, 4] }, grow: { might: 1, agility: 2, insight: 1, presence: 0, fortitude: 1 }, blurb: 'Humoid. Inferior genetics but agile.' },
  mage:    { name: 'Grey', emoji: '👽', cost: 70, maxTraits: 1, traitBias: { sharp_eyed: 2, keen: 2, boss_slayer: 2, quick_study: 2 }, roll: { might: [0, 2], agility: [1, 3], insight: [6, 8], presence: [2, 4], fortitude: [1, 3] }, grow: { might: 0, agility: 1, insight: 3, presence: 1, fortitude: 1 }, blurb: 'Brilliant but fragile.' },
  cleric:  { name: 'Reptoid', emoji: '🦎', cost: 60, maxTraits: 1, unlock: { clears: { crypt: 1 } }, traitBias: { commanding: 2, medic: 2, iron_will: 2, loyal_heart: 2, last_breath: 2 }, roll: { might: [1, 3], agility: [0, 2], insight: [2, 4], presence: [5, 7], fortitude: [3, 5] }, grow: { might: 1, agility: 0, insight: 1, presence: 2, fortitude: 1 }, blurb: 'Brutish beast, mindless enforcers.' },
  goon:    { name: 'Goon', emoji: '👤', cost: 0, maxLoyalty: 1, maxTraits: 0, hideTendencies: true, roll: { might: [1, 2], agility: [1, 2], insight: [0, 1], presence: [0, 1], fortitude: [1, 2] }, grow: { might: 1, agility: 0, insight: 0, presence: 0, fortitude: 1 }, blurb: 'Free, weak and expendable: 1 {loyalty}, no restoring. Your safety net.' },
  // ---- SAMPLE classes to show the new systems (placeholders: edit or delete) ----
  ranger:  { name: 'Ranger', emoji: '🧭', cost: 65, maxTraits: 1, hidden:true, unlock: { clears: { cellar: 1 } }, traitBias: { nimble: 2, keen: 2, scavenger: 2 }, roll: { might: [2, 4], agility: [4, 6], insight: [2, 4], presence: [1, 3], fortitude: [3, 5] }, grow: { might: 1, agility: 2, insight: 1, presence: 0, fortitude: 1 }, blurb: 'Scout and trapper. Unlocks after your first {dungeon} clear.' },
  bard:    { name: 'Bard', emoji: '🎻', cost: 60, maxTraits: 1, hidden: true, schedule: { days: [5, 6, 0] }, traitBias: { commanding: 2, silver_tongue: 2 }, roll: { might: [0, 2], agility: [2, 4], insight: [2, 4], presence: [5, 7], fortitude: [2, 4] }, grow: { might: 0, agility: 1, insight: 1, presence: 2, fortitude: 1 }, blurb: 'Weekend visitor (Fri-Sun). Inspiring and well paid.' },
};

/* Traits. Every hire rolls ONE (goons none); one more is offered every CONFIG.traitEvery levels (you choose
   from 3); some dungeons grant one (dungeon.traitReward). Traits are permanent. SINGLE-ADVENTURER effects only (no auras).
   rarity: common | uncommon | rare | legendary. Legendary never rolls; it is dungeon-reward only.
   Stronger rarities should carry bigger drawbacks (negative bonuses etc.).
   effect keys (all optional):
     bonus {stat:n}     flat stat change, negative = drawback
     hp: n              flat party HP
     gold / xp: f       fraction of party gold/XP (0.1 = +10%, negative allowed)
     loot: f            +item drop chance (0.05 = +5 points)
     maxLoyalty: n      change this adventurer's loyalty cap (never below 1)
     feeMult: f         change loyalty restore fee (-0.4 = 40% cheaper)
     loyaltySave: f     chance this adventurer loses no loyalty when a run fails
     lowBonus {stat:n}  extra stats while on 1 loyalty (if their max is higher)
   RULE effects (apply only to ROOMS THE HOLDER LEADS = the party member with the best stat for that room, or the whole run where noted):
     leadChance: f      +pass chance on rooms they lead      | bossChance: f   same, final room only
     leadDamage: f      attempts at rooms they lead cost this fraction less HP
     leadHeal: n        heal n HP when they lead a room to a pass
     freeRetry: 1       first failed attempt per room they lead costs no HP
     lastBreath: 1      once per run (any holder in the party): HP 0 becomes 1
     flawlessGold: f    +gold fraction on a flawless clear (no failed {attempts})
   To add a NEW KIND of effect: add the key here, then handle it in game.js (search traitSum / statsOf). */
const TRAITS = {
  brawler:       { name: 'Brawler',        rarity: 'common',    desc: '+2 {might}',                        effect: { bonus: { might: 2 } } },
  nimble:        { name: 'Nimble',         rarity: 'common',    desc: '+2 {agility}',                      effect: { bonus: { agility: 2 } } },
  sharp_eyed:    { name: 'Sharp-eyed',     rarity: 'common',    desc: '+2 {insight}',                      effect: { bonus: { insight: 2 } } },
  commanding:    { name: 'Commanding',     rarity: 'common',    desc: '+2 {presence}',                     effect: { bonus: { presence: 2 } } },
  stalwart:      { name: 'Stalwart',       rarity: 'common',    desc: '+2 {fortitude}, -1 {agility}',        effect: { bonus: { fortitude: 2, agility: -1 } } },
  hardy:         { name: 'Hardy',          rarity: 'common',    desc: '+4 {party} {hp}',                     effect: { hp: 4 } },
  silver_tongue: { name: 'Silver-tongued', rarity: 'common',    desc: '+10% {gold} from clears',           effect: { gold: 0.1 } },
  quick_study:   { name: 'Quick Study',    rarity: 'common',    desc: '+10% {xp} from clears',             effect: { xp: 0.1 } },
  scavenger:     { name: 'Scavenger',      rarity: 'common',    desc: '+5% item drop chance',            effect: { loot: 0.05 } },
  glass_cannon:  { name: 'Glass Cannon',   rarity: 'uncommon',  desc: '+3 {might}, -1 {fortitude}',          effect: { bonus: { might: 3, fortitude: -1 } } },
  loyal_heart:   { name: 'Loyal Heart',    rarity: 'uncommon',  desc: '+1 max {loyalty}, -1 {agility}',    effect: { maxLoyalty: 1, bonus: { agility: -1 } } },
  haggler:       { name: 'Haggler',        rarity: 'uncommon',  desc: '{Loyalty} restore 40% cheaper, -1 {might}', effect: { feeMult: -0.4, bonus: { might: -1 } } },
  lucky_find:    { name: 'Lucky Find',     rarity: 'uncommon',  desc: '+10% drop chance, -10% {gold}',     effect: { loot: 0.1, gold: -0.1 } },
  berserker:     { name: 'Berserker',      rarity: 'rare',      desc: '+6 {might}, -1 {fortitude}, -1 {insight}', effect: { bonus: { might: 6, fortitude: -1, insight: -1 } } },
  iron_will:     { name: 'Iron Will',      rarity: 'rare',      desc: '50% chance to lose no {loyalty} on a failed run; -2 {agility}, -2 {insight}', effect: { loyaltySave: 0.5, bonus: { agility: -2, insight: -2 } } },
  last_stand:    { name: 'Last Stand',     rarity: 'rare',      desc: '+5 {might} and +5 {fortitude} on 1 {loyalty}; -2 {presence}, -1 {agility}', effect: { lowBonus: { might: 5, fortitude: 5 }, bonus: { presence: -2, agility: -1 } } },
  prodigy:       { name: 'Prodigy',        rarity: 'rare',      desc: '+35% {xp}; -1 {might}, -1 {fortitude}', effect: { xp: 0.35, bonus: { might: -1, fortitude: -1 } } },
  hale:          { name: 'Hale',           rarity: 'common',    desc: '+1 {fortitude}, +1 {presence}',       effect: { bonus: { fortitude: 1, presence: 1 } } },
  keen:          { name: 'Keen',           rarity: 'common',    desc: '+1 {agility}, +1 {insight}',          effect: { bonus: { agility: 1, insight: 1 } } },
  vanguard:      { name: 'Vanguard',       rarity: 'uncommon',  desc: '+10% pass chance on {rooms} they lead; -1 {fortitude}', effect: { leadChance: 0.1, bonus: { fortitude: -1 } } },
  medic:         { name: 'Medic',          rarity: 'uncommon',  desc: 'Heals 3 {party} {hp} each time they lead a {room} to a pass; -1 {might}', effect: { leadHeal: 3, bonus: { might: -1 } } },
  duelist:       { name: 'Duelist',        rarity: 'rare',      desc: '+20% pass chance on {rooms} they lead; -2 {fortitude}', effect: { leadChance: 0.2, bonus: { fortitude: -2 } } },
  bulwark:       { name: 'Bulwark',        rarity: 'rare',      desc: '{Attempts} at {rooms} they lead cost 15% less {hp}; -3 {agility}', effect: { leadDamage: 0.15, bonus: { agility: -3 } } },
  second_wind:   { name: 'Second Wind',    rarity: 'rare',      desc: 'The first failed {attempt} in each {room} they lead costs no {hp}; -2 {might}', effect: { freeRetry: 1, bonus: { might: -2 } } },
  boss_slayer:   { name: 'Boss Slayer',    rarity: 'rare',      desc: '+25% pass chance on the final {room} if they lead it; -2 {presence}', effect: { bossChance: 0.25, bonus: { presence: -2 } } },
  lucky_streak:  { name: 'Lucky Streak',   rarity: 'rare',      desc: '+50% {gold} on a flawless clear (no failed attempts); -2 {insight}', effect: { flawlessGold: 0.5, bonus: { insight: -2 } } },
  last_breath:   { name: 'Last Breath',    rarity: 'rare',      desc: 'Once per run, the {party} survives at 1 {hp} instead of hitting 0; -2 {might}, -2 {fortitude}', effect: { lastBreath: 1, bonus: { might: -2, fortitude: -2 } } },
  hungers_mark:  { name: "The Hunger's Mark", rarity: 'legendary', desc: '+5 {might}, +4 {insight}, +3 {presence}, +2 {agility}; -2 {fortitude}, -1 max {loyalty}', effect: { bonus: { might: 5, insight: 4, presence: 3, agility: 2, fortitude: -2 }, maxLoyalty: -1 } },
};

// Equipment slots (used by the roster card and Armory). Item .slot must be one of these keys.
const SLOTS = { weapon: { emoji: '🗡️', name: 'Weapon' }, armor: { emoji: '🦺', name: 'Armor' }, trinket: { emoji: '💍', name: 'Trinket' } };

// Random names for hires.
const NAMES = ['Litu','Gargarel','Belvitas','Ongu','Ween','Fugga','Klueto','Chef','Neil T Seil','Benny Walks','Ziltaroth','Urgon'];

// Items. slot: weapon | armor | trinket. bonus: stats added while equipped (use any STATS keys).
const ITEMS = {
  rusty_sword:   { name: 'Nuraghic Bolt',    slot: 'weapon',  bonus: { might: 3 } },
  oak_staff:     { name: 'Psionic Headband',      slot: 'weapon',  bonus: { insight: 4 } },
  moon_blade:    { name: 'Moonlit Blade',  slot: 'weapon',  bonus: { might: 8, agility: 3 } },
  leather_vest:  { name: 'Venusian Polymer',   slot: 'armor',   bonus: { fortitude: 3 } },
  bone_mail:     { name: 'Dogu Vest',      slot: 'armor',   bonus: { fortitude: 8 } },
  lucky_coin:    { name: 'Baghdad Battery',     slot: 'trinket', bonus: { agility: 2, presence: 2 } },
  crypt_signet:  { name: 'Annunaki Signet',   slot: 'trinket', bonus: { might: 2, insight: 2, presence: 2, fortitude: 2 } },
};

/* Dungeons.
   difficulty : sets how hard each room check is (see game.js roomChance)
   damage     : party HP lost on EVERY attempt at a room, pass or fail (+-30% random). Compare to party HP (fortitude x hpPerFortitude)
   duration   : seconds the party is away (short for testing; raise for real play)
   gold [min,max], xp (per surviving adventurer on win; 25% of it on a loss)
   loot       : [itemId, chance 0-1] rolled once each on a win
   loreRewards: [{ id, clears, requires? }] lore unlocked after a WIN once the dungeon's win count reaches `clears`
                (any run from then on, so conditional lore can unlock on a LATER run; nothing is ever one-shot).
                requires (all optional, all must hold): class:'mage' (someone in the party) | item:'itemId' (equipped by someone)
                | trait:'traitId' | solo:true | flawless:true (no failed attempts) | minLevel:n
   emoji      : placeholder banner icon (art replaces it, see ART)
   unlock     : null, or { lore:[loreIds], clears:{ dungeonId: n } } = what must be true before this dungeon can be sent to
   hidden     : true = not shown at all until unlocked (default: shown locked with its requirements)
   traitReward: null, or a TRAITS id granted to every party member on ANY clear (if they lack it). Leave null for most dungeons. */
const DUNGEONS = [
  { id: 'cellar', emoji: '💧',  name: 'Gunung Padang',   difficulty: 15, damage: 6,  duration: 10, gold: [20, 40],   xp: 15,  loot: [['rusty_sword', .4], ['leather_vest', .4]], loreRewards: [{ id: 'cellar', clears: 1 }, { id: 'cellar_deep', clears: 3 }], unlock: null, hidden: false, traitReward: null },
  { id: 'mine', emoji: '⛏️',    name: 'Gobekli Tepe',   difficulty: 40, damage: 12,  duration: 20, gold: [50, 90],   xp: 35,  loot: [['oak_staff', .35], ['lucky_coin', .3]],   loreRewards: [{ id: 'mine', clears: 1 }], unlock: null, hidden: false, traitReward: null },
  { id: 'crypt', emoji: '🛣️️',   name: 'Bimini Road',     difficulty: 90, damage: 18,  duration: 40, gold: [120, 200], xp: 80,  loot: [['bone_mail', .35], ['crypt_signet', .15]], loreRewards: [{ id: 'crypt', clears: 1 }, { id: 'crypt_reading', clears: 1, requires: { class: 'cleric' } }], unlock: null, hidden: false, traitReward: null },
  { id: 'spire', emoji: '🛕',   name: 'Cholula Pyramid', difficulty: 200, damage: 21, duration: 80, gold: [300, 500], xp: 180, loot: [['moon_blade', .25]],                      loreRewards: [{ id: 'spire', clears: 1 }], unlock: null, hidden: false, traitReward: 'hungers_mark' },
];

// Lore entries. hint = text shown while locked (default is generated from the unlock rule); secret:true shows ??? instead.
// cellar_deep and crypt_reading are PLACEHOLDER samples of count-based and class-conditional lore: edit or delete them.
const LORE = {
  cellar: { title: 'The Stone Terraces', text: 'The humans have built a series of stone terraces tapered to a point. How could simple hunter-gatherers achieve this?' },
  mine:   { title: 'The Venusian Foe',       text: 'The kin of the humans, the arrogant Pleiadeans, are the ringleaders of the human rebellion.' },
  crypt:  { title: 'The Granite Causeway',   text: 'The reptilians built this road across the entire ocean to transport mined resources to take off planet. Now it is a hub of their foul rebellion.' },
  cellar_deep:    { title: "Tall Whites?", text: 'Torture and interrogations tell us the slave rebellion is not being lead by the Hunter Gatherers...' },
  crypt_reading:  { title: 'The Serpent\'s betrayal', hint: 'It takes a snake to know a snake.', text: 'The Annunaki known as The Serpent has betrayed his race and sided with the Ultimate Monstrosity. Perhaps he seeks to rule Earth.' },
  spire:  { title: 'The Supreme Monstrosity', text: 'The Reptilian\'s living god perishes before you, only to regenerate. His eternal hunger infects your very DNA. It seems only The Dryas may defeat it.' },
};

// Tuning constants. (Balance knobs; see README "Stats" for how each is used.)
const CONFIG = {
  startGold: 150,
  maxParty: 3,
  xpToNext: (level) => 20 * level,  // XP needed to go from `level` to level+1
  otherStatWeight: 0.25,    // in a room, non-tested stats count this much (generalists still work)
  roomDiffScale: 0.6,       // room difficulty = dungeon.difficulty * this
  roomChanceMin: 0.05, roomChanceMax: 0.97,
  hpPerFortitude: 3,        // party HP = total fortitude * this
  maxLoyalty: 3,            // loyalty pips a hire starts with / can hold (class.maxLoyalty overrides)
  rosterCapStart: 4,        // roster slots at the start
  rosterSlotCosts: [150, 300, 500, 800, 1200, 1800, 2600, 3600],   // gold price of the 1st, 2nd, 3rd... bought slot (its length = how many can be bought)
  rosterCapPerNewDungeon: 0, // free slots per different dungeon cleared at least once (0 = off)
  rosterCapWinsPerSlot: 0,   // +1 free slot per this many total clears (0 = off)
  rosterCapLevelsPerSlot: 0, // +1 free slot per this many TOTAL adventurer levels (0 = off; can shrink if adventurers leave)
  rosterCapMax: 12,          // hard ceiling on every source combined
  scheduleUtc: true,         // class weekday schedules use UTC days (false = the player's local day)
  clockOffsetHours: 0,       // TESTING: shift the clock to see other weekdays (the server clock will replace this)
  traitEvery: 10,           // every N levels an adventurer is offered a new trait (pick 1 of 3)
  rarityWeights: { common: 60, uncommon: 28, rare: 12 },   // trait roll odds; legendary (absent) never rolls
  statBarMax: 30,           // stat value that fills a stat bar on the roster card (display only)
  statRerolls: 2,           // stat re-rolls allowed in the hire pop-up
  oddsSims: 300,            // simulated runs used for the odds shown in the Dungeons panel
  lossXpFraction: 0.25,
  goldPerPresence: 0.01,    // +1% gold per point of party presence
  xpPerInsight: 0.01,       // +1% XP per point of party insight
  lootPerAgility: 0.005,    // +0.5% drop chance per point of party agility
};

/* ===========================================================
   ROOMS ("beats") and BATTLE-REPORT TEXT
   DUNGEON_ROOMS: encounters in order (last = boss). Each: { name, test }
   where test = which STATS key the room checks (see game.js roomChance).
   BEAT_TEXT.attack[stat]: random action lines for the hero who handles a room.
   =========================================================== */
const DUNGEON_ROOMS = {
  cellar: [{ name: 'jungle fighting', test: 'might' }, { name: 'waterlogged tunnel', test: 'might' }, { name: 'ascend the pyramid', test: 'might' }],
  mine:   [{ name: 'human guards', test: 'might' }, { name: 'blind tunnel assault', test: 'agility' }, { name: 'blonde warriors', test: 'might' }, { name: 'the Valiant defender', test: 'presence' }],
  crypt:  [{ name: 'reptoid mob', test: 'might' }, { name: 'endless granite blocks', test: 'agility' }, { name: 'tropical squall', test: 'fortitude' }, { name: 'reptoid overseer', test: 'insight' }],
  spire:  [{ name: 'hieroglyph doors', test: 'insight' }, { name: 'the sacrificing chambers', test: 'might' }, { name: 'primal fear', test: 'presence' }, { name: 'the dart trap', test: 'agility' }, { name: 'The Supreme Monstrosity', test: 'fortitude' }],
};
const BEAT_TEXT = {
  attack: {
    might:     ['charges in and smashes through', 'drives a heavy blow home', 'shoulders the door open'],
    agility:   ['slips past unseen', 'picks the lock in a heartbeat', 'darts through the gap'],
    insight:   ['spots the hidden danger', 'unravels the pattern', 'speaks a word of power'],
    presence:  ['stands firm against the dread', 'bellows a rallying cry', 'calls on a holy light'],
    fortitude: ['grits their teeth and endures', 'plants a shield against the onslaught', 'shrugs off the worst of it'],
  },
  win:  ['A clean victory.', 'It is over quickly.', 'The party is bloodied but standing.', 'A hard fight, but won.'],
  lose: ['The party is overwhelmed and forced to retreat.', 'A fatal mistake breaks the formation.', 'Out of strength, the party flees.'],
};

/* ===========================================================
   ART: set enabled:true once image files exist. Files are looked up by DATA ID, so adding art never needs code changes:
     base + paths[kind] with {id} replaced + '.' + ext      e.g.  art/portraits/warrior.webp
   A missing file silently falls back to the emoji placeholder (the <img> removes itself on error).
   kinds: portrait (id = class, or class_N if portraitVariants > 1), dungeon (banner, id = dungeon id),
          result (id = dungeonId_win | dungeonId_fail, shown in the mission-complete pop-up), lore (id = lore id; only loaded once unlocked),
          item (id = item id), trait (id = trait id, Codex only).
   Run artManifest() in the browser console to list every expected file for the CURRENT data. See art/README.md for sizes. =========================================== */
const ART = {
  enabled: false, base: 'art/', ext: 'webp', portraitVariants: 3,
  paths: { portrait: 'portraits/{id}', dungeon: 'dungeons/{id}', result: 'results/{id}', lore: 'lore/{id}', item: 'items/{id}', trait: 'traits/{id}' },
};
