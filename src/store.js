import { uid, todayStr } from './format.js';

export const PALETTE = ['#3182f6', '#03b26c', '#fe9800', '#f04452', '#a234c7', '#18a5a5', '#ffc342', '#8b95a1'];

const DEFAULT_CATEGORIES = [
  { name: '주유비', type: 'expense', color: '#fe9800' },
  { name: '식비', type: 'expense', color: '#03b26c' },
  { name: '기타', type: 'expense', color: '#8b95a1' },
];

const LS = { cats: 'sl.categories', entries: 'sl.entries' };
const lsGet = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 공간 없음 */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* noop */ } };

function makeDefaults() {
  const now = Date.now();
  return DEFAULT_CATEGORIES.map((c, i) => ({ id: uid(), ...c, order: i, hidden: false, createdAt: now, updatedAt: now }));
}

function cloudConfig() {
  const env = import.meta.env ?? {};
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
  return cfg.apiKey && cfg.projectId ? cfg : null;
}

/** 미리보기 전용 예시 기록 (메모에 ‘예시’ 표시) */
function sampleEntries(cats) {
  const pick = [[0, 55000, '셀프주유'], [1, 9000, '점심'], [1, 4500, '커피'], [2, 12000, '생활용품'], [1, 23000, '저녁'], [0, 70000, '고속도로 주유']];
  const out = [];
  const t = new Date();
  for (let i = 0; i < 48; i++) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - Math.floor(i * 0.9));
    const [ci, amt, memo] = pick[i % pick.length];
    const c = cats[ci] ?? cats[0];
    if (!c) break;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ id: uid(), amount: amt + (i % 3) * 500, categoryId: c.id, date, memo: `${memo} (예시)`, source: 'app', createdAt: d.getTime() + 36e6 + i, updatedAt: 0 });
  }
  return out;
}

