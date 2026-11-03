/**
 * 화면 제스처
 *  - 좌우: 손가락을 따라 화면이 움직이고, 놓으면 옆 탭으로 넘어가거나 제자리로 돌아온다.
 *  - 위아래(기록 화면): 짧게 밀면 하루씩 날짜가 바뀐다. 화면 맨 위에서 아래로 = 전날,
 *    맨 아래(또는 스크롤이 없는 화면)에서 위로 = 다음 날. 손가락을 따라가지 않고 놓을 때 튕긴다.
 */
const SLOP = 10;              // 방향을 정하기 전 움직임(px)
const V_DIST = 34;            // 세로: 이만큼 밀면 바뀜
const V_FLICK = [18, 0.35];   // 세로: 짧아도 빠르게(px/ms) 튕기면 바뀜
const H_RATIO = 0.26;         // 가로: 화면 폭의 이 비율 넘게 끌면 넘어감
const H_FLICK = [28, 0.45];   // 가로: 짧아도 빠르게 밀면 넘어감
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

export function initGestures(o) {
  let st = null;
  let suppressClick = 0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const blocked = (t) => !!t.closest('.chips, .sheet, .drawer, .scrim, .tabbar, .toast-wrap, [data-no-swipe]');

  addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || !o.enabled() || blocked(e.target)) { st = null; return; }
    const t = e.touches[0];
    const doc = document.documentElement;
    st = {
      x0: t.clientX, y0: t.clientY, dx: 0, dy: 0, axis: null, drag: null,
      atTop: scrollY <= 1,
      atBottom: scrollY + innerHeight >= doc.scrollHeight - 2,
      trail: [[performance.now(), t.clientX, t.clientY]],
    };
  }, { passive: true });

  addEventListener('touchmove', (e) => {
    if (!st) return;
    const t = e.touches[0];
    st.dx = t.clientX - st.x0; st.dy = t.clientY - st.y0;
    st.trail.push([performance.now(), t.clientX, t.clientY]);
    if (st.trail.length > 6) st.trail.shift();
    if (!st.axis) {
      if (Math.abs(st.dx) < SLOP && Math.abs(st.dy) < SLOP) return;
      st.axis = Math.abs(st.dx) > Math.abs(st.dy) * 1.15 ? 'x' : 'y';
      if (st.axis === 'x') st.drag = startDrag();
    }
    if (st.axis === 'x' && st.drag) { e.preventDefault(); moveDrag(st.drag, st.dx); }
  }, { passive: false });

  const end = () => {
    if (!st) return;
    const s = st; st = null;
    if (s.axis) suppressClick = performance.now() + 350;
    const [t0, x0, y0] = s.trail[0];
    const [t1, x1, y1] = s.trail[s.trail.length - 1];
    const dt = Math.max(1, t1 - t0);
    const vx = (x1 - x0) / dt, vy = (y1 - y0) / dt;
    if (s.axis === 'x' && s.drag) endDrag(s.drag, s.dx, vx);
    else if (s.axis === 'y' && o.tab() === 'record') {
      const far = Math.abs(s.dy) >= V_DIST || (Math.abs(s.dy) >= V_FLICK[0] && Math.abs(vy) >= V_FLICK[1]);
      if (!far || Math.abs(s.dy) < Math.abs(s.dx)) return;
      if (s.dy > 0 && s.atTop) o.onDateShift(-1);
      else if (s.dy < 0 && s.atBottom) o.onDateShift(1);
    }
  };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', () => { if (st?.drag) endDrag(st.drag, 0, 0); st = null; }, { passive: true });

  // 밀고 난 직후 손을 뗀 자리의 버튼이 눌리지 않게
  addEventListener('click', (e) => {
    if (performance.now() < suppressClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- 좌우 페이지 넘김 ---------- */
  function ghost(tab, rect) {
    const g = document.createElement('div');
    g.className = 'page-ghost';
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    g.style.left = `${rect.left}px`;
    g.style.width = `${rect.width}px`;
    g.innerHTML = o.renderTab(tab).replace(/\sid="/g, ' data-ghost-id="');
    document.body.appendChild(g);
    return g;
  }

  function startDrag() {
    const cur = document.querySelector('#app > .screen');
    if (!cur) return null;
    const tabs = o.tabs;
    const i = tabs.indexOf(o.tab());
    const rect = cur.getBoundingClientRect();
    const w = rect.width;
    const prev = i > 0 ? ghost(tabs[i - 1], rect) : null;
    const next = i < tabs.length - 1 ? ghost(tabs[i + 1], rect) : null;
    cur.style.transition = 'none';
    cur.style.willChange = 'transform';
    const d = { cur, prev, next, w, i };
    moveDrag(d, 0);
    return d;
  }

  function place(d, x, animate) {
    const tr = animate ? `transform .26s ${EASE_OUT}` : 'none';
    for (const [el, off] of [[d.cur, 0], [d.prev, -d.w], [d.next, d.w]]) {
      if (!el) continue;
      el.style.transition = tr;
      el.style.transform = `translate3d(${x + off}px,0,0)`;
    }
  }

  function moveDrag(d, dx) {
    let x = dx;
    if ((dx > 0 && !d.prev) || (dx < 0 && !d.next)) x = dx * 0.22; // 끝 탭에서는 살짝만 끌림
    place(d, x, false);
  }

  function endDrag(d, dx, vx) {
    const dir = dx < 0 ? 1 : -1; // 1 = 다음 탭
    const target = dir === 1 ? d.next : d.prev;
    const go = target && (Math.abs(dx) > d.w * H_RATIO || (Math.abs(dx) > H_FLICK[0] && Math.abs(vx) > H_FLICK[1] && Math.sign(vx) === Math.sign(dx)));
    const cleanup = () => {
      d.prev?.remove(); d.next?.remove();
      if (d.cur.isConnected) { d.cur.style.transition = ''; d.cur.style.transform = ''; d.cur.style.willChange = ''; }
    };
    if (reduced()) {
      if (go) o.onTab(o.tabs[d.i + dir]);
      cleanup();
      return;
    }
    place(d, go ? -dir * d.w : 0, true);
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      if (go) o.onTab(o.tabs[d.i + dir]);
      cleanup();
    };
    d.cur.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 320);
  }
}
