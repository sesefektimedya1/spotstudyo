(async function () {
  var o = await korumali('panel'); if (!o) return;
  var d = await Veri.hakDurumu(), lim = d.limit > 0 ? d.limit : 'sınırsız';
  var AY = await Veri.ayarlar();
  $('#ozet').innerHTML =
    '<div class="kart"><div class="sol">Üyelik</div><div class="sayi" style="font-size:2rem">' + Veri.planAd(o.plan) + '</div>' + (o.plan_bitis ? '<div class="sol">Bitiş: ' + esc(o.plan_bitis) + '</div>' : '') + '</div>' +
    '<div class="kart"><div class="sol">Bu ay indirme</div><div class="sayi">' + d.kullanilan + ' / ' + lim + '</div></div>' +
    '<div class="kart"><div class="sol">Hesap</div><div style="margin-top:.4rem">' + esc(o.email) + '</div></div>' +
    '<div class="kart"><a class="btn ana" href="studyo">Yeni spot yap</a></div>';

  /* Paketler ve başvuru */
  var tl = function (n) { return Number(n).toLocaleString('tr-TR') + ' TL'; };
  var PK = [
    { k: 'ucretsiz', ad: 'Ücretsiz', fy: '0 TL', md: ['Ayda ' + AY.ucretsiz_indirme_limiti + ' MP3 indirme', 'Otomatik ve manuel stüdyo', 'Bize gönder (seslendirme siparişi)'] },
    { k: 'pro_aylik', ad: 'Pro Aylık', fy: tl(AY.pro_aylik_fiyat) + ' / ay', md: ['Ayda ' + AY.pro_aylik_limit + ' MP3 indirme', 'Yapay zeka modu (ayda ' + AY.yz_mesaj_limiti + ' mesaj)', 'Bize gönder (seslendirme siparişi)'] },
    { k: 'pro_yillik', ad: 'Pro Yıllık', fy: tl(AY.pro_yillik_fiyat) + ' / yıl', md: ['Ayda ' + AY.pro_yillik_limit + ' MP3 indirme', 'Yapay zeka modu (ayda ' + AY.yz_mesaj_limiti + ' mesaj)', 'Bize gönder (seslendirme siparişi)'] }
  ];
  var DB = { beklemede: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
  async function paketCiz() {
    var B = await Veri.basvurularim().catch(function () { return []; }), bekleyen = B.some(function (x) { return x.durum === 'beklemede'; });
    var mevcut = Veri.isPro(o.plan) ? o.plan : 'ucretsiz';
    $('#paketler').innerHTML = PK.map(function (x) {
      var btn = x.k === 'ucretsiz' ? '' : (x.k === mevcut ? '<button class="btn" disabled>Mevcut paketiniz</button>' : '<button class="btn ana" data-pk="' + x.k + '"' + (bekleyen ? ' disabled' : '') + '>' + (Veri.isPro(o.plan) ? 'Bu pakete geç' : 'Pro için başvur') + '</button>');
      return '<div class="pk' + (x.k === mevcut ? ' mevcut' : '') + '"><h3>' + x.ad + '</h3><div class="fy">' + x.fy + '</div><ul>' + x.md.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' + (x.k === 'ucretsiz' && mevcut === 'ucretsiz' ? '<button class="btn" disabled>Mevcut paketiniz</button>' : btn) + '</div>';
    }).join('');
    $('#basvurular').innerHTML = B.length ? '<table><tr><th>Başvuru tarihi</th><th>Paket</th><th>Tutar</th><th>Durum</th></tr>' + B.map(function (x) { return '<tr><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td><td>' + esc(Veri.planAd(x.paket)) + '</td><td>' + tl(x.fiyat_tl) + '</td><td><span class="etiket' + (x.durum === 'onaylandi' ? ' p' : '') + '">' + DB[x.durum] + '</span></td></tr>'; }).join('') + '</table>' : '';
    $$('[data-pk]').forEach(function (b) {
      b.onclick = async function () {
        b.disabled = true;
        try {
          await Veri.basvuruYap(b.dataset.pk);
          var wa = 'https://wa.me/' + (AY.whatsapp || '905331509890') + '?text=' + encodeURIComponent('Merhaba, ' + Veri.planAd(b.dataset.pk) + ' paketine başvurdum. Ödeme bilgisini alabilir miyim? (' + o.email + ')');
          $('#pkMesaj').innerHTML = '<div class="pkNot"><b>Başvurunuz alındı.</b> Ödeme bilgisi için bize WhatsApp’tan yazın; ödemeyi gördüğümüzde paketiniz açılır. <a class="btn kucuk ana" target="_blank" rel="noopener" href="' + wa + '">WhatsApp’tan yaz</a></div>';
          paketCiz();
        } catch (e) { toast(e.message); b.disabled = false; }
      };
    });
  }
  paketCiz();
  var l = await Veri.indirmeler(o.id);
  $('#liste').innerHTML = l.length ? '<table><tr><th>Proje</th><th>Tür</th><th>Tarih</th></tr>' + l.map(function (x) {
    return '<tr><td>' + esc(x.proje_adi) + '</td><td><span class="etiket">' + esc(x.tur) + '</span></td><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz indirme yok. Stüdyoda bir spot hazırlayıp MP3 olarak indirin.';
  var sp = await Veri.siparislerim(), DU = { yeni: 'Yeni', hazirlaniyor: 'Hazırlanıyor', tamamlandi: 'Tamamlandı' };
  $('#siparisler').innerHTML = sp.length ? '<table><tr><th>Tarih</th><th>Metin</th><th>Seslendirmen / müzik</th><th>Durum</th><th></th></tr>' + sp.map(function (x) {
    return '<tr><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td><td style="max-width:320px">' + esc((x.metin || '').slice(0, 90)) + ((x.metin || '').length > 90 ? '…' : '') + '</td><td>' + esc(x.ses_adi || '-') + ' / ' + esc(x.muzik_adi || '-') + '</td><td><span class="etiket">' + esc(DU[x.durum] || x.durum) + '</span></td><td>' + (x.sonuc_url ? '<a class="btn kucuk ana" target="_blank" rel="noopener" href="' + esc(x.sonuc_url) + '">İndir</a>' : '') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz sipariş yok.';
})();
