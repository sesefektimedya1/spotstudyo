/* Stüdyo: pencereli (Sound Forge mantığında) çalışma alanı */
(async function () {
  'use strict';
  var oturum = await korumali('studyo'); if (!oturum) return;
  var SR = Motor.SR, A = Araclar, ctx = null;
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR }); if (ctx.state === 'suspended') ctx.resume(); return ctx; }

  var S = { pen: [], aktif: null, sayac: 0, z0: 10, pano: null, iz: null, tab: 'manuel', mesgul: false, z: Motor.varsayilanZincir(), tarzNo: -1, sonuc: null, sonucAd: 'Spot', kut: { muzikler: [], sesler: [] }, cache: {}, cal: null, calP: null, imlecCal: 0 };
  var alan = $('#alan');

  function mesaj(m) { $('#dMesaj').textContent = m || ''; }
  function bekle() { return new Promise(function (r) { setTimeout(r, 30); }); }
  function sn(x) { var m = Math.floor(x / 60), s = x - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function hata(e) { console.error(e); mesaj(''); toast(e && e.message ? e.message : String(e)); }
  function tekKanal(b) { var n = b.length, o = new Float32Array(n), c = b.numberOfChannels, i, k; for (k = 0; k < c; k++) { var d = b.getChannelData(k); for (i = 0; i < n; i++) o[i] += d[i] / c; } return o; }
  function stereoAl(b) { var L = b.getChannelData(0).slice(); if (b.numberOfChannels < 2) return { L: L, R: L }; var R = b.getChannelData(1).slice(); return { L: L, R: R }; }
  async function coz(ab) { return await ac().decodeAudioData(ab); }
  function mono(L, R) { if (L === R) return L; var o = new Float32Array(L.length); for (var i = 0; i < o.length; i++) o[i] = 0.5 * (L[i] + R[i]); return o; }

  /* ---------- Pencereler ---------- */
  var RENK = { ses: '#1f55a8', muzik: '#17855a', sonuc: '#3b4350', kayit: '#c23b2e' };
  function akt() { return S.pen.filter(function (p) { return p.id === S.aktif; })[0] || null; }
  function pencereAc(ad, L, R, tur) {
    var p = { id: ++S.sayac, ad: ad, tur: tur || 'ses', L: L, R: R || L, sec: null, imlec: 0, bas: 0, spp: 1, vz: 1, undo: [], redo: [], ov: null };
    var el = document.createElement('div'); el.className = 'pen';
    el.innerHTML = '<div class="bas"><i class="tur"></i><b></b><small></small><button class="x" title="Pencereyi kapat">✕</button></div><div class="ov" title="Genel görünüm: tıklayıp sürükleyerek gezinin"><canvas></canvas></div><div class="dalga"><canvas class="cv"></canvas></div><div class="kay" title="Kaydırma çubuğu"><div class="th"></div></div><div class="zb"><span>Zaman</span><button class="btn kucuk" data-z="-" title="Uzaklaştır">−</button><button class="btn kucuk" data-z="+" title="Yakınlaştır">+</button><button class="btn kucuk" data-z="t" title="Tamamını göster">Tümü</button><i class="ay"></i><span>Seviye</span><button class="btn kucuk" data-v="-" title="Dalgayı küçült">−</button><button class="btn kucuk" data-v="+" title="Dalgayı büyüt">+</button><button class="btn kucuk" data-v="1" title="Seviye ölçeğini sıfırla">1×</button><span class="sure"></span></div>';
    alan.appendChild(el); p.el = el; p.cv = $('.cv', el); p.ovc = $('.ov canvas', el); p.kay = $('.kay', el); p.th = $('.th', el);
    var w = alan.clientWidth, h = alan.clientHeight, n = S.pen.length;
    var gen = Math.max(420, w - 40 - 28 * 5), yuk = Math.max(260, h - 30 - 28 * 5);
    el.style.width = gen + 'px'; el.style.height = yuk + 'px'; el.style.left = (14 + (n % 6) * 28) + 'px'; el.style.top = (10 + (n % 6) * 28) + 'px';
    S.pen.push(p); $('.tur', el).style.background = RENK[p.tur]; $('.bas b', el).textContent = ad;
    baglaPencere(p); odak(p); tumuGoster(p); $('#bosAlan').style.display = 'none'; guncelle();
    if (window.ResizeObserver) new ResizeObserver(function () { if (p.el.isConnected) ciz(p); }).observe(p.el);
    return p;
  }
  function odak(p) { S.aktif = p ? p.id : null; S.pen.forEach(function (q) { q.el.classList.toggle('aktif', q === p); }); if (p) p.el.style.zIndex = ++S.z0; guncelle(); }
  function kapat(p) {
    if (!p) return; if (S.calP === p) durdur(); p.el.remove(); S.pen = S.pen.filter(function (q) { return q !== p; });
    if (S.aktif === p.id) { S.aktif = null; var son = S.pen[S.pen.length - 1]; if (son) odak(son); }
    if (!S.pen.length) $('#bosAlan').style.display = 'flex'; guncelle(); otoListeleri();
  }
  function baglaPencere(p) {
    var el = p.el;
    el.addEventListener('mousedown', function () { if (S.aktif !== p.id) odak(p); }, true);
    $('.x', el).onclick = function () { kapat(p); };
    // taşıma
    $('.bas', el).addEventListener('mousedown', function (e) {
      if (e.target.tagName === 'BUTTON') return; var x0 = e.clientX, y0 = e.clientY, l0 = el.offsetLeft, t0 = el.offsetTop; e.preventDefault();
      function mv(ev) { el.style.left = (l0 + ev.clientX - x0) + 'px'; el.style.top = Math.max(0, t0 + ev.clientY - y0) + 'px'; }
      function up() { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }
      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    $('.bas', el).addEventListener('dblclick', function (e) { if (e.target.tagName !== 'BUTTON') tumuGoster(p), ciz(p); });
    $$('[data-z]', el).forEach(function (b) { b.onclick = function () { var v = b.dataset.z; if (v === '+') zoomT(p, 0.6); else if (v === '-') zoomT(p, 1.6); else { tumuGoster(p); ciz(p); } }; });
    $$('[data-v]', el).forEach(function (b) { b.onclick = function () { var v = b.dataset.v; p.vz = v === '+' ? Math.min(64, p.vz * 1.6) : (v === '-' ? Math.max(0.1, p.vz / 1.6) : 1); ciz(p); }; });
    secimBagla(p);
    // genel görünüm
    var ovSur = false;
    function ovGit(e) { var r = p.ovc.getBoundingClientRect(), n = p.L.length, goruntu = gW(p) * p.spp; p.bas = Math.max(0, Math.min(Math.max(0, n - goruntu), (e.clientX - r.left) / r.width * n - goruntu / 2)); ciz(p); }
    $('.ov', el).addEventListener('mousedown', function (e) { ovSur = true; ovGit(e); });
    window.addEventListener('mousemove', function (e) { if (ovSur) ovGit(e); });
    window.addEventListener('mouseup', function () { ovSur = false; });
    // kaydırma çubuğu
    p.th.addEventListener('mousedown', function (e) {
      e.stopPropagation(); e.preventDefault(); var x0 = e.clientX, b0 = p.bas, W = p.kay.clientWidth, n = p.L.length;
      function mv(ev) { var goruntu = gW(p) * p.spp; p.bas = Math.max(0, Math.min(Math.max(0, n - goruntu), b0 + (ev.clientX - x0) / W * n)); ciz(p); }
      function up() { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }
      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    p.kay.addEventListener('mousedown', function (e) { if (e.target !== p.kay) return; var r = p.kay.getBoundingClientRect(), n = p.L.length, goruntu = gW(p) * p.spp; p.bas = Math.max(0, Math.min(Math.max(0, n - goruntu), (e.clientX - r.left) / r.width * n - goruntu / 2)); ciz(p); });
  }

  /* ---------- Çizim ---------- */
  function gW(p) { return p.cv.clientWidth || 800; }
  function tumuGoster(p) { p.bas = 0; p.spp = Math.max(0.02, p.L.length / gW(p)); }
  function zoomT(p, k, odakS) {
    var n = p.L.length, w = gW(p); odakS = odakS == null ? p.bas + w * p.spp / 2 : odakS;
    var yeni = Math.max(0.05, Math.min(Math.max(0.05, n / w), p.spp * k)); p.bas = Math.max(0, odakS - (odakS - p.bas) * (yeni / p.spp)); p.spp = yeni;
    var maxBas = Math.max(0, n - w * p.spp); if (p.bas > maxBas) p.bas = maxBas; ciz(p);
  }
  function boyutla(c) { var r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); } return d; }
  var ADIM = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  function zamanFmt(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + (s % 1 ? s.toFixed(s < 1 ? 3 : (t < 10 ? 2 : 1)) : s.toFixed(0)); }
  function ciz(p) {
    if (!p || !p.el.isConnected) return;
    var c = p.cv, d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height, RH = 16 * d, dz = H - RH;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    // cetvel
    g.fillStyle = '#eef0f3'; g.fillRect(0, 0, W, RH); g.font = (10.5 * d) + 'px Barlow,sans-serif'; g.textBaseline = 'middle';
    var pxs = SR / p.spp / d, adim = ADIM[ADIM.length - 1]; for (var q = 0; q < ADIM.length; q++) if (ADIM[q] * pxs >= 80) { adim = ADIM[q]; break; }
    var t0 = p.bas / SR, tS = (p.bas + gW(p) * p.spp) / SR;
    for (var t = Math.ceil(t0 / adim) * adim; t <= tS; t += adim) { var x = (t * SR - p.bas) / p.spp * d; g.fillStyle = '#e3e6ea'; g.fillRect(x, RH, 1, dz); g.fillStyle = '#7b8490'; g.fillRect(x, RH - 6 * d, 1, 6 * d); g.fillStyle = '#4a5360'; g.fillText(zamanFmt(t), x + 3 * d, RH / 2 - 1); }
    var mid = RH + dz / 2; g.fillStyle = '#c3c9d1'; g.fillRect(0, mid, W, 1);
    // seçim
    if (p.sec) { var a = (p.sec[0] - p.bas) / p.spp * d, b = (p.sec[1] - p.bas) / p.spp * d; g.fillStyle = 'rgba(47,111,208,.22)'; g.fillRect(a, RH, Math.max(1, b - a), dz); g.fillStyle = 'rgba(47,111,208,.9)'; g.fillRect(a, RH, 1, dz); g.fillRect(b, RH, 1, dz); }
    // dalga
    var dizi = p.L, k = dz * 0.47 * p.vz;
    if (dizi.length) {
      var piks = Math.max(1, Math.floor(W / d)), bas = Math.max(0, Math.floor(p.bas)), son = Math.min(dizi.length, Math.floor(p.bas + piks * p.spp));
      if (son > bas) {
        var alt = dizi.subarray(bas, son), adet = Math.min(piks, Math.ceil(alt.length / Math.max(1, p.spp))), pk = Motor.tepeler(alt, Math.max(1, adet)), gen = (alt.length / p.spp) / adet * d;
        g.fillStyle = RENK[p.tur];
        for (var i = 0; i < adet; i++) { var y1 = mid - pk[2 * i + 1] * k, y2 = mid - pk[2 * i] * k; y1 = Math.max(RH, y1); y2 = Math.min(H, y2); g.fillRect(i * gen, y1, Math.max(1, gen), Math.max(1, y2 - y1)); }
      }
    }
    // imleç
    var im = (S.calP === p && S.cal) ? S.imlecCal : p.imlec, x2 = (im - p.bas) / p.spp * d; if (x2 >= 0 && x2 <= W) { g.fillStyle = S.calP === p ? '#e08a00' : '#d83a2c'; g.fillRect(x2, RH, Math.max(1, d), dz); }
    ovCiz(p); kaydirCiz(p);
    $('.bas small', p.el).textContent = sn(p.L.length / SR) + (p.R !== p.L ? ' · stereo' : ' · mono') + ' · ' + p.tur;
    $('.sure', p.el).textContent = (p.sec ? 'Seçim ' + sn(p.sec[0] / SR) + ' – ' + sn(p.sec[1] / SR) + ' (' + ((p.sec[1] - p.sec[0]) / SR).toFixed(2) + ' sn)' : 'İmleç ' + sn(p.imlec / SR)) + ' · Seviye ' + p.vz.toFixed(1) + '×';
  }
  function ovCiz(p) {
    var c = p.ovc, d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height; g.fillStyle = '#f1f3f6'; g.fillRect(0, 0, W, H);
    var n = p.L.length; if (!n) return;
    if (!p.ovC || p.ovC.ref !== p.L || p.ovC.W !== W) p.ovC = { ref: p.L, W: W, pk: Motor.tepeler(p.L, Math.max(1, W)) };
    g.fillStyle = RENK[p.tur]; g.globalAlpha = 0.75; for (var i = 0; i < W; i++) { var y1 = H / 2 - p.ovC.pk[2 * i + 1] * H * 0.46, y2 = H / 2 - p.ovC.pk[2 * i] * H * 0.46; g.fillRect(i, y1, 1, Math.max(1, y2 - y1)); } g.globalAlpha = 1;
    var a = p.bas / n * W, b = Math.min(n, p.bas + gW(p) * p.spp) / n * W; g.fillStyle = 'rgba(47,111,208,.16)'; g.fillRect(a, 0, Math.max(2, b - a), H); g.strokeStyle = 'rgba(47,111,208,.8)'; g.strokeRect(a + .5, .5, Math.max(2, b - a) - 1, H - 1);
    if (p.sec) { g.fillStyle = 'rgba(216,58,44,.5)'; g.fillRect(p.sec[0] / n * W, H - 4 * d, Math.max(1, (p.sec[1] - p.sec[0]) / n * W), 4 * d); }
  }
  function kaydirCiz(p) { var n = Math.max(1, p.L.length), W = p.kay.clientWidth || 1, goruntu = gW(p) * p.spp; p.th.style.left = (p.bas / n * W) + 'px'; p.th.style.width = Math.max(24, Math.min(W, goruntu / n * W)) + 'px'; }

  /* ---------- Seçim ---------- */
  function x2s(p, ev) { var r = p.cv.getBoundingClientRect(); return Math.max(0, Math.min(p.L.length, Math.round(p.bas + (ev.clientX - r.left) * p.spp))); }
  function secimBagla(p) {
    var c = p.cv, surukle = false, mod = 'yeni', sabit = 0, tasi = null;
    c.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; odak(p); var s2 = x2s(p, e), tol = 6 * p.spp, sc = p.sec;
      if (sc && s2 > sc[0] + tol && s2 < sc[1] - tol && sc[1] - sc[0] > 100) { mod = 'tasi'; tasi = { x: e.clientX, y: e.clientY, dolu: false }; }
      else if (sc && Math.abs(s2 - sc[0]) <= tol) { mod = 'kenar'; sabit = sc[1]; }
      else if (sc && Math.abs(s2 - sc[1]) <= tol) { mod = 'kenar'; sabit = sc[0]; }
      else { mod = 'yeni'; sabit = s2; p.imlec = s2; p.sec = null; }
      surukle = true; guncelle(); e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!surukle) return;
      if (mod === 'tasi') {
        if (!tasi.dolu && Math.hypot(e.clientX - tasi.x, e.clientY - tasi.y) > 8) { tasi.dolu = true; tasi.g = document.createElement('div'); tasi.g.className = 'tasiGhost'; tasi.g.textContent = 'Seçimi bırak: karıştırarak yapıştır'; document.body.appendChild(tasi.g); }
        if (tasi.g) { tasi.g.style.left = (e.clientX + 12) + 'px'; tasi.g.style.top = (e.clientY + 12) + 'px'; }
        return;
      }
      var s2 = x2s(p, e);
      if (mod === 'kenar' || Math.abs(s2 - sabit) > p.spp * 3) { p.sec = [Math.min(s2, sabit), Math.max(s2, sabit)]; p.imlec = p.sec[0]; guncelle(); }
    });
    window.addEventListener('mouseup', function (e) {
      if (!surukle) return; surukle = false;
      if (mod === 'tasi') {
        if (tasi && tasi.g) {
          tasi.g.remove(); var el = document.elementFromPoint(e.clientX, e.clientY), pe = el && el.closest ? el.closest('.pen') : null;
          var q = pe ? S.pen.filter(function (z) { return z.el === pe; })[0] : null;
          if (q && q !== p) { var pos = x2s(q, e), sc = p.sec; S.pano = { L: p.L.slice(sc[0], sc[1]), R: p.R === p.L ? null : p.R.slice(sc[0], sc[1]), ad: p.ad }; if (!S.pano.R) S.pano.R = S.pano.L; odak(q); karistirDlg(q, pos); }
        } else { p.sec = null; p.imlec = x2s(p, e); }
        tasi = null; guncelle();
      }
    });
    c.addEventListener('dblclick', function () { p.sec = [0, p.L.length]; guncelle(); });
    c.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.altKey) { p.vz = e.deltaY < 0 ? Math.min(64, p.vz * 1.25) : Math.max(0.1, p.vz / 1.25); ciz(p); }
      else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { p.bas = Math.max(0, Math.min(Math.max(0, p.L.length - gW(p) * p.spp), p.bas + (e.deltaX || e.deltaY) * p.spp)); ciz(p); }
      else zoomT(p, e.deltaY < 0 ? 0.8 : 1.25, x2s(p, e));
    }, { passive: false });
  }
  function guncelle() {
    S.pen.forEach(ciz);
    var p = akt(); $('#dPen').textContent = p ? p.ad : '—';
    $('#dSecim').textContent = p ? (p.sec ? sn(p.sec[0] / SR) + ' – ' + sn(p.sec[1] / SR) + ' (' + ((p.sec[1] - p.sec[0]) / SR).toFixed(2) + ' sn)' : 'yok · imleç ' + sn(p.imlec / SR)) : 'yok';
    if (p && p.L.length) { var st = Motor.istatistik(p.L, SR); $('#dSes').textContent = 'zemin ' + st.zeminDb.toFixed(0) + ' dB · konuşma ' + st.konusmaDb.toFixed(0) + ' dB · tepe ' + st.tepeDb.toFixed(1) + ' dB'; } else $('#dSes').textContent = '—';
    $('#zaman').textContent = sn(p ? ((S.cal && S.calP === p) ? S.imlecCal : p.imlec) / SR : 0);
  }
  window.addEventListener('resize', function () { S.pen.forEach(function (p) { var mx = Math.max(0, p.L.length - gW(p) * p.spp); if (p.bas > mx) p.bas = mx; ciz(p); }); });

  /* ---------- Çalma ---------- */
  function durdur() { if (S.cal) { try { S.cal.onended = null; S.cal.stop(); } catch (e) {} S.cal = null; } var pp = S.calP; S.calP = null; $('#oynatBtn').textContent = '▶ Oynat'; if (pp && pp.el.isConnected) ciz(pp); guncelle(); }
  function calDizi(L, R, p, bas, onBitti) {
    durdur(); if (!L.length) return; var c = ac(), n = L.length - bas; if (n < 100) { bas = 0; n = L.length; }
    var b = c.createBuffer(2, n, SR); b.getChannelData(0).set(L.subarray(bas)); b.getChannelData(1).set((R || L).subarray(bas));
    var s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); var t0 = c.currentTime + 0.03; s.start(t0);
    S.cal = s; S.calP = p || null; S.imlecCal = bas; $('#oynatBtn').textContent = '■ Durdur';
    s.onended = function () { if (S.cal === s) { S.cal = null; var pp = S.calP; S.calP = null; $('#oynatBtn').textContent = '▶ Oynat'; if (pp) ciz(pp); guncelle(); if (onBitti) onBitti(); } };
    (function raf() { if (S.cal !== s) return; S.imlecCal = bas + Math.max(0, c.currentTime - t0) * SR; if (p) { if (S.imlecCal > p.bas + gW(p) * p.spp) { p.bas = Math.min(Math.max(0, p.L.length - gW(p) * p.spp), S.imlecCal - 20 * p.spp); } ciz(p); } $('#zaman').textContent = sn(S.imlecCal / SR); requestAnimationFrame(raf); })();
  }
  function calPencere(p) {
    if (!p) return toast('Önce bir pencere açın');
    var a = p.sec ? p.sec[0] : p.imlec, b = p.sec ? p.sec[1] : p.L.length, tam = p.R;
    if (p.sec) { calDizi(p.L.subarray(0, b), p.R === p.L ? null : p.R.subarray(0, b), p, a); } else calDizi(p.L, p.R === p.L ? null : p.R, p, a);
  }
  function oynatToggle() { if (S.cal) return durdur(); calPencere(akt()); }

  /* ---------- Dosya ve kayıt ---------- */
  function ad2(f) { return String(f).replace(/\.[^.]+$/, ''); }
  async function dosyadanAc(file, tur) {
    try { mesaj('Okunuyor…'); var b = await coz(await file.arrayBuffer()), s = stereoAl(b); var p = pencereAc(ad2(file.name), s.L, tur === 'muzik' ? s.R : s.L, tur); mesaj(''); otoListeleri(); return p; }
    catch (e) { hata(new Error('Bu dosya okunamadı. MP3, WAV veya M4A deneyin.')); }
  }
  var kayit = null, mikId = '', kayitNo = 0;
  async function kayitBasla() {
    if (kayit) return kayitDur();
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Bu tarayıcı kaydı desteklemiyor. Chrome veya Edge kullanın.');
    try {
      var c = ac(), stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: mikId ? { exact: mikId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
      var src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 1024; src.connect(an);
      var rec = new MediaRecorder(stream), parca = []; rec.ondataavailable = function (e) { if (e.data.size) parca.push(e.data); };
      var buf = new Float32Array(1024), alive = true;
      (function olc() { if (!alive) return; an.getFloatTimeDomainData(buf); var m = 0; for (var i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); $('#metre i').style.width = Math.max(0, Math.min(100, (Motor.toDb(m) + 60) / 60 * 100)) + '%'; requestAnimationFrame(olc); })();
      rec.onstop = async function () {
        alive = false; $('#metre i').style.width = '0'; stream.getTracks().forEach(function (t) { t.stop(); }); $('#kayitBtn').classList.remove('kayitta'); $('#kayitBtn').textContent = '● Kayıt';
        try { var b = await coz(await new Blob(parca).arrayBuffer()), x = tekKanal(b); pencereAc('Kayıt ' + (++kayitNo), x, x, 'ses'); otoListeleri(); } catch (e) { hata(new Error('Kayıt çözülemedi.')); }
        kayit = null;
      };
      rec.start(); kayit = rec; $('#kayitBtn').classList.add('kayitta'); $('#kayitBtn').textContent = '■ Kaydı bitir';
    } catch (e) { toast(e.name === 'NotAllowedError' ? 'Mikrofon izni verilmedi. Tarayıcı adres çubuğundan izin verin.' : 'Mikrofon açılamadı: ' + e.message); }
  }
  function kayitDur() { if (kayit && kayit.state !== 'inactive') kayit.stop(); }

  /* ---------- Düzenleme çekirdeği ---------- */
  function degistir(p, L, R) {
    p.undo.push({ L: p.L, R: p.R }); if (p.undo.length > 20) p.undo.shift(); p.redo = [];
    p.L = L; p.R = R || L; p.sec = null; p.imlec = Math.min(p.imlec, p.L.length);
    var mx = Math.max(0, p.L.length - gW(p) * p.spp); if (p.bas > mx) p.bas = mx; guncelle();
  }
  function aralik(p) { return p.sec ? [p.sec[0], p.sec[1]] : [0, p.L.length]; }
  function kanalIs(p, fn) { var r = aralik(p), L = fn(p.L, r[0], r[1]), R = p.R === p.L ? L : fn(p.R, r[0], r[1]); degistir(p, L, R); }
  function kanalDo(sL, sR, f) { var a = f(sL), b = sR === sL ? a : f(sR); return { L: a, R: b }; }
  function bolgeUygula(p, fn, kuyruk) {
    var r = aralik(p), a = r[0], b = r[1], sL = p.L.slice(a, b), sR = p.R === p.L ? sL : p.R.slice(a, b), o = fn(sL, sR); if (!o) return;
    var monoP = p.R === p.L, ayni = o.L === o.R;
    function yap(taban, mid) {
      if (kuyruk) { var n = Math.max(taban.length, a + mid.length), y = new Float32Array(n); y.set(taban); for (var i = 0; i < mid.length; i++) { if (i < b - a) y[a + i] = mid[i]; else y[a + i] += mid[i]; } return y; }
      return A.birles(taban, a, b, mid);
    }
    var L = yap(p.L, o.L), R = (monoP && ayni) ? L : yap(p.R, o.R); degistir(p, L, R);
  }
  async function calis(ad, fn) {
    if (S.mesgul) return; S.mesgul = true; mesaj(ad + '…'); await bekle();
    try { await fn(); } catch (e) { hata(e); }
    S.mesgul = false; mesaj('');
  }
  function aktifVar() { var p = akt(); if (!p) { toast('Önce bir pencere açın ya da pencereye tıklayın'); return null; } return p; }
  function secimVar() { var p = aktifVar(); if (!p) return null; if (!p.sec) { toast('Önce pencerede fareyle bir bölüm seçin'); return null; } return p; }
  function panoAl(p) { var r = aralik(p); return { L: p.L.slice(r[0], r[1]), R: p.R === p.L ? null : p.R.slice(r[0], r[1]), ad: p.ad }; }
  function ekle(p, pos, mid) { var L = A.birles(p.L, pos, pos, mid.L), R = (p.R === p.L && (mid.R === mid.L || !mid.R)) ? L : A.birles(p.R, pos, pos, mid.R || mid.L); degistir(p, L, R); }

  var I = {
    geri: function () { var p = aktifVar(); if (!p) return; if (!p.undo.length) return toast('Geri alınacak işlem yok'); p.redo.push({ L: p.L, R: p.R }); var e = p.undo.pop(); p.L = e.L; p.R = e.R; p.sec = null; guncelle(); },
    yinele: function () { var p = aktifVar(); if (!p) return; if (!p.redo.length) return; p.undo.push({ L: p.L, R: p.R }); var e = p.redo.pop(); p.L = e.L; p.R = e.R; p.sec = null; guncelle(); },
    kopyala: function () { var p = aktifVar(); if (!p) return; S.pano = panoAl(p); if (!S.pano.R) S.pano.R = S.pano.L; toast('Kopyalandı (' + (S.pano.L.length / SR).toFixed(2) + ' sn)'); },
    kes: function () { var p = secimVar(); if (!p) return; S.pano = panoAl(p); if (!S.pano.R) S.pano.R = S.pano.L; var a = p.sec[0]; kanalIs(p, function (x, s, e) { return Motor.sil(x, s, e); }); p.imlec = a; guncelle(); toast('Kesildi. Yapıştırmak için imleci koyup Ctrl+V'); },
    yapistir: function () { var p = aktifVar(); if (!p) return; if (!S.pano) return toast('Önce kopyalayın ya da kesin'); ekle(p, p.sec ? p.sec[0] : p.imlec, S.pano); },
    karistir: function () { var p = aktifVar(); if (!p) return; if (!S.pano) return toast('Önce başka bir pencerede bir bölüm seçip kopyalayın (Ctrl+C). Sonra buraya karıştırarak yapıştırın'); karistirDlg(p); },
    panodanPencere: function () { if (!S.pano) return toast('Pano boş'); pencereAc((S.pano.ad || 'Pano') + ' (kopya)', S.pano.L, S.pano.R, 'ses'); otoListeleri(); },
    sil: function () { var p = secimVar(); if (!p) return; var a = p.sec[0]; kanalIs(p, function (x, s, e) { return Motor.sil(x, s, e); }); p.imlec = a; guncelle(); },
    kirp: function () { var p = secimVar(); if (!p) return; kanalIs(p, function (x, s, e) { return Motor.kirp(x, s, e); }); p.imlec = 0; tumuGoster(p); guncelle(); },
    sessiz: function () { var p = secimVar(); if (!p) return; kanalIs(p, function (x, s, e) { return Motor.sessizYap(x, s, e); }); },
    giris: function () { var p = secimVar(); if (!p) return; kanalIs(p, function (x, s, e) { return Motor.fade(x, s, e, 'giris'); }); },
    cikis: function () { var p = secimVar(); if (!p) return; kanalIs(p, function (x, s, e) { return Motor.fade(x, s, e, 'cikis'); }); },
    tumu: function () { var p = aktifVar(); if (!p) return; p.sec = [0, p.L.length]; guncelle(); },
    dc: function () { var p = aktifVar(); if (!p) return; kanalIs(p, function (x, s, e) { var y = x.slice(), m = 0, i; for (i = s; i < e; i++) m += x[i]; m /= Math.max(1, e - s); for (i = s; i < e; i++) y[i] -= m; return y; }); },
    ters: function () { var p = aktifVar(); if (!p) return; bolgeUygula(p, function (sL, sR) { return { L: A.ters(sL), R: sR === sL ? A.ters(sL) : A.ters(sR) }; }); },
    normal: function () { var p = aktifVar(); if (!p) return; var r = aralik(p), m = 0, i; for (i = r[0]; i < r[1]; i++) m = Math.max(m, Math.abs(p.L[i]), Math.abs(p.R[i])); if (m < 1e-6) return; var g = Motor.dB(-1) / m; kanalIs(p, function (x, s, e) { return Motor.kazan(x, s, e, 20 * Math.log10(g)); }); toast('Tepe −1 dB’e getirildi'); },
    kazancHizli: function (db) { var p = aktifVar(); if (!p) return; kanalIs(p, function (x, s, e) { return Motor.kazan(x, s, e, db); }); toast((db > 0 ? '+' : '') + db + ' dB'); },
    kazanc: function () { var p = aktifVar(); if (!p) return; sayiDlg('Ses seviyesi (seçim yoksa tümü)', 'Değişim', -24, 24, 0.5, 0, ' dB', function (v) { kanalIs(p, function (x, s, e) { return Motor.kazan(x, s, e, v); }); }); },
    sessizlikEkle: function () { var p = aktifVar(); if (!p) return; sayiDlg('Sessizlik ekle', 'Süre', 0.1, 10, 0.1, 0.5, ' sn', function (v) { var pos = p.sec ? p.sec[0] : p.imlec, n = Math.round(v * SR); kanalIs(p, function (x) { return Motor.sessizlikEkle(x, pos, n); }); }); },
    dip: function () { dipTemizle(); },
    disa: function () { disaDlg(); },
    kapat: function () { kapat(akt()); },
    hepsiniKapat: function () { S.pen.slice().forEach(kapat); },
    yeni: function () { var x = new Float32Array(SR); pencereAc('Yeni ' + (S.sayac + 1), x, x, 'ses'); otoListeleri(); }
  };

  /* ---------- Diyaloglar ---------- */
  function bilgi(baslik, html) {
    var p = document.createElement('div'); p.className = 'perde'; p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true"><h3>' + esc(baslik) + '</h3><div class="govde">' + html + '</div><div class="alt"><button class="btn ana">Tamam</button></div></div>';
    document.body.appendChild(p); p.querySelector('button').onclick = function () { p.remove(); }; p.querySelector('button').focus();
  }
  // alan: {k, ad, tur:'slider'|'sec'|'onay'|'metin', min,max,step,birim, sec:[[deger,ad]]}
  function diyalog(baslik, alanlar, deger, o) {
    o = o || {}; var d = JSON.parse(JSON.stringify(deger, function (k, v) { return k === 'iz' ? undefined : v; }));
    var p = document.createElement('div'); p.className = 'perde';
    var h = '<div class="pencere" role="dialog" aria-modal="true"><h3>' + esc(baslik) + '</h3><div class="govde">';
    if (o.not) h += '<p class="not">' + o.not + '</p>';
    if (o.onayarlar) h += '<div class="sat"><label style="margin:0">Ön ayar</label><select id="dg-on" style="grid-column:2/4">' + o.onayarlar.map(function (a) { return '<option value="' + a[0] + '">' + esc(a[1]) + '</option>'; }).join('') + '</select></div>';
    alanlar.forEach(function (a) {
      if (a.tur === 'onay') h += '<label style="color:var(--yazi);margin:0"><input type="checkbox" data-k="' + a.k + '"> ' + esc(a.ad) + '</label>';
      else if (a.tur === 'sec') h += '<div class="sat"><label style="margin:0">' + esc(a.ad) + '</label><select data-k="' + a.k + '" style="grid-column:2/4">' + a.sec.map(function (s) { return '<option value="' + s[0] + '">' + esc(s[1]) + '</option>'; }).join('') + '</select></div>';
      else if (a.tur === 'metin') h += '<div class="sat"><label style="margin:0">' + esc(a.ad) + '</label><input type="text" data-k="' + a.k + '" style="grid-column:2/4"></div>';
      else h += '<div class="sat"><label style="margin:0">' + esc(a.ad) + '</label><input type="range" data-k="' + a.k + '" min="' + a.min + '" max="' + a.max + '" step="' + a.step + '"><output></output></div>';
    });
    if (o.ekHtml) h += o.ekHtml;
    h += '</div><div class="alt">' + (o.iz ? '<button class="btn sol-b" id="dg-iz">Gürültü izi al (seçimden)</button>' : '') + (o.onizle ? '<button class="btn" id="dg-on-izle">Önizleme</button>' : '') + '<button class="btn" id="dg-iptal">İptal</button><button class="btn ana" id="dg-tamam">Tamam</button></div></div>';
    p.innerHTML = h; document.body.appendChild(p);
    function oku() { $$('[data-k]', p).forEach(function (el) { var k = el.dataset.k; d[k] = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? +el.value : el.value); }); }
    function yaz() {
      $$('[data-k]', p).forEach(function (el) { var v = d[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else if (v != null) el.value = v; var out = el.parentNode.querySelector('output'); if (out && el.type === 'range') out.textContent = (+el.value) + (alanlar.filter(function (a) { return a.k === el.dataset.k; })[0].birim || ''); });
    }
    yaz();
    p.addEventListener('input', function (e) { if (e.target.id === 'dg-on') return; oku(); yaz(); if (o.degisince) o.degisince(d, p); });
    p.addEventListener('change', function (e) { if (e.target.id === 'dg-on') { o.onayUygula(e.target.value, d); yaz(); } });
    if (o.onayarSec) $('#dg-on', p).value = o.onayarSec;
    $('#dg-iptal', p).onclick = function () { durdur(); p.remove(); };
    $('#dg-tamam', p).onclick = function () { oku(); durdur(); p.remove(); o.tamam(d); };
    if (o.onizle) $('#dg-on-izle', p).onclick = async function () { oku(); mesaj('Önizleme hazırlanıyor…'); await bekle(); try { var r = o.onizle(d); mesaj(''); if (r) calDizi(r.L, r.R === r.L ? null : r.R, null, 0); } catch (e) { hata(e); } };
    if (o.iz) $('#dg-iz', p).onclick = function () {
      var pe = akt(); if (!pe || !pe.sec || pe.sec[1] - pe.sec[0] < 2048) return toast('Önce pencerede yalnızca gürültü olan bir yeri (en az 0,1 sn) seçin. Pencere arkada, onu seçip bu pencereyi tekrar açın');
      S.iz = pe.L.slice(pe.sec[0], pe.sec[1]); toast('Gürültü izi alındı (' + ((pe.sec[1] - pe.sec[0]) / SR).toFixed(1) + ' sn)');
    };
    return p;
  }
  function sayiDlg(baslik, etiket, min, max, adim, ilk, birim, tamam) { diyalog(baslik, [{ k: 'v', ad: etiket, tur: 'slider', min: min, max: max, step: adim, birim: birim }], { v: ilk }, { tamam: function (d) { tamam(d.v); } }); }
  // Önizleme için parça: seçim ya da imleçten itibaren en çok 12 sn
  function onizParca(p) { var a = p.sec ? p.sec[0] : p.imlec, b = p.sec ? p.sec[1] : p.L.length; if (b - a > SR * 12) b = a + SR * 12; if (b - a < 2048) { a = 0; b = Math.min(p.L.length, SR * 12); } var sL = p.L.slice(a, b); return { L: sL, R: p.R === p.L ? sL : p.R.slice(a, b) }; }
  function tepeyeAyarla(o) { var pk = Math.max(Motor.tepeDb([o.L]), Motor.tepeDb([o.R])); var g = Motor.dB(-1 - pk), L = new Float32Array(o.L.length), R = o.R === o.L ? L : new Float32Array(o.R.length); for (var i = 0; i < L.length; i++) { L[i] = o.L[i] * g; if (R !== L) R[i] = o.R[i] * g; } return { L: L, R: R }; }
  function monoEfekt(sL, sR, e) { return Motor.efektUygula(mono(sL, sR), SR, e); }

  /* Temizlik */
  function gurultuIsle(sL, sR, d) {
    return kanalDo(sL, sR, function (x) {
      var y = Motor.gurultuAzalt(x, SR, { db: d.db, bias: d.bias, hiz: d.hiz }, S.iz || null);
      if (d.kapi) y = Motor.kapi(y, SR, { esik: null, konum: +d.konum, aralik: d.aralik || 70, bekle: 20, ac: 8, kapa: 40 });
      return y;
    });
  }
  function gurultuDlg() {
    var p = aktifVar(); if (!p) return; var d0 = { db: 18, bias: 0, hiz: 50, kapi: true, konum: 0.45, aralik: 70 };
    diyalog('Gürültü azaltma', [{ k: 'db', ad: 'Azaltma', tur: 'slider', min: 0, max: 40, step: 1, birim: ' dB' }, { k: 'bias', ad: 'Sertlik (bias)', tur: 'slider', min: -10, max: 10, step: 1, birim: ' dB' }, { k: 'hiz', ad: 'Hız', tur: 'slider', min: 0, max: 100, step: 5, birim: '' }, { k: 'kapi', ad: 'Konuşma aralarındaki dip sesi de kıs (kapı)', tur: 'onay' }, { k: 'konum', ad: 'Kapı duyarlılığı', tur: 'slider', min: 0.2, max: 0.8, step: 0.05, birim: '' }, { k: 'aralik', ad: 'Kapı kısma miktarı', tur: 'slider', min: 6, max: 90, step: 1, birim: ' dB' }], d0, {
      not: 'Seçili bölüme, seçim yoksa tüm pencereye uygulanır. Daha iyi sonuç için önce yalnızca gürültü olan bir yeri seçip “Gürültü izi al” deyin.',
      iz: true, onayarlar: ['hafif', 'standart', 'guclu', 'cokguclu'].map(function (k) { return [k, Motor.TEMIZLE[k].ad]; }), onayarSec: 'standart',
      onayUygula: function (k, d) { var T = Motor.TEMIZLE[k]; d.db = T.g.db; d.bias = T.g.bias; d.hiz = T.g.hiz; d.kapi = true; d.konum = T.k.konum; d.aralik = T.k.aralik; },
      onizle: function (d) { var q = onizParca(p), o = gurultuIsle(q.L, q.R, d); return tepeyeAyarla(o); },
      tamam: function (d) { calis('Gürültü azaltılıyor', function () { bolgeUygula(p, function (sL, sR) { return gurultuIsle(sL, sR, d); }); }); }
    });
  }
  function dipTemizle() {
    var p = aktifVar(); if (!p) return; var T = Motor.TEMIZLE.standart;
    calis('Dip ses temizleniyor', function () { bolgeUygula(p, function (sL, sR) { return gurultuIsle(sL, sR, { db: T.g.db, bias: T.g.bias, hiz: T.g.hiz, kapi: true, konum: T.k.konum, aralik: T.k.aralik }); }); toast('Dip ses temizlendi. Beğenmezseniz Ctrl+Z'); });
  }
  function kapiDlg() {
    var p = aktifVar(); if (!p) return; var d0 = { konum: 0.45, aralik: 70, bekle: 20, ac: 8, kapa: 40 };
    function isle(sL, sR, d) { return kanalDo(sL, sR, function (x) { return Motor.kapi(x, SR, { esik: null, konum: +d.konum, aralik: +d.aralik, bekle: +d.bekle, ac: +d.ac, kapa: +d.kapa }); }); }
    diyalog('Sessizlikte sesi kıs (kapı)', [{ k: 'konum', ad: 'Duyarlılık (yüksek = daha çok kıs)', tur: 'slider', min: 0.2, max: 0.8, step: 0.05, birim: '' }, { k: 'aralik', ad: 'Kısma miktarı', tur: 'slider', min: 6, max: 90, step: 1, birim: ' dB' }, { k: 'bekle', ad: 'Bekleme', tur: 'slider', min: 0, max: 300, step: 10, birim: ' ms' }, { k: 'ac', ad: 'Açılma', tur: 'slider', min: 2, max: 60, step: 1, birim: ' ms' }, { k: 'kapa', ad: 'Kapanma', tur: 'slider', min: 20, max: 400, step: 10, birim: ' ms' }], d0, {
      not: 'Konuşma olmayan yerlerde sesi kısar. Kelime sonları yutuluyorsa duyarlılığı düşürün.',
      onizle: function (d) { var q = onizParca(p); return tepeyeAyarla(isle(q.L, q.R, d)); },
      tamam: function (d) { calis('Kapı uygulanıyor', function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }); }); }
    });
  }
  /* Efektler */
  function eqDlg() {
    var p = aktifVar(); if (!p) return; var d0 = { bantlar: JSON.parse(JSON.stringify(Motor.TON.radyo.bantlar)), onayar: 'radyo' };
    function isle(sL, sR) { return kanalDo(sL, sR, function (x) { return d0.bantlar.length ? Motor.eq(x, SR, d0.bantlar) : x; }); }
    var q = diyalog('Ses rengi (EQ)', [], d0, {
      not: 'Tok, parlak, sıcak gibi ton ayarı. Hazır ayar seçin, isterseniz bantları elle değiştirin.',
      ekHtml: '<div id="bantlar" style="display:grid;gap:.3rem"></div><button class="btn kucuk" id="bantEkle" style="justify-self:start">Bant ekle</button>',
      onayarlar: Object.keys(Motor.TON).map(function (k) { return [k, Motor.TON[k].ad]; }), onayarSec: 'radyo',
      onayUygula: function (k, d) { d0.onayar = k; d0.bantlar = JSON.parse(JSON.stringify(Motor.TON[k].bantlar)); bantCiz(); },
      onizle: function () { var z = onizParca(p); return tepeyeAyarla(isle(z.L, z.R)); },
      tamam: function () { calis('Ses rengi uygulanıyor', function () { bolgeUygula(p, isle); }); }
    });
    function bantCiz() {
      var k = $('#bantlar', q), tipler = [['hp', 'Alçak kes'], ['lp', 'Yüksek kes'], ['lowshelf', 'Bas rafı'], ['peak', 'Çan'], ['highshelf', 'Tiz rafı']];
      k.innerHTML = '<div class="bant" style="font-size:12px;color:var(--sol)"><span>Tür</span><span>Frekans (Hz)</span><span>Kazanç (dB)</span><span>Genişlik (okt.)</span><span></span></div>' + d0.bantlar.map(function (b, i) {
        return '<div class="bant" data-i="' + i + '"><select>' + tipler.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === b.t ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select><input type="number" value="' + b.f + '" min="20" max="20000"><input type="number" value="' + (b.g || 0) + '" min="-24" max="24" step="0.5"><input type="number" value="' + (b.bw || 1) + '" min="0.1" max="4" step="0.1"><button class="btn kucuk" title="Sil">✕</button></div>';
      }).join('');
    }
    bantCiz();
    q.addEventListener('input', function (e) { var r = e.target.closest('.bant[data-i]'); if (!r) return; var b = d0.bantlar[+r.dataset.i], el = r.querySelectorAll('select,input'); b.t = el[0].value; b.f = +el[1].value || 1000; b.g = +el[2].value || 0; b.bw = +el[3].value || 1; });
    q.addEventListener('click', function (e) { if (e.target.id === 'bantEkle') { d0.bantlar.push({ t: 'peak', f: 1000, g: 0, bw: 1 }); bantCiz(); } else if (e.target.title === 'Sil') { d0.bantlar.splice(+e.target.closest('.bant').dataset.i, 1); bantCiz(); } });
  }
  function hammerDlg() {
    var p = aktifVar(); if (!p) return; var d0 = Object.assign({ tavan: -1.5 }, Motor.KUVVET.radyo); delete d0.ad;
    function isle(sL, sR, d) { var k = { esik: +d.esik, oran: +d.oran, atak: +d.atak, birak: +d.birak, makyaj: +d.makyaj, diz: 6 }; var a = kanalDo(sL, sR, function (x) { return Motor.kompresor(x, SR, k); }); var s = Motor.sinirla(a.L, a.R, SR, +d.tavan, 80); return { L: s.L, R: sR === sL ? s.L : s.R }; }
    diyalog('Wave Hammer (kompresör ve limiter)', [{ k: 'esik', ad: 'Eşik', tur: 'slider', min: -40, max: 0, step: 0.5, birim: ' dB' }, { k: 'oran', ad: 'Oran', tur: 'slider', min: 1, max: 12, step: 0.1, birim: ':1' }, { k: 'atak', ad: 'Atak', tur: 'slider', min: 0.5, max: 100, step: 0.5, birim: ' ms' }, { k: 'birak', ad: 'Bırakma', tur: 'slider', min: 20, max: 1000, step: 10, birim: ' ms' }, { k: 'makyaj', ad: 'Çıkış kazancı', tur: 'slider', min: -6, max: 12, step: 0.5, birim: ' dB' }, { k: 'tavan', ad: 'Limiter tavanı', tur: 'slider', min: -6, max: 0, step: 0.1, birim: ' dB' }], d0, {
      not: 'Sesin alçak ve yüksek yerlerini dengeler, sesi güçlü ve dolgun yapar. Limiter, seviyenin tavanı aşıp bozulmasını önler.',
      onayarlar: ['hafif', 'radyo', 'siki', 'coksiki'].map(function (k) { return [k, Motor.KUVVET[k].ad]; }), onayarSec: 'radyo',
      onayUygula: function (k, d) { var K = Motor.KUVVET[k]; ['esik', 'oran', 'atak', 'birak', 'makyaj'].forEach(function (a) { d[a] = K[a]; }); },
      onizle: function (d) { var q = onizParca(p); return isle(q.L, q.R, d); },
      tamam: function (d) { calis('Wave Hammer uygulanıyor', function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }); }); }
    });
  }
  function yankiDlg() {
    var p = aktifVar(); if (!p) return; var d0 = Object.assign({}, Motor.EFEKT.plak.p);
    function isle(sL, sR, d) { return monoEfekt(sL, sR, { tur: 'yanki', p: { oda: +d.oda, sonum: +d.sonum, karisim: +d.karisim, onGecikme: +d.onGecikme } }); }
    diyalog('Reverb (oda yankısı)', [{ k: 'oda', ad: 'Oda büyüklüğü', tur: 'slider', min: 0.1, max: 1, step: 0.05, birim: '' }, { k: 'sonum', ad: 'Sönümleme (yüksek = çabuk söner)', tur: 'slider', min: 0.1, max: 0.9, step: 0.05, birim: '' }, { k: 'karisim', ad: 'Yankı miktarı', tur: 'slider', min: 0, max: 0.5, step: 0.01, birim: '' }, { k: 'onGecikme', ad: 'Ön gecikme', tur: 'slider', min: 0, max: 80, step: 1, birim: ' ms' }], d0, {
      not: 'Sese oda havası verir. Yankı kuyruğu ses bittikten sonra da sürer; pencere gerekirse uzar.',
      onayarlar: ['oda', 'plak', 'salon'].map(function (k) { return [k, Motor.EFEKT[k].ad]; }), onayarSec: 'plak',
      onayUygula: function (k, d) { Object.assign(d, Motor.EFEKT[k].p); },
      onizle: function (d) { var q = onizParca(p); return tepeyeAyarla(isle(q.L, q.R, d)); },
      tamam: function (d) { calis('Reverb uygulanıyor', function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }, true); }); }
    });
  }
  function ekoDlg() {
    var p = aktifVar(); if (!p) return; var d0 = Object.assign({}, Motor.EFEKT.yanki.p);
    function isle(sL, sR, d) { return monoEfekt(sL, sR, { tur: 'gecikme', p: { sure: +d.sure, geriBes: +d.geriBes, karisim: +d.karisim, ton: +d.ton } }); }
    diyalog('Eko (gecikme)', [{ k: 'sure', ad: 'Tekrar aralığı', tur: 'slider', min: 20, max: 1000, step: 10, birim: ' ms' }, { k: 'geriBes', ad: 'Tekrar sayısı (geri besleme)', tur: 'slider', min: 0, max: 0.8, step: 0.05, birim: '' }, { k: 'karisim', ad: 'Eko miktarı', tur: 'slider', min: 0, max: 0.6, step: 0.01, birim: '' }, { k: 'ton', ad: 'Eko tonu (tiz sınırı)', tur: 'slider', min: 1000, max: 12000, step: 100, birim: ' Hz' }], d0, {
      not: 'Sesin tekrarlarını ekler. Kısa aralık radyo sloganı havası, uzun aralık dağ başı yankısı verir.',
      onizle: function (d) { var q = onizParca(p); return tepeyeAyarla(isle(q.L, q.R, d)); },
      tamam: function (d) { calis('Eko uygulanıyor', function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }, true); }); }
    });
  }
  function robotDlg() {
    var p = aktifVar(); if (!p) return; var d0 = { frek: 50, karisim: 0.85 };
    function isle(sL, sR, d) { return monoEfekt(sL, sR, { tur: 'robot', p: { frek: +d.frek, karisim: +d.karisim } }); }
    diyalog('Robot sesi', [{ k: 'frek', ad: 'Robot frekansı', tur: 'slider', min: 20, max: 200, step: 5, birim: ' Hz' }, { k: 'karisim', ad: 'Etki', tur: 'slider', min: 0, max: 1, step: 0.05, birim: '' }], d0, {
      onizle: function (d) { var q = onizParca(p); return tepeyeAyarla(isle(q.L, q.R, d)); },
      tamam: function (d) { calis('Robot sesi', function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }); }); }
    });
  }
  function hazirEfekt(tur, ad) { var p = aktifVar(); if (!p) return; calis(ad, function () { bolgeUygula(p, function (sL, sR) { return monoEfekt(sL, sR, { tur: tur, p: {} }); }); toast(ad + ' uygulandı. Beğenmezseniz Ctrl+Z'); }); }
  function perdeDlg() {
    var p = aktifVar(); if (!p) return; var d0 = { ht: 2, koru: true };
    function isle(sL, sR, d) { return kanalDo(sL, sR, function (x) { return A.perde(x, +d.ht, !!d.koru); }); }
    diyalog('Perde değiştir (ses kalınlığı)', [{ k: 'ht', ad: 'Perde (yarım ton)', tur: 'slider', min: -12, max: 12, step: 0.5, birim: '' }, { k: 'koru', ad: 'Süreyi koru (kapalıysa ses hızlanır / yavaşlar)', tur: 'onay' }], d0, {
      not: 'Artı değer sesi inceltir, eksi değer kalınlaştırır. 12 yarım ton = 1 oktav. Küçük değerler (±4) daha doğal sonuç verir.',
      onizle: function (d) { var q = onizParca(p); return tepeyeAyarla(isle(q.L, q.R, d)); },
      tamam: function (d) { calis('Perde değiştiriliyor', function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }); }); }
    });
  }
  /* Karıştırarak yapıştır */
  function lufsBolge(L, R, a, b) { var x = mono(L.subarray(a, b), R.subarray(a, b)); return Motor.lufs([x], SR); }
  function karistirDlg(p, pos) {
    if (!S.pano) return toast('Önce başka bir pencerede bir bölüm seçip kopyalayın (Ctrl+C)');
    var kaynak = S.pano, sabitPos = pos != null, d0 = { konum: sabitPos ? 'verilen' : 'imlec', kDb: 0, hDb: 0, fi: 20, fo: 20, uzat: true, esitle: false, alt: 10 };
    var konumSec = sabitPos ? [['verilen', 'Bırakılan yer (' + sn(pos / SR) + ')']] : [['imlec', 'İmleçten başlat (' + sn(p.imlec / SR) + ')'], ['bas', 'Başa'], ['son', 'Sona']];
    function pozisyon(d) { return d.konum === 'verilen' ? pos : (d.konum === 'bas' ? 0 : (d.konum === 'son' ? p.L.length : (p.sec ? p.sec[0] : p.imlec))); }
    function kaynakDb(d, pz) {
      if (!d.esitle) return +d.kDb;
      var e = Math.min(p.L.length, pz + kaynak.L.length), hl = e - pz > SR * 0.2 ? lufsBolge(p.L, p.R, pz, e) : Motor.lufs([mono(p.L, p.R)], SR);
      if (hl < -60) hl = Motor.lufs([mono(p.L, p.R)], SR);
      var kl = Motor.lufs([mono(kaynak.L, kaynak.R)], SR); if (kl < -60 || hl < -60) return +d.kDb;
      return Math.max(-40, Math.min(20, hl - (+d.alt) - kl));
    }
    function karistirHesap(d, kes) {
      var pz = pozisyon(d), kd = kaynakDb(d, pz), dd = +d.hDb, sL = kaynak.L, sR = kaynak.R || kaynak.L;
      var dL = p.L, dR = p.R, bas = 0;
      if (kes) { bas = Math.max(0, pz - SR); var son = Math.min(p.L.length, pz + Math.min(sL.length, SR * 10) + SR); dL = p.L.slice(bas, son); dR = p.R === p.L ? dL : p.R.slice(bas, son); sL = sL.slice(0, Math.min(sL.length, SR * 10)); sR = kaynak.R === kaynak.L ? sL : sR.slice(0, sL.length); }
      return { sonuc: A.karistir(dL, dR, sL, sR, pz - bas, dd, kd, +d.fi, +d.fo, !!d.uzat, SR), kd: kd };
    }
    var q = diyalog('Karıştırarak yapıştır (Mix Paste)', [
      { k: 'konum', ad: 'Nereye', tur: 'sec', sec: konumSec },
      { k: 'kDb', ad: 'Kaynak (kopyalanan) seviyesi', tur: 'slider', min: -40, max: 20, step: 0.5, birim: ' dB' },
      { k: 'hDb', ad: 'Hedef (bu pencere) seviyesi', tur: 'slider', min: -40, max: 20, step: 0.5, birim: ' dB' },
      { k: 'fi', ad: 'Giriş yumuşatma (fade in)', tur: 'slider', min: 0, max: 3000, step: 10, birim: ' ms' },
      { k: 'fo', ad: 'Çıkış yumuşatma (fade out)', tur: 'slider', min: 0, max: 3000, step: 10, birim: ' ms' },
      { k: 'uzat', ad: 'Kaynak hedeften uzunsa pencereyi uzat', tur: 'onay' },
      { k: 'esitle', ad: 'Seviyeyi kendisi eşitlesin (müziği sesin altına koy)', tur: 'onay' },
      { k: 'alt', ad: 'Sesin altında kalacak fark', tur: 'slider', min: 0, max: 30, step: 0.5, birim: ' dB' }
    ], d0, {
      not: 'Kopyalanan bölüm (' + (kaynak.L.length / SR).toFixed(1) + ' sn) bu pencerenin üzerine karıştırılır; mevcut ses silinmez. “Seviyeyi kendisi eşitlesin” açıkken kaynak, ölçülen gürlüğe göre hedefin belirlediğiniz kadar altına yerleşir; müziği sese eşitlemek için bunu kullanın.',
      onizle: function (d) { var r = karistirHesap(d, true).sonuc; return tepeyeAyarla(r); },
      tamam: function (d) { calis('Karıştırılıyor', function () { var r = karistirHesap(d, false); degistir(p, r.sonuc.L, r.sonuc.R); toast('Karıştırıldı (kaynak ' + (r.kd > 0 ? '+' : '') + r.kd.toFixed(1) + ' dB)'); }); }
    });
    return q;
  }
  /* Dışa aktar */
  function indirDosya(blob, ad) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function santralWav(L, R) {
    var n = L.length, m = mono(L, R), f = Motor.biquadUygula(Motor.biquadUygula(m, Motor.biquadKatsayi('lp', SR, 3600, 0.7071, 0)), Motor.biquadKatsayi('lp', SR, 3600, 0.7071, 0));
    var oran = SR / 8000, k = Math.floor(n / oran), o = new Float32Array(k);
    for (var j = 0; j < k; j++) { var q = j * oran, a = Math.floor(q), t = q - a; o[j] = f[a] * (1 - t) + (f[a + 1] || 0) * t; }
    return Motor.wav16([o], 8000);
  }
  function disaDlg(kaynakId) {
    var secenek = S.pen.map(function (p) { return ['p' + p.id, 'Pencere: ' + p.ad]; }); if (S.sonuc) secenek.unshift(['sonuc', 'Otomatik sonuç']);
    if (!secenek.length) return toast('Dışa aktarılacak bir ses yok. Önce bir pencere açın');
    var d0 = { kay: kaynakId || (S.aktif ? 'p' + S.aktif : secenek[0][0]), bicim: 'mp3_192', seviye: 'asis', yalnizSecim: false, ad: (akt() ? akt().ad : 'Spot').replace(/[^\wÇĞİÖŞÜçğıöşü\- ]+/g, '').replace(/\s+/g, '_') || 'Spot' };
    diyalog('Dışa aktar', [
      { k: 'kay', ad: 'Hangi ses', tur: 'sec', sec: secenek },
      { k: 'bicim', ad: 'Dosya türü', tur: 'sec', sec: [['mp3_192', 'MP3 (192 kbps) — radyo ve TV'], ['mp3_128', 'MP3 (128 kbps) — küçük dosya'], ['wav', 'WAV (kayıpsız, 44,1 kHz)'], ['santral', 'Santral WAV (8 kHz, mono)']] },
      { k: 'seviye', ad: 'Ses yüksekliği', tur: 'sec', sec: [['asis', 'Olduğu gibi bırak'], ['radyo', 'Radyo seviyesine getir (−11,6 LUFS)'], ['tv', 'TV seviyesine getir (−23 LUFS)'], ['santral', 'Santral seviyesine getir (−16 LUFS)']] },
      { k: 'yalnizSecim', ad: 'Yalnız seçili bölümü kaydet', tur: 'onay' },
      { k: 'ad', ad: 'Dosya adı', tur: 'metin' }
    ], d0, {
      not: 'İndirme hakkından 1 düşer. Dinlemek ve denemek sınırsızdır.',
      tamam: function (d) { disaAktar(d); }
    });
  }
  async function disaAktar(d) {
    var L, R;
    if (d.kay === 'sonuc') { if (!S.sonuc) return toast('Sonuç yok'); L = S.sonuc.L; R = S.sonuc.R; }
    else { var p = S.pen.filter(function (z) { return 'p' + z.id === d.kay; })[0]; if (!p) return toast('Pencere bulunamadı'); var a = 0, b = p.L.length; if (d.yalnizSecim && p.sec) { a = p.sec[0]; b = p.sec[1]; } L = p.L.slice(a, b); R = p.R === p.L ? L : p.R.slice(a, b); }
    var tur = d.bicim === 'wav' ? 'wav' : (d.bicim === 'santral' ? 'santral' : 'mp3'), ad = (d.ad || 'Spot').trim() || 'Spot';
    if (!L.length) return toast('Boş ses dışa aktarılamaz');
    try {
      var r = await Veri.indirmeHakki(ad, tur);
      if (!r.ok) return bilgi('Aylık indirme hakkınız doldu', '<p>Bu ay ' + r.limit + ' indirme hakkınızı kullandınız. Yeni ay başında hak yenilenir. Hemen devam etmek için Premium üyeliğe geçebilirsiniz; yönetimle iletişime geçin.</p><p class="sol">Hazırlamayı ve dinlemeyi sınırsız sürdürebilirsiniz.</p>');
      mesaj('Dosya hazırlanıyor…'); await bekle();
      if (d.seviye !== 'asis') { var T = Motor.SEVIYE[d.seviye], s = Motor.seviyeAyarla(L, R === L ? L.slice() : R, SR, T.hedef, T.tavan); L = s.L; R = s.R; }
      var dos = ad.replace(/[^\wÇĞİÖŞÜçğıöşü\- ]+/g, '').replace(/\s+/g, '_') || 'Spot';
      if (d.bicim === 'wav') indirDosya(new Blob([Motor.wav16([L, R], SR)], { type: 'audio/wav' }), dos + '.wav');
      else if (d.bicim === 'santral') indirDosya(new Blob([santralWav(L, R)], { type: 'audio/wav' }), dos + '_santral.wav');
      else indirDosya(new Blob(Motor.mp3Kodla(L, R, SR, d.bicim === 'mp3_128' ? 128 : 192), { type: 'audio/mpeg' }), dos + '.mp3');
      mesaj(''); toast('İndirildi · Bu ay ' + r.kullanilan + (r.limit > 0 ? ' / ' + r.limit : '') + ' indirme'); ustYenile();
    } catch (e) { hata(e); }
  }
  async function ustYenile() { var u = $('.kota'); if (u) { var d = await Veri.hakDurumu(); u.textContent = 'Bu ay ' + d.kullanilan + ' / ' + (d.limit > 0 ? d.limit : '∞') + ' indirme'; } }
  async function mikSec() {
    var l; try { await navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) { s.getTracks().forEach(function (t) { t.stop(); }); }); l = (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === 'audioinput'; }); }
    catch (e) { return toast('Mikrofon izni gerekli'); }
    diyalog('Mikrofon seç', [{ k: 'id', ad: 'Mikrofon', tur: 'sec', sec: l.map(function (d, i) { return [d.deviceId, d.label || ('Mikrofon ' + (i + 1))]; }) }], { id: mikId || (l[0] && l[0].deviceId) }, { tamam: function (d) { mikId = d.id; toast('Mikrofon seçildi'); } });
  }
  /* Pencere düzeni */
  function diz(tip) {
    var n = S.pen.length; if (!n) return; var w = alan.clientWidth, h = alan.clientHeight;
    S.pen.forEach(function (p, i) {
      var e = p.el;
      if (tip === 'alt') { var yh = Math.max(230, Math.floor((h - 8) / n)); e.style.left = '4px'; e.style.width = (w - 8) + 'px'; e.style.top = (4 + i * (h - 4 - yh) / Math.max(1, n - 1)) + 'px'; e.style.height = yh + 'px'; if (n === 1) e.style.top = '4px'; }
      else if (tip === 'yan') { var gw = Math.floor((w - 8) / n); e.style.left = (4 + i * gw) + 'px'; e.style.width = (gw - 4) + 'px'; e.style.top = '4px'; e.style.height = (h - 8) + 'px'; }
      else { e.style.left = (14 + (i % 8) * 30) + 'px'; e.style.top = (10 + (i % 8) * 34) + 'px'; e.style.width = Math.min(w - 20, Math.max(520, Math.round(w * 0.7))) + 'px'; e.style.height = Math.min(h - 20, 300) + 'px'; }
      ciz(p);
    });
  }

  /* ---------- Otomatik sekme ---------- */
  function otoListeleri() {
    var s1 = $('#otoSes'), s2 = $('#otoMuzik'), v1 = s1.value, v2 = s2.value;
    s1.innerHTML = S.pen.length ? S.pen.map(function (p) { return '<option value="p' + p.id + '">Pencere: ' + esc(p.ad) + '</option>'; }).join('') : '<option value="">(önce ses aç ya da kayıt al)</option>';
    s2.innerHTML = '<option value="">Müziksiz</option>' + S.kut.muzikler.map(function (m, i) { return '<option value="k' + i + '">Banka: ' + esc(m.ad) + '</option>'; }).join('') + S.pen.map(function (p) { return '<option value="p' + p.id + '">Pencere: ' + esc(p.ad) + '</option>'; }).join('');
    if (v1 && s1.querySelector('[value="' + v1 + '"]')) s1.value = v1; else { var son = S.pen.filter(function (p) { return p.tur === 'ses' || p.tur === 'sonuc'; }).pop(); if (son) s1.value = 'p' + son.id; }
    if (v2 && s2.querySelector('[value="' + v2 + '"]')) s2.value = v2;
    bankaCiz();
  }
  function hedefUygula() { var h = $('#hedef').value, t = Motor.SEVIYE[h]; S.z.seviye = { tur: h, hedef: t.hedef, tavan: t.tavan }; }
  async function bankaDizi(tur, i) {
    var k = S.kut[tur][i], key = tur + i; if (S.cache[key]) return S.cache[key];
    mesaj('Yükleniyor…'); var u = await Veri.url(k, tur), r = await fetch(u), b = await coz(await r.arrayBuffer()), s = stereoAl(b); mesaj(''); S.cache[key] = s; return s;
  }
  async function oto(yeniden) {
    var pv = $('#otoSes').value, p = S.pen.filter(function (z) { return 'p' + z.id === pv; })[0]; if (!p) return toast('Önce bir ses açın, kaydedin ya da listeden seçin');
    if (S.mesgul) return; S.mesgul = true; mesaj('Hazırlanıyor…'); await bekle();
    try {
      var muzik = null, mv = $('#otoMuzik').value;
      if (mv[0] === 'k') muzik = await bankaDizi('muzikler', +mv.slice(1)); else if (mv[0] === 'p') { var mp = S.pen.filter(function (z) { return 'p' + z.id === mv; })[0]; if (mp) muzik = { L: mp.L, R: mp.R }; }
      var iz = S.z.gurultu.iz; S.tarzNo = yeniden ? S.tarzNo + 1 : 0; var T = Motor.TARZ[S.tarzNo % Motor.TARZ.length];
      S.z = Motor.tarzUygula(S.z, T); S.z.gurultu.iz = S.iz || iz || null;
      if (S.tarzNo >= Motor.TARZ.length) { var j = function (a) { return (Math.random() - 0.5) * 2 * a; }; S.z.muzik.altDb += j(1); S.z.muzik.yuksel = Math.max(0, S.z.muzik.yuksel + j(1)); S.z.muzik.giris = Math.max(0.5, S.z.muzik.giris + j(0.5)); }
      hedefUygula(); $('#tarzAd').textContent = T.ad + (S.tarzNo >= Motor.TARZ.length ? ' (ince ayar)' : '');
      S.sonuc = Motor.uret(mono(p.L, p.R), SR, muzik, S.z); S.sonucAd = p.ad; sonucCiz(); calDizi(S.sonuc.L, S.sonuc.R, null, 0);
    } catch (e) { hata(e); }
    S.mesgul = false; mesaj('');
  }
  function sonucCiz() {
    var c = $('#cSonuc'), d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    $('#bosSonuc').style.display = S.sonuc ? 'none' : 'flex'; if (!S.sonuc) { $('#sonucBilgi').textContent = ''; return; }
    var pk = Motor.tepeler(S.sonuc.L, Math.max(1, W)); g.fillStyle = RENK.sonuc; for (var i = 0; i < W; i++) { var y1 = H / 2 - pk[2 * i + 1] * H * 0.46, y2 = H / 2 - pk[2 * i] * H * 0.46; g.fillRect(i, y1, 1, Math.max(1, y2 - y1)); }
    $('#sonucBilgi').textContent = sn(S.sonuc.sure) + ' · ' + S.sonuc.lufs.toFixed(1) + ' LUFS · tepe ' + S.sonuc.tepeDb.toFixed(1) + ' dB';
  }

  /* ---------- Bankalar ---------- */
  async function bankaYukle() {
    try { S.kut.muzikler = await Veri.liste('muzikler'); } catch (e) { S.kut.muzikler = []; }
    try { S.kut.sesler = await Veri.liste('sesler'); } catch (e) { S.kut.sesler = []; }
    otoListeleri();
  }
  function bankaCiz() {
    $('#muzikListe').innerHTML = S.kut.muzikler.length ? S.kut.muzikler.map(function (m, i) { return '<div class="satir"><b>' + esc(m.ad) + (m.tur ? ' <small>· ' + esc(m.tur) + '</small>' : '') + '</b><button class="btn kucuk" data-b="cal" data-t="muzikler" data-i="' + i + '">▶ Dinle</button><button class="btn kucuk" data-b="ac" data-i="' + i + '">Manuel stüdyoda aç</button><button class="btn kucuk ana" data-b="oto" data-i="' + i + '">Otomatikte kullan</button></div>'; }).join('') : '<div class="satir"><b class="sol">Henüz müzik eklenmemiş. Yönetim panelinden ekleyin.</b></div>';
    $('#sesListe').innerHTML = S.kut.sesler.length ? S.kut.sesler.map(function (m, i) { return '<div class="satir"><b>' + esc(m.ad) + (m.tur ? ' <small>· ' + esc(m.tur) + '</small>' : '') + '</b><button class="btn kucuk" data-b="cal" data-t="sesler" data-i="' + i + '">▶ Dinle</button><button class="btn kucuk" disabled title="Çok yakında">Bize gönder (yakında)</button></div>'; }).join('') : '<div class="satir"><b class="sol">Henüz ses eklenmemiş.</b></div>';
  }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest ? e.target.closest('[data-b]') : null; if (!b) return; var i = +b.dataset.i, v = b.dataset.b;
    try {
      if (v === 'cal') { var s = await bankaDizi(b.dataset.t, i); calDizi(s.L, s.R === s.L ? null : s.R, null, 0); }
      else if (v === 'ac') { var s2 = await bankaDizi('muzikler', i); pencereAc(S.kut.muzikler[i].ad, s2.L.slice(), s2.R === s2.L ? null : s2.R.slice(), 'muzik'); otoListeleri(); sekme('manuel'); }
      else if (v === 'oto') { await bankaDizi('muzikler', i); $('#otoMuzik').value = 'k' + i; sekme('oto'); toast('Müzik seçildi. Sesi seçip “Otomatik hazırla”ya basın'); }
    } catch (er) { hata(er); }
  });

  /* ---------- Sekmeler ---------- */
  function sekme(t) {
    S.tab = t; $$('#sekmeler button').forEach(function (b) { b.classList.toggle('acik', b.dataset.t === t); }); $$('.panel').forEach(function (pn) { pn.classList.toggle('acik', pn.id === 'p-' + t); });
    if (t !== 'manuel' && S.cal && S.calP) { /* çalma sürsün */ }
    if (t === 'manuel') guncelle(); if (t === 'oto') { otoListeleri(); sonucCiz(); }
  }
  $$('#sekmeler button').forEach(function (b) { b.onclick = function () { sekme(b.dataset.t); }; });

  /* ---------- Menüler ---------- */
  function A1(f) { return f; }
  var M = [
    ['Dosya', [
      ['Ses aç…', 'Ctrl+O', function () { $('#dosyaSes').click(); }, 'Bilgisayarından bir konuşma kaydını yeni pencerede aç'],
      ['Müzik aç…', '', function () { $('#dosyaMuzik').click(); }, 'Kendi müziğini yeni pencerede aç'],
      ['Yeni boş pencere', '', I.yeni, 'Boş bir pencere aç, içine yapıştır ya da ekle'],
      ['Mikrofonla kayıt', 'Ctrl+R', function () { kayitBasla(); }, 'Başlat / bitir. Kayıt yeni pencerede açılır'],
      ['Mikrofon seç…', '', mikSec, 'Birden fazla mikrofonun varsa hangisiyle kayıt yapılacağı'],
      '-',
      ['Pencereyi kapat', '', I.kapat, 'Seçili pencereyi kapatır (sağ üstteki ✕ ile aynı)'],
      ['Tüm pencereleri kapat', '', I.hepsiniKapat, 'Çalışma alanını boşaltır'],
      '-',
      ['Dışa aktar…', 'Ctrl+E', I.disa, 'MP3, WAV ya da santral dosyası olarak kaydet (indirme hakkından düşer)'],
      '-',
      ['Panelime dön', '', function () { location.href = 'panel.html'; }, '']]],
    ['Düzen', [
      ['Geri al', 'Ctrl+Z', I.geri, 'Pencerede son işlemi geri al'],
      ['Yinele', 'Ctrl+Y', I.yinele, 'Geri alınanı tekrar yap'],
      '-',
      ['Kes', 'Ctrl+X', I.kes, 'Seçili bölümü keser ve panoya alır'],
      ['Kopyala', 'Ctrl+C', I.kopyala, 'Seçili bölümü panoya alır'],
      ['Yapıştır', 'Ctrl+V', I.yapistir, 'Panodakini imlecin olduğu yere ekler'],
      ['Karıştırarak yapıştır…', 'Ctrl+M', I.karistir, 'Panodakini (örneğin müziği) bu sesin üzerine seviye ayarlı karıştırır. Sesi silmez'],
      ['Panodan yeni pencere', '', I.panodanPencere, 'Kopyaladığın bölümü yeni bir pencerede aç'],
      '-',
      ['Hepsini seç', 'Ctrl+A', I.tumu, 'Pencerenin tamamını seç'],
      ['Seçimi sil', 'Delete', I.sil, 'Seçili bölümü keser atar, kalanlar birleşir'],
      ['Seçimi tut, gerisini at', 'Ctrl+T', I.kirp, 'Baş ve sondaki gereksiz kısmı kırpar'],
      ['Sessizlik ekle…', '', I.sessizlikEkle, 'İmlecin olduğu yere boşluk ekler']]],
    ['İşlem', [
      ['Ses seviyesi…', '', I.kazanc, 'Seçimi ya da pencerenin tamamını yükseltir veya alçaltır (dB)'],
      ['+1 dB', '', function () { I.kazancHizli(1); }, 'Hızlıca biraz yükselt'],
      ['−1 dB', '', function () { I.kazancHizli(-1); }, 'Hızlıca biraz alçalt'],
      ['Normalleştir', '', I.normal, 'Bozmadan olabildiğince yükseltir (tepe −1 dB)'],
      ['Yumuşak giriş (fade in)', '', I.giris, 'Seçimin başında sesi yavaş açar'],
      ['Yumuşak çıkış (fade out)', '', I.cikis, 'Seçimin sonunda sesi yavaş kısar'],
      ['Seçimi sessiz yap', '', I.sessiz, 'Seçimi susturur ama süre aynı kalır'],
      ['Ters çevir', '', I.ters, 'Seçimi baştan sona çevirir (özel efekt)'],
      ['DC kaymasını sil', '', I.dc, 'Kayıttaki sabit ofseti temizler; kesim yerlerindeki “tık” sesini azaltır']]],
    ['Efekt', [
      ['Dip sesi temizle', '', I.dip, 'Tek tuş: parazit, uğultu ve konuşma aralarındaki gürültüyü siler'],
      ['Gürültü azaltma…', '', gurultuDlg, 'Ayarlı temizlik; gürültü izini kendin seçebilirsin'],
      ['Sessizlikte sesi kıs (kapı)…', '', kapiDlg, 'Konuşma olmayan yerlerde sesi kapatır'],
      ['Ses rengi (EQ)…', '', eqDlg, 'Tok, parlak, sıcak gibi ton ayarı'],
      ['Wave Hammer (kompresör + limiter)…', '', hammerDlg, 'Sesi dengeler ve güçlendirir, bozulmayı önler'],
      ['Reverb (oda yankısı)…', '', yankiDlg, 'Sese oda ya da salon havası verir'],
      ['Eko (gecikme)…', '', ekoDlg, 'Sesin tekrarlarını ekler'],
      ['Perde değiştir…', '', perdeDlg, 'Sesi kalınlaştırır ya da inceltir; süreyi koruyabilir'],
      '-',
      ['Telefon', '', function () { hazirEfekt('telefon', 'Telefon efekti'); }, 'Telefon hattından gelen ses'],
      ['Megafon', '', function () { hazirEfekt('megafon', 'Megafon efekti'); }, 'Megafon ya da anons sesi'],
      ['Robot…', '', robotDlg, 'Robot sesi']]],
    ['Pencere', [
      ['Alt alta diz', '', function () { diz('alt'); }, 'Pencereleri üst üste basamak gibi düzenler'],
      ['Yan yana diz', '', function () { diz('yan'); }, 'Pencereleri yan yana dizer'],
      ['Serbest diz', '', function () { diz('seri'); }, 'Pencereleri ilk açılış düzenine getirir'],
      '-', ['@pencereler']]],
    ['Çal', [
      ['Oynat / Durdur', 'Boşluk', oynatToggle, 'Seçimi ya da imleçten sonrasını çalar'],
      ['Başa dön', '', function () { var p = akt(); if (p) { durdur(); p.imlec = 0; p.sec = null; p.bas = 0; guncelle(); } }, 'İmleci pencerenin başına alır']]],
    ['Görünüm', [
      ['Zamanı yakınlaştır', 'Fare tekerleği', function () { var p = akt(); if (p) zoomT(p, 0.6); }, 'Dalgayı yatayda büyütür'],
      ['Zamanı uzaklaştır', 'Fare tekerleği', function () { var p = akt(); if (p) zoomT(p, 1.6); }, 'Dalgayı yatayda küçültür'],
      ['Tamamını göster', '', function () { var p = akt(); if (p) { tumuGoster(p); ciz(p); } }, 'Ses baştan sona görünür'],
      ['Seviyeyi büyüt', 'Alt + tekerlek', function () { var p = akt(); if (p) { p.vz = Math.min(64, p.vz * 1.6); ciz(p); } }, 'Alçak sesli dalgayı dikeyde büyütür'],
      ['Seviyeyi küçült', '', function () { var p = akt(); if (p) { p.vz = Math.max(0.1, p.vz / 1.6); ciz(p); } }, 'Dalgayı dikeyde küçültür']]],
    ['Yardım', [
      ['Menü rehberi', '', menuRehberi, 'Hangi komut ne işe yarar, hepsi açıklamalı'],
      ['Kısayollar', '', function () { bilgi('Kısayollar', '<p>Boşluk: oynat / durdur<br>Delete ya da Backspace: seçimi sil<br>Ctrl+Z / Ctrl+Y: geri al / yinele<br>Ctrl+X / C / V: kes / kopyala / yapıştır<br>Ctrl+M: karıştırarak yapıştır<br>Ctrl+A: hepsini seç<br>Ctrl+T: seçimi tut<br>Ctrl+O: ses aç<br>Ctrl+R: kayıt<br>Ctrl+E: dışa aktar<br>Fare tekerleği: yakınlaştır, Shift + tekerlek: kaydır, Alt + tekerlek: seviye<br>Seçimi tutup başka pencereye sürükle: karıştırarak yapıştır</p>'); }, ''],
      ['Nasıl çalışır?', '', function () { bilgi('Nasıl çalışır?', '<p><b>Otomatik:</b> sesi ve müziği seçin, “Otomatik hazırla”ya basın.</p><p><b>Manuel stüdyo:</b> her ses kendi penceresinde açılır. Bir pencerede bölüm seçip kopyalayın, diğerine “Karıştırarak yapıştır” deyin. Müziği ses penceresine sürükleyerek de karıştırabilirsiniz.</p><p><b>Dışa aktar:</b> hazır olunca Dosya menüsünden MP3, WAV ya da santral dosyası olarak kaydedin.</p>'); }, '']]]
  ];
  function menuRehberi() {
    var h = ''; M.forEach(function (g) { h += '<h4 style="margin:.8rem 0 .3rem;font-family:\'Barlow Condensed\';font-size:1.15rem">' + esc(g[0]) + '</h4>'; g[1].forEach(function (m) { if (m === '-' || m[0] === '@pencereler' || !m[3]) return; h += '<p style="margin:.15rem 0"><b>' + esc(m[0]) + '</b> <span class="sol" style="font-size:12px">' + esc(m[1]) + '</span><br><span class="sol" style="font-size:13px">' + esc(m[3]) + '</span></p>'; }); });
    bilgi('Menü rehberi', '<div style="max-height:60vh;overflow:auto">' + h + '</div>');
  }
  var mm = $('#menu');
  M.forEach(function (g) {
    var d = document.createElement('div'), b = document.createElement('button'), a = document.createElement('div'); b.textContent = g[0]; a.className = 'acilir';
    function doldur() {
      a.innerHTML = '';
      g[1].forEach(function (m) {
        if (m === '-') { a.appendChild(document.createElement('hr')); return; }
        if (m[0] === '@pencereler') { if (!S.pen.length) { var bo = document.createElement('button'); bo.innerHTML = '<div><b class="sol">(açık pencere yok)</b></div>'; a.appendChild(bo); } S.pen.forEach(function (p) { var x = document.createElement('button'); x.innerHTML = '<div><b>' + (p.id === S.aktif ? '● ' : '') + esc(p.ad) + '</b></div>'; x.onclick = function () { d.classList.remove('ac'); odak(p); }; a.appendChild(x); }); return; }
        var x = document.createElement('button'); x.innerHTML = '<div><b>' + esc(m[0]) + '</b>' + (m[3] ? '<small>' + esc(m[3]) + '</small>' : '') + '</div><span>' + esc(m[1]) + '</span>'; x.onclick = function () { d.classList.remove('ac'); sekme('manuel'); m[2](); }; a.appendChild(x);
      });
    }
    doldur(); d.appendChild(b); d.appendChild(a); mm.appendChild(d);
    b.onclick = function (e) { e.stopPropagation(); var w = d.classList.contains('ac'); $$('.menu>div').forEach(function (z) { z.classList.remove('ac'); }); if (!w) { doldur(); d.classList.add('ac'); } };
  });
  document.addEventListener('click', function () { $$('.menu>div').forEach(function (z) { z.classList.remove('ac'); }); });

  /* ---------- Düğmeler, dosya girişi, sürükle-bırak, kısayollar ---------- */
  $$('[data-i]', $('#arac')).forEach(function (b) { b.onclick = function () { I[b.dataset.i](); }; });
  $('#oynatBtn').onclick = oynatToggle;
  $('#basaBtn').onclick = function () { var p = akt(); durdur(); if (p) { p.imlec = 0; p.sec = null; p.bas = 0; guncelle(); } };
  $('#kayitBtn').onclick = kayitBasla; $('#otoKayit').onclick = function () { sekme('manuel'); kayitBasla(); };
  $('#sesAc').onclick = $('#otoSesAc').onclick = function () { $('#dosyaSes').click(); }; $('#muzikAc').onclick = $('#otoMuzikAc').onclick = function () { $('#dosyaMuzik').click(); };
  $('#yeniBtn').onclick = I.yeni;
  var sonAcilan = '';
  $('#dosyaSes').onchange = async function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) { var p = await dosyadanAc(f, 'ses'); if (p && S.tab !== 'oto') sekme('manuel'); else if (p) { $('#otoSes').value = 'p' + p.id; } } };
  $('#dosyaMuzik').onchange = async function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) { var p = await dosyadanAc(f, 'muzik'); if (p) { if (S.tab === 'oto') $('#otoMuzik').value = 'p' + p.id; else sekme('manuel'); } } };
  $('#hedef').onchange = function () { hedefUygula(); };
  $('#otoBtn').onclick = function () { oto(false); }; $('#yenidenBtn').onclick = function () { oto(true); };
  $('#sonucCal').onclick = function () { if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın'); if (S.cal) durdur(); else calDizi(S.sonuc.L, S.sonuc.R, null, 0); };
  $('#sonucManuel').onclick = function () { if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın'); pencereAc(S.sonucAd + ' (otomatik)', S.sonuc.L.slice(), S.sonuc.R.slice(), 'sonuc'); otoListeleri(); sekme('manuel'); };
  $('#sonucDisa').onclick = function () { if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın'); disaDlg('sonuc'); };
  document.addEventListener('dragover', function (e) { e.preventDefault(); if (S.tab === 'manuel') alan.classList.add('birak'); });
  document.addEventListener('dragleave', function (e) { if (!e.relatedTarget) alan.classList.remove('birak'); });
  document.addEventListener('drop', async function (e) {
    e.preventDefault(); alan.classList.remove('birak'); var f = e.dataTransfer && e.dataTransfer.files[0]; if (!f) return;
    var tur = S.tab === 'muzik' ? 'muzik' : 'ses'; var p = await dosyadanAc(f, tur); if (p) { if (S.tab === 'oto') $('#otoSes').value = 'p' + p.id; else sekme('manuel'); }
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return; if (document.querySelector('.perde')) return; if (S.tab !== 'manuel') return;
    var c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); oynatToggle(); }
    else if (c && k === 'z') { e.preventDefault(); I.geri(); } else if (c && k === 'y') { e.preventDefault(); I.yinele(); }
    else if (c && k === 'x') { e.preventDefault(); I.kes(); } else if (c && k === 'c') { e.preventDefault(); I.kopyala(); } else if (c && k === 'v') { e.preventDefault(); I.yapistir(); }
    else if (c && k === 'm') { e.preventDefault(); I.karistir(); } else if (c && k === 'a') { e.preventDefault(); I.tumu(); } else if (c && k === 't') { e.preventDefault(); I.kirp(); }
    else if (c && k === 'o') { e.preventDefault(); $('#dosyaSes').click(); } else if (c && k === 'r') { e.preventDefault(); kayitBasla(); } else if (c && k === 'e') { e.preventDefault(); I.disa(); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); I.sil(); }
  });
  window.__studyo = { S: S, Motor: Motor, I: I, pencereAc: pencereAc, dosyadanAc: dosyadanAc, oto: oto, diz: diz, ciz: ciz, kapat: kapat, karistirDlg: karistirDlg, gurultuDlg: gurultuDlg, disaDlg: disaDlg, sekme: sekme, bolgeUygula: bolgeUygula, dipTemizle: dipTemizle };

  hedefUygula(); otoListeleri(); guncelle(); bankaYukle();
})();
