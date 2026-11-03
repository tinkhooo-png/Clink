import { drawReportBar, REPORT_BARS, glassIcon } from './glass.js';
import { comma } from './format.js';

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canLinear = typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)');
function spring(z, w, n = 48) {
  const wd = w * Math.sqrt(1 - z * z), p = [];
  for (let i = 0; i <= n; i++) { const t = i / n; p.push((1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))).toFixed(4)); }
  p[n] = '1';
  return `linear(${p.join(', ')})`;
}
export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  in: 'cubic-bezier(.55,0,1,.45)',
  inOut: 'cubic-bezier(.45,0,.55,1)',
  gentle: canLinear ? spring(0.8, 11) : 'cubic-bezier(.2,.9,.25,1)',
  bouncy: canLinear ? spring(0.5, 13) : 'cubic-bezier(.34,1.56,.64,1)',
};

/** kind: in | out | none(장식: 움직임 줄이기면 생략) */
export function anim(el, frames, o = {}) {
  if (!el?.animate) return Promise.resolve();
  if (reduced()) {
    if (!o.kind || o.kind === 'none') return Promise.resolve();
    const k = o.kind === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
    return el.animate(k, { duration: 150, fill: o.kind === 'out' ? 'forwards' : 'none' }).finished.catch(() => {});
  }
  return el.animate(frames, { duration: o.duration ?? 300, delay: o.delay ?? 0, easing: o.easing ?? EASE.out, fill: o.fill ?? 'backwards' }).finished.catch(() => {});
}

export function countUp(el, from, to, ms = 600, fmt = (n) => `${comma(n)}원`) {
  if (!el) return;
  const tok = {}; el._cu = tok;
  if (reduced() || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    if (el._cu !== tok) return;
    const p = Math.min(1, (now - t0) / ms), e = 1 - (1 - p) ** 3;
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 버튼에서 목표 지점까지 동전이 포물선으로 날아간다 (550ms). */
export function flyCoin(fromEl, toRect) {
  if (!fromEl || !toRect || reduced()) return Promise.resolve();
  const a = fromEl.getBoundingClientRect();
  const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
  const ex = toRect.left + 20, ey = toRect.top + 20;
  const el = document.createElement('div');
  el.className = 'fly-coin';
  el.innerHTML = glassIcon('income', 28);
  document.body.appendChild(el);
  const arc = Math.max(70, Math.abs(sy - ey) * 0.5), k = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    k.push({ transform: `translate(${sx + (ex - sx) * t - 14}px,${sy + (ey - sy) * t - arc * 4 * t * (1 - t) - 14}px) scale(${1.15 - 0.45 * t}) rotate(${t * 200}deg)` });
  }
  return el.animate(k, { duration: 550, easing: 'cubic-bezier(.3,.6,.4,1)' }).finished.then(() => el.remove(), () => el.remove());
}

export function shake(el) {
  anim(el, [0, -8, 8, -6, 6, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 240, easing: 'linear', kind: 'none', fill: 'none' });
}

export function pop(el, delay = 0) {
  anim(el, [{ transform: 'scale(.55)' }, { transform: 'scale(1)' }], { duration: 340, delay, easing: EASE.bouncy, kind: 'none' });
}

/** 팝업 일러스트 모션 */
export const HERO_PLAY = {
  first(root) {
    const coin = root.querySelector('.coin');
    const sp = [...root.querySelectorAll('.sp')];
    if (reduced()) return;
    sp.forEach((s) => { s.style.opacity = 0; });
    anim(coin, [
      { transform: 'translateY(-96px)', opacity: 0, offset: 0 },
      { transform: 'translateY(-96px)', opacity: 1, offset: 0.05 },
      { transform: 'translateY(0)', offset: 0.45, easing: 'cubic-bezier(.3,0,.6,1)' },
      { transform: 'translateY(-16px)', offset: 0.62, easing: 'cubic-bezier(.3,0,.6,1)' },
      { transform: 'translateY(0)', offset: 0.78 },
      { transform: 'translateY(-5px)', offset: 0.88 },
      { transform: 'translateY(0)', offset: 1 },
    ], { duration: 600, delay: 120, easing: EASE.in, kind: 'none' }).then(() => {
      sp.forEach((s, i) => {
        s.style.opacity = 1;
        anim(s, [{ transform: 'scale(0) rotate(-45deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(0)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], { duration: 240, delay: i * 60, kind: 'none' });
      });
    });
  },
  delete(root) {
    anim(root.querySelector('.lid'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg) translateY(-3px)', offset: 0.35 }, { transform: 'rotate(0)', offset: 0.65 }, { transform: 'rotate(-4deg)', offset: 0.82 }, { transform: 'rotate(0)' }], { duration: 520, delay: 220, easing: EASE.inOut, kind: 'none' });
  },
  sync(root) {
    anim(root.querySelector('.cloud'), [{ transform: 'translateY(22px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 60, easing: EASE.gentle, kind: 'none' });
    anim(root.querySelector('.badge'), [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 450, delay: 280, easing: EASE.bouncy, kind: 'none' });
  },
  report(root) {
    const svg = root.querySelector('.bars');
    if (reduced() || !svg) return;
    REPORT_BARS.forEach((b, i) => {
      drawReportBar(svg, i, 0);
      const t0 = performance.now() + 120 + i * 80;
      const step = (now) => {
        const p = Math.max(0, Math.min(1, (now - t0) / 400));
        drawReportBar(svg, i, b.h * (1 - (1 - p) ** 3));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    anim(root.querySelector('.card'), [{ transform: 'translateY(-60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 420, easing: EASE.bouncy, kind: 'none' });
  },
  widget(root) {
    ['.t1', '.t2', '.t3'].forEach((s, i) => anim(root.querySelector(s), [{ transform: 'translateY(-44px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 140 + i * 90, easing: EASE.bouncy, kind: 'none' }));
  },
};
