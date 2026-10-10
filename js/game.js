/* ===========================================================
   game.js  –  game rules + UI rendering.
   Sections: 1 State, 2 Rules, 3 Actions, 4 Rendering, 5 Boot.
   Flow: user clicks a [data-action] button -> handler in ACTIONS
   mutates `state` -> save() -> render().
   =========================================================== */

/* ---------- 1. STATE ----------
   state = {
     gold, nextId,
     roster:   [{ id, name, cls, level, xp, gear:{weapon,armor,trinket} }],  // gear holds item ids or null
     inventory:[itemId,...],           // unequipped items (duplicates allowed)
     progress: { dungeonId: winCount },
     lore:     [loreId,...],
     missions: [{ dungeonId, advIds:[...], endsAt:msTimestamp }],
     log:      [string,...],           // newest first
     seen:     { trait:{id:true}, item:{id:true} },   // Codex discoveries
     prefs:    { collapsed:{section:bool}, view:'tiles'|'list', sort:key, sortDesc:bool, cardOpen:{id:bool} },  // UI preferences (saved)
     draft:    the hire pop-up draft, or absent
   } */
/* Display text: T = words, S(key, vars) = sentences, both from TERMS in data.js. In a phrase {x} = vars.x or the term x; {X} = the term capitalised. */
const T = TERMS;
const Cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const S = (key, v = {}) => TERMS.phrases[key].replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : k in TERMS ? TERMS[k] : (k.charAt(0).toLowerCase() + k.slice(1)) in TERMS ? Cap(TERMS[k.charAt(0).toLowerCase() + k.slice(1)]) : m));
/* Content strings (trait/stat/class descriptions) may contain {term} / {statId} placeholders; fill them once at load so renaming a term or stat updates them everywhere. */
const fillTerms = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (k in TERMS ? TERMS[k] : k in STATS ? STATS[k].name : (k.charAt(0).toLowerCase() + k.slice(1)) in TERMS ? Cap(TERMS[k.charAt(0).toLowerCase() + k.slice(1)]) : m));
Object.values(TRAITS).forEach((t) => { t.desc = fillTerms(t.desc); }); Object.values(STATS).forEach((s) => { s.role = fillTerms(s.role); }); Object.values(CLASSES).forEach((c) => { c.blurb = fillTerms(c.blurb); });
/* Classes: CLASSES keys are internal ids; players see CLASSES[id].name. classOf() never crashes on a class that no longer exists (old saves). */
const clsName = (id) => (CLASSES[id] && CLASSES[id].name) || Cap(id);
const classOf = (a) => CLASSES[a.cls] || CLASSES[Object.keys(CLASSES)[0]];
const variantsOf = (id) => (CLASSES[id] && CLASSES[id].portraits) || ART.portraitVariants;
const faceId = (id, n) => (variantsOf(id) > 1 ? `${id}_${n}` : id);
function newState() {
  return { gold: CONFIG.startGold, nextId: 1, roster: [], inventory: [], progress: {}, lore: [], missions: [], reports: [], log: [S('welcome')], seen: { trait: {}, item: {} }, prefs: { collapsed: {}, view: 'tiles', sort: 'hired', sortDesc: false, cardOpen: {} } };
}
let state = GameStorage.load() || newState();
if (!state.reports) state.reports = [];   // older saves made before reports existed
const ui = { party: [], tab: 'guild', detail: null, tavernOpen: false };   // UI-only (not saved): party = ticked adventurer ids, tab = current view   // UI-only: adventurer ids ticked for the next mission (not saved)

/* ---------- 2. RULES (pure-ish helpers) ---------- */
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const byId = (id) => state.roster.find((a) => a.id === id);
const isBusy = (id) => state.missions.some((m) => m.advIds.includes(id));

/** Base stats: rolled at hire and stored on the adventurer (a.base). Older saves fall back to the class midpoint. */
const baseOf = (a) => a.base || Object.fromEntries(Object.keys(STATS).map((k) => [k, Math.round((classOf(a).roll[k][0] + classOf(a).roll[k][1]) / 2)]));
/* Roster cap: start + per different dungeon cleared + per N total clears, up to a max (all numbers in CONFIG). */
const totalWins = () => Object.values(state.progress).reduce((t, n) => t + n, 0);
const totalLevels = () => state.roster.reduce((t, a) => t + a.level, 0);
const boughtSlots = () => Math.min(state.bought || 0, CONFIG.rosterSlotCosts.length);
/* Roster cap = start + BOUGHT slots (rosterSlotCosts) + optional free sources (per new dungeon / per N clears / per N total levels; 0 = off), up to rosterCapMax. */
const rosterCap = () => Math.min(CONFIG.rosterCapMax, CONFIG.rosterCapStart + boughtSlots()
  + Object.values(state.progress).filter((n) => n > 0).length * CONFIG.rosterCapPerNewDungeon
  + (CONFIG.rosterCapWinsPerSlot ? Math.floor(totalWins() / CONFIG.rosterCapWinsPerSlot) : 0)
  + (CONFIG.rosterCapLevelsPerSlot ? Math.floor(totalLevels() / CONFIG.rosterCapLevelsPerSlot) : 0));
