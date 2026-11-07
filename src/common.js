import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { brand, shops, shopStatus } from './data.js';

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = window.matchMedia('(max-width: 760px)').matches;

export function initSmoothScroll() {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: !reducedMotion });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function initReveals(root = document) {
  root.querySelectorAll('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
}

// Разбить заголовок на буквы для анимации
export function splitChars(el) {
  const lines = el.innerHTML.split(/<br\s*\/?>/i).map((l) => l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
  el.innerHTML = '';
  el.setAttribute('aria-label', lines.join(' '));
  lines.forEach((line, li) => {
    if (li) el.appendChild(document.createElement('br'));
    splitLine(el, line);
  });
  return el.querySelectorAll('.ch');
}
function splitLine(el, text) {
  const words = text.split(' ');
  words.forEach((w, wi) => {
    const word = document.createElement('span');
    word.style.display = 'inline-block';
    word.style.whiteSpace = 'nowrap';
    [...w].forEach((ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.display = 'inline-block';
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      word.appendChild(s);
    });
    el.appendChild(word);
    if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

export function conceptBadge() {
  const b = document.createElement('div');
  b.className = 'concept';
  b.innerHTML = 'Концепт сайта для «Кофе Крафт» · не официальный сайт · <a href="../index.html">все варианты</a>';
  document.body.appendChild(b);
  const g = document.createElement('div');
  g.className = 'grain';
  document.body.appendChild(g);
}

export function footerHTML() {
  return `
  <footer class="footer">
    <p class="eyebrow">${brand.claim}</p>
    <h2 class="h-display" style="font-size:clamp(40px,8vw,120px)">Заходи<br/>на кофе</h2>
    <div class="footer-grid">
      ${shops
        .map((s) => {
          const st = shopStatus(s);
          return `<div><b>${s.title}</b><br/><small>${s.note}</small><br/>
          <span style="color:${st.open ? '#9be37a' : st.open === false ? '#ff9a7a' : '#e3c9a4'}">● ${st.text}</span><br/>
          <span>${s.phone}</span></div>`;
        })
        .join('')}
    </div>
    <div style="margin-top:48px;display:flex;gap:12px;flex-wrap:wrap">
      <a class="pill" href="${brand.menu}" target="_blank" rel="noopener">Меню и заказ</a>
      <a class="pill" href="${brand.vk}" target="_blank" rel="noopener">ВКонтакте</a>
      <span class="pill">${brand.phone}</span>
    </div>
  </footer>`;
}

// Мягкая круглая текстура для пара и частиц
export function softDot(THREE, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, color);
  grd.addColorStop(0.4, color + 'aa');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Текстура с надписью (вывески, этикетки)
export function textTexture(THREE, lines, { w = 512, h = 256, bg = '#1b120c', fg = '#f4ead9', size = 72 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = size * 1.1;
  lines.forEach((l, i) => {
    g.font = `800 ${i === 0 ? size : size * 0.45}px Unbounded, Arial Black, sans-serif`;
    g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh * (i === 0 ? 1 : 0.9));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export { gsap, ScrollTrigger };
