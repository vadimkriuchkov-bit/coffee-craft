import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  gsap,
  initSmoothScroll,
  initReveals,
  splitChars,
  hasWebGL,
  conceptBadge,
  footerHTML,
  softDot,
  isMobile,
} from './common.js';
import { rafs, drinks, seasonal, food } from './data.js';

conceptBadge();
document.getElementById('footer').innerHTML = footerHTML();
const lenis = initSmoothScroll();
document.querySelectorAll('.nav a, .logo').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id && id.startsWith('#')) {
      e.preventDefault();
      lenis.scrollTo(id, { offset: -20 });
    }
  })
);

/* ---------- состояние ---------- */
const state = { raf: rafs[0], size: 300 };
const chipsEl = document.getElementById('chips');
const sizesEl = document.getElementById('sizes');
const priceEl = document.getElementById('price');
const textEl = document.getElementById('flavor-text');
const nameEl = document.getElementById('stage-name');

chipsEl.innerHTML = rafs
  .map(
    (r) =>
      `<button class="chip" role="radio" aria-checked="false" data-id="${r.id}"><i style="background:${r.color}"></i>${r.name.replace('Раф ', '').replace(' раф', '')}</button>`
  )
  .join('');
sizesEl.innerHTML = [200, 300, 400].map((s) => `<button role="radio" aria-checked="false" data-size="${s}">${s} мл</button>`).join('');

chipsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (b) selectRaf(rafs.find((r) => r.id === b.dataset.id));
});
sizesEl.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !b.disabled) {
    state.size = +b.dataset.size;
    renderUI();
    cup?.setSize(state.size);
  }
});

const priceObj = { v: 0 };
function renderUI() {
  const r = state.raf;
  if (!r.prices[state.size]) state.size = +Object.keys(r.prices).find((k) => r.prices[k]) || 300;
  chipsEl.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', c.dataset.id === r.id));
  sizesEl.querySelectorAll('button').forEach((b) => {
    const s = +b.dataset.size;
    b.disabled = !r.prices[s];
    b.setAttribute('aria-checked', s === state.size);
  });
  gsap.to(priceObj, {
    v: r.prices[state.size],
    duration: 0.8,
    ease: 'power3.out',
    onUpdate: () => (priceEl.textContent = Math.round(priceObj.v)),
  });
  textEl.textContent = r.text;
  nameEl.textContent = r.name.replace('Раф ', '').replace(' раф', '').replace(/[«»]/g, '');
  document.body.style.setProperty('--tint', r.color);
  document.querySelector('.lab').style.background = `radial-gradient(circle at 75% 45%, ${r.color} 0%, transparent 60%)`;
}
function selectRaf(r) {
  if (!r || r === state.raf) return;
  state.raf = r;
  renderUI();
  cup?.pour(r);
}

/* ---------- 3D-стакан ---------- */
let cup = null;
if (hasWebGL()) cup = makeCup(document.getElementById('cup'));
renderUI();
cup?.pour(state.raf, true);

const chars = splitChars(document.querySelector('.lab-title'));
gsap.from(chars, { yPercent: 110, opacity: 0, rotate: 8, stagger: 0.04, duration: 1.1, ease: 'expo.out', delay: 0.15 });