export class Store {
  constructor() {
    this.listeners = new Set();
    this.config = cloudConfig();
    this.cloud = null;
    this.detach = null;
    this.state = {
      categories: [],
      entries: [],
      user: null,
      mode: 'local',             // local | cloud
      sync: 'local',             // local | synced | pending | offline
      cloudAvailable: !!this.config,
      authReady: !this.config,
    };
    this.loadLocal();
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this.state); }
  set(patch) { Object.assign(this.state, patch); this.emit(); }

  get catMap() { return new Map(this.state.categories.map((c) => [c.id, c])); }
  get sortedCategories() { return this.state.categories.slice().sort((a, b) => a.order - b.order); }

  /* ------------ 로컬 모드 ------------ */
  loadLocal() {
    let cats = lsGet(LS.cats, null);
    if (!cats) { cats = makeDefaults(); lsSet(LS.cats, cats); }
    this.state.categories = cats;
    let entries = lsGet(LS.entries, null);
    if (!entries && import.meta.env?.MODE === 'preview') { entries = sampleEntries(cats); lsSet(LS.entries, entries); }
    this.state.entries = entries ?? [];
  }
  saveLocal() {
    lsSet(LS.cats, this.state.categories);
    lsSet(LS.entries, this.state.entries);
  }

  /* ------------ 계정 ------------ */
  async initCloud() {
    if (!this.config) return;
    const { createCloud } = await import('./firebase.js');
    this.cloud = createCloud(this.config);
    this.cloud.onUser(async (user) => {
      if (this.detach) { this.detach(); this.detach = null; }
      if (!user) {
        this.loadLocal();
        this.set({ user: null, mode: 'local', sync: 'local', authReady: true });
        return;
      }
      this.set({ user: { uid: user.uid, email: user.email }, mode: 'cloud', sync: 'pending', authReady: true, categories: [], entries: [] });
      await this.migrateLocal(user.uid);
      this.detach = this.cloud.attach(user.uid, {
        onCategories: (categories) => this.set({ categories }),
        onEntries: (entries) => this.set({ entries }),
        onSync: (sync) => { if (this.state.sync !== sync) this.set({ sync }); },
      });
    });
  }

  /** 로그인 직후, 이 기기에만 있던 기록을 계정으로 옮긴다. */
  async migrateLocal(userId) {
    const localCats = lsGet(LS.cats, null);
    const localEntries = lsGet(LS.entries, []);
    let cloudCats;
    try { cloudCats = await this.cloud.getCategoriesOnce(userId); } catch { return; } // 오프라인이면 다음에
    if (cloudCats.length === 0) {
      const cats = localCats?.length ? localCats : makeDefaults();
      await this.cloud.batchWrite(userId, { categories: cats, entries: localEntries });
    } else if (localEntries.length) {
      const byName = new Map(cloudCats.map((c) => [c.name, c.id]));
      const remap = new Map();
      const newCats = [];
      let order = Math.max(...cloudCats.map((c) => c.order ?? 0)) + 1;
      for (const c of localCats ?? []) {
        if (byName.has(c.name)) remap.set(c.id, byName.get(c.name));
        else { newCats.push({ ...c, order: order++ }); remap.set(c.id, c.id); }
      }
      const entries = localEntries.map((e) => ({ ...e, categoryId: remap.get(e.categoryId) ?? e.categoryId }));
      await this.cloud.batchWrite(userId, { categories: newCats, entries });
    }
    lsDel(LS.entries);
    lsDel(LS.cats);
  }

  signIn(email, pw) { return this.cloud.signIn(email, pw); }
  signUp(email, pw) { return this.cloud.signUp(email, pw); }
  signOut() { return this.cloud.signOut(); }
  resetPassword(email) { return this.cloud.resetPassword(email); }
  widgetSession() { return this.cloud?.session?.() ?? null; }

  /* ------------ 쓰기 ------------ */
  _putEntry(entry) {
    if (this.state.mode === 'cloud') { this.cloud.putEntry(this.state.user.uid, entry); return; }
    const i = this.state.entries.findIndex((e) => e.id === entry.id);
    const entries = this.state.entries.slice();
    if (i >= 0) entries[i] = entry; else entries.push(entry);
    this.state.entries = entries; this.saveLocal(); this.emit();
  }
  _putCategory(cat) {
    if (this.state.mode === 'cloud') { this.cloud.putCategory(this.state.user.uid, cat); return; }
    const i = this.state.categories.findIndex((c) => c.id === cat.id);
    const cats = this.state.categories.slice();
    if (i >= 0) cats[i] = cat; else cats.push(cat);
    this.state.categories = cats; this.saveLocal(); this.emit();
  }

  addEntry({ id, amount, categoryId, date, memo = '', source = 'app', createdAt }) {
    const now = Date.now();
    const entry = { id: id || uid(), amount, categoryId, date: date || todayStr(), memo, source, createdAt: createdAt || now, updatedAt: now };
    if (this.state.entries.some((e) => e.id === entry.id)) return entry; // 위젯 중복 방지
    this._putEntry(entry);
    return entry;
  }
  updateEntry(id, patch) {
    const old = this.state.entries.find((e) => e.id === id);
    if (old) this._putEntry({ ...old, ...patch, updatedAt: Date.now() });
  }
  deleteEntry(id) {
    if (this.state.mode === 'cloud') { this.cloud.removeEntry(this.state.user.uid, id); return; }
    this.state.entries = this.state.entries.filter((e) => e.id !== id);
    this.saveLocal(); this.emit();
  }

  addCategory({ name, type, color }) {
    const now = Date.now();
    const order = Math.max(-1, ...this.state.categories.map((c) => c.order)) + 1;
    this._putCategory({ id: uid(), name, type, color, order, hidden: false, createdAt: now, updatedAt: now });
  }
  updateCategory(id, patch) {
    const old = this.state.categories.find((c) => c.id === id);
    if (old) this._putCategory({ ...old, ...patch, updatedAt: Date.now() });
  }
  deleteCategory(id) {
    if (this.state.entries.some((e) => e.categoryId === id)) return false;
    if (this.state.mode === 'cloud') this.cloud.removeCategory(this.state.user.uid, id);
    else { this.state.categories = this.state.categories.filter((c) => c.id !== id); this.saveLocal(); this.emit(); }
    return true;
  }
  moveCategory(id, delta) {
    const list = this.sortedCategories;
    const i = list.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((c, k) => { if (c.order !== k) this._putCategory({ ...c, order: k, updatedAt: Date.now() }); });
  }
}