const nextSlotCost = () => (rosterCap() < CONFIG.rosterCapMax && boughtSlots() < CONFIG.rosterSlotCosts.length ? CONFIG.rosterSlotCosts[boughtSlots()] : null);
function capHint() {   // text about the FREE slot sources that are switched on
  if (rosterCap() >= CONFIG.rosterCapMax) return S('capMax');
  const out = [];
  if (CONFIG.rosterCapPerNewDungeon) out.push(S('capNewDungeon', { n: CONFIG.rosterCapPerNewDungeon }));
  if (CONFIG.rosterCapWinsPerSlot) out.push(S('capWins', { n: CONFIG.rosterCapWinsPerSlot - (totalWins() % CONFIG.rosterCapWinsPerSlot) }));
  if (CONFIG.rosterCapLevelsPerSlot) out.push(S('capLevels', { n: CONFIG.rosterCapLevelsPerSlot - (totalLevels() % CONFIG.rosterCapLevelsPerSlot) }));
  return out.join(' ');
}
/* Class availability: unlock rules (like dungeons) AND an optional weekday / date-window schedule. serverNow() is the single clock to replace with the server's. */
const serverNow = () => new Date(Date.now() + CONFIG.clockOffsetHours * 3600000);
function scheduleOk(s) {
  if (!s) return true;
  const now = serverNow(), day = CONFIG.scheduleUtc ? now.getUTCDay() : now.getDay(), iso = now.toISOString().slice(0, 10);
  return (!s.days || s.days.includes(day)) && (!s.from || iso >= s.from) && (!s.until || iso <= s.until);
}
const classAvailable = (id) => !!CLASSES[id] && meetsUnlock(CLASSES[id].unlock) && scheduleOk(CLASSES[id].schedule);
function classLockText(id) {
  const c = CLASSES[id], out = [];
  if (!meetsUnlock(c.unlock)) out.push(unlockTextOf(c.unlock));
  if (!scheduleOk(c.schedule)) out.push(c.schedule.days ? S('classDays', { days: c.schedule.days.map((i) => T.days[i]).join(', ') }) : S('classEvent'));
  return out.join(' · ');
}
/** Lore / unlock rules (see data.js DUNGEONS comment). `run` = the runDungeon result (for flawless). */
function ruleMet(rule, d, members, run) {
  const wins = state.progress[d.id] || 0, q = rule.requires || {};
  if (wins < (rule.clears || 1)) return false;   // any run from the Nth clear on (never one-shot)
  if (q.class && !members.some((a) => a.cls === q.class)) return false;
  if (q.item && !members.some((a) => Object.values(a.gear).includes(q.item))) return false;
  if (q.trait && !members.some((a) => (a.traits || []).includes(q.trait))) return false;
  if (q.solo && members.length !== 1) return false;
  if (q.flawless && !run.flawless) return false;
  if (q.minLevel && !members.some((a) => a.level >= q.minLevel)) return false;
  return true;
}
const meetsUnlock = (u) => !u || ((u.lore || []).every((id) => state.lore.includes(id)) && Object.entries(u.clears || {}).every(([id, n]) => (state.progress[id] || 0) >= n));   // shared by dungeons and classes
const isUnlocked = (d) => meetsUnlock(d.unlock);
const unlockTextOf = (u) => [...(u.lore || []).map((id) => S('unlockLore', { title: LORE[id].secret ? S('unseen') : LORE[id].title })), ...Object.entries(u.clears || {}).map(([id, n]) => S('unlockClears', { name: DUNGEONS.find((x) => x.id === id).name, n }))].join(' · ');
const unlockText = (d) => unlockTextOf(d.unlock);
function requireText(q = {}) {
  const out = [];
  if (q.class) out.push(S('reqClass', { class: clsName(q.class) })); if (q.item) out.push(S('reqItem', { name: ITEMS[q.item].name })); if (q.trait) out.push(S('reqTrait', { name: TRAITS[q.trait].name }));
  if (q.solo) out.push(S('reqSolo')); if (q.flawless) out.push(S('reqFlawless')); if (q.minLevel) out.push(S('reqLevel', { n: q.minLevel }));
  return out.join(', ');
}
/* Codex discoveries: kind = 'trait' | 'item'. Returns true the first time an id is seen (so callers can announce it). */
function markSeen(kind, id) { const s = (state.seen ||= { trait: {}, item: {} })[kind]; if (s[id]) return false; s[id] = true; return true; }
/** Total stats = rolled base + class growth*(level-1) + item bonuses + trait bonuses (never below 0). */
function statsOf(a) {
  const s = {}, c = classOf(a), b = baseOf(a);
  for (const k in STATS) s[k] = b[k] + c.grow[k] * (a.level - 1);
  for (const slot in a.gear) if (a.gear[slot]) for (const k in ITEMS[a.gear[slot]].bonus) s[k] += ITEMS[a.gear[slot]].bonus[k];
  for (const t of a.traits || []) for (const k in TRAITS[t].effect.bonus || {}) s[k] += TRAITS[t].effect.bonus[k];
  if (a.loyalty <= 1 && maxLoyaltyOf(a) > 1) for (const t of a.traits || []) for (const k in TRAITS[t].effect.lowBonus || {}) s[k] += TRAITS[t].effect.lowBonus[k];
  for (const k in s) s[k] = Math.max(0, s[k]);
  return s;
}
/** Sum of one trait effect key (hp, gold, xp, loot) over a party. */
const traitSum = (ids, key) => ids.reduce((t, id) => t + (byId(id).traits || []).reduce((u, tr) => u + (TRAITS[tr].effect[key] || 0), 0), 0);
/** Roll a hire's base stats from the class ranges, and its traits. */
const rollBase = (cls) => Object.fromEntries(Object.keys(STATS).map((k) => [k, rand(...CLASSES[cls].roll[k])]));
/** Weighted-by-rarity trait roll. Legendary (no weight) never rolls. */
function rollTrait(exclude = [], cls = null) {
  const w = (id) => (CONFIG.rarityWeights[TRAITS[id].rarity] || 0) * ((cls && CLASSES[cls] && CLASSES[cls].traitBias && CLASSES[cls].traitBias[id]) || 1);
  const pool = Object.keys(TRAITS).filter((t) => !exclude.includes(t) && w(t));
  let r = Math.random() * pool.reduce((t, id) => t + w(id), 0);
  for (const id of pool) { r -= w(id); if (r <= 0) return id; }
  return pool[pool.length - 1];
}
const rollTraits = (cls) => (CLASSES[cls].maxTraits >= 1 ? [rollTrait([], cls)] : []);
/** 3 distinct trait options offered at a milestone level. */
function offerTraits(a) { const out = []; while (out.length < 3) out.push(rollTrait([...(a.traits || []), ...out], a.cls)); out.forEach((t) => markSeen('trait', t)); return out; }
function addTrait(a, id) { (a.traits ||= []).push(id); markSeen('trait', id); a.loyalty = Math.min(a.loyalty, maxLoyaltyOf(a)); }
/** Party total of one stat. */
const partySum = (ids, stat) => ids.reduce((t, id) => t + statsOf(byId(id))[stat], 0);
/** Party HP pool = total fortitude * hpPerFortitude. */
const partyHp = (ids) => Math.round(partySum(ids, 'fortitude') * CONFIG.hpPerFortitude + traitSum(ids, 'hp'));
/** Rooms of a dungeon (fallback: one generic might room). */
const roomsOf = (d) => DUNGEON_ROOMS[d.id] || [{ name: 'the dungeon guardian', test: 'might' }];
/** Chance to pass ONE room: T/(T+roomDifficulty), where T = party's tested stat + a quarter of all the other stats. */
function roomChance(ids, d, room) {
  let T = 0;
  for (const k in STATS) T += partySum(ids, k) * (k === room.test ? 1 : CONFIG.otherStatWeight);
  const c = T / (T + d.difficulty * CONFIG.roomDiffScale);
  return Math.min(CONFIG.roomChanceMax, Math.max(CONFIG.roomChanceMin, c));
}
/** Expected HP a full clear costs. Every ATTEMPT costs damage, so a room costs dmg / passChance on average.
    With ids: uses that party's real pass chances. Without: assumes one attempt per room. */
const expectedDamage = (d, ids) => Math.round(roomsOf(d).reduce((t, r) => t + d.damage / (ids ? roomChance(ids, d, r) : 1), 0));

/* Loyalty helpers. Items/traits that change the max or the fee should hook in HERE (single place). */
const traitFx = (a, key) => (a.traits || []).reduce((t, id) => t + (TRAITS[id].effect[key] || 0), 0);
const maxLoyaltyOf = (a) => Math.max(1, (classOf(a).maxLoyalty ?? CONFIG.maxLoyalty) + traitFx(a, 'maxLoyalty'));
const loyaltyFee = (a) => Math.round(a.hireCost * Math.max(0, 1 + traitFx(a, 'feeMult')));   // base = hire cost per point

/** Simulates one dungeon run. Touches NO game state (safe to call many times for odds).
    Rules: each room repeats attempts until passed; EVERY attempt costs party HP (dungeon.damage x 0.7-1.3).
    Run fails if HP <= 0 before the last room is cleared (passing the final room at 0 HP still wins).
    wantBeats=true also returns the beat-by-beat text lines. */
function runDungeon(members, d, wantBeats) {
  const ids = members.map((a) => a.id), rooms = roomsOf(d), maxHp = partyHp(ids);
  let hp = maxHp, cleared = 0, exhausted = false, failedAttempts = 0, breathUsed = false;
  const beats = wantBeats ? [S('enter', { names: members.map((a) => a.name).join(', '), name: d.name, n: hp })] : null;
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i], boss = i === rooms.length - 1;
    const hero = members.reduce((best, a) => (statsOf(a)[room.test] > statsOf(best)[room.test] ? a : best));
    const lead = (k) => traitFx(hero, k);          // RULE traits: effects that apply only to rooms THIS adventurer leads
    const chance = Math.min(0.99, roomChance(ids, d, room) + lead('leadChance') + (boss ? lead('bossChance') : 0));
    let freeUsed = false;
    if (beats) beats.push(S('roomHeader', { i: i + 1, total: rooms.length, name: room.name, emoji: STATS[room.test].emoji, stat: STATS[room.test].name, pct: Math.round(chance * 100) }));
    for (let n = 1; ; n++) {                       // --- one iteration = one attempt ---
      const pass = Math.random() < chance, notes = [];
      let dmg = Math.max(1, Math.round(d.damage * (0.7 + Math.random() * 0.6) * Math.max(0.1, 1 - lead('leadDamage'))));
      if (!pass && lead('freeRetry') && !freeUsed) { freeUsed = true; dmg = 0; notes.push(S('secondWind', { name: hero.name })); }
      hp -= dmg;
      if (!pass) failedAttempts++;
      if (hp <= 0 && !breathUsed && members.some((a) => traitFx(a, 'lastBreath'))) { hp = 1; breathUsed = true; notes.push(S('lastBreath')); }
      if (pass && lead('leadHeal')) { hp = Math.min(maxHp, hp + lead('leadHeal')); notes.push(S('heal', { name: hero.name, n: lead('leadHeal') })); }
      if (beats) { beats.push(S('attempt', { n, hero: hero.name, action: pick(BEAT_TEXT.attack[room.test]), result: S(pass ? 'passed' : 'failedTry'), cur: Math.max(0, hp), max: maxHp })); notes.forEach((t) => beats.push(`<span class="dim">${t}</span>`)); }
      if (pass) { cleared++; if (hp <= 0 && cleared < rooms.length) exhausted = true; break; }
      if (hp <= 0) { exhausted = true; break; }
    }
    if (exhausted) break;
  }
  const win = cleared === rooms.length;
  return { win, cleared, total: rooms.length, flawless: win && failedAttempts === 0, beats };
}
/** Odds shown in the UI: % of simulated runs that clear. (Fail % = chance everyone loses 1 loyalty.) */
function clearOdds(ids, d) {
  const members = ids.map(byId); let w = 0;
  for (let i = 0; i < CONFIG.oddsSims; i++) if (runDungeon(members, d, false).win) w++;
  return Math.round((100 * w) / CONFIG.oddsSims);
}