function makeCup(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 2.1, 9.5);
  camera.lookAt(0, 1.45, 0);

  scene.add(new THREE.AmbientLight('#fff3e2', 0.6));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffb27a', 2.5);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const H0 = 3.0; // базовая высота стакана в локальных единицах
  const RB = 0.82;
  const RT = 1.02;
  const rAt = (y) => RB + (RT - RB) * (y / H0);

  const root = new THREE.Group();
  scene.add(root);
  const glassGroup = new THREE.Group();
  root.add(glassGroup);

  // стекло
  const glassMat = isMobile
    ? new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 })
    : new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 1,
        thickness: 0.25,
        roughness: 0.04,
        ior: 1.45,
        transparent: true,
        envMapIntensity: 1.2,
      });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(RT + 0.05, RB + 0.05, H0, 72, 1, true), glassMat);
  wall.position.y = H0 / 2;
  wall.renderOrder = 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(RB + 0.05, RB + 0.05, 0.22, 72), glassMat);
  base.position.y = -0.11;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(RT + 0.05, 0.03, 12, 72).rotateX(Math.PI / 2), glassMat);
  lip.position.y = H0;
  glassGroup.add(wall, base, lip);

  // крафтовая манжета с надписью
  const sleeveTex = (() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#c89b6d';
    g.fillRect(0, 0, 1024, 160);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(90,55,25,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * 1024, Math.random() * 160, 2 + Math.random() * 4, 1);
    }
    g.fillStyle = '#1b120c';
    g.font = '800 64px Unbounded, Arial Black, sans-serif';
    g.textBaseline = 'middle';
    g.fillText('КОФЕ КРАФТ ✺ РЯЗАНЬ ✺', 16, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = 2;
    return t;
  })();
  const sY0 = 0.95;
  const sY1 = 1.75;
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(rAt(sY1) + 0.075, rAt(sY0) + 0.075, sY1 - sY0, 72, 1, true),
    new THREE.MeshStandardMaterial({ map: sleeveTex, roughness: 0.9, side: THREE.DoubleSide })
  );
  sleeve.position.y = (sY0 + sY1) / 2;
  glassGroup.add(sleeve);

  // жидкость: эспрессо / раф / пенка
  const liqMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 });
  const esp = new THREE.Mesh(new THREE.BufferGeometry(), liqMat('#3a2012'));
  const body = new THREE.Mesh(new THREE.BufferGeometry(), liqMat('#f1dcb4'));
  const foam = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: '#fff6e6', roughness: 0.95 }));
  glassGroup.add(esp, body, foam);
  const L = { level: 0, esp: 0.45, foam: 0.3 };
  function layer(mesh, y0, y1) {
    if (y1 - y0 < 0.005) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.CylinderGeometry(rAt(y1) - 0.02, rAt(y0) - 0.02, y1 - y0, 64);
    mesh.position.y = (y0 + y1) / 2;
  }
  function buildLiquid() {
    const top = L.level;
    const e = Math.min(top, L.esp);
    const f0 = Math.max(e, top - L.foam);
    layer(esp, 0.02, e);
    layer(body, e, f0);
    layer(foam, f0, top);
  }

  // струя
  const stream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.05, 1, 16),
    new THREE.MeshStandardMaterial({ color: '#3a2012', roughness: 0.3 })
  );
  stream.visible = false;
  root.add(stream);

  // тень-пятно
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ map: softDot(THREE, '#1b120c'), transparent: true, opacity: 0.35, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -0.22;
  scene.add(blob);

  // частицы: пар / искры карамели / звёзды
  const dot = softDot(THREE, '#ffffff');
  const parts = [];
  for (let i = 0; i < 60; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { life: 0 };
    root.add(s);
    parts.push(s);
  }
  let pi = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function spawn(kind) {
    const s = parts[pi++ % parts.length];
    const u = s.userData;
    const topY = glassGroup.scale.y * L.level;
    u.kind = kind;
    u.life = 1;
    if (kind === 'steam') {
      s.material.color.set('#ffffff');
      s.position.set(rnd(-0.4, 0.4), topY + 0.1, rnd(-0.4, 0.4));
      u.v = new THREE.Vector3(rnd(-0.1, 0.1), rnd(0.5, 0.8), 0);
      u.size = rnd(0.5, 0.9);
      u.decay = 0.5;
    } else if (kind === 'pop') {
      s.material.color.set(Math.random() < 0.5 ? '#ffb347' : '#ff6a2b');
      s.position.set(rnd(-0.6, 0.6), topY + 0.05, rnd(-0.6, 0.6));
      u.v = new THREE.Vector3(rnd(-1.6, 1.6), rnd(2, 4), rnd(-1.6, 1.6));
      u.size = rnd(0.08, 0.18);
      u.decay = 1.3;
      u.g = true;
    } else {
      s.material.color.set(Math.random() < 0.6 ? '#cfe6ff' : '#ffffff');
      const a = Math.random() * Math.PI * 2;
      const r = rnd(1.6, 2.6);
      s.position.set(Math.cos(a) * r, rnd(0.3, 3.6), Math.sin(a) * r);
      u.v = new THREE.Vector3(0, rnd(0.05, 0.2), 0);
      u.size = rnd(0.08, 0.22);
      u.decay = 0.45;
      u.twinkle = rnd(4, 9);
    }
  }

  // вращение мышью / пальцем
  let rotY = 0.4;
  let vel = 0;
  let dragging = false;
  let lastX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  addEventListener('pointerup', () => (dragging = false));
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    vel = (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  const tilt = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    tilt.x = (e.clientX / innerWidth - 0.5) * 0.25;
    tilt.y = (e.clientY / innerHeight - 0.5) * 0.15;
  });

  let pouring = false;
  let tl = null;
  function pour(r, instant = false) {
    tl?.kill();
    const bodyColor = new THREE.Color(r.color);
    if (instant) {
      body.material.color.copy(bodyColor);
      foam.material.color.set(r.foam);
      esp.material.color.set(r.base || '#3a2012');
      Object.assign(L, { level: 2.75, esp: 0.45, foam: 0.3 });
      buildLiquid();
      current = r;
      return;
    }
    pouring = true;
    tl = gsap.timeline({ onComplete: () => (pouring = false) });
    // слить
    tl.to(L, { level: 0, duration: 0.45, ease: 'power2.in', onUpdate: buildLiquid });
    tl.add(() => {
      L.esp = 0;
      L.foam = 0;
      stream.visible = true;
      stream.material.color.set(r.base || '#3a2012');
      esp.material.color.set(r.base || '#3a2012');
    });
    // эспрессо
    tl.to(L, { level: 0.45, esp: 0.45, duration: 0.6, ease: 'none', onUpdate: buildLiquid });
    // сливки + вкус
    tl.add(() => {
      stream.material.color.set(r.color);
      body.material.color.copy(bodyColor);
      foam.material.color.set(r.foam);
    });
    tl.to(L, { level: 2.45, duration: 1.0, ease: 'power1.inOut', onUpdate: buildLiquid });
    tl.add(() => (stream.visible = false));
    // пенка поднимается
    tl.to(L, { level: 2.75, foam: 0.3, duration: 0.6, ease: 'back.out(2)', onUpdate: buildLiquid });
    tl.add(() => (current = r));
    if (r.pop) tl.add(() => burst(30), '-=0.2');
  }
  function burst(n) {
    for (let i = 0; i < n; i++) spawn('pop');
  }
  let current = rafs[0];

  function setSize(ml) {
    const k = { 200: 0.8, 300: 1, 400: 1.2 }[ml] || 1;
    gsap.to(glassGroup.scale, { y: k, duration: 0.9, ease: 'elastic.out(1, 0.6)' });
    gsap.to(camera.position, { z: 9.5 + (k - 1) * 4, y: 2.1 + (k - 1) * 1.4, duration: 0.9, ease: 'power3.out' });
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let prev = performance.now();
  let acc = 0;
  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(canvas);

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    if (!visible) return;

    if (!dragging) vel += (0.25 * dt - vel) * 0.04;
    rotY += vel;
    vel *= 0.94;
    root.rotation.y = rotY;
    root.rotation.z += (tilt.x * -0.3 - root.rotation.z) * 0.05;
    root.rotation.x += (tilt.y * 0.4 - root.rotation.x) * 0.05;
    root.position.y = Math.sin(now / 900) * 0.06;

    // струя от верха кадра до поверхности
    if (stream.visible) {
      const surf = glassGroup.scale.y * L.level;
      const topY = 6;
      stream.scale.y = topY - surf;
      stream.position.set(0.1, (topY + surf) / 2, 0);
      stream.rotation.y = -root.rotation.y;
    }

    acc += dt;
    if (acc > 0.12) {
      acc = 0;
      if (!pouring && L.level > 1) {
        if (current.stars) spawn('star');
        else spawn('steam');
        if (current.pop && Math.random() < 0.6) spawn('pop');
      }
    }
    parts.forEach((s) => {
      const u = s.userData;
      if (u.life <= 0) {
        s.material.opacity = 0;
        return;
      }
      u.life -= dt * u.decay;
      if (u.g) u.v.y -= 6 * dt;
      s.position.addScaledVector(u.v, dt);
      const k = 1 - u.life;
      if (u.kind === 'steam') {
        s.scale.setScalar(u.size * (0.5 + k * 1.5));
        s.material.opacity = Math.sin(u.life * Math.PI) * 0.45;
      } else if (u.kind === 'pop') {
        s.scale.setScalar(u.size);
        s.material.opacity = Math.min(1, u.life * 2);
      } else {
        s.scale.setScalar(u.size * (0.7 + 0.3 * Math.sin(now / 1000 * u.twinkle)));
        s.material.opacity = Math.sin(u.life * Math.PI);
      }
    });

    renderer.render(scene, camera);
  });

  return { pour, setSize, burst };
}

