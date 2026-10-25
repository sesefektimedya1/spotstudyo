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
  /* Her tarayıcıda (telefon dahil) ses, motorun beklediği 44100 Hz'e çevrilerek okunur */
  async function coz(ab) {
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, kopya = ab.slice(0);
    if (OC) {
      try { var oc = new OC(1, 1, SR); var b = await new Promise(function (ok, no) { var r = oc.decodeAudioData(ab, ok, no); if (r && r.then) r.then(ok, no); }); if (b && Math.round(b.sampleRate) === SR) return b; } catch (e) {}
    }
    var b2 = await ac().decodeAudioData(kopya);
    if (Math.round(b2.sampleRate) !== SR) {
      var oc2 = new (OC || window.AudioContext)(b2.numberOfChannels, Math.max(1, Math.ceil(b2.duration * SR)), SR), kn = oc2.createBufferSource(); kn.buffer = b2; kn.connect(oc2.destination); kn.start(0); return await oc2.startRendering();
    }
    return b2;
  }
  function yenidenOrnekle(x, kaynakHz) {
    if (Math.round(kaynakHz) === SR) return x;
    var oran = kaynakHz / SR, m = Math.max(1, Math.floor(x.length / oran)), o = new Float32Array(m);
    for (var i = 0; i < m; i++) { var t = i * oran, k = Math.floor(t), f = t - k; o[i] = (x[k] || 0) * (1 - f) + (x[k + 1] || 0) * f; }
    return o;
  }
  function mono(L, R) { if (L === R) return L; var o = new Float32Array(L.length); for (var i = 0; i < o.length; i++) o[i] = 0.5 * (L[i] + R[i]); return o; }

  /* ---------- Pencereler ---------- */
  var RENK = { ses: '#0b0b6b', muzik: '#0b0b6b', sonuc: '#0b0b6b', kayit: '#0b0b6b' };
  function akt() { return S.pen.filter(function (p) { return p.id === S.aktif; })[0] || null; }
  function zbHtml() { var ZB = ['<button class="ik kayitIk" data-c="kayit" title="Kayıt">K</button>','<button class="ik" data-c="bas" title="Başa dön">B</button>','<button class="ik" data-c="geri" title="Geri sar (2 sn)">G</button>','<button class="ik" data-c="dur" title="Durdur">D</button>','<button class="ik" data-c="cal" title="Oynat / Durdur">C</button>','<button class="ik" data-c="ileri" title="İleri sar (2 sn)">I</button>','<button class="ik" data-c="son" title="Sona git">S</button>','<i class="ay"></i>','<button class="ik" data-z="+" title="Zamanı yakınlaştır">Z</button>','<button class="ik" data-z="-" title="Zamanı uzaklaştır">z</button>','<button class="ik" data-z="t" title="Tamamını göster">T</button>','<i class="ay"></i>','<button class="ik" data-v="+" title="Dalgayı büyüt">V</button>','<button class="ik" data-v="-" title="Dalgayı küçült">v</button>','<button class="ik" data-v="1" title="Seviyeyi sıfırla">1</button>'];
  var ZBI = {K:'kayit',B:'basa',G:'gerisar',D:'dur',C:'oynat',I:'ilerisar',S:'sona',Z:'zin',z:'zout',T:'ztum',V:'lin',v:'lout',1:'ztum'};
  return ZB.map(function (h) { return h.replace(/>([A-Za-z1])<\/button>/, function (m, k) { return '>' + (k === '1' ? '<b class="bir">1×</b>' : ikon(ZBI[k])) + '</button>'; }); }).join(''); }
  function pencereAc(ad, L, R, tur) {
    var p = { id: ++S.sayac, ad: ad, tur: tur || 'ses', L: L, R: R || L, sec: null, imlec: 0, bas: 0, spp: 1, vz: 1, undo: [], redo: [], ov: null };
    var el = document.createElement('div'); el.className = 'pen';
    el.innerHTML = '<div class="bas"><b></b><small></small><button class="wb mn" title="Küçült (alta indir)"><svg viewBox="0 0 12 12" width="11" height="11"><path d="M2 9h8" stroke="currentColor" stroke-width="1.6"/></svg></button><button class="wb mx" title="Büyüt / eski boyuta dön"><svg viewBox="0 0 12 12" width="11" height="11"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button><button class="x" title="Pencereyi kapat">✕</button></div><div class="ov" title="Genel görünüm: tıklayıp sürükleyerek gezinin"><canvas></canvas></div><div class="dalga"><canvas class="cv"></canvas></div><div class="kay" title="Kaydırma çubuğu"><div class="th"></div></div><i class="rz rzr" data-d="r"></i><i class="rz rzl" data-d="l"></i><i class="rz rzb" data-d="b"></i><i class="rz rzbr" data-d="rb"></i><i class="rz rzbl" data-d="lb"></i><div class="zb">' + zbHtml() + '<span class="sure"></span></div>';
    alan.appendChild(el); p.el = el; p.cv = $('.cv', el); p.ovc = $('.ov canvas', el); p.kay = $('.kay', el); p.th = $('.th', el);
    var w = alan.clientWidth, h = alan.clientHeight, n = S.pen.length;
    var gizli = !alan.clientHeight, pn = null; if (gizli) { pn = alan.closest('.panel'); if (pn) { pn.classList.add('acik'); w = alan.clientWidth; h = alan.clientHeight; } }
    var MG = 110, yuk = 340, satir = 99, sol = n < satir ? MG : MG + ((n - satir) % 6 + 1) * 28, gen = Math.max(420, w - sol - MG);
    el.style.width = gen + 'px'; el.style.height = yuk + 'px'; el.style.left = sol + 'px'; el.style.top = (n < satir ? 8 + n * (yuk + 8) : 8 + ((n - satir) % 6 + 1) * 28) + 'px';
    if (gizli && pn && S.tab !== 'manuel') pn.classList.remove('acik');
    S.pen.push(p); kenarlar(p); $('.bas b', el).textContent = ad; alan.scrollTop = Math.max(0, parseInt(el.style.top, 10) - 8);
    baglaPencere(p); odak(p); tumuGoster(p); $('#bosAlan').style.display = 'none'; guncelle(); mobDiz();
    if (window.ResizeObserver) new ResizeObserver(function () { if (p.el.isConnected) ciz(p); }).observe(p.el);
    return p;
  }
  function kenarlar(p) {
    var el = p.el;
    $$('.rz', el).forEach(function (h) {
      h.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation(); odak(p); try { h.setPointerCapture(e.pointerId); } catch (x) {}
        var d = h.dataset.d, x0 = e.clientX, y0 = e.clientY, L = el.offsetLeft, W = el.offsetWidth, H = el.offsetHeight;
        function mv(ev) {
          var dx = ev.clientX - x0, dy = ev.clientY - y0;
          if (d.indexOf('r') >= 0) el.style.width = Math.max(380, W + dx) + 'px';
          if (d.indexOf('l') >= 0) { var nw = Math.max(380, W - dx); el.style.width = nw + 'px'; el.style.left = (L + W - nw) + 'px'; }
          if (d.indexOf('b') >= 0) el.style.height = Math.max(170, H + dy) + 'px';
        }
        function up() { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); ciz(p); }
        h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      });
    });
    $('.mn', el).onclick = function (e) { e.stopPropagation(); kucult(p); };
    $('.mx', el).onclick = function (e) { e.stopPropagation(); buyut(p); };
    $('.bas', el).ondblclick = function (e) { if (e.target.closest('button')) return; buyut(p); };
  }
  function buyut(p) {
    var el = p.el;
    if (p.maks) { el.style.left = p.geo[0] + 'px'; el.style.top = p.geo[1] + 'px'; el.style.width = p.geo[2] + 'px'; el.style.height = p.geo[3] + 'px'; p.maks = false; }
    else { p.geo = [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]; alan.scrollTop = 0; el.style.left = '0'; el.style.top = '0'; el.style.width = alan.clientWidth + 'px'; el.style.height = alan.clientHeight + 'px'; p.maks = true; }
    el.classList.toggle('maks', !!p.maks); odak(p); ciz(p);
  }
  function kucult(p) {
    p.el.style.display = 'none'; p.kucuk = true; if (S.aktif === p.id) { var d = S.pen.filter(function (q) { return !q.kucuk; })[0]; if (d) odak(d); }
    var c = document.createElement('button'); c.className = 'dockChip'; c.title = 'Eski boyuta getir: ' + p.ad; c.innerHTML = '<span class="nokta"></span>' + esc(p.ad); p.chip = c;
    c.onclick = function () { p.el.style.display = ''; p.kucuk = false; c.remove(); p.chip = null; odak(p); ciz(p); };
    $('#dock').appendChild(c);
  }
  function yeniVeyaBos(ad, L, R, tur) {
    var p = akt();
    if (p && p.bos) { p.bos = false; p.ad = ad; p.tur = tur; p.L = L; p.R = R || L; p.undo = []; p.redo = []; p.sec = null; p.imlec = 0; p.ovC = null; $('.bas b', p.el).textContent = ad; tumuGoster(p); odak(p); guncelle(); return p; }
    return pencereAc(ad, L, R, tur);
  }
  function odak(p) { S.aktif = p ? p.id : null; S.pen.forEach(function (q) { q.el.classList.toggle('aktif', q === p); }); if (p) p.el.style.zIndex = ++S.z0; guncelle(); }
  function telefonMu() { return !!(window.matchMedia && window.matchMedia('(max-width:820px)').matches); }
  function mobDiz() { if (telefonMu() && S.pen.some(function (q) { return !q.kucuk && !q.maks; })) { diz('alt'); S.pen.forEach(function (q) { if (!q.kucuk) ciz(q); }); } }
  function kapat(p) {
    if (!p) return; if (S.calP === p) durdur(); p.el.remove(); if (p.chip) p.chip.remove(); S.pen = S.pen.filter(function (q) { return q !== p; });
    if (S.aktif === p.id) { S.aktif = null; var son = S.pen[S.pen.length - 1]; if (son) odak(son); }
    if (!S.pen.length) $('#bosAlan').style.display = 'flex'; guncelle(); otoListeleri(); mobDiz();
  }
  function baglaPencere(p) {
    var el = p.el;
    el.addEventListener('mousedown', function () { if (S.aktif !== p.id) odak(p); }, true);
    $('.x', el).onclick = function () { kapatSor(p); };
    // taşıma
    $('.bas', el).addEventListener('mousedown', function (e) {
      if (e.target.tagName === 'BUTTON') return; var x0 = e.clientX, y0 = e.clientY, l0 = el.offsetLeft, t0 = el.offsetTop; e.preventDefault();
      function mv(ev) { el.style.left = (l0 + ev.clientX - x0) + 'px'; el.style.top = Math.max(0, t0 + ev.clientY - y0) + 'px'; }
      function up() { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }
      window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    });
    /* Telefon: başlığı parmakla sürükleyip başka pencerenin üstüne bırakınca iki pencerenin yeri değişir */
    (function () {
      var bs = $('.bas', el), gh = null, ts = null;
      bs.addEventListener('touchstart', function (e) { if (e.target.closest('button') || e.touches.length !== 1) return; ts = e.touches[0]; odak(p); }, { passive: true });
      bs.addEventListener('touchmove', function (e) {
        if (!ts) return; var t = e.touches[0]; e.preventDefault();
        if (!gh) { gh = document.createElement('div'); gh.className = 'tasiGhost'; gh.textContent = 'Yerini değiştirmek için başka pencerenin üstüne bırakın'; document.body.appendChild(gh); }
        gh.style.left = '10px'; gh.style.top = (t.clientY + 14) + 'px';
      }, { passive: false });
      function bitis(e) {
        if (!ts) return; var t = (e.changedTouches && e.changedTouches[0]) || ts; ts = null; if (gh) { gh.remove(); gh = null; }
        var hedef = document.elementFromPoint(t.clientX, t.clientY), pe = hedef && hedef.closest ? hedef.closest('.pen') : null;
        if (pe && pe !== el) { var a = el.style.top, h1 = el.style.height; el.style.top = pe.style.top; el.style.height = pe.style.height; pe.style.top = a; pe.style.height = h1; S.pen.forEach(ciz); }
      }
      bs.addEventListener('touchend', bitis); bs.addEventListener('touchcancel', bitis);
    })();
    $('.bas', el).addEventListener('dblclick', function (e) { if (e.target.tagName !== 'BUTTON') tumuGoster(p), ciz(p); });
    $$('[data-z]', el).forEach(function (b) { b.onclick = function () { var v = b.dataset.z; if (v === '+') zoomT(p, 0.6); else if (v === '-') zoomT(p, 1.6); else { tumuGoster(p); ciz(p); } }; });
    $$('[data-v]', el).forEach(function (b) { b.onclick = function () { var v = b.dataset.v; p.vz = v === '+' ? Math.min(64, p.vz * 1.6) : (v === '-' ? Math.max(0.1, p.vz / 1.6) : 1); ciz(p); }; });
    $$('[data-c]', el).forEach(function (b) { b.onclick = function () { var v = b.dataset.c; odak(p); if (v === 'cal') { if (kayit) kayitDuraklat(); else if (S.cal && S.calP === p) durdur(); else calPencere(p); } else if (v === 'dur') { if (kayit) kayitDur(); durdur(); } else if (v === 'bas') { durdur(); p.imlec = 0; p.sec = null; p.bas = 0; guncelle(); } else if (v === 'kayit') kayitBasla(); else if (v === 'geri') sar(-2); else if (v === 'ileri') sar(2); else if (v === 'son') I.sona(); }; });
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
  function kanalCiz(g, dizi, p, y0, h, W, d, no, rh) {
    g.fillStyle = '#ffffff'; g.fillRect(0, y0, W, h);
    var mid = y0 + h / 2, k = h * 0.47 * p.vz;
    if (p.sec) { var a = Math.max(0, (p.sec[0] - p.bas) / p.spp * d), b = Math.min(W, (p.sec[1] - p.bas) / p.spp * d); if (b > a) { g.fillStyle = '#000000'; g.fillRect(a, y0, b - a, h); } }
    if (dizi.length) {
      var piks = Math.max(1, Math.floor(W / d)), bas = Math.max(0, Math.floor(p.bas)), son = Math.min(dizi.length, Math.floor(p.bas + piks * p.spp));
      if (son > bas) {
        var alt = dizi.subarray(bas, son), adet = Math.min(piks, Math.ceil(alt.length / Math.max(1, p.spp))), pk = Motor.tepeler(alt, Math.max(1, adet)), gen = (alt.length / p.spp) / adet * d;
        for (var i = 0; i < adet; i++) {
          var y1 = Math.max(y0, mid - pk[2 * i + 1] * k), y2 = Math.min(y0 + h, mid - pk[2 * i] * k), x = i * gen, sel = p.sec && (bas + i * p.spp) >= p.sec[0] && (bas + i * p.spp) <= p.sec[1];
          g.fillStyle = sel ? '#3d8bff' : (p.kayitta ? '#1f5fd6' : '#101418'); g.fillRect(x, y1, Math.max(1, gen), Math.max(1, y2 - y1));
        }
      }
    }
    g.fillStyle = '#9aa4b2'; g.fillRect(0, mid, W, Math.max(1, d)); g.fillStyle = '#c3c9d1'; g.fillRect(0, y0 + h - 1, W, 1);
    g.fillStyle = '#3a3acb'; g.strokeStyle = '#fff'; var bx = 5 * d, by = y0 + 5 * d, bw = 17 * d, bh = 14 * d; g.fillRect(bx, by, bw, bh); g.fillStyle = '#fff'; g.font = (11 * d) + 'px Barlow,sans-serif'; g.textBaseline = 'middle'; g.fillText(String(no), bx + 5 * d, by + bh / 2);
  }
  function ciz(p) {
    if (!p || !p.el.isConnected) return;
    var c = p.cv, d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height, RH = 18 * d, dz = H - RH;
    g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ececec'; g.fillRect(0, 0, W, RH); g.fillStyle = '#9a9a9a'; g.fillRect(0, RH - 1, W, 1);
    var nL = p.L.length, wP = gW(p); if (!p.kayitta && nL > 0 && wP > 0 && p.spp * wP > nL * 1.0001) { p.spp = Math.max(0.05, nL / wP); p.bas = 0; }
    var st = p.R !== p.L, nk = st ? 2 : 1, ch = dz / nk;
    kanalCiz(g, p.L, p, RH, ch, W, d, 1, RH); if (st) kanalCiz(g, p.R, p, RH + ch, ch, W, d, 2, RH);
    // cetvel
    g.font = (10.5 * d) + 'px Barlow,sans-serif'; g.textBaseline = 'middle';
    var pxs = SR / p.spp / d, adim = ADIM[ADIM.length - 1]; for (var q = 0; q < ADIM.length; q++) if (ADIM[q] * pxs >= 80) { adim = ADIM[q]; break; }
    var t0 = p.bas / SR, tS = (p.bas + gW(p) * p.spp) / SR;
    for (var t = Math.ceil(t0 / adim) * adim; t <= tS; t += adim) { var x = (t * SR - p.bas) / p.spp * d; g.fillStyle = 'rgba(128,138,152,.28)'; g.fillRect(x, RH, 1, dz); g.fillStyle = '#555'; g.fillRect(x, RH - 7 * d, 1, 7 * d); g.fillStyle = '#222'; g.fillText(zamanFmt(t), x + 3 * d, RH / 2 - 1); }
    // imleç
    var im = (S.calP === p && S.cal) ? S.imlecCal : p.imlec, x2 = (im - p.bas) / p.spp * d; if (x2 >= 0 && x2 <= W) { g.fillStyle = S.calP === p ? '#ff8a2a' : '#e0452f'; g.fillRect(x2, RH, Math.max(1, d), dz); if (S.calP !== p) { g.fillStyle = '#e0452f'; g.beginPath(); g.moveTo(x2 - 5 * d, RH); g.lineTo(x2 + 5 * d, RH); g.lineTo(x2, RH + 7 * d); g.fill(); } }
    if (p.durYer != null && !(S.calP === p && S.cal)) { if (p.durAnahtar !== p.imlec + '|' + (p.sec ? p.sec.join() : '')) p.durYer = null; else { var xd = (p.durYer - p.bas) / p.spp * d; if (xd >= 0 && xd <= W) { g.fillStyle = '#ff8a2a'; for (var yy = RH; yy < RH + dz; yy += 8 * d) g.fillRect(xd, yy, Math.max(1, d), 5 * d); g.beginPath(); g.moveTo(xd - 5 * d, RH); g.lineTo(xd + 5 * d, RH); g.lineTo(xd, RH + 7 * d); g.fill(); g.font = 'bold ' + (10.5 * d) + 'px Barlow,sans-serif'; g.fillStyle = '#c2510c'; g.fillText('Durdu ' + sn(p.durYer / SR), xd + 7 * d, RH + 14 * d); } } }
    ovCiz(p); kaydirCiz(p);
    $('.bas small', p.el).textContent = sn(p.L.length / SR) + (p.R !== p.L ? ' · stereo' : ' · mono');
    $('.sure', p.el).textContent = (p.sec ? 'Seçim ' + sn(p.sec[0] / SR) + ' – ' + sn(p.sec[1] / SR) + ' (' + ((p.sec[1] - p.sec[0]) / SR).toFixed(2) + ' sn)' : 'İmleç ' + sn(p.imlec / SR)) + ' · Seviye ' + p.vz.toFixed(1) + '×';
  }
  function ovCiz(p) {
    var c = p.ovc, d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    var n = p.L.length; if (!n) return; var st = p.R !== p.L;
    if (!p.ovC || (p.ovC.ref !== p.L && !(p.kayitta && Date.now() - p.ovC.t < 400)) || p.ovC.W !== W) p.ovC = { t: Date.now(), ref: p.L, W: W, pk: Motor.tepeler(p.L, Math.max(1, W)), pk2: st ? Motor.tepeler(p.R, Math.max(1, W)) : null };
    var hh = st ? H / 2 : H;
    [p.ovC.pk, p.ovC.pk2].forEach(function (pk, ci) { if (!pk) return; var mid = ci * hh + hh / 2; g.fillStyle = '#2b2bff'; for (var i = 0; i < W; i++) { var y1 = mid - pk[2 * i + 1] * hh * 0.47, y2 = mid - pk[2 * i] * hh * 0.47; g.fillRect(i, y1, 1, Math.max(1, y2 - y1)); } });
    var a = p.bas / n * W, b = Math.min(n, p.bas + gW(p) * p.spp) / n * W; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1, d); g.strokeRect(a + .5, .5, Math.max(2, b - a) - 1, H - 1);
    if (p.sec) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(p.sec[0] / n * W, 0, Math.max(1, (p.sec[1] - p.sec[0]) / n * W), H); }
  }
  function kaydirCiz(p) { var n = Math.max(1, p.L.length), W = p.kay.clientWidth || 1, goruntu = gW(p) * p.spp; p.th.style.left = (p.bas / n * W) + 'px'; p.th.style.width = Math.max(24, Math.min(W, goruntu / n * W)) + 'px'; }

  /* ---------- Seçim ---------- */
  function x2s(p, ev) { var r = p.cv.getBoundingClientRect(); return Math.max(0, Math.min(p.L.length, Math.round(p.bas + (ev.clientX - r.left) * p.spp))); }
  function secimBagla(p) {
    var c = p.cv, surukle = false, mod = 'yeni', sabit = 0, tasi = null;
    c.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; odak(p); var s2 = x2s(p, e), tol = 6 * p.spp, sc = p.sec;
      if (e.__dokunma) tol = 20 * p.spp;
      if (sc && s2 > sc[0] + tol && s2 < sc[1] - tol && sc[1] - sc[0] > 100) { mod = 'tasi'; tasi = { x: e.clientX, y: e.clientY, dolu: false }; }
      else if (sc && Math.abs(s2 - sc[0]) <= tol) { mod = 'kenar'; sabit = sc[1]; }
      else if (sc && Math.abs(s2 - sc[1]) <= tol) { mod = 'kenar'; sabit = sc[0]; }
      else if (e.shiftKey && (sc || p.imlec != null)) { mod = 'kenar'; sabit = sc ? (s2 < sc[0] ? sc[1] : sc[0]) : p.imlec; p.sec = [Math.min(s2, sabit), Math.max(s2, sabit)]; }
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
    /* Parmakla seçim: dokunma hareketini fare olaylarına çevirir (yalnızca tek parmak) */
    function fareGonder(tip, t, hedef) { var ev = new MouseEvent(tip, { clientX: t.clientX, clientY: t.clientY, button: 0, bubbles: true, cancelable: true }); ev.__dokunma = true; hedef.dispatchEvent(ev); }
    var sonT = null, dokunSure = 0;
    c.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) return; e.preventDefault(); sonT = e.touches[0]; var simdi = Date.now(); if (simdi - dokunSure < 320) { p.sec = [0, p.L.length]; guncelle(); sonT = null; dokunSure = 0; return; } dokunSure = simdi; fareGonder('mousedown', sonT, c); }, { passive: false });
    c.addEventListener('touchmove', function (e) { if (e.touches.length !== 1 || !surukle) return; e.preventDefault(); sonT = e.touches[0]; fareGonder('mousemove', sonT, window); }, { passive: false });
    c.addEventListener('touchend', function (e) { if (!sonT) return; e.preventDefault(); fareGonder('mouseup', sonT, window); sonT = null; if (p.sec && p.sec[1] - p.sec[0] > SR * 0.3 && !S.dokunIpucu) { S.dokunIpucu = 1; toast('Seçili bölüme basıp sürükleyerek başka pencerenin üstüne bırakabilirsiniz (karıştırır)'); } }, { passive: false });
    c.addEventListener('touchcancel', function () { if (sonT) { fareGonder('mouseup', sonT, window); sonT = null; } });
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
    var p = akt(); $('#dPen').textContent = p ? p.ad : '—'; $('#dFmt').textContent = p ? (SR / 1000).toFixed(1).replace('.', ',') + ' kHz · 32 bit float · ' + (p.R && p.R !== p.L ? 'Stereo' : 'Mono') + ' · ' + sn(p.L.length / SR) : '';
    $('#dSecim').textContent = p ? (p.sec ? sn(p.sec[0] / SR) + ' – ' + sn(p.sec[1] / SR) + ' (' + ((p.sec[1] - p.sec[0]) / SR).toFixed(2) + ' sn)' : 'imleç ' + sn(p.imlec / SR)) : 'yok';
    if (p && p.L.length) { var st = Motor.istatistik(p.L, SR); $('#dSes').textContent = 'zemin ' + st.zeminDb.toFixed(0) + ' dB   konuşma ' + st.konusmaDb.toFixed(0) + ' dB   tepe ' + st.tepeDb.toFixed(1) + ' dB'; } else $('#dSes').textContent = '—';
    $('#sBas').textContent = p && p.sec ? sn(p.sec[0] / SR) : '—'; $('#sSon').textContent = p && p.sec ? sn(p.sec[1] / SR) : '—';
    $('#zaman').textContent = sn(p ? ((S.cal && S.calP === p) ? S.imlecCal : p.imlec) / SR : 0);
  }
  window.addEventListener('resize', function () { S.pen.forEach(function (p) { var mx = Math.max(0, p.L.length - gW(p) * p.spp); if (p.bas > mx) p.bas = mx; ciz(p); }); });

  /* ---------- Çalma ---------- */
  function durdur() { if (S.cal && S.calP) { var q = S.calP; q.durYer = S.imlecCal; q.durAnahtar = q.imlec + '|' + (q.sec ? q.sec.join() : ''); } if (S.cal) { try { S.cal.onended = null; S.cal.stop(); } catch (e) {} S.cal = null; } var pp = S.calP; S.calP = null; oynatIk(0); if (pp && pp.el.isConnected) ciz(pp); guncelle(); }
  function calDizi(L, R, p, bas, onBitti) {
    if (kayit) return toast('Kayıt sürüyor. Önce durdurun');
    durdur(); if (p) p.durYer = null; if (!L.length) return; var c = ac(), n = L.length - bas; if (n < 100) { bas = 0; n = L.length; }
    var b = c.createBuffer(2, n, SR); b.getChannelData(0).set(L.subarray(bas)); b.getChannelData(1).set((R || L).subarray(bas));
    var s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); var t0 = c.currentTime + 0.03; s.start(t0);
    S.cal = s; S.calP = p || null; S.imlecCal = bas; oynatIk(1);
    s.onended = function () { if (S.cal === s) { S.cal = null; var pp = S.calP; if (pp) { pp.durYer = S.imlecCal; pp.durAnahtar = pp.imlec + '|' + (pp.sec ? pp.sec.join() : ''); } S.calP = null; oynatIk(0); if (pp) ciz(pp); guncelle(); if (onBitti) onBitti(); } };
    (function raf() { if (S.cal !== s) return; S.imlecCal = bas + Math.max(0, c.currentTime - t0) * SR; if (p) { if (S.takip !== false && S.imlecCal > p.bas + gW(p) * p.spp) { p.bas = Math.min(Math.max(0, p.L.length - gW(p) * p.spp), S.imlecCal - 20 * p.spp); } ciz(p); } $('#sBas').textContent = p && p.sec ? sn(p.sec[0] / SR) : '—'; $('#sSon').textContent = p && p.sec ? sn(p.sec[1] / SR) : '—';
    $('#zaman').textContent = sn(S.imlecCal / SR); requestAnimationFrame(raf); })();
  }
  function calPencere(p) {
    if (!p) return toast('Önce bir pencere açın');
    var a = p.sec ? p.sec[0] : p.imlec, b = p.sec ? p.sec[1] : p.L.length, tam = p.R;
    var bit = function () { if (S.dongu && p.sec) calPencere(p); }; if (p.sec) { calDizi(p.L.subarray(0, b), p.R === p.L ? null : p.R.subarray(0, b), p, a, bit); } else calDizi(p.L, p.R === p.L ? null : p.R, p, a);
  }
  function oynatToggle() { if (kayit) return kayitDuraklat(); if (S.cal) return durdur(); calPencere(akt()); }

  /* ---------- Dosya ve kayıt ---------- */
  function ad2(f) { return String(f).replace(/\.[^.]+$/, ''); }
  async function dosyadanAc(file, tur) {
    try { mesaj('Okunuyor…'); var b = await coz(await file.arrayBuffer()), s = stereoAl(b); var p = yeniVeyaBos(ad2(file.name), s.L, s.R, 'ses'); mesaj(''); otoListeleri(); return p; }
    catch (e) { hata(new Error('Bu dosya okunamadı. MP3, WAV veya M4A deneyin.')); }
  }
  var kayit = null, mikId = '', kayitNo = 0;
  async function kayitBasla() {
    if (kayit) return kayitDur();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Bu tarayıcı kaydı desteklemiyor. Chrome veya Edge kullanın.');
    var p = akt(), ad = 'Kayıt ' + (++kayitNo), yeniAcildi = false, eskiBos = false;
    durdur(); if (S.tab !== 'manuel') sekme('manuel');
    if (p && p.bos) { eskiBos = true; p.bos = false; p.ad = ad; $('.bas b', p.el).textContent = ad; } else { p = pencereAc(ad, new Float32Array(0), null, 'ses'); yeniAcildi = true; }
    var bekleK = { bekle: true, bitir: function () {} }; kayit = bekleK; p.L = p.R = new Float32Array(0); p.ovC = null; p.kayitta = true; p.spp = Math.max(1, SR * 8 / gW(p)); p.bas = 0; odak(p); ciz(p);
    (function (g, c2, d) { g.save(); g.font = 'bold ' + (14 * d) + 'px sans-serif'; g.fillStyle = '#1d2430'; g.fillText('Mikrofon açılıyor… Tarayıcı izin isterse “İzin ver”e basın', 30 * d, 40 * d); g.restore(); })(p.cv.getContext('2d'), p.cv, p.cv.width / (p.cv.clientWidth || p.cv.width));
    try {
      var c = ac(), stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: mikId ? { exact: mikId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } }); }
      catch (e1) { if (e1 && (e1.name === 'OverconstrainedError' || e1.name === 'NotReadableError' || e1.name === 'TypeError')) { mikId = null; stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } else throw e1; }
      if (c.state === 'suspended') { try { await c.resume(); } catch (e2) {} }
      var src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 1024; src.connect(an);
      var sp = c.createScriptProcessor(4096, 1, 1), sifir = c.createGain(); sifir.gain.value = 0; src.connect(sp); sp.connect(sifir); sifir.connect(c.destination);
      var buf = new Float32Array(SR * 60), n = 0, alive = true, seviye = -90, tepe = -90, tepeT = 0;
      p.L = p.R = buf.subarray(0, 0); p.undo = []; p.redo = []; p.sec = null; p.imlec = 0; p.ovC = null; p.kayitta = true; p.spp = Math.max(1, SR * 8 / gW(p)); p.bas = 0; odak(p);
      var K = { p: p, duraklat: false };
      sp.onaudioprocess = function (e) { if (K.duraklat) return; var d = e.inputBuffer.getChannelData(0); if (n + d.length > buf.length) { var nb = new Float32Array(buf.length * 2); nb.set(buf.subarray(0, n)); buf = nb; } buf.set(d, n); n += d.length; };
      var tb = new Float32Array(1024);
      (function olc() {
        if (!alive) return;
        an.getFloatTimeDomainData(tb); var m = 0; for (var i = 0; i < tb.length; i++) m = Math.max(m, Math.abs(tb[i])); seviye = Motor.toDb(m);
        $('#metre i').style.width = Math.max(0, Math.min(100, (seviye + 60) / 60 * 100)) + '%';
        if (seviye > tepe || Date.now() - tepeT > 1200) { tepe = seviye; tepeT = Date.now(); }
        p.L = p.R = buf.subarray(0, n); var span = gW(p) * p.spp; p.bas = Math.max(0, n - span * 0.9); p.imlec = n;
        if (p.el.isConnected) { ciz(p); kayitUst(p, seviye, tepe, K.duraklat); }
        $('#zaman').textContent = sn(n / SR);
        requestAnimationFrame(olc);
      })();
      K.bitir = function () {
        alive = false; try { sp.onaudioprocess = null; sp.disconnect(); src.disconnect(); } catch (e) {} stream.getTracks().forEach(function (t) { t.stop(); });
        $('#metre i').style.width = '0'; $('#kayitBtn').classList.remove('kayitta'); $('#kayitBtn').title = 'Mikrofonla kayıt  (Ctrl+R)'; $('#otoKayit').textContent = '● Mikrofonla kayıt al'; oynatIk(0);
        p.kayitta = false; kayit = null;
        if (Math.round(c.sampleRate) !== SR) { buf = yenidenOrnekle(buf.subarray(0, n), c.sampleRate); n = buf.length; }
        if (n < SR * 0.1) { toast('Kayıt çok kısa, alınmadı'); if (p.el.isConnected) { p.L = p.R = new Float32Array(SR * 2); p.bos = true; p.ovC = null; tumuGoster(p); } guncelle(); return; }
        p.L = p.R = buf.slice(0, n); p.kirli = true; p.ovC = null; p.imlec = 0; tumuGoster(p); odak(p); otoListeleri(); if (S.tab === 'oto' && S.aktif) $('#otoSes').value = 'p' + S.aktif; guncelle();
      };
      kayit = K; $('#kayitBtn').classList.add('kayitta'); $('#kayitBtn').title = 'Kaydı bitir'; $('#otoKayit').textContent = '■ Kaydı bitir'; oynatIk(1);
      if (S.tab !== 'manuel' && S.tab !== 'oto') sekme('manuel');
    } catch (e) {
      kayit = null; p.kayitta = false; if (yeniAcildi) kapat(p); else if (eskiBos) { p.bos = true; p.L = p.R = new Float32Array(SR * 2); p.ovC = null; tumuGoster(p); ciz(p); } kayitNo--;
      toast(e.name === 'NotAllowedError' ? 'Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden mikrofona izin verin.' : e.name === 'NotFoundError' ? 'Mikrofon bulunamadı. Mikrofonu takıp tekrar deneyin.' : 'Mikrofon açılamadı: ' + e.message);
    }
  }
  function kayitDur() { if (kayit) kayit.bitir(); }
  function kayitDuraklat() { if (!kayit || kayit.bekle) return; kayit.duraklat = !kayit.duraklat; oynatIk(kayit.duraklat ? 0 : 1); }
  function kayitUst(p, sev, tepe, dur) {
    var c = p.cv, g = c.getContext('2d'), d = c.width / (c.clientWidth || c.width), W = c.width;
    g.save(); g.font = 'bold ' + (13 * d) + 'px sans-serif'; g.textBaseline = 'middle';
    g.fillStyle = dur ? '#b58900' : '#d83a2c'; if (dur || Math.floor(Date.now() / 500) % 2) { g.beginPath(); g.arc(18 * d, 36 * d, 6 * d, 0, 7); g.fill(); }
    g.fillStyle = '#1d2430'; g.fillText((dur ? 'DURAKLATILDI  ' : 'KAYIT  ') + sn(p.L.length / SR), 30 * d, 36 * d);
    var bw = 220 * d, bx = W - bw - 14 * d, by = 30 * d, bh = 12 * d; g.fillStyle = '#0b0d10'; g.fillRect(bx, by, bw, bh);
    var f = Math.max(0, Math.min(1, (sev + 60) / 60)); g.fillStyle = sev > -3 ? '#d83a2c' : sev > -12 ? '#e0b84a' : '#2e9d57'; g.fillRect(bx, by, bw * f, bh);
    var tx = bx + bw * Math.max(0, Math.min(1, (tepe + 60) / 60)); g.fillStyle = '#fff'; g.fillRect(tx - d, by, 2 * d, bh);
    g.fillStyle = '#1d2430'; g.font = (10.5 * d) + 'px sans-serif'; g.textAlign = 'right'; g.fillText(sev > -90 ? sev.toFixed(0) + ' dB' : '', bx - 6 * d, by + bh / 2); g.restore();
  }

  /* ---------- Düzenleme çekirdeği ---------- */
  function degistir(p, L, R) {
    p.bos = false; p.kirli = true; p.undo.push({ L: p.L, R: p.R }); if (p.undo.length > 20) p.undo.shift(); p.redo = [];
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
  function aktifVar() { var p = akt(); if (!p) { toast('Önce bir pencere açın (Yeni pencere) ya da pencereye tıklayın'); return null; } return p; }
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
    kapat: function () { kapatSor(akt()); },
    hepsiniKapat: function () { hepsiniKapatSor(); },
    yeni: function () { var x = new Float32Array(SR * 2); var p = pencereAc('Adsız ' + (S.sayac + 1), x, x, 'ses'); p.bos = true; otoListeleri(); }
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
    h += '</div><div class="alt">' + (o.iz ? '<button class="btn sol-b" id="dg-iz">Gürültü izi al (seçimden)</button>' : '') + (o.onizle ? '<button class="btn" id="dg-on-izle">' + (o.onizleAd || 'Önizleme') + '</button>' : '') + '<button class="btn" id="dg-iptal">İptal</button><button class="btn ana" id="dg-tamam">Tamam</button></div></div>';
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
    var p = aktifVar(); if (!p) return; var zm0 = Motor.istatistik(mono(p.L, p.R), SR).zeminDb, T = Motor.TEMIZLE[zm0 > -34 ? 'cokguclu' : 'guclu'];
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
    var p = aktifVar(); if (!p) return;
    var ON = {
      duz: ['Düz (hiç ses rengi yok)', { hp: [0, 80], lp: [0, 16000], b: [[1, 120, 0, .7], [1, 400, 0, 1], [1, 2500, 0, 1], [1, 9000, 0, .7]] }],
      radyo: ['Radyo spikeri', { hp: [1, 80], lp: [0, 16000], b: [[1, 130, 2.5, .7], [1, 300, -2, 1], [1, 3000, 2.5, 1], [1, 10000, 3, .7]] }],
      sicak: ['Sıcak ve dolgun', { hp: [1, 70], lp: [0, 16000], b: [[1, 150, 3, .7], [1, 400, 1, 1], [1, 3500, -1, 1], [1, 9000, -1.5, .7]] }],
      parlak: ['Parlak ve net', { hp: [1, 90], lp: [0, 16000], b: [[1, 150, 0, .7], [1, 400, -2, 1], [1, 4000, 3, 1], [1, 11000, 4, .7]] }],
      telefon: ['Telefon', { hp: [1, 400], lp: [1, 3400], b: [[0, 120, 0, .7], [1, 800, 2, 1], [1, 1800, 3, 1], [0, 9000, 0, .7]] }],
      temiz: ['Boğukluğu al', { hp: [1, 110], lp: [0, 16000], b: [[1, 160, -2, .7], [1, 280, -3, 1.2], [1, 2800, 1.5, 1], [1, 9000, 1, .7]] }]
    };
    function yukle(k) { var o = ON[k][1], d = { hp: { on: o.hp[0], f: o.hp[1] }, lp: { on: o.lp[0], f: o.lp[1] }, b: o.b.map(function (x) { return { on: x[0], f: x[1], g: x[2], q: x[3] }; }) }; return d; }
    var d0 = yukle('radyo'), TIP = ['lowshelf', 'peak', 'peak', 'highshelf'], AD = ['Bas', 'Alt orta', 'Üst orta', 'Tiz'];
    function bantlar(d) {
      var L = []; if (d.hp.on) L.push({ t: 'hp', f: d.hp.f, q: 0.7071 });
      d.b.forEach(function (b, i) { if (b.on && Math.abs(b.g) > 0.01) L.push({ t: TIP[i], f: b.f, g: b.g, q: b.q }); });
      if (d.lp.on) L.push({ t: 'lp', f: d.lp.f, q: 0.7071 }); return L;
    }
    function isle(sL, sR) { var bl = bantlar(d0); return kanalDo(sL, sR, function (x) { return bl.length ? Motor.eq(x, SR, bl) : x; }); }
    var q = diyalog('Equalizer', [], d0, {
      not: 'Düğmeleri yukarı aşağı sürükleyin (ya da fare tekerleği). Çift tıklama düğmeyi ilk değerine döndürür. Önce bir hazır ayar seçebilirsiniz.',
      ekHtml: '<canvas id="eqCv" width="1000" height="150"></canvas><div id="eqMod"></div>',
      onayarlar: Object.keys(ON).map(function (k) { return [k, ON[k][0]]; }), onayarSec: 'radyo',
      onayUygula: function (k) { d0 = yukle(k); kur(); },
      onizle: function () { var z = onizParca(p); return tepeyeAyarla(isle(z.L, z.R)); },
      tamam: function () { calis('Equalizer uygulanıyor', function () { bolgeUygula(p, isle); }); }
    });
    $('.pencere', q).style.width = 'min(1060px,100%)'; $('.pencere', q).classList.add('eqPen');
    var cv = $('#eqCv', q);
    function egri() {
      var c = cv.getContext('2d'), W = cv.width, H = cv.height; c.clearRect(0, 0, W, H); c.fillStyle = '#10161d'; c.fillRect(0, 0, W, H);
      function X(f) { return Math.log(f / 20) / Math.log(1000) * W; } function Y(db) { return H / 2 - db / 24 * (H / 2 - 8); }
      c.strokeStyle = '#26323f'; c.lineWidth = 1; c.fillStyle = '#6b7b8c'; c.font = '11px sans-serif';
      [-18, -12, -6, 0, 6, 12, 18].forEach(function (db) { c.strokeStyle = db === 0 ? '#3d4d5e' : '#1e2833'; c.beginPath(); c.moveTo(0, Y(db)); c.lineTo(W, Y(db)); c.stroke(); c.fillText(db + ' dB', 4, Y(db) - 2); });
      [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(function (f) { c.strokeStyle = '#1e2833'; c.beginPath(); c.moveTo(X(f), 0); c.lineTo(X(f), H); c.stroke(); c.fillText(f >= 1000 ? (f / 1000) + 'k' : f, X(f) + 3, H - 4); });
      var bl = bantlar(d0).map(function (b) { return Motor.biquadKatsayi(b.t, SR, b.f, b.q, b.g || 0); });
      c.beginPath(); for (var i = 0; i <= W; i += 2) {
        var f = 20 * Math.pow(1000, i / W), w = 2 * Math.PI * f / SR, cw = Math.cos(w), sw = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w), db = 0;
        bl.forEach(function (k) { var nr = k.b0 + k.b1 * cw + k.b2 * c2, ni = -(k.b1 * sw + k.b2 * s2), dr = 1 + k.a1 * cw + k.a2 * c2, di = -(k.a1 * sw + k.a2 * s2); db += 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di + 1e-12) + 1e-12); });
        db = Math.max(-24, Math.min(24, db)); if (i) c.lineTo(i, Y(db)); else c.moveTo(i, Y(db));
      }
      c.strokeStyle = '#ff8a2a'; c.lineWidth = 2.5; c.stroke(); c.lineTo(W, Y(0)); c.lineTo(0, Y(0)); c.fillStyle = 'rgba(255,138,42,.18)'; c.fill();
    }
    var bicim = {
      f: function (v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2).replace('.', ',') + ' kHz' : Math.round(v) + ' Hz'; },
      g: function (v) { return (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' dB'; },
      q: function (v) { return 'Q ' + v.toFixed(2).replace('.', ','); }
    };
    function knob(mod, alan, ad, min, max, log, ilk) {
      var k = document.createElement('div'); k.className = 'knobK'; k.innerHTML = '<div class="knob"><svg viewBox="0 0 60 60"><path class="iz" d="" /><path class="ark" d=""/><g class="ibre"><circle cx="30" cy="30" r="17" class="gov"/><rect x="28.3" y="14" width="3.4" height="11" rx="1.7" class="cb"/></g></svg></div><b></b><small>' + ad + '</small>';
      var sv = $('svg', k), ibre = $('.ibre', k), ark = $('.ark', k), iz = $('.iz', k), yz = $('b', k), tip = alan === 'g' ? 'g' : alan === 'q' ? 'q' : 'f';
      function yayPath(a0, a1) { function P(a) { var r = a * Math.PI / 180; return [30 + 25 * Math.sin(r), 30 - 25 * Math.cos(r)]; } var s = P(a0), e = P(a1); return 'M' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + 'A25 25 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + e[0].toFixed(2) + ' ' + e[1].toFixed(2); }
      iz.setAttribute('d', yayPath(-135, 135));
      function oran(v) { return log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min); }
      function deger(o) { return log ? min * Math.pow(max / min, o) : min + o * (max - min); }
      function ciz() {
        var v = mod[alan], o = Math.max(0, Math.min(1, oran(v))), a = -135 + 270 * o; ibre.setAttribute('transform', 'rotate(' + a + ' 30 30)');
        var a0 = alan === 'g' ? 0 : -135; ark.setAttribute('d', Math.abs(a - a0) < 0.5 ? '' : yayPath(Math.min(a0, a), Math.max(a0, a))); yz.textContent = bicim[tip](v);
        k.classList.toggle('kapali', mod.on === 0 || mod.on === false);
      }
      function koy(v) { v = Math.max(min, Math.min(max, v)); if (alan === 'g') v = Math.round(v * 2) / 2; else if (alan === 'q') v = Math.round(v * 20) / 20; else v = Math.round(v); mod[alan] = v; ciz(); egri(); }
      var y0, o0, bas = false;
      sv.addEventListener('pointerdown', function (e) { bas = true; y0 = e.clientY; o0 = oran(mod[alan]); try { sv.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
      sv.addEventListener('pointermove', function (e) { if (!bas) return; var inc = e.shiftKey ? 700 : 180; koy(deger(Math.max(0, Math.min(1, o0 + (y0 - e.clientY) / inc)))); });
      sv.addEventListener('pointerup', function () { bas = false; }); sv.addEventListener('pointercancel', function () { bas = false; });
      sv.addEventListener('dblclick', function () { koy(ilk); });
      sv.addEventListener('wheel', function (e) { e.preventDefault(); koy(deger(Math.max(0, Math.min(1, oran(mod[alan]) - Math.sign(e.deltaY) * 0.02)))); }, { passive: false });
      k._ciz = ciz; ciz(); return k;
    }
    function modul(baslik, mod, knoblar) {
      var m = document.createElement('div'); m.className = 'eqModul'; m.innerHTML = '<div class="eqBas"><button class="eqOn" title="Bandı aç / kapat"></button><b>' + baslik + '</b></div><div class="eqKnoblar"></div>';
      var on = $('.eqOn', m), kn = $('.eqKnoblar', m), liste = [];
      knoblar.forEach(function (a) { var k = knob(mod, a[0], a[1], a[2], a[3], a[4], a[5]); kn.appendChild(k); liste.push(k); });
      function yenile() { on.classList.toggle('acik', !!mod.on); m.classList.toggle('kapali', !mod.on); liste.forEach(function (k) { k._ciz(); }); }
      on.onclick = function () { mod.on = mod.on ? 0 : 1; yenile(); egri(); }; yenile(); return m;
    }
    function kur() {
      var kap = $('#eqMod', q); kap.innerHTML = '';
      kap.appendChild(modul('Alçak kes', d0.hp, [['f', 'Frekans', 20, 400, true, 80]]));
      d0.b.forEach(function (b, i) {
        var f0 = [[40, 400], [100, 1500], [800, 6000], [3000, 16000]][i], fv = [120, 400, 2500, 9000][i];
        kap.appendChild(modul(AD[i], b, [['g', 'Kazanç', -18, 18, false, 0], ['f', 'Frekans', f0[0], f0[1], true, fv], ['q', 'Genişlik', 0.3, 4, true, i % 3 === 0 ? 0.7 : 1]]));
      });
      kap.appendChild(modul('Yüksek kes', d0.lp, [['f', 'Frekans', 2000, 20000, true, 16000]])); egri();
    }
    kur();
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
    var canli = null;
    function canliAyar(d) { if (!canli || S.cal !== canli.h) return; var t = ac().currentTime; canli.gD.gain.setTargetAtTime(A.dB(+d.hDb), t, 0.03); canli.gS.gain.setTargetAtTime(A.dB(kaynakDb(d, canli.pz)), t, 0.03); }
    function canliBasla(d) {
      durdur(); var c = ac(), pz = pozisyon(d), uz = Math.min(kaynak.L.length, SR * 12), bas = Math.max(0, pz - SR * 2), son = Math.min(p.L.length, pz + uz + SR * 2), dn = Math.max(SR, Math.max(son - bas, pz - bas + uz));
      var db = c.createBuffer(2, dn, SR), sb = c.createBuffer(2, uz, SR), i, kR = kaynak.R || kaynak.L;
      var dl = db.getChannelData(0), dr = db.getChannelData(1); for (i = 0; i < dn && bas + i < p.L.length; i++) { dl[i] = p.L[bas + i]; dr[i] = p.R[bas + i]; }
      sb.getChannelData(0).set(kaynak.L.subarray(0, uz)); sb.getChannelData(1).set(kR.subarray(0, uz));
      var gD = c.createGain(), gS = c.createGain(); gD.connect(c.destination); gS.connect(c.destination); gD.gain.value = A.dB(+d.hDb);
      var h = { gD: gD, gS: gS, pz: pz, live: true, s: [], onended: null, stop: function () { h.live = false; h.s.forEach(function (x) { try { x.onended = null; x.stop(); } catch (e) {} }); } };
      canli = h; h.h = h; S.cal = h; S.calP = null; oynatIk(1);
      function tur() {
        if (!h.live) return; var t0 = c.currentTime + 0.03, kd = A.dB(kaynakDb(dAktif, pz)), fi = (+dAktif.fi || 0) / 1000;
        gS.gain.cancelScheduledValues(t0); gS.gain.setValueAtTime(fi > 0 ? 0 : kd, t0); if (fi > 0) gS.gain.linearRampToValueAtTime(kd, t0 + fi);
        var s1 = c.createBufferSource(); s1.buffer = db; s1.connect(gD); s1.start(t0);
        var s2 = c.createBufferSource(); s2.buffer = sb; s2.connect(gS); s2.start(t0 + (pz - bas) / SR);
        h.s = [s1, s2]; s1.onended = function () { if (S.cal === h && h.live) tur(); else if (S.cal === h) { S.cal = null; oynatIk(0); } };
      }
      var dAktif = d; h.guncelle = function (x) { dAktif = x; }; tur();
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
      onizleAd: '▶ Canlı dinle',
      onizle: function (d) { canliBasla(d); return null; },
      degisince: function (d) { if (canli) canli.guncelle(d); canliAyar(d); },
      tamam: function (d) { calis('Karıştırılıyor', function () { var r = karistirHesap(d, false); degistir(p, r.sonuc.L, r.sonuc.R); toast('Karıştırıldı (kaynak ' + (r.kd > 0 ? '+' : '') + r.kd.toFixed(1) + ' dB)'); }); }
    });
    return q;
  }
  /* ---------- Kaydet, çalışma alanı, kapatırken sorma ---------- */
  function uc(baslik, metin, cb) {
    var p = document.createElement('div'); p.className = 'perde';
    p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true" style="width:min(460px,100%)"><h3>' + esc(baslik) + '</h3><div class="govde"><p>' + metin + '</p></div><div class="alt"><button class="btn ana" data-c="evet">Evet</button><button class="btn" data-c="hayir">Hayır</button><button class="btn" data-c="iptal">İptal</button></div></div>';
    document.body.appendChild(p);
    function bit(c) { p.remove(); document.removeEventListener('keydown', kd, true); cb(c); }
    function kd(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); bit('iptal'); } }
    document.addEventListener('keydown', kd, true);
    $$('button', p).forEach(function (b) { b.onclick = function () { bit(b.dataset.c); }; }); $('[data-c=evet]', p).focus();
  }
  function kapatSor(p, sonra) {
    if (!p) return; if (!p.kirli || p.kayitta) { kapat(p); if (sonra) sonra(true); return; }
    odak(p);
    uc('Kaydetmek istiyor musunuz?', '“' + esc(p.ad) + '” penceresinde kaydedilmemiş değişiklikler var.', function (c) {
      if (c === 'evet') kaydetNereye(p).then(function (ok) { if (ok) { kapat(p); if (sonra) sonra(true); } else if (sonra) sonra(false); }).catch(hata);
      else if (c === 'hayir') { kapat(p); if (sonra) sonra(true); }
      else if (sonra) sonra(false);
    });
  }
  /* ---------- Nereye kaydedilsin? ---------- */
  var KN = { tur: 'calisma' };
  function kaydetNereye(p) {
    return new Promise(function (res) {
      var d = document.createElement('div'); d.className = 'perde';
      var ad0 = (p.ad || 'Ses').replace(/\.(wav|mp3)$/i, '');
      d.innerHTML = '<div class="pencere" role="dialog" aria-modal="true" style="width:min(520px,100%)"><h3>Nereye kaydedilsin?</h3><div class="govde">' +
        '<p class="not" style="margin:0 0 8px">İkisini birden de seçebilirsiniz.</p>' +
        '<label class="kn"><input type="checkbox" id="knCal"><span><b>Çalışma alanıma</b><small>Bu tarayıcıda durur. Dosya menüsü > Çalışma alanı’ndan tekrar açarsınız.</small></span></label>' +
        '<div style="margin:8px 0 4px"><b>Bilgisayarıma da kaydet</b> <small>(masaüstü ya da istediğiniz klasör; ikisini de işaretleyebilirsiniz)</small></div>' +
        '<label class="kn"><input type="checkbox" id="knWav"><span><b>WAV olarak</b><small>İndirme hakkından düşmez.</small></span></label>' +
        '<label class="kn"><input type="checkbox" id="knMp3"><span><b>MP3 olarak</b><small>İndirme hakkından 1 düşer.</small></span></label>' +
        '<div class="sat"><label style="margin:0">Dosya adı</label><input type="text" id="knAd" style="grid-column:2/4"></div></div>' +
        '<div class="alt"><button class="btn" data-k="iptal">İptal</button><button class="btn ana" data-k="tamam">Kaydet</button></div></div>';
      document.body.appendChild(d); $('#knAd', d).value = ad0;
      $('#knCal', d).checked = KN.cal !== false; $('#knWav', d).checked = !!KN.wav; $('#knMp3', d).checked = !!KN.mp3;
      function bit(v) { d.remove(); document.removeEventListener('keydown', kd, true); res(v); }
      function kd(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); bit(false); } }
      document.addEventListener('keydown', kd, true);
      $('[data-k=iptal]', d).onclick = function () { bit(false); };
      $('[data-k=tamam]', d).onclick = async function () {
        var wv = $('#knWav', d).checked, m3 = $('#knMp3', d).checked, cal = $('#knCal', d).checked, ad = ($('#knAd', d).value || ad0).trim() || ad0; KN.wav = wv; KN.mp3 = m3; KN.cal = cal;
        if (!cal && !wv && !m3) return toast('En az bir yer seçin');
        var b = $('[data-k=tamam]', d); b.disabled = true;
        try { var ok = true; if (cal) ok = await kaydetYaz(p, 'calisma', ad); if (ok && wv) ok = await kaydetYaz(p, 'wav', ad); if (ok && m3) ok = await kaydetYaz(p, 'mp3', ad); if (ok) { d.remove(); document.removeEventListener('keydown', kd, true); res(true); } else b.disabled = false; }
        catch (e) { b.disabled = false; hata(e); }
      };
    });
  }
  async function kaydetYaz(p, tur, ad) {
    var dos = ad.replace(/[^\wÇĞİÖŞÜçğıöşü\- ]+/g, '').replace(/\s+/g, '_') || 'Ses';
    if (tur === 'calisma') { p.ad = ad; $('.bas b', p.el).textContent = ad; await calismayaKaydet(p); guncelle(); return true; }
    var mp3 = tur === 'mp3', uzanti = mp3 ? '.mp3' : '.wav', tip = mp3 ? 'audio/mpeg' : 'audio/wav', handle = null;
    if (mp3) { var h = await Veri.hakDurumu(); if (h.limit > 0 && h.kullanilan >= h.limit) { bilgi('Aylık indirme hakkınız doldu', '<p>Bu ay ' + h.limit + ' MP3 indirme hakkınızı kullandınız. WAV olarak ya da çalışma alanınıza kaydedebilirsiniz.</p>'); return false; } }
    if (window.showSaveFilePicker) {
      try { handle = await window.showSaveFilePicker({ suggestedName: dos + uzanti, startIn: 'desktop', types: [{ description: mp3 ? 'MP3 ses dosyası' : 'WAV ses dosyası', accept: (function () { var o = {}; o[tip] = [uzanti]; return o; })() }] }); }
      catch (e) { if (e && e.name === 'AbortError') return false; handle = null; }
    }
    mesaj('Dosya hazırlanıyor…'); await bekle();
    var blob = mp3 ? new Blob(Motor.mp3Kodla(p.L, p.R, SR, 192), { type: tip }) : new Blob([Motor.wav16([p.L, p.R], SR)], { type: tip });
    if (mp3) { var r = await Veri.indirmeHakki(dos, 'mp3'); if (!r.ok) { mesaj(''); bilgi('Aylık indirme hakkınız doldu', '<p>MP3 indirme hakkınız bitti.</p>'); return false; } ustYenile(); }
    if (handle) { var w = await handle.createWritable(); await w.write(blob); await w.close(); }
    else indirDosya(blob, dos + uzanti);
    mesaj(''); p.ad = ad; $('.bas b', p.el).textContent = ad; p.kirli = false; guncelle();
    toast(handle ? 'Dosya seçtiğiniz yere kaydedildi' : 'Dosya indirildi (tarayıcının indirilenler klasörü)'); return true;
  }
  function hepsiniKapatSor() { var l = S.pen.slice(); (function ilk() { var p = l.shift(); if (!p) return; kapatSor(p, function (devam) { if (devam) ilk(); }); })(); }
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('spotstudyo', 1); r.onupgradeneeded = function () { r.result.createObjectStore('calisma', { keyPath: 'ad' }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function idbIs(mod, fn) { return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('calisma', mod), st = tx.objectStore('calisma'), o = fn(st); tx.oncomplete = function () { res(o && o.result); }; tx.onerror = function () { rej(tx.error); }; }); }); }
  function calismayaKaydet(p) {
    if (!p) return Promise.resolve();
    return idbIs('readwrite', function (st) { return st.put({ ad: p.ad, L: p.L, R: p.R === p.L ? null : p.R, t: Date.now() }); }).then(function () { p.kirli = false; toast('Çalışma alanına kaydedildi: ' + p.ad); });
  }
  function kaydetAkt() { var p = aktifVar(); if (p) kaydetNereye(p).catch(hata); }
  function tumunuKaydet() { if (!S.pen.length) return toast('Kaydedilecek pencere yok'); Promise.all(S.pen.map(calismayaKaydet)).then(function () { toast(S.pen.length + ' pencere çalışma alanına kaydedildi'); }).catch(hata); }
  function farkliKaydet() { var p = aktifVar(); if (p) kaydetNereye(p).catch(hata); }
  async function calismaAlani() {
    var l = []; try { l = await idbIs('readonly', function (st) { return st.getAll(); }) || []; } catch (e) { return hata(e); }
    l.sort(function (a, b) { return b.t - a.t; });
    var p = document.createElement('div'); p.className = 'perde';
    p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true"><h3>Çalışma alanı</h3><div class="govde"><p class="not">Kaydettiğiniz çalışmalar bu tarayıcıda durur. Açmak için “Aç”a basın.</p><div id="caList">' + (l.length ? l.map(function (z, i) { return '<div class="caSatir"><b>' + esc(z.ad) + '</b><small>' + new Date(z.t).toLocaleString('tr-TR') + ' · ' + sn(z.L.length / SR) + ' sn</small><button class="btn kucuk ana" data-a="' + i + '">Aç</button><button class="btn kucuk" data-s="' + i + '">Sil</button></div>'; }).join('') : '<span class="sol">Henüz kaydedilmiş çalışma yok. Dosya menüsünden Kaydet deyin.</span>') + '</div></div><div class="alt"><button class="btn ana" id="caKapat">Kapat</button></div></div>';
    document.body.appendChild(p); $('#caKapat', p).onclick = function () { p.remove(); };
    p.addEventListener('click', function (e) {
      var a = e.target.dataset.a, s = e.target.dataset.s;
      if (a != null) { var z = l[+a]; var q = pencereAc(z.ad, z.L, z.R || z.L, 'ses'); q.kirli = false; sekme('manuel'); p.remove(); }
      else if (s != null) { var z2 = l[+s]; idbIs('readwrite', function (st) { return st.delete(z2.ad); }).then(function () { p.remove(); calismaAlani(); }); }
    });
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

  async function paylas() {
    if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın');
    var ad = (S.sonucAd || 'Spot').replace(/\.[a-z0-9]+$/i, '').replace(/[^\wÇĞİÖŞÜçğıöşü\- ]+/g, '').replace(/\s+/g, '_') || 'Spot';
    try {
      var d = await Veri.hakDurumu(); if (d.limit > 0 && d.kullanilan >= d.limit) return bilgi('Aylık indirme hakkınız doldu', '<p>Bu ay ' + d.limit + ' hakkınızı kullandınız. Panelim sayfasından Pro pakete geçebilirsiniz.</p>');
      mesaj('Dosya hazırlanıyor…'); await bekle();
      var blob = new Blob(Motor.mp3Kodla(S.sonuc.L, S.sonuc.R, SR, 192), { type: 'audio/mpeg' }), dosya = null;
      try { dosya = new File([blob], ad + '.mp3', { type: 'audio/mpeg' }); } catch (e) {}
      mesaj('');
      if (dosya && navigator.canShare && navigator.canShare({ files: [dosya] })) {
        try { await navigator.share({ files: [dosya], title: ad, text: 'Ses Efekti Spot Stüdyo ile hazırladım: sesefekti.com' }); }
        catch (e) { if (e && e.name === 'AbortError') return; throw e; }
        await Veri.indirmeHakki(ad, 'paylas'); ustYenile(); toast('Paylaşıldı'); return;
      }
      /* Bilgisayar ya da paylaşımı desteklemeyen tarayıcı: indir, WhatsApp'ı aç */
      var r = await Veri.indirmeHakki(ad, 'mp3'); if (!r.ok) return toast('İndirme hakkınız doldu');
      indirDosya(blob, ad + '.mp3'); ustYenile();
      toast('MP3 indirildi. WhatsApp’ta dosyayı ekleyip gönderin.');
      window.open('https://wa.me/?text=' + encodeURIComponent('Spotum hazır! Ses Efekti Spot Stüdyo: sesefekti.com'), '_blank', 'noopener');
    } catch (e) { mesaj(''); hata(e); }
  }
  async function ustYenile() { var u = $('.kota'); if (u) { var d = await Veri.hakDurumu(); u.textContent = 'Bu ay ' + d.kullanilan + ' / ' + (d.limit > 0 ? d.limit : '∞') + ' indirme'; } }
  async function mikSec() {
    var l; try { await navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) { s.getTracks().forEach(function (t) { t.stop(); }); }); l = (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === 'audioinput'; }); }
    catch (e) { return toast('Mikrofon izni gerekli'); }
    diyalog('Mikrofon seç', [{ k: 'id', ad: 'Mikrofon', tur: 'sec', sec: l.map(function (d, i) { return [d.deviceId, d.label || ('Mikrofon ' + (i + 1))]; }) }], { id: mikId || (l[0] && l[0].deviceId) }, { tamam: function (d) { mikId = d.id; toast('Mikrofon seçildi'); } });
  }
  /* Pencere düzeni */
  function diz(tip) {
    var pl = S.pen.filter(function (q) { return !q.kucuk; }), n = pl.length; if (!n) return; var w = alan.clientWidth, h = alan.clientHeight;
    pl.forEach(function (p, i) {
      var e = p.el;
      if (tip === 'alt') { var yh = Math.max(170, Math.floor((h - 8 - (n - 1) * 6) / n)); if (telefonMu()) yh = Math.min(yh, Math.max(170, Math.floor((h - 14) / 2))); e.style.left = '110px'; e.style.width = (w - 220) + 'px'; e.style.top = (4 + i * (yh + 6)) + 'px'; e.style.height = yh + 'px'; }
      else if (tip === 'yan') { var gw = Math.floor((w - 8) / n); e.style.left = (4 + i * gw) + 'px'; e.style.width = (gw - 4) + 'px'; e.style.top = '4px'; e.style.height = (h - 8) + 'px'; }
      else { e.style.left = (110 + (i % 6) * 28) + 'px'; e.style.top = (8 + (i % 6) * 28) + 'px'; e.style.width = Math.max(420, w - 220 - 28 * 5) + 'px'; e.style.height = 340 + 'px'; }
      ciz(p);
    });
  }

  /* ---------- Otomatik sekme ---------- */
  function otoListeleri() {
    var s1 = $('#otoSes'), s2 = $('#otoMuzik'), v1 = s1.value, v2 = s2.value;
    s1.innerHTML = S.pen.length ? S.pen.map(function (p) { return '<option value="p' + p.id + '">Yüklü dosya: ' + esc(p.ad) + '</option>'; }).join('') : '<option value="">(önce ses yükle ya da kayıt al)</option>';
    s2.innerHTML = '<option value="">Müziksiz</option>' + S.kut.muzikler.map(function (m, i) { return '<option value="k' + i + '">Banka: ' + esc(m.ad) + '</option>'; }).join('') + S.pen.map(function (p) { return '<option value="p' + p.id + '">Yüklü dosya: ' + esc(p.ad) + '</option>'; }).join('');
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
    var pv = $('#otoSes').value, p = S.pen.filter(function (z) { return 'p' + z.id === pv; })[0]; if (!p) return toast('Önce bir ses yükleyin, kaydedin ya da listeden seçin');
    if (S.mesgul) return; S.mesgul = true; mesaj('Hazırlanıyor…'); await bekle();
    try {
      var muzik = null, mv = $('#otoMuzik').value;
      if (mv[0] === 'k') muzik = await bankaDizi('muzikler', +mv.slice(1)); else if (mv[0] === 'p') { var mp = S.pen.filter(function (z) { return 'p' + z.id === mv; })[0]; if (mp) muzik = { L: mp.L, R: mp.R }; }
      var iz = S.z.gurultu.iz; S.tarzNo = yeniden ? S.tarzNo + 1 : 0; var T = Motor.TARZ[S.tarzNo % Motor.TARZ.length];
      var ham = mono(p.L, p.R), zem = Motor.istatistik(ham, SR).zeminDb, tm = zem > -34 ? 'cokguclu' : 'guclu'; /* HER SESE güçlü dip ses temizliği uygulanır (en az 'guclu') */
      S.z = Motor.tarzUygula(S.z, Object.assign({}, T, { temizle: tm })); S.z.gurultu.iz = S.iz || iz || null;
      if (S.tarzNo >= Motor.TARZ.length) { var j = function (a) { return (Math.random() - 0.5) * 2 * a; }; S.z.muzik.altDb += j(1); S.z.muzik.yuksel = Math.max(0, S.z.muzik.yuksel + j(1)); S.z.muzik.giris = Math.max(0.5, S.z.muzik.giris + j(0.5)); }
      var bt = $('#otoBitis').value; if (bt) S.z.muzik.bitis = bt;
      hedefUygula(); $('#tarzAd').textContent = T.ad + (S.tarzNo >= Motor.TARZ.length ? ' (ince ayar)' : '');
      S.sonuc = Motor.uret(ham, SR, muzik, S.z); S.sonucAd = p.ad; S.sonuc.zeminOnce = zem; S.sonuc.zeminSonra = Motor.istatistik(S.sonuc.islenmis, SR).zeminDb;
      if (S.sonuc.zeminSonra > -62 && tm !== 'cokguclu') { /* dip ses hâlâ duyulur: daha güçlü ikinci tur */ S.z = Motor.tarzUygula(S.z, Object.assign({}, T, { temizle: 'cokguclu' })); S.z.gurultu.iz = S.iz || iz || null; if (bt) S.z.muzik.bitis = bt; hedefUygula(); S.sonuc = Motor.uret(ham, SR, muzik, S.z); S.sonucAd = p.ad; S.sonuc.zeminOnce = zem; S.sonuc.zeminSonra = Motor.istatistik(S.sonuc.islenmis, SR).zeminDb; }
      sonucCiz(); calDizi(S.sonuc.L, S.sonuc.R, null, 0);
      if (window.matchMedia && window.matchMedia('(max-width:820px)').matches) { var sk = $('#cSonuc'); if (sk && sk.scrollIntoView) sk.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } catch (e) { hata(e); }
    S.mesgul = false; mesaj('');
  }
  function sonucCiz() {
    var c = $('#cSonuc'), d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    $('#bosSonuc').style.display = S.sonuc ? 'none' : 'flex'; if (!S.sonuc) { $('#sonucBilgi').textContent = ''; return; }
    var pk = Motor.tepeler(S.sonuc.L, Math.max(1, W)); g.fillStyle = '#2b2bff'; for (var i = 0; i < W; i++) { var y1 = H / 2 - pk[2 * i + 1] * H * 0.46, y2 = H / 2 - pk[2 * i] * H * 0.46; g.fillRect(i, y1, 1, Math.max(1, y2 - y1)); }
    $('#sonucBilgi').textContent = sn(S.sonuc.sure) + ' · ' + S.sonuc.lufs.toFixed(1) + ' LUFS · tepe ' + S.sonuc.tepeDb.toFixed(1) + ' dB · dip ses ' + S.sonuc.zeminOnce.toFixed(0) + ' dB → ' + S.sonuc.zeminSonra.toFixed(0) + ' dB' + (S.z.kesilen && (S.z.kesilen.bas > 0.02 || S.z.kesilen.son > 0.02) ? ' · baştan ' + S.z.kesilen.bas.toFixed(2) + ' sn, sondan ' + S.z.kesilen.son.toFixed(2) + ' sn kesildi' : '');
  }

  /* ---------- Bankalar ---------- */
  async function bankaYukle() {
    try { S.kut.muzikler = await Veri.liste('muzikler'); } catch (e) { S.kut.muzikler = []; }
    try { S.kut.sesler = await Veri.liste('sesler'); } catch (e) { S.kut.sesler = []; }
    otoListeleri();
  }
  var BZ = { ses: null, muzik: null, filtre: '' };
  function bankaCiz() {
    var ara = (($('#mAra') || {}).value || '').toLowerCase(), fl = BZ.filtre, turler = [];
    S.kut.muzikler.forEach(function (m) { var t = m.etiket || m.tur || 'Diğer'; if (turler.indexOf(t) < 0) turler.push(t); });
    $('#mFiltre').innerHTML = ['Tümü'].concat(turler).map(function (t) { return '<button class="chip' + ((fl || 'Tümü') === t ? ' acik' : '') + '" data-b="mflt" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
    var ml = S.kut.muzikler.map(function (m, i) { return { m: m, i: i }; }).filter(function (z) { var t = z.m.etiket || z.m.tur || 'Diğer'; return (!fl || fl === 'Tümü' || t === fl) && (!ara || z.m.ad.toLowerCase().indexOf(ara) > -1); });
    $('#muzikListe').innerHTML = ml.length ? ml.map(function (z) { var s = BZ.muzik === z.i; return '<div class="spRow' + (s ? ' sec' : '') + '"><button class="spPlay" data-b="cal" data-t="muzikler" data-i="' + z.i + '" title="Dinle">▶</button><div class="spAd"><b>' + esc(z.m.ad) + '</b><small>' + esc(z.m.etiket || z.m.tur || '') + '</small></div><button class="btn kucuk' + (s ? ' ana' : '') + '" data-b="mekle" data-i="' + z.i + '">' + (s ? '✓ Seçildi' : '+ Ekle') + '</button></div>'; }).join('') : '<div class="bosNot">' + (S.kut.muzikler.length ? 'Aramaya uyan müzik yok.' : 'Henüz müzik eklenmemiş. Yönetim panelinden ekleyin.') + '</div>';
    $('#sesListe').innerHTML = S.kut.sesler.length ? S.kut.sesler.map(function (m, i) { var s = BZ.ses === i; return '<div class="spRow' + (s ? ' sec' : '') + '"><button class="spPlay" data-b="cal" data-t="sesler" data-i="' + i + '" title="Dinle">▶</button><div class="spAd"><b>' + esc(m.ad) + '</b><small>' + esc(m.aciklama || m.tur || '') + (m.fiyat_tl ? ' · ' + m.fiyat_tl + ' TL' : '') + '</small></div><button class="btn kucuk' + (s ? ' ana' : '') + '" data-b="bsec" data-i="' + i + '">' + (s ? '✓ Seçildi' : 'Seç') + '</button></div>'; }).join('') : '<div class="bosNot">Henüz seslendirmen eklenmemiş.</div>';
    var sm = S.kut.sesler[BZ.ses], mm = S.kut.muzikler[BZ.muzik];
    $('#bSes').textContent = sm ? sm.ad : 'Seçilmedi'; $('#bMuz').textContent = mm ? mm.ad : 'Seçilmedi';
    $('#bSes').parentNode.classList.toggle('dolu', !!sm); $('#bMuz').parentNode.classList.toggle('dolu', !!mm);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-b]') : null; if (!b) return; var v = b.dataset.b;
    if (v === 'bsec') { BZ.ses = BZ.ses === +b.dataset.i ? null : +b.dataset.i; bankaCiz(); }
    else if (v === 'mekle') { BZ.muzik = BZ.muzik === +b.dataset.i ? null : +b.dataset.i; bankaCiz(); }
    else if (v === 'mflt') { BZ.filtre = b.dataset.v; bankaCiz(); }
  });
  $('#mAra').addEventListener('input', bankaCiz);
  $('#bizeGonder').onclick = async function () {
    var metin = $('#bizeMetin').value.trim(), ad = $('#bAd').value.trim(), tel = $('#bTel').value.trim(), em = $('#bMail').value.trim(), kut = $('#bizeSonuc');
    if (metin.length < 10) return toast('Önce spot metnini yazın');
    if (!ad) return toast('Adınızı yazın'); if (!tel && !em) return toast('Telefon ya da e-posta yazın');
    var sm = S.kut.sesler[BZ.ses], mm = S.kut.muzikler[BZ.muzik];
    var sip = { metin: metin, ses_adi: sm ? sm.ad : '', muzik_adi: mm ? mm.ad : '', tur: $('#bTur').value, ad: ad, telefon: tel, eposta: em, notu: $('#bNot').value.trim() };
    var btn = $('#bizeGonder'); btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    try {
      var kayit = await Veri.siparisVer(sip), eposta = false;
      try {
        var r = await fetch('https://formsubmit.co/ajax/sesefektimedya@gmail.com', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ _subject: 'Yeni spot siparişi: ' + ad, _template: 'table', Ad: ad, Telefon: tel, Eposta: em, Seslendirmen: sip.ses_adi || '(seçilmedi)', Muzik: sip.muzik_adi || '(seçilmedi)', Cikis_turu: sip.tur, Metin: metin, Not: sip.notu, Siparis_no: kayit && kayit.id || '' }) });
        eposta = r.ok;
      } catch (x) {}
      var wa = 'Merhaba, yeni spot siparişi.\nAd: ' + ad + '\nTelefon: ' + tel + '\nSeslendirmen: ' + (sip.ses_adi || '-') + '\nMüzik: ' + (sip.muzik_adi || '-') + '\nÇıkış: ' + sip.tur + '\nMetin: ' + metin;
      kut.style.display = 'block';
      kut.innerHTML = '<b>Siparişiniz alındı.</b> Hazır dosyayı <a href="panel">Panelim</a> sayfasında “Siparişlerim” bölümünden indirebilirsiniz.' + (eposta ? '' : '<div class="sol">E-posta bildirimi şu an gönderilemedi, siparişiniz sistemde kayıtlı.</div>') + '<div style="margin-top:.6rem"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/905331509890?text=' + encodeURIComponent(wa) + '">WhatsApp’tan da haber ver</a></div>';
      toast('Sipariş gönderildi');
    } catch (er) { hata(er); }
    btn.disabled = false; btn.textContent = 'Siparişi gönder';
  };
  document.addEventListener('click', async function (e) {
    var b = e.target.closest ? e.target.closest('[data-b]') : null; if (!b) return; var i = +b.dataset.i, v = b.dataset.b;
    try {
      if (v === 'cal') { var s = await bankaDizi(b.dataset.t, i); calDizi(s.L, s.R === s.L ? null : s.R, null, 0); }
      else if (v === 'ac') { var s2 = await bankaDizi('muzikler', i); pencereAc(S.kut.muzikler[i].ad, s2.L.slice(), s2.R === s2.L ? null : s2.R.slice(), 'ses'); otoListeleri(); sekme('manuel'); }
      else if (v === 'oto') { await bankaDizi('muzikler', i); $('#otoMuzik').value = 'k' + i; sekme('oto'); toast('Müzik seçildi. Sesi seçip “Otomatik hazırla”ya basın'); }
    } catch (er) { hata(er); }
  });

  /* ---------- Sekmeler ---------- */
  function sekme(t) {
    S.tab = t; $$('#sekmeler button').forEach(function (b) { b.classList.toggle('acik', b.dataset.t === t); }); $$('.panel').forEach(function (pn) { pn.classList.toggle('acik', pn.id === 'p-' + t); });
    ['#menu', '#arac', '.durum', '#mobSerit'].forEach(function (q) { $(q).style.display = t === 'manuel' ? '' : 'none'; });
    $$('#altSekme [data-t]').forEach(function (b) { b.classList.toggle('acik', b.dataset.t === t); });
    if (t === 'manuel') guncelle(); if (t === 'oto') { otoListeleri(); sonucCiz(); } if (t === 'yz') yzDurum();
  }
  $$('#sekmeler button').forEach(function (b) { b.onclick = function () { sekme(b.dataset.t); }; });
  (function () {
    var b = document.createElement('nav'); b.id = 'altSekme'; b.setAttribute('aria-label', 'Ana menü');
    b.innerHTML = '<button data-t="oto"><svg viewBox="0 0 24 24"><path d="M12 3v18M7 8v8M17 7v10M3 11v2M21 11v2"/></svg>Otomatik</button><button data-t="manuel"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>Manuel</button><button data-t="yz"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></svg>Yapay zeka</button><button data-t="bize"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>Bize gönder</button><a href="panel"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/></svg>Panelim</a>';
    document.body.appendChild(b);
    $$('#altSekme [data-t]').forEach(function (x) { x.onclick = function () { sekme(x.dataset.t); }; });
  })();

  /* ---------- Menüler ---------- */
  /* ---------- Yeni efektler, işlemler, favoriler ---------- */
  function genel(baslik, not, alanlar, d0, isle, opt) {
    var p = aktifVar(); if (!p) return; opt = opt || {};
    diyalog(baslik, alanlar, d0, {
      not: not, onayarlar: opt.onayarlar, onayarSec: opt.onayarSec, onayUygula: opt.onayUygula,
      onizle: function (d) { var q = onizParca(p); return tepeyeAyarla(isle(q.L, q.R, d)); },
      tamam: function (d) { calis(baslik, function () { bolgeUygula(p, function (sL, sR) { return isle(sL, sR, d); }, opt.kuyruk); }); }
    });
  }
  function sl(k, ad, min, max, step, birim) { return { k: k, ad: ad, tur: 'slider', min: min, max: max, step: step, birim: birim || '' }; }
  function chorusDlg() { genel('Chorus', 'Sesi kalabalıklaştırır, “çoklu ses” etkisi verir.', [sl('hz', 'Hız', 0.1, 5, 0.1, ' Hz'), sl('derin', 'Derinlik', 0.5, 12, 0.5, ' ms'), sl('mix', 'Etki miktarı', 0, 0.9, 0.05)], { hz: 0.8, derin: 4, mix: 0.45 }, function (sL, sR, d) { return kanalDo(sL, sR, function (x) { return A.modGecikme(x, SR, 22, +d.derin, +d.hz, 0, +d.mix, 3); }); }); }
  function flangerDlg() { genel('Flanger', 'Jet uçağı geçiyormuş gibi süpürme etkisi.', [sl('hz', 'Hız', 0.05, 3, 0.05, ' Hz'), sl('derin', 'Derinlik', 0.5, 5, 0.1, ' ms'), sl('geri', 'Geri besleme', 0, 0.9, 0.05), sl('mix', 'Etki miktarı', 0, 1, 0.05)], { hz: 0.3, derin: 2, geri: 0.5, mix: 0.5 }, function (sL, sR, d) { return kanalDo(sL, sR, function (x) { return A.modGecikme(x, SR, 3, +d.derin, +d.hz, +d.geri, +d.mix, 1); }); }); }
  function vibratoDlg() { genel('Vibrato', 'Sesin perdesini hafifçe titretir.', [sl('hz', 'Hız', 0.5, 12, 0.5, ' Hz'), sl('derin', 'Derinlik', 0.2, 6, 0.1, ' ms')], { hz: 5, derin: 1.5 }, function (sL, sR, d) { return kanalDo(sL, sR, function (x) { return A.modGecikme(x, SR, 7, +d.derin, +d.hz, 0, 1, 1); }); }); }
  function tremoloDlg() { genel('Tremolo (ses titremesi)', 'Sesin yüksekliğini düzenli açıp kısar.', [sl('hz', 'Hız', 0.5, 20, 0.5, ' Hz'), sl('derin', 'Derinlik', 0, 1, 0.05)], { hz: 5, derin: 0.5 }, function (sL, sR, d) { return kanalDo(sL, sR, function (x) { return A.tremolo(x, SR, +d.hz, +d.derin); }); }); }
  function bozulmaDlg() { genel('Distortion (bozulma)', 'Sese kirli, sert bir ton verir.', [sl('surus', 'Sürüş', 1, 20, 0.5), sl('mix', 'Etki miktarı', 0, 1, 0.05)], { surus: 4, mix: 0.6 }, function (sL, sR, d) { return kanalDo(sL, sR, function (x) { return A.bozulma(x, +d.surus, +d.mix); }); }); }
  function filtreDlg() {
    genel('Filtre (alçak / yüksek geçiren)', 'Yüksek geçiren: uğultuyu keser. Alçak geçiren: cızırtıyı keser.', [{ k: 'tur', ad: 'Tür', tur: 'sec', sec: [['hp', 'Yüksek geçiren (alçak sesleri kes)'], ['lp', 'Alçak geçiren (tiz sesleri kes)']] }, sl('f', 'Kesme frekansı', 40, 16000, 10, ' Hz'), { k: 'dik', ad: 'Keskin kes (2 kat)', tur: 'onay' }], { tur: 'hp', f: 120, dik: true }, function (sL, sR, d) {
      var b = [{ t: d.tur, f: +d.f }]; if (d.dik) b.push({ t: d.tur, f: +d.f }); return kanalDo(sL, sR, function (x) { return Motor.eq(x, SR, b); });
    });
  }
  function hizDlg() {
    var p = aktifVar(); if (!p) return;
    sayiDlg('Süreyi değiştir (perde değişmez)', 'Hız', 0.5, 2, 0.01, 1, '×', function (v) { if (Math.abs(v - 1) < 0.005) return; calis('Süre değiştiriliyor', function () { bolgeUygula(p, function (sL, sR) { var n2 = Math.round(sL.length / v); return kanalDo(sL, sR, function (x) { return A.sureUzat(x, 1 / v, n2); }); }); }); });
  }
  function gurlukNormalDlg() {
    var p = aktifVar(); if (!p) return;
    diyalog('Normalleştir (gürlüğe göre)', [{ k: 'tur', ad: 'Hedef', tur: 'sec', sec: [['radyo', 'Radyo (−11,6 LUFS)'], ['tv', 'Televizyon (−23 LUFS)'], ['santral', 'Santral (−16 LUFS)'], ['ozel', 'Özel']] }, sl('hedef', 'Hedef gürlük', -30, -6, 0.1, ' LUFS'), sl('tavan', 'En yüksek tepe', -6, 0, 0.1, ' dB')], { tur: 'radyo', hedef: -11.6, tavan: -1.5 }, {
      not: 'Sesi ölçerek istenen gürlüğe getirir ve tepeleri tavanda tutar.',
      degisince: function (d, q) { if (d.tur !== 'ozel') { var T = Motor.SEVIYE[d.tur]; d.hedef = T.hedef; d.tavan = T.tavan; $$('[data-k]', q).forEach(function (el) { if (el.dataset.k === 'hedef') { el.value = d.hedef; el.parentNode.querySelector('output').textContent = d.hedef + ' LUFS'; } if (el.dataset.k === 'tavan') { el.value = d.tavan; el.parentNode.querySelector('output').textContent = d.tavan + ' dB'; } }); } },
      tamam: function (d) { calis('Gürlük ayarlanıyor', function () { bolgeUygula(p, function (sL, sR) { var s = Motor.seviyeAyarla(sL, sR === sL ? sL.slice() : sR, SR, +d.hedef, +d.tavan); return { L: s.L, R: sR === sL ? s.L : s.R }; }); toast('Gürlük ' + d.hedef + ' LUFS yapıldı'); }); }
    });
  }
  function konumluSessizlik(nerede) {
    var p = aktifVar(); if (!p) return;
    sayiDlg('Sessizlik ekle (' + nerede + ')', 'Süre', 0.1, 10, 0.1, 0.5, ' sn', function (v) { var n = Math.round(v * SR), pos = nerede === 'başa' ? 0 : (nerede === 'sona' ? p.L.length : (p.sec ? p.sec[0] : p.imlec)); kanalIs(p, function (x) { return Motor.sessizlikEkle(x, pos, n); }); });
  }
  function zincirEq(sL, sR, bantlar) { return kanalDo(sL, sR, function (x) { return bantlar.length ? Motor.eq(x, SR, bantlar) : x; }); }
  function zincirHammer(a, sR, K, tavan) { var b = kanalDo(a.L, sR === a.L ? a.L : a.R, function (x) { return Motor.kompresor(x, SR, { esik: K.esik, oran: K.oran, atak: K.atak, birak: K.birak, makyaj: K.makyaj, diz: 6 }); }); var s = Motor.sinirla(b.L, b.R, SR, tavan, 80); return { L: s.L, R: sR === a.L ? s.L : s.R }; }
  function favori(ad, f, kuyruk) { var p = aktifVar(); if (!p) return; calis(ad, function () { bolgeUygula(p, f, kuyruk); toast(ad + ' uygulandı. Beğenmezseniz Ctrl+Z'); }); }
  var FAV = {
    radyo: function () { favori('Radyo spikeri sesi', function (sL, sR) { var e = zincirEq(sL, sR, Motor.TON.radyo.bantlar); return zincirHammer(e, sR, Motor.KUVVET.radyo, -1.5); }); },
    sicak: function () { favori('Sıcak spiker sesi', function (sL, sR) { var e = zincirEq(sL, sR, Motor.TON.sicak.bantlar); return zincirHammer(e, sR, Motor.KUVVET.hafif, -1.5); }); },
    parlak: function () { favori('Parlak spiker sesi', function (sL, sR) { var e = zincirEq(sL, sR, Motor.TON.parlak.bantlar); return zincirHammer(e, sR, Motor.KUVVET.radyo, -1.5); }); },
    tam: function () { favori('Temizle + radyo sesi + seviye', function (sL, sR) { var T = Motor.TEMIZLE.standart, g = gurultuIsle(sL, sR, { db: T.g.db, bias: T.g.bias, hiz: T.g.hiz, kapi: true, konum: T.k.konum, aralik: T.k.aralik }); var e = zincirEq(g.L, g.R, Motor.TON.radyo.bantlar), h = zincirHammer(e, sR, Motor.KUVVET.radyo, -1.5), s = Motor.seviyeAyarla(h.L, h.R === h.L ? h.L.slice() : h.R, SR, -11.6, -1.5); return { L: s.L, R: sR === sL ? s.L : s.R }; }); },
    telefon: function () { hazirEfekt('telefon', 'Telefon hattı'); },
    megafon: function () { hazirEfekt('megafon', 'Megafon anons'); }
  };
  Object.assign(I, {
    sec0: function () { var p = aktifVar(); if (!p) return; p.sec = null; guncelle(); },
    ustune: function () { var p = secimVar(); if (!p) return; if (!S.pano) return toast('Önce kopyalayın'); var a = p.sec[0], b = p.sec[1]; var L = A.birles(p.L, a, b, S.pano.L), R = p.R === p.L && S.pano.R === S.pano.L ? L : A.birles(p.R, a, b, S.pano.R || S.pano.L); degistir(p, L, R); },
    secimPencere: function () { var p = secimVar(); if (!p) return; var q = panoAl(p); pencereAc(p.ad + ' (seçim)', q.L, q.R || q.L, 'ses').kirli = true; otoListeleri(); },
    faz: function () { var p = aktifVar(); if (!p) return; kanalIs(p, function (x, s, e) { var y = x.slice(); for (var i = s; i < e; i++) y[i] = -y[i]; return y; }); },
    mono: function () { var p = aktifVar(); if (!p) return; if (p.R === p.L) return toast('Zaten mono'); var m = A.monoya(p.L, p.R); degistir(p, m, m); },
    takas: function () { var p = aktifVar(); if (!p) return; if (p.R === p.L) return toast('Mono sesin kanalları yok'); degistir(p, p.R, p.L); },
    otoKirp: function () { var p = aktifVar(); if (!p) return; var r = A.sessizlikSinir(mono(p.L, p.R), SR, 40, 150); if (r[1] - r[0] < SR * 0.1) return toast('Kırpılacak sessizlik bulunamadı'); var a = r[0], b = r[1]; degistir(p, p.L.slice(a, b), p.R === p.L ? null : p.R.slice(a, b)); p.imlec = 0; tumuGoster(p); guncelle(); toast('Baştaki ve sondaki sessizlik kırpıldı'); },
    seciliyeYakin: function () { var p = secimVar(); if (!p) return; var n = p.sec[1] - p.sec[0]; p.bas = Math.max(0, p.sec[0] - n * 0.05); p.spp = Math.max(0.02, n * 1.1 / gW(p)); ciz(p); },
    sona: function () { var p = aktifVar(); if (!p) return; durdur(); p.imlec = p.L.length; p.sec = null; p.bas = Math.max(0, p.L.length - gW(p) * p.spp); guncelle(); },
    ileri: function () { sar(2); }, geri2: function () { sar(-2); },
    dongu: function () { S.dongu = !S.dongu; toast(S.dongu ? 'Döngü açık: seçim sürekli çalar' : 'Döngü kapalı'); },
    takip: function () { S.takip = S.takip === false; toast(S.takip === false ? 'Çalarken dalga sabit kalır' : 'Çalarken dalga oynatımı takip eder'); }
  });
  function sar(sn2) { var p = aktifVar(); if (!p) return; var yeni = Math.max(0, Math.min(p.L.length, (S.cal && S.calP === p ? S.imlecCal : p.imlec) + sn2 * SR)); p.imlec = yeni; p.sec = null; var cal = S.cal && S.calP === p; if (cal) calPencere(p); else guncelle(); }

  /* ---------- Menüler ---------- */
  function ac2(f) { return f; }
  var M = [
    ['Dosya', [
      ['Yeni dosya', '', I.yeni, 'Boş bir pencere açar. Kayıt alınca ya da dosya açınca bu pencereye gelir'],
      ['Aç…', 'Ctrl+O', function () { $('#dosyaSes').click(); }, 'Bilgisayarınızdaki klasörden bir ses ya da müzik dosyası seçip pencerede açar'],
      ['Mikrofonla kayıt', 'Ctrl+R', function () { kayitBasla(); }, 'Başlat / bitir. Kayıt yeni pencerede açılır'],
      ['Seçimi yeni pencerede aç', '', I.secimPencere, 'Seçili bölümü kopyalayıp ayrı bir pencereye koyar'],
      '-',
      ['Kapat', '', I.kapat, 'Seçili pencereyi kapatır. Değişiklik varsa kaydetmek isteyip istemediğinizi sorar'],
      ['Tüm pencereleri kapat', '', I.hepsiniKapat, 'Çalışma alanını boşaltır. Değişiklik olan pencereler için sorar'],
      '-',
      ['Çalışma alanı…', '', calismaAlani, 'Daha önce kaydettiğiniz çalışmaları listeler; açabilir ya da silebilirsiniz'],
      ['Kaydet', 'Ctrl+S', kaydetAkt, 'Nereye kaydedileceğini sorar: çalışma alanınıza ya da bilgisayarınıza (WAV / MP3)'],
      ['Farklı kaydet…', 'Ctrl+Shift+S', farkliKaydet, 'Yeni bir adla, istediğiniz yere (çalışma alanı, masaüstü ya da klasör) kaydeder'],
      ['Tümünü kaydet', '', tumunuKaydet, 'Açık bütün pencereleri çalışma alanına kaydeder'],
      '-',
      ['Otomatiğe gönder', '', otoyaGonder, 'Bu penceredeki sesi (seçim varsa yalnız seçimi) Otomatik sekmesinde kaynak olarak seçer; masaüstüne kaydetmeniz gerekmez'],
      ['Dışa aktar…', 'Ctrl+E', I.disa, 'MP3, WAV ya da santral dosyası olarak hazırlar (MP3 ve santral indirme hakkından düşer)'],
      '-',
      ['Panelime dön', '', function () { var a = document.querySelector('header a[href="panel"]'); if (a) a.click(); else location.href = 'panel'; }, '']]],
    ['Düzen', [
      ['Geri al', 'Ctrl+Z', I.geri, 'Pencerede son işlemi geri al'],
      ['Yinele', 'Ctrl+Y', I.yinele, 'Geri alınanı tekrar yap'],
      '-',
      ['Kes', 'Ctrl+X', I.kes, 'Seçili bölümü keser ve panoya alır'],
      ['Kopyala', 'Ctrl+C', I.kopyala, 'Seçili bölümü panoya alır'],
      ['Yapıştır', 'Ctrl+V', I.yapistir, 'Panodakini imlecin olduğu yere ekler'],
      ['Üzerine yapıştır', '', I.ustune, 'Seçili bölümü silip yerine panodakini koyar'],
      ['Karıştırarak yapıştır…', 'Ctrl+M', I.karistir, 'Panodakini (örneğin müziği) bu sesin üzerine seviye ayarlı karıştırır. Sesi silmez'],
      ['Panodan yeni pencere', '', I.panodanPencere, 'Kopyaladığın bölümü yeni bir pencerede aç'],
      '-',
      ['Hepsini seç', 'Ctrl+A', I.tumu, 'Pencerenin tamamını seç'],
      ['Seçimi kaldır', '', I.sec0, 'Seçimi iptal eder'],
      ['Seçimi sil', 'Delete', I.sil, 'Seçili bölümü keser atar, kalanlar birleşir'],
      ['Seçimi tut, gerisini at', 'Ctrl+T', I.kirp, 'Baş ve sondaki gereksiz kısmı kırpar'],
      ['Seçimi sessiz yap', '', I.sessiz, 'Seçimi susturur ama süre aynı kalır']]],
    ['Görünüm', [
      ['Zamanı yakınlaştır', 'Fare tekerleği', function () { var p = akt(); if (p) zoomT(p, 0.6); }, 'Dalgayı yatayda büyütür'],
      ['Zamanı uzaklaştır', 'Fare tekerleği', function () { var p = akt(); if (p) zoomT(p, 1.6); }, 'Dalgayı yatayda küçültür'],
      ['Tamamını göster', '', function () { var p = akt(); if (p) { tumuGoster(p); ciz(p); } }, 'Ses baştan sona görünür'],
      ['Seçime yakınlaş', '', I.seciliyeYakin, 'Seçili bölüm pencereyi doldurur'],
      '-',
      ['Seviyeyi büyüt', 'Alt + tekerlek', function () { var p = akt(); if (p) { p.vz = Math.min(64, p.vz * 1.6); ciz(p); } }, 'Alçak sesli dalgayı dikeyde büyütür'],
      ['Seviyeyi küçült', '', function () { var p = akt(); if (p) { p.vz = Math.max(0.1, p.vz / 1.6); ciz(p); } }, 'Dalgayı dikeyde küçültür'],
      ['Seviyeyi sıfırla (1×)', '', function () { var p = akt(); if (p) { p.vz = 1; ciz(p); } }, ''],
      '-',
      ['Çalarken dalgayı takip et', '', I.takip, 'Açık/kapalı. Çalan yer ekranda kayar']]],
    ['Ekle', [
      ['Sessizlik ekle (imlece)…', '', I.sessizlikEkle, 'İmlecin olduğu yere boşluk ekler'],
      ['Sessizlik ekle (başa)…', '', function () { konumluSessizlik('başa'); }, 'Sesin başına boşluk ekler'],
      ['Sessizlik ekle (sona)…', '', function () { konumluSessizlik('sona'); }, 'Sesin sonuna boşluk ekler']]],
    ['Çal', [
      ['Oynat / Durdur', 'Boşluk', oynatToggle, 'Seçimi ya da imleçten sonrasını çalar'],
      ['Durdur', '', function () { if (kayit) kayitDur(); durdur(); }, 'Çalmayı ya da kaydı durdurur'],
      ['Başa dön', '', function () { var p = akt(); if (p) { durdur(); p.imlec = 0; p.sec = null; p.bas = 0; guncelle(); } }, 'İmleci pencerenin başına alır'],
      ['Sona git', '', I.sona, 'İmleci pencerenin sonuna alır'],
      ['İleri sar (2 sn)', '', I.ileri, ''],
      ['Geri sar (2 sn)', '', I.geri2, ''],
      '-',
      ['Döngü (seçimi sürekli çal)', '', I.dongu, 'Açık/kapalı. Seçili bölümü tekrar tekrar çalar'],
      ['Mikrofonla kayıt', 'Ctrl+R', function () { kayitBasla(); }, 'Başlat / bitir']]],
    ['İşlem', [
      ['Ses seviyesi…', '', I.kazanc, 'Seçimi ya da pencerenin tamamını yükseltir veya alçaltır (dB)'],
      ['+1 dB', '', function () { I.kazancHizli(1); }, 'Hızlıca biraz yükselt'],
      ['−1 dB', '', function () { I.kazancHizli(-1); }, 'Hızlıca biraz alçalt'],
      ['Normalleştir (tepe −1 dB)', '', I.normal, 'Bozmadan olabildiğince yükseltir'],
      ['Normalleştir (gürlüğe göre)…', '', gurlukNormalDlg, 'Radyo, TV ya da santral gürlüğüne ölçerek getirir'],
      '-',
      ['Yumuşak giriş (fade in)', '', I.giris, 'Seçimin başında sesi yavaş açar'],
      ['Yumuşak çıkış (fade out)', '', I.cikis, 'Seçimin sonunda sesi yavaş kısar'],
      '-',
      ['Ters çevir (geriye doğru)', '', I.ters, 'Seçimi baştan sona çevirir (özel efekt)'],
      ['Fazı ters çevir', '', I.faz, 'Dalgayı baş aşağı çevirir; fazı bozuk kayıtları düzeltir'],
      ['DC kaymasını sil', '', I.dc, 'Kayıttaki sabit ofseti temizler; kesim yerlerindeki “tık” sesini azaltır'],
      ['Mono’ya çevir', '', I.mono, 'İki kanalı tek kanala indirir'],
      ['Kanalları değiştir', '', I.takas, 'Sol ve sağ kanalı yer değiştirir'],
      '-',
      ['Süreyi değiştir…', '', hizDlg, 'Sesi hızlandırır ya da yavaşlatır, perde değişmez'],
      ['Baş ve sondaki sessizliği kırp', '', I.otoKirp, 'Konuşma başlamadan önceki ve bittikten sonraki boşluğu keser']]],
    ['Efekt', [
      ['Reverb (oda yankısı)…', '', yankiDlg, 'Sese oda ya da salon havası verir'],
      ['Eko (gecikme)…', '', ekoDlg, 'Sesin tekrarlarını ekler'],
      ['Chorus…', '', chorusDlg, 'Sesi kalabalıklaştırır, çoklu ses etkisi'],
      ['Flanger…', '', flangerDlg, 'Süpürme, jet sesi etkisi'],
      ['Vibrato…', '', vibratoDlg, 'Perdeyi hafifçe titretir'],
      ['Tremolo…', '', tremoloDlg, 'Sesin yüksekliğini düzenli açıp kısar'],
      ['Distortion…', '', bozulmaDlg, 'Sert, kirli ton'],
      '-',
      ['Wave Hammer (kompresör + limiter)…', '', hammerDlg, 'Sesi dengeler ve güçlendirir, bozulmayı önler'],
      ['Noise Gate (sessizlikte sesi kıs)…', '', kapiDlg, 'Konuşma olmayan yerlerde sesi kapatır'],
      ['Ses rengi (EQ)…', '', eqDlg, 'Tok, parlak, sıcak gibi ton ayarı'],
      ['Filtre (alçak / yüksek geçiren)…', '', filtreDlg, 'Uğultuyu ya da cızırtıyı keser'],
      ['Perde değiştir…', '', perdeDlg, 'Sesi kalınlaştırır ya da inceltir; süreyi korur'],
      '-',
      ['Telefon', '', function () { hazirEfekt('telefon', 'Telefon efekti'); }, 'Telefon hattından gelen ses'],
      ['Megafon', '', function () { hazirEfekt('megafon', 'Megafon efekti'); }, 'Megafon ya da anons sesi'],
      ['Robot…', '', robotDlg, 'Robot sesi']]],
    ['Araçlar', [
      ['Dip sesi temizle', '', I.dip, 'Tek tuş: parazit, uğultu ve konuşma aralarındaki gürültüyü siler'],
      ['Gürültü azaltma…', '', gurultuDlg, 'Ayarlı temizlik; gürültü izini kendin seçebilirsin'],
      '-',
      ['İstatistik…', '', istatistikDlg, 'Seçimin ya da pencerenin tepe, ortalama ve gürlük değerleri']]],
    ['FX Favorileri', [
      ['Radyo spikeri sesi', '', FAV.radyo, 'EQ + Wave Hammer: dolgun, net radyo sesi'],
      ['Sıcak spiker sesi', '', FAV.sicak, 'Bası artırılmış yumuşak ses'],
      ['Parlak spiker sesi', '', FAV.parlak, 'Tizi artırılmış canlı ses'],
      ['Temizle + radyo sesi + seviye', '', FAV.tam, 'Tek tıkla: dip ses temizliği, ton, sıkıştırma ve radyo gürlüğü'],
      '-',
      ['Telefon hattı', '', FAV.telefon, 'Santral ve telefon etkisi'],
      ['Megafon anons', '', FAV.megafon, 'Dışarıda anons sesi']]],
    ['Seçenekler', [
      ['Mikrofon seç…', '', mikSec, 'Birden fazla mikrofonun varsa hangisiyle kayıt yapılacağı'],
      ['Çalarken dalgayı takip et', '', I.takip, 'Açık/kapalı'],
      ['Döngü (seçimi sürekli çal)', '', I.dongu, 'Açık/kapalı']]],
    ['Pencere', [
      ['Alt alta diz', '', function () { diz('alt'); }, 'Pencereleri alt alta, tam genişlikte düzenler'],
      ['Yan yana diz', '', function () { diz('yan'); }, 'Pencereleri yan yana dizer'],
      ['Basamak düzeni', '', function () { diz('seri'); }, 'Pencereleri üst üste basamak gibi düzenler'],
      '-', ['@pencereler']]],
    ['Yardım', [
      ['Menü rehberi', '', menuRehberi, 'Hangi komut ne işe yarar, hepsi açıklamalı'],
      ['Kısayollar', '', function () { bilgi('Kısayollar', '<p>Boşluk: oynat / durdur<br>Delete ya da Backspace: seçimi sil<br>Ctrl+Z / Ctrl+Y: geri al / yinele<br>Ctrl+X / C / V: kes / kopyala / yapıştır<br>Ctrl+M: karıştırarak yapıştır<br>Ctrl+A: hepsini seç<br>Ctrl+T: seçimi tut<br>Ctrl+N: yeni pencere<br>Ctrl+O: dosya yükle<br>Ctrl+R: kayıt<br>Ctrl+E: dışa aktar<br>Fare tekerleği: yakınlaştır, Shift + tekerlek: kaydır, Alt + tekerlek: seviye<br>Seçimi tutup başka pencereye sürükle: karıştırarak yapıştır</p>'); }, ''],
      ['Nasıl çalışır?', '', function () { bilgi('Nasıl çalışır?', '<p><b>Otomatik:</b> sesi ve müziği yükleyin, “Otomatik hazırla”ya basın.</p><p><b>Manuel stüdyo:</b> her dosya kendi penceresinde açılır. Bir pencerede bölüm seçip kopyalayın, diğerine “Karıştırarak yapıştır” deyin. Seçimi sürükleyip başka pencereye bırakarak da karıştırabilirsiniz.</p><p><b>Dışa aktar:</b> hazır olunca Dosya menüsünden MP3, WAV ya da santral dosyası olarak kaydedin.</p>'); }, '']]]
  ];

  function istatistikDlg() {
    var p = aktifVar(); if (!p) return; var r = aralik(p), x = mono(p.L.slice(r[0], r[1]), p.R.slice(r[0], r[1])), s = Motor.istatistik(x, SR);
    bilgi('İstatistik: ' + p.ad, '<table style="width:100%;border-collapse:collapse;font-size:14px">' + [['Süre', sn(s.sure) + ' sn'], ['Tepe seviye', s.tepeDb.toFixed(1) + ' dB'], ['Ortalama (RMS)', s.rmsDb.toFixed(1) + ' dB'], ['Gürlük (LUFS)', s.lufs.toFixed(1) + ' LUFS'], ['Dip ses seviyesi', s.zeminDb.toFixed(1) + ' dB'], ['Konuşma seviyesi', s.konusmaDb.toFixed(1) + ' dB']].map(function (a) { return '<tr><td style="padding:.25rem 0;color:var(--sol)">' + a[0] + '</td><td style="text-align:right"><b>' + a[1] + '</b></td></tr>'; }).join('') + '</table><p class="sol" style="font-size:12px">' + (p.sec ? 'Seçili bölüm için.' : 'Pencerenin tamamı için.') + '</p>');
  }
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


  /* ---------- İkonlar ve araç çubuğu (Sound Forge tarzı) ---------- */
  var IK = {
    yeni: '<rect class="f" x="3" y="5" width="18" height="14"/><path d="M3 9h18"/><path class="g" d="M12 11.5v5M9.5 14h5"/>',
    ac: '<path class="y" d="M3 5h6l2 2h8v3H3z"/><path class="y2" d="M2 20l3-9h17l-3 9z"/>',
    disa: '<path class="f" d="M5 3h11l3 3v15H5z"/><rect class="fb" x="8" y="3" width="7" height="5"/><rect class="f" x="8" y="13" width="8" height="8"/>',
    kes: '<circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 16 17 4M15.5 16 7 4"/>',
    kopyala: '<rect class="f" x="8" y="8" width="11" height="13"/><path d="M5 16V3h11"/>',
    yapistir: '<rect class="f" x="5" y="5" width="14" height="16" rx="1"/><rect class="fb" x="9" y="3" width="6" height="4" rx="1"/>',
    ustune: '<rect class="f" x="4" y="5" width="14" height="16" rx="1"/><rect class="fb" x="8" y="3" width="6" height="4" rx="1"/><path class="r" d="M18 10v8M15 15l3 3 3-3"/>',
    karistir: '<rect class="f" x="3" y="5" width="13" height="16" rx="1"/><rect class="fb" x="7" y="3" width="5" height="4" rx="1"/><path class="o" d="M8 15c1.5-5 3 5 4.5 0s3 5 4.5 0 2-3 3-2"/>',
    geri: '<path class="b" d="M9 8 4 12l5 4M4 12h9a4.5 4.5 0 0 1 0 9h-3"/>',
    yinele: '<g transform="matrix(-1 0 0 1 24 0)"><path class="b" d="M9 8 4 12l5 4M4 12h9a4.5 4.5 0 0 1 0 9h-3"/></g>',
    tumu: '<rect class="fl" stroke-dasharray="2.5 2" x="4" y="6" width="16" height="12"/>',
    kirp: '<path d="M7 3v14h14M3 7h14v14"/>',
    sil: '<rect class="f" x="4" y="6" width="16" height="12"/><path class="r" d="M9 9l6 6M15 9l-6 6"/>',
    sessiz: '<path class="f" d="M4 9h4l5-4v14l-5-4H4z"/><path class="r" d="M16 9l5 6M21 9l-5 6"/>',
    sessizEkle: '<path d="M3 15h18" stroke-dasharray="1.5 3"/><path class="g" d="M12 4v7M8.5 7.5h7"/>',
    kayit: '<circle class="fr" cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="9" class="r"/>',
    dongu: '<path class="b" d="M5 11V9a3 3 0 0 1 3-3h10M15 3l3 3-3 3M19 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3"/>',
    oynat: '<path class="fg" d="M7 4.5v15l13-7.5z"/>',
    duraklat: '<path class="fg" d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    dur: '<rect class="fd" x="6" y="6" width="12" height="12"/>',
    basa: '<path d="M6 5v14"/><path class="fd" d="M19 5v14L8 12z"/>',
    sona: '<path d="M18 5v14"/><path class="fd" d="M5 5v14l11-7z"/>',
    gerisar: '<path class="fd" d="M12 6v12L3 12zM21 6v12l-9-6z"/>',
    ilerisar: '<path class="fd" d="M12 6v12l9-6zM3 6v12l9-6z"/>',
    zin: '<circle class="f" cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20M7 10h6M10 7v6"/>',
    zout: '<circle class="f" cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20M7 10h6"/>',
    zsec: '<circle class="f" cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/><path class="b" d="M7.5 7.5v5M12.5 7.5v5M7.5 10h5"/>',
    ztum: '<circle class="f" cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/><path class="b" d="M6.5 10h7M8 8.5 6.5 10 8 11.5M12 8.5l1.5 1.5-1.5 1.5"/>',
    lin: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    lout: '<path d="M12 8v8M8 4l4 4 4-4M8 20l4-4 4 4"/>',
    takip: '<path d="M3 12h18"/><path class="o" d="M13 5v14"/><path d="M16 9l3 3-3 3"/>',
    normal: '<path class="r" d="M3 4h18"/><path d="M6 20v-7M10 20V8M14 20V10M18 20V7"/>',
    gainup: '<path d="M3 14c1.5-6 3 6 4.5 0s3 6 4.5 0"/><path class="g" d="M18 19V5M14.5 8.5 18 5l3.5 3.5"/>',
    gaindown: '<path d="M3 10c1.5-6 3 6 4.5 0s3 6 4.5 0"/><path class="r" d="M18 5v14M14.5 15.5 18 19l3.5-3.5"/>',
    fin: '<path class="fl" d="M3 19h18V5z"/>',
    fout: '<path class="fl" d="M3 5v14h18z"/>',
    ters: '<path d="M20 12H8M11 8l-4 4 4 4"/><path class="o" d="M4 6v12"/>',
    faz: '<path class="b" d="M3 12c1.5-7 4.5-7 6 0"/><path class="o" d="M9 12c1.5 7 4.5 7 6 0"/><path d="M15 12h6"/>',
    mono: '<path d="M3 7h6l4 5-4 5H3"/><path class="b" d="M13 12h8"/>',
    takas: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    otokirp: '<path d="M3 5v14M21 5v14"/><path class="b" d="M6 12c1-5 2-5 3 0s2 5 3 0 2-5 3 0 1 3 2 0"/>',
    diz: '<rect class="f" x="3" y="3" width="18" height="5"/><rect class="f" x="3" y="10" width="18" height="5"/><rect class="f" x="3" y="17" width="18" height="4"/>',
    yan: '<rect class="f" x="3" y="4" width="8" height="16"/><rect class="f" x="13" y="4" width="8" height="16"/>',
    seri: '<rect class="f" x="3" y="3" width="13" height="10"/><rect class="f" x="8" y="8" width="13" height="10"/>',
    istat: '<path d="M5 20V10M10 20V5M15 20V13M20 20V8"/>',
    dip: '<path class="b" d="M3 11h3l2-5 3 10 3-8 2 3h5"/><path class="o" d="M3 19h18"/>',
    nr: '<path class="b" d="M3 12h3l2-5 3 10 3-8 2 3h5"/><path class="o" d="M3 19h18" stroke-dasharray="2 2"/><path class="o" d="M3 5h18" stroke-dasharray="2 2"/>',
    hammer: '<path d="M3 12h4M17 12h4"/><path class="r" d="M12 3v5M9 5.5 12 8l3-2.5M12 21v-5M9 18.5l3-2.5 3 2.5"/>',
    gate: '<path d="M3 17h5V8h8v9h5"/><path class="o" d="M3 13h18" stroke-dasharray="2 2"/>',
    eq: '<path d="M6 4v16M12 4v16M18 4v16"/><rect class="fb" x="4" y="13" width="4" height="3"/><rect class="fb" x="10" y="6" width="4" height="3"/><rect class="fb" x="16" y="10" width="4" height="3"/>',
    filtre: '<path class="b" d="M3 8h9c3 0 4 8 9 8"/><path d="M3 20h18"/>',
    perde: '<circle class="fd" cx="8" cy="17" r="3"/><path d="M11 17V5l8 2"/><path class="o" d="M17 12v8M14.5 17.5 17 20l2.5-2.5"/>',
    sure: '<circle class="f" cx="12" cy="12" r="8"/><path class="b" d="M12 7v5l3.5 2"/>',
    reverb: '<circle class="fd" cx="5" cy="12" r="1.6"/><path class="b" d="M9 8a6 6 0 0 1 0 8M13 5a10 10 0 0 1 0 14M17 3a14 14 0 0 1 0 18"/>',
    eko: '<path class="o" d="M4 5v14M9 7v10M14 9.5v5M19 11v2"/>',
    chorus: '<path class="b" d="M3 9c3-5 4 5 7 0s4 5 7 0"/><path class="o" d="M5 16c3-5 4 5 7 0s4 5 7 0"/>',
    flanger: '<path class="b" d="M3 12c3-9 6-9 9 0s6 9 9 0"/><path class="o" d="M3 12c3 9 6 9 9 0s6-9 9 0"/>',
    vibrato: '<path class="b" d="M2 12c1.2-6 2.4-6 3.6 0s2.4 6 3.6 0 2.4-6 3.6 0 2.4 6 3.6 0 2.4-6 3.6 0"/>',
    tremolo: '<path class="b" d="M4 5v14M8 9v6M12 5v14M16 9v6M20 5v14"/>',
    bozulma: '<path class="r" d="M3 17V7h5v10h5V7h5v10h3"/>',
    telefon: '<path class="fd" d="M5 5c0 8 6 14 14 14l1-4-4-2-2 2c-2-1-4-3-5-5l2-2-2-4z"/>',
    megafon: '<path class="f" d="M4 10v4h3l8 5V5L7 10z"/><path class="o" d="M18 9c1.5 1.5 1.5 4.5 0 6"/>',
    robot: '<rect class="f" x="5" y="7" width="14" height="11" rx="2"/><circle class="fb" cx="9.5" cy="12" r="1.5"/><circle class="fb" cx="14.5" cy="12" r="1.5"/><path d="M12 7V4M9 16h6"/>',
    mik: '<rect class="f" x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
    yildiz: '<path class="fo" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    gunes: '<circle class="fo" cx="12" cy="12" r="4"/><path class="o" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/>',
    parlak: '<path class="fb" d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>'
  };
  function ikon(k) { return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' + (IK[k] || '') + '</svg>'; }
  function oynatIk(on) { var b = $('#oynatBtn'); if (b) b.innerHTML = ikon(on ? 'duraklat' : 'oynat'); }
  function kom(ad) { for (var i = 0; i < M.length; i++) for (var j = 0; j < M[i][1].length; j++) { var m = M[i][1][j]; if (m !== '-' && m[0] === ad) return m; } console.warn('Komut yok:', ad); return null; }
  /* [ikon, komut adı, (ek: id | açık-kapalı anahtarı)] ; '|' ayırıcı */
  var ARAC = [
    [
      [['yeni', 'Yeni dosya', 'yeniBtn'], ['ac', 'Aç…', 'sesAc'], ['disa', 'Dışa aktar…']],
      [['kes', 'Kes'], ['kopyala', 'Kopyala'], ['yapistir', 'Yapıştır'], ['ustune', 'Üzerine yapıştır'], ['karistir', 'Karıştırarak yapıştır…']],
      [['geri', 'Geri al'], ['yinele', 'Yinele']],
      [['tumu', 'Hepsini seç'], ['kirp', 'Seçimi tut, gerisini at'], ['sil', 'Seçimi sil'], ['sessiz', 'Seçimi sessiz yap'], ['sessizEkle', 'Sessizlik ekle (imlece)…']],
      [['normal', 'Normalleştir (gürlüğe göre)…'], ['gainup', '+1 dB'], ['gaindown', '−1 dB'], ['fin', 'Yumuşak giriş (fade in)'], ['fout', 'Yumuşak çıkış (fade out)'], ['ters', 'Ters çevir (geriye doğru)'], ['faz', 'Fazı ters çevir'], ['mono', 'Mono’ya çevir'], ['takas', 'Kanalları değiştir'], ['otokirp', 'Baş ve sondaki sessizliği kırp']],
      [['mik', 'Radyo spikeri sesi'], ['gunes', 'Sıcak spiker sesi'], ['parlak', 'Parlak spiker sesi'], ['yildiz', 'Temizle + radyo sesi + seviye']],
      [['istat', 'İstatistik…'], ['diz', 'Alt alta diz'], ['yan', 'Yan yana diz'], ['seri', 'Basamak düzeni']]
    ],
    [
      [['kayit', 'Mikrofonla kayıt', 'kayitBtn'], ['dongu', 'Döngü (seçimi sürekli çal)', null, 'dongu'], ['oynat', 'Oynat / Durdur', 'oynatBtn'], ['dur', 'Durdur'], ['basa', 'Başa dön', 'basaBtn'], ['gerisar', 'Geri sar (2 sn)'], ['ilerisar', 'İleri sar (2 sn)'], ['sona', 'Sona git']],
      [['zin', 'Zamanı yakınlaştır'], ['zout', 'Zamanı uzaklaştır'], ['zsec', 'Seçime yakınlaş'], ['ztum', 'Tamamını göster'], ['lin', 'Seviyeyi büyüt'], ['lout', 'Seviyeyi küçült'], ['takip', 'Çalarken dalgayı takip et', null, 'takip']],
      [['dip', 'Dip sesi temizle'], ['nr', 'Gürültü azaltma…'], ['hammer', 'Wave Hammer (kompresör + limiter)…'], ['gate', 'Noise Gate (sessizlikte sesi kıs)…'], ['eq', 'Ses rengi (EQ)…'], ['filtre', 'Filtre (alçak / yüksek geçiren)…']],
      [['reverb', 'Reverb (oda yankısı)…'], ['eko', 'Eko (gecikme)…'], ['chorus', 'Chorus…'], ['flanger', 'Flanger…'], ['vibrato', 'Vibrato…'], ['tremolo', 'Tremolo…'], ['bozulma', 'Distortion…'], ['perde', 'Perde değiştir…'], ['sure', 'Süreyi değiştir…'], ['telefon', 'Telefon'], ['megafon', 'Megafon'], ['robot', 'Robot…']]
    ]
  ];
  (function aracKur() {
    var kap = $('#aracSol');
    ARAC.forEach(function (sira) {
      var sr = document.createElement('div'); sr.className = 'sira'; kap.appendChild(sr);
      sira.forEach(function (g) {
      var gd = document.createElement('div'); gd.className = 'grup';
      g.forEach(function (t) {
        var m = kom(t[1]); if (!m) return;
        var b = document.createElement('button'); b.className = 'ik' + (t[0] === 'kayit' ? ' kayitIk' : ''); if (t[2]) b.id = t[2];
        b.innerHTML = ikon(t[0]); b.title = m[0].replace('…', '') + (m[1] ? '  (' + m[1] + ')' : '') + (m[3] ? '\n' + m[3] : ''); b.setAttribute('aria-label', m[0]);
        if (t[2] !== 'oynatBtn' && t[2] !== 'kayitBtn' && t[2] !== 'basaBtn') b.onclick = function () { m[2](); if (t[3]) b.classList.toggle('on', t[3] === 'takip' ? S.takip !== false : !!S[t[3]]); };
        if (t[3]) b.classList.toggle('on', t[3] === 'takip' ? S.takip !== false : !!S[t[3]]);
        gd.appendChild(b);
      });
      sr.appendChild(gd);
      });
    });
    oynatIk(0);
  })();
  /* ---------- Düğmeler, dosya girişi, sürükle-bırak, kısayollar ---------- */
  $('#oynatBtn').onclick = oynatToggle;
  $('#basaBtn').onclick = function () { var p = akt(); durdur(); if (p) { p.imlec = 0; p.sec = null; p.bas = 0; guncelle(); } };
  $('#kayitBtn').onclick = kayitBasla; $('#otoKayit').onclick = function () { kayitBasla(); };
  $('#otoMikSec').onclick = function () { mikSec(); };
  $('#otoSesAc').onclick = function () { $('#dosyaSes').click(); }; $('#otoMuzikAc').onclick = function () { $('#dosyaMuzik').click(); };
  var sonAcilan = '';
  $('#dosyaSes').onchange = async function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) { var p = await dosyadanAc(f, 'ses'); if (p && S.tab !== 'oto') sekme('manuel'); else if (p) { $('#otoSes').value = 'p' + p.id; } } };
  $('#dosyaMuzik').onchange = async function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) { var p = await dosyadanAc(f, 'ses'); if (p) { if (S.tab === 'oto') $('#otoMuzik').value = 'p' + p.id; else sekme('manuel'); } } };
  $('#hedef').onchange = function () { hedefUygula(); };
  $$('#hedefKart button').forEach(function (b) { b.onclick = function () { $('#hedef').value = b.dataset.h; hedefUygula(); $$('#hedefKart button').forEach(function (x) { x.classList.toggle('secili', x === b); }); }; });
  function sesDosyasiMi(f) { return /^(audio|video)\//.test(f.type) || /\.(mp3|wav|m4a|aac|ogg|flac|aif|aiff|wma|mp4|mov|webm|mkv)$/i.test(f.name); }
  async function birakIsle(files, secId) {
    var l = Array.prototype.slice.call(files || []), gecerli = l.filter(sesDosyasiMi);
    if (!l.length) return; if (!gecerli.length) return toast('Bu dosya ses ya da video değil: ' + l[0].name);
    if (l.length > gecerli.length) toast((l.length - gecerli.length) + ' dosya ses olmadığı için atlandı');
    var ilk = null; for (var i = 0; i < gecerli.length; i++) { var p = await dosyadanAc(gecerli[i], 'ses'); if (p && !ilk) ilk = p; }
    if (!ilk) return;
    if (S.tab === 'oto') { otoListeleri(); if (secId) $(secId).value = 'p' + ilk.id; toast('Yüklendi: ' + ilk.ad); } else sekme('manuel');
  }
  function dzBagla(id, secId) { var el = $(id); ['dragenter', 'dragover'].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); el.classList.add('uzerinde'); }); }); el.addEventListener('dragleave', function () { el.classList.remove('uzerinde'); }); el.addEventListener('drop', function (e) { e.preventDefault(); e.stopPropagation(); el.classList.remove('uzerinde'); birakIsle(e.dataTransfer && e.dataTransfer.files, secId); }); }
  dzBagla('#dzSes', '#otoSes'); dzBagla('#dzMuzik', '#otoMuzik');
  $('#otoBtn').onclick = function () { oto(false); }; $('#yenidenBtn').onclick = function () { oto(true); };
  $('#sonucDur').onclick = function () { durdur(); };
  $('#sonucCal').onclick = function () { if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın'); if (S.cal) durdur(); else calDizi(S.sonuc.L, S.sonuc.R, null, 0); };
  $('#sonucManuel').onclick = function () { if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın'); sekme('manuel'); var p = pencereAc(S.sonucAd + ' (otomatik)', S.sonuc.L.slice(), S.sonuc.R.slice(), 'ses'); p.kirli = true; otoListeleri(); };
  function otoyaGonder() {
    var p = akt(); if (!p) return toast('Önce manuel stüdyoda bir pencere seçin');
    if (p.bos) return toast('Bu pencere boş');
    otoListeleri(); var id = p.id;
    if (p.sec && p.sec[1] - p.sec[0] > SR * 0.2) { var q = panoAl(p), y = pencereAc(p.ad + ' (seçim)', q.L, q.R || q.L, 'ses'); id = y.id; otoListeleri(); kucult(y); }
    sekme('oto'); $('#otoSes').value = 'p' + id; toast('“' + p.ad + '” Otomatik sekmesine kaynak olarak eklendi. “Otomatik hazırla”ya basın.');
  }
  (function () {
    var sr = document.createElement('div'); sr.id = 'mobSerit';
    sr.innerHTML = '<button class="mKayit" data-m="kayit">● Kayıt</button><button data-m="oynat">▶ Oynat</button><button data-m="dur">■ Durdur</button><button class="mSil" data-m="sil">✕ Sil</button><button data-m="kirp">Kırp</button><button data-m="geri">↶ Geri al</button><button data-m="efekt">Ses efekti</button><button data-m="dip">Dip sesi temizle</button><button class="mOto" data-m="oto">Otomatiğe gönder</button>';
    $('#menu').insertAdjacentElement('afterend', sr);
    sr.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; var m = b.dataset.m;
      if (m === 'kayit') kayitBasla(); else if (m === 'oynat') oynatToggle(); else if (m === 'dur') durdur();
      else if (m === 'sil') { var ps = akt(); if (ps && !ps.sec) return toast('Önce parmağınızla silinecek bölümü seçin (dalga üzerinde sürükleyin)'); I.sil(); } else if (m === 'kirp') { var pk = akt(); if (pk && !pk.sec) return toast('Önce tutulacak bölümü parmağınızla seçin'); I.kirp(); } else if (m === 'geri') I.geri();
      else if (m === 'efekt') efektDegistir(); else if (m === 'dip') dipTemizle(); else if (m === 'oto') otoyaGonder();
    });
    setInterval(function () { var k = sr.querySelector('.mKayit'); if (k) { var kk = !!kayit; k.textContent = kk ? '■ Kaydı bitir' : '● Kayıt'; k.classList.toggle('kayitta', kk); } }, 400);
  })();
  (function () { var mn = $('#menu'), b = document.createElement('button'); b.id = 'otoyaGonder'; b.className = 'otoSekme'; b.title = 'Bu sesi Otomatik sekmesine kaynak olarak gönder (kaydetmeye gerek yok)'; b.textContent = 'Otomatiğe gönder'; b.onclick = otoyaGonder; mn.appendChild(b);
    function esitle() { var r = $('#hzDip'); if (!r || !r.offsetWidth) return; b.style.width = r.offsetWidth + 'px'; b.style.height = r.offsetHeight + 'px'; var cs = getComputedStyle(r); b.style.fontSize = cs.fontSize; b.style.paddingLeft = b.style.paddingRight = '0'; b.style.marginRight = Math.max(0, Math.round((mn.getBoundingClientRect().right - parseFloat(getComputedStyle(mn).paddingRight) - r.getBoundingClientRect().right) * 10) / 10) + 'px'; }
    esitle(); window.addEventListener('resize', esitle); setTimeout(esitle, 300); b.addEventListener('mouseenter', esitle); })();
  $('#sonucPaylas').onclick = paylas;
  $('#sonucDisa').onclick = function () { if (!S.sonuc) return toast('Önce “Otomatik hazırla”ya basın'); disaDlg('sonuc'); };
  document.addEventListener('dragover', function (e) { e.preventDefault(); if (S.tab === 'manuel') alan.classList.add('birak'); });
  document.addEventListener('dragleave', function (e) { if (!e.relatedTarget) alan.classList.remove('birak'); });
  document.addEventListener('drop', function (e) { e.preventDefault(); alan.classList.remove('birak'); birakIsle(e.dataTransfer && e.dataTransfer.files, '#otoSes'); });
  document.addEventListener('keydown', function (e) {
    var t = e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return; if (document.querySelector('.perde')) return; if (S.tab !== 'manuel') return;
    var c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); if (kayit && !kayit.bekle) kayitDur(); else oynatToggle(); }
    else if (c && k === 'z') { e.preventDefault(); I.geri(); } else if (c && k === 'y') { e.preventDefault(); I.yinele(); }
    else if (c && k === 'x') { e.preventDefault(); I.kes(); } else if (c && k === 'c') { e.preventDefault(); I.kopyala(); } else if (c && k === 'v') { e.preventDefault(); I.yapistir(); }
    else if (c && k === 'm') { e.preventDefault(); I.karistir(); } else if (c && k === 'a') { e.preventDefault(); I.tumu(); } else if (c && k === 't') { e.preventDefault(); I.kirp(); }
    else if (c && k === 'm' && false) {} else if (c && k === 'o') { e.preventDefault(); $('#dosyaSes').click(); } else if (c && k === 'r') { e.preventDefault(); kayitBasla(); } else if (c && k === 'e') { e.preventDefault(); I.disa(); } else if (c && k === 's') { e.preventDefault(); if (e.shiftKey) farkliKaydet(); else kaydetAkt(); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); I.sil(); }
  });
  window.__studyo = { S: S, Motor: Motor, I: I, pencereAc: pencereAc, dosyadanAc: dosyadanAc, oto: oto, diz: diz, ciz: ciz, kapat: kapat, karistirDlg: karistirDlg, gurultuDlg: gurultuDlg, disaDlg: disaDlg, sekme: sekme, bolgeUygula: bolgeUygula, dipTemizle: dipTemizle };


  /* ---------- Hızlı düğmeler: her basışta sıradaki ses efekti ---------- */
  function kazanc(sL, sR, db) { var g = Motor.dB(db), o = kanalDo(sL, sR, function (x) { var y = new Float32Array(x.length); for (var i = 0; i < y.length; i++) y[i] = x[i] * g; return y; }); var s = Motor.sinirla(o.L, o.R, SR, -0.5, 80); return { L: s.L, R: sR === sL ? s.L : s.R }; }
  var EF = [
    ['Radyo spikeri', function (a, b) { return zincirHammer(zincirEq(a, b, Motor.TON.radyo.bantlar), b, Motor.KUVVET.radyo, -1.5); }],
    ['Sıcak spiker', function (a, b) { return zincirHammer(zincirEq(a, b, Motor.TON.sicak.bantlar), b, Motor.KUVVET.hafif, -1.5); }],
    ['Parlak spiker', function (a, b) { return zincirHammer(zincirEq(a, b, Motor.TON.parlak.bantlar), b, Motor.KUVVET.radyo, -1.5); }],
    ['Tok ve resmi', function (a, b) { return zincirHammer(zincirEq(a, b, Motor.TON.tok.bantlar), b, Motor.KUVVET.radyo, -1.5); }],
    ['Net ve berrak', function (a, b) { return zincirHammer(zincirEq(a, b, Motor.TON.net.bantlar), b, Motor.KUVVET.hafif, -1.5); }],
    ['Sesi dengele (güçlü)', function (a, b) { return zincirHammer({ L: a, R: b }, b, Motor.KUVVET.siki, -1.5); }],
    ['Sesi kıs (−6 dB)', function (a, b) { return kazanc(a, b, -6); }, true],
    ['Sesi yükselt (+6 dB)', function (a, b) { return kazanc(a, b, 6); }, true],
    ['Oda yankısı', function (a, b) { return monoEfekt(a, b, { tur: 'oda', p: {} }); }],
    ['Salon yankısı', function (a, b) { return monoEfekt(a, b, { tur: 'salon', p: {} }); }],
    ['Yankı (slapback)', function (a, b) { return monoEfekt(a, b, { tur: 'yanki', p: {} }); }],
    ['Plak havası', function (a, b) { return monoEfekt(a, b, { tur: 'plak', p: {} }); }],
    ['Telefon hattı', function (a, b) { return monoEfekt(a, b, { tur: 'telefon', p: {} }); }],
    ['Megafon', function (a, b) { return monoEfekt(a, b, { tur: 'megafon', p: {} }); }],
    ['Robot', function (a, b) { return monoEfekt(a, b, { tur: 'robot', p: {} }); }],
    ['Orijinal ses (efektsiz)', null, true]
  ];
  function efektDegistir() {
    var p = aktifVar(); if (!p) return; if (p.kayitta) return toast('Önce kaydı bitirin');
    if (S.mesgul) return; var orj;
    if (p.efSon && p.efSon === p.L && p.efOrj) { orj = p.efOrj; p.undo.pop(); } else { orj = { L: p.L, R: p.R }; p.efIdx = -1; }
    p.efIdx = (p.efIdx + 1) % EF.length; var e = EF[p.efIdx], no = p.efIdx + 1;
    try {
      var r = e[1] ? e[1](orj.L, orj.R) : { L: orj.L, R: orj.R }; if (!r) return;
      if (e[1] && !e[2]) r = tepeyeAyarla(r);
      var monoP = orj.R === orj.L; degistir(p, r.L, monoP && r.R !== r.L ? r.L : (monoP ? r.L : r.R));
      p.efOrj = orj; p.efSon = p.L; p.kirli = true; guncelle();
      toast('Efekt ' + no + '/' + EF.length + ': ' + e[0] + '  (tekrar basın: sıradaki efekt, Ctrl+Z: geri al)');
      var h = $('#hzEfekt'); if (h) h.title = 'Şu an: ' + e[0];
    } catch (er) { hata(er); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('#hzDip,#hzEfekt') : null; if (!b) return;
    if (S.tab !== 'manuel') sekme('manuel');
    if (b.id === 'hzDip') dipTemizle(); else efektDegistir();
  });

  /* ---------- Yapay zeka modu (ücretli) ---------- */
  var YZ = { mesajlar: [], mesgul: false, tur: 'reklam' };
  var YZ_AD = { reklam: 'Reklam metni', jingle: 'Jingle sözü', santral: 'Santral anonsu' };
  var YZ_ONERI = {
    reklam: ['30 saniyelik spot yaz', '20 saniyelik spot yaz', 'Daha kısa yap', 'Daha samimi ve daha kısa yap'],
    jingle: ['15 saniyelik jingle sözü yaz', 'Daha neşeli ve ritimli yap', 'Daha kısa yap'],
    santral: ['Karşılama anonsu yaz', 'Mesai dışı anonsu yaz', 'Bekleme anonsu yaz', 'Daha kısa yap']
  };
  function yzSonMetin() { var g = ($('#yzGirdi').value || '').trim(); if (g) return g; for (var i = YZ.mesajlar.length - 1; i >= 0; i--) if (YZ.mesajlar[i].r === 'ai' && !YZ.mesajlar[i].hata) return YZ.mesajlar[i].t; return ''; }

  async function yzDurum() {
    var o = null; try { o = await Veri.oturum(); } catch (e) {}
    var acik = !!o && (o.role === 'admin' || Veri.isPro(o.plan));
    $('#yzKilit').style.display = acik ? 'none' : 'flex'; $('#yzSohbet').style.display = acik ? 'flex' : 'none';
  }
  function yzCiz() {
    $$('#yzTurler button').forEach(function (b) { b.classList.toggle('acik', b.dataset.yzt === YZ.tur); });
    $('#yzOneri').innerHTML = (YZ.tur !== 'jingle' ? '<button class="chip yzVurgu" data-yz="jingleSon">Bu metni jingle’a çevir</button>' : '') + '<button class="chip yzVurgu" data-yz="jingleYapSon">Bu metinle bana jingle yap</button>' + YZ_ONERI[YZ.tur].map(function (t) { return '<button class="chip" data-yz="oneri">' + esc(t) + '</button>'; }).join('');
    var k = $('#yzMesajlar'); if (!YZ.mesajlar.length) { k.innerHTML = '<div class="yzBos"><b>Ne hazırlamak istiyorsunuz?</b><span>Üstten türü seçin, aşağıya isteğinizi yazın. Yazdığım reklam metnini tek tuşla jingle’a çevirebilirim; jingle’ı siz seslendirtmeden “Bana jingle yap” diyerek bize sipariş edebilirsiniz.</span></div>'; return; }
    k.innerHTML = YZ.mesajlar.map(function (m, i) {
      var ek = '';
      if (m.r === 'ai' && !m.hata) {
        ek = '<div class="yzEylem"><button class="btn kucuk" data-yz="kopya" data-i="' + i + '">Kopyala</button>';
        if (m.tur !== 'jingle') ek += '<button class="btn kucuk yzVurgu" data-yz="jingleCevir" data-i="' + i + '">Jingle’a çevir</button>';
        ek += '<button class="btn kucuk" data-yz="jingleYap" data-i="' + i + '">Bu metinle bana jingle yap</button><button class="btn kucuk" data-yz="aktar" data-i="' + i + '">Bize gönder’e aktar</button></div>';
      }
      return '<div class="yzM ' + m.r + '">' + (m.tur && m.r === 'ben' ? '<small class="yzEtiket">' + esc(YZ_AD[m.tur]) + '</small>' : '') + '<div class="yzBalon">' + esc(m.t).replace(/\n/g, '<br>') + '</div>' + ek + '</div>';
    }).join('');
    k.scrollTop = k.scrollHeight;
  }
  async function yzGonder(metin, tur) {
    metin = (metin || '').trim(); if (!metin || YZ.mesgul) return; tur = tur || YZ.tur; YZ.mesgul = true; YZ.mesajlar.push({ r: 'ben', t: metin, tur: tur }); $('#yzGirdi').value = ''; yzCiz();
    YZ.mesajlar.push({ r: 'ai', t: 'Düşünüyorum…', hata: true }); yzCiz();
    try {
      var c = await Veri.yzSor(YZ.mesajlar.filter(function (m) { return !m.hata; }).map(function (m) { return { role: m.r === 'ben' ? 'user' : 'assistant', content: m.r === 'ben' ? '[' + YZ_AD[m.tur || tur] + '] ' + m.t : m.t }; }), tur);
      YZ.mesajlar[YZ.mesajlar.length - 1] = { r: 'ai', t: c, tur: tur };
    }
    catch (e) { YZ.mesajlar[YZ.mesajlar.length - 1] = { r: 'ai', t: e.message || 'Yanıt alınamadı.', hata: true }; }
    YZ.mesgul = false; yzCiz();
  }
  $('#yzGonder').onclick = function () { yzGonder($('#yzGirdi').value); };
  $('#yzGirdi').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); yzGonder($('#yzGirdi').value); } });
  $('#yzTurler').addEventListener('click', function (e) { var b = e.target.closest('[data-yzt]'); if (!b) return; YZ.tur = b.dataset.yzt; yzCiz(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-yz]') : null; if (!b) return;
    var m = YZ.mesajlar[+b.dataset.i], v = b.dataset.yz;
    if (v === 'jingleSon') { var t1 = yzSonMetin(); if (!t1) return toast('Önce bir metin yazdırın ya da kutuya metninizi yapıştırın'); YZ.tur = 'jingle'; yzGonder('Bu metni kısa, akılda kalıcı ve ritimli bir jingle sözüne çevir (kıta ve nakarat olsun):\n\n' + t1, 'jingle'); return; }
    if (v === 'jingleYapSon') { var t2 = yzSonMetin(); if (!t2) return toast('Önce bir metin yazdırın ya da kutuya metninizi yapıştırın'); $('#bizeMetin').value = t2; $('#bTur').value = 'Jingle'; if ($('#bNot') && !$('#bNot').value) $('#bNot').value = 'Jingle siparişi: bu sözlerle jingle yapılsın'; sekme('bize'); toast('Metin “Bize gönder” sayfasına aktarıldı. Jingle olarak işaretlendi.'); return; }
    if (v === 'oneri') yzGonder(b.textContent);
    else if (v === 'kopya') { try { navigator.clipboard.writeText(m.t); toast('Kopyalandı'); } catch (x) { toast('Kopyalanamadı'); } }
    else if (v === 'jingleCevir') { YZ.tur = 'jingle'; yzGonder('Bu metni kısa, akılda kalıcı ve ritimli bir jingle sözüne çevir (kıta ve nakarat olsun):\n\n' + m.t, 'jingle'); }
    else if (v === 'jingleYap') { $('#bizeMetin').value = m.t; $('#bTur').value = 'Jingle'; if ($('#bNot') && !$('#bNot').value) $('#bNot').value = 'Jingle siparişi: bu sözlerle jingle yapılsın'; sekme('bize'); toast('Metin “Bize gönder” sayfasına aktarıldı. Jingle olarak işaretlendi.'); }
    else if (v === 'aktar') { $('#bizeMetin').value = m.t; sekme('bize'); toast('Metin “Bize gönder” sayfasına aktarıldı'); }
  });
  yzCiz();

  /* Bize gönder: kısayol, giriş yapan üyenin bilgileri, üst çubuktaki Dışa aktar */
  $('#bizeGit').onclick = function () { sekme('bize'); };
  Veri.oturum().then(function (o) { if (!o) return; if (!$('#bAd').value) $('#bAd').value = o.ad || ''; if (!$('#bMail').value) $('#bMail').value = o.email || ''; }).catch(function () {});
  document.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('#ustDisa'))) return;
    if (S.tab === 'oto' && S.sonuc) disaDlg('sonuc'); else if (S.tab === 'bize') toast('Dışa aktarmak için Manuel stüdyoda ya da Otomatik sekmesinde bir ses hazırlayın'); else disaDlg();
  });
  /* Sayfadan ayrılırken (Panelim, Çıkış, logo…) kaydedilmemiş her pencereyi tek tek sor */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('header a[href], #cikisBtn, a[href="panel"]') : null; if (!el || e.__onayli) return;
    var kirli = S.pen.filter(function (p) { return p.kirli && !p.kayitta; }); if (!kirli.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var l = kirli.slice(); (function ilk() { var p = l.shift(); if (!p) { el.click(); return; } kapatSor(p, function (devam) { if (devam) ilk(); }); })();
  }, true);
  window.addEventListener('beforeunload', function (e) { if (S.pen.some(function (p) { return p.kirli; })) { e.preventDefault(); e.returnValue = ''; } });

  hedefUygula(); otoListeleri(); guncelle(); bankaYukle();
  if (window.matchMedia && window.matchMedia('(max-width:820px)').matches) sekme('oto'); /* telefonda önce otomatik kurgu */
})();