/** Adds XP and handles (multiple) level-ups. Returns true if levelled. */
function giveXp(a, amount) {
  a.xp += amount; let up = false;
  while (a.xp >= CONFIG.xpToNext(a.level)) { a.xp -= CONFIG.xpToNext(a.level); a.level++; up = true; if (a.level % CONFIG.traitEvery === 0) (a.traitChoices ||= []).push(offerTraits(a)); }
  return up;
}
const addLog = (msg) => { state.log.unshift(msg); state.log.length = Math.min(state.log.length, 50); };

/* Called once when a mission's timer ends: runs the dungeon (runDungeon), then applies results to state.
   Win: gold (+presence), XP (+insight), loot (+agility), lore on first clear.
   Fail: partial XP, then EVERY party member loses 1 loyalty; at 0 they leave for good, taking their gear. */
function resolveMission(m) {
  const d = DUNGEONS.find((x) => x.id === m.dungeonId);
  const members = m.advIds.map(byId).filter(Boolean), ids = members.map((a) => a.id);
  const names = members.map((a) => a.name).join(', ');
  const r = runDungeon(members, d, true), beats = r.beats;
  const rep = { when: Date.now(), dungeon: d.name, dungeonId: d.id, win: r.win, beats, unread: true, lore: [], codex: [] };   // unread = shows in the result pop-up until dismissed
  state.reports.unshift(rep);
  state.reports.length = Math.min(state.reports.length, 10);
  if (!r.win) {
    const gain = Math.floor(d.xp * CONFIG.lossXpFraction * (1 + r.cleared) / r.total);
    members.forEach((a) => giveXp(a, gain));
    beats.push(S('runFailed', { n: r.cleared, total: r.total, gain }));
    const gone = [];
    members.forEach((a) => {
      if (Math.random() < traitFx(a, 'loyaltySave')) { beats.push(S('resolveHolds', { name: a.name })); return; }
      a.loyalty--;
      beats.push(a.loyalty > 0 ? S('loyaltyLoss', { name: a.name, cur: a.loyalty, max: maxLoyaltyOf(a) }) : S('departs', { name: a.name }));
      if (a.loyalty <= 0) gone.push(a);
    });
    state.roster = state.roster.filter((a) => !gone.includes(a));   // gear is NOT returned to the inventory
    addLog(S('logFail', { names, name: d.name, n: r.cleared, total: r.total }) + (gone.length ? S('logDeparted', { names: gone.map((a) => a.name).join(', ') }) : ''));
    return;
  }
  const amount = Math.round(rand(d.gold[0], d.gold[1]) * (1 + partySum(ids, 'presence') * CONFIG.goldPerPresence + traitSum(ids, 'gold') + (r.flawless ? traitSum(ids, 'flawlessGold') : 0)));
  const gain = Math.round(d.xp * (1 + partySum(ids, 'insight') * CONFIG.xpPerInsight + traitSum(ids, 'xp')));
  state.gold += amount;
  state.progress[d.id] = (state.progress[d.id] || 0) + 1;
  const levelled = members.filter((a) => giveXp(a, gain)).map((a) => a.name);
  const bonus = partySum(ids, 'agility') * CONFIG.lootPerAgility + traitSum(ids, 'loot');
  const found = d.loot.filter(([, ch]) => Math.random() < ch + bonus).map(([id]) => id);
  state.inventory.push(...found);
  found.forEach((i) => { if (markSeen('item', i)) rep.codex.push(ITEMS[i].name); });
  beats.push(S('cleared', { amount, gain }));
  if (found.length) beats.push(S('loot', { items: found.map((i) => ITEMS[i].name).join(', ') }));
  if (levelled.length) beats.push(S('levelUp', { names: levelled.join(', ') }));
  let msg = S('logClear', { names, name: d.name, amount });
  const before = DUNGEONS.filter(isUnlocked);
  for (const rule of d.loreRewards || []) {
    if (state.lore.includes(rule.id) || !ruleMet(rule, d, members, r)) continue;
    state.lore.push(rule.id); rep.lore.push(rule.id);
    msg += S('logLore', { title: LORE[rule.id].title }); beats.push(S('loreUnlocked', { title: LORE[rule.id].title }));
  }
  const opened = DUNGEONS.filter((x) => isUnlocked(x) && !before.includes(x));
  rep.unlocked = opened.map((x) => x.name);
  opened.forEach((x) => { msg += S('logRevealed', { name: x.name }); beats.push(S('revealed', { name: x.name })); });
  if (d.traitReward) for (const a of members) if (!(a.traits || []).includes(d.traitReward)) {
    if (markSeen('trait', d.traitReward)) rep.codex.push(TRAITS[d.traitReward].name);
    addTrait(a, d.traitReward); beats.push(S('gainsTrait', { name: a.name, tname: TRAITS[d.traitReward].name })); msg += S('logTrait', { name: a.name, tname: TRAITS[d.traitReward].name });
  }
  addLog(msg);
}

