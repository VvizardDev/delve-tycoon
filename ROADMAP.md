# Roadmap

## Done
- Dungeons resolved room by room with beat-by-beat reports; per-attempt HP drain, retries
- Five stats with emoji; simulation-based clear odds
- Loyalty (max 3): every failed run costs everyone 1; 0 = leaves with gear; restore fee = hire cost per point
- Free "goon" safety net (1 loyalty, no restore)
- Rolled stats per class range; tavern shows likely strengths only
- Traits v2: rarity tiers with bigger drawbacks, 1 at hire, choose 1 of 3 every 10 levels, loyalty-modifying traits, dungeon trait reward infrastructure (Hollow Spire grants the legendary)
- Hire pop-up: edit/re-roll name, 2 stat re-rolls, fixed trait, art placeholder
- Flat roster cap (8) with release
- UI redesign: tabbed layout, Waypoint-inspired theme, roster cards with placeholder portraits, stat grid, loyalty pips, equipment slots; mobile fixes (bottom nav, 44px targets, 16px inputs, safe areas)
- How-to-play window (auto-opens first visit)

- Mission-complete pop-up (battle report + lore), team HP on roster and missions

- Terminology (`TERMS`), rule-based traits with class-weighted rolls and a balance pass, roster cap that grows with clears, Lore v2 infrastructure (count/conditional lore, dungeon unlock rules, new-dungeon announcement)

- Terminology: all sentences moved into TERMS.phrases; UI polish: top-bar run progress, collapsible panels, compact roster; Codex pages for traits and items; art infrastructure (portraits, dungeons, results, lore, items, traits)

- Classes as data (display names, unlock rules, weekday schedules, sample classes), bought roster slots with rising prices, locked top bar, Last party button, multiple faces per class, wide lore art

- Tile roster (tap to select, details pop-up), sorting, hiring as a pop-up, light theme palette (no toggle button for now; set CONFIG.theme), pop-ups open at the top

## Planned (suggested order)
0. **Roster follow-ups**: saved squads, restore-all, bulk release, hire comparison vs your current best
0b. **Server-driven class schedule** (Supabase clock + enforced hire)
1. **Economy**: gold is still too easy; roster slots are now a sink; consider scaling hire/restore costs, item shop, dungeon currencies
2. **Content**: write the real lore chains, extra dungeons with unlock rules, and more trait-reward dungeons (infrastructure exists)
3. **Trait icons and rarity visuals** (needs art direction)
5. **Real art**: draw the files listed by `artManifest()`; paper-doll layers later
6. **Supabase**: login, tables, row-level security; hire/send/equip/restore/release as server functions; server-side dice and lazy mission resolution; save versioning
