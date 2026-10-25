/* Veri katmanı: Supabase varsa onu, yoksa tarayıcı içi deneme modunu kullanır. */
(function () {
  'use strict';
  var C = window.SPOT_CONFIG || {};
  var canli = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var sb = canli ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  var VARSAYILAN_AYAR = { ucretsiz_indirme_limiti: '5', premium_indirme_limiti: '0', marka: C.marka || 'SpotStüdyo' };

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
      return u ? { id: u.id, email: u.email, ad: u.ad, role: u.role, plan: u.plan, plan_bitis: u.plan_bitis } : null;
    },
    kayit: async function (email, sifre, ad) {
      var l = LS.oku('uyeler', []);
      if (l.some(function (x) { return x.email === email; })) throw new Error('Bu e-posta ile zaten kayıt var.');
      var u = { id: uid(), email: email, ad: ad || email.split('@')[0], role: l.length ? 'uye' : 'admin', plan: 'ucretsiz', plan_bitis: null, sifre: sifre, created_at: new Date().toISOString() };
      l.push(u); LS.yaz('uyeler', l); LS.yaz('aktif', u.id); return demo.oturum();
    },
    giris: async function (email, sifre) {
      var u = LS.oku('uyeler', []).find(function (x) { return x.email === email && x.sifre === sifre; });
      if (!u) throw new Error('E-posta veya şifre hatalı.'); LS.yaz('aktif', u.id); return demo.oturum();
    },
    cikis: async function () { LS.yaz('aktif', null); },
    ayarlar: async function () { return Object.assign({}, VARSAYILAN_AYAR, LS.oku('ayarlar', {})); },
    ayarKaydet: async function (a, d) { var s = LS.oku('ayarlar', {}); s[a] = String(d); LS.yaz('ayarlar', s); },
    indirmeler: async function (uid_) { return LS.oku('indirmeler', []).filter(function (x) { return x.user_id === uid_; }).reverse(); },
    indirmeHakki: async function (proje, tur) {
      var o = await demo.oturum(); if (!o) throw new Error('Giriş yapmalısınız.');
      var a = await demo.ayarlar(), lim = o.plan === 'premium' ? +a.premium_indirme_limiti : +a.ucretsiz_indirme_limiti;
      var l = LS.oku('indirmeler', []), buAy = l.filter(function (x) { return x.user_id === o.id && x.t >= ayBasi(); }).length;
      if (lim > 0 && buAy >= lim) return { ok: false, kullanilan: buAy, limit: lim };
      l.push({ id: uid(), user_id: o.id, proje_adi: proje, tur: tur, t: Date.now(), created_at: new Date().toISOString() }); LS.yaz('indirmeler', l);
      return { ok: true, kullanilan: buAy + 1, limit: lim };
    },
    hakDurumu: async function () {
      var o = await demo.oturum(); if (!o) return { kullanilan: 0, limit: 0 };
      var a = await demo.ayarlar(), lim = o.plan === 'premium' ? +a.premium_indirme_limiti : +a.ucretsiz_indirme_limiti;
      var buAy = LS.oku('indirmeler', []).filter(function (x) { return x.user_id === o.id && x.t >= ayBasi(); }).length;
      return { kullanilan: buAy, limit: lim };
    },
    liste: async function (t) { return bellek[t].filter(function (x) { return x.aktif !== false; }); },
    hepsi: async function (t) { return bellek[t].slice(); },
    ekle: async function (t, meta, dosya) { var k = Object.assign({ id: uid(), aktif: true, url: URL.createObjectURL(dosya) }, meta); bellek[t].push(k); return k; },
    guncelle: async function (t, id, d) { var k = bellek[t].find(function (x) { return x.id === id; }); if (k) Object.assign(k, d); },
    sil: async function (t, id) { bellek[t] = bellek[t].filter(function (x) { return x.id !== id; }); },
    url: async function (k) { return k.url; },
    uyeler: async function (o) {
      var l = LS.oku('uyeler', []), ind = LS.oku('indirmeler', []), q = (o.ara || '').toLowerCase();
      var r = l.filter(function (u) { return (!q || u.email.toLowerCase().indexOf(q) > -1 || (u.ad || '').toLowerCase().indexOf(q) > -1) && (!o.plan || u.plan === o.plan); });
      var top = r.length, bas = (o.sayfa || 0) * o.adet;
      return { toplam: top, satirlar: r.slice(bas, bas + o.adet).map(function (u) { return { id: u.id, email: u.email, ad: u.ad, role: u.role, plan: u.plan, plan_bitis: u.plan_bitis, created_at: u.created_at, bu_ay_indirme: ind.filter(function (x) { return x.user_id === u.id && x.t >= ayBasi(); }).length }; }) };
    },
    uyeGuncelle: async function (id, d) { var l = LS.oku('uyeler', []); var u = l.find(function (x) { return x.id === id; }); if (u) Object.assign(u, d); LS.yaz('uyeler', l); },
    ozet: async function () {
      var l = LS.oku('uyeler', []), ind = LS.oku('indirmeler', []);
      return { uye: l.length, premium: l.filter(function (u) { return u.plan === 'premium'; }).length, bu_ay: ind.filter(function (x) { return x.t >= ayBasi(); }).length, ses: bellek.sesler.length, muzik: bellek.muzikler.length };
    }
  };

  /* ---------- SUPABASE ---------- */
  function hata(r) { if (r.error) throw new Error(r.error.message); return r.data; }
  var canliApi = canli ? {
    oturum: async function () {
      var s = (await sb.auth.getSession()).data.session; if (!s) return null;
      var r = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      var p = r.data || {}; return { id: s.user.id, email: s.user.email, ad: p.ad, role: p.role || 'uye', plan: p.plan || 'ucretsiz', plan_bitis: p.plan_bitis };
    },
    kayit: async function (email, sifre, ad) {
      var r = await sb.auth.signUp({ email: email, password: sifre, options: { data: { ad: ad } } }); if (r.error) throw new Error(r.error.message);
      if (!r.data.session) throw new Error('Kayıt alındı. E-postanıza gelen onay bağlantısına tıklayıp tekrar giriş yapın.');
      return canliApi.oturum();
    },
    giris: async function (email, sifre) { var r = await sb.auth.signInWithPassword({ email: email, password: sifre }); if (r.error) throw new Error('E-posta veya şifre hatalı.'); return canliApi.oturum(); },
    cikis: async function () { await sb.auth.signOut(); },
    ayarlar: async function () { var d = hata(await sb.from('ayarlar').select('*')), o = Object.assign({}, VARSAYILAN_AYAR); d.forEach(function (x) { o[x.anahtar] = x.deger; }); return o; },
    ayarKaydet: async function (a, d) { hata(await sb.from('ayarlar').upsert({ anahtar: a, deger: String(d) })); },
    indirmeler: async function () { return hata(await sb.from('indirmeler').select('*').order('created_at', { ascending: false }).limit(200)); },
    indirmeHakki: async function (proje, tur) { var r = hata(await sb.rpc('indirme_hakki_al', { p_proje: proje, p_tur: tur })); return r; },
    hakDurumu: async function () { return hata(await sb.rpc('indirme_durumu')); },
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
    url: async function (k, t) { var r = await sb.storage.from(t).createSignedUrl(k.dosya_yolu, 3600); if (r.error) throw new Error(r.error.message); return r.data.signedUrl; },
    uyeler: async function (o) {
      var r = hata(await sb.rpc('uye_listesi', { p_ara: o.ara || '', p_plan: o.plan || '', p_sayfa: o.sayfa || 0, p_adet: o.adet }));
      return r;
    },
    uyeGuncelle: async function (id, d) { hata(await sb.from('profiles').update(d).eq('id', id)); },
    ozet: async function () { return hata(await sb.rpc('yonetim_ozet')); }
  } : null;

  var api = canli ? canliApi : demo;
  window.Veri = Object.assign({ canli: canli, marka: C.marka || 'SpotStüdyo' }, api);
  var url0 = api.url;
  window.Veri.url = function (k, t) { return url0(k, t); };
})();
