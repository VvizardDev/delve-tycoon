# Art folder

Art is optional: every slot shows an emoji placeholder until a matching file exists.
To switch art on, set `ART.enabled = true` in `js/data.js`.

**Naming = the data ids.** `art/<folder>/<id>.webp` (change `ART.ext` for png/jpg). Missing files are skipped silently, so you can add art one piece at a time.
Run `artManifest()` in the browser console (F12) to print every file the current data expects, including any classes, dungeons, lore, items and traits you add later.

| Folder | id | Where it shows | Suggested size | Notes |
|---|---|---|---|---|
| `portraits/` | `<classId>_1` ... `<classId>_N` (several faces per class; N = `ART.portraitVariants`, default 3, or the class's own `portraits` number). If a class has only 1 variant the file is just `<classId>`. | roster, tavern, hire pop-up, expedition bar | 512x512 square | Shown cropped to a square (`object-fit: cover`) at 24-110 px. Keep faces centred. |
| `dungeons/` | dungeon id | banner on each dungeon card | 440x280 (about 11:7) | Cropped to fit. |
| `results/` | `<dungeonId>_win` / `<dungeonId>_fail` | top of the mission-complete pop-up | 1120x560 (2:1) | Shown on every clear / failure of that dungeon. |
| `lore/` | lore id | Codex entry (small) and the pop-up when unlocked (large) | 1120x560 (2:1) | Only loaded after the lore is unlocked (no spoilers). |
| `items/` | item id | equipment slots, Armory, Codex | 128x128 square | |
| `traits/` | trait id | Codex only | 128x128 square | |

## Paper-doll (future)
`portraitHtml()` in `js/game.js` is the only place a character is drawn. A paper doll would stack transparent same-size layers there (body by class/variant, then armour, weapon, trinket from `a.gear`, in a fixed order), each named by id, e.g. `art/paperdoll/body/warrior_1.webp`, `art/paperdoll/armor/bone_mail.webp`. Draw every layer on the same canvas size so they align without code. Each adventurer already stores `portrait` (the variant id) so the look is stable between sessions.

## Hosting note
Anything under `art/` is public once the site is on GitHub Pages. Keep spoiler art (secret lore) out of the folder until it is needed, or serve it from private storage later.
