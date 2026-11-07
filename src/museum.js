import * as THREE from 'three';
import {
  gsap,
  ScrollTrigger,
  initSmoothScroll,
  initReveals,
  splitChars,
  hasWebGL,
  conceptBadge,
  footerHTML,
  isMobile,
} from './common.js';
import { desserts, drinks, rafs, shops, shopStatus, brand } from './data.js';

conceptBadge();
document.getElementById('footer').innerHTML = footerHTML();
const lenis = initSmoothScroll();
document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(a.getAttribute('href'));
  })
);

/* ---------- фонарик в герое ---------- */
const hero = document.getElementById('hero');
let mx = 0.5;
let my = 0.45;
let tx = mx;
let ty = my;
let userMoved = false;
hero.addEventListener('pointermove', (e) => {
  const r = hero.getBoundingClientRect();
  tx = (e.clientX - r.left) / r.width;
  ty = (e.clientY - r.top) / r.height;
  userMoved = true;
});
gsap.ticker.add((t) => {
  if (!userMoved) {
    // сам «осматривает» заголовок, пока мышь не двигали (и на телефоне)
    tx = 0.32 + Math.sin(t * 0.6) * 0.22;
    ty = 0.48 + Math.sin(t * 0.9) * 0.12;
  }
  mx += (tx - mx) * 0.08;
  my += (ty - my) * 0.08;
  hero.style.setProperty('--mx', `${mx * 100}%`);
  hero.style.setProperty('--my', `${my * 100}%`);
});
document.querySelectorAll('.hero-title').forEach((h) => {
  const ch = splitChars(h);
  gsap.from(ch, { yPercent: 100, opacity: 0, stagger: 0.05, duration: 1.2, ease: 'expo.out', delay: 0.2 });
});

/* ---------- напитки ---------- */
document.getElementById('drinks').innerHTML = [
  ...rafs.map((r) => [r.name, `от ${Math.min(...Object.values(r.prices))} ₽`]),
  ...drinks,
]
  .map(([n, p]) => `<div><span>${n}</span><span>${p}</span></div>`)
  .join('');

/* ---------- схема-метро ---------- */
const S = {
  msk: { x: 120, y: 120, lx: 0, ly: -34, anchor: 'middle' },
  chk: { x: 320, y: 120, lx: 0, ly: -34, anchor: 'middle' },
  p64: { x: 480, y: 290, lx: -26, ly: -14, anchor: 'end' },
  p56: { x: 670, y: 290, lx: 0, ly: -34, anchor: 'middle' },
  arkada: { x: 870, y: 440, lx: 0, ly: 48, anchor: 'middle' },
  bys: { x: 480, y: 480, lx: 26, ly: 6, anchor: 'start' },
};
const svg = document.getElementById('metro');
const p = (id) => `${S[id].x},${S[id].y}`;
svg.innerHTML = `
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#24180f" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1000" height="560" fill="url(#grid)" rx="28"/>
  <polyline id="line-main" points="${p('msk')} ${p('chk')} 360,120 ${p('p64')} ${p('p56')} 720,290 ${p('arkada')}"
    fill="none" stroke="#ff6a2b" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
  <polyline id="line-branch" points="${p('bys')} ${p('p64')}" fill="none" stroke="#e3c9a4" stroke-width="12" stroke-linecap="round"/>
  <g transform="translate(40,520)"><rect width="34" height="8" rx="4" fill="#ff6a2b"/><text x="46" y="9" class="sub">Кофейная линия</text>
    <rect x="200" width="34" height="8" rx="4" fill="#e3c9a4"/><text x="246" y="9" class="sub">Сливочная ветка</text></g>
  ${shops
    .map((s) => {
      const c = S[s.id];
      const st = shopStatus(s);
      const col = st.open ? '#9be37a' : st.open === false ? '#ff9a7a' : '#e3c9a4';
      const [name, sub] = s.title.split(' · ');
      return `<g class="st" data-id="${s.id}" tabindex="0" role="button" aria-label="${s.title}">
        ${st.open ? `<circle class="pulse" cx="${c.x}" cy="${c.y}" r="14" fill="${col}"/>` : ''}
        <circle class="ring" cx="${c.x}" cy="${c.y}" r="14" fill="#0f0a07" stroke="${s.id === 'p64' ? '#fff' : '#f4ead9'}" stroke-width="6"/>
        <circle cx="${c.x}" cy="${c.y}" r="5" fill="${col}"/>
        <text x="${c.x + c.lx}" y="${c.y + c.ly}" text-anchor="${c.anchor}">${name}</text>
        ${sub ? `<text class="sub" x="${c.x + c.lx}" y="${c.y + c.ly + 20}" text-anchor="${c.anchor}">${sub}</text>` : ''}
      </g>`;
    })
    .join('')}
`;
// линии «прорисовываются» при скролле
['line-main', 'line-branch'].forEach((id, i) => {
  const el = document.getElementById(id);
  const len = el.getTotalLength();
  el.style.strokeDasharray = len;
  el.style.strokeDashoffset = len;
  gsap.to(el, {
    strokeDashoffset: 0,
    duration: 1.8,
    delay: i * 0.6,
    ease: 'power2.inOut',
    scrollTrigger: { trigger: svg, start: 'top 75%' },
  });
});
gsap.from('#metro .st', {
  scale: 0,
  transformOrigin: 'center',
  stagger: 0.12,
  duration: 0.6,
  ease: 'back.out(3)',
  scrollTrigger: { trigger: svg, start: 'top 70%' },
});

