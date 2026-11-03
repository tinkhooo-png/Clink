// Firebase(인증 + Firestore) 연결. 설정값이 있을 때만 불러온다.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, getDocsFromServer, onSnapshot, writeBatch,
} from 'firebase/firestore';

export function createCloud(config) {
  const app = initializeApp(config);
  // WebView(안드로이드)·Electron에서도 팝업 없이 동작하도록 initializeAuth를 쓴다.
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  // 오프라인 캐시: 인터넷이 끊겨도 기록되고, 연결되면 자동으로 올라간다.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  const col = (u, name) => collection(db, 'users', u, name);
  const clean = (o) => { const { id, ...rest } = o; return rest; };

  return {
    onUser: (cb) => onAuthStateChanged(auth, cb),
    signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    signUp: (email, pw) => createUserWithEmailAndPassword(auth, email, pw),
    signOut: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),

    /** 위젯이 앱 없이 바로 저장할 수 있도록 넘기는 세션 정보 */
    session() {
      const u = auth.currentUser;
      if (!u) return null;
      return { apiKey: config.apiKey, projectId: config.projectId, uid: u.uid, refreshToken: u.refreshToken };
    },

    async getCategoriesOnce(u) {
      const snap = await getDocsFromServer(col(u, 'categories'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    attach(u, { onCategories, onEntries, onSync }) {
      const pending = { cats: false, entries: false };
      let fromCache = true;
      const report = () => {
        if (pending.cats || pending.entries) onSync('pending');
        else onSync(fromCache && !navigator.onLine ? 'offline' : 'synced');
      };
      const opts = { includeMetadataChanges: true };
      const u1 = onSnapshot(col(u, 'categories'), opts, (snap) => {
        pending.cats = snap.metadata.hasPendingWrites; fromCache = snap.metadata.fromCache;
        onCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        report();
      }, () => onSync('offline'));
      const u2 = onSnapshot(col(u, 'entries'), opts, (snap) => {
        pending.entries = snap.metadata.hasPendingWrites; fromCache = snap.metadata.fromCache;
        onEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        report();
      }, () => onSync('offline'));
      const net = () => report();
      window.addEventListener('online', net);
      window.addEventListener('offline', net);
      return () => { u1(); u2(); window.removeEventListener('online', net); window.removeEventListener('offline', net); };
    },

    putEntry: (u, e) => setDoc(doc(db, 'users', u, 'entries', e.id), clean(e)).catch(console.error),
    removeEntry: (u, id) => deleteDoc(doc(db, 'users', u, 'entries', id)).catch(console.error),
    putCategory: (u, c) => setDoc(doc(db, 'users', u, 'categories', c.id), clean(c)).catch(console.error),
    removeCategory: (u, id) => deleteDoc(doc(db, 'users', u, 'categories', id)).catch(console.error),

    async batchWrite(u, { categories = [], entries = [] }) {
      const items = [
        ...categories.map((c) => [doc(db, 'users', u, 'categories', c.id), clean(c)]),
        ...entries.map((e) => [doc(db, 'users', u, 'entries', e.id), clean(e)]),
      ];
      for (let i = 0; i < items.length; i += 400) {
        const b = writeBatch(db);
        for (const [ref, data] of items.slice(i, i + 400)) b.set(ref, data);
        await b.commit();
      }
    },
  };
}
