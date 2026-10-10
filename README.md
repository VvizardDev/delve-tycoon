# Guildhall – dungeon contracts (proof of concept)

Hire adventurers, send parties into dungeons, resolve fights abstractly (power vs difficulty),
earn gold / XP / loot / lore, then gear up for harder dungeons. Single-player, no PvP yet.

## Run locally
Double-click `index.html`. No build step, no dependencies.
(If you later switch to ES modules or add Supabase's JS client, serve the folder instead:
`python3 -m http.server 8000` then open http://localhost:8000.)

## UI layout (index.html, style.css, game.js)
- **Tabs**: Guild (tavern + roster), Missions (dungeons, expeditions, reports, log), Armory, Codex (lore + reset). Defined by `<nav id="nav">` buttons (`data-tab`) and `<div class="view" data-view>` wrappers in index.html. To move a panel, move its `<section id>` into another view. To add a tab: new nav button + new `.view`. The current tab lives in `ui.tab`; `render()` shows/hides views. On phones (<=720px) the nav becomes a fixed bottom bar.
- **Look**: all colours are tokens at the top of style.css (`--accent`, `--panel`, ...). Panels have angular cut corners via `clip-path` (delete that rule for plain rectangles). Fonts: Rajdhani from Google Fonts with system fallbacks.
- **Roster card** (`renderRoster`): portrait + name/class/level/HP/XP bar, "Party" tick, traits, 5-stat grid (small green/red numbers = gear/trait modifiers; bar scale `CONFIG.statBarMax`), loyalty pips + restore, 3 equipment slots (`SLOTS` in data.js), Release.
- **Portraits (placeholder)**: `portraitHtml()` in game.js is the only place they are drawn (class emoji from `CLASSES[...].emoji`). For art, swap the emoji for an `<img>` there. The same function is used on the roster, tavern, hire pop-up and expedition cards.
- **Mobile**: 16px inputs (no iOS zoom), 44px tap targets, single-column cards, safe-area padding, fixed-height expeditions panel.

## Mission-complete pop-up and team HP
- When a mission resolves, its report gets `unread: true` and a `lore: [ids]` list. `renderResult()` (game.js) shows the oldest unread report in `<dialog id="result">`: headline, any lore unlocked (top), then the full battle report. **Continue** (`ACTIONS.dismissResult`) marks it read; more unread reports queue behind it. Unread state is saved, so runs finishing while the tab was closed show on return. Esc is blocked on purpose.
- Team HP (`partyHp`) shows on the Roster tab (sticky bar for the ticked party; each card shows the HP it adds), on each expedition card, and in the Dungeons panel.

## Terminology and phrases (TERMS in data.js)
- `TERMS` has two parts: single **words** (dungeon, room, adventurer, party, guild, loyalty, trait, gold, HP, attempt, button labels like "Reset save" ...) and `TERMS.phrases`, **every sentence** the game writes (log lines, battle-report beats, pop-up text, hints, confirmations, help text). Edit values freely; keep the keys.
- In a phrase, `{name}` is a value the code supplies or a term, and `{Name}` is the term capitalised. Keep the placeholders a phrase already uses (the code supplies them), but you may reorder them or drop one you don't want.
- Code uses `T.word`, `Cap(...)` and `S('phraseKey', {vars})`. Static labels in index.html use `data-term="key"`.
- Trait / stat / class descriptions in data.js can also use placeholders (e.g. `{party}`, `{hp}`, `{might}` = the stat's display name). They are filled once at load, so renaming a term or stat updates them.
- **Not** driven by TERMS (they are your content): names of classes, items, traits, dungeons, rooms, lore text, beat flavour lines (`BEAT_TEXT`), stat names/abbreviations (`STATS`). Never rename internal ids.

## Classes (CLASSES in data.js)
- Add a class by adding an entry (copy `warrior`). The **key** (`warrior`) is the internal id saved in games, **never rename a key players may already have**; the display name is `name` (rename that freely). A save containing a class id that no longer exists falls back to the first class instead of crashing.
- Availability, like dungeons: `unlock: { lore: [...], clears: { dungeonId: n } }`, `hidden: true` (not listed until available; otherwise listed locked with its requirements), and **`schedule: { days: [0-6], from: 'YYYY-MM-DD', until: 'YYYY-MM-DD' }`** (days 0 = Sunday; day labels are `TERMS.days`; all parts optional). Example: `bard` appears only Fri-Sun. `ranger` shows locked until the Flooded Cellar is cleared. Both are placeholder samples.
- Already-hired adventurers are never removed when a class stops being available.
- `portraits: n` = number of faces for the class (default `ART.portraitVariants`, 3). Files `art/portraits/<id>_1.webp` ... `_n`. Each hire gets a random face; the hire pop-up has ◀ ▶ to change it (cosmetic, free).
- **Server note:** the schedule uses `serverNow()` in game.js (today only shifted by `CONFIG.clockOffsetHours` for testing). With Supabase, replace it with the server's date and enforce the same check inside the hire function so a changed device clock gets nothing. UTC days are used by default (`CONFIG.scheduleUtc`).

## Roster cap
`rosterCap()` = `rosterCapStart` (4) + **bought slots** + optional free sources, up to `rosterCapMax` (12). Bought slots use the price list `CONFIG.rosterSlotCosts` (150, 300, 500, ... one entry per purchasable slot; the button is in the Tavern). Free sources, all **off (0)** for now: `rosterCapPerNewDungeon`, `rosterCapWinsPerSlot`, `rosterCapLevelsPerSlot` (the level one can shrink if adventurers leave). Existing adventurers are never removed if the cap drops; you just can't hire until under it.

## Lore and unlock rules (data-driven)
- A dungeon's `loreRewards: [{ id, clears, requires? }]` lists lore unlocked after a win once its win count reaches `clears`. It unlocks on that run or any later one where `requires` holds, so nothing is ever one-shot. `requires` (all must hold): `class`, `item` (equipped by someone in the party), `trait`, `solo`, `flawless`, `minLevel`. Logic: `ruleMet()` in game.js; add new condition kinds there.
- `LORE[id]`: `title`, `text`, optional `hint` (shown while locked; default is generated from the rule) and `secret: true` (shows ???). `cellar_deep` and `crypt_reading` are placeholder samples.
- A dungeon's `unlock: { lore: [ids], clears: { dungeonId: n } }` gates it (`isUnlocked()`); locked dungeons show their requirements, or are hidden entirely with `hidden: true`. Opening a new dungeon is announced in the result pop-up. All current dungeons have `unlock: null`.

## Rule traits
Besides stat/economy effects, traits can change how a run plays, but only through the adventurer who holds them: effects apply to rooms they **lead** (the party member with the best stat for that room) or, for `lastBreath`, once per run. Keys: `leadChance`, `bossChance`, `leadDamage`, `leadHeal`, `freeRetry`, `lastBreath`, `flawlessGold` (documented above `TRAITS` in data.js; implemented in `runDungeon` / `resolveMission`). Classes can bias trait rolls with `traitBias`. No party-wide auras.

## Top bar, panels, compact roster, last party
- The header (gold, run progress, help) is sticky: it stays visible while scrolling. The roster party bar sticks just below it. Height variable: `--topbar-h` in style.css.
- **Last party** button (Missions tab, next to the party hint) re-selects whoever you last sent who is idle and still in the roster (`state.lastParty`).

## Roster, hiring pop-up, sorting, themes
- **Roster tiles (default)**: each adventurer is a square tile (portrait, name, level, class, loyalty pips). **Tap a tile to add/remove them from the party** (check mark, highlighted border); the **ⓘ** button opens a details pop-up with the full card (stats, traits, equipment, restore, release). A small `!` marks a pending trait choice. **List view** (button in the roster tools) shows full cards, each collapsible with its arrow. Saved in `prefs.view` ('tiles' | 'list').
- **Sorting**: the Sort dropdown (hire order, level, class, name, loyalty, team HP contribution, idle first, or any stat) plus a direction button (`prefs.sort`, `prefs.sortDesc`; code: `sortedRoster()`). Numbers sort high-first by default, text A-Z.
- **Hiring** is a pop-up: tap **＋ Hire** in the roster tools (or the dashed ＋ tile). It lists class cards (locked / scheduled ones show why), the buy-a-slot button, and choosing a class opens the hire-draft pop-up (`tavernHtml`, `renderTavernDlg`).
- **Theme**: there is no in-game toggle (removed to reduce clutter). `CONFIG.theme` in data.js picks `'dark'` (default), `'light'` or `'auto'` (follow the device). Both palettes are token sets at the top of style.css (`:root` = dark, `:root[data-theme="light"]` = light). To bring a button back, add a header button that flips `document.documentElement.dataset.theme`.
- **Pop-ups open scrolled to the top** (`showDlg()` in game.js resets the scroll and each pop-up heading is autofocused).
- Panels with a collapse arrow: Roster, Battle reports, Log, Codex pages (`prefs.collapsed`). The top-bar run progress is described above.

## Codex discoveries
Traits and items are recorded in `state.seen` the first time they appear (shown in the hire pop-up, offered at a milestone, granted, or found as loot) via `markSeen()`. The Codex tab has Lore, Traits and Items pages: unseen entries show ???, seen ones show description, and items show which dungeons drop them. The mission pop-up announces new entries. Saves from before this feature are backfilled from current adventurers and inventory.

## Art infrastructure
See `art/README.md` and `ART` in data.js. Art is looked up by data id (`art/<folder>/<id>.webp`) for characters (portraits), dungeons (banners), dungeon results (win/fail art in the mission pop-up), lore, items and traits; missing files fall back to emoji placeholders. Set `ART.enabled = true` when files exist; run `artManifest()` in the console for the exact file list.

## Files
| File | Purpose |
|---|---|
| `index.html` | Page skeleton: one empty `<section>` per panel + script tags (order matters) |
| `style.css` | Look. Colour tokens at the top (`:root`) |
| `js/data.js` | **All content & balance**: classes, items, dungeons, lore, `CONFIG` |
| `js/storage.js` | **Only** file that saves/loads. Swap for Supabase here |
| `js/game.js` | Rules, button actions, rendering |

## Stats (what each one actually does)
Five stats, defined in `STATS` (data.js). Total = class base + growth*(level-1) + item bonuses (`statsOf`).
| Stat | Effect in this game |
|---|---|
| Might | Tested by rooms with `test: 'might'` (brutes, rockfalls, doors) |
| Agility | Tested by trap/stealth rooms. **+0.5% item drop chance per party point** (`lootPerAgility`) |
| Insight | Tested by puzzle/ward/hidden-danger rooms. **+1% XP per party point** (`xpPerInsight`) |
| Presence | Tested by fear/curse/holy rooms. **+1% gold per party point** (`goldPerPresence`) |
| Fortitude | **Party HP pool** = total fortitude x `hpPerFortitude`. Also tested by poison/heat rooms |

## How a run works (`runDungeon` + `resolveMission`, game.js)
1. Each dungeon has rooms (`DUNGEON_ROOMS`), each testing one stat.
2. Room pass chance = `T / (T + dungeon.difficulty * roomDiffScale)`, where `T` = party total of the tested stat + `otherStatWeight` (25%) of every other stat (`roomChance`).
3. **Every attempt at a room costs party HP, pass or fail**: `dungeon.damage` x 0.7-1.3. A pass clears the room; a fail means another attempt.
4. HP <= 0 before the last room is cleared = **run failed** (a pass on the final room at 0 HP still wins; a pass at 0 HP on an earlier room fails).
5. Win: gold (+presence), XP (+insight), loot rolls (+agility), lore on first clear. Fail: partial XP by rooms cleared, then loyalty loss (below).
6. Missions store a real end timestamp, so they finish even if the tab was closed.
`runDungeon` touches no game state, so the Dungeons panel reuses it to simulate `oddsSims` (300) runs and show "clear odds". 100% minus that = chance everyone loses loyalty.

## Hiring: pop-up, rolled stats and traits
- Clicking Hire in the tavern opens a pop-up with a rolled draft. Nothing is paid until **Hire for Xg**. There is deliberately no Cancel: Esc is blocked, and the draft is saved in `state.draft`, so refreshing resumes the same draft with the same re-rolls left (prevents free re-rolls). You can edit or re-roll the name, and **re-roll stats up to `CONFIG.statRerolls` (2) times**. The trait is fixed. The art area is a placeholder for portraits / paper-doll later (`renderDraft` in game.js).
- Base stats are rolled per class in `CLASSES[...].roll` ranges and stored on the adventurer (`a.base`); growth per level is fixed per class. The tavern only shows likely strengths (`tendencies`).
- **Traits** (`TRAITS`, data.js): one at hire (goons none); a new one offered every `traitEvery` (10) levels, choose 1 of 3 (roster card); some dungeons grant one. Traits are permanent. Rarity weights are in `CONFIG.rarityWeights`; **legendary never rolls**. Single-adventurer effects only; stronger rarities carry bigger drawbacks. Effect keys are documented above `TRAITS`; add new kinds in `statsOf` / `traitFx` / `traitSum`.
- **Dungeon trait rewards**: set `traitReward: 'trait_id'` on a dungeon. Every party member lacking it receives it on any clear. Only the Hollow Spire has one (The Hunger's Mark); all other dungeons are `null`.
- Roster size is capped (see "Roster cap" below). Release returns gear to inventory.
- Stat emoji, abbreviation, name and description live in `STATS`.

## Loyalty
- Loyalty is 0 to `CONFIG.maxLoyalty` (3), or the class's own `maxLoyalty`. **Every member of a failed run loses 1.** At 0 they leave permanently and their equipped gear is lost with them.
- Only failures lower it; only paying restores it. **Restore fee per point = the adventurer's hire cost** (`loyaltyFee`).
- **Goon**: free, weak, 1 loyalty max, no traits, nothing to restore. It is the anti-death-spiral safety net.
- Sending someone on 1 loyalty (if their max is higher) asks for confirmation.
- Traits can change max loyalty, restore fee, or give a chance to lose no loyalty on failure (`maxLoyaltyOf`, `loyaltyFee`, `loyaltySave` in resolveMission).

### Balance notes
Current tuning (`roomDiffScale` 0.6; dungeon `damage` 6 / 12 / 18 / 21), simulated with class-average hires, no gear: 2 level-1 adventurers clear the Cellar ~70%; 3 at L4 clear the Mine ~60%; 3 at L8 clear the Crypt ~60%; the Spire (~L12, no gear) ~27%. Tune `damage` per dungeon (HP drain per attempt), `difficulty`, `roomDiffScale` (how hard room checks are), `hpPerFortitude`. After any change, re-run a simulation: loop `runDungeon(members, dungeon, false)` a few thousand times. Key finding: HP (Fortitude) is the dominant stat, because retries multiply damage; trait/stat values were tuned against that.

## Battle reports (beat-by-beat)
`resolveMission` (game.js) walks a dungeon room by room. Rooms are listed in `DUNGEON_ROOMS`, flavour text in `BEAT_TEXT` (both data.js).
Each room is one roll (see "How a run works"); the hero with the best matching stat gets the spotlight.
Every beat is pushed into the `beats` array, saved in `state.reports`, and drawn by `renderReports()`.
To make beats richer, push more lines inside the `for (const room of rooms)` loop (damage numbers, per-class lines, item procs).

## Common edits (no code knowledge needed beyond copy/paste)
- **New dungeon**: copy a line in `DUNGEONS` (data.js), change `id`, name, numbers. Add a `LORE` entry with the same id as `lore`.
- **New item**: add to `ITEMS`, then reference its id in a dungeon's `loot`.
- **New class**: add to `CLASSES`; the tavern lists it automatically.
- **Balance**: numbers in data.js (`CONFIG`, class stats, dungeon difficulty); room formula in `roomChance` (game.js).
- **New room**: add `{ name, test }` to a dungeon's `DUNGEON_ROOMS`; `test` must be a `STATS` key.
- **New stat**: add to `STATS`, give every class base+grow values, and use it somewhere in `roomChance` / `resolveMission`.
- **Longer missions**: raise `duration` (seconds).
- **New panel**: add `<section id="x">` to index.html, write `renderX()` returning HTML, add one line in `render()`.
- **New button**: add `data-action="name"` to the HTML and a `name(el)` function in `ACTIONS`. `el.dataset.foo` reads `data-foo`.

## Moving to GitHub
```
git init && git add . && git commit -m "Guildhall PoC"
git branch -M main && git remote add origin <your repo url> && git push -u origin main
```
Free hosting: repo Settings → Pages → deploy from `main`. Never commit the Supabase **service_role** key; the **anon** key is safe in client code *only with Row Level Security on*.

## Adding Supabase (outline)
1. Create a project; table `saves`: `user_id uuid primary key references auth.users`, `state jsonb`, `updated_at timestamptz default now()`.
   Enable RLS with policy: `auth.uid() = user_id` for select/insert/update.
2. Add before your scripts in index.html: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
3. Rewrite `js/storage.js`:
```js
const sb = supabase.createClient('https://YOURPROJECT.supabase.co', 'YOUR_ANON_KEY');
const GameStorage = {
  async load() {
    const { data } = await sb.from('saves').select('state').maybeSingle();
    return data ? data.state : null;
  },
  async save(state) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('saves').upsert({ user_id: user.id, state, updated_at: new Date() });
  },
  clear() {},
};
```
4. `load()` becomes async, so in game.js change the first state line to `let state = newState();` and in BOOT do
   `GameStorage.load().then(s => { if (s) state = s; render(); });`. Add a login (`sb.auth.signInWithOtp({email})`) before loading.
5. **Cheating warning**: right now the client decides fight results, and a player can edit their save. For real play, move `resolveMission`, hiring and loot into Supabase Edge Functions / Postgres functions so the server owns gold, items and dice rolls. Keeping game rules in `data.js` and `resolveMission` makes that port straightforward.

## Ideas for next steps
Adventurer injuries/death, shop to sell items, more slots, class synergies in `winChance`, dungeon unlock requirements, multi-stage dungeons, tavern reroll, leaderboard (shared Supabase table).