const card = document.getElementById('station-card');
function showStation(id) {
  const s = shops.find((x) => x.id === id);
  const st = shopStatus(s);
  const col = st.open ? '#3f9b1f' : st.open === false ? '#c4452a' : '#9a6a3c';
  const q = encodeURIComponent(`Кофе Крафт Рязань ${s.title.split(' · ')[0]}`);
  card.innerHTML = `
    <span class="eyebrow">Станция</span>
    <h3>${s.title}</h3>
    <p style="font-weight:600;margin:0">${s.note}</p>
    <p class="status" style="color:${col}">● ${st.text}</p>
    <p style="margin:0;font-weight:700">${s.phone}</p>
    <div class="actions">
      <a class="pill solid" href="https://yandex.ru/maps/11/ryazan/?text=${q}" target="_blank" rel="noopener">Маршрут</a>
      <a class="pill" href="${brand.menu}" target="_blank" rel="noopener">Меню</a>
    </div>`;
  svg.querySelectorAll('.st').forEach((g) => g.classList.toggle('active', g.dataset.id === id));
  gsap.from(card.children, { y: 16, opacity: 0, stagger: 0.04, duration: 0.5, ease: 'expo.out' });
}
svg.addEventListener('click', (e) => {
  const g = e.target.closest('.st');
  if (g) showStation(g.dataset.id);
});
svg.addEventListener('keydown', (e) => {
  const g = e.target.closest('.st');
  if (g && (e.key === 'Enter' || e.key === ' ')) showStation(g.dataset.id);
});
showStation('arkada');

initReveals();

/* ---------- зал с десертами ---------- */
const capNum = document.getElementById('cap-num');
const capName = document.getElementById('cap-name');
const capText = document.getElementById('cap-text');
const capPrice = document.getElementById('cap-price');
const bar = document.getElementById('hall-bar');
let active = -1;
function setCaption(i) {
  if (i === active) return;
  active = i;
  const d = desserts[i];
  capNum.textContent = `№${String(i + 1).padStart(2, '0')} / ${String(desserts.length).padStart(2, '0')}`;
  capName.textContent = d.name;
  capText.textContent = d.text;
  capPrice.textContent = d.price;
  gsap.fromTo('#caption > *', { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.6, ease: 'expo.out' });
}
setCaption(0);

let progress = 0;
ScrollTrigger.create({
  trigger: '#gallery',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (s) => (progress = s.progress),
});

if (hasWebGL()) initHall();

