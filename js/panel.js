(async function () {
  var o = await korumali('panel'); if (!o) return;
  var d = await Veri.hakDurumu(), lim = d.limit > 0 ? d.limit : 'sınırsız';
  $('#ozet').innerHTML =
    '<div class="kart"><div class="sol">Üyelik</div><div class="sayi">' + (o.plan === 'premium' ? 'Premium plan' : 'Ücretsiz plan') + '</div>' + (o.plan_bitis ? '<div class="sol">Bitiş: ' + esc(o.plan_bitis) + '</div>' : '') + '</div>' +
    '<div class="kart"><div class="sol">Bu ay indirme</div><div class="sayi">' + d.kullanilan + ' / ' + lim + '</div></div>' +
    '<div class="kart"><div class="sol">Hesap</div><div style="margin-top:.4rem">' + esc(o.email) + '</div></div>' +
    '<div class="kart"><a class="btn ana" href="studyo.html">Yeni spot yap</a></div>';
  var l = await Veri.indirmeler(o.id);
  $('#liste').innerHTML = l.length ? '<table><tr><th>Proje</th><th>Tür</th><th>Tarih</th></tr>' + l.map(function (x) {
    return '<tr><td>' + esc(x.proje_adi) + '</td><td><span class="etiket">' + esc(x.tur) + '</span></td><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz indirme yok. Stüdyoda bir spot hazırlayıp MP3 olarak indirin.';
  var sp = await Veri.siparislerim(), DU = { yeni: 'Yeni', hazirlaniyor: 'Hazırlanıyor', tamamlandi: 'Tamamlandı' };
  $('#siparisler').innerHTML = sp.length ? '<table><tr><th>Tarih</th><th>Metin</th><th>Seslendirmen / müzik</th><th>Durum</th><th></th></tr>' + sp.map(function (x) {
    return '<tr><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td><td style="max-width:320px">' + esc((x.metin || '').slice(0, 90)) + ((x.metin || '').length > 90 ? '…' : '') + '</td><td>' + esc(x.ses_adi || '-') + ' / ' + esc(x.muzik_adi || '-') + '</td><td><span class="etiket">' + esc(DU[x.durum] || x.durum) + '</span></td><td>' + (x.sonuc_url ? '<a class="btn kucuk ana" target="_blank" rel="noopener" href="' + esc(x.sonuc_url) + '">İndir</a>' : '') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz sipariş yok.';
  async function oynatici(tablo, kap) {
    var L = await Veri.liste(tablo); if (!L.length) return; var h = '';
    for (var i = 0; i < L.length; i++) { var u = await Veri.url(L[i], tablo); h += '<div style="margin-bottom:.7rem"><div>' + esc(L[i].ad) + ' <span class="sol">' + esc(L[i].etiket || L[i].aciklama || '') + '</span></div><audio controls preload="none" src="' + esc(u) + '" style="width:100%;height:34px"></audio></div>'; }
    $(kap).innerHTML = h;
  }
  oynatici('sesler', '#sesler'); oynatici('muzikler', '#muzikler');
})();