/* ---------- 3. ACTIONS (button handlers) ---------- */
const ACTIONS = {
  hire(el) {   // opens the hire pop-up with a rolled draft; nothing is paid until confirmHire
    const cls = el.dataset.cls, c = CLASSES[cls];
    if (state.draft) { showDlg($('draft')); return; }   // a draft already exists: reopen it, never re-roll
    if (state.gold < c.cost || state.roster.length >= rosterCap() || !classAvailable(cls)) return;
    const traits = rollTraits(cls); traits.forEach((t) => markSeen('trait', t));   // shown in the pop-up = discovered
    ui.tavernOpen = false;
    state.draft = { cls, name: pick(NAMES), base: rollBase(cls), traits, portrait: faceId(cls, rand(1, variantsOf(cls))), rerolls: CONFIG.statRerolls };
    showDlg($('draft'));
  },
  rerollStats() { const dr = state.draft; if (dr && dr.rerolls > 0) { dr.base = rollBase(dr.cls); dr.rerolls--; } },   // trait is NOT rerolled
  rerollName() { if (state.draft) state.draft.name = pick(NAMES); },
  confirmHire() {
    const dr = state.draft; if (!dr) return;
    const c = CLASSES[dr.cls];
    if (state.gold < c.cost || state.roster.length >= rosterCap()) return;
    state.gold -= c.cost;
    const a = { id: state.nextId++, name: cleanName(dr.name) || pick(NAMES), cls: dr.cls, portrait: dr.portrait, level: 1, xp: 0, base: dr.base, traits: dr.traits,
                loyalty: c.maxLoyalty ?? CONFIG.maxLoyalty, hireCost: c.cost, gear: { weapon: null, armor: null, trinket: null } };
    a.loyalty = Math.min(a.loyalty, maxLoyaltyOf(a));
    state.roster.push(a);
    addLog(S('logHired', { name: a.name, cls: clsName(a.cls), stats: statLine(statsOf(a)), traits: a.traits.length ? ' · ' + a.traits.map((t) => TRAITS[t].name).join(', ') : '' }));
    state.draft = null; $('draft').close?.();
  },
  pickTrait(el) {   // choose from a milestone offer; traits are permanent
    const a = byId(+el.dataset.id);
    if (!a || !a.traitChoices || !a.traitChoices[0] || !a.traitChoices[0].includes(el.dataset.trait)) return;
    addTrait(a, el.dataset.trait); a.traitChoices.shift();
    addLog(S('logPicked', { name: a.name, tname: TRAITS[el.dataset.trait].name }));
  },
  release(el) {   // dismiss an adventurer; equipped gear returns to the inventory
    const a = byId(+el.dataset.id);
    if (!a || isBusy(a.id) || !confirm(S('confirmRelease', { name: a.name }))) return;
    Object.values(a.gear).filter(Boolean).forEach((i) => state.inventory.push(i));
    state.roster = state.roster.filter((x) => x !== a); ui.party = ui.party.filter((i) => i !== a.id);
  },
  buySlot() {   // buy the next roster slot (price list: CONFIG.rosterSlotCosts)
    const cost = nextSlotCost(); if (cost === null || state.gold < cost) return;
    state.gold -= cost; state.bought = (state.bought || 0) + 1; addLog(S('logSlot', { cost, cap: rosterCap() }));
  },
  lastParty() { ui.party = (state.lastParty || []).filter((i) => byId(i) && !isBusy(i)).slice(0, CONFIG.maxParty); },   // re-select the previous party
  cycleFace(el) {   // cosmetic: next/previous portrait variant in the hire pop-up (not a stat re-roll)
    const dr = state.draft, n = variantsOf(dr.cls); if (!dr || n < 2) return;
    const cur = +String(dr.portrait).split('_')[1] || 1;
    dr.portrait = faceId(dr.cls, ((cur - 1 + +el.dataset.dir + n) % n) + 1);
  },
  toggleSection(el) { const c = prefs().collapsed; c[el.dataset.sec] = !c[el.dataset.sec]; },   // collapse/expand a panel
  toggleView() { const p = prefs(); p.view = p.view === 'list' ? 'tiles' : 'list'; },                     // roster: tile grid <-> detailed list
  setSort(el) { const p = prefs(); p.sort = el.value; p.sortDesc = !['hired', 'name', 'class', 'status'].includes(el.value); },   // numbers high-first, text A-Z
  toggleSortDir() { const p = prefs(); p.sortDesc = !p.sortDesc; },
  openDetail(el) { ui.detail = +el.dataset.id; },
  closeDetail() { ui.detail = null; $('detail').close?.(); },
  openTavern() { ui.tavernOpen = true; },
  closeTavern() { ui.tavernOpen = false; $('tavernDlg').close?.(); },
  toggleCard(el) { const p = prefs(), id = +el.dataset.id; p.cardOpen[id] = !(p.cardOpen[id] ?? true); },   // one card
  tab(el) { ui.tab = el.dataset.tab; window.scrollTo?.(0, 0); },   // switch view (tab bar)
  dismissResult() { const r = state.reports.filter((x) => x.unread).pop(); if (r) r.unread = false; },   // next unread report (if any) shows on re-render
  help() { showDlg($('help')); },
  toggleParty(el) {
    const id = +el.dataset.id;
    ui.party = ui.party.includes(id) ? ui.party.filter((x) => x !== id) : ui.party.length < CONFIG.maxParty ? [...ui.party, id] : ui.party;
  },
  send(el) {
    const d = DUNGEONS.find((x) => x.id === el.dataset.id);
    if (!isUnlocked(d)) return;
    const ids = ui.party.filter((i) => byId(i) && !isBusy(i));
    if (!ids.length) return;
    const risky = ids.map(byId).filter((a) => a.loyalty <= 1 && maxLoyaltyOf(a) > 1);
    if (risky.length && !confirm(S('confirmRisk', { names: risky.map((a) => a.name).join(', ') }))) return;
    state.missions.push({ dungeonId: d.id, advIds: ids, endsAt: Date.now() + d.duration * 1000 });
    state.lastParty = ids.slice();   // for the "last party" button
    ui.party = [];
  },
  equip(el) {            // item picked from a <select> in the roster
    const a = byId(+el.dataset.id), itemId = el.value;
    if (!itemId || isBusy(a.id)) return;
    const slot = ITEMS[itemId].slot;
    if (a.gear[slot]) state.inventory.push(a.gear[slot]);          // return old item to bag
    state.inventory.splice(state.inventory.indexOf(itemId), 1);    // remove one copy from bag
    a.gear[slot] = itemId;
  },
  unequip(el) {
    const a = byId(+el.dataset.id), slot = el.dataset.slot;
    if (isBusy(a.id) || !a.gear[slot]) return;
    state.inventory.push(a.gear[slot]); a.gear[slot] = null;
  },
  restoreLoyalty(el) {   // pay the fee: +1 loyalty, up to the max
    const a = byId(+el.dataset.id), fee = loyaltyFee(a);
    if (!a || isBusy(a.id) || a.loyalty >= maxLoyaltyOf(a) || state.gold < fee) return;
    state.gold -= fee; a.loyalty++;
    addLog(S('logRestored', { name: a.name, cur: a.loyalty, max: maxLoyaltyOf(a), fee }));
  },
  reset() { if (confirm(S('confirmReset'))) { GameStorage.clear(); state = newState(); ui.party = []; } },
};
// One click listener for the whole page; also handles <select> changes.
function handle(e) {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled || (e.type === 'change') !== (el.tagName === 'SELECT')) return;   // <select> acts on change, everything else on click
  ACTIONS[el.dataset.action](el);
  GameStorage.save(state); render();
}
document.addEventListener('click', handle);
document.addEventListener('change', handle);
// Name box in the hire pop-up: update the draft on every keystroke WITHOUT re-rendering (re-rendering would eat clicks).
const cleanName = (s) => String(s).replace(/[<>&"']/g, '').trim().slice(0, 20);
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.draft === 'name' && state.draft) state.draft.name = cleanName(e.target.value); });