/* ---------- бегущая строка ---------- */
const items = [...rafs.map((r) => r.name), ...drinks.map((d) => d[0]), ...food.map((f) => f[0])];
document.getElementById('marquee').innerHTML = [...items, ...items].map((t) => `<span>${t}</span>`).join('');

/* ---------- тест ---------- */
const Q = [
  {
    q: 'Утро начинается с…',
    a: [
      ['Будильника в 6:00 и пробежки', ['orange', 'ginger']],
      ['Сериала, который не досмотрел ночью', ['moon', 'caramel']],
      ['Кофе. И только потом всё остальное', ['vanilla', 'peanut']],
      ['Как получится — каждый день сюрприз', ['caramel', 'orange']],
    ],
  },
  {
    q: 'Идеальный вечер в Рязани',
    a: [
      ['Прогулка по кремлю', ['vanilla', 'ginger']],
      ['Тусовка до утра', ['caramel', 'orange']],
      ['Плед, кино и никого', ['peanut', 'moon']],
      ['Смотреть на звёзды за городом', ['moon', 'ginger']],
    ],
  },
  {
    q: 'Выбери цвет',
    a: [
      ['Оранжевый', ['orange']],
      ['Голубой', ['moon']],
      ['Карамельный', ['caramel', 'peanut']],
      ['Сливочный', ['vanilla']],
    ],
  },
  {
    q: 'Твоя суперсила',
    a: [
      ['Заряжаю всех вокруг', ['orange', 'caramel']],
      ['Успокаиваю одним видом', ['vanilla', 'moon']],
      ['Упорство — дожму что угодно', ['peanut', 'ginger']],
      ['Удивляю, даже когда не стараюсь', ['caramel', 'moon']],
    ],
  },
];
const qBox = document.getElementById('quiz-box');
let step = 0;
let score = {};
function renderQ() {
  if (step >= Q.length) return renderResult();
  const q = Q[step];
  qBox.innerHTML = `<div class="q-bar" style="width:${(step / Q.length) * 100}%"></div>
    <div class="q-step">ВОПРОС ${step + 1} ИЗ ${Q.length}</div>
    <div class="q-title">${q.q}</div>
    <div class="q-answers">${q.a.map((a, i) => `<button data-i="${i}">${a[0]}</button>`).join('')}</div>`;
  gsap.from(qBox.querySelectorAll('.q-title, .q-answers button'), { y: 30, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'expo.out' });
}
qBox.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-i]');
  if (!b) return;
  Q[step].a[+b.dataset.i][1].forEach((id) => (score[id] = (score[id] || 0) + 1));
  step++;
  renderQ();
});
function renderResult() {
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
  const r = rafs.find((x) => x.id === best);
  qBox.innerHTML = `<div class="q-bar" style="width:100%"></div>
  <div class="result">
    <div>
      <div class="q-step">ТВОЙ РЕЗУЛЬТАТ</div>
      <div class="q-title">Ты — ${r.name}</div>
      <p style="font-size:18px;font-weight:600;max-width:460px;opacity:.85">${r.text}</p>
      <div class="result-actions">
        <button class="pill orange" id="r-make">Собрать его</button>
        <button class="pill" id="r-copy">Скопировать для сторис</button>
        <button class="pill" id="r-again">Ещё раз</button>
      </div>
      <p id="r-copied" style="opacity:.6;font-size:14px;margin-top:12px"></p>
    </div>
    <div class="result-card" style="background:${r.color}">
      <span class="eyebrow">Кофе Крафт · тест</span>
      <b>Я — ${r.name}</b>
      <span style="font-weight:700">А ты какой раф?</span>
    </div>
  </div>`;
  gsap.from(qBox.querySelector('.result-card'), { y: 80, rotate: 18, opacity: 0, duration: 1, ease: 'expo.out' });
  confetti(r.color);
  document.getElementById('r-make').onclick = () => {
    selectRaf(r);
    lenis.scrollTo('#lab');
  };
  document.getElementById('r-again').onclick = () => {
    step = 0;
    score = {};
    renderQ();
  };
  document.getElementById('r-copy').onclick = async () => {
    const txt = `Я — ${r.name} ☕ А ты какой раф? Пройди тест «Кофе Крафт»: ${location.href.split('#')[0]}#quiz`;
    const msg = document.getElementById('r-copied');
    try {
      await navigator.clipboard.writeText(txt);
      msg.textContent = 'Скопировано. Вставь в сторис или отправь другу.';
    } catch (e) {
      msg.textContent = txt;
    }
  };
}
renderQ();

