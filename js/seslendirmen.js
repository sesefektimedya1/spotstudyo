/* V92 Seslendirmen sayfası: başvuru (komisyon onayı ile) ve seslendirmen paneli. */
(async function () {
  'use strict';
  var kap = $('#svAna');
  var o = null; try { o = await Veri.oturum(); } catch (e) {}
  if (!o) { location.href = './?next=seslendirmen#giris'; return; }
  await ustCubuk('seslendirmen', o);

  var A = {}; try { A = await Veri.ayarlar(); } catch (e) {}
  var pay = (A.pay_yuzde === '' || A.pay_yuzde == null || isNaN(+A.pay_yuzde)) ? 80 : +A.pay_yuzde, kom = Math.round((100 - pay) * 100) / 100;
  var KUL = ['Radyo', 'TV', 'Santral', 'Reklam', 'Jingle', 'Videolu anlatım', 'Sesli kitap', 'Dublaj', 'Diğer'];
  var TES = [[1, '1 saat içinde (acil)'], [24, '24 saat içinde'], [72, '3 gün içinde'], [168, '7 gün içinde']];
  function tl(n) { return (+n || 0).toLocaleString('tr-TR') + ' TL'; }
  function opt(L, sec) { return L.map(function (x) { return '<option value="' + x[0] + '"' + (String(sec == null ? '' : sec) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join(''); }
  function kulOku(k) { return $$('input:checked', k).map(function (x) { return x.value; }).join(','); }
  function kulKutu(sec, id) { var s = String(sec || '').split(',').map(function (x) { return x.trim(); }); return '<div id="' + id + '" style="display:flex;gap:.3rem 1rem;flex-wrap:wrap">' + KUL.map(function (k) { return '<label style="margin:0;font-size:14px"><input type="checkbox" value="' + k + '"' + (s.indexOf(k) > -1 ? ' checked' : '') + '> ' + k + '</label>'; }).join('') + '</div>'; }
  function f(id, et, d, tip, ek) { return '<div><label class="k" for="' + id + '">' + et + '</label><input type="' + (tip || 'text') + '" id="' + id + '" value="' + esc(d == null ? '' : d) + '" ' + (ek || '') + '></div>'; }
  var bugun = new Date().toISOString().slice(0, 10);
  var uyeAktif = Veri.isPro(o.plan) && (!o.plan_bitis || o.plan_bitis >= bugun);

  var ben = null, hataMsg = '';
  try { ben = await Veri.svBen(); } catch (e) { hataMsg = e.message || ''; }
  if (hataMsg) { kap.innerHTML = '<div class="kart"><b>Bu sayfa şu an açılamadı.</b><div class="sol" style="margin-top:.4rem">' + esc(/relation|does not exist|schema cache/i.test(hataMsg) ? 'Seslendirmen tabloları henüz kurulmamış. V92 SQL dosyasını Supabase’de çalıştırın.' : hataMsg) + '</div></div>'; return; }

  if (!ben) { uyeAktif ? basvuruFormu() : uyeYok(); }
  else if (ben.durum === 'beklemede') kap.innerHTML = '<div class="kart"><h2 style="font-size:1.5rem;margin-bottom:.4rem">Başvurunuz alındı</h2><p>Ses örneğinizi dinleyip en kısa sürede dönüş yapacağız. Onaylandığında kartınız Seslendirmenler sayfasında görünür ve bu sayfa siparişlerinizi gösteren panele dönüşür.</p></div>';
  else if (ben.durum === 'reddedildi') kap.innerHTML = '<div class="kart"><h2 style="font-size:1.5rem;margin-bottom:.4rem">Başvurunuz bu sefer onaylanmadı</h2><p>Daha net bir ses kaydıyla yeniden denemek için bizimle WhatsApp’tan iletişime geçebilirsiniz.</p></div>';
  else panel();

  function uyeYok() {
    kap.innerHTML = '<div class="kart" style="max-width:640px"><h2 style="font-size:1.6rem;margin-bottom:.5rem">Önce yıllık üyelik gerekli</h2><p style="margin-bottom:.6rem">Seslendirmen olarak satış yapmak için yıllık bir paket almanız gerekir. Paketiniz stüdyoyu da kapsar: kendi spotunuzu da yapabilirsiniz. Satış yapmasanız bile paketinizi kullanırsınız.</p><p class="sol" style="margin-bottom:1rem">Paket ücreti ve satış komisyonu ayrıdır: yaptığınız her seslendirme işinin bedelinden %' + kom + ' komisyon kesilir.</p><a class="btn ana" href="paketler">Paketleri gör</a></div>';
  }

  function basvuruFormu() {
    kap.innerHTML = '<div class="sp"><div><h1 style="font-size:2rem;margin-bottom:.3rem">Seslendirmen başvurusu</h1><p class="alt">Bilgilerinizi ve bir ses örneğinizi gönderin. Biz dinleyip onaylayınca kartınız yayına girer.</p>' +
      '<div class="adim"><h3><b>1</b> Sizi tanıyalım</h3><div class="izg3">' + f('sAd', 'Görünen ad (kartta çıkar)', o.ad || '') + f('sTel', 'Telefon', o.telefon || '', 'tel') + '<div><label class="k" for="sCins">Ses</label><select id="sCins"><option value="">Seçin</option><option value="erkek">Erkek</option><option value="kadin">Kadın</option></select></div></div>' +
      '<div class="izg3" style="margin-top:.8rem"><div><label class="k" for="sYas">Yaş aralığı</label><select id="sYas"><option value="">Seçin</option><option value="genc">Genç</option><option value="orta">Orta yaş</option><option value="olgun">Olgun</option></select></div>' + f('sDil', 'Dil (virgülle)', 'Türkçe') + f('sAc', 'Kısa açıklama', '', 'text', 'maxlength="90" placeholder="Örn: Sıcak, samimi radyo sesi"') + '</div>' +
      '<label class="k" style="margin-top:.8rem">Kullanım alanları</label>' + kulKutu('', 'sKul') + '</div>' +
      '<div class="adim"><h3><b>2</b> Fiyat ve teslim süresi</h3><div class="izg3">' + f('sFy', 'Başlangıç fiyatı (TL)', '', 'number', 'min="0"') + '<div><label class="k" for="sTes">Teslim süreniz</label><select id="sTes"><option value="">Seçin</option>' + opt(TES, '') + '</select></div></div><p class="say" style="text-align:left;margin-top:.5rem">Teslim süresi kartta müşteriye gösterilir ve ödeme alındığı andan itibaren işler. Süreyi geçirmeyeceğiniz bir değer seçin.</p></div>' +
      '<div class="adim"><h3><b>3</b> Ses örneği</h3><input type="file" id="sDosya" accept="audio/*"><p class="say" style="text-align:left;margin-top:.5rem">Temiz, gürültüsüz, 20-40 saniyelik bir örnek yükleyin (mp3 ya da wav).</p></div>' +
      '<div class="adim"><h3><b>4</b> Ödeme bilgisi (haftalık ödeme için)</h3><div class="izg2">' + f('sSahip', 'Hesap sahibi', o.ad || '') + f('sIban', 'IBAN', '', 'text', 'placeholder="TR00 0000 0000 0000 0000 0000 00"') + '</div></div>' +
      '<div class="adim"><label style="display:flex;gap:.6rem;align-items:flex-start;margin:0;font-size:14px;font-weight:400"><input type="checkbox" id="sKabul" style="width:auto;margin-top:3px"> <span>Platform üzerinden yaptığım her seslendirme ve prodüksiyon hizmetinin bedelinden <b>%' + kom + ' komisyon</b> kesileceğini okudum, kabul ediyorum. <a href="seslendirmen-sozlesmesi" target="_blank" rel="noopener">Seslendirmen sözleşmesi</a></span></label></div>' +
      '</div><aside class="sOz"><h3>Başvuru</h3><p class="sol" style="margin:.4rem 0 1rem">Ödemeler haftalık (Cuma) yapılır. Müşteri onayladıktan ya da teslimden 3 gün sonra onay kendiliğinden gerçekleşir, ardından 2 gün bekleme süresi vardır.</p><button class="btn ana" id="sGonder">Başvuruyu gönder</button></aside></div>';
    $('#sGonder').onclick = async function () {
      var ad = $('#sAd').value.trim(), dosya = $('#sDosya').files[0], iban = $('#sIban').value.replace(/\s/g, '').toUpperCase();
      if (!ad) { toast('Görünen adınızı yazın.'); return; }
      if (!$('#sCins').value) { toast('Ses (erkek/kadın) seçin.'); return; }
      if (!(+$('#sFy').value > 0)) { toast('Başlangıç fiyatınızı yazın.'); return; }
      if (!$('#sTes').value) { toast('Teslim sürenizi seçin.'); return; }
      if (!dosya) { toast('Bir ses örneği yükleyin.'); return; }
      if (dosya.size > 30 * 1024 * 1024) { toast('Ses dosyası en fazla 30 MB olabilir.'); return; }
      if (!/^TR\d{24}$/.test(iban)) { toast('IBAN geçerli görünmüyor (TR ile başlayan 26 karakter).'); return; }
      if (!$('#sKabul').checked) { toast('Komisyon şartını onaylamanız gerekir.'); return; }
      var b = this; b.disabled = true;
      try {
        await Veri.svBasvuru({ ad: ad, telefon: $('#sTel').value.trim() || null, aciklama: $('#sAc').value.trim() || null, cinsiyet: $('#sCins').value, yas: $('#sYas').value || null, dil: $('#sDil').value.trim() || 'Türkçe', kullanim: kulOku($('#sKul')) || null, fiyat_tl: +$('#sFy').value, teslim_saat: +$('#sTes').value, iban: iban, hesap_sahibi: $('#sSahip').value.trim() || ad }, dosya);
        kap.innerHTML = '<div class="kart"><h2 style="font-size:1.5rem;margin-bottom:.4rem">Başvurunuz alındı</h2><p>Ses örneğinizi dinleyip en kısa sürede dönüş yapacağız.</p></div>';
      } catch (e) { toast(e.message || 'Gönderilemedi'); b.disabled = false; }
    };
  }

  async function panel() {
    var S = [], P = [];
    try { S = await Veri.svSiparisleri(); P = await Veri.svProgramlarim(); } catch (e) {}
    var simdi = Date.now(), hazir = 0, bekle = 0, odenen = 0;
    S.forEach(function (x) { if (x.odeme_durum === 'iade' || x.teslim_durum === 'iptal') return; var t = +x.hakedis_tutar || 0; if (x.hakedis_durum === 'odendi') odenen += t; else if (x.odenebilir && new Date(x.odenebilir).getTime() <= simdi) hazir += t; else bekle += t; });
    function kalan(x) {
      if (x.teslim_durum !== 'bekliyor' || !x.teslim_son) return '';
      var d = new Date(x.teslim_son).getTime() - Date.now(); if (d <= 0) return '<span class="etiket" style="background:#7a2530;color:#fff">Süre doldu</span>';
      var sa = Math.floor(d / 3600000), dk = Math.floor(d % 3600000 / 60000); return '<span class="etiket p">Kalan: ' + (sa >= 24 ? Math.floor(sa / 24) + ' gün ' + (sa % 24) + ' sa' : sa + ' sa ' + dk + ' dk') + '</span>';
    }
    var DU = { bekliyor: 'Teslim bekleniyor', yuklendi: 'Teslim edildi, müşteri onayı bekleniyor', onaylandi: 'Onaylandı', iptal: 'İptal' };
    kap.innerHTML =
      '<div class="izgara g4" style="margin-bottom:1rem"><div class="kart"><div class="sol">Ödenebilir (bu Cuma)</div><div class="sayi">' + tl(hazir) + '</div></div><div class="kart"><div class="sol">Bekleyen hakediş</div><div class="sayi">' + tl(bekle) + '</div></div><div class="kart"><div class="sol">Ödenen toplam</div><div class="sayi">' + tl(odenen) + '</div></div><div class="kart"><div class="sol">Komisyon</div><div class="sayi">%' + kom + '</div></div></div>' +
      '<div class="kart" style="margin-bottom:1rem"><h3 style="font-size:1.3rem;margin-bottom:.6rem">Siparişlerim</h3>' + (S.length ? '<div style="overflow-x:auto"><table style="width:100%"><tr><th>Kod</th><th>Tür</th><th>Metin ve not</th><th>Süre</th><th>Durum</th><th>Hakediş</th><th></th></tr>' + S.map(function (x) {
        var kod = 'SP-' + String(x.id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(), ok = x.odeme_durum === 'odendi' && (x.teslim_durum === 'bekliyor' || x.teslim_durum === 'yuklendi');
        return '<tr><td><b>' + kod + '</b><div class="sol" style="font-size:12px">' + new Date(x.odeme_tarihi || x.created_at).toLocaleDateString('tr-TR') + '</div></td><td>' + esc(x.tur || '') + '</td><td style="max-width:340px;white-space:pre-wrap">' + esc(x.metin || '') + (x.notu ? '<div class="sol" style="font-size:13px;margin-top:.3rem">Not: ' + esc(x.notu) + '</div>' : '') + (x.muzik_adi ? '<div class="sol" style="font-size:13px">Müzik: ' + esc(x.muzik_adi) + '</div>' : '') + '</td><td>' + (kalan(x) || '') + '</td><td>' + (x.odeme_durum === 'iade' ? 'İade edildi' : esc(DU[x.teslim_durum] || x.teslim_durum)) + '</td><td>' + tl(x.hakedis_tutar) + '<div class="sol" style="font-size:12px">' + (x.hakedis_durum === 'odendi' ? 'Ödendi ' + esc(x.hakedis_odeme || '') : 'Bekliyor') + '</div></td><td>' + (ok ? '<label class="btn kucuk ana" style="cursor:pointer">' + (x.teslim_durum === 'yuklendi' ? 'Yeniden yükle' : 'Sesi yükle') + '<input type="file" accept="audio/*" data-teslim="' + x.id + '" style="display:none"></label>' : '') + '</td></tr>';
      }).join('') + '</table></div>' : '<span class="sol">Henüz ödemesi alınmış sipariş yok. Ödeme alınınca burada görünür ve teslim süreniz başlar.</span>') + '</div>' +
      '<div class="kart" style="margin-bottom:1rem"><h3 style="font-size:1.3rem;margin-bottom:.6rem">Profilim</h3><div class="izg3">' + f('pFy', 'Başlangıç fiyatı (TL)', ben.fiyat_tl, 'number', 'min="0"') + '<div><label class="k" for="pTes">Teslim süresi</label><select id="pTes">' + opt(TES, ben.teslim_saat) + '</select></div>' + f('pAc', 'Kısa açıklama', ben.aciklama || '', 'text', 'maxlength="90"') + '</div><div class="izg2" style="margin-top:.8rem">' + f('pSahip', 'Hesap sahibi', ben.hesap_sahibi || '') + f('pIban', 'IBAN', ben.iban || '') + '</div><div style="margin-top:.8rem"><button class="btn ana" id="pKaydet">Kaydet</button></div></div>' +
      '<div class="kart"><h3 style="font-size:1.3rem;margin-bottom:.3rem">Paket programlarım</h3><p class="sol" style="margin-bottom:.8rem">Radyolara şarkı aralarına konan hazır anons paketleri. Yüklediğiniz paket yönetim onayından sonra Paket Programlar sayfasında satışa çıkar.</p>' +
      (P.length ? '<table style="margin-bottom:1rem">' + P.map(function (x) { return '<tr><td><b>' + esc(x.ad) + '</b></td><td>' + tl(x.fiyat_tl) + '</td><td>' + (x.aktif ? '<span class="etiket p">Yayında</span>' : '<span class="etiket">Onay bekliyor</span>') + '</td></tr>'; }).join('') + '</table>' : '') +
      '<div class="izg3">' + f('gAd', 'Paket adı', '', 'text', 'placeholder="Örn: 2 saatlik Pop Program Paketi"') + f('gFy', 'Fiyat (TL)', '', 'number', 'min="0"') + f('gSure', 'Program süresi (dakika)', '', 'number', 'min="0" placeholder="120"') + f('gAn', 'Anons sayısı (giriş ve çıkış dahil)', '', 'number', 'min="0" placeholder="12"') + f('gAr', 'Kaç şarkıda bir anons', '', 'number', 'min="0" placeholder="3"') + '<div><label class="k" for="gTes">Teslim süresi</label><select id="gTes">' + opt(TES, ben.teslim_saat) + '</select></div></div>' +
      '<div class="izg2" style="margin-top:.8rem">' + f('gAc', 'Açıklama', '', 'text', 'placeholder="Günlük kullanıma uygun anonslar"') + '<div><label class="k" for="gDosya">Örnek ses (mp3)</label><input type="file" id="gDosya" accept="audio/*"></div></div><div style="margin-top:.8rem"><button class="btn ana" id="gEkle">Paketi gönder</button></div></div>';

    $$('[data-teslim]').forEach(function (inp) { inp.onchange = async function () {
      var d = inp.files[0]; if (!d) return; if (d.size > 80 * 1024 * 1024) { toast('Dosya en fazla 80 MB olabilir.'); return; }
      toast('Yükleniyor…'); try { await Veri.svTeslim(inp.dataset.teslim, d); toast('Teslim edildi. Müşteri bilgilendirilecek.'); panel(); } catch (e) { toast(e.message || 'Yüklenemedi'); }
    }; });
    $('#pKaydet').onclick = async function () {
      var iban = $('#pIban').value.replace(/\s/g, '').toUpperCase(); if (iban && !/^TR\d{24}$/.test(iban)) { toast('IBAN geçerli görünmüyor.'); return; }
      try { await Veri.svGuncelle({ aciklama: $('#pAc').value.trim(), fiyat_tl: +$('#pFy').value || null, teslim_saat: +$('#pTes').value || null, iban: iban, hesap_sahibi: $('#pSahip').value.trim() }); toast('Kaydedildi'); } catch (e) { toast(e.message); }
    };
    $('#gEkle').onclick = async function () {
      var ad = $('#gAd').value.trim(), d = $('#gDosya').files[0]; if (!ad || !d) { toast('Paket adı ve örnek ses gerekli.'); return; } if (!(+$('#gFy').value > 0)) { toast('Fiyat yazın.'); return; }
      var b = this; b.disabled = true;
      try { await Veri.svProgramEkle({ ad: ad, aciklama: $('#gAc').value.trim(), fiyat_tl: +$('#gFy').value, sure_dk: +$('#gSure').value || null, anons_sayisi: +$('#gAn').value || null, aralik: +$('#gAr').value || null, teslim_saat: +$('#gTes').value || null }, d); toast('Gönderildi. Onay sonrası yayına girer.'); panel(); }
      catch (e) { toast(e.message || 'Gönderilemedi'); b.disabled = false; }
    };
  }
})();
