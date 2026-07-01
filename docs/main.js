/* ============================================================
   Приморская картинная галерея — 3D experience
   Three.js r128 (локальная сборка) + процедурные текстуры
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.GALLERY_DATA;
  const QR = window.QR_DATA;
  const items = DATA.paintings;
  const N = items.length;

  /* ---------- Процедурная "картина" на canvas ---------- */
  // Создаём абстрактное живописное полотно в палитре каждой работы.
  // (Это художественная заставка-абстракция, а не репродукция оригинала.)
  function makeArtCanvas(p, size) {
    const c = document.createElement("canvas");
    c.width = size; c.height = Math.round(size * 1.28);
    const g = c.getContext("2d");
    const W = c.width, H = c.height;
    const [d, m, l] = p.palette;

    // фон-градиент
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, shade(m, -18));
    grad.addColorStop(0.5, d);
    grad.addColorStop(1, shade(d, -22));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    // мягкое световое пятно
    const rg = g.createRadialGradient(W * 0.42, H * 0.36, 10, W * 0.42, H * 0.4, H * 0.7);
    rg.addColorStop(0, hexA(l, 0.30));
    rg.addColorStop(1, hexA(l, 0));
    g.fillStyle = rg; g.fillRect(0, 0, W, H);

    // детерминированный псевдослучай по id
    let seed = p.id * 9277 + 1331;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    // широкие мазки (импрессионистично)
    const cols = [d, m, l, shade(m, 20), shade(l, -15), shade(d, 25)];
    const strokes = 260;
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < strokes; i++) {
      const x = rnd() * W, y = rnd() * H;
      const len = 16 + rnd() * 70, ang = (rnd() - 0.5) * 1.5;
      const w = 4 + rnd() * 12;
      g.save();
      g.translate(x, y); g.rotate(ang);
      g.globalAlpha = 0.18 + rnd() * 0.4;
      g.fillStyle = cols[(rnd() * cols.length) | 0];
      roundRect(g, -len / 2, -w / 2, len, w, w / 2); g.fill();
      g.restore();
    }

    // акцентная "фигура/форма" в центре — намёк на композицию
    g.globalAlpha = 0.9;
    g.save();
    g.translate(W * 0.5, H * 0.52);
    const blobs = 6 + (p.id % 4);
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * Math.PI * 2 + rnd();
      const r = H * (0.12 + rnd() * 0.16);
      g.globalAlpha = 0.10 + rnd() * 0.18;
      g.fillStyle = cols[(rnd() * cols.length) | 0];
      g.beginPath();
      g.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6,
        r * 0.9, r * 0.55, a, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // тонкая золотая текстура-кракелюр
    g.globalAlpha = 0.05;
    g.strokeStyle = "#caa86e"; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      let px = rnd() * W, py = rnd() * H;
      g.moveTo(px, py);
      for (let s = 0; s < 5; s++) { px += (rnd() - 0.5) * 60; py += (rnd() - 0.5) * 60; g.lineTo(px, py); }
      g.stroke();
    }

    // виньетка
    g.globalAlpha = 1;
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);

    // подпись-номер (тиснение)
    g.globalAlpha = 0.5;
    g.fillStyle = hexA(l, 0.5);
    g.font = "italic " + (size * 0.05) + "px Georgia, serif";
    g.textAlign = "right";
    g.fillText("№ " + p.id, W - size * 0.05, H - size * 0.05);

    return c;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function hx(h){h=h.replace('#','');return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
  function shade(h,p){const[r,g,b]=hx(h);const f=v=>Math.max(0,Math.min(255,Math.round(v+(p/100)*255)));return `rgb(${f(r)},${f(g)},${f(b)})`;}
  function hexA(h,a){const[r,g,b]=hx(h);return `rgba(${r},${g},${b},${a})`;}

  /* ======================================================
     THREE.JS SCENE
     ====================================================== */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0910, 0.05);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  const CAM_Z = 17;            // камера дальше радиуса кольца -> активная картина перед нами
  camera.position.set(0, 0.4, CAM_Z);

  let weakDeviceMode = false;
  function getDevicePixelRatio() { return weakDeviceMode ? 1 : Math.min(devicePixelRatio, 2); }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(getDevicePixelRatio());
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // освещение
  scene.add(new THREE.AmbientLight(0x6a6478, 0.55));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.15);
  key.position.set(4, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.PointLight(0xc9a86e, 0.9, 40);
  rim.position.set(-6, 2, 4); scene.add(rim);
  const fill = new THREE.PointLight(0x5a6cff, 0.4, 40);
  fill.position.set(6, -2, -3); scene.add(fill);

  // фоновая "пыль"/частицы
  (function dust() {
    const geo = new THREE.BufferGeometry();
    const cnt = 700, pos = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      pos[i*3] = (Math.random()-0.5)*40;
      pos[i*3+1] = (Math.random()-0.5)*24;
      pos[i*3+2] = (Math.random()-0.5)*30 - 6;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xc9a86e, size: 0.035, transparent: true, opacity: 0.5 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    scene._dust = pts;
  })();

  // мраморный пол с отражательным настроением
  (function floor() {
    const geo = new THREE.PlaneGeometry(80, 80);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0d0a14, roughness: 0.35, metalness: 0.5 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.position.y = -3.2; m.receiveShadow = true;
    scene.add(m);
  })();

  /* ---------- Карусель из 29 рам ---------- */
  const group = new THREE.Group();
  scene.add(group);
  const RADIUS = 11.5;
  const frames = [];

  const texLoaderTextures = [];
  items.forEach((p, i) => {
    // создаём начальный placeholder (процедурная абстракция)
    const art = makeArtCanvas(p, 512);
    const tex = new THREE.CanvasTexture(art);
    tex.anisotropy = 4; tex.encoding = THREE.sRGBEncoding;
    texLoaderTextures[p.id] = art; // может быть canvas или HTMLImageElement

    const canvasMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.58, metalness: 0.04, emissive: 0x0b0b10, emissiveIntensity: 0.08 });
    const cw = 2.2, ch = cw * 1.28;
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), canvasMat);
    canvas.castShadow = true;

    // золочёная рама
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc9a86e, roughness: 0.35, metalness: 0.9 });
    const frameGroup = new THREE.Group();
    const t = 0.16, depth = 0.18;
    const fw = cw + t * 2, fh = ch + t * 2;
    const bars = [
      [fw, t, depth, 0, ch/2 + t/2, 0],
      [fw, t, depth, 0, -ch/2 - t/2, 0],
      [t, ch, depth, -cw/2 - t/2, 0, 0],
      [t, ch, depth, cw/2 + t/2, 0, 0],
    ];
    bars.forEach(b => {
      const mb = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], b[2]), frameMat);
      mb.position.set(b[3], b[4], b[5]); mb.castShadow = true;
      frameGroup.add(mb);
    });
    // тёмная подложка
    const back = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x07060b, roughness: 1 }));
    back.position.z = -0.09;
    frameGroup.add(back);
    canvas.position.z = 0.02;
    frameGroup.add(canvas);

    // если в данных указано поле p.image — попробуем подгрузить фотографию и заменить текстуру
    if (p.image) {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const texImg = new THREE.Texture(img);
          texImg.needsUpdate = true;
          texImg.encoding = THREE.sRGBEncoding;
          texImg.anisotropy = 4;
          canvasMat.map = texImg; canvasMat.needsUpdate = true;
          // сохраним элемент для hero/grid отрисовки
          texLoaderTextures[p.id] = img;
          // обновляем миниатюру в сетке, если она уже создана
          try {
            const cvs = document.querySelectorAll('.gcard canvas');
            cvs.forEach(cv => {
              if (String(cv.dataset.pid) === String(p.id)) {
                const cg = cv.getContext('2d');
                cg.clearRect(0,0,cv.width,cv.height);
                cg.drawImage(img, 0, img.height*0.1, img.width, img.width*0.55, 0, 0, cv.width, cv.height);
              }
            });
          } catch (e) {}
          // если панель открыта на этой картине — перерисовать геро-канвас
          try {
            if (panel.classList.contains('open')) {
              const pid = parseInt(el('pNum').textContent, 10);
              if (pid === p.id) {
                const hero = el('heroArt'); const hg = hero.getContext('2d');
                hero.width = 560; hero.height = 230;
                hg.clearRect(0,0,hero.width,hero.height);
                hg.drawImage(img, 0, img.height*0.18, img.width, img.width*0.41, 0, 0, 560, 230);
              }
            }
          } catch (e) {}
        } catch (e) { console.warn("Ошибка загрузки изображения", p.image, e); }
      };
      img.onerror = () => { console.warn("Не удалось загрузить изображение:", p.image); };
      img.src = p.image;
    }

    // позиция по кругу
    const ang = (i / N) * Math.PI * 2;
    frameGroup.position.set(Math.sin(ang) * RADIUS, 0, Math.cos(ang) * RADIUS);
    frameGroup.rotation.y = ang;
    frameGroup.userData = { index: i, painting: p, canvasMesh: canvas };
    group.add(frameGroup);
    frames.push(frameGroup);
  });

  /* ---------- Состояние карусели ---------- */
  let current = 0;       // отображаемый индекс 0..N-1 (с переносом)
  let rawIndex = 0;      // непрерывный индекс (может расти/убывать без переноса)
  let targetRot = 0;     // целевой поворот группы (рад)
  let curRot = 0;
  const step = (Math.PI * 2) / N;

  function mod(n) { return ((n % N) + N) % N; }

  // переход к ближайшему вхождению idx (без «отмотки» через всё кольцо)
  function goTo(idx) {
    idx = mod(idx);
    let delta = idx - mod(rawIndex);
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    rawIndex += delta;
    current = idx;
    targetRot = -rawIndex * step;
    updateHUD();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gallery:focus', { detail: { id: items[idx].id } }));
    }
  }
  function next() { rawIndex++; current = mod(rawIndex); targetRot = -rawIndex * step; updateHUD(); }
  function prev() { rawIndex--; current = mod(rawIndex); targetRot = -rawIndex * step; updateHUD(); }

  // нормализуем current из targetRot (после drag)
  function syncCurrent() {
    rawIndex = Math.round(-targetRot / step);
    current = mod(rawIndex);
  }

  /* ---------- HUD ---------- */
  const el = id => document.getElementById(id);
  function updateHUD() {
    const p = items[current];
    el("hSection").textContent = p.section;
    el("hTitle").textContent = p.title;
    el("hArtist").textContent = p.artist + " · " + p.date;
    el("hNum").textContent = String(p.id).padStart(2, "0");
  }

  /* ---------- Детальная панель ---------- */
  const panel = el("panel");
  function openPanel(idx) {
    const p = items[idx];
    el("pNum").textContent = String(p.id).padStart(2, "0");
    el("pSection").textContent = p.section;
    el("pTitle").textContent = p.title;
    el("pArtist").textContent = p.artist;
    el("pLife").textContent = p.life;
    el("pDate").textContent = p.date;
    const pt = el("pText"); pt.innerHTML = "";
    p.text.forEach(par => { const e = document.createElement("p"); e.textContent = par; pt.appendChild(e); });
    el("pQR").src = QR[p.id];
    el("pURL").textContent = DATA.base + "/#p=" + p.id;
    // hero-арт
    const hero = el("heroArt");
    const src = texLoaderTextures[p.id];
    hero.width = 560; hero.height = 230;
    const hg = hero.getContext("2d");
    hg.clearRect(0,0,hero.width,hero.height);
    if (src) {
      try {
        const sh = src.height || src.naturalHeight || src.width * 1.28;
        const sw = src.width || src.naturalWidth || 512;
        hg.drawImage(src, 0, sh * 0.18, sw, sw * 0.41, 0, 0, 560, 230);
      } catch (e) { /* fallback: draw placeholder canvas */ hg.drawImage(makeArtCanvas(p,560),0,0,560,230); }
    } else { hg.drawImage(makeArtCanvas(p,560),0,0,560,230); }
    panel.classList.add("open");
    panel.classList.add("animate-in");
    setTimeout(() => panel.classList.remove("animate-in"), 650);
    try { location.hash = "p=" + p.id; } catch (e) {}
  }
  function closePanel() {
    panel.classList.remove("open");
    try { if (location.hash.indexOf("p=") >= 0) history.replaceState(null, "", location.pathname); } catch (e) {}
  }
  el("pClose").onclick = closePanel;
  el("scrim").onclick = closePanel;
  el("openBtn").onclick = () => openPanel(current);

  /* ---------- Grid overlay ---------- */
  const grid = el("grid");
  function buildGrid() {
    const cards = el("cards");
    items.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "gcard";
      const cv = document.createElement("canvas");
      cv.width = 240; cv.height = 170; cv.dataset.pid = p.id;
      const cg = cv.getContext("2d");
      const src = texLoaderTextures[p.id];
      if (src) {
        try {
          const sh = src.height || src.naturalHeight || src.width * 1.28;
          const sw = src.width || src.naturalWidth || 512;
          cg.drawImage(src, 0, sh * 0.1, sw, sw * 0.55, 0, 0, 240, 170);
        } catch (e) { /* silent fallback */ }
      }
      const b = document.createElement("div"); b.className = "gc-b";
      b.innerHTML = `<div class="gc-n">№ ${p.id} · ${p.date}</div>
        <div class="gc-t">${p.title}</div>
        <div class="gc-a">${p.artist}</div>`;
      card.appendChild(cv); card.appendChild(b);
      card.onclick = () => { grid.classList.remove("open"); goTo(i); openPanel(i); };
      cards.appendChild(card);
    });
  }
  el("gridBtn").onclick = () => grid.classList.add("open");
  el("gridClose").onclick = () => grid.classList.remove("open");

  /* ---------- Авто-показ (киоск-режим) ---------- */
  function setAuto(on) {
    autoplay = on;
    el("autoBtn").classList.toggle("active", on);
    el("autoIcon").textContent = on ? "❚❚" : "▶";
    if (on) lastAuto = clock.getElapsedTime(); // инициализируем время при включении
  }
  function stopAuto() { if (autoplay) setAuto(false); }
  el("autoBtn").onclick = () => setAuto(!autoplay);

  /* ---------- Навигация кнопками/клавишами ---------- */
  el("next").onclick = () => { stopAuto(); next(); };
  el("prev").onclick = () => { stopAuto(); prev(); };
  addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { stopAuto(); next(); }
    else if (e.key === "ArrowLeft") { stopAuto(); prev(); }
    else if (e.key === "Escape") { closePanel(); grid.classList.remove("open"); }
    else if (e.key === "Enter") openPanel(current);
    else if (e.key === " ") { e.preventDefault(); setAuto(!autoplay); }
  });

  /* ---------- Drag для вращения + клик по картине ---------- */
  let dragging = false, lastX = 0, moved = 0, zoom = 0, targetZoom = 0;
  let autoplay = false, lastAuto = 0;
  const dom = renderer.domElement;

  function pointerDown(x) { dragging = true; lastX = x; moved = 0; }
  function pointerMove(x) {
    if (!dragging) return;
    const dx = x - lastX; lastX = x; moved += Math.abs(dx);
    targetRot += dx * 0.005;
  }
  function pointerUp() {
    if (!dragging) return;
    dragging = false;
    // притягиваем к ближайшей картине
    targetRot = Math.round(targetRot / step) * step;
    syncCurrent(); updateHUD();
  }
  dom.addEventListener("mousedown", e => { stopAuto(); pointerDown(e.clientX); });
  addEventListener("mousemove", e => pointerMove(e.clientX));
  addEventListener("mouseup", pointerUp);

  // touch: 1 палец — вращение, 2 пальца — пинч-зум
  let pinchStart = 0, pinchZoom0 = 0;
  function dist2(t){const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.hypot(dx,dy);}
  dom.addEventListener("touchstart", e => {
    stopAuto();
    if (e.touches.length === 2) { pinchStart = dist2(e.touches); pinchZoom0 = zoom; dragging = false; }
    else pointerDown(e.touches[0].clientX);
  }, {passive:true});
  addEventListener("touchmove", e => {
    if (e.touches.length === 2 && pinchStart) {
      const r = dist2(e.touches) / pinchStart;
      zoom = Math.max(-1.2, Math.min(2.5, pinchZoom0 - (r - 1) * 2.2));
    } else if (dragging) { pointerMove(e.touches[0].clientX); }
  }, {passive:true});
  addEventListener("touchend", e => { pinchStart = 0; pointerUp(); });

  // raycast клик: если кликнули по боковой картине — выводим её вперёд;
  // если по активной (центральной) — открываем описание.
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  dom.addEventListener("click", e => {
    if (moved > 6) return; // это был drag, не клик
    stopAuto();
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const meshes = frames.map(f => f.userData.canvasMesh);
    const hit = ray.intersectObjects(meshes, false);
    if (hit.length) {
      const idx = hit[0].object.parent.userData.index;
      if (idx === current) openPanel(idx);   // уже в центре -> открыть
      else goTo(idx);                          // вывести вперёд
    }
  });

  // hover-курсор
  dom.addEventListener("mousemove", e => {
    if (dragging) { dom.style.cursor = "grabbing"; return; }
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(frames.map(f => f.userData.canvasMesh), false);
    dom.style.cursor = hit.length ? "pointer" : "grab";
  });

  // зум колесом — только над 3D-сценой, не мешает прокрутке панели/сетки
  dom.addEventListener("wheel", e => {
    if (panel.classList.contains("open") || grid.classList.contains("open")) return;
    stopAuto();
    zoom += e.deltaY * 0.0015;
    zoom = Math.max(-1.2, Math.min(2.5, zoom));
  }, { passive: true });

  /* ---------- Resize ---------- */
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getDevicePixelRatio());
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------- Анимация ---------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    curRot += (targetRot - curRot) * 0.08;
    group.rotation.y = curRot;

    // лёгкое "дыхание" камеры + плавный зум
    targetZoom += (zoom - targetZoom) * 0.1;
    const camLift = 0.28 + Math.sin(t * 0.4) * 0.12;
    camera.position.z = CAM_Z + targetZoom * 5;
    camera.position.y = camLift;
    camera.lookAt(0, 0, 0);

    // активная рамка выдвигается вперёд (к камере) и мягко подсвечивается
    frames.forEach((f, i) => {
      const isActive = i === current;
      const tz = isActive ? 1.65 : 0;          // выдвижение вдоль радиуса наружу (к камере)
      const ty = isActive ? Math.sin(t * 1.4) * 0.07 : 0;
      f.userData._z = (f.userData._z || 0) + (tz - (f.userData._z || 0)) * 0.08;
      const ang = (i / N) * Math.PI * 2;
      const baseX = Math.sin(ang) * RADIUS, baseZ = Math.cos(ang) * RADIUS;
      const out = 1 + f.userData._z / RADIUS;
      f.position.set(baseX * out, ty, baseZ * out);
      const sc = 1 + f.userData._z * 0.12;
      f.scale.setScalar(sc);
      // подсветка картины: активная ярче, остальные приглушены
      const tg = isActive ? 1.0 : 0.42;
      const cm = f.userData.canvasMesh.material;
      cm.userData.lit = (cm.userData.lit === undefined ? tg : cm.userData.lit + (tg - cm.userData.lit) * 0.08);
      cm.emissive = cm.emissive || new THREE.Color(0, 0, 0);
      const e = (cm.userData.lit - 0.42) * 0.28;
      const glow = isActive ? 0.18 + cm.userData.lit * 0.08 : 0.02;
      cm.emissive.setRGB(e + glow, e * 0.92 + glow * 0.6, e * 0.78 + glow * 0.2);
      cm.color.setScalar(0.55 + cm.userData.lit * 0.45);
    });

    if (scene._dust) scene._dust.rotation.y = t * 0.02;
    rim.position.x = Math.sin(t * 0.5) * 6;

    // авто-показ (киоск): неспешная смена картин каждые 4.5 сек
    if (autoplay && !panel.classList.contains("open") && !grid.classList.contains("open")) {
      const autoInterval = 4.5;
      if (t - lastAuto >= autoInterval) { 
        lastAuto = t; 
        next(); 
      }
    }

    renderer.render(scene, camera);
  }

  /* ---------- Loader sequence ---------- */
  (function runLoader() {
    let pct = 0;
    const fill = el("barFill"), pctEl = el("pct");
    const iv = setInterval(() => {
      pct += Math.random() * 16 + 6;
      if (pct >= 100) { pct = 100; clearInterval(iv); finish(); }
      fill.style.width = pct + "%";
      pctEl.textContent = Math.floor(pct) + "%";
    }, 130);
    function finish() {
      setTimeout(() => el("loader").classList.add("hidden"), 350);
    }
  })();

  /* ---------- init ---------- */
  buildGrid();
  updateHUD();
  animate();

  /* ---------- Weak-device + Mini-map UI ---------- */
  (function uiExtras() {
    const weakBtn = el('weakBtn');
    function applyWeakDeviceMode() {
      weakBtn.classList.toggle('active', weakDeviceMode);
      weakBtn.querySelector('.icon').textContent = '🐢';
      weakBtn.querySelector('.label').textContent = weakDeviceMode ? 'Слабое устройство: вкл' : 'Слабое устройство';
      renderer.shadowMap.enabled = !weakDeviceMode;
      key.castShadow = !weakDeviceMode;
      renderer.setPixelRatio(getDevicePixelRatio());
      renderer.setSize(innerWidth, innerHeight, false);
      if (scene._dust) scene._dust.visible = !weakDeviceMode;
    }
    weakBtn.onclick = () => {
      weakDeviceMode = !weakDeviceMode;
      applyWeakDeviceMode();
    };
    applyWeakDeviceMode();

    // мини-карта
    const map = el('map'); const mapBtn = el('mapBtn'); const mapClose = el('mapClose'); const mapList = el('mapList');
    function buildMap() {
      const sections = {};
      items.forEach((p, i) => { if (!sections[p.section]) sections[p.section] = []; sections[p.section].push(i); });
      mapList.innerHTML = '';
      Object.keys(sections).forEach(sec => {
        const row = document.createElement('div'); 
        row.className = 'map-section';
        const h = document.createElement('div'); 
        h.className = 'map-section-title';
        h.textContent = sec; 
        row.appendChild(h);
        const list = document.createElement('div'); 
        list.className = 'map-numbers';
        sections[sec].forEach(idx => {
          const p = items[idx];
          const entry = document.createElement('button');
          entry.className = 'map-entry';
          entry.innerHTML = `
            <img class="map-thumb" src="${p.image || 'images/01.jpg'}" alt="${p.title}">
            <span class="map-label">
              <strong>№ ${String(p.id).padStart(2,'0')}</strong>
              <span>${p.title}</span>
            </span>`;
          entry.onclick = () => { map.style.display='none'; goTo(idx); openPanel(idx); };
          if (idx === current) entry.classList.add('active');
          list.appendChild(entry);
        });
        row.appendChild(list); 
        mapList.appendChild(row);
      });
    }
    mapBtn.onclick = () => { buildMap(); map.style.display = map.style.display === 'none' ? 'block' : 'none'; };
    mapClose.onclick = () => { map.style.display = 'none'; };
  })();

  // глубинная ссылка #p=N
  function applyHash() {
    const m = location.hash.match(/p=(\d+)/);
    if (m) {
      const id = parseInt(m[1], 10);
      const idx = items.findIndex(p => p.id === id);
      if (idx >= 0) { goTo(idx); curRot = targetRot; setTimeout(() => openPanel(idx), 900); }
    }
  }
  applyHash();
})();
