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
  softDot,
  textTexture,
  isMobile,
  reducedMotion,
} from './common.js';
import { drinks, rafs, desserts, shops, shopStatus, food } from './data.js';

/* ---------- контент ---------- */
document.getElementById('drinks').innerHTML = [...drinks.slice(0, 5), ...food.slice(0, 3)]
  .map(([n, p]) => `<li><span>${n}</span><span>${p}</span></li>`)
  .join('');
document.getElementById('rafs').innerHTML = rafs
  .map(
    (r) =>
      `<div class="raf-chip" style="background:${r.color}"><span>${r.name}</span><small>от ${Math.min(
        ...Object.values(r.prices)
      )} ₽</small></div>`
  )
  .join('');
document.getElementById('desserts').innerHTML = desserts
  .map((d) => `<li><span>${d.name}</span><span>${d.price}</span></li>`)
  .join('');
document.getElementById('shops').innerHTML = shops
  .map((s) => {
    const st = shopStatus(s);
    const cls = st.open ? 'dot-open' : st.open === false ? 'dot-closed' : 'dot-unknown';
    return `<li><b>${s.title}</b><small>${s.note}</small><small class="${cls}">● ${st.text} · ${s.phone}</small></li>`;
  })
  .join('');
document.getElementById('footer').innerHTML = footerHTML();
conceptBadge();

initSmoothScroll();
initReveals();

const chars = splitChars(document.querySelector('.hero-title'));
gsap.from(chars, {
  yPercent: 120,
  rotate: 12,
  opacity: 0,
  duration: 1.2,
  ease: 'expo.out',
  stagger: 0.035,
  delay: 0.2,
});

/* ---------- прогресс маршрута ---------- */
let target = 0;
ScrollTrigger.create({
  trigger: 'main',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => (target = self.progress),
});
const ticketBar = document.getElementById('ticket-progress');
const ticketStops = [...document.querySelectorAll('.ticket-stops li')];

if (!hasWebGL()) {
  document.getElementById('scene').remove();
  document.body.style.background = 'linear-gradient(#ead6b8, #c89b6d)';
} else {
  initScene();
}