/* ---------- сезон ---------- */
const emojis = ['🎃', '🍎', '🫐', '🍊'];
document.getElementById('season-grid').innerHTML = seasonal
  .map(([n, p], i) => `<div class="s-card reveal"><div class="emoji">${emojis[i]}</div><div><b>${n}</b><br/><span>${p}</span></div></div>`)
  .join('');

/* ---------- карта лояльности ---------- */
const stampsEl = document.getElementById('stamps');
stampsEl.innerHTML = Array.from({ length: 6 }, (_, i) =>
  `<button class="stamp ${i === 5 ? 'gift' : ''}" aria-label="Отметка ${i + 1}">${i === 5 ? '🎁' : i + 1}</button>`
).join('');
let stamped = 0;
stampsEl.addEventListener('click', () => {
  const all = stampsEl.querySelectorAll('.stamp');
  if (stamped >= 6) {
    stamped = 0;
    all.forEach((s) => s.classList.remove('on'));
    return;
  }
  const s = all[stamped++];
  s.classList.add('on');
  gsap.from(s, { scale: 1.6, duration: 0.5, ease: 'back.out(3)' });
  if (stamped === 6) {
    s.textContent = 'FREE';
    confetti('#ff6a2b');
  }
});

function confetti(color) {
  const cols = [color, '#ff6a2b', '#1b120c', '#f4ead9', '#8db9e6'];
  for (let i = 0; i < 60; i++) {
    const d = document.createElement('div');
    d.className = 'confetti';
    d.style.background = cols[i % cols.length];
    d.style.left = innerWidth / 2 + 'px';
    d.style.top = innerHeight / 2 + 'px';
    document.body.appendChild(d);
    gsap.to(d, {
      x: (Math.random() - 0.5) * innerWidth,
      y: (Math.random() - 0.3) * innerHeight,
      rotate: Math.random() * 720,
      opacity: 0,
      duration: 1.6 + Math.random(),
      ease: 'power3.out',
      onComplete: () => d.remove(),
    });
  }
}

initReveals();
