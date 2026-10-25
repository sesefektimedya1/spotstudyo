/* Veri katmanı: Supabase varsa onu, yoksa tarayıcı içi deneme modunu kullanır. */
(function () {
  'use strict';
  var C = window.SPOT_CONFIG || {};
  var canli = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var sb = canli ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  var VARSAYILAN_AYAR = { ucretsiz_indirme_limiti: '5', pro_aylik_limit: '30', pro_yillik_limit: '100', pro_aylik_fiyat: '1200', pro_yillik_fiyat: '7500', yz_mesaj_limiti: '100', whatsapp: '905331509890', paket_ucretsiz_ad: 'Ücretsiz', paket_aylik_ad: 'Pro Aylık', paket_yillik_ad: 'Pro Yıllık', paket_ucretsiz_md: '', paket_aylik_md: '', paket_yillik_md: '', banka_adi: '', hesap_sahibi: '', iban: '', odeme_notu: '', marka: C.marka || 'Ses Efekti Spot Stüdyo' };
  var PLAN_AD = { ucretsiz: 'Ücretsiz', pro_aylik: 'Pro Aylık', pro_yillik: 'Pro Yıllık' };
  var ADLAR = Object.assign({}, PLAN_AD);
  function adlariYukle(o) { ADLAR.ucretsiz = o.paket_ucretsiz_ad || PLAN_AD.ucretsiz; ADLAR.pro_aylik = o.paket_aylik_ad || PLAN_AD.pro_aylik; ADLAR.pro_yillik = o.paket_yillik_ad || PLAN_AD.pro_yillik; return o; }
  function planAdi(p) { return ADLAR[p === 'premium' ? 'pro_aylik' : (p || 'ucretsiz')] || ADLAR.ucretsiz; }
  function planKey(p) { return p === 'premium' ? 'pro_aylik' : (p || 'ucretsiz'); }
  function etkinPlan(p, bitis) { p = planKey(p); if (p !== 'ucretsiz' && bitis && new Date(bitis + 'T23:59:59') < new Date()) return 'ucretsiz'; return p; }
  function limitOf(p, a) { p = planKey(p); return +(p === 'pro_yillik' ? a.pro_yillik_limit : (p === 'pro_aylik' ? a.pro_aylik_limit : a.ucretsiz_indirme_limiti)); }
  function tarihYaz(d) { var z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function bitisHesapla(paket, mevcut) {
    var baz = new Date(); if (mevcut) { var m = new Date(mevcut + 'T00:00:00'); if (m > baz) baz = m; }
    var d = new Date(baz.getFullYear(), baz.getMonth(), baz.getDate()); if (paket === 'pro_yillik') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); return tarihYaz(d);
  }
  /* Yöneticiye e-posta (yalnız canlı sitede) */
  function bildir(konu, alanlar) {
    if (!canli) return; try { fetch('https://formsubmit.co/ajax/sesefektimedya@gmail.com', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(Object.assign({ _subject: konu, _template: 'table' }, alanlar)) }).catch(function () {}); } catch (e) {}
  }

  /* ---------- DENEME MODU ---------- */
  var LS = {
    oku: function (k, v) { try { var s = localStorage.getItem('spot_' + k); return s ? JSON.parse(s) : v; } catch (e) { return v; } },
    yaz: function (k, v) { try { localStorage.setItem('spot_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var bellek = { sesler: [], muzikler: [] }; // yüklenen dosyalar yalnız oturum boyunca
  function uid() { return 'd' + Math.random().toString(36).slice(2, 10); }
  function ayBasi() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }

  var demo = {
    oturum: async function () {
      var id = LS.oku('aktif', null); if (!id) return null;
      var u = LS.oku('uyeler', []).find(function (x) { return x.id === id; });
      return u ? { id: u.id, email: u.email, ad: u.ad, telefon: u.telefon || '', role: u.role, plan: planKey(u.plan), plan_bitis: u.plan_bitis } : null;
    },
    kayit: async function (email, sifre, ad, telefon) {
      var l = LS.oku('uyeler', []);
      if (l.some(function (x) { return x.email === email; })) throw new Error('Bu e-posta ile zaten kayıt var.');
      var u = { id: uid(), email: email, ad: ad || email.split('@')[0], telefon: telefon || '', role: l.length ? 'uye' : 'admin', plan: 'ucretsiz', plan_bitis: null, odendi: false, odeme_tarihi: null, sifre: sifre, created_at: new Date().toISOString() };
      l.push(u); LS.yaz('uyeler', l); LS.yaz('aktif', u.id); return demo.oturum();
    },
    giris: async function (email, sifre) {
      var u = LS.oku('uyeler', []).find(function (x) { return x.email === email && x.sifre === sifre; });
      if (!u) throw new Error('E-posta veya şifre hatalı.'); LS.yaz('aktif', u.id); return demo.oturum();
    },
    cikis: async function () { LS.yaz('aktif', null); },
    ayarlar: async function () { return adlariYukle(Object.assign({}, VARSAYILAN_AYAR, LS.oku('ayarlar', {}))); },
    ayarKaydet: async function (a, d) { var s = LS.oku('ayarlar', {}); s[a] = String(d); LS.yaz('ayarlar', s); },
    indirmeler: async function (uid_) { return LS.oku('indirmeler', []).filter(function (x) { return x.user_id === uid_; }).reverse(); },
    indirmeHakki: async function (proje, tur) {
      var o = await demo.oturum(); if (!o) throw new Error('Giriş yapmalısınız.');
      var a = await demo.ayarlar(), lim = limitOf(etkinPlan(o.plan, o.plan_bitis), a);
      var l = LS.oku('indirmeler', []), buAy = l.filter(function (x) { return x.user_id === o.id && x.t >= ayBasi(); }).length;
      if (lim > 0 && buAy >= lim) return { ok: false, kullanilan: buAy, limit: lim };
      l.push({ id: uid(), user_id: o.id, proje_adi: proje, tur: tur, t: Date.now(), created_at: new Date().toISOString() }); LS.yaz('indirmeler', l);
      return { ok: true, kullanilan: buAy + 1, limit: lim };
    },
    hakDurumu: async function () {
      var o = await demo.oturum(); if (!o) return { kullanilan: 0, limit: 0 };
      var a = await demo.ayarlar(), lim = limitOf(etkinPlan(o.plan, o.plan_bitis), a);
      var buAy = LS.oku('indirmeler', []).filter(function (x) { return x.user_id === o.id && x.t >= ayBasi(); }).length;
      return { kullanilan: buAy, limit: lim };
    },
    basvuruYap: async function (paket, fatura) {
      var o = await demo.oturum(); if (!o) throw new Error('Giriş yapmalısınız.'); var a = await demo.ayarlar(), l = LS.oku('basvurular', []);
      if (l.some(function (x) { return x.user_id === o.id && x.durum === 'beklemede'; })) throw new Error('Bekleyen bir başvurunuz zaten var.');
      var k = { id: uid(), user_id: o.id, ad: o.ad, eposta: o.email, telefon: o.telefon || '', paket: paket, fiyat_tl: +(paket === 'pro_yillik' ? a.pro_yillik_fiyat : a.pro_aylik_fiyat), fatura: fatura || null, fatura_kesildi: false, fatura_no: '', durum: 'beklemede', created_at: new Date().toISOString(), islem_tarihi: null };
      l.push(k); LS.yaz('basvurular', l); return k;
    },
    basvurularim: async function () { var o = await demo.oturum(); return LS.oku('basvurular', []).filter(function (x) { return o && x.user_id === o.id; }).reverse(); },
    basvuruTum: async function () { return LS.oku('basvurular', []).slice().reverse(); },
    faturaGuncelle: async function (id, d) { var l = LS.oku('basvurular', []), b = l.find(function (x) { return x.id === id; }); if (b) Object.assign(b, d); LS.yaz('basvurular', l); },
    basvuruKarar: async function (id, onay) {
      var l = LS.oku('basvurular', []), b = l.find(function (x) { return x.id === id && x.durum === 'beklemede'; }); if (!b) throw new Error('Başvuru bulunamadı ya da işlenmiş.');
      if (onay) { var us = LS.oku('uyeler', []), u = us.find(function (x) { return x.id === b.user_id; }); if (u) { u.plan_bitis = bitisHesapla(b.paket, planKey(u.plan) !== 'ucretsiz' ? u.plan_bitis : null); u.plan = b.paket; u.odendi = true; u.odeme_tarihi = tarihYaz(new Date()); LS.yaz('uyeler', us); } }
      b.durum = onay ? 'onaylandi' : 'reddedildi'; b.islem_tarihi = new Date().toISOString(); LS.yaz('basvurular', l);
    },
    geriBildirim: async function (g) { var o = await demo.oturum(), l = LS.oku('geribildirimler', []); var k = Object.assign({ id: uid(), user_id: o && o.id, eposta: o && o.email, created_at: new Date().toISOString() }, g); l.push(k); LS.yaz('geribildirimler', l); return k; },
    geriBildirimTum: async function () { return LS.oku('geribildirimler', []).reverse(); },
    yzSor: async function () { throw new Error('Yapay zeka bağlantısı henüz kurulmadı. (Deneme modunda çalışmaz.)'); },
    siparisVer: async function (s) { var o = await demo.oturum(), l = LS.oku('siparisler', []); var k = Object.assign({ id: uid(), user_id: o && o.id, durum: 'yeni', sonuc_url: '', created_at: new Date().toISOString() }, s); l.push(k); LS.yaz('siparisler', l); return k; },
    siparislerim: async function () { var o = await demo.oturum(); return LS.oku('siparisler', []).filter(function (x) { return o && x.user_id === o.id; }).reverse(); },
    siparisTum: async function () { return LS.oku('siparisler', []).reverse(); },
    siparisGuncelle: async function (id, d) { var l = LS.oku('siparisler', []), k = l.find(function (x) { return x.id === id; }); if (k) Object.assign(k, d); LS.yaz('siparisler', l); },
    liste: async function (t) { return bellek[t].filter(function (x) { return x.aktif !== false; }); },
    hepsi: async function (t) { return bellek[t].slice(); },
    ekle: async function (t, meta, dosya) { var k = Object.assign({ id: uid(), aktif: true, url: URL.createObjectURL(dosya) }, meta); bellek[t].push(k); return k; },
    guncelle: async function (t, id, d) { var k = bellek[t].find(function (x) { return x.id === id; }); if (k) Object.assign(k, d); },
    sil: async function (t, id) { bellek[t] = bellek[t].filter(function (x) { return x.id !== id; }); },
    url: async function (k) { return k.url; },
    uyeler: async function (o) {
      var l = LS.oku('uyeler', []), ind = LS.oku('indirmeler', []), q = (o.ara || '').toLowerCase();
      var r = l.filter(function (u) { return (!q || u.email.toLowerCase().indexOf(q) > -1 || (u.ad || '').toLowerCase().indexOf(q) > -1 || (u.telefon || '').indexOf(q) > -1) && (!o.plan || u.plan === o.plan); });
      var top = r.length, bas = (o.sayfa || 0) * o.adet;
      return { toplam: top, satirlar: r.slice(bas, bas + o.adet).map(function (u) { return { id: u.id, email: u.email, ad: u.ad, telefon: u.telefon || '', role: u.role, plan: planKey(u.plan), plan_bitis: u.plan_bitis, odendi: !!u.odendi, odeme_tarihi: u.odeme_tarihi || null, created_at: u.created_at, bu_ay_indirme: ind.filter(function (x) { return x.user_id === u.id && x.t >= ayBasi(); }).length, toplam_indirme: ind.filter(function (x) { return x.user_id === u.id; }).length, fatura_tur: (function () { var b = LS.oku('basvurular', []).filter(function (x) { return x.user_id === u.id && x.fatura; }).pop(); return b ? b.fatura.tur : null; })() }; }) };
    },
    uyeGuncelle: async function (id, d) { var l = LS.oku('uyeler', []); var u = l.find(function (x) { return x.id === id; }); if (u) Object.assign(u, d); LS.yaz('uyeler', l); },
    ozet: async function () {
      var l = LS.oku('uyeler', []), ind = LS.oku('indirmeler', []);
      return { uye: l.length, premium: l.filter(function (u) { return planKey(u.plan) !== 'ucretsiz'; }).length, bekleyen: LS.oku('basvurular', []).filter(function (x) { return x.durum === 'beklemede'; }).length, bu_ay: ind.filter(function (x) { return x.t >= ayBasi(); }).length, ses: bellek.sesler.length, muzik: bellek.muzikler.length };
    }
  };

  /* ---------- SUPABASE ---------- */
  function hata(r) { if (r.error) throw new Error(r.error.message); return r.data; }
  var canliApi = canli ? {
    oturum: async function () {
      var s = (await sb.auth.getSession()).data.session; if (!s) return null;
      var r = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      var p = r.data || {}; return { id: s.user.id, email: s.user.email, ad: p.ad, telefon: p.telefon || '', role: p.role || 'uye', plan: planKey(p.plan), plan_bitis: p.plan_bitis };
    },
    kayit: async function (email, sifre, ad, telefon) {
      var r = await sb.auth.signUp({ email: email, password: sifre, options: { data: { ad: ad, telefon: telefon || '' } } }); if (r.error) throw new Error(r.error.message);
      bildir('Yeni üye: ' + (ad || email), { Ad: ad || '', Eposta: email, Telefon: telefon || '(yazmadı)' });
      if (!r.data.session) throw new Error('Kayıt alındı. E-postanıza gelen onay bağlantısına tıklayıp tekrar giriş yapın.');
      return canliApi.oturum();
    },
    giris: async function (email, sifre) { var r = await sb.auth.signInWithPassword({ email: email, password: sifre }); if (r.error) throw new Error('E-posta veya şifre hatalı.'); return canliApi.oturum(); },
    cikis: async function () { await sb.auth.signOut(); },
    ayarlar: async function () { var d = hata(await sb.from('ayarlar').select('*')), o = Object.assign({}, VARSAYILAN_AYAR); d.forEach(function (x) { o[x.anahtar] = x.deger; }); return adlariYukle(o); },
    ayarKaydet: async function (a, d) { hata(await sb.from('ayarlar').upsert({ anahtar: a, deger: String(d) })); },
    indirmeler: async function () { return hata(await sb.from('indirmeler').select('*').order('created_at', { ascending: false }).limit(200)); },
    indirmeHakki: async function (proje, tur) { var r = hata(await sb.rpc('indirme_hakki_al', { p_proje: proje, p_tur: tur })); return r; },
    hakDurumu: async function () { return hata(await sb.rpc('indirme_durumu')); },
    basvuruYap: async function (paket, fatura) {
      var o = await canliApi.oturum(); if (!o) throw new Error('Giriş yapmalısınız.'); var a = await canliApi.ayarlar();
      var fy = +(paket === 'pro_yillik' ? a.pro_yillik_fiyat : a.pro_aylik_fiyat);
      var r = await sb.from('paket_basvurulari').insert({ user_id: o.id, ad: o.ad, eposta: o.email, telefon: o.telefon || null, paket: paket, fiyat_tl: fy, fatura: fatura || null }).select().single();
      if (r.error) { if (/duplicate|unique/i.test(r.error.message)) throw new Error('Bekleyen bir başvurunuz zaten var.'); throw new Error(r.error.message); }
      bildir('Paket başvurusu: ' + planAdi(paket), { Ad: o.ad || '', Eposta: o.email, Telefon: o.telefon || '(yok)', Paket: planAdi(paket), Fiyat: fy + ' TL', Fatura: fatura ? (fatura.tur === 'ticari' ? fatura.unvan + ' / VKN ' + fatura.vkn : fatura.ad + ' / TC ' + fatura.tc) : '' });
      return r.data;
    },
    basvurularim: async function () { var o = await canliApi.oturum(); return hata(await sb.from('paket_basvurulari').select('*').eq('user_id', o.id).order('created_at', { ascending: false })); },
    basvuruTum: async function () { return hata(await sb.from('paket_basvurulari').select('*').order('created_at', { ascending: false })); },
    faturaGuncelle: async function (id, d) { hata(await sb.from('paket_basvurulari').update(d).eq('id', id)); },
    basvuruKarar: async function (id, onay) { hata(await sb.rpc('basvuru_karar', { p_id: id, p_onay: onay })); },
    geriBildirim: async function (g) { var o = await canliApi.oturum(); return hata(await sb.from('geri_bildirimler').insert(Object.assign({ user_id: o ? o.id : null, eposta: o ? o.email : null }, g)).select().single()); },
    geriBildirimTum: async function () { return hata(await sb.from('geri_bildirimler').select('*').order('created_at', { ascending: false })); },
    yzSor: async function (mesajlar) {
      var r = await sb.functions.invoke('yz-sohbet', { body: { mesajlar: mesajlar } });
      if (r.error) throw new Error('Yapay zeka bağlantısı henüz kurulmadı ya da yanıt vermedi.');
      if (r.data && r.data.hata) throw new Error(r.data.hata); return (r.data && r.data.yanit) || 'Yanıt alınamadı.';
    },
    siparisVer: async function (s) { var o = await canliApi.oturum(); if (!o) throw new Error('Giriş yapmalısınız.'); return hata(await sb.from('siparisler').insert(Object.assign({ user_id: o.id }, s)).select().single()); },
    siparislerim: async function () { var o = await canliApi.oturum(); return hata(await sb.from('siparisler').select('*').eq('user_id', o.id).order('created_at', { ascending: false })); },
    siparisTum: async function () { return hata(await sb.from('siparisler').select('*').order('created_at', { ascending: false })); },
    siparisGuncelle: async function (id, d) { hata(await sb.from('siparisler').update(d).eq('id', id)); },
    liste: async function (t) { return hata(await sb.from(t).select('*').eq('aktif', true).order('ad')); },
    hepsi: async function (t) { return hata(await sb.from(t).select('*').order('created_at', { ascending: false })); },
    ekle: async function (t, meta, dosya) {
      var yol = Date.now() + '_' + dosya.name.replace(/[^\w.\-]+/g, '_');
      var u = await sb.storage.from(t).upload(yol, dosya, { contentType: dosya.type }); if (u.error) throw new Error(u.error.message);
      var row = Object.assign({}, meta, { dosya_yolu: yol }); delete row.url;
      return hata(await sb.from(t).insert(row).select().single());
    },
    guncelle: async function (t, id, d) { hata(await sb.from(t).update(d).eq('id', id)); },
    sil: async function (t, id) {
      var r = hata(await sb.from(t).select('dosya_yolu').eq('id', id).maybeSingle());
      if (r && r.dosya_yolu) await sb.storage.from(t).remove([r.dosya_yolu]);
      hata(await sb.from(t).delete().eq('id', id));
    },
    url: async function (k, t) { var r = await sb.storage.from(t).createSignedUrl(k.dosya_yolu, 120); if (r.error) throw new Error(r.error.message); return r.data.signedUrl; },
    uyeler: async function (o) {
      var r = hata(await sb.rpc('uye_listesi', { p_ara: o.ara || '', p_plan: o.plan || '', p_sayfa: o.sayfa || 0, p_adet: o.adet }));
      return r;
    },
    uyeGuncelle: async function (id, d) { hata(await sb.from('profiles').update(d).eq('id', id)); },
    ozet: async function () { return hata(await sb.rpc('yonetim_ozet')); }
  } : null;

  var api = canli ? canliApi : demo;
  window.Veri = Object.assign({ canli: canli, marka: C.marka || 'Ses Efekti Spot Stüdyo', planAd: planAdi, basvuruKod: function (b) { return 'SE-' + String(b && b.id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(); }, isPro: function (p) { return planKey(p) !== 'ucretsiz'; }, bildir: bildir }, api);
  var url0 = api.url;
  window.Veri.url = function (k, t) { return url0(k, t); };
})();
