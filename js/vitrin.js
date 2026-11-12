/* V91 vitrin: seslendirmen kartları (MP3 dinletme), filtreler. Ana sayfa ve Seslendirmenler sayfası ortak kullanır. */
(function () {
  'use strict';
  var RENK = [['#c8821f', '#e0452f'], ['#c23b6e', '#6b4fc0'], ['#2f7d86', '#3f8f64'], ['#6b4fc0', '#2f4f9a'], ['#e08a3c', '#c23b6e'], ['#3f8f64', '#2f7d86']];
  var TESLIM = { 1: '1 saat içinde', 24: '24 saat içinde', 72: '3 gün içinde', 168: '7 gün içinde' };
  var YAS = { genc: 'Genç', orta: 'Orta yaş', olgun: 'Olgun' };
  var CINS = { erkek: 'Erkek ses', kadin: 'Kadın ses' };

  function tl(n) { n = +n; return isFinite(n) && n > 0 ? n.toLocaleString('tr-TR') + ' TL' : ''; }
  function ilk(ad) { var p = String(ad || '?').trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p[1] ? p[1].charAt(0) : '')).toLocaleUpperCase('tr-TR'); }
  function teslimYaz(s) { s = +s; if (!s) return ''; if (TESLIM[s]) return TESLIM[s]; if (s < 24) return s + ' saat içinde'; return Math.round(s / 24) + ' gün içinde'; }
  function liste(x) { return String(x || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function renk(i) { return RENK[i % RENK.length]; }

  /* Tek ses çalar: aynı anda tek kart çalar. Bağlantı tıklanınca alınır (120 sn geçerli). */
  var oynatici = new Audio(), aktifId = null, aktifKart = null;
  oynatici.preload = 'none';
  function durdurGorunum() { if (aktifKart) { aktifKart.classList.remove('cal'); var b = aktifKart.querySelector('.pb i'); if (b) b.style.width = '0'; } aktifKart = null; aktifId = null; }
  oynatici.addEventListener('ended', durdurGorunum);
  oynatici.addEventListener('timeupdate', function () {
    if (!aktifKart || !oynatici.duration) return;
    var b = aktifKart.querySelector('.pb i'); if (b) b.style.width = Math.min(100, oynatici.currentTime / oynatici.duration * 100) + '%';
  });
  async function cal(kayit, kart, tablo) {
    if (aktifId === kayit.id && !oynatici.paused) { oynatici.pause(); durdurGorunum(); return; }
    oynatici.pause(); durdurGorunum();
    try {
      var u = await Veri.url(kayit, tablo || 'sesler');
      oynatici.src = u; aktifId = kayit.id; aktifKart = kart; kart.classList.add('cal');
      await oynatici.play();
    } catch (e) { durdurGorunum(); toast('Ses açılamadı. Birazdan tekrar deneyin.'); }
  }

  var IC_OYNAT = '<svg class="oy" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg><svg class="dur" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';

  function kartHtml(k, i) {
    var r = renk(i), kul = liste(k.kullanim), alt = k.aciklama || '';
    var cins = CINS[k.cinsiyet] || '', yas = YAS[k.yas] || '';
    var kim = [cins, yas].filter(Boolean).join(' · ');
    return '<article class="bc" data-id="' + esc(k.id) + '">' +
      '<div class="foto" style="background:linear-gradient(135deg,' + r[0] + ',' + r[1] + ')"><span class="ini">' + esc(ilk(k.ad)) + '</span>' + (k.one_cikan ? '<span class="one">Öne çıkan</span>' : '') +
      '<button type="button" class="oyn" aria-label="' + esc(k.ad) + ' sesini dinle">' + IC_OYNAT + '</button></div><div class="pb"><i></i></div>' +
      '<div class="bg"><div class="u2"><div class="kim"><b>' + esc(k.ad) + '</b>' + (kim ? '<span>' + esc(kim) + '</span>' : '') + '</div>' +
      (tl(k.fiyat_tl) ? '<div class="fy"><b>' + tl(k.fiyat_tl) + '</b><span>Başlangıç</span></div>' : '') + '</div>' +
      (alt ? '<div class="kim"><span>' + esc(alt) + '</span></div>' : '') +
      (kul.length ? '<div class="chips">' + kul.map(function (x) { return '<em>' + esc(x) + '</em>'; }).join('') + '</div>' : '') +
      (k.teslim_saat ? '<div class="tes">Teslim: ' + esc(teslimYaz(k.teslim_saat)) + '</div>' : '') +
      '<a class="yap" style="background:' + r[0] + '" href="spot-yaptir?ses=' + encodeURIComponent(k.id) + '">Bu sesle yaptır</a></div></article>';
  }

  function kartlariBagla(kap, L) {
    $$('.bc', kap).forEach(function (el) {
      var k = L.filter(function (x) { return String(x.id) === el.dataset.id; })[0]; if (!k) return;
      el.querySelector('.oyn').onclick = function () { cal(k, el, 'sesler'); };
    });
  }

  function sirala(L) {
    return L.slice().sort(function (a, b) { return (b.one_cikan ? 1 : 0) - (a.one_cikan ? 1 : 0) || String(a.ad).localeCompare(String(b.ad), 'tr'); });
  }
  async function sesleriGetir() { try { return sirala((await Veri.liste('sesler')).filter(function (k) { return k.tur !== 'program'; })); } catch (e) { return []; } }
  async function programlariGetir() { try { return (await Veri.liste('sesler')).filter(function (k) { return k.tur === 'program'; }).sort(function (a, b) { return (+a.fiyat_tl || 0) - (+b.fiyat_tl || 0); }); } catch (e) { return []; } }

  /* Paket programlar: şarkı aralarına konan hazır anons paketleri */
  async function programlar(kap) {
    var L = await programlariGetir(), A = {}; try { A = await Veri.ayarlar(); } catch (e) {}
    if (!L.length) { kap.innerHTML = '<div class="vBos">Paket programlar çok yakında burada olacak.</div>'; return; }
    kap.innerHTML = L.map(function (k, i) {
      var r = renk(i + 2), oz = [k.sure_dk ? k.sure_dk + ' dakikalık program' : '', k.anons_sayisi ? k.anons_sayisi + ' anons (giriş ve çıkış dahil)' : '', k.aralik ? 'Her ' + k.aralik + ' şarkıda bir anons' : ''].filter(Boolean);
      return '<article class="bc" data-id="' + esc(k.id) + '"><div class="foto" style="background:linear-gradient(135deg,' + r[0] + ',' + r[1] + ');aspect-ratio:16/7"><span class="ini">♪</span><button type="button" class="oyn" aria-label="Örneği dinle">' + IC_OYNAT + '</button></div><div class="pb"><i></i></div>' +
        '<div class="bg"><div class="u2"><div class="kim"><b>' + esc(k.ad) + '</b>' + (k.sahip ? '<span>Seslendiren: ' + esc(k.sahip) + '</span>' : '') + '</div>' + (tl(k.fiyat_tl) ? '<div class="fy"><b>' + tl(k.fiyat_tl) + '</b><span>Paket</span></div>' : '') + '</div>' +
        (k.aciklama ? '<div class="kim"><span>' + esc(k.aciklama) + '</span></div>' : '') +
        (oz.length ? '<div class="chips">' + oz.map(function (x) { return '<em>' + esc(x) + '</em>'; }).join('') + '</div>' : '') +
        (k.teslim_saat ? '<div class="tes">Teslim: ' + esc(teslimYaz(k.teslim_saat)) + '</div>' : '') +
        '<button type="button" class="yap" style="background:' + r[0] + ';border:0;cursor:pointer" data-al="' + esc(k.id) + '">Paketi satın al</button></div></article>';
    }).join('');
    kartlariBagla(kap, L);
    $$('[data-al]', kap).forEach(function (b) { b.onclick = function () { programSiparis(L.filter(function (x) { return String(x.id) === b.dataset.al; })[0], A); }; });
  }

  async function programSiparis(k, A) {
    var o = null; try { o = await Veri.oturum(); } catch (e) {}
    if (!o) { location.href = './?next=paket-programlar#giris'; return; }
    var m = document.createElement('div'); m.className = 'gm'; m.style.display = 'flex';
    function kapat() { m.remove(); }
    m.innerHTML = '<div class="kutu" style="max-width:460px"><button class="gKapat" aria-label="Kapat">×</button><h2 style="margin-bottom:.3rem">' + esc(k.ad) + '</h2><p class="alt" style="margin-bottom:1rem">' + (tl(k.fiyat_tl) || '') + ' · ' + esc(k.sahip || '') + '</p>' +
      '<label class="k" for="pAd">Ad soyad</label><input type="text" id="pAd" value="' + esc(o.ad || '') + '"><label class="k" for="pTel" style="margin-top:.6rem">Telefon</label><input type="tel" id="pTel" value="' + esc(o.telefon || '') + '"><label class="k" for="pEp" style="margin-top:.6rem">E-posta</label><input type="email" id="pEp" value="' + esc(o.email || '') + '">' +
      '<label class="k" for="pNot" style="margin-top:.6rem">Notunuz (radyo adı, program adı, istekleriniz)</label><textarea id="pNot" style="min-height:80px" maxlength="600"></textarea><button class="btn ana" id="pVer" style="margin-top:1rem;width:100%">Siparişi ver</button></div>';
    document.body.appendChild(m);
    m.querySelector('.gKapat').onclick = kapat; m.addEventListener('click', function (e) { if (e.target === m) kapat(); });
    m.querySelector('#pVer').onclick = async function () {
      var ad = $('#pAd').value.trim(), ep = $('#pEp').value.trim(); if (!ad || !ep) { toast('Ad soyad ve e-posta gerekli.'); return; }
      var b = this, f = +k.fiyat_tl || 0, payY = (A.pay_yuzde === '' || A.pay_yuzde == null || isNaN(+A.pay_yuzde)) ? 80 : +A.pay_yuzde; b.disabled = true;
      try {
        var s = await Veri.siparisVer({ ses_id: k.id, ad: ad, telefon: $('#pTel').value.trim() || null, eposta: ep, metin: 'PAKET PROGRAM: ' + k.ad, ses_adi: k.sahip || null, muzik_adi: null, tur: 'Paket program', notu: $('#pNot').value.trim() || null, kalemler: [{ tur: 'ses', ad: 'Paket program: ' + k.ad, fiyat: f, ses: k.sahip || '', pay: Math.round(f * payY) / 100, odendi: false }], toplam_tl: f, odeme_durum: 'bekliyor' });
        var kod = 'SP-' + String(s.id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(), iban = A.banka_adi || A.iban;
        m.querySelector('.kutu').innerHTML = '<h2>Siparişiniz alındı</h2><p style="margin:.6rem 0">Sipariş kodunuz: <b>' + kod + '</b></p>' + (f > 0 ? '<p>Tutar: <b>' + tl(f) + '</b>. Ödemeniz alındıktan sonra paketiniz hazırlanır.</p>' + (iban ? '<table style="width:100%;margin:.6rem 0"><tr><td>Banka</td><td>' + esc(A.banka_adi || '—') + '</td></tr><tr><td>Hesap sahibi</td><td>' + esc(A.hesap_sahibi || '—') + '</td></tr><tr><td>IBAN</td><td>' + esc(A.iban || '—') + '</td></tr></table><p class="sol">Açıklamaya ' + kod + ' yazın.</p>' : (A.whatsapp ? '<p><a href="https://wa.me/' + esc(A.whatsapp) + '?text=' + encodeURIComponent('Merhaba, ' + kod + ' kodlu siparişimin ödeme bilgisini istiyorum.') + '" target="_blank" rel="noopener">Ödeme bilgisi için WhatsApp’tan yazın</a></p>' : '')) : '') + (A.kart_odeme === '1' && f > 0 ? '<p><button class="btn ana" id="pKart">Kartla öde</button></p>' : '') + '<p style="margin-top:1rem"><a class="btn" href="panel">Siparişlerim</a></p>';
        var kb = m.querySelector('#pKart'); if (kb) kb.onclick = async function () { kb.disabled = true; try { location.href = await Veri.odemeBaslat(s.id); } catch (e) { kb.disabled = false; toast(e.message); } };
      } catch (e) { toast(e.message || 'Sipariş verilemedi'); b.disabled = false; }
    };
  }

  /* Ana sayfa: ilk 6 kart */
  async function ozet(kap, adet) {
    var L = await sesleriGetir();
    if (!L.length) { kap.innerHTML = '<div class="vBos">Seslendirmen örnekleri çok yakında burada olacak.</div>'; return; }
    var G = L.slice(0, adet || 6);
    kap.innerHTML = G.map(kartHtml).join(''); kartlariBagla(kap, G);
  }

  /* Seslendirmenler sayfası: filtreli liste */
  async function sayfa(kap, filtreKap, sayKap) {
    var L = await sesleriGetir();
    var F = { cins: {}, dil: {}, kul: {}, yas: {}, teslim: 0, min: 0, max: 0 };
    function sayim(alan, coklu) { var s = {}; L.forEach(function (k) { (coklu ? liste(k[alan]) : (k[alan] ? [k[alan]] : [])).forEach(function (v) { s[v] = (s[v] || 0) + 1; }); }); return s; }
    var C = { cins: sayim('cinsiyet'), dil: sayim('dil', true), kul: sayim('kullanim', true), yas: sayim('yas') };
    function secili(o) { return Object.keys(o).filter(function (x) { return o[x]; }); }
    function uyar(k) {
      var s;
      s = secili(F.cins); if (s.length && s.indexOf(k.cinsiyet) < 0) return false;
      s = secili(F.yas); if (s.length && s.indexOf(k.yas) < 0) return false;
      s = secili(F.dil); if (s.length && !liste(k.dil).some(function (d) { return s.indexOf(d) > -1; })) return false;
      s = secili(F.kul); if (s.length && !liste(k.kullanim).some(function (d) { return s.indexOf(d) > -1; })) return false;
      if (F.teslim && !(+k.teslim_saat && +k.teslim_saat <= F.teslim)) return false;
      if (F.min && !(+k.fiyat_tl >= F.min)) return false;
      if (F.max && !(+k.fiyat_tl > 0 && +k.fiyat_tl <= F.max)) return false;
      return true;
    }
    function ciz() {
      var G = L.filter(uyar), n = secili(F.cins).length + secili(F.dil).length + secili(F.kul).length + secili(F.yas).length + (F.teslim ? 1 : 0) + ((F.min || F.max) ? 1 : 0);
      if (!L.length) kap.innerHTML = '<div class="vBos">Seslendirmen örnekleri çok yakında burada olacak.</div>';
      else if (!G.length) kap.innerHTML = '<div class="vBos">Bu filtrelere uyan ses yok. Filtreleri temizleyip tekrar deneyin.</div>';
      else { kap.innerHTML = G.map(kartHtml).join(''); kartlariBagla(kap, G); }
      sayKap.innerHTML = '<span>' + G.length + ' seslendirmen</span>' + (n ? ' <a id="fTemiz">Filtreleri temizle</a>' : '');
      var t = $('#fTemiz'); if (t) t.onclick = function () { F = { cins: {}, dil: {}, kul: {}, yas: {}, teslim: 0, min: 0, max: 0 }; filtreCiz(); ciz(); };
    }
    function grup(baslik, anahtar, etiketFn) {
      var ks = Object.keys(C[anahtar]); if (!ks.length) return '';
      return '<div><h5>' + baslik + '</h5>' + ks.map(function (v) { return '<label><input type="checkbox" data-g="' + anahtar + '" value="' + esc(v) + '"' + (F[anahtar][v] ? ' checked' : '') + '> ' + esc(etiketFn ? etiketFn(v) : v) + ' <i>(' + C[anahtar][v] + ')</i></label>'; }).join('') + '</div>';
    }
    function isaret() {
      var s = $$('summary', filtreKap); if (s.length < 3) return;
      s[0].className = (secili(F.cins).length + secili(F.dil).length + secili(F.kul).length + secili(F.yas).length) ? 'say' : '';
      s[1].className = (F.min || F.max) ? 'say' : ''; s[2].className = F.teslim ? 'say' : '';
    }
    function filtreCiz() {
      var hz = grup('Ses', 'cins', function (v) { return CINS[v] || v; }) + grup('Dil', 'dil') + grup('Kullanım alanı', 'kul') + grup('Yaş aralığı', 'yas', function (v) { return YAS[v] || v; });
      var tes = [[0, 'Herhangi bir zaman'], [1, '1 saat içinde'], [24, '24 saat içinde'], [72, '3 gün içinde'], [168, '7 gün içinde']];
      filtreKap.innerHTML =
        '<details class="d1"><summary' + (secili(F.cins).length + secili(F.dil).length + secili(F.kul).length + secili(F.yas).length ? ' class="say"' : '') + '>Hizmet seçenekleri</summary><div class="pn gen">' + (hz || '<span style="color:var(--sol)">Henüz seçenek yok.</span>') + '</div></details>' +
        '<details class="d2"><summary' + ((F.min || F.max) ? ' class="say"' : '') + '>Bütçe</summary><div class="pn"><div style="display:flex;gap:.6rem"><div><h5>En az (TL)</h5><input type="number" id="fMin" min="0" placeholder="hepsi" value="' + (F.min || '') + '"></div><div><h5>En çok (TL)</h5><input type="number" id="fMax" min="0" placeholder="hepsi" value="' + (F.max || '') + '"></div></div><div><a class="btn kucuk" id="fByt">Temizle</a></div></div></details>' +
        '<details class="d3"><summary' + (F.teslim ? ' class="say"' : '') + '>Teslim süresi</summary><div class="pn">' + tes.map(function (t) { return '<label><input type="radio" name="fTes" value="' + t[0] + '"' + (F.teslim === t[0] ? ' checked' : '') + '> ' + t[1] + '</label>'; }).join('') + '</div></details>';
      $$('input[data-g]', filtreKap).forEach(function (c) { c.onchange = function () { F[c.dataset.g][c.value] = c.checked; isaret(); ciz(); }; });
      $$('input[name=fTes]', filtreKap).forEach(function (c) { c.onchange = function () { F.teslim = +c.value; isaret(); ciz(); }; });
      var mn = $('#fMin'), mx = $('#fMax');
      function b() { F.min = +mn.value || 0; F.max = +mx.value || 0; isaret(); ciz(); }
      if (mn) { mn.oninput = b; mx.oninput = b; $('#fByt').onclick = function () { mn.value = ''; mx.value = ''; b(); }; }
    }
    filtreCiz(); ciz();
    document.addEventListener('click', function (e) { $$('.sFiltre details[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
  }

  window.Vitrin = { tl: tl, ilk: ilk, teslimYaz: teslimYaz, liste: liste, renk: renk, cal: cal, ozet: ozet, sayfa: sayfa, sesleriGetir: sesleriGetir, programlar: programlar };
})();