function initScene() {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const bg = new THREE.Color('#ead6b8');
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 18, 60);

  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 48, innerWidth / innerHeight, 0.1, 200);

  /* свет */
  scene.add(new THREE.HemisphereLight('#fff4e2', '#b98a5c', 1.6));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -14;
  sc.right = sc.top = 14;
  sc.near = 1;
  sc.far = 60;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  /* материалы — «игрушечные», матовые */
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
  const mat = {
    espresso: M('#2b1b11'),
    orange: M('#ff6a2b', { roughness: 0.5 }),
    cream: M('#fff4e0'),
    kraft: M('#c89b6d'),
    kraftDark: M('#a87a4c'),
    rail: M('#6b4a33', { metalness: 0.5, roughness: 0.4 }),
    bean: M('#3b2416', { roughness: 0.45 }),
    glass: M('#ffffff', { transparent: true, opacity: 0.35, roughness: 0.1 }),
    window: M('#ffd27a', { emissive: '#ffb347', emissiveIntensity: 0.9 }),
    pink: M('#ff9fb8', { roughness: 0.4 }),
    lavender: M('#b9a3d9'),
  };

  /* земля из крафт-бумаги */
  const groundTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e1c39a';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3500; i++) {
      g.fillStyle = `rgba(${120 + Math.random() * 60},${80 + Math.random() * 40},${40 + Math.random() * 30},${Math.random() * 0.12})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 60);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 320), M('#ffffff', { map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -50;
  ground.receiveShadow = true;
  scene.add(ground);

  /* маршрут */
  const curve = new THREE.CatmullRomCurve3(
    [
      [0, 0, 12],
      [3, 0, 0],
      [-4, 0, -14],
      [4, 0, -30],
      [-4, 0, -46],
      [5, 0, -62],
      [-3, 0, -78],
      [2, 0, -94],
      [0, 0, -108],
    ].map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal'
  );
  const LEN = curve.getLength();
  const UP = new THREE.Vector3(0, 1, 0);
  const frameAt = (t) => {
    t = THREE.MathUtils.clamp(t, 0, 1);
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    return { p, tan, side };
  };

  // рельсы
  const N = 700;
  [-0.45, 0.45].forEach((off) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const { p, side } = frameAt(i / N);
      pts.push(p.clone().addScaledVector(side, off).setY(0.16));
    }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, 0.05, 6), mat.rail);
    rail.castShadow = true;
    scene.add(rail);
  });
  // шпалы
  const sleeperCount = Math.floor(LEN / 0.55);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, 0.1, 0.24), mat.kraftDark, sleeperCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < sleeperCount; i++) {
    const { p, tan } = frameAt(i / sleeperCount);
    dummy.position.copy(p).setY(0.06);
    dummy.lookAt(p.clone().add(tan).setY(0.06));
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.receiveShadow = true;
  scene.add(sleepers);

  /* поезд */
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 20).rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12).rotateZ(Math.PI / 2);
  const wheels = [];
  function addWheels(group, zs) {
    zs.forEach((z) =>
      [-0.62, 0.62].forEach((x) => {
        const w = new THREE.Group();
        w.add(new THREE.Mesh(wheelGeo, mat.espresso), new THREE.Mesh(hubGeo, mat.cream));
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.06), mat.cream);
        w.add(spoke);
        w.position.set(x, 0.32, z);
        group.add(w);
        wheels.push(w);
      })
    );
  }
  const shadowAll = (g) => g.traverse((o) => o.isMesh && (o.castShadow = true));

  function makeCup(scale = 1) {
    const g = new THREE.Group();
    const prof = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.34, 0),
      new THREE.Vector2(0.48, 1.1),
      new THREE.Vector2(0.46, 1.1),
    ];
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 32), mat.kraft));
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.455, 0.4, 0.42, 32, 1, true), mat.espresso);
    sleeve.position.y = 0.55;
    g.add(sleeve);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32), mat.cream);
    lid.position.y = 1.14;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.cream);
    dome.scale.y = 0.35;
    dome.position.y = 1.18;
    g.add(lid, dome);
    g.scale.setScalar(scale);
    return g;
  }

  const loco = new THREE.Group();
  {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 2.5), mat.espresso);
    chassis.position.y = 0.5;
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.5, 28).rotateX(Math.PI / 2), mat.orange);
    boiler.position.set(0, 1.0, 0.35);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.12, 28).rotateX(Math.PI / 2), mat.cream);
    cap.position.set(0, 1.0, 1.12);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat.window);
    lamp.position.set(0, 1.1, 1.2);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.6, 20), mat.espresso);
    chimney.position.set(0, 1.7, 0.75);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), mat.cream);
    dome.position.set(0, 1.45, 0.15);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 0.95), mat.cream);
    cab.position.set(0, 1.15, -0.7);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 1.15), mat.espresso);
    roof.position.set(0, 1.74, -0.7);
    const winGeo = new THREE.PlaneGeometry(0.42, 0.36);
    [-0.581, 0.581].forEach((x) => {
      const w = new THREE.Mesh(winGeo, mat.window);
      w.position.set(x, 1.3, -0.7);
      w.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      loco.add(w);
    });
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.3),
      new THREE.MeshBasicMaterial({ map: textTexture(THREE, ['КК'], { w: 256, h: 96, size: 64, bg: '#ff6a2b' }) })
    );
    plate.position.set(0.47, 1.0, 0.35);
    plate.rotation.y = Math.PI / 2;
    const plate2 = plate.clone();
    plate2.position.x = -0.47;
    plate2.rotation.y = -Math.PI / 2;
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.15), mat.orange);
    bumper.position.set(0, 0.5, 1.3);
    loco.add(chassis, boiler, cap, lamp, chimney, dome, cab, roof, plate, plate2, bumper);
    addWheels(loco, [0.8, 0.05, -0.75]);
    shadowAll(loco);
  }
  const chimneyTop = new THREE.Object3D();
  chimneyTop.position.set(0, 2.05, 0.75);
  loco.add(chimneyTop);

  const cupCar = new THREE.Group();
  {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.9), mat.kraft);
    bed.position.y = 0.5;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 2.0), mat.espresso);
    rim.position.y = 0.38;
    const cup = makeCup(1);
    cup.position.y = 0.61;
    cupCar.add(bed, rim, cup);
    addWheels(cupCar, [0.55, -0.55]);
    shadowAll(cupCar);
  }
  const cupTop = new THREE.Object3D();
  cupTop.position.set(0, 1.95, 0);
  cupCar.add(cupTop);

  const sweetCar = new THREE.Group();
  {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.9), mat.cream);
    bed.position.y = 0.5;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 2.0), mat.espresso);
    rim.position.y = 0.38;
    const dough = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.2, 18, 36).rotateX(Math.PI / 2), M('#e0a86a'));
    dough.position.set(0, 0.82, 0.3);
    const glaze = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.17, 18, 36).rotateX(Math.PI / 2), mat.pink);
    glaze.position.set(0, 0.9, 0.3);
    glaze.scale.y = 0.7;
    const sprinkles = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.02, 0.07, 2, 6), M('#ffffff'), 40);
    const cols = ['#ffffff', '#ff6a2b', '#8db9e6', '#2b1b11'];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.38 + (Math.random() - 0.5) * 0.22;
      dummy.position.set(Math.cos(a) * r, 1.01, 0.3 + Math.sin(a) * r);
      dummy.rotation.set(Math.PI / 2, 0, Math.random() * 3);
      dummy.updateMatrix();
      sprinkles.setMatrixAt(i, dummy.matrix);
      sprinkles.setColorAt(i, new THREE.Color(cols[i % 4]));
    }
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.55), mat.orange);
    box.position.set(0, 0.81, -0.5);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.08), mat.cream);
    ribbon.position.copy(box.position);
    sweetCar.add(bed, rim, dough, glaze, sprinkles, box, ribbon);
    addWheels(sweetCar, [0.55, -0.55]);
    shadowAll(sweetCar);
  }
  const cars = [
    { obj: loco, gap: 0 },
    { obj: cupCar, gap: 2.75 },
    { obj: sweetCar, gap: 5.1 },
  ];
  cars.forEach((c) => scene.add(c.obj));

  /* декорации */
  const rand = (a, b) => a + Math.random() * (b - a);
  // кофейные зёрна вместо камней
  const beanCount = isMobile ? 220 : 420;
  const beans = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat.bean, beanCount);
  for (let i = 0; i < beanCount; i++) {
    const { p, side } = frameAt(Math.random());
    const off = (Math.random() < 0.5 ? -1 : 1) * rand(2.4, 22);
    const s = Math.abs(off) < 9 ? rand(0.15, 0.38) : rand(0.3, 0.8);
    dummy.position.copy(p).addScaledVector(side, off).setY(s * 0.45);
    dummy.rotation.set(rand(-0.3, 0.3), rand(0, 6.28), rand(-0.3, 0.3));
    dummy.scale.set(s, s * 0.6, s * 1.4);
    dummy.updateMatrix();
    beans.setMatrixAt(i, dummy.matrix);
  }
  beans.castShadow = true;
  scene.add(beans);

  // деревья-леденцы
  const treeCols = [mat.orange, mat.cream, mat.kraftDark, mat.lavender, M('#8db9e6')];
  for (let i = 0; i < (isMobile ? 40 : 80); i++) {
    const { p, side } = frameAt(Math.random());
    const off = (Math.random() < 0.5 ? -1 : 1) * rand(11, 30);
    const h = rand(1.2, 3.2);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 8), mat.espresso);
    trunk.position.y = h / 2;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rand(0.6, 1.1), 20, 14), treeCols[i % treeCols.length]);
    crown.position.y = h + 0.4;
    tree.add(trunk, crown);
    tree.position.copy(p).addScaledVector(side, off).setY(0);
    shadowAll(tree);
    scene.add(tree);
  }

  // вывески станций
  function sign(lines, t, sideSign, dist = 4.5) {
    const { p, side, tan } = frameAt(t);
    const g = new THREE.Group();
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.2, 0.12),
      [mat.espresso, mat.espresso, mat.espresso, mat.espresso,
        new THREE.MeshBasicMaterial({ map: textTexture(THREE, lines, { size: 78 }) }), mat.espresso]
    );
    board.position.y = 2.6;
    [-1.3, 1.3].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), mat.espresso);
      post.position.set(x, 1.1, 0);
      g.add(post);
    });
    g.add(board);
    g.position.copy(p).addScaledVector(side, sideSign * dist);
    g.lookAt(p.clone().addScaledVector(tan, -6).setY(0));
    shadowAll(g);
    scene.add(g);
    return g;
  }
  function placeAt(obj, t, sideSign, dist) {
    const { p, side } = frameAt(t);
    obj.position.copy(p).addScaledVector(side, sideSign * dist);
    shadowAll(obj);
    scene.add(obj);
    return obj;
  }

  sign(['ВОКЗАЛ', 'КОФЕ КРАФТ · РЯЗАНЬ'], 0.06, -1, 3.2);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 8), mat.cream);
  placeAt(platform, 0.05, -1, 2.2).position.y = 0.17;

  // станция «Кофе» — гигантский стакан
  const steamSources = [];
  sign(['КОФЕ', 'АВТОРСКИЙ · СПЕШЕЛТИ'], 0.2, -1);
  const bigCup = placeAt(makeCup(4.2), 0.24, -1, 9);
  const bigCupTop = new THREE.Object3D();
  bigCupTop.position.set(0, 5.4, 0);
  bigCup.add(bigCupTop);
  steamSources.push({ o: bigCupTop, rate: 0.25, size: 3.5 });

  // станция «Раф» — шесть стаканов разных цветов
  sign(['РАФ', '6 ВКУСОВ'], 0.42, 1);
  rafs.forEach((r, i) => {
    const glass = new THREE.Group();
    const h = 2.2 + (i % 3) * 0.5;
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, h * 0.82, 28), M(r.color, { roughness: 0.35 }));
    liquid.position.y = h * 0.41;
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.62, h * 0.12, 28), M(r.foam));
    foam.position.y = h * 0.82 + h * 0.06;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.58, h, 28, 1, true), mat.glass);
    shell.position.y = h / 2;
    glass.add(liquid, foam, shell);
    placeAt(glass, 0.44 + i * 0.012, 1, 7 + (i % 2) * 2);
  });

  // станция «Кондитерская» — большой лавандовый торт
  sign(['ДЕСЕРТЫ', 'СВОЯ КОНДИТЕРСКАЯ'], 0.63, -1);
  const cake = new THREE.Group();
  [[2.6, 1.0, mat.lavender], [2.62, 0.25, mat.cream], [2.0, 0.9, mat.lavender], [2.02, 0.22, mat.cream], [1.4, 0.8, mat.lavender]].reduce(
    (y, [r, h, m]) => {
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), m);
      tier.position.y = y + h / 2;
      cake.add(tier);
      return y + h;
    },
    0
  );
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), M('#d6213b', { roughness: 0.25 }));
  cherry.position.y = 3.6;
  cake.add(cherry);
  for (let i = 0; i < 14; i++) {
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), M('#5b3b8c', { roughness: 0.3 }));
    const a = (i / 14) * Math.PI * 2;
    berry.position.set(Math.cos(a) * 1.25, 3.17, Math.sin(a) * 1.25);
    cake.add(berry);
  }
  placeAt(cake, 0.67, -1, 9);

  // станция «6 кофеен» — шесть домиков
  sign(['6 КОФЕЕН', 'ПО ВСЕЙ РЯЗАНИ'], 0.85, 1);
  shops.forEach((s, i) => {
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 2), i % 2 ? mat.cream : mat.kraft);
    body.position.y = 0.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.2, 4), i % 2 ? mat.orange : mat.espresso);
    roof.position.y = 2.4;
    roof.rotation.y = Math.PI / 4;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.6), mat.window);
    win.position.set(0, 1.1, 1.01);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), mat.espresso);
    door.position.set(0.6, 0.45, 1.01);
    house.add(body, roof, win, door);
    const h = placeAt(house, 0.86 + i * 0.018, 1, 8 + (i % 2) * 3.5);
    h.rotation.y = rand(-0.5, 0.5);
  });
  sign(['ЗАХОДИ', 'НА КОФЕ'], 0.985, -1, 3);

  /* пар */
  const steamTex = softDot(THREE, '#ffffff');
  const puffs = [];
  for (let i = 0; i < 70; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.life = 0;
    scene.add(s);
    puffs.push(s);
  }
  let puffIdx = 0;
  const tmpV = new THREE.Vector3();
  function emit(src, size) {
    const s = puffs[puffIdx++ % puffs.length];
    src.getWorldPosition(tmpV);
    s.position.copy(tmpV);
    s.userData.life = 1;
    s.userData.size = size;
    s.userData.vx = rand(-0.2, 0.2);
    s.userData.vz = rand(-0.2, 0.2);
  }
  steamSources.push({ o: chimneyTop, rate: 0.07, size: 0.9 }, { o: cupTop, rate: 0.16, size: 0.55 });
  steamSources.forEach((s) => (s.acc = 0));

  /* цикл */
  let cur = 0;
  let lastT = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let prevNow = performance.now();
  const tVec = new THREE.Vector3();

  function place(t) {
    cars.forEach(({ obj, gap }) => {
      const tt = t - gap / LEN;
      const { p, tan } = frameAt(tt);
      obj.position.copy(p).setY(0.02);
      obj.lookAt(tVec.copy(p).add(tan).setY(0.02));
    });
  }

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - prevNow) / 1000, 0.05);
    prevNow = now;
    cur += (target - cur) * (reducedMotion ? 1 : 0.07);
    const t = 0.03 + cur * 0.94;
    place(t);

    // колёса крутятся пропорционально пройденному пути
    if (lastT !== null) {
      const dist = (t - lastT) * LEN;
      wheels.forEach((w) => (w.rotation.x += dist / 0.3));
    }
    const speed = lastT === null ? 0 : Math.abs(t - lastT) * LEN / Math.max(dt, 1e-3);
    lastT = t;

    // камера: на старте — широкий план, дальше — за поездом
    const intro = THREE.MathUtils.smoothstep(cur, 0, 0.06);
    const f = frameAt(t);
    const back = frameAt(t - THREE.MathUtils.lerp(0.02, 0.075, intro));
    const sideOff = THREE.MathUtils.lerp(isMobile ? 7 : 9, 3.2, intro);
    const height = THREE.MathUtils.lerp(isMobile ? 7 : 4.2, isMobile ? 6.2 : 4.6, intro);
    tVec.copy(back.p).addScaledVector(back.side, sideOff).setY(height);
    camPos.lerp(tVec, cur < 0.001 && camPos.lengthSq() === 0 ? 1 : 0.08);
    tVec.copy(frameAt(t + 0.03 * intro).p).setY(1.0);
    // на первом экране сдвигаем взгляд, чтобы поезд стоял справа от заголовка
    if (!isMobile) tVec.addScaledVector(f.side, (1 - intro) * 4.5);
    camLook.lerp(tVec, 0.1);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // тень едет за поездом
    sun.position.copy(f.p).add(new THREE.Vector3(8, 16, 6));
    sun.target.position.copy(f.p);

    // пар: из трубы сильнее, когда едем
    steamSources.forEach((s) => {
      const boost = s.o === chimneyTop ? 1 + Math.min(speed, 12) * 0.5 : 1;
      s.acc += dt * boost;
      while (s.acc > s.rate) {
        s.acc -= s.rate;
        emit(s.o, s.size);
      }
    });
    puffs.forEach((s) => {
      const u = s.userData;
      if (u.life <= 0) {
        s.material.opacity = 0;
        return;
      }
      u.life -= dt * 0.55;
      s.position.y += dt * 1.4;
      s.position.x += u.vx * dt;
      s.position.z += u.vz * dt;
      const k = 1 - u.life;
      s.scale.setScalar(u.size * (0.4 + k * 1.6));
      s.material.opacity = Math.sin(Math.min(u.life, 1) * Math.PI) * 0.7;
    });

    // билет-маршрут
    ticketBar.style.height = `${cur * 100}%`;
    const idx = Math.min(ticketStops.length - 1, Math.round(cur * (ticketStops.length - 1)));
    ticketStops.forEach((li, i) => li.classList.toggle('active', i === idx));

    renderer.render(scene, camera);
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
