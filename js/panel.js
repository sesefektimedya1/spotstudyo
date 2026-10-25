(async function () {
  var o = await korumali('panel'); if (!o) return;
  var d = await Veri.hakDurumu(), lim = d.limit > 0 ? d.limit : 'sınırsız';
  $('#ozet').innerHTML =
    '<div class="kart"><div class="sol">Üyelik</div><div class="sayi">' + (o.plan === 'premium' ? 'Premium' : 'Ücretsiz') + '</div>' + (o.plan_bitis ? '<div class="sol">Bitiş: ' + esc(o.plan_bitis) + '</div>' : '') + '</div>' +
    '<div class="kart"><div class="sol">Bu ay indirme</div><div class="sayi">' + d.kullanilan + ' / ' + lim + '</div></div>' +
    '<div class="kart"><div class="sol">Hesap</div><div style="margin-top:.4rem">' + esc(o.email) + '</div></div>' +
    '<div class="kart"><a class="btn ana" href="studyo.html">Yeni spot yap</a></div>';
  var l = await Veri.indirmeler(o.id);
  $('#liste').innerHTML = l.length ? '<table><tr><th>Proje</th><th>Tür</th><th>Tarih</th></tr>' + l.map(function (x) {
    return '<tr><td>' + esc(x.proje_adi) + '</td><td><span class="etiket">' + esc(x.tur) + '</span></td><td>' + new Date(x.created_at).toLocaleString('tr-TR') + '</td></tr>';
  }).join('') + '</table>' : 'Henüz indirme yok. Stüdyoda bir spot hazırlayıp MP3 olarak indirin.';
  async function oynatici(tablo, kap) {
    var L = await Veri.liste(tablo); if (!L.length) return; var h = '';
    for (var i = 0; i < L.length; i++) { var u = await Veri.url(L[i], tablo); h += '<div style="margin-bottom:.7rem"><div>' + esc(L[i].ad) + ' <span class="sol">' + esc(L[i].etiket || L[i].aciklama || '') + '</span></div><audio controls preload="none" src="' + esc(u) + '" style="width:100%;height:34px"></audio></div>'; }
    $(kap).innerHTML = h;
  }
  oynatici('sesler', '#sesler'); oynatici('muzikler', '#muzikler');
})();