function initHall() {
  const canvas = document.getElementById('hall');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f0a07');
  scene.fog = new THREE.Fog('#0f0a07', 8, 22);
  const camera = new THREE.PerspectiveCamera(isMobile ? 50 : 36, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight('#5a3a22', 0.6));
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), M('#1a110b', { roughness: 0.28, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(200, 20), M('#160e09', { roughness: 0.9 }));
  wall.position.set(0, 10, -4);
  scene.add(wall);

  const SP = 4.6;
  const PED_H = 1.5;
  const exhibits = [];
  const dummy = new THREE.Object3D();
  const rnd = (a, b) => a + Math.random() * (b - a);

  function sprinkles(n, rFn, y, cols, size = 0.025) {
    const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(size, size * 3, 2, 6), M('#ffffff', { roughness: 0.4 }), n);
    for (let i = 0; i < n; i++) {
      const [x, z] = rFn(i);
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.PI / 2, 0, Math.random() * 3);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    }
    return m;
  }

  const builders = {
    lavender() {
      const g = new THREE.Group();
      let y = 0;
      [[0.75, 0.32, '#cbb5f2'], [0.76, 0.08, '#fff4e0'], [0.75, 0.3, '#cbb5f2'], [0.76, 0.1, '#fff4e0']].forEach(([r, h, c]) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), M(c));
        m.position.y = y + h / 2;
        y += h;
        g.add(m);
      });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const dollop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M('#fff4e0'));
        dollop.position.set(Math.cos(a) * 0.6, y + 0.05, Math.sin(a) * 0.6);
        g.add(dollop);
      }
      for (let i = 0; i < 3; i++) {
        const sprig = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), M('#6d8a4a'));
        stem.position.y = 0.25;
        sprig.add(stem);
        for (let k = 0; k < 8; k++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M('#7d5bb8'));
          b.position.set(Math.sin(k) * 0.03, 0.25 + k * 0.035, Math.cos(k) * 0.03);
          sprig.add(b);
        }
        sprig.position.set(-0.15 + i * 0.15, y, 0.05 * i);
        sprig.rotation.z = -0.5 + i * 0.4;
        g.add(sprig);
      }
      return g;
    },
    honey() {
      const g = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const h = i % 2 ? 0.05 : 0.1;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, h, 48), M(i % 2 ? '#f6e7c8' : '#d9a24e'));
        m.position.y = i * 0.075 + h / 2;
        g.add(m);
      }
      const crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), M('#b97b33'), 160);
      for (let i = 0; i < 160; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.74;
        dummy.position.set(Math.cos(a) * r, 0.68, Math.sin(a) * r);
        dummy.rotation.set(rnd(0, 3), rnd(0, 3), 0);
        dummy.updateMatrix();
        crumbs.setMatrixAt(i, dummy.matrix);
      }
      g.add(crumbs);
      const bee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), M('#ffcc33'));
      bee.scale.set(1.4, 1, 1);
      bee.position.set(0.2, 0.75, 0.1);
      g.add(bee);
      return g;
    },
    eclair() {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.0, 8, 24).rotateZ(Math.PI / 2), M('#d9a05b'));
      shell.position.y = 0.22;
      const glaze = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.98, 8, 24).rotateZ(Math.PI / 2), M('#3b1f12', { roughness: 0.2 }));
      glaze.scale.set(1, 0.55, 1);
      glaze.position.y = 0.36;
      g.add(shell, glaze);
      for (let i = 0; i < 6; i++) {
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6).rotateX(Math.PI / 2), M('#fff4e0'));
        line.position.set(-0.5 + i * 0.2, 0.47, 0);
        line.rotation.y = 0.5;
        g.add(line);
      }
      g.rotation.y = 0.4;
      return g;
    },
    donut() {
      const g = new THREE.Group();
      const dough = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.24, 24, 48).rotateX(Math.PI / 2), M('#e0a86a'));
      dough.position.y = 0.24;
      const glaze = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.21, 24, 48).rotateX(Math.PI / 2), M('#ff9fb8', { roughness: 0.25 }));
      glaze.scale.y = 0.7;
      glaze.position.y = 0.33;
      g.add(dough, glaze);
      g.add(
        sprinkles(
          70,
          () => {
            const a = Math.random() * Math.PI * 2;
            const r = 0.45 + (Math.random() - 0.5) * 0.26;
            return [Math.cos(a) * r, Math.sin(a) * r];
          },
          0.47,
          ['#ffffff', '#ff6a2b', '#8db9e6', '#2b1b11', '#ffd166']
        )
      );
      return g;
    },
    roll() {
      const g = new THREE.Group();
      const spiral = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const x = c.getContext('2d');
        x.fillStyle = '#f3dcc0';
        x.fillRect(0, 0, 256, 256);
        x.strokeStyle = '#fffaf2';
        x.lineWidth = 14;
        x.beginPath();
        for (let a = 0; a < Math.PI * 7; a += 0.05) {
          const r = 4 + a * 5.4;
          x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
        }
        x.stroke();
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 48).rotateZ(Math.PI / 2), [
        M('#e9c79a', { roughness: 1 }),
        new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.8 }),
      ]);
      body.position.y = 0.42;
      g.add(body);
      for (let i = 0; i < 7; i++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M(i % 2 ? '#d6213b' : '#3b2a6b', { roughness: 0.3 }));
        berry.position.set(-0.5 + i * 0.16, 0.86, rnd(-0.05, 0.05));
        g.add(berry);
      }
      g.rotation.y = -0.5;
      return g;
    },
    cheese() {
      const g = new THREE.Group();
      const sector = (r, a) => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.lineTo(r, 0);
        s.absarc(0, 0, r, 0, a, false);
        s.lineTo(0, 0);
        return s;
      };
      const ext = (h) => ({ depth: h, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 24 });
      const baseG = new THREE.ExtrudeGeometry(sector(1.0, Math.PI / 3), ext(0.12)).rotateX(-Math.PI / 2);
      const cakeG = new THREE.ExtrudeGeometry(sector(1.0, Math.PI / 3), ext(0.5)).rotateX(-Math.PI / 2);
      const jamG = new THREE.ExtrudeGeometry(sector(1.0, Math.PI / 3), ext(0.05)).rotateX(-Math.PI / 2);
      const base = new THREE.Mesh(baseG, M('#8a5a2e'));
      const cake = new THREE.Mesh(cakeG, M('#fbeed6', { roughness: 0.8 }));
      cake.position.y = 0.14;
      const jam = new THREE.Mesh(jamG, M('#b3122e', { roughness: 0.15 }));
      jam.position.y = 0.66;
      g.add(base, cake, jam);
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M('#3b2a6b', { roughness: 0.25 }));
        b.position.set(0.35 + i * 0.12, 0.78, -0.18 - i * 0.05);
        g.add(b);
      }
      g.position.set(-0.4, 0, 0.25);
      const wrap = new THREE.Group();
      wrap.add(g);
      return wrap;
    },
    candy() {
      const g = new THREE.Group();
      const slate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.6), M('#2a2420', { roughness: 0.9 }));
      slate.position.y = 0.03;
      g.add(slate);
      const cols = ['#3b1f12', '#e9d7bd', '#6b3a1e'];
      cols.forEach((c, i) => {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), M(c, { roughness: 0.45 }));
        t.position.set(-0.45 + i * 0.45, 0.24, 0);
        g.add(t);
        const drizzle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 32).rotateX(Math.PI / 2.3), M(i === 1 ? '#3b1f12' : '#fff4e0'));
        drizzle.position.set(t.position.x, 0.33, 0);
        g.add(drizzle);
      });
      return g;
    },
  };

  desserts.forEach((d, i) => {
    const x = i * SP;
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.9, PED_H, 1.9), M('#efe2cd', { roughness: 0.7 }));
    ped.position.set(x, PED_H / 2, 0);
    const plateTop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.04, 48), M('#fffaf2', { roughness: 0.3 }));
    plateTop.position.set(x, PED_H + 0.02, 0);
    scene.add(ped, plateTop);

    const holder = new THREE.Group();
    holder.position.set(x, PED_H + 0.04, 0);
    const model = (builders[d.id] || builders.donut)();
    holder.add(model);
    scene.add(holder);

    const spot = new THREE.SpotLight('#fff0dc', 60, 12, 0.42, 0.55, 1.6);
    spot.position.set(x, 7.2, 1.2);
    spot.target = holder;
    scene.add(spot);

    // видимый луч
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 5.6, 40, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffcf8f', transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    cone.position.set(x, 4.4, 0.6);
    scene.add(cone);

    exhibits.push({ holder, spot, cone, x });
  });

  // номера над экспонатами
  const tagsEl = document.getElementById('tags');
  const tagEls = desserts.map((d, i) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.textContent = `№${String(i + 1).padStart(2, '0')}`;
    tagsEl.appendChild(el);
    return el;
  });

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let curX = 0;
  const v = new THREE.Vector3();
  const maxX = (desserts.length - 1) * SP;
  let prev = performance.now();
  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(canvas);

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    if (!visible) return;

    const targetX = progress * maxX;
    curX += (targetX - curX) * 0.08;
    const camZ = isMobile ? 7.5 : 6.4;
    camera.position.set(curX, 2.9, camZ);
    camera.lookAt(curX, 1.95, 0);

    const idx = Math.round(curX / SP);
    setCaption(Math.max(0, Math.min(desserts.length - 1, idx)));
    bar.style.width = `${progress * 100}%`;

    exhibits.forEach((e, i) => {
      const dist = Math.abs(curX - e.x) / SP;
      const focus = Math.max(0, 1 - dist);
      e.holder.rotation.y += dt * (0.25 + focus * 0.5);
      e.holder.position.y = PED_H + 0.04 + focus * 0.18 + Math.sin(now / 700 + i) * 0.02 * focus;
      e.spot.intensity = 18 + focus * 70;
      e.cone.material.opacity = 0.025 + focus * 0.05;

      v.set(e.x, PED_H + 1.45, 0).project(camera);
      const tag = tagEls[i];
      tag.style.left = `${(v.x * 0.5 + 0.5) * canvas.clientWidth}px`;
      tag.style.top = `${(-v.y * 0.5 + 0.5) * canvas.clientHeight}px`;
      tag.style.opacity = v.z < 1 && Math.abs(v.x) < 1.1 ? 0.35 + focus * 0.65 : 0;
    });

    renderer.render(scene, camera);
  });
}
