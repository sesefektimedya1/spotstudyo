(async function () {
  var o = await korumali('yonetim', true); if (!o) return;
  var ic = $('#icerik'), SAYFA = 25, durum = { sayfa: 0, ara: '', plan: '' };
  $$('#sekme button').forEach(function (b) { b.onclick = function () { $$('#sekme button').forEach(function (x) { x.classList.remove('acik'); }); b.classList.add('acik'); ac(b.dataset.s); }; });
  function ac(s) { ({ ozet: ozet, basvuru: basvuru, siparis: siparis, geri: geri, uyeler: uyeler, kutup: kutupSayfa, ayar: ayar })[s](); }

  function tl(n) { return Number(n || 0).toLocaleString('tr-TR') + ' TL'; }
  async function rozet() { try { var z = await Veri.ozet(); var r = $('#bkRozet'); if (r) r.innerHTML = z.bekleyen > 0 ? '<span class="etiket p">' + z.bekleyen + '</span>' : ''; return z; } catch (e) { return null; } }
  async function ozet() {
    var z = await Veri.ozet(); rozet();
    ic.innerHTML = '<div class="izgara g4">' + [['Toplam üye', z.uye], ['Pro üye', z.premium], ['Onay bekleyen başvuru', z.bekleyen || 0], ['Bu ay indirme', z.bu_ay], ['Seslendirme kaydı', z.ses], ['Müzik', z.muzik]].map(function (a) { return '<div class="kart"><div class="sol">' + a[0] + '</div><div class="sayi">' + a[1] + '</div></div>'; }).join('') + '</div>';
  }

  async function basvuru() {
    var L = await Veri.basvuruTum(), bek = L.filter(function (x) { return x.durum === 'beklemede'; }), gec = L.filter(function (x) { return x.durum !== 'beklemede'; });
    var DB = { onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
    ic.innerHTML = '<div class="kart"><h3 style="font-size:1.3rem;margin-bottom:.7rem">Onay bekleyenler (' + bek.length + ')</h3>' + (bek.length ? bek.map(function (x) {
      return '<div class="bvSatir" data-id="' + x.id + '" style="padding:.8rem 0;border-bottom:1px solid var(--cizgi);display:flex;gap:1rem;flex-wrap:wrap;align-items:center"><div style="min-width:220px"><b>' + esc(x.ad || '') + '</b><div class="sol" style="font-size:13px">' + esc(x.eposta || '') + ' · ' + esc(x.telefon || 'telefon yok') + '</div></div><span class="etiket">' + Veri.basvuruKod(x) + '</span><span class="etiket p">' + esc(Veri.planAd(x.paket)) + '</span><b>' + tl(x.fiyat_tl) + '</b><span class="sol">' + new Date(x.created_at).toLocaleString('tr-TR') + '</span><span style="margin-left:auto;display:flex;gap:.5rem"><button class="btn ana kucuk ok">Ödeme geldi, onayla</button><button class="btn kucuk red">Reddet</button></span></div>';
    }).join('') : '<span class="sol">Bekleyen başvuru yok.</span>') + '</div>' +
    '<div class="kart" style="margin-top:1rem"><h3 style="font-size:1.3rem;margin-bottom:.7rem">Paket geçmişi</h3>' + (gec.length ? '<div style="overflow-x:auto"><table><tr><th>Başvuru</th><th>Kod</th><th>Ad</th><th>E-posta</th><th>Telefon</th><th>Paket</th><th>Tutar</th><th>Sonuç</th><th>İşlem tarihi</th></tr>' + gec.map(function (x) {
      return '<tr><td>' + new Date(x.created_at).toLocaleDateString('tr-TR') + '</td><td>' + Veri.basvuruKod(x) + '</td><td>' + esc(x.ad || '') + '</td><td>' + esc(x.eposta || '') + '</td><td>' + esc(x.telefon || '') + '</td><td>' + esc(Veri.planAd(x.paket)) + '</td><td>' + tl(x.fiyat_tl) + '</td><td><span class="etiket' + (x.durum === 'onaylandi' ? ' p' : '') + '">' + DB[x.durum] + '</span></td><td>' + (x.islem_tarihi ? new Date(x.islem_tarihi).toLocaleDateString('tr-TR') : '') + '</td></tr>';
    }).join('') + '</table></div>' : '<span class="sol">Henüz işlem yok.</span>') + '</div>';
    $$('.bvSatir', ic).forEach(function (tr) {
      async function karar(onay) { if (!confirm(onay ? 'Ödeme geldi, paket açılsın mı?' : 'Başvuru reddedilsin mi?')) return; try { await Veri.basvuruKarar(tr.dataset.id, onay); toast(onay ? 'Paket açıldı' : 'Reddedildi'); basvuru(); rozet(); } catch (e) { toast(e.message); } }
      tr.querySelector('.ok').onclick = function () { karar(true); }; tr.querySelector('.red').onclick = function () { karar(false); };
    });
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
    ic.innerHTML = '<div class="kart"><div style="display:flex;gap:.6rem;margin-bottom:1rem;flex-wrap:wrap"><input type="search" id="ara" placeholder="Ad, e-posta ya da telefon ara" style="max-width:300px" value="' + esc(durum.ara) + '"><select id="pf" style="max-width:180px"><option value="">Tüm paketler</option><option value="ucretsiz">Ücretsiz</option><option value="pro_aylik">Pro Aylık</option><option value="pro_yillik">Pro Yıllık</option></select></div><div id="tab"></div></div>';
    $('#pf').value = durum.plan;
    var zm; $('#ara').oninput = function () { clearTimeout(zm); zm = setTimeout(function () { durum.ara = $('#ara').value.trim(); durum.sayfa = 0; yukle(); }, 300); };
    $('#pf').onchange = function () { durum.plan = $('#pf').value; durum.sayfa = 0; yukle(); };
    yukle();
  }
  function kalan(b) { if (!b) return ''; var g = Math.ceil((new Date(b + 'T23:59:59') - new Date()) / 86400000); return g < 0 ? '<span style="color:#ff8f7e">Süresi bitti</span>' : g + ' gün'; }
  async function yukle() {
    var r = await Veri.uyeler({ ara: durum.ara, plan: durum.plan, sayfa: durum.sayfa, adet: SAYFA }), top = Math.max(1, Math.ceil(r.toplam / SAYFA));
    $('#tab').innerHTML = '<div style="overflow-x:auto"><table><tr><th>Ad Soyad</th><th>Telefon</th><th>E-posta</th><th>Üyelik tarihi</th><th>Paket</th><th>Ödeme</th><th>Bitiş tarihi</th><th>Kalan</th><th>Bu ay</th><th>Toplam indirme</th><th>Rol</th></tr>' + r.satirlar.map(function (u) {
      return '<tr data-id="' + u.id + '"><td>' + esc(u.ad) + '</td><td>' + esc(u.telefon || '—') + '</td><td>' + esc(u.email) + '</td><td>' + new Date(u.created_at).toLocaleDateString('tr-TR') + '</td>' +
        '<td><select class="pl"><option value="ucretsiz">Ücretsiz</option><option value="pro_aylik">Pro Aylık</option><option value="pro_yillik">Pro Yıllık</option></select></td>' +
        '<td class="odc"><label style="display:flex;gap:.35rem;align-items:center;margin:0;white-space:nowrap"><input type="checkbox" class="od" ' + (u.odendi ? 'checked' : '') + ' style="width:auto"><span class="odm">' + (u.odendi ? 'Ödendi' : 'Bekliyor') + '</span></label></td>' +
        '<td><input type="date" class="bt" value="' + (u.plan_bitis || '') + '" style="width:140px"></td><td class="kl">' + kalan(u.plan === 'ucretsiz' ? '' : u.plan_bitis) + '</td><td>' + u.bu_ay_indirme + '</td><td>' + (u.toplam_indirme || 0) + '</td>' +
        '<td><select class="rol"><option value="uye">Üye</option><option value="seslendirmen">Seslendirmen</option><option value="admin">Yönetici</option></select></td></tr>';
    }).join('') + '</table></div><div style="display:flex;gap:.8rem;align-items:center;margin-top:1rem"><button class="btn kucuk" id="on" ' + (durum.sayfa === 0 ? 'disabled' : '') + '>Önceki</button><span class="sol">' + r.toplam + ' üye · sayfa ' + (durum.sayfa + 1) + ' / ' + top + '</span><button class="btn kucuk" id="sn" ' + (durum.sayfa + 1 >= top ? 'disabled' : '') + '>Sonraki</button></div>';
    $$('#tab tr[data-id]').forEach(function (tr, i) {
      var u = r.satirlar[i]; tr.querySelector('.rol').value = u.role; tr.querySelector('.pl').value = (u.plan === 'premium' ? 'pro_aylik' : u.plan);
      async function kaydet() {
        var od = tr.querySelector('.od').checked;
        try {
          await Veri.uyeGuncelle(u.id, { role: tr.querySelector('.rol').value, plan: tr.querySelector('.pl').value, plan_bitis: tr.querySelector('.bt').value || null, odendi: od, odeme_tarihi: od ? (u.odeme_tarihi || new Date().toISOString().slice(0, 10)) : null });
          tr.querySelector('.odm').textContent = od ? 'Ödendi' : 'Bekliyor'; tr.querySelector('.kl').innerHTML = kalan(tr.querySelector('.pl').value === 'ucretsiz' ? '' : tr.querySelector('.bt').value); toast('Kaydedildi');
        } catch (e) { toast(e.message); }
      }
      $$('select,input', tr).forEach(function (x) { x.onchange = kaydet; });
    });
    $('#on').onclick = function () { durum.sayfa--; yukle(); }; $('#sn').onclick = function () { durum.sayfa++; yukle(); };
  }

  async function kutupSayfa(t) {
    t = t || 'sesler'; await kutuphane(t);
    ic.insertAdjacentHTML('afterbegin', '<div style="display:flex;gap:.6rem;margin-bottom:1rem"><button class="btn kucuk' + (t === 'sesler' ? ' ana' : '') + '" data-kt="sesler">Seslendirmen örnekleri</button><button class="btn kucuk' + (t === 'muzikler' ? ' ana' : '') + '" data-kt="muzikler">Müzikler</button></div>');
    $$('[data-kt]', ic).forEach(function (b) { b.onclick = function () { kutupSayfa(b.dataset.kt); }; });
  }
  async function kutuphane(t) {
    var ses = t === 'sesler', L = await Veri.hepsi(t);
    ic.innerHTML = '<div class="kart" style="margin-bottom:1rem"><h3 style="font-size:1.3rem;margin-bottom:.7rem">' + (ses ? 'Yeni seslendirmen örneği' : 'Yeni müzik') + '</h3><div class="izgara g3"><div><label>Ad</label><input type="text" id="k-ad" placeholder="' + (ses ? 'Seslendirmen adı' : 'Müzik adı') + '"></div><div><label>' + (ses ? 'Açıklama (ör. sıcak erkek sesi)' : 'Tür (ör. enerjik, sakin)') + '</label><input type="text" id="k-ac"></div>' + (ses ? '<div><label>Fiyat (TL, isteğe bağlı)</label><input type="number" id="k-fy" min="0"></div>' : '') + '<div><label>Ses dosyası</label><input type="file" id="k-dosya" accept="audio/*"></div></div><div style="margin-top:.8rem"><button class="btn ana" id="k-yukle">Yükle</button> <span class="sol" id="k-dur"></span></div></div><div class="kart"><div id="k-liste"></div></div>';
    var tu = $('#k-liste');
    async function ciz() {
      L = await Veri.hepsi(t); var h = '';
      for (var i = 0; i < L.length; i++) { var u = await Veri.url(L[i], t); h += '<div style="display:flex;gap:1rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--cizgi);flex-wrap:wrap"><div style="min-width:180px"><b>' + esc(L[i].ad) + '</b><div class="sol" style="font-size:13px">' + esc(L[i].aciklama || L[i].etiket || '') + '</div></div><audio controls controlsList="nodownload noplaybackrate" preload="none" src="' + esc(u) + '" style="height:34px"></audio><label style="margin:0"><input type="checkbox" data-a="' + L[i].id + '" ' + (L[i].aktif ? 'checked' : '') + '> Yayında</label><button class="btn kucuk" data-sil="' + L[i].id + '">Sil</button></div>'; }
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
    function inp(id, et, d, tip) { return '<div style="margin-bottom:.7rem"><label>' + et + '</label><input type="' + (tip || 'text') + '" id="' + id + '"' + (tip === 'number' ? ' min="0"' : '') + ' value="' + esc(d) + '"></div>'; }
    function ta(id, et, d, ek) { return '<div style="margin-bottom:.7rem"><label>' + et + '</label><textarea id="' + id + '" rows="4" placeholder="' + esc(ek || '') + '" style="width:100%">' + esc(d) + '</textarea></div>'; }
    ic.innerHTML = '<div class="kart"><h3 style="font-size:1.3rem;margin-bottom:.3rem">Paketler ve fiyatlar</h3><div class="sol" style="margin-bottom:1rem">Burada yazdıklarınız üyelerin Panelim sayfasındaki paket kartlarında görünür. İndirme limitinde 0 yazarsanız “sınırsız” olur. Madde kutusunu boş bırakırsanız maddeler rakamlardan otomatik yazılır; doldurursanız sizin yazdığınız çıkar (her satır bir madde).</div>' +
      '<div class="izgara g3" style="gap:1.2rem;align-items:start">' +
      '<div class="kart"><h4 style="margin-bottom:.7rem">1. Ücretsiz paket</h4>' + inp('a_u_ad', 'Paket adı', a.paket_ucretsiz_ad) + inp('a1', 'Ayda indirme', a.ucretsiz_indirme_limiti, 'number') + ta('a_u_md', 'Maddeler (isteğe bağlı)', a.paket_ucretsiz_md, 'Ayda 5 MP3 indirme\nOtomatik ve manuel stüdyo') + '</div>' +
      '<div class="kart"><h4 style="margin-bottom:.7rem">2. Aylık paket</h4>' + inp('a_a_ad', 'Paket adı', a.paket_aylik_ad) + inp('a2', 'Fiyat (TL / ay)', a.pro_aylik_fiyat, 'number') + inp('a3', 'Ayda indirme', a.pro_aylik_limit, 'number') + ta('a_a_md', 'Maddeler (isteğe bağlı)', a.paket_aylik_md, 'Ayda 30 MP3 indirme\nYapay zeka modu') + '</div>' +
      '<div class="kart"><h4 style="margin-bottom:.7rem">3. Yıllık paket</h4>' + inp('a_y_ad', 'Paket adı', a.paket_yillik_ad) + inp('a4', 'Fiyat (TL / yıl)', a.pro_yillik_fiyat, 'number') + inp('a5', 'Ayda indirme', a.pro_yillik_limit, 'number') + ta('a_y_md', 'Maddeler (isteğe bağlı)', a.paket_yillik_md, 'Ayda 100 MP3 indirme\nYapay zeka modu') + '</div></div>' +
      '<div style="max-width:300px;margin-top:1rem">' + inp('a6', 'Yapay zeka: Pro üyeye ayda mesaj', a.yz_mesaj_limiti, 'number') + '</div></div>' +
      '<div class="kart" style="margin-top:1rem"><h3 style="font-size:1.3rem;margin-bottom:.3rem">Ödeme bilgileri (IBAN)</h3><div class="sol" style="margin-bottom:1rem">Müşteri Pro pakete başvurunca bu bilgileri görür ve başvuru koduyla birlikte havale yapar. Boş bırakırsanız “WhatsApp’tan yazın” çıkar.</div>' +
      '<div class="izgara g3" style="gap:1rem">' + inp('o_banka', 'Banka adı', a.banka_adi) + inp('o_sahip', 'Hesap sahibi (ad / unvan)', a.hesap_sahibi) + inp('o_iban', 'IBAN', a.iban) + '</div>' +
      ta('o_not', 'Müşteriye ek not (isteğe bağlı)', a.odeme_notu, 'Örn: Havale açıklamasına başvuru kodunu yazmayı unutmayın.') + inp('o_wa', 'WhatsApp numarası (90 ile, boşluksuz)', a.whatsapp) + '</div>' +
      '<button class="btn ana" id="a-k" style="margin-top:1.2rem">Hepsini kaydet</button>';
    $('#a-k').onclick = async function () {
      var M = { a1: 'ucretsiz_indirme_limiti', a2: 'pro_aylik_fiyat', a3: 'pro_aylik_limit', a4: 'pro_yillik_fiyat', a5: 'pro_yillik_limit', a6: 'yz_mesaj_limiti', a_u_ad: 'paket_ucretsiz_ad', a_a_ad: 'paket_aylik_ad', a_y_ad: 'paket_yillik_ad', a_u_md: 'paket_ucretsiz_md', a_a_md: 'paket_aylik_md', a_y_md: 'paket_yillik_md', o_banka: 'banka_adi', o_sahip: 'hesap_sahibi', o_iban: 'iban', o_not: 'odeme_notu', o_wa: 'whatsapp' };
      var sayi = { a1: 1, a2: 1, a3: 1, a4: 1, a5: 1, a6: 1 };
      try { for (var k in M) { var d = $('#' + k).value; await Veri.ayarKaydet(M[k], sayi[k] ? (d || 0) : d.trim()); } toast('Kaydedildi'); } catch (e) { toast(e.message); }
    };
  }
  ozet();
})();
