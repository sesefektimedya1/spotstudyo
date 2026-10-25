/* Stüdyo arayüzü */
(async function () {
  'use strict';
  var oturum = await korumali('studyo'); if (!oturum) return;
  var SR = Motor.SR, ctx = null;
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR }); if (ctx.state === 'suspended') ctx.resume(); return ctx; }

  var S = {
    ses: null, undo: [], redo: [], muzik: null, muzikAd: '', z: Motor.varsayilanZincir(), sonuc: null, kirli: true,
    sec: null, msec: null, aktif: 'ses', imlec: 0, bas: 0, spp: 100, tarzNo: -1, oynuyor: null, oynBas: 0, oynKaynak: '', mesgul: false
  };
  var cv = { ses: $('#cSes'), muzik: $('#cMuzik'), sonuc: $('#cSonuc') };

  function mesaj(m) { $('#dMesaj').textContent = m || ''; }
  function bekle() { return new Promise(function (r) { setTimeout(r, 30); }); }
  function sn(x) { var m = Math.floor(x / 60), s = x - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function hata(e) { console.error(e); toast(e && e.message ? e.message : String(e)); }

  /* ---------- Dosya okuma ---------- */
  async function coz(ab) { var b = await ac().decodeAudioData(ab); return b; }
  function tekKanal(b) {
    var n = b.length, o = new Float32Array(n), c = b.numberOfChannels, i, k;
    for (k = 0; k < c; k++) { var d = b.getChannelData(k); for (i = 0; i < n; i++) o[i] += d[i] / c; }
    return o;
  }
  async function sesYukle(file) {
    try { mesaj('Okunuyor…'); var b = await coz(await file.arrayBuffer()); setSes(tekKanal(b), 'Yüklendi'); S.dosyaAd = file.name; }
    catch (e) { hata(new Error('Bu dosya okunamadı. MP3, WAV veya M4A deneyin.')); }
    mesaj('');
  }
  async function muzikYukle(file, ad) {
    try { var b = await coz(await file.arrayBuffer()); setMuzik(b, ad || file.name); } catch (e) { hata(new Error('Müzik dosyası okunamadı.')); }
  }
  function ozelSec(ad) { var m = $('#muzikSec'), o = $('#ozelMuzik'); if (!o) { o = document.createElement('option'); o.id = 'ozelMuzik'; o.value = 'ozel'; m.appendChild(o); } o.textContent = 'Kendi müziğim: ' + String(ad).slice(0, 18); }
  function setMuzik(b, ad) {
    var L = b.getChannelData(0).slice(), R = (b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice();
    S.muzik = { L: L, R: R }; S.muzikAd = ad; ozelSec(ad); S.kirli = true; guncelle();
  }
  function setSes(x, not) {
    S.ses = x; S.undo = []; S.redo = []; S.sec = null; S.imlec = 0; S.bas = 0; S.kirli = true; S.sonuc = null; tumuGoster(); guncelle(); if (not) toast(not);
  }
  function mevcut(k) { return k === 'ses' ? S.ses : S.muzik; }
  function yaz(k, v) { if (k === 'ses') { S.ses = v; S.sec = null; } else { S.muzik = v; S.msec = null; if (!v) { S.muzikAd = ''; var o = $('#ozelMuzik'); if (o) o.remove(); $('#muzikSec').value = ''; } } S.kirli = true; S.sonuc = null; }
  function degistirK(k, yeni) { S.undo.push({ k: k, v: mevcut(k) }); if (S.undo.length > 30) S.undo.shift(); S.redo = []; yaz(k, yeni); guncelle(); }
  function degistir(y) { degistirK('ses', y); }

  /* ---------- Görünüm ---------- */
  function tumuGoster() {
    var w = cv.ses.clientWidth || 800, n = (S.ses && S.ses.length) || (S.sonuc && S.sonuc.L.length) || SR * 10;
    S.bas = 0; S.spp = Math.max(1, n / w);
  }
  function boyutla(c) { var r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); } return d; }
  function ciz(c, dizi, renk, secim, imlec) {
    var d = boyutla(c), g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H);
    g.fillStyle = '#14171a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#272c32'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    if (secim) { g.fillStyle = 'rgba(200,162,76,.22)'; var a = (secim[0] - S.bas) / S.spp * d, b = (secim[1] - S.bas) / S.spp * d; g.fillRect(a, 0, Math.max(1, b - a), H); }
    if (dizi && dizi.length) {
      var piks = Math.max(1, Math.floor(W / d)), bas = Math.max(0, Math.floor(S.bas)), son = Math.min(dizi.length, Math.floor(S.bas + piks * S.spp));
      if (son > bas) {
        var alt = dizi.subarray(bas, son), adet = Math.min(piks, Math.ceil(alt.length / Math.max(1, S.spp))), p = Motor.tepeler(alt, Math.max(1, adet)), gen = (alt.length / S.spp) / adet * d;
        g.fillStyle = renk;
        for (var i = 0; i < adet; i++) { var y1 = H / 2 - p[2 * i + 1] * H * 0.46, y2 = H / 2 - p[2 * i] * H * 0.46; g.fillRect(i * gen, y1, Math.max(1, gen), Math.max(1, y2 - y1)); }
      }
    }
    if (imlec != null) { var x = (imlec - S.bas) / S.spp * d; if (x >= 0 && x <= W) { g.fillStyle = '#e9e4d8'; g.fillRect(x, 0, Math.max(1, d), H); } }
  }
  function yenile() {
    var sonucL = S.sonuc ? S.sonuc.L : null, im = S.oynuyor ? S.imlecCal : S.imlec;
    ciz(cv.ses, S.ses, '#c8a24c', S.sec, S.oynKaynak === 'ses' || !S.oynuyor ? im : null);
    var mono = S.muzik ? S.muzik.L : null;
    ciz(cv.muzik, mono, '#4f9aa0', S.msec, null);
    ciz(cv.sonuc, sonucL, '#e9e4d8', null, S.oynKaynak === 'sonuc' ? im : null);
    $$('.serit').forEach(function (e) { e.classList.remove('aktif'); }); var ak = $('.serit.' + S.aktif); if (ak) ak.classList.add('aktif');
    $('#bosSes').style.display = S.ses ? 'none' : 'flex';
    $('#bosMuzik').style.display = S.muzik ? 'none' : 'flex';
    $('#bosSonuc').style.display = S.sonuc ? 'none' : 'flex';
  }
  function guncelle() {
    var st = S.ses ? Motor.istatistik(S.ses, SR) : null;
    $('#sesBilgi').innerHTML = st ? sn(st.sure) + '<br>tepe ' + st.tepeDb.toFixed(1) + ' dB' : 'Boş';
    $('#muzikBilgi').textContent = S.muzik ? S.muzikAd.slice(0, 22) + ' · ' + sn(S.muzik.L.length / SR) : 'Seçilmedi';
    $('#sonucBilgi').innerHTML = S.sonuc ? sn(S.sonuc.sure) + '<br>' + S.sonuc.lufs.toFixed(1) + ' LUFS' : (S.kirli ? 'Hazırlanmadı' : '');
    $('#dSes').textContent = st ? sn(st.sure) + ' · zemin ' + st.zeminDb.toFixed(0) + ' dB · konuşma ' + st.konusmaDb.toFixed(0) + ' dB' : '—';
    $('#dSonuc').textContent = S.sonuc ? S.sonuc.lufs.toFixed(1) + ' LUFS · tepe ' + S.sonuc.tepeDb.toFixed(1) + ' dB' : '—';
    var sc = aktifSec(); $('#dSecim').textContent = (S.aktif === 'muzik' ? 'Müzik: ' : 'Ses: ') + (sc ? sn(sc[0] / SR) + ' – ' + sn(sc[1] / SR) + ' (' + ((sc[1] - sc[0]) / SR).toFixed(2) + ' sn)' : 'yok');
    $('#zaman').textContent = sn((S.oynuyor ? S.imlecCal : S.imlec) / SR);
    yenile();
  }

  /* ---------- Seçim / imleç ---------- */
  function x2s(c, ev) { var r = c.getBoundingClientRect(); return Math.max(0, Math.round(S.bas + (ev.clientX - r.left) * S.spp)); }
  function aktifSec() { return S.aktif === 'muzik' ? S.msec : S.sec; }
  function aktifDizi() { return S.aktif === 'muzik' ? (S.muzik && S.muzik.L) : S.ses; }
  function seritBagla(ad) {
    var c = cv[ad], surukle = false, mod = 'yeni', sabit = 0;
    function dizi() { return ad === 'ses' ? S.ses : (S.muzik && S.muzik.L); }
    function getSec() { return ad === 'ses' ? S.sec : S.msec; }
    function setSec(v) { if (ad === 'ses') S.sec = v; else S.msec = v; }
    c.addEventListener('mousedown', function (e) {
      var d = dizi(); S.aktif = ad; if (!d) { guncelle(); return; }
      var s2 = Math.min(x2s(c, e), d.length), sc = getSec(), tol = 6 * S.spp;
      if (sc && Math.abs(s2 - sc[0]) <= tol) { mod = 'kenar'; sabit = sc[1]; }
      else if (sc && Math.abs(s2 - sc[1]) <= tol) { mod = 'kenar'; sabit = sc[0]; }
      else { mod = 'yeni'; sabit = s2; if (ad === 'ses') S.imlec = s2; setSec(null); }
      surukle = true; guncelle();
    });
    window.addEventListener('mousemove', function (e) {
      if (!surukle || S.aktif !== ad) return; var d = dizi(); if (!d) return; var s2 = Math.min(x2s(c, e), d.length);
      if (mod === 'kenar' || Math.abs(s2 - sabit) > S.spp * 3) { setSec([Math.min(s2, sabit), Math.max(s2, sabit)]); guncelle(); }
    });
    window.addEventListener('mouseup', function () { surukle = false; });
    tekerBagla(c);
  }
  function tekerBagla(c) {
    c.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { S.bas = Math.max(0, S.bas + (e.deltaX || e.deltaY) * S.spp); guncelle(); }
      else zoom(e.deltaY < 0 ? 0.8 : 1.25, x2s(c, e));
    }, { passive: false });
  }
  seritBagla('ses'); seritBagla('muzik');
  cv.sonuc.addEventListener('mousedown', function () { S.aktif = 'sonuc'; guncelle(); });
  tekerBagla(cv.sonuc);
  window.addEventListener('resize', function () { guncelle(); });
  function zoom(k, odak) {
    var n = (S.ses && S.ses.length) || (S.sonuc && S.sonuc.L.length) || SR * 10, w = cv.ses.clientWidth || 800;
    odak = odak == null ? S.bas + w * S.spp / 2 : odak; var yeni = Math.max(0.05, Math.min(n / w * 1.05, S.spp * k));
    S.bas = Math.max(0, odak - (odak - S.bas) * (yeni / S.spp)); S.spp = yeni; if (S.bas > n) S.bas = 0; guncelle();
  }
  $('#yakin').onclick = function () { zoom(0.6); }; $('#uzak').onclick = function () { zoom(1.6); }; $('#tumu').onclick = function () { tumuGoster(); guncelle(); };

  /* ---------- Çalma ---------- */
  function durdur() { if (S.oynuyor) { try { S.oynuyor.onended = null; S.oynuyor.stop(); } catch (e) {} S.oynuyor = null; } $('#oynatBtn').textContent = '▶ Oynat'; guncelle(); }
  function cal(L, R, baslaSample, bitisSample, kaynak) {
    durdur(); var c = ac(), bas = baslaSample || 0, son = bitisSample || L.length;
    if (son - bas < 100) { bas = 0; son = L.length; }
    var b = c.createBuffer(2, son - bas, SR); b.getChannelData(0).set(L.subarray(bas, son)); b.getChannelData(1).set((R || L).subarray(bas, son));
    var s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); var t0 = c.currentTime + 0.03; s.start(t0);
    S.oynuyor = s; S.oynKaynak = kaynak; S.imlecCal = bas; $('#oynatBtn').textContent = '■ Durdur';
    s.onended = function () { if (S.oynuyor === s) { S.oynuyor = null; $('#oynatBtn').textContent = '▶ Oynat'; S.imlec = kaynak === 'ses' ? bas : S.imlec; guncelle(); } };
    (function raf() { if (S.oynuyor !== s) return; S.imlecCal = bas + Math.max(0, (c.currentTime - t0)) * SR; guncelle(); requestAnimationFrame(raf); })();
  }
  function oynatSes() {
    if (!S.ses) return toast('Önce bir ses kaydedin ya da yükleyin');
    var a = S.sec ? S.sec[0] : S.imlec, b = S.sec ? S.sec[1] : S.ses.length; cal(S.ses, S.ses, a, b, 'ses');
  }
  async function oynatSonuc() {
    var ok = await uret(); if (!ok) return; cal(S.sonuc.L, S.sonuc.R, 0, 0, 'sonuc');
  }
  function oynatMuzik() { if (!S.muzik) return toast('Müzik seçilmedi'); var sc = S.msec; cal(S.muzik.L, S.muzik.R, sc ? sc[0] : 0, sc ? sc[1] : 0, 'muzik'); }
  function oynatToggle() { if (S.oynuyor) return durdur(); if (S.sonuc && !S.kirli && S.sonImlec != null && false) return; (S.sonuc && !S.kirli) ? cal(S.sonuc.L, S.sonuc.R, 0, 0, 'sonuc') : oynatSes(); }
  $('#oynatBtn').onclick = oynatToggle;
  $('#basaBtn').onclick = function () { durdur(); S.imlec = 0; S.sec = null; S.bas = 0; guncelle(); };

  /* ---------- Üretim ---------- */
  async function uret() {
    if (!S.ses) { toast('Önce bir ses kaydedin ya da yükleyin'); return false; }
    if (S.sonuc && !S.kirli) return true;
    if (S.mesgul) return false; S.mesgul = true; mesaj('Hazırlanıyor…'); await bekle();
    try { S.sonuc = Motor.uret(S.ses, SR, S.muzik, S.z); S.kirli = false; }
    catch (e) { hata(e); S.mesgul = false; mesaj(''); return false; }
    S.mesgul = false; mesaj(''); tumuGoster(); guncelle(); return true;
  }

  /* ---------- Otomatik ---------- */
  function hedefUygula() { var h = $('#hedef').value, t = Motor.SEVIYE[h]; S.z.seviye = { tur: h, hedef: t.hedef, tavan: t.tavan }; $('#indirBtn').textContent = h === 'santral' ? 'WAV indir (santral)' : 'MP3 indir'; }
  $('#hedef').onchange = function () { hedefUygula(); S.kirli = true; S.sonuc = null; guncelle(); };
  async function oto(yeniden) {
    if (!S.ses) return toast('Önce bir ses kaydedin ya da yükleyin');
    var iz = S.z.gurultu.iz; S.tarzNo = yeniden ? S.tarzNo + 1 : 0; var T = Motor.TARZ[S.tarzNo % Motor.TARZ.length];
    S.z = Motor.tarzUygula(S.z, T); S.z.gurultu.iz = iz;
    if (S.tarzNo >= Motor.TARZ.length) { var j = function (a) { return (Math.random() - 0.5) * 2 * a; }; S.z.muzik.altDb += j(1); S.z.muzik.yuksel = Math.max(0, S.z.muzik.yuksel + j(1)); S.z.muzik.giris = Math.max(0.5, S.z.muzik.giris + j(0.5)); }
    hedefUygula(); S.kirli = true; S.sonuc = null;
    $('#tarzAd').textContent = T.ad + (S.tarzNo >= Motor.TARZ.length ? ' (ince ayar)' : '');
    if (!(await uret())) return; cal(S.sonuc.L, S.sonuc.R, 0, 0, 'sonuc');
  }
  $('#otoBtn').onclick = function () { oto(false); }; $('#yenidenBtn').onclick = function () { oto(true); };

  /* ---------- Müzik kütüphanesi ---------- */
  var kut = [];
  try { kut = await Veri.liste('muzikler'); } catch (e) { kut = []; }
  kut.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m.ad; $('#muzikSec').appendChild(o); });
  $('#muzikSec').onchange = async function () {
    var v = $('#muzikSec').value; if (v === 'ozel') return; if (v === '') { S.muzik = null; S.kirli = true; S.sonuc = null; guncelle(); return; }
    try { mesaj('Müzik yükleniyor…'); var u = await Veri.url(kut[v], 'muzikler'), r = await fetch(u), b = await coz(await r.arrayBuffer()); setMuzik(b, kut[v].ad); S.sonuc = null; } catch (e) { hata(e); }
    mesaj('');
  };

  /* ---------- Kayıt ---------- */
  var kayit = null, mikId = '';
  async function kayitBasla() {
    if (kayit) return kayitDur();
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Bu tarayıcı kaydı desteklemiyor. Chrome veya Edge kullanın.');
    try {
      var c = ac(), stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: mikId ? { exact: mikId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
      var src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 1024; src.connect(an);
      var rec = new MediaRecorder(stream), parca = []; rec.ondataavailable = function (e) { if (e.data.size) parca.push(e.data); };
      var buf = new Float32Array(1024), alive = true;
      (function olc() { if (!alive) return; an.getFloatTimeDomainData(buf); var m = 0; for (var i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); var db = Motor.toDb(m); $('#metre i').style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%'; requestAnimationFrame(olc); })();
      rec.onstop = async function () {
        alive = false; $('#metre i').style.width = '0'; stream.getTracks().forEach(function (t) { t.stop(); });
        $('#kayitBtn').classList.remove('kayitta'); $('#kayitBtn').textContent = '● Kayıt';
        try { var b = await coz(await new Blob(parca).arrayBuffer()); var x = tekKanal(b);
          if (S.ses && !confirm('Mevcut ses silinip bu kayıt gelsin mi?')) { kayit = null; return; }
          setSes(x, 'Kayıt alındı'); S.dosyaAd = 'kayit'; } catch (e) { hata(new Error('Kayıt çözülemedi.')); }
        kayit = null;
      };
      rec.start(); kayit = rec; $('#kayitBtn').classList.add('kayitta'); $('#kayitBtn').textContent = '■ Kaydı bitir';
    } catch (e) { toast(e.name === 'NotAllowedError' ? 'Mikrofon izni verilmedi. Tarayıcı adres çubuğundan izin verin.' : 'Mikrofon açılamadı: ' + e.message); }
  }
  function kayitDur() { if (kayit && kayit.state !== 'inactive') kayit.stop(); }
  $('#kayitBtn').onclick = kayitBasla;

  /* ---------- İndirme ---------- */
  function indirDosya(blob, ad) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function dosyaAdi() { return ($('#proje').value.trim() || 'Spot').replace(/[^\wÇĞİÖŞÜçğıöşü\- ]+/g, '').replace(/\s+/g, '_'); }
  function santralWav(L, R) {
    var n = L.length, m = new Float32Array(n); for (var i = 0; i < n; i++) m[i] = 0.5 * (L[i] + R[i]);
    var f = Motor.biquadUygula(Motor.biquadUygula(m, Motor.biquadKatsayi('lp', SR, 3600, 0.7071, 0)), Motor.biquadKatsayi('lp', SR, 3600, 0.7071, 0));
    var oran = SR / 8000, k = Math.floor(n / oran), o = new Float32Array(k);
    for (var j = 0; j < k; j++) { var p = j * oran, a = Math.floor(p), t = p - a; o[j] = f[a] * (1 - t) + (f[a + 1] || 0) * t; }
    return Motor.wav16([o], 8000);
  }
  async function indir(tur) {
    if (!(await uret())) return;
    var ad = $('#proje').value.trim() || 'Spot';
    try {
      var r = await Veri.indirmeHakki(ad, tur);
      if (!r.ok) { return bilgi('Aylık indirme hakkınız doldu', '<p>Bu ay ' + r.limit + ' indirme hakkınızı kullandınız. Yeni ay başında hak yenilenir. Hemen devam etmek için Premium üyeliğe geçebilirsiniz; yönetimle iletişime geçin.</p><p class="sol">Hazırlamayı ve dinlemeyi sınırsız sürdürebilirsiniz.</p>'); }
      mesaj('Dosya hazırlanıyor…'); await bekle();
      var s = S.sonuc;
      if (tur === 'mp3') { var p = Motor.mp3Kodla(s.L, s.R, SR, 192); indirDosya(new Blob(p, { type: 'audio/mpeg' }), dosyaAdi() + '.mp3'); }
      else if (tur === 'wav') indirDosya(new Blob([Motor.wav16([s.L, s.R], SR)], { type: 'audio/wav' }), dosyaAdi() + '.wav');
      else indirDosya(new Blob([santralWav(s.L, s.R)], { type: 'audio/wav' }), dosyaAdi() + '_santral.wav');
      mesaj(''); toast('İndirildi · Bu ay ' + r.kullanilan + (r.limit > 0 ? ' / ' + r.limit : '') + ' indirme');
      ustYenile();
    } catch (e) { mesaj(''); hata(e); }
  }
  async function ustYenile() { var u = $('.kota'); if (u) { var d = await Veri.hakDurumu(); u.textContent = 'Bu ay ' + d.kullanilan + ' / ' + (d.limit > 0 ? d.limit : '∞') + ' indirme'; } }
  $('#indirBtn').onclick = function () { indir($('#hedef').value === 'santral' ? 'santral' : 'mp3'); };

  /* ---------- Pencereler ---------- */
  function bilgi(baslik, html) {
    var p = document.createElement('div'); p.className = 'perde'; p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true"><h3>' + esc(baslik) + '</h3><div class="govde">' + html + '</div><div class="alt"><button class="btn ana">Tamam</button></div></div>';
    document.body.appendChild(p); p.querySelector('button').onclick = function () { p.remove(); }; p.querySelector('button').focus();
  }
  // alan: {k, ad, tur:'slider'|'sec'|'onay', min,max,step,birim, sec:[[deger,ad]]}
  function diyalog(baslik, alanlar, deger, o) {
    o = o || {}; var d = JSON.parse(JSON.stringify(deger, function (k, v) { return k === 'iz' ? undefined : v; })); if (deger.iz) d.iz = deger.iz;
    var p = document.createElement('div'); p.className = 'perde';
    var h = '<div class="pencere" role="dialog" aria-modal="true"><h3>' + esc(baslik) + '</h3><div class="govde">';
    if (o.onayarlar) h += '<div class="sat"><label style="margin:0">Ön ayar</label><select id="dg-on" style="grid-column:2/4">' + o.onayarlar.map(function (a) { return '<option value="' + a[0] + '">' + esc(a[1]) + '</option>'; }).join('') + '</select></div>';
    alanlar.forEach(function (a) {
      if (a.tur === 'onay') h += '<label style="color:var(--yazi);margin:0"><input type="checkbox" data-k="' + a.k + '"> ' + esc(a.ad) + '</label>';
      else if (a.tur === 'sec') h += '<div class="sat"><label style="margin:0">' + esc(a.ad) + '</label><select data-k="' + a.k + '" style="grid-column:2/4">' + a.sec.map(function (s) { return '<option value="' + s[0] + '">' + esc(s[1]) + '</option>'; }).join('') + '</select></div>';
      else h += '<div class="sat"><label style="margin:0">' + esc(a.ad) + '</label><input type="range" data-k="' + a.k + '" min="' + a.min + '" max="' + a.max + '" step="' + a.step + '"><output></output></div>';
    });
    if (o.ekHtml) h += o.ekHtml;
    h += '</div><div class="alt">' + (o.iz ? '<button class="btn sol-b" id="dg-iz">Gürültü izi al (seçimden)</button>' : '') + '<button class="btn" id="dg-on-izle">Önizleme</button><button class="btn" id="dg-iptal">İptal</button><button class="btn ana" id="dg-tamam">Tamam</button></div></div>';
    p.innerHTML = h; document.body.appendChild(p);
    function oku() { $$('[data-k]', p).forEach(function (el) { var k = el.dataset.k; var v = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? +el.value : el.value); d[k] = v; }); }
    function yaz() {
      $$('[data-k]', p).forEach(function (el) { var v = d[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else if (v != null) el.value = v; var out = el.parentNode.querySelector('output'); if (out && el.type === 'range') out.textContent = (+el.value) + (alanlar.filter(function (a) { return a.k === el.dataset.k; })[0].birim || ''); });
    }
    yaz();
    p.addEventListener('input', function (e) { if (e.target.id === 'dg-on') return; oku(); yaz(); });
    p.addEventListener('change', function (e) { if (e.target.id === 'dg-on') { o.onayUygula(e.target.value, d); yaz(); if (o.yenidenCiz) { p.remove(); } } });
    if (o.onayarSec) $('#dg-on', p).value = o.onayarSec;
    $('#dg-iptal', p).onclick = function () { durdur(); p.remove(); };
    $('#dg-tamam', p).onclick = function () { oku(); durdur(); p.remove(); o.tamam(d); };
    $('#dg-on-izle', p).onclick = function () { oku(); onizle(o.onizleZ ? o.onizleZ(d) : null); };
    if (o.iz) $('#dg-iz', p).onclick = function () {
      if (!S.ses || !S.sec || S.sec[1] - S.sec[0] < 2048) return toast('Önce ses üzerinde yalnızca gürültü olan bir yeri (en az 0,1 sn) seçin');
      d.iz = S.ses.slice(S.sec[0], S.sec[1]); toast('Gürültü izi alındı (' + ((S.sec[1] - S.sec[0]) / SR).toFixed(1) + ' sn)');
    };
    return p;
  }
  async function onizle(z) {
    if (!S.ses) return toast('Önce bir ses yükleyin'); if (!z) return;
    var a = S.sec ? S.sec[0] : 0, b = S.sec ? S.sec[1] : Math.min(S.ses.length, SR * 12); if (b - a > SR * 20) b = a + SR * 20;
    mesaj('Önizleme…'); await bekle();
    var y = Motor.sesIsle(S.ses.slice(a, b), SR, z), e = Motor.efektUygula(y, SR, z.efekt);
    var pk = Motor.tepeDb([e.L]); var g = Motor.dB(-1 - pk), L = new Float32Array(e.L.length), R = new Float32Array(e.L.length);
    for (var i = 0; i < L.length; i++) { L[i] = e.L[i] * g; R[i] = e.R[i] * g; }
    mesaj(''); cal(L, R, 0, 0, 'onizle');
  }
  function kopyaZ() { var z = JSON.parse(JSON.stringify(S.z, function (k, v) { return k === 'iz' ? undefined : v; })); z.gurultu.iz = S.z.gurultu.iz; return z; }
  function degisti() { S.kirli = true; S.sonuc = null; guncelle(); }

  function gurultuDlg() {
    diyalog('Gürültü azaltma', [{ k: 'aktif', ad: 'Uygula', tur: 'onay' }, { k: 'db', ad: 'Azaltma', tur: 'slider', min: 0, max: 40, step: 1, birim: ' dB' }, { k: 'bias', ad: 'Bias (sertlik)', tur: 'slider', min: -10, max: 10, step: 1, birim: ' dB' }, { k: 'hiz', ad: 'Hız', tur: 'slider', min: 0, max: 100, step: 5, birim: '' }], S.z.gurultu, {
      iz: true, onayarlar: Object.keys(Motor.TEMIZLE).filter(function (k) { return k !== 'kapi' && k !== 'yok'; }).map(function (k) { return [k, Motor.TEMIZLE[k].ad]; }),
      onayUygula: function (k, d) { var g = Motor.TEMIZLE[k].g; Object.assign(d, g); d.aktif = true; },
      onizleZ: function (d) { var z = kopyaZ(); z.gurultu = d; z.kapi.aktif = false; z.ton = { bantlar: [] }; z.kuvvet.aktif = false; z.efekt = { tur: 'yok' }; return z; },
      tamam: function (d) { S.z.gurultu = d; degisti(); }
    });
  }
  function kapiDlg() {
    var v = Object.assign({}, S.z.kapi); v.otoEsik = v.esik == null; if (v.esik == null) v.esik = -50;
    diyalog('Kapı (sessizlikte sesi kıs)', [{ k: 'aktif', ad: 'Uygula', tur: 'onay' }, { k: 'otoEsik', ad: 'Eşiği kendisi bulsun', tur: 'onay' }, { k: 'esik', ad: 'Eşik', tur: 'slider', min: -80, max: -20, step: 1, birim: ' dB' }, { k: 'aralik', ad: 'Kısma miktarı', tur: 'slider', min: 6, max: 60, step: 1, birim: ' dB' }, { k: 'bekle', ad: 'Bekleme', tur: 'slider', min: 0, max: 300, step: 10, birim: ' ms' }, { k: 'ac', ad: 'Açılma', tur: 'slider', min: 2, max: 60, step: 1, birim: ' ms' }, { k: 'kapa', ad: 'Kapanma', tur: 'slider', min: 20, max: 400, step: 10, birim: ' ms' }], v, {
      onizleZ: function (d) { var z = kopyaZ(); z.gurultu.aktif = false; z.kapi = Object.assign({}, d, { esik: d.otoEsik ? null : d.esik }); z.ton = { bantlar: [] }; z.kuvvet.aktif = false; z.efekt = { tur: 'yok' }; return z; },
      tamam: function (d) { d.esik = d.otoEsik ? null : d.esik; delete d.otoEsik; S.z.kapi = d; degisti(); }
    });
  }
  function tonDlg() {
    var d0 = JSON.parse(JSON.stringify(S.z.ton)), p;
    function bantHtml() { return '<div id="bantlar" style="display:grid;gap:.3rem"></div><button class="btn kucuk" id="bantEkle" style="justify-self:start">Bant ekle</button>'; }
    p = diyalog('Ton (EQ)', [], d0, {
      ekHtml: bantHtml(), onayarlar: Object.keys(Motor.TON).map(function (k) { return [k, Motor.TON[k].ad]; }), onayarSec: d0.onayar,
      onayUygula: function (k, d) { d.onayar = k; d.bantlar = JSON.parse(JSON.stringify(Motor.TON[k].bantlar)); d0 = d; bantCiz(); },
      onizleZ: function () { var z = kopyaZ(); z.gurultu.aktif = false; z.kapi.aktif = false; z.ton = d0; z.kuvvet.aktif = false; z.efekt = { tur: 'yok' }; return z; },
      tamam: function () { S.z.ton = d0; degisti(); }
    });
    function bantCiz() {
      var k = $('#bantlar', p), tipler = [['hp', 'Alçak kes'], ['lp', 'Yüksek kes'], ['lowshelf', 'Bas rafı'], ['peak', 'Çan'], ['highshelf', 'Tiz rafı']];
      k.innerHTML = '<div class="bant sol" style="font-size:12px"><span>Tür</span><span>Frekans (Hz)</span><span>Kazanç (dB)</span><span>Genişlik (okt.)</span><span></span></div>' + d0.bantlar.map(function (b, i) {
        return '<div class="bant" data-i="' + i + '"><select>' + tipler.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === b.t ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select><input type="number" value="' + b.f + '" min="20" max="20000"><input type="number" value="' + (b.g || 0) + '" min="-24" max="24" step="0.5"><input type="number" value="' + (b.bw || 1) + '" min="0.1" max="4" step="0.1"><button class="btn kucuk" title="Sil">✕</button></div>';
      }).join('');
    }
    bantCiz();
    p.addEventListener('input', function (e) { var r = e.target.closest('.bant[data-i]'); if (!r) return; var b = d0.bantlar[+r.dataset.i], el = r.querySelectorAll('select,input'); b.t = el[0].value; b.f = +el[1].value || 1000; b.g = +el[2].value || 0; b.bw = +el[3].value || 1; });
    p.addEventListener('click', function (e) { if (e.target.id === 'bantEkle') { d0.bantlar.push({ t: 'peak', f: 1000, g: 0, bw: 1 }); bantCiz(); } else if (e.target.title === 'Sil') { d0.bantlar.splice(+e.target.closest('.bant').dataset.i, 1); bantCiz(); } });
  }
  function kuvvetDlg() {
    diyalog('Kuvvet (kompresör)', [{ k: 'aktif', ad: 'Uygula', tur: 'onay' }, { k: 'esik', ad: 'Eşik', tur: 'slider', min: -40, max: 0, step: 0.5, birim: ' dB' }, { k: 'oran', ad: 'Oran', tur: 'slider', min: 1, max: 12, step: 0.1, birim: ':1' }, { k: 'atak', ad: 'Atak', tur: 'slider', min: 0.5, max: 100, step: 0.5, birim: ' ms' }, { k: 'birak', ad: 'Bırakma', tur: 'slider', min: 20, max: 1000, step: 10, birim: ' ms' }, { k: 'makyaj', ad: 'Çıkış kazancı', tur: 'slider', min: -6, max: 12, step: 0.5, birim: ' dB' }], S.z.kuvvet, {
      onayarlar: Object.keys(Motor.KUVVET).map(function (k) { return [k, Motor.KUVVET[k].ad]; }), onayUygula: function (k, d) { Object.assign(d, Motor.KUVVET[k]); delete d.ad; },
      onizleZ: function (d) { var z = kopyaZ(); z.gurultu.aktif = false; z.kapi.aktif = false; z.ton = { bantlar: [] }; z.kuvvet = d; z.efekt = { tur: 'yok' }; return z; },
      tamam: function (d) { S.z.kuvvet = d; degisti(); }
    });
  }
  function efektDlg() {
    var e = JSON.parse(JSON.stringify(S.z.efekt)), p = diyalog('Efekt', [], e, {
      ekHtml: '<p class="sol" style="font-size:13px">Efekt yalnız konuşmaya uygulanır, müziğe değil.</p>',
      onayarlar: Object.keys(Motor.EFEKT).map(function (k) { return [k, Motor.EFEKT[k].ad]; }), onayarSec: e.onayar || 'yok',
      onayUygula: function (k, d) { var E = Motor.EFEKT[k]; d.tur = E.tur; d.onayar = k; d.p = JSON.parse(JSON.stringify(E.p)); },
      onizleZ: function (d) { var z = kopyaZ(); z.gurultu.aktif = false; z.kapi.aktif = false; z.ton = { bantlar: [] }; z.kuvvet.aktif = false; z.efekt = d; return z; },
      tamam: function (d) { S.z.efekt = d; degisti(); }
    });
  }
  function muzikDlg() {
    diyalog('Müzik karışımı', [{ k: 'altDb', ad: 'Müzik, sesin altında', tur: 'slider', min: 0, max: 30, step: 0.5, birim: ' dB' }, { k: 'yuksel', ad: 'Konuşma yokken yüksel', tur: 'slider', min: 0, max: 12, step: 0.5, birim: ' dB' }, { k: 'giris', ad: 'Ses girişi (müzik önce)', tur: 'slider', min: 0, max: 10, step: 0.5, birim: ' sn' }, { k: 'kuyruk', ad: 'Ses bitince müzik', tur: 'slider', min: 0, max: 10, step: 0.5, birim: ' sn' }, { k: 'cikisFade', ad: 'Kapanış sönümü', tur: 'slider', min: 0, max: 6, step: 0.5, birim: ' sn' }], S.z.muzik, { onizleZ: null, tamam: function (d) { S.z.muzik = Object.assign({}, S.z.muzik, d); degisti(); } });
    var b = $('#dg-on-izle'); if (b) b.style.display = 'none';
  }
  function seviyeDlg() {
    var v = Object.assign({}, S.z.seviye);
    diyalog('Seviye (ses yüksekliği)', [{ k: 'tur', ad: 'Hedef', tur: 'sec', sec: [['radyo', 'Radyo (−11,6 LUFS)'], ['tv', 'Televizyon (−23 LUFS)'], ['santral', 'Santral (−16 LUFS, 8 kHz)'], ['ozel', 'Özel']] }, { k: 'hedef', ad: 'Hedef yükseklik', tur: 'slider', min: -30, max: -6, step: 0.1, birim: ' LUFS' }, { k: 'tavan', ad: 'En yüksek tepe', tur: 'slider', min: -6, max: 0, step: 0.1, birim: ' dB' }], v, {
      tamam: function (d) { if (d.tur !== 'ozel' && Motor.SEVIYE[d.tur] && (d.tur !== S.z.seviye.tur)) { d.hedef = Motor.SEVIYE[d.tur].hedef; d.tavan = Motor.SEVIYE[d.tur].tavan; } S.z.seviye = { tur: d.tur, hedef: +d.hedef, tavan: +d.tavan }; if (Motor.SEVIYE[d.tur]) $('#hedef').value = d.tur; degisti(); }
    });
    var b = $('#dg-on-izle'); if (b) b.style.display = 'none';
  }
  function sayiDlg(baslik, etiket, min, max, adim, ilk, birim, tamam) {
    diyalog(baslik, [{ k: 'v', ad: etiket, tur: 'slider', min: min, max: max, step: adim, birim: birim }], { v: ilk }, { tamam: function (d) { tamam(d.v); } });
    var b = $('#dg-on-izle'); if (b) b.style.display = 'none';
  }

  /* ---------- Düzenleme ---------- */
  var AD = { ses: 'ses', muzik: 'müzik' };
  function sonucKilit() { if (S.aktif === 'sonuc') { toast('Sonuç şeridi düzenlenemez. SES ya da MÜZİK şeridini seçin'); return true; } return false; }
  function dizideMi() { if (sonucKilit()) return false; if (!aktifDizi()) { toast(S.aktif === 'muzik' ? 'Önce bir müzik seçin' : 'Önce bir ses kaydedin ya da yükleyin'); return false; } return true; }
  function secimVar() { if (!dizideMi()) return false; if (!aktifSec()) { toast('Önce ' + AD[S.aktif] + ' şeridinde fareyle bir bölüm seçin'); return false; } return true; }
  function uygula(fn) {
    var k = S.aktif, d = aktifDizi(), sc = aktifSec(), a = sc ? sc[0] : 0, b = sc ? sc[1] : d.length;
    if (k === 'ses') degistirK('ses', fn(S.ses, a, b)); else degistirK('muzik', { L: fn(S.muzik.L, a, b), R: fn(S.muzik.R, a, b) });
  }
  function seciliUygula(fn) { if (!secimVar()) return; uygula(fn); }
  var islem = {
    kirp: function () { if (!secimVar()) return; uygula(function (x, a, b) { return Motor.kirp(x, a, b); }); S.imlec = 0; tumuGoster(); guncelle(); },
    sil: function () { if (!secimVar()) return; var a = aktifSec()[0]; uygula(function (x, a2, b) { return Motor.sil(x, a2, b); }); if (S.aktif === 'ses') S.imlec = a; guncelle(); },
    sessiz: function () { seciliUygula(function (x, a, b) { return Motor.sessizYap(x, a, b); }); },
    giris: function () { seciliUygula(function (x, a, b) { return Motor.fade(x, a, b, 'giris'); }); },
    cikis: function () { seciliUygula(function (x, a, b) { return Motor.fade(x, a, b, 'cikis'); }); },
    sessizlikEkle: function () {
      if (!dizideMi()) return;
      sayiDlg('Sessizlik ekle', 'Süre', 0.1, 5, 0.1, 0.5, ' sn', function (v) {
        var sc = aktifSec(), pos = sc ? sc[0] : (S.aktif === 'ses' ? S.imlec : 0), n = Math.round(v * SR);
        uygula(function (x) { return Motor.sessizlikEkle(x, pos, n); });
      });
    },
    kazanc: function () { if (!dizideMi()) return; sayiDlg('Kazanç (seçim yoksa tümü)', 'Seviye', -24, 24, 0.5, 0, ' dB', function (v) { uygula(function (x, a, b) { return Motor.kazan(x, a, b, v); }); }); },
    kazancHizli: function (db) { if (!dizideMi()) return; uygula(function (x, a, b) { return Motor.kazan(x, a, b, db); }); toast((db > 0 ? '+' : '') + db + ' dB'); },
    normal: function () { if (!dizideMi()) return; uygula(function (x) { return Motor.normallestir(x, -1); }); toast('Tepe −1 dB’e getirildi'); },
    dc: function () { if (!dizideMi()) return; uygula(function (x) { return Motor.dcSil(x); }); },
    tumu: function () { if (!dizideMi()) return; var n = aktifDizi().length; if (S.aktif === 'ses') S.sec = [0, n]; else S.msec = [0, n]; guncelle(); },
    kaldir: function () {
      if (sonucKilit()) return;
      if (!aktifDizi()) return toast('Kaldırılacak ' + AD[S.aktif] + ' yok');
      durdur(); var k = S.aktif; degistirK(k, null); if (k === 'ses') { S.imlec = 0; tumuGoster(); } guncelle(); toast(AD[k][0].toUpperCase() + AD[k].slice(1) + ' kaldırıldı. Geri almak için Ctrl+Z');
    },
    geri: function () { if (!S.undo.length) return; var e = S.undo.pop(); S.redo.push({ k: e.k, v: mevcut(e.k) }); yaz(e.k, e.v); if (e.k === 'muzik' && e.v) { ozelSec(S.muzikAd || 'Müzik'); $('#muzikSec').value = 'ozel'; } guncelle(); },
    yinele: function () { if (!S.redo.length) return; var e = S.redo.pop(); S.undo.push({ k: e.k, v: mevcut(e.k) }); yaz(e.k, e.v); guncelle(); }
  };
  function aracDugmeleri() {
    $$('[data-i]').forEach(function (b) { b.onclick = function () { islem[b.dataset.i](); }; });
    $$('[data-kaldir]').forEach(function (b) { b.onclick = function () { S.aktif = b.dataset.kaldir; islem.kaldir(); }; });
    $$('[data-db]').forEach(function (b) { b.onclick = function () { islem.kazancHizli(+b.dataset.db); }; });
  }

  /* ---------- Menüler ---------- */
  var M = [
    ['Dosya', [['Ses aç…', 'Ctrl+O', function () { $('#dosyaSes').click(); }], ['Müzik aç…', '', function () { $('#dosyaMuzik').click(); }], '-', ['MP3 indir', 'Ctrl+S', function () { indir('mp3'); }], ['WAV indir', '', function () { indir('wav'); }], ['Santral WAV indir (8 kHz)', '', function () { indir('santral'); }], '-', ['Sesi kaldır (seçili şerit)', 'Ctrl+K', islem.kaldir], '-', ['Panelime dön', '', function () { location.href = 'panel.html'; }]]],
    ['Düzen', [['Geri al', 'Ctrl+Z', islem.geri], ['Yinele', 'Ctrl+Y', islem.yinele], '-', ['Tümünü seç', 'Ctrl+A', islem.tumu], ['Seçimi sil', 'Delete / Backspace', islem.sil], ['Yalnız seçimi tut (kırp)', 'Ctrl+T', islem.kirp], ['Sessizlik ekle…', '', islem.sessizlikEkle]]],
    ['Görünüm', [['Yakınlaştır (fare tekerleği)', '', function () { zoom(0.6); }], ['Uzaklaştır', '', function () { zoom(1.6); }], ['Tümünü göster', '', function () { tumuGoster(); guncelle(); }]]],
    ['Ekle', [['Seçimi sessiz yap', '', islem.sessiz], ['Sessizlik ekle…', '', islem.sessizlikEkle]]],
    ['Aktarım', [['Oynat / Durdur', 'Boşluk', oynatToggle], ['Sesi dinle', '', oynatSes], ['Müziği dinle', '', oynatMuzik], ['Sonucu dinle', '', oynatSonuc], ['Başa dön', '', function () { $('#basaBtn').click(); }], '-', ['Kayıt başlat / bitir', 'Ctrl+R', kayitBasla]]],
    ['İşlem', [['Kazanç…', '', islem.kazanc], ['Kazanç +1 dB', '', function () { islem.kazancHizli(1); }], ['Kazanç −1 dB', '', function () { islem.kazancHizli(-1); }], ['Seçimi sessiz yap', '', islem.sessiz], ['Yumuşak giriş (fade in)', '', islem.giris], ['Yumuşak çıkış (fade out)', '', islem.cikis], ['Normalleştir (tepe −1 dB)', '', islem.normal], ['DC kaymasını kaldır', '', islem.dc]]],
    ['Efektler', [['Gürültü azaltma…', '', gurultuDlg], ['Kapı…', '', kapiDlg], ['Ton (EQ)…', '', tonDlg], ['Kuvvet (kompresör)…', '', kuvvetDlg], ['Efekt (yankı, telefon, robot)…', '', efektDlg]]],
    ['Araçlar', [['Müzik karışımı…', '', muzikDlg], ['Seviye (radyo / TV / santral)…', '', seviyeDlg], ['Sonucu hazırla', '', function () { uret(); }]]],
    ['Seçenekler', [['Mikrofon seç…', '', mikSec]]],
    ['Yardım', [['Kısayollar', '', function () { bilgi('Kısayollar', '<p>Boşluk: oynat / durdur<br>Ctrl+Z / Ctrl+Y: geri al / yinele<br>Ctrl+A: tümünü seç<br>Delete: seçimi sil<br>Ctrl+T: yalnız seçimi tut<br>Ctrl+O: ses aç<br>Ctrl+R: kayıt<br>Ctrl+S: MP3 indir<br>Ctrl + fare tekerleği: yakınlaştır</p>'); }], ['Nasıl çalışır?', '', function () { bilgi('Nasıl çalışır?', '<p>1. Sesinizi kaydedin ya da yükleyin.<br>2. Müzik seçin (isteğe bağlı).<br>3. “Otomatik hazırla”ya basın. Beğenmezseniz “Yeniden dene”.<br>4. İnce ayar için Efektler ve Araçlar menülerini kullanın.<br>5. Hazırsa MP3 indirin.</p><p class="sol">Dinleme ve denemeler sınırsızdır; yalnız indirme sayılır.</p>'); }]]]
  ];
  var mm = $('#menu');
  M.forEach(function (g) {
    var d = document.createElement('div'), b = document.createElement('button'), a = document.createElement('div'); b.textContent = g[0]; a.className = 'acilir';
    g[1].forEach(function (m) { if (m === '-') { a.appendChild(document.createElement('hr')); return; } var x = document.createElement('button'); x.innerHTML = esc(m[0]) + '<span>' + esc(m[1]) + '</span>'; x.onclick = function () { d.classList.remove('ac'); m[2](); }; a.appendChild(x); });
    d.appendChild(b); d.appendChild(a); mm.appendChild(d);
    b.onclick = function (e) { e.stopPropagation(); var w = d.classList.contains('ac'); $$('.menu>div').forEach(function (z) { z.classList.remove('ac'); }); if (!w) d.classList.add('ac'); };
  });
  document.addEventListener('click', function () { $$('.menu>div').forEach(function (z) { z.classList.remove('ac'); }); });

  async function mikSec() {
    try { await navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) { s.getTracks().forEach(function (t) { t.stop(); }); }); var l = (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === 'audioinput'; }); }
    catch (e) { return toast('Mikrofon izni gerekli'); }
    var p = diyalog('Mikrofon seç', [{ k: 'id', ad: 'Mikrofon', tur: 'sec', sec: l.map(function (d, i) { return [d.deviceId, d.label || ('Mikrofon ' + (i + 1))]; }) }], { id: mikId || (l[0] && l[0].deviceId) }, { tamam: function (d) { mikId = d.id; toast('Mikrofon seçildi'); } });
    var b = $('#dg-on-izle', p); if (b) b.style.display = 'none';
  }

  /* ---------- Dosya girişleri ve kısayollar ---------- */
  $('#sesAc').onclick = function () { $('#dosyaSes').click(); }; $('#muzikAc').onclick = function () { $('#dosyaMuzik').click(); };
  $('#dosyaSes').onchange = function (e) { if (e.target.files[0]) sesYukle(e.target.files[0]); e.target.value = ''; };
  $('#dosyaMuzik').onchange = function (e) { if (e.target.files[0]) { muzikYukle(e.target.files[0]).then(function () { $('#muzikSec').value = 'ozel'; }); } e.target.value = ''; };
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) sesYukle(f); });
  document.addEventListener('keydown', function (e) {
    var t = e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (document.querySelector('.perde')) return;
    var c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); oynatToggle(); }
    else if (c && k === 'z') { e.preventDefault(); islem.geri(); }
    else if (c && k === 'y') { e.preventDefault(); islem.yinele(); }
    else if (c && k === 'a') { e.preventDefault(); islem.tumu(); }
    else if (c && k === 't') { e.preventDefault(); islem.kirp(); }
    else if (c && k === 'o') { e.preventDefault(); $('#dosyaSes').click(); }
    else if (c && k === 'r') { e.preventDefault(); kayitBasla(); }
    else if (c && k === 'k') { e.preventDefault(); islem.kaldir(); }
    else if (c && k === 's') { e.preventDefault(); indir($('#hedef').value === 'santral' ? 'santral' : 'mp3'); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); islem.sil(); }
  });
  window.__studyo = { S: S, Motor: Motor, sesYukle: sesYukle, setSes: setSes, setMuzik: setMuzik, oto: oto, uret: uret, indir: indir, islem: islem };

  aracDugmeleri(); hedefUygula(); tumuGoster(); guncelle();
})();
