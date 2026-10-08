/* ===========================================================
   storage.js  –  THE ONLY FILE THAT TALKS TO A DATABASE.
   game.js only calls GameStorage.load() and GameStorage.save(state).
   Today: browser localStorage. To use Supabase later, replace the
   bodies of these two functions (example in README). Keep the
   same names/signatures and nothing else needs to change.
   =========================================================== */
const GameStorage = {
  KEY: 'guildhall_save_v1',

  /** Returns the saved state object, or null if none. (May become async.) */
  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; }
  },

  /** Persists the whole state object. */
  save(state) {
    localStorage.setItem(this.KEY, JSON.stringify(state));
  },

  /** Deletes the save. */
  clear() { localStorage.removeItem(this.KEY); },
};