/* ---------- 4. RENDERING (each panel = one function returning HTML) ---------- */
const $ = (id) => document.getElementById(id);
/* Open a pop-up scrolled to the TOP (browsers otherwise focus the last button and jump to the bottom on phones). */
const showDlg = (d) => { if (d.open) return; d.showModal?.(); d.scrollTop = 0; globalThis.requestAnimationFrame?.(() => { d.scrollTop = 0; }); };
/* Theme: CONFIG.theme = 'dark' | 'light' | 'auto' (follow the device). There is no in-game toggle for now. */
function applyTheme() {
  const t = CONFIG.theme === 'auto' ? (globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : CONFIG.theme;
  if (document.documentElement) document.documentElement.dataset.theme = t;
}

const fmt = (b) => Object.entries(b).map(([k, v]) => `+${v} ${STATS[k].emoji}${STATS[k].abbr}`).join(' ');
const statLine = (s) => Object.keys(STATS).map((k) => `${STATS[k].emoji}${STATS[k].abbr} ${s[k]}`).join(' · ');
const advHp = (a) => Math.round(statsOf(a).fortitude * CONFIG.hpPerFortitude + traitFx(a, 'hp'));   // HP this adventurer adds to the party pool
const pips = (n, max) => Array.from({ length: max }, (_, i) => `<span class="pip ${i < n ? 'on' : ''}"></span>`).join('');

/* ----- UI preferences (saved): collapsed panels, compact roster ----- */
const prefs = () => (state.prefs ||= { collapsed: {}, cardOpen: {} });
const isCollapsed = (sec) => !!prefs().collapsed[sec];
/* Panel heading with a collapse button. sec = key in prefs().collapsed; extra = buttons placed on the right. */
const head = (sec, title, extra = '') => `<h2 class="hd"><button class="linkbtn" data-action="toggleSection" data-sec="${sec}" aria-expanded="${!isCollapsed(sec)}" title="${isCollapsed(sec) ? S('expand') : S('collapse')}">${isCollapsed(sec) ? '▸' : '▾'} ${title}</button>${isCollapsed(sec) ? '' : extra}</h2>`;

/* ----- ART HOOKS (see ART in data.js). artLayer returns an <img> that overlays its placeholder and removes itself if the file is missing. ----- */
const artPath = (kind, id) => `${ART.base}${ART.paths[kind].replace('{id}', id)}.${ART.ext}`;
const artLayer = (kind, id) => (ART.enabled ? `<img class="artimg" src="${artPath(kind, id)}" alt="" loading="lazy" onerror="this.remove()">` : '');
const icon = (kind, id, fallback, size = '') => `<span class="icon ${size}" aria-hidden="true">${fallback}${artLayer(kind, id)}</span>`;
/** Portrait: the ONLY place characters are drawn. Later: paper-doll layers (body + armor + weapon + trinket) would be stacked here. */
const portraitHtml = (a, size = '') => `<div class="portrait ${size}" aria-hidden="true"><span>${classOf(a).emoji}</span>${artLayer('portrait', a.portrait || a.cls)}</div>`;
/** Console helper: every art file the current data expects (so you know what to draw/export). */
function artManifest() {
  const out = [];
  for (const c in CLASSES) for (let n = 1; n <= variantsOf(c); n++) out.push(artPath('portrait', faceId(c, n)));
  DUNGEONS.forEach((d) => out.push(artPath('dungeon', d.id), artPath('result', d.id + '_win'), artPath('result', d.id + '_fail')));
  Object.keys(LORE).forEach((i) => out.push(artPath('lore', i))); Object.keys(ITEMS).forEach((i) => out.push(artPath('item', i))); Object.keys(TRAITS).forEach((i) => out.push(artPath('trait', i)));
  return out;
}

/** Tavern hint: the 2 stats a class rolls highest on average, and its weakest. */
function tendencies(c) {
  const avg = Object.keys(STATS).map((k) => [k, (c.roll[k][0] + c.roll[k][1]) / 2]).sort((x, y) => y[1] - x[1]);
  const tag = (k) => `${STATS[k].emoji}${STATS[k].abbr}`;
  return S('tendencies', { strong: avg.slice(0, 2).map((x) => tag(x[0])).join(' '), weak: tag(avg[avg.length - 1][0]) });
}
/* Hiring pop-up (opened from the Roster): class cards, slot purchase. Choosing a class opens the hire-draft pop-up. */
function tavernHtml() {
  const full = state.roster.length >= rosterCap(), cost = nextSlotCost();
  const buy = cost === null ? '' : ` <button class="ghost sm" data-action="buySlot" ${state.gold < cost ? 'disabled' : ''}>${S('buySlot', { cost })}</button>`;
  return `<h2 tabindex="-1" autofocus>${Cap(T.tavern)}</h2><p class="dim">${S('tavernSub', { n: state.roster.length, cap: rosterCap(), hint: capHint() })}${buy}</p><div class="cards">` + Object.entries(CLASSES).filter(([k, c]) => classAvailable(k) || !c.hidden).map(([k, c]) => {
    const ok = classAvailable(k);
    return `<article class="card ${ok ? '' : 'away'}"><div class="card-top">${portraitHtml({ cls: k, portrait: faceId(k, 1) })}<div class="who"><div class="name">${clsName(k)}</div>
      <div class="dim">${ok ? (c.hideTendencies ? '' : tendencies(c)) : '🔒 ' + classLockText(k)}</div><div class="dim">${c.blurb} ${S('tavernLoyalty', { n: c.maxLoyalty ?? CONFIG.maxLoyalty })}</div></div></div>
      ${ok ? `<button data-action="hire" data-cls="${k}" ${state.gold < c.cost || full ? 'disabled' : ''}>${full ? S('rosterFull') : c.cost ? S('hireBtn', { cost: c.cost }) : S('hireFree')}</button>` : ''}</article>`;
  }).join('') + `</div><p><button class="ghost" data-action="closeTavern">${Cap(T.close)}</button></p>`;
}
function renderTavernDlg() {
  const dlg = $('tavernDlg');
  if (!ui.tavernOpen || state.draft) { $('tavernBody').innerHTML = ''; if (dlg.open) dlg.close?.(); return; }   // the hire-draft pop-up takes over
  $('tavernBody').innerHTML = tavernHtml(); showDlg(dlg);
}
const traitChoiceHtml = (a) => (a.traitChoices && a.traitChoices[0])
  ? `<div><b class="win">${S('newTrait')}</b> ${a.traitChoices[0].map((t) => `<button class="sm r-${TRAITS[t].rarity}" data-action="pickTrait" data-id="${a.id}" data-trait="${t}" title="${TRAITS[t].desc}">${TRAITS[t].name}</button>`).join(' ')}</div>` : '';

/* One roster card. Detailed = stats grid, loyalty, equipment. Compact = one streamlined row. Open/closed: prefs().cardOpen[id] overrides the global compact switch. */
function rosterCard(a, inDialog = false) {
  const s = statsOf(a), b = baseOf(a), c = classOf(a), busy = isBusy(a.id), need = CONFIG.xpToNext(a.level), p = prefs();
  const max = maxLoyaltyOf(a), fee = loyaltyFee(a), hp = advHp(a);
  const open = inDialog || (p.cardOpen[a.id] ?? true), risk = a.loyalty <= 1 && max > 1, picked = ui.party.includes(a.id);
  const tag = busy ? `<span class="tag">${S('away')}</span>` : '';
  const tog = inDialog ? '' : `<button class="ghost sm tog" data-action="toggleCard" data-id="${a.id}" aria-expanded="${open}" title="${open ? S('collapse') : S('expand')}">${open ? '▾' : '▸'}</button>`;
  const pick = `<label class="pick"><input type="checkbox" data-action="toggleParty" data-id="${a.id}" ${picked ? 'checked' : ''} ${busy ? 'disabled' : ''}>${Cap(T.party)}</label>`;
  const traitNames = (a.traits || []).map((t) => `<span class="chip r-${TRAITS[t].rarity}" title="${TRAITS[t].desc}">${TRAITS[t].name}</span>`).join('') || `<span class="dim">${S('noTraits')}</span>`;
  if (!open) return `<article class="card compact ${busy ? 'away' : ''} ${picked ? 'picked' : ''}"><div class="card-top">${portraitHtml(a, 'sm')}<div class="who">
      <div class="name">${a.name} ${tag}</div><div class="dim">${clsName(a.cls)} · ${S('level', { n: a.level })} · ❤️ ${hp} · <span class="${risk ? 'warnpips' : ''}">${pips(a.loyalty, max)}</span> · ${traitNames}</div></div>${tog}${pick}</div>${traitChoiceHtml(a)}</article>`;
  const stats = Object.keys(STATS).map((k) => { const diff = s[k] - (b[k] + c.grow[k] * (a.level - 1));
    return `<div class="stat" title="${STATS[k].name}: ${STATS[k].role}"><div class="sh">${STATS[k].emoji} ${STATS[k].abbr}</div>
      <div class="sv">${s[k]}${diff ? `<small class="${diff > 0 ? 'win' : 'lose'}">${diff > 0 ? '+' : ''}${diff}</small>` : ''}</div>
      <div class="sbar"><i style="width:${Math.min(100, (s[k] / CONFIG.statBarMax) * 100)}%"></i></div></div>`; }).join('');
  const slots = Object.keys(SLOTS).map((slot) => {
    const cur = a.gear[slot], opts = [...new Set(state.inventory.filter((i) => ITEMS[i].slot === slot))];
    return `<div class="slot"><span class="dim">${SLOTS[slot].emoji} ${SLOTS[slot].name}</span>
      ${cur ? `<span class="itemline">${icon('item', cur, SLOTS[slot].emoji, 'sm')}<b>${ITEMS[cur].name}</b></span><span class="dim">${fmt(ITEMS[cur].bonus)}</span><button class="ghost sm" data-action="unequip" data-id="${a.id}" data-slot="${slot}" ${busy ? 'disabled' : ''}>${S('remove')}</button>` : `<span class="dim">${S('empty')}</span>`}
      ${opts.length && !busy ? `<select data-action="equip" data-id="${a.id}" aria-label="${SLOTS[slot].name}"><option value="">${S('equipOpt')}</option>${opts.map((i) => `<option value="${i}">${ITEMS[i].name}</option>`).join('')}</select>` : ''}</div>`;
  }).join('');
  return `<article class="card ${busy ? 'away' : ''} ${picked ? 'picked' : ''}">
    <div class="card-top">${portraitHtml(a)}<div class="who"><div class="name">${a.name} ${tag}</div>
      <div class="dim">${clsName(a.cls)} · ${S('level', { n: a.level })} · ${S('addsHp', { n: hp })}</div>
      <div class="bar" title="${T.xp} ${a.xp}/${need}"><i style="width:${(a.xp / need) * 100}%"></i></div></div>${tog}${pick}</div>
    <div class="traits">${traitNames}${traitChoiceHtml(a)}</div>
    <div class="stats">${stats}</div>
    <div class="loyalty ${risk ? 'warnpips' : ''}"><span class="dim">${Cap(T.loyalty)}</span> <span>${pips(a.loyalty, max)}</span>${risk ? `<span class="lose">${S('atRisk')}</span>` : ''}
      ${a.loyalty < max ? `<button class="ghost sm" data-action="restoreLoyalty" data-id="${a.id}" ${busy || state.gold < fee ? 'disabled' : ''}>${Cap(T.restore)} ${fee}${T.goldIcon}</button>` : ''}</div>
    <div class="slots">${slots}</div>
    <div class="card-foot"><button class="ghost sm" data-action="release" data-id="${a.id}" ${busy ? 'disabled' : ''}>${Cap(T.release)}</button></div></article>`;
}
/* Sorted copy of the roster per prefs (sort key + direction). Keys: hired, level, class, name, loyalty, hp, status, or any STATS id. */
function sortedRoster() {
  const p = prefs(), key = p.sort || 'hired', dir = p.sortDesc ? -1 : 1;
  const val = (a) => (key === 'level' ? a.level : key === 'class' ? clsName(a.cls) : key === 'name' ? a.name : key === 'loyalty' ? a.loyalty : key === 'hp' ? advHp(a) : key === 'status' ? (isBusy(a.id) ? 1 : 0) : key in STATS ? statsOf(a)[key] : a.id);
  return [...state.roster].sort((x, y) => { const vx = val(x), vy = val(y); return ((typeof vx === 'string' ? vx.localeCompare(vy) : vx - vy) || x.id - y.id) * dir; });
}
/* Square tile: tap = add/remove from the party; the (i) button opens the details pop-up. */
function rosterTile(a) {
  const busy = isBusy(a.id), picked = ui.party.includes(a.id), max = maxLoyaltyOf(a), risk = a.loyalty <= 1 && max > 1;
  return `<div class="tile ${picked ? 'picked' : ''} ${busy ? 'away' : ''}">
    <button class="tilebtn" data-action="toggleParty" data-id="${a.id}" ${busy ? 'disabled' : ''} aria-pressed="${picked}" aria-label="${a.name}">
      <div class="portrait fill" aria-hidden="true"><span>${classOf(a).emoji}</span>${artLayer('portrait', a.portrait || a.cls)}</div>
      ${picked ? '<span class="check">✓</span>' : ''}${busy ? `<span class="tag away-tag">${S('away')}</span>` : ''}${a.traitChoices && a.traitChoices[0] ? '<span class="newdot">!</span>' : ''}
      <span class="tinfo"><b>${a.name}</b><span>${S('level', { n: a.level })} · ${clsName(a.cls)}</span><span class="${risk ? 'warnpips' : ''}">${pips(a.loyalty, max)}</span></span></button>
    <button class="ghost sm info" data-action="openDetail" data-id="${a.id}" aria-label="${S('details')}" title="${S('details')}">ⓘ</button></div>`;
}
function renderRoster() {
  const n = state.roster.length, p = prefs(), cap = rosterCap(), title = `${Cap(T.roster)} (${n}/${cap})`;
  if (isCollapsed('roster')) return head('roster', title);
  const sortOpts = [['hired', S('sortHired')], ['level', S('sortLevel')], ['class', S('sortClass')], ['name', S('sortName')], ['loyalty', S('sortLoyalty')], ['hp', S('sortHp')], ['status', S('sortStatus')], ...Object.keys(STATS).map((k) => [k, `${STATS[k].emoji} ${STATS[k].name}`])]
    .map(([k, label]) => `<option value="${k}" ${(p.sort || 'hired') === k ? 'selected' : ''}>${label}</option>`).join('');
  const tools = `<div class="rostertools"><button class="sm" data-action="openTavern">＋ ${S('hireTile')}</button>
    ${n > 1 ? `<label class="sortlbl"><span class="dim">${S('sortLabel')}</span><select data-action="setSort" aria-label="${S('sortLabel')}">${sortOpts}</select></label>
    <button class="ghost sm" data-action="toggleSortDir" title="${S(p.sortDesc ? 'dirDesc' : 'dirAsc')}" aria-label="${S(p.sortDesc ? 'dirDesc' : 'dirAsc')}">${p.sortDesc ? '↓' : '↑'}</button>
    <button class="ghost sm" data-action="toggleView">${p.view === 'list' ? S('viewTiles') : S('viewList')}</button>` : ''}</div>`;
  if (!n) return head('roster', title) + tools + `<p class="dim">${S('rosterEmpty')}</p>`;
  const sel = ui.party.filter(byId);
  const bar = sel.length ? S('partySel', { n: sel.length, max: CONFIG.maxParty, hpv: partyHp(sel) }) : S('partyHint');
  const list = sortedRoster();
  const body = p.view === 'list' ? `<div class="cards">${list.map((a) => rosterCard(a)).join('')}</div>`
    : `<div class="tiles">${list.map(rosterTile).join('')}${n < cap ? `<button class="tile addtile" data-action="openTavern" aria-label="${S('hireTile')}">＋<span>${S('hireTile')}</span></button>` : ''}</div>`;
  return head('roster', title) + tools + `<p class="partybar">${bar}</p>` + body;
}
function renderDetail() {
  const a = ui.detail && byId(ui.detail), dlg = $('detail');
  if (!a) { ui.detail = null; $('detailBody').innerHTML = ''; if (dlg.open) dlg.close?.(); return; }
  $('detailBody').innerHTML = rosterCard(a, true) + `<p><button class="ghost" data-action="closeDetail">${Cap(T.close)}</button></p>`;
  showDlg(dlg);
}
function renderDungeons() {
  const ids = ui.party.filter(byId);
  const info = ids.length ? S('dungeonsParty', { n: ids.length, hpv: partyHp(ids) }) : S('dungeonsTick');
  const lp = (state.lastParty || []).filter((i) => byId(i) && !isBusy(i));
  const lpBtn = `<button class="ghost sm" data-action="lastParty" ${lp.length ? '' : 'disabled'}>${Cap(T.lastParty)}</button>`;
  return `<h2>${Cap(T.dungeons)}</h2><p class="dim">${info} ${lpBtn}</p>` + DUNGEONS.filter((d) => isUnlocked(d) || !d.hidden).map((d) => {
    if (!isUnlocked(d)) return `<div class="dcard locked"><div class="banner">🔒</div><div><b>${d.name}</b><div class="dim">${unlockText(d)}</div></div></div>`;
    const rooms = roomsOf(d), odds = ids.length ? clearOdds(ids, d) : null;
    return `<div class="dcard"><div class="banner">${d.emoji || '🗺️'}${artLayer('dungeon', d.id)}</div><div><b>${d.name}</b> ${d.traitReward ? `<span class="chip r-legendary" title="${TRAITS[d.traitReward].desc}">${S('traitReward')}</span>` : ''}
      <div class="dim">${S('dungeonLine1', { n: rooms.length, emojis: rooms.map((r) => STATS[r.test].emoji).join(''), dmg: expectedDamage(d, ids.length ? ids : null), sec: d.duration })}</div>
      <div class="dim">${S('dungeonLine2', { min: d.gold[0], max: d.gold[1], xpn: d.xp, times: state.progress[d.id] || 0 })}</div></div>
      <div class="send"><div class="odds ${odds === null ? 'dim' : odds >= 70 ? 'win' : odds < 35 ? 'lose' : ''}">${odds === null ? '—' : odds + '%'}</div><div class="dim">${T.clearOdds}</div>
      <button data-action="send" data-id="${d.id}" ${ids.length ? '' : 'disabled'}>${Cap(T.send)}</button></div></div>`;
  }).join('');
}
const pct = (m, d) => Math.round(100 * (1 - Math.max(0, m.endsAt - Date.now()) / (d.duration * 1000)));
function renderMissions() {
  if (!state.missions.length) return `<h2>${Cap(T.expeditions)}</h2><p class="dim">${S('noParty')}</p>`;
  return `<h2>${Cap(T.expeditions)}</h2>` + state.missions.map((m) => {
    const d = DUNGEONS.find((x) => x.id === m.dungeonId), left = Math.max(0, m.endsAt - Date.now()), members = m.advIds.map(byId).filter(Boolean);
    return `<div class="mcard"><div class="faces">${members.map((a) => portraitHtml(a, 'sm')).join('')}</div>
      <div style="flex:1;min-width:0"><b>${d.name}</b><div class="dim">${S('teamLine', { names: members.map((a) => a.name).join(', '), hpv: partyHp(members.map((a) => a.id)) })}</div>
      <div class="bar"><i style="width:${pct(m, d)}%"></i></div></div><div class="timer">${Math.ceil(left / 1000)}s</div></div>`;
  }).join('');
}
/** Top-bar progress of every running expedition, visible from any tab. Clicking it opens the Missions tab. */
function renderRunbar() {
  if (!state.missions.length) return `<span class="dim">${S('runsIdle')}</span>`;
  return state.missions.map((m) => {
    const d = DUNGEONS.find((x) => x.id === m.dungeonId), members = m.advIds.map(byId).filter(Boolean), left = Math.max(0, m.endsAt - Date.now());
    return `<span class="run"><span class="faces">${members.map((a) => portraitHtml(a, 'xs')).join('')}</span><span class="runtxt">${S('runBar', { name: d.name, pct: pct(m, d), sec: Math.ceil(left / 1000) })}</span><span class="bar"><i style="width:${pct(m, d)}%"></i></span></span>`;
  }).join('');
}
function renderInventory() {
  const counts = {}; state.inventory.forEach((i) => { counts[i] = (counts[i] || 0) + 1; });
  const rows = Object.entries(counts).map(([i, n]) => `<div class="row"><span class="itemline">${icon('item', i, SLOTS[ITEMS[i].slot].emoji, 'sm')}<b>${ITEMS[i].name}</b>${n > 1 ? ' ×' + n : ''}</span><span class="dim">${fmt(ITEMS[i].bonus)}</span></div>`).join('');
  return `<h2>${Cap(T.armory)}</h2>` + (rows || `<p class="dim">${S('armoryEmpty')}</p>`) + `<p class="dim">${S('armoryHint')}</p>`;
}
function loreHint(id) {
  const l = LORE[id];
  if (l.secret) return S('unseen');
  if (l.hint) return l.hint;
  for (const d of DUNGEONS) { const r = (d.loreRewards || []).find((x) => x.id === id); if (r) return S('loreHint', { name: d.name, n: r.clears || 1, req: requireText(r.requires) }).trim(); }
  return S('loreDefault');
}
function renderLore() {
  const n = Object.keys(LORE).length, title = S('loreTitle', { n: state.lore.length, total: n });
  if (isCollapsed('lore')) return head('lore', title);
  return head('lore', title) + '<div class="dex">' + Object.entries(LORE).map(([id, l]) => state.lore.includes(id)
    ? `<div class="entry">${icon('lore', id, '📜', 'wide')}<div><b>${l.title}</b><br><span class="dim">${l.text}</span></div></div>`
    : `<div class="entry locked">${icon('lore', id, '🔒', 'wide').replace(/<img[^>]*>/, '')}<div><b>${S('locked')}</b><br><span class="dim">${loreHint(id)}</span></div></div>`).join('') + '</div>';   // locked: never load the image (no spoilers)
}
/* Codex pages for everything met so far. Seen ids live in state.seen (filled by markSeen). */
function renderDex(sec, nameTerm, table, kind, entryFn) {
  const ids = Object.keys(table), seen = (state.seen ||= { trait: {}, item: {} })[kind], n = ids.filter((i) => seen[i]).length, title = S('dexTitle', { name: Cap(nameTerm), n, total: ids.length });
  if (isCollapsed(sec)) return head(sec, title);
  return head(sec, title) + '<div class="dex">' + ids.map((id) => seen[id] ? entryFn(id, table[id]) : `<div class="entry locked"><span class="icon lg">❔</span><div><b>${S('unseen')}</b></div></div>`).join('') + '</div>';
}
const renderDexTraits = () => renderDex('dexTraits', T.traits, TRAITS, 'trait', (id, t) => `<div class="entry">${icon('trait', id, '✦', 'lg')}<div><b class="r-${t.rarity}">${t.name}</b> <span class="dim">${t.rarity}</span><br><span class="dim">${t.desc}</span></div></div>`);
const renderDexItems = () => renderDex('dexItems', T.items, ITEMS, 'item', (id, it) => {
  const src = DUNGEONS.filter((d) => d.loot.some(([i]) => i === id)).map((d) => d.name);
  return `<div class="entry">${icon('item', id, SLOTS[it.slot].emoji, 'lg')}<div><b>${it.name}</b> <span class="dim">${SLOTS[it.slot].name}</span><br><span class="dim">${fmt(it.bonus)}</span><br><span class="dim">${src.length ? S('foundIn', { names: src.join(', ') }) : S('dropOnly')}</span></div></div>`; });
function renderReports() {
  if (isCollapsed('reports')) return head('reports', Cap(T.battleReports));
  if (!state.reports.length) return head('reports', Cap(T.battleReports)) + `<p class="dim">${S('reportsEmpty')}</p>`;
  return head('reports', Cap(T.battleReports)) + state.reports.map((r, i) =>
    `<details ${i === 0 ? 'open' : ''}><summary class="${r.win ? 'win' : 'lose'}">${r.dungeon} – ${S(r.win ? 'wordCleared' : 'wordFailed')} <span class="dim">${new Date(r.when).toLocaleTimeString()}</span></summary>
     ${r.beats.map((b) => `<p class="beat">${b}</p>`).join('')}</details>`).join('');
}
/* Mission-complete pop-up: shows the OLDEST unread report (reports are stored newest-first): result art, lore, new dungeons, new Codex entries, battle report.
   Reports stay unread (and are saved that way) until Continue is clicked, so runs that finish while the tab is closed show on return. */
function renderResult() {
  const unread = state.reports.filter((x) => x.unread), r = unread[unread.length - 1], dlg = $('result');
  if (!r) { $('resultBody').innerHTML = ''; if (dlg.open) dlg.close?.(); return; }
  const d = DUNGEONS.find((x) => x.id === r.dungeonId);
  $('resultBody').innerHTML = `<h2 tabindex="-1" autofocus class="${r.win ? 'win' : 'lose'}">${r.dungeon}: ${S(r.win ? 'resultCleared' : 'resultFailed')}</h2>
    ${d ? `<div class="resultart">${d.emoji || ''} ${r.win ? '🏆' : '💀'}${artLayer('result', d.id + (r.win ? '_win' : '_fail'))}</div>` : ''}
    ${(r.lore || []).map((id) => `<div class="lorebox"><div class="entry">${icon('lore', id, '📜', 'wide')}<div><b>${S('loreUnlocked', { title: LORE[id].title })}</b><br><span class="dim">${LORE[id].text}</span></div></div></div>`).join('')}
    ${(r.unlocked || []).map((n) => `<div class="lorebox">🗺️ <b>${S('revealed', { name: n })}</b></div>`).join('')}
    ${(r.codex || []).map((n) => `<div class="lorebox">📖 ${S('newEntry', { name: n })}</div>`).join('')}
    <h2>${Cap(T.battleReport)}</h2>${r.beats.map((b) => `<p class="beat">${b}</p>`).join('')}
    <p><button data-action="dismissResult">${unread.length > 1 ? S('continueMore', { n: unread.length - 1 }) : S('continue')}</button></p>`;
  showDlg(dlg);
}
function renderDraft() {
  const dr = state.draft; if (!dr) return '';
  const c = CLASSES[dr.cls], s = statsOf({ cls: dr.cls, level: 1, base: dr.base, traits: dr.traits, gear: {} });
  const broke = state.gold < c.cost || state.roster.length >= rosterCap();
  const stats = Object.keys(STATS).map((k) => { const diff = s[k] - dr.base[k];
    return `<div>${STATS[k].emoji} ${STATS[k].name}: <b>${dr.base[k]}</b>${diff ? ` <span class="dim">${diff > 0 ? '+' : ''}${S('traitMod', { n: diff })}</span>` : ''} <span class="dim">${S('rangeNote', { cls: clsName(dr.cls), lo: c.roll[k][0], hi: c.roll[k][1] })}</span></div>`; }).join('');
  const traits = dr.traits.length ? dr.traits.map((t) => `<div><span class="chip r-${TRAITS[t].rarity}">${TRAITS[t].name} · ${TRAITS[t].rarity}</span> <span class="dim">${TRAITS[t].desc}</span></div>`).join('') : `<span class="dim">${S('noTrait')}</span>`;
  return `<h2 tabindex="-1" autofocus>${S('draftTitle', { cls: clsName(dr.cls) })}</h2>
    <div class="facerow">${variantsOf(dr.cls) > 1 ? `<button class="ghost sm" data-action="cycleFace" data-dir="-1" title="${S('faceBtn')}">◀</button>` : ''}${portraitHtml({ cls: dr.cls, portrait: dr.portrait }, 'lg')}${variantsOf(dr.cls) > 1 ? `<button class="ghost sm" data-action="cycleFace" data-dir="1" title="${S('faceBtn')}">▶</button>` : ''}</div><p class="dim" style="text-align:center">${S('artNote')}</p>
    <p><label>${S('nameLabel')} <input type="text" data-draft="name" maxlength="20" value="${dr.name}"></label> <button class="ghost" data-action="rerollName">${S('rerollName')}</button></p>
    ${stats}
    <p><button class="ghost" data-action="rerollStats" ${dr.rerolls ? '' : 'disabled'}>${S('rerollStats', { n: dr.rerolls })}</button></p>
    <p><b>${S('traitHead')}</b></p>${traits}
    <p><button data-action="confirmHire" ${broke ? 'disabled' : ''}>${S('hireFor', { cost: c.cost })}</button></p>`;
}
function render() {
  $('gold').textContent = `${T.goldIcon} ${state.gold}`;
  $('runbar').innerHTML = renderRunbar();
  $('roster').innerHTML = renderRoster();
  $('dungeons').innerHTML = renderDungeons();
  $('missions').innerHTML = renderMissions();
  $('inventory').innerHTML = renderInventory();
  $('lore').innerHTML = renderLore();
  $('dexTraits').innerHTML = renderDexTraits();
  $('dexItems').innerHTML = renderDexItems();
  $('reports').innerHTML = renderReports();
  $('draftBody').innerHTML = renderDraft();
  $('log').innerHTML = head('log', Cap(T.log)) + (isCollapsed('log') ? '' : state.log.map((l) => `<p>${l}</p>`).join(''));
  $('navBadge').textContent = state.missions.length || '';
  renderResult();
  renderTavernDlg();
  renderDetail();
  document.querySelectorAll?.('.view')?.forEach((v) => { v.hidden = v.dataset.view !== ui.tab; });          // show only the current tab
  document.querySelectorAll?.('#nav button')?.forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
}

/* ---------- 5. BOOT ----------
   Every second: resolve finished missions (also catches missions that
   finished while the tab was closed, since endsAt is a real timestamp). */
function tick() {
  const done = state.missions.filter((m) => m.endsAt <= Date.now());
  if (done.length) {
    state.missions = state.missions.filter((m) => !done.includes(m));
    done.forEach(resolveMission);
    GameStorage.save(state); render();
  } else {
    $('missions').innerHTML = renderMissions();   // only refresh countdowns (keeps dropdowns/ticks intact)
    $('runbar').innerHTML = renderRunbar();
  }
}
// Backfill saves made before loyalty / rolled stats / Codex discoveries existed.
state.seen ||= { trait: {}, item: {} }; { const p = prefs(); p.view ||= 'tiles'; p.sort ||= 'hired'; p.cardOpen ||= {}; }
state.roster.forEach((a) => { if ((!a.portrait || a.portrait === a.cls) && variantsOf(a.cls) > 1) a.portrait = faceId(a.cls, rand(1, variantsOf(a.cls))); });   // give older adventurers a face
state.roster.forEach((a) => { (a.traits || []).forEach((t) => markSeen('trait', t)); (a.traitChoices || []).flat().forEach((t) => markSeen('trait', t)); Object.values(a.gear).filter(Boolean).forEach((i) => markSeen('item', i)); });
state.inventory.forEach((i) => markSeen('item', i));
state.roster.forEach((a) => { if (a.loyalty === undefined) a.loyalty = maxLoyaltyOf(a); a.loyalty = Math.min(a.loyalty, maxLoyaltyOf(a)); if (a.hireCost === undefined) a.hireCost = classOf(a).cost; });
function renderHelp() {
  return `<h2 tabindex="-1" autofocus>${S('helpTitle')}</h2><p>${S('help1', { maxParty: CONFIG.maxParty })}</p><p>${S('help2')}</p><h2>${S('statsTitle')}</h2>` + Object.values(STATS).map((s) => `<p>${s.emoji} <b>${s.name}</b> (${s.abbr}): ${s.role}</p>`).join('');
}
document.querySelectorAll?.('[data-term]')?.forEach((el) => { el.textContent = Cap(T[el.dataset.term]); });   // static labels in index.html
$('helpBody').innerHTML = renderHelp();
// The hire pop-up has no exit except Hire: block Esc, and reopen if anything closes it while a draft exists.
$('draft').addEventListener?.('cancel', (e) => e.preventDefault());
$('result').addEventListener?.('cancel', (e) => e.preventDefault());
$('tavernDlg').addEventListener?.('close', () => { ui.tavernOpen = false; });
$('detail').addEventListener?.('close', () => { ui.detail = null; });   // must click Continue
$('draft').addEventListener?.('close', () => { if (state.draft) showDlg($('draft')); });
// A saved draft that can no longer be afforded (or roster full) is dropped so the player is never stuck.
if (state.draft && (!CLASSES[state.draft.cls] || state.gold < CLASSES[state.draft.cls].cost || state.roster.length >= rosterCap())) state.draft = null;
if (!state.seenHelp) { state.seenHelp = true; showDlg($('help')); }
applyTheme();
render();
if (state.draft) showDlg($('draft'));   // resume an unfinished hire after a page refresh
setInterval(tick, 1000);
tick();
