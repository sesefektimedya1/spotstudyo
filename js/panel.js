(async function () {
  var o = await korumali('panel'); if (!o) return;
  var d = await Veri.hakDurumu(), lim = d.limit > 0 ? d.limit : 'sınırsız';
  var AY = await Veri.ayarlar();
  $('#ozet').innerHTML =
    '<div class="kart"><div class="sol">Üyelik</div><div class="sayi" style="font-size:2rem">' + (Veri.isPro(o.plan) ? Veri.planAd(o.plan) : Veri.planAd('ucretsiz') + ' plan') + '</div>' + (o.plan_bitis ? '<div class="sol">Bitiş: ' + esc(o.plan_bitis) + '</div>' : '') + '</div>' +
    '<div class="kart"><div class="sol">Bu ay indirme</div><div class="sayi">' + d.kullanilan + ' / ' + lim + '</div></div>' +
    '<div class="kart"><div class="sol">Hesap</div><div style="margin-top:.4rem">' + esc(o.email) + '</div></div>' +
    '<div class="kart"><a class="btn ana" href="studyo">Yeni spot yap</a></div>';

  /* Paketler ve başvuru */
  var tl = function (n) { return Number(n).toLocaleString('tr-TR') + ' TL'; };
  function maddeler(md, varsayilan) { var L = (md || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); return L.length ? L : varsayilan; }
  var PK = [
    { k: 'ucretsiz', ad: AY.paket_ucretsiz_ad, fy: '0 TL', md: maddeler(AY.paket_ucretsiz_md, ['Ayda ' + AY.ucretsiz_indirme_limiti + ' MP3 indirme', 'Otomatik ve manuel stüdyo', 'Bize gönder (seslendirme siparişi)']) },
    { k: 'pro_aylik', ad: AY.paket_aylik_ad, fy: tl(AY.pro_aylik_fiyat) + ' / ay', md: maddeler(AY.paket_aylik_md, [(+AY.pro_aylik_limit ? 'Ayda ' + AY.pro_aylik_limit + ' MP3 indirme' : 'Sınırsız MP3 indirme'), 'Yapay zeka modu (ayda ' + AY.yz_mesaj_limiti + ' mesaj)', 'Bize gönder (seslendirme siparişi)']) },
    { k: 'pro_yillik', ad: AY.paket_yillik_ad, fy: tl(AY.pro_yillik_fiyat) + ' / yıl', md: maddeler(AY.paket_yillik_md, [(+AY.pro_yillik_limit ? 'Ayda ' + AY.pro_yillik_limit + ' MP3 indirme' : 'Sınırsız MP3 indirme'), 'Yapay zeka modu (ayda ' + AY.yz_mesaj_limiti + ' mesaj)', 'Bize gönder (seslendirme siparişi)']) }
  ];
  var DB = { beklemede: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  function odemeKutusu(b) {
    var kod = Veri.basvuruKod(b), banka = AY.banka_adi, iban = AY.iban, sahip = AY.hesap_sahibi;
    var wa = 'https://wa.me/' + (AY.whatsapp || '905331509890') + '?text=' + encodeURIComponent('Merhaba, ' + Veri.planAd(b.paket) + ' için ödeme yaptım. Başvuru kodum: ' + kod + ' (' + o.email + ')');
    var bilgi = (banka || iban) ? '<table class="odT"><tr><td class="sol">Tutar</td><td><b>' + tl(b.fiyat_tl) + '</b></td></tr><tr><td class="sol">Banka</td><td>' + esc(banka || '—') + '</td></tr><tr><td class="sol">Hesap sahibi</td><td>' + esc(sahip || '—') + '</td></tr><tr><td class="sol">IBAN</td><td><b id="ibanMetin">' + esc(iban || '—') + '</b> <button class="btn kucuk" id="ibanKopya">Kopyala</button></td></tr><tr><td class="sol">Havale açıklaması</td><td><b>' + kod + '</b> <span class="sol">(bu kodu açıklamaya yazın)</span></td></tr></table>' : '<div class="sol" style="margin:.5rem 0">Ödeme bilgileri için WhatsApp’tan bize yazın. Başvuru kodunuz: <b>' + kod + '</b></div>';
    return '<div class="pkNot"><b>Başvurunuz alındı: ' + esc(Veri.planAd(b.paket)) + '</b>' + bilgi + (AY.odeme_notu ? '<div class="sol" style="margin:.4rem 0">' + esc(AY.odeme_notu) + '</div>' : '') + '<div class="sol" style="margin:.4rem 0">Ödemeyi yaptıktan sonra aşağıdaki düğmeyle bize haber verin. Ödemeyi gördüğümüzde paketiniz açılır.</div><a class="btn ana kucuk" target="_blank" rel="noopener" href="' + wa + '">Ödemeyi yaptım, WhatsApp’tan haber ver</a></div>';
  }
  function tcGecerli(t) {
    if (!/^[1-9][0-9]{10}$/.test(t)) return false; var d = t.split('').map(Number);
    var a = (d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7]); if (((a % 10) + 10) % 10 !== d[9]) return false;
    return d.slice(0, 10).reduce(function (s, x) { return s + x; }, 0) % 10 === d[10];
  }
  function faturaFormu(pk, B) {
    var son = (B.filter(function (x) { return x.fatura; })[0] || {}).fatura || {}, tur = son.tur || 'bireysel';
    var f = function (id, et, d, ek) { return '<div style="margin-bottom:.6rem"><label>' + et + '</label><input id="' + id + '" value="' + esc(d || '') + '" ' + (ek || '') + '></div>'; };
    var yeniId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('d' + Math.random().toString(36).slice(2, 10)), fiyat = +(pk === 'pro_yillik' ? AY.pro_yillik_fiyat : AY.pro_aylik_fiyat), kod = Veri.basvuruKod({ id: yeniId });
    var wa = 'https://wa.me/' + (AY.whatsapp || '905331509890') + '?text=' + encodeURIComponent('Merhaba, ' + Veri.planAd(pk) + ' için ödeme yaptım. Başvuru kodum: ' + kod + ' (' + o.email + ')');
    var odeme = ((AY.banka_adi || AY.iban) ? '<table class="odT"><tr><td class="sol">Tutar</td><td><b style="font-size:1.3rem">' + tl(fiyat) + '</b></td></tr><tr><td class="sol">Banka</td><td>' + esc(AY.banka_adi || '—') + '</td></tr><tr><td class="sol">Hesap sahibi</td><td>' + esc(AY.hesap_sahibi || '—') + '</td></tr><tr><td class="sol">IBAN</td><td><b id="ibanMetin3">' + esc(AY.iban || '—') + '</b> <button class="btn kucuk" id="ibanKopya3">Kopyala</button></td></tr><tr><td class="sol">Havale açıklaması</td><td><b>' + kod + '</b> <span class="sol">(bu kodu açıklamaya yazın)</span></td></tr></table>' : '<div style="margin:.3rem 0"><div class="sol">Tutar</div><b style="font-size:1.3rem">' + tl(fiyat) + '</b><div class="sol" style="margin-top:.5rem">Ödeme bilgileri için WhatsApp’tan bize yazın. Başvuru kodunuz: <b>' + kod + '</b></div></div>') + (AY.odeme_notu ? '<div class="sol" style="margin:.4rem 0">' + esc(AY.odeme_notu) + '</div>' : '');
    $('#pkMesaj').innerHTML = '<div class="pkNot"><div class="sol" style="margin-bottom:.5rem"><b style="color:var(--pirinc,#c9a24a)">1. Ödeme</b> &nbsp;›&nbsp; 2. Fatura/firma bilgisi &nbsp;›&nbsp; 3. Siparişi tamamla</div><h2 style="font-size:1.5rem;margin-bottom:.3rem">' + esc(Veri.planAd(pk)) + ' için ödeme</h2><div style="background:rgba(224,58,44,.12);border:1px solid #e03a2c;border-radius:8px;padding:.6rem .8rem;margin:.5rem 0 .9rem"><b>Başvurunuzun tamamlanması için önce ödemeyi yapmanız gerekir.</b><div class="sol">Aşağıdaki hesaba havale/EFT yapın. Sonra bilgilerinizi doldurup “Siparişi tamamla”ya basın.</div></div>' + odeme + '<h3 style="font-size:1.2rem;margin:1.1rem 0 .3rem">Fatura / firma bilgileri</h3><div class="sol" style="margin:0 0 .8rem">Faturanız bu bilgilere göre kesilir. Bilgileri sadece biz görürüz.</div>' +
      '<div style="display:flex;gap:1.2rem;margin-bottom:.8rem"><label style="display:flex;gap:.4rem;align-items:center;margin:0"><input type="radio" name="ftur" value="bireysel" style="width:auto"' + (tur === 'bireysel' ? ' checked' : '') + '> Bireysel</label><label style="display:flex;gap:.4rem;align-items:center;margin:0"><input type="radio" name="ftur" value="ticari" style="width:auto"' + (tur === 'ticari' ? ' checked' : '') + '> Şirket (ticari)</label></div>' +
      '<div id="fBir">' + f('f_ad', 'Ad Soyad', son.ad || o.ad) + f('f_tc', 'TC kimlik no', son.tc, 'inputmode="numeric" maxlength="11"') + '</div>' +
      '<div id="fTic">' + f('f_unvan', 'Ticari unvan', son.unvan) + f('f_vd', 'Vergi dairesi', son.vd) + f('f_vkn', 'Vergi numarası', son.vkn, 'inputmode="numeric" maxlength="10"') + '</div>' +
      '<div style="margin-bottom:.6rem"><label>Fatura adresi</label><textarea id="f_adres" rows="3" style="width:100%">' + esc(son.adres || '') + '</textarea></div>' +
      '<label style="display:flex;gap:.5rem;align-items:flex-start;margin:.4rem 0 .8rem;font-size:13px;font-weight:400"><input type="checkbox" id="f_kvkk" style="width:auto;margin-top:3px"> Kimlik/vergi bilgilerimin yalnızca fatura düzenlemek amacıyla işlenmesini kabul ediyorum. <a href="kvkk" target="_blank" rel="noopener">Aydınlatma metni</a></label>' +
      '<button class="btn ana" id="fGonder">Siparişi tamamla</button> <button class="btn" id="fIptal">Vazgeç</button></div>';
    var ov = document.createElement('div'); ov.id = 'odemeEkr'; ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);overflow:auto;padding:3vh 12px;display:flex;align-items:flex-start;justify-content:center';
    var kutu = document.createElement('div'); kutu.style.cssText = 'background:var(--y2,#1c2026);border:1px solid var(--cizgi,#333);border-radius:14px;max-width:680px;width:100%;padding:1.2rem'; kutu.appendChild($('#pkMesaj').firstElementChild); ov.appendChild(kutu); document.body.appendChild(ov);
    var kk = $('#ibanKopya3'); if (kk) kk.onclick = function () { try { navigator.clipboard.writeText($('#ibanMetin3').textContent.replace(/\s/g, '')); toast('IBAN kopyalandı'); } catch (x) { toast('Kopyalanamadı'); } };
    function goster() { var t = document.querySelector('input[name=ftur]:checked').value; $('#fBir').style.display = t === 'bireysel' ? '' : 'none'; $('#fTic').style.display = t === 'ticari' ? '' : 'none'; }
    $$('input[name=ftur]').forEach(function (r) { r.onchange = goster; }); goster();
    $('#fIptal').onclick = function () { ov.remove(); paketCiz(); };
    $('#fGonder').onclick = async function () {
      var t = document.querySelector('input[name=ftur]:checked').value, v = function (i) { return $('#' + i).value.trim(); }, fa = { tur: t, adres: v('f_adres') };
      if (t === 'bireysel') { fa.ad = v('f_ad'); fa.tc = v('f_tc').replace(/\s/g, ''); if (fa.ad.length < 3) return toast('Ad soyad yazın.'); if (!tcGecerli(fa.tc)) return toast('TC kimlik numarası geçersiz (11 hane).'); }
      else { fa.unvan = v('f_unvan'); fa.vd = v('f_vd'); fa.vkn = v('f_vkn').replace(/\s/g, ''); if (fa.unvan.length < 3) return toast('Ticari unvanı yazın.'); if (!fa.vd) return toast('Vergi dairesini yazın.'); if (!/^[0-9]{10}$/.test(fa.vkn)) return toast('Vergi numarası 10 haneli olmalı.'); }
      if (fa.adres.length < 10) return toast('Fatura adresini tam yazın.');
      if (!$('#f_kvkk').checked) return toast('KVKK onayını işaretleyin.');
      this.disabled = true;
      try { await Veri.basvuruYap(pk, fa, yeniId); kutu.innerHTML = '<h2 style="font-size:1.5rem;margin-bottom:.4rem">Başvurunuz alındı ✓</h2><div class="sol" style="margin-bottom:.8rem">Kodunuz: <b>' + kod + '</b>. Havaleyi henüz yapmadıysanız yukarıdaki hesaba yapın. Ödemeyi gördüğümüzde paketiniz açılır.</div><a class="btn ana" target="_blank" rel="noopener" href="' + wa + '">Ödemeyi yaptım, WhatsApp’tan haber ver</a> <button class="btn" id="odemeKapat">Kapat</button>'; $('#odemeKapat').onclick = function () { ov.remove(); }; await paketCiz(); } catch (e) { toast(e.message); this.disabled = false; }
    };
  }
  function odemeEkrani(b) {
    var e = document.createElement('div'); e.id = 'odemeEkr'; e.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 12px';
    var h = odemeKutusu(b).replace(/ibanMetin/g, 'ibanMetin2').replace(/ibanKopya/g, 'ibanKopya2');
    e.innerHTML = '<div style="background:var(--y2,#1c2026);border:1px solid var(--cizgi,#333);border-radius:14px;max-width:640px;width:100%;padding:1.4rem 1.4rem 1.2rem"><div class="sol" style="margin-bottom:.6rem">1. Fatura bilgisi ✓ &nbsp;›&nbsp; <b style="color:var(--pirinc,#c9a24a)">2. Ödeme</b> &nbsp;›&nbsp; 3. Paketiniz açılır</div><h2 style="font-size:1.6rem;margin-bottom:.3rem">Şimdi ödemeyi yapın</h2><div class="sol" style="margin-bottom:.8rem">Aşağıdaki hesaba, açıklamaya kodunuzu yazarak havale/EFT yapın. Sonra “Ödemeyi yaptım” düğmesiyle bize haber verin. Ödemeyi gördüğümüzde paketiniz açılır.</div>' + h + '<div style="margin-top:1rem;text-align:right"><button class="btn" id="odemeKapat">Kapat</button></div></div>';
    document.body.appendChild(e);
    $('#odemeKapat').onclick = function () { e.remove(); };
    var k2 = $('#ibanKopya2'); if (k2) k2.onclick = function () { try { navigator.clipboard.writeText($('#ibanMetin2').textContent.replace(/\s/g, '')); toast('IBAN kopyalandı'); } catch (x) { toast('Kopyalanamadı'); } };
  }
  async function paketCiz(goster) {
    var B = await Veri.basvurularim().catch(function () { return []; }), bekleyen = B.filter(function (x) { return x.durum === 'beklemede'; })[0];
    var mevcut = Veri.isPro(o.plan) ? o.plan : 'ucretsiz';
    $('#paketler').innerHTML = PK.map(function (x) {
      var btn = x.k === 'ucretsiz' ? '' : (x.k === mevcut ? '<button class="btn" disabled>Mevcut paketiniz</button>' : '<button class="btn ana" data-pk="' + x.k + '"' + (bekleyen ? ' disabled' : '') + '>' + (Veri.isPro(o.plan) ? 'Bu pakete geç' : 'Pro için başvur') + '</button>');
      return '<div class="pk' + (x.k === mevcut ? ' mevcut' : '') + '"><h3>' + esc(x.ad) + '</h3><div class="fy">' + x.fy + '</div><ul>' + x.md.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' + (x.k === 'ucretsiz' && mevcut === 'ucretsiz' ? '<button class="btn" disabled>Mevcut paketiniz</button>' : btn) + '</div>';
    }).join('');
    $('#pkMesaj').innerHTML = bekleyen ? '<div class="sol" style="margin:.4rem 0">Ödeme bekleyen başvurunuz var: ödeme bilgileri aşağıda.</div>' + odemeKutusu(bekleyen) : '';
    var kb = $('#ibanKopya'); if (kb) kb.onclick = function () { try { navigator.clipboard.writeText($('#ibanMetin').textContent.replace(/\s/g, '')); toast('IBAN kopyalandı'); } catch (e) { toast('Kopyalanamadı'); } };
    $('#basvurular').innerHTML = B.length ? '<table><tr><th>Başvuru tarihi</th><th>Kod</th><th>Paket</th><th>Tutar</th><th>Durum</th></tr>' + B.map(function (x) { return '<tr><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td><td>' + Veri.basvuruKod(x) + '</td><td>' + esc(Veri.planAd(x.paket)) + '</td><td>' + tl(x.fiyat_tl) + '</td><td><span class="etiket' + (x.durum === 'onaylandi' ? ' p' : '') + '">' + DB[x.durum] + '</span></td></tr>'; }).join('') + '</table>' : '';
    $$('[data-pk]').forEach(function (b) {
      b.onclick = async function () {
        faturaFormu(b.dataset.pk, B);
      };
    });
  }
  paketCiz();
  var l = await Veri.indirmeler(o.id);
  $('#liste').innerHTML = l.length ? '<table><tr><th>Proje</th><th>Tür</th><th>Tarih</th></tr>' + l.map(function (x) {
    return '<tr><td>' + esc(x.proje_adi) + '</td><td><span class="etiket">' + esc(x.tur) + '</span></td><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz indirme yok. Stüdyoda bir spot hazırlayıp MP3 olarak indirin.';
  var sp = await Veri.siparislerim(), DU = { yeni: 'Yeni', hazirlaniyor: 'Hazırlanıyor', tamamlandi: 'Tamamlandı' };
  $('#siparisler').innerHTML = sp.length ? '<table><tr><th>Tarih</th><th>Metin</th><th>Seslendirmen / müzik</th><th>Tutar</th><th>Durum</th><th></th></tr>' + sp.map(function (x) {
    return '<tr><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td><td style="max-width:320px">' + esc((x.metin || '').slice(0, 90)) + ((x.metin || '').length > 90 ? '…' : '') + '</td><td>' + esc(x.ses_adi || '-') + ' / ' + esc(x.muzik_adi || '-') + '</td><td>' + (+x.toplam_tl ? tl(x.toplam_tl) + ' <span class="etiket">' + (x.odeme_durum === 'odendi' ? 'Ödendi' : 'Ödeme bekleniyor') + '</span>' + (x.odeme_durum !== 'odendi' && AY.kart_odeme === '1' ? ' <button class="btn kucuk ana kartOde" data-id="' + esc(x.id) + '">Kartla öde</button>' : '') : '-') + '</td><td><span class="etiket">' + esc(DU[x.durum] || x.durum) + '</span></td><td>' + (x.sonuc_url ? '<a class="btn kucuk ana" target="_blank" rel="noopener" href="' + esc(x.sonuc_url) + '">İndir</a>' : '') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz sipariş yok.';
  $$('.kartOde').forEach(function (b) { b.onclick = async function () { b.disabled = true; try { location.href = await Veri.odemeBaslat(b.dataset.id); } catch (e) { b.disabled = false; toast(e.message); } }; });
  var od = new URLSearchParams(location.search).get('odeme'); if (od) { toast(od === 'ok' ? 'Ödemeniz alındı, teşekkürler. Siparişiniz üretime alınacak.' : 'Ödeme tamamlanamadı. Tekrar deneyebilir ya da havale ile ödeyebilirsiniz.'); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
})();
