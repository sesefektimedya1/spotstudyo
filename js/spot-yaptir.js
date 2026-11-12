/* V91 Spot Yaptır: metin gir, seslendirmen seç, müzik seç, sipariş ver. Ödeme alınınca sipariş seslendirmene/yönetime düşer. */
(async function () {
  'use strict';
  var kap = $('#spAna');
  var o = null; try { o = await Veri.oturum(); } catch (e) {}
  if (!o) { location.href = './?next=' + encodeURIComponent('spot-yaptir' + location.search) + '#giris'; return; }
  await ustCubuk('spot-yaptir', o);

  var A = {}, L = [], M = [];
  try { A = await Veri.ayarlar(); } catch (e) {}
  L = await Vitrin.sesleriGetir();
  try { M = await Veri.liste('muzikler'); } catch (e) {}
  var hizmet = +A.hizmet_ucreti || 0, payY = (A.pay_yuzde === '' || A.pay_yuzde == null || isNaN(+A.pay_yuzde)) ? 100 : +A.pay_yuzde;
  var secId = new URLSearchParams(location.search).get('ses') || '';
  var ses = L.filter(function (k) { return String(k.id) === secId; })[0] || null, muz = null;
  var TUR = ['Radyo spotu', 'TV spotu', 'Santral anonsu', 'Jingle', 'Diğer'];

  function tlx(n) { return (+n || 0).toLocaleString('tr-TR') + ' TL'; }
  function kodOf(s) { return 'SP-' + String(s.id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(); }

  function sesSatir(k, i) {
    var r = Vitrin.renk(i), kim = [k.cinsiyet === 'erkek' ? 'Erkek ses' : (k.cinsiyet === 'kadin' ? 'Kadın ses' : ''), k.teslim_saat ? 'Teslim: ' + Vitrin.teslimYaz(k.teslim_saat) : ''].filter(Boolean).join(' · ');
    return '<label class="sc' + (ses && ses.id === k.id ? ' sec' : '') + '" data-id="' + esc(k.id) + '"><input type="radio" name="sSesSec" value="' + esc(k.id) + '"' + (ses && ses.id === k.id ? ' checked' : '') + '>' +
      '<span class="av" style="background:linear-gradient(135deg,' + r[0] + ',' + r[1] + ')">' + esc(Vitrin.ilk(k.ad)) + '</span>' +
      '<span class="t"><b>' + esc(k.ad) + '</b><span>' + esc(kim || k.aciklama || '') + '</span></span>' +
      '<button type="button" class="oy2" data-oy="' + esc(k.id) + '">▶ Dinle</button>' + (+k.fiyat_tl > 0 ? '<span class="fy2">' + tlx(k.fiyat_tl) + '</span>' : '') + '</label>';
  }

  kap.innerHTML = '<div class="sp"><div>' +
    '<h1>Spot Yaptır</h1><p class="alt">Metninizi girin, seslendirmeninizi ve müziğinizi seçin. Ödemeniz alınınca spotunuz hazırlanır, Panelim bölümünden indirirsiniz.</p>' +
    '<div class="adim"><h3><b>1</b> Spot metni</h3><div class="izg2" style="margin-bottom:.8rem"><div><label class="k" for="sTur">Spot türü</label><select id="sTur">' + TUR.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div></div>' +
    '<label class="k" for="sMetin">Seslendirmenin okuyacağı metin</label><textarea id="sMetin" maxlength="3000" placeholder="Spot metninizi buraya yazın…"></textarea><div class="say" id="sSay">0 karakter</div></div>' +
    '<div class="adim"><h3><b>2</b> Seslendirmeninizi seçin</h3>' + (L.length ? '<div class="sSec" id="sSes">' + L.map(sesSatir).join('') + '</div>' : '<div class="vBos" style="grid-column:auto">Henüz seslendirmen eklenmedi. Çok yakında burada olacak.</div>') + '</div>' +
    '<div class="adim"><h3><b>3</b> Müziği seçin</h3><div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap"><select id="sMuz" style="flex:1;min-width:200px"><option value="">Müzik istemiyorum</option>' + M.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.ad) + (m.etiket ? ' · ' + esc(m.etiket) : '') + '</option>'; }).join('') + '</select><button type="button" class="btn" id="sMuzOy">▶ Dinle</button></div>' + (M.length ? '' : '<div class="say" style="text-align:left">Müzik kütüphanesi henüz boş.</div>') + '</div>' +
    '<div class="adim"><h3><b>4</b> İletişim ve not</h3><div class="izg3"><div><label class="k" for="sAd">Ad soyad</label><input type="text" id="sAd" autocomplete="name" value="' + esc(o.ad || '') + '"></div><div><label class="k" for="sTel">Telefon</label><input type="tel" id="sTel" autocomplete="tel" value="' + esc(o.telefon || '') + '"></div><div><label class="k" for="sEp">E-posta</label><input type="email" id="sEp" autocomplete="email" value="' + esc(o.email || '') + '"></div></div>' +
    '<label class="k" for="sNot" style="margin-top:.8rem">Seslendirmene notunuz (isteğe bağlı)</label><textarea id="sNot" style="min-height:70px" maxlength="600" placeholder="Örn: Samimi, hızlı okusun. Sonunda telefon numarası okunsun."></textarea></div>' +
    '</div><aside class="sOz" id="sOz"></aside></div>';

  function ozet() {
    var sf = ses ? (+ses.fiyat_tl || 0) : 0, top = sf + hizmet;
    $('#sOz').innerHTML = '<h3>Sipariş özeti</h3><table><tr><td>Seslendirmen</td><td>' + (ses ? esc(ses.ad) : '<span style="color:var(--sol)">Seçilmedi</span>') + '</td></tr>' +
      (ses && sf ? '<tr><td>Seslendirme bedeli</td><td>' + tlx(sf) + '</td></tr>' : '') +
      '<tr><td>Müzik</td><td>' + (muz ? esc(muz.ad) : '<span style="color:var(--sol)">Yok</span>') + '</td></tr>' +
      (hizmet ? '<tr><td>Prodüksiyon bedeli</td><td>' + tlx(hizmet) + '</td></tr>' : '') +
      '<tr class="top"><td><b>Toplam</b></td><td><b>' + tlx(top) + '</b></td></tr>' +
      (ses && ses.teslim_saat ? '<tr><td>Tahmini teslim</td><td>' + esc(Vitrin.teslimYaz(ses.teslim_saat)) + '</td></tr>' : '') + '</table>' +
      '<button class="btn ana" id="sVer"' + (L.length ? '' : ' disabled') + '>Siparişi ver</button>' +
      '<div class="nt">Ödemeniz alındıktan sonra süre başlar ve spotunuz hazırlanır. ' + esc(A.kdv_notu || '') + '</div>' + window.odemeSeridi(true);
    $('#sVer').onclick = ver;
  }

  $('#sMetin').oninput = function () { $('#sSay').textContent = this.value.length + ' karakter'; };
  $$('input[name=sSesSec]').forEach(function (r) { r.onchange = function () { ses = L.filter(function (k) { return String(k.id) === r.value; })[0] || null; $$('.sc').forEach(function (e) { e.classList.toggle('sec', e.dataset.id === r.value); }); ozet(); }; });
  $$('[data-oy]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); var k = L.filter(function (x) { return String(x.id) === b.dataset.oy; })[0]; if (k) Vitrin.cal(k, b.closest('.sc'), 'sesler'); }; });
  $('#sMuz').onchange = function () { muz = M.filter(function (m) { return String(m.id) === $('#sMuz').value; })[0] || null; ozet(); };
  $('#sMuzOy').onclick = function () { if (!muz) { toast('Önce bir müzik seçin'); return; } Vitrin.cal(muz, $('#sMuzOy'), 'muzikler'); };

  async function ver() {
    var metin = $('#sMetin').value.trim(), ad = $('#sAd').value.trim(), ep = $('#sEp').value.trim(), tel = $('#sTel').value.trim();
    if (metin.length < 10) { toast('Spot metnini yazın (en az 10 karakter).'); $('#sMetin').focus(); return; }
    if (!ses) { toast('Bir seslendirmen seçin.'); return; }
    if (!ad || !ep) { toast('Ad soyad ve e-posta gerekli.'); return; }
    var sf = +ses.fiyat_tl || 0, kal = [{ tur: 'ses', ad: 'Seslendirme: ' + ses.ad, fiyat: sf, ses: ses.ad, pay: Math.round(sf * payY) / 100, odendi: false }];
    if (muz) kal.push({ tur: 'muzik', ad: 'Müzik: ' + muz.ad, fiyat: 0 });
    if (hizmet) kal.push({ tur: 'hizmet', ad: 'Prodüksiyon bedeli', fiyat: hizmet });
    var top = sf + hizmet, b = $('#sVer'); b.disabled = true;
    try {
      var s = await Veri.siparisVer({ ad: ad, telefon: tel || null, eposta: ep, metin: metin, ses_adi: ses.ad, muzik_adi: muz ? muz.ad : null, tur: $('#sTur').value, notu: $('#sNot').value.trim() || null, kalemler: kal, toplam_tl: top, odeme_durum: 'bekliyor' });
      bitti(s, top);
    } catch (e) { toast(e.message || 'Sipariş verilemedi'); b.disabled = false; }
  }

  function bitti(s, top) {
    var kod = kodOf(s), h = '<div class="sTam"><div class="kart"><h1>Siparişiniz alındı</h1><p>Sipariş kodunuz: <span class="kod">' + kod + '</span></p>';
    if (top > 0) {
      var iban = (A.banka_adi || A.iban);
      h += '<p style="margin-top:.8rem"><b>Ödeme:</b> Ödemeniz alındıktan sonra spotunuz hazırlanır' + (ses && ses.teslim_saat ? ' (tahmini teslim: ' + esc(Vitrin.teslimYaz(ses.teslim_saat)) + ')' : '') + '.</p>';
      if (A.kart_odeme === '1') h += '<p><button class="btn ana" id="sKart">Kartla öde</button></p>';
      if (iban) h += '<table><tr><td>Tutar</td><td><b>' + tlx(top) + '</b></td></tr><tr><td>Banka</td><td>' + esc(A.banka_adi || '—') + '</td></tr><tr><td>Hesap sahibi</td><td>' + esc(A.hesap_sahibi || '—') + '</td></tr><tr><td>IBAN</td><td>' + esc(A.iban || '—') + '</td></tr></table><p class="sol">Havale açıklamasına sipariş kodunuzu (' + kod + ') yazın.</p>';
      else if (A.whatsapp) h += '<p>Havale bilgisi için <a href="https://wa.me/' + esc(A.whatsapp) + '?text=' + encodeURIComponent('Merhaba, ' + kod + ' kodlu siparişimin ödeme bilgisini istiyorum.') + '" target="_blank" rel="noopener">WhatsApp’tan yazın</a>.</p>';
      if (A.odeme_notu) h += '<p class="sol">' + esc(A.odeme_notu) + '</p>';
    } else h += '<p style="margin-top:.8rem">Siparişiniz size ulaştı. En kısa sürede dönüş yapılacak.</p>';
    h += '<p style="margin-top:1rem"><a class="btn" href="panel">Siparişlerim</a></p>' + window.odemeSeridi(true) + '</div></div>';
    kap.innerHTML = h; window.scrollTo(0, 0);
    var k = $('#sKart'); if (k) k.onclick = async function () { k.disabled = true; try { location.href = await Veri.odemeBaslat(s.id); } catch (e) { k.disabled = false; toast(e.message); } };
  }
  ozet();
  if (ses) { var el = $('.sc.sec'); if (el) setTimeout(function () { el.scrollIntoView({ block: 'center' }); }, 200); }
})();
