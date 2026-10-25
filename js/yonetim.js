(async function () {
  var o = await korumali('yonetim', true); if (!o) return;
  var ic = $('#icerik'), SAYFA = 25, durum = { sayfa: 0, ara: '', plan: '' };
  $$('#sekme button').forEach(function (b) { b.onclick = function () { $$('#sekme button').forEach(function (x) { x.classList.remove('acik'); }); b.classList.add('acik'); ac(b.dataset.s); }; });
  function ac(s) { ({ ozet: ozet, siparis: siparis, geri: geri, uyeler: uyeler, sesler: kutuphane.bind(null, 'sesler'), muzikler: kutuphane.bind(null, 'muzikler'), ayar: ayar })[s](); }

  async function ozet() {
    var z = await Veri.ozet();
    ic.innerHTML = '<div class="izgara g4">' + [['Toplam üye', z.uye], ['Premium üye', z.premium], ['Bu ay indirme', z.bu_ay], ['Seslendirme kaydı', z.ses], ['Müzik', z.muzik]].map(function (a) { return '<div class="kart"><div class="sol">' + a[0] + '</div><div class="sayi">' + a[1] + '</div></div>'; }).join('') + '</div>';
  }

  async function siparis() {
    var L = await Veri.siparisTum();
    ic.innerHTML = '<div class="kart">' + (L.length ? L.map(function (x) {
      return '<div class="sipSatir" data-id="' + x.id + '" style="padding:.9rem 0;border-bottom:1px solid var(--cizgi)"><div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:baseline"><b>' + esc(x.ad || '') + '</b><span class="sol">' + esc(x.telefon || '') + ' · ' + esc(x.eposta || '') + '</span><span class="sol">' + new Date(x.created_at).toLocaleString('tr-TR') + '</span><span class="etiket">' + esc(x.tur || '') + '</span></div>' +
        '<div style="margin:.4rem 0;white-space:pre-wrap">' + esc(x.metin || '') + '</div><div class="sol" style="font-size:13px">Seslendirmen: ' + esc(x.ses_adi || '-') + ' · Müzik: ' + esc(x.muzik_adi || '-') + (x.notu ? ' · Not: ' + esc(x.notu) : '') + '</div>' +
        '<div style="display:flex;gap:.6rem;margin-top:.6rem;flex-wrap:wrap"><select class="dr" style="max-width:170px"><option value="yeni">Yeni</option><option value="hazirlaniyor">Hazırlanıyor</option><option value="tamamlandi">Tamamlandı</option></select><input type="text" class="su" placeholder="Hazır dosyanın indirme bağlantısı" value="' + esc(x.sonuc_url || '') + '" style="flex:1;min-width:240px"><button class="btn kucuk ana kyd">Kaydet</button></div></div>';
    }).join('') : '<span class="sol">Henüz sipariş yok.</span>') + '</div>';
    $$('.sipSatir', ic).forEach(function (tr, i) {
      tr.querySelector('.dr').value = L[i].durum;
      tr.querySelector('.kyd').onclick = async function () { try { await Veri.siparisGuncelle(L[i].id, { durum: tr.querySelector('.dr').value, sonuc_url: tr.querySelector('.su').value.trim() }); toast('Kaydedildi'); } catch (e) { toast(e.message); } };
    });
  }

  async function geri() {
    var L = await Veri.geriBildirimTum();
    ic.innerHTML = '<div class="kart">' + (L.length ? L.map(function (x) {
      return '<div style="padding:.8rem 0;border-bottom:1px solid var(--cizgi)"><div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:baseline"><span class="etiket">' + esc(x.tur || '') + '</span><b>' + esc(x.eposta || 'Üye değil') + '</b><span class="sol">' + new Date(x.created_at).toLocaleString('tr-TR') + ' · ' + esc(x.sayfa || '') + '</span></div><div style="margin-top:.35rem;white-space:pre-wrap">' + esc(x.mesaj || '') + '</div></div>';
    }).join('') : '<span class="sol">Henüz geri bildirim yok.</span>') + '</div>';
  }

  async function uyeler() {
    ic.innerHTML = '<div class="kart"><div style="display:flex;gap:.6rem;margin-bottom:1rem;flex-wrap:wrap"><input type="search" id="ara" placeholder="Ad veya e-posta ara" style="max-width:300px" value="' + esc(durum.ara) + '"><select id="pf" style="max-width:180px"><option value="">Tüm üyelikler</option><option value="ucretsiz">Ücretsiz</option><option value="premium">Premium</option></select></div><div id="tab">Yükleniyor…</div></div>';
    $('#pf').value = durum.plan;
    var zm; $('#ara').oninput = function () { clearTimeout(zm); zm = setTimeout(function () { durum.ara = $('#ara').value.trim(); durum.sayfa = 0; yukle(); }, 300); };
    $('#pf').onchange = function () { durum.plan = $('#pf').value; durum.sayfa = 0; yukle(); };
    yukle();
  }
  async function yukle() {
    var r = await Veri.uyeler({ ara: durum.ara, plan: durum.plan, sayfa: durum.sayfa, adet: SAYFA }), top = Math.max(1, Math.ceil(r.toplam / SAYFA));
    $('#tab').innerHTML = '<div style="overflow-x:auto"><table><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Üyelik</th><th>Bitiş</th><th>Bu ay</th><th>Kayıt</th></tr>' + r.satirlar.map(function (u) {
      return '<tr data-id="' + u.id + '"><td>' + esc(u.ad) + '</td><td>' + esc(u.email) + '</td><td><select class="rol"><option value="uye">Üye</option><option value="seslendirmen">Seslendirmen</option><option value="admin">Yönetici</option></select></td>' +
        '<td><select class="pl"><option value="ucretsiz">Ücretsiz</option><option value="premium">Premium</option></select></td><td><input type="date" class="bt" value="' + (u.plan_bitis || '') + '" style="width:140px"></td><td>' + u.bu_ay_indirme + '</td><td>' + new Date(u.created_at).toLocaleDateString('tr-TR') + '</td></tr>';
    }).join('') + '</table></div><div style="display:flex;gap:.8rem;align-items:center;margin-top:1rem"><button class="btn kucuk" id="on" ' + (durum.sayfa === 0 ? 'disabled' : '') + '>Önceki</button><span class="sol">' + r.toplam + ' üye · sayfa ' + (durum.sayfa + 1) + ' / ' + top + '</span><button class="btn kucuk" id="sn" ' + (durum.sayfa + 1 >= top ? 'disabled' : '') + '>Sonraki</button></div>';
    $$('#tab tr[data-id]').forEach(function (tr, i) {
      var u = r.satirlar[i]; tr.querySelector('.rol').value = u.role; tr.querySelector('.pl').value = u.plan;
      async function kaydet() { try { await Veri.uyeGuncelle(u.id, { role: tr.querySelector('.rol').value, plan: tr.querySelector('.pl').value, plan_bitis: tr.querySelector('.bt').value || null }); toast('Kaydedildi'); } catch (e) { toast(e.message); } }
      $$('select,input', tr).forEach(function (x) { x.onchange = kaydet; });
    });
    $('#on').onclick = function () { durum.sayfa--; yukle(); }; $('#sn').onclick = function () { durum.sayfa++; yukle(); };
  }

  async function kutuphane(t) {
    var ses = t === 'sesler', L = await Veri.hepsi(t);
    ic.innerHTML = '<div class="kart" style="margin-bottom:1rem"><h3 style="font-size:1.3rem;margin-bottom:.7rem">' + (ses ? 'Yeni seslendirmen örneği' : 'Yeni müzik') + '</h3><div class="izgara g3"><div><label>Ad</label><input type="text" id="k-ad" placeholder="' + (ses ? 'Seslendirmen adı' : 'Müzik adı') + '"></div><div><label>' + (ses ? 'Açıklama (ör. sıcak erkek sesi)' : 'Tür (ör. enerjik, sakin)') + '</label><input type="text" id="k-ac"></div>' + (ses ? '<div><label>Fiyat (TL, isteğe bağlı)</label><input type="number" id="k-fy" min="0"></div>' : '') + '<div><label>Ses dosyası</label><input type="file" id="k-dosya" accept="audio/*"></div></div><div style="margin-top:.8rem"><button class="btn ana" id="k-yukle">Yükle</button> <span class="sol" id="k-dur"></span></div></div><div class="kart"><div id="k-liste"></div></div>';
    var tu = $('#k-liste');
    async function ciz() {
      L = await Veri.hepsi(t); var h = '';
      for (var i = 0; i < L.length; i++) { var u = await Veri.url(L[i], t); h += '<div style="display:flex;gap:1rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--cizgi);flex-wrap:wrap"><div style="min-width:180px"><b>' + esc(L[i].ad) + '</b><div class="sol" style="font-size:13px">' + esc(L[i].aciklama || L[i].etiket || '') + '</div></div><audio controls preload="none" src="' + esc(u) + '" style="height:34px"></audio><label style="margin:0"><input type="checkbox" data-a="' + L[i].id + '" ' + (L[i].aktif ? 'checked' : '') + '> Yayında</label><button class="btn kucuk" data-sil="' + L[i].id + '">Sil</button></div>'; }
      tu.innerHTML = h || '<span class="sol">Henüz kayıt yok.</span>';
      $$('[data-a]', tu).forEach(function (c) { c.onchange = async function () { await Veri.guncelle(t, c.dataset.a, { aktif: c.checked }); toast('Kaydedildi'); }; });
      $$('[data-sil]', tu).forEach(function (b) { b.onclick = async function () { if (confirm('Silinsin mi?')) { await Veri.sil(t, b.dataset.sil); ciz(); } }; });
    }
    $('#k-yukle').onclick = async function () {
      var f = $('#k-dosya').files[0], ad = $('#k-ad').value.trim(); if (!ad || !f) { toast('Ad ve dosya gerekli'); return; }
      $('#k-dur').textContent = 'Yükleniyor…';
      try {
        var meta = ses ? { ad: ad, aciklama: $('#k-ac').value.trim(), fiyat_tl: +($('#k-fy').value) || null } : { ad: ad, etiket: $('#k-ac').value.trim() };
        await Veri.ekle(t, meta, f); toast('Yüklendi'); ['k-ad', 'k-ac'].forEach(function (i) { $('#' + i).value = ''; }); $('#k-dosya').value = ''; $('#k-dur').textContent = ''; ciz();
      } catch (e) { $('#k-dur').textContent = e.message; }
    };
    ciz();
  }

  async function ayar() {
    var a = await Veri.ayarlar();
    ic.innerHTML = '<div class="kart" style="max-width:520px"><h3 style="font-size:1.3rem;margin-bottom:.8rem">Aylık indirme hakkı</h3><label>Ücretsiz üye (ayda MP3 indirme)</label><input type="number" id="a1" min="0" value="' + esc(a.ucretsiz_indirme_limiti) + '"><label style="margin-top:.8rem">Premium üye (0 = sınırsız)</label><input type="number" id="a2" min="0" value="' + esc(a.premium_indirme_limiti) + '"><div style="margin-top:1rem"><button class="btn ana" id="a-k">Kaydet</button></div><p class="sol" style="margin-top:1rem;font-size:13px">Denemeler sınırsızdır. Yalnız MP3 indirme sayılır.</p></div>';
    $('#a-k').onclick = async function () { await Veri.ayarKaydet('ucretsiz_indirme_limiti', $('#a1').value || 0); await Veri.ayarKaydet('premium_indirme_limiti', $('#a2').value || 0); toast('Kaydedildi'); };
  }
  ozet();
})();
