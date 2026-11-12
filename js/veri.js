/* Veri katmanı: Supabase varsa onu, yoksa tarayıcı içi deneme modunu kullanır. */
(function () {
  'use strict';
  var C = window.SPOT_CONFIG || {};
  var canli = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var sb = canli ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  var VARSAYILAN_AYAR = { baslangic_fiyat: '1200', baslangic_limit: '15', standart_fiyat: '2500', standart_limit: '45', sinirsiz_fiyat: '4500', sinirsiz_limit: '0', paket_baslangic_ad: 'Başlangıç', paket_standart_ad: 'Standart', paket_sinirsiz_ad: 'Premium', pay_yuzde: '80', ucretsiz_indirme_limiti: '5', pro_aylik_limit: '30', pro_yillik_limit: '100', pro_aylik_fiyat: '1200', pro_yillik_fiyat: '7500', yz_mesaj_limiti: '100', whatsapp: '905331509890', paket_ucretsiz_ad: 'Ücretsiz', paket_aylik_ad: 'Pro Aylık', paket_yillik_ad: 'Pro Yıllık', paket_ucretsiz_md: '', paket_aylik_md: '', paket_yillik_md: '', banka_adi: '', hesap_sahibi: '', iban: '', odeme_notu: '', hizmet_ucreti: '0', kart_odeme: '0', jingle_oto: '0', sirket_adres: '', sirket_vd: '', sirket_vkn: '', kdv_notu: 'Fiyatlara KDV dahildir.', marka: C.marka || 'Ses Efekti Spot Stüdyo' };
  var PLAN_AD = { ucretsiz: 'Ücretsiz', baslangic: 'Başlangıç', standart: 'Standart', sinirsiz: 'Premium', pro_aylik: 'Pro Aylık', pro_yillik: 'Pro Yıllık' };
  var YILLIK = { baslangic: 1, standart: 1, sinirsiz: 1, pro_yillik: 1 };
  var ADLAR = Object.assign({}, PLAN_AD);
  function adlariYukle(o) { ADLAR.ucretsiz = o.paket_ucretsiz_ad || PLAN_AD.ucretsiz; ADLAR.pro_aylik = o.paket_aylik_ad || PLAN_AD.pro_aylik; ADLAR.pro_yillik = o.paket_yillik_ad || PLAN_AD.pro_yillik; ADLAR.baslangic = o.paket_baslangic_ad || PLAN_AD.baslangic; ADLAR.standart = o.paket_standart_ad || PLAN_AD.standart; ADLAR.sinirsiz = o.paket_sinirsiz_ad || PLAN_AD.sinirsiz; return o; }
  function planAdi(p) { return ADLAR[p === 'premium' ? 'pro_aylik' : (p || 'ucretsiz')] || ADLAR.ucretsiz; }
  function planKey(p) { return p === 'premium' ? 'pro_aylik' : (p || 'ucretsiz'); }
  function etkinPlan(p, bitis) { p = planKey(p); if (p !== 'ucretsiz' && bitis && new Date(bitis + 'T23:59:59') < new Date()) return 'ucretsiz'; return p; }
  function limitOf(p, a) { p = planKey(p); var m = { baslangic: a.baslangic_limit, standart: a.standart_limit, sinirsiz: a.sinirsiz_limit, pro_yillik: a.pro_yillik_limit, pro_aylik: a.pro_aylik_limit }; return +(p in m ? m[p] : a.ucretsiz_indirme_limiti); }
  function fiyatOf(p, a) { var m = { baslangic: a.baslangic_fiyat, standart: a.standart_fiyat, sinirsiz: a.sinirsiz_fiyat, pro_yillik: a.pro_yillik_fiyat, pro_aylik: a.pro_aylik_fiyat }; return +(m[p] || 0); }
  /* Satışa açık paketler (yeni düzen: yalnız yıllık). Eski pro_* paketler yalnız mevcut üyeler için çalışmaya devam eder. */
  function planListesi(a) {
    function md(m, v) { var L = (m || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); return L.length ? L : v; }
    function kota(l) { return +l ? 'Ayda ' + l + ' MP3 indirme' : 'Sınırsız MP3 indirme'; }
    var ek = ['Otomatik ve manuel stüdyo', 'Seslendirmen olarak satış yapma hakkı (onay ile)'];
    var L = [{ k: 'ucretsiz', ad: a.paket_ucretsiz_ad || 'Ücretsiz', fy: '0 TL', fiyat: 0, limit: +a.ucretsiz_indirme_limiti, md: md(a.paket_ucretsiz_md, ['Ayda ' + a.ucretsiz_indirme_limiti + ' MP3 indirme (deneme)', 'Otomatik ve manuel stüdyo', 'Spot ve paket program sipariş verme']) }];
    ['baslangic', 'standart', 'sinirsiz'].forEach(function (k) { var f = +a[k + '_fiyat'], lm = +a[k + '_limit']; L.push({ k: k, ad: a['paket_' + k + '_ad'] || PLAN_AD[k], fy: f.toLocaleString('tr-TR') + ' TL / yıl', fiyat: f, limit: lm, md: md(a['paket_' + k + '_md'], [kota(lm)].concat(ek)) }); });
    return L;
  }
  function tarihYaz(d) { var z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function bitisHesapla(paket, mevcut) {
    var baz = new Date(); if (mevcut) { var m = new Date(mevcut + 'T00:00:00'); if (m > baz) baz = m; }
    var d = new Date(baz.getFullYear(), baz.getMonth(), baz.getDate()); if (YILLIK[paket]) d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); return tarihYaz(d);
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
    basvuruYap: async function (paket, fatura, yeniId) {
      var o = await demo.oturum(); if (!o) throw new Error('Giriş yapmalısınız.'); var a = await demo.ayarlar(), l = LS.oku('basvurular', []);
      if (l.some(function (x) { return x.user_id === o.id && x.durum === 'beklemede'; })) throw new Error('Bekleyen bir başvurunuz zaten var.');
      var k = { id: yeniId || uid(), user_id: o.id, ad: o.ad, eposta: o.email, telefon: o.telefon || '', paket: paket, fiyat_tl: fiyatOf(paket, a), fatura: fatura || null, fatura_kesildi: false, fatura_no: '', durum: 'beklemede', created_at: new Date().toISOString(), islem_tarihi: null };
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
    yzSor: async function (mesajlar, tur) {
      var son = (mesajlar[mesajlar.length - 1] || {}).content || '', n = '(Örnek metin: yapay zeka bağlanınca burada sizin konunuza göre yazılır.)\n\n';
      if (tur === 'jingle') return n + 'Nakarat:\nSes Efekti, Ses Efekti,\nSesin gücü sende, yayında hemen şimdi!\n\nKıta:\nSpotun hazır, radyon açık,\nHer evde bir melodi, her kalpte bir ses.';
      if (tur === 'santral') return n + 'Merhaba, firmamızı aradığınız için teşekkür ederiz. Yetkili arkadaşlarımız şu anda diğer görüşmelerde. Lütfen hatta kalın, en kısa sürede size dönüş yapacağız.';
      return n + 'Fırsatı kaçırmayın! Seçili ürünlerde yüzde yirmiye varan indirim, sadece bu hafta sonu. Detaylar için mağazamızı ziyaret edin ya da bizi arayın. Sesinizi duyuran marka: Ses Efekti.';
    },
    jingleUret: async function () { throw new Error('Otomatik jingle bu denemede kapalı.'); },
    odemeBaslat: async function () { throw new Error('Kartla ödeme deneme modunda kapalı.'); },
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
    svBen: async function () { return null; },
    svBasvuru: async function () { throw new Error('Seslendirmen başvurusu yalnız canlı sitede çalışır.'); },
    svGuncelle: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
    svSiparisleri: async function () { return []; },
    svTeslim: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
    svProgramEkle: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
    svProgramlarim: async function () { return []; },
    teslimUrl: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
    musteriOnayla: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
    svTum: async function () { return []; },
    svKarar: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
    hakedisListesi: async function () { return []; },
    hakedisOde: async function () { throw new Error('Yalnız canlı sitede çalışır.'); },
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
    basvuruYap: async function (paket, fatura, yeniId) {
      var o = await canliApi.oturum(); if (!o) throw new Error('Giriş yapmalısınız.'); var a = await canliApi.ayarlar();
      var fy = fiyatOf(paket, a);
      var r = await sb.from('paket_basvurulari').insert({ id: (yeniId && /^[0-9a-f-]{36}$/i.test(yeniId)) ? yeniId : undefined, user_id: o.id, ad: o.ad, eposta: o.email, telefon: o.telefon || null, paket: paket, fiyat_tl: fy, fatura: fatura || null }).select().single();
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
    yzSor: async function (mesajlar, tur) {
      var r = await Promise.race([sb.functions.invoke('swift-service', { body: { mesajlar: mesajlar, tur: tur } }), new Promise(function (_, no) { setTimeout(function () { no(new Error('Yapay zeka çok geç yanıt verdi. Lütfen tekrar deneyin.')); }, 60000); })]);
      if (r.error) throw new Error('Yapay zeka bağlantısı henüz kurulmadı ya da yanıt vermedi.');
      if (r.data && r.data.hata) throw new Error(r.data.hata); return (r.data && r.data.yanit) || 'Yanıt alınamadı.';
    },
    odemeBaslat: async function (siparisId) {
      var r = await sb.functions.invoke('clever-task', { body: { siparis_id: siparisId } });
      if (r.error) throw new Error('Kartla ödeme şu an başlatılamadı. Havale ile ödeyebilirsiniz.');
      if (r.data && r.data.hata) throw new Error(r.data.hata);
      if (!r.data || !r.data.url) throw new Error('Kartla ödeme şu an başlatılamadı.');
      return r.data.url;
    },
    jingleUret: async function (soz) {
      var r = await sb.functions.invoke('swift-service', { body: { islem: 'jingle', soz: soz } });
      if (r.error) throw new Error('Jingle şu an üretilemedi.');
      if (r.data && r.data.hata) throw new Error(r.data.hata);
      if (!r.data || !r.data.ses) throw new Error('Jingle şu an üretilemedi.');
      return 'data:' + (r.data.mime || 'audio/mpeg') + ';base64,' + r.data.ses;
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
    /* V92 seslendirmen */
    svBen: async function () { var o = await canliApi.oturum(); if (!o) return null; var r = await sb.from('seslendirmenler').select('*').eq('user_id', o.id).maybeSingle(); if (r.error) throw new Error(r.error.message); return r.data; },
    svBasvuru: async function (d, dosya) {
      var o = await canliApi.oturum(); if (!o) throw new Error('Giriş yapmalısınız.');
      var yol = o.id + '/' + Date.now() + '_' + dosya.name.replace(/[^\w.\-]+/g, '_');
      var u = await sb.storage.from('sesler').upload(yol, dosya, { contentType: dosya.type }); if (u.error) throw new Error(u.error.message);
      var r = await sb.from('seslendirmenler').insert(Object.assign({ user_id: o.id, dosya_yolu: yol, komisyon_kabul: true }, d)).select().single();
      if (r.error) throw new Error(/row-level|policy/i.test(r.error.message) ? 'Başvuru için geçerli bir yıllık üyeliğiniz olmalı.' : r.error.message);
      bildir('Yeni seslendirmen başvurusu: ' + d.ad, { Ad: d.ad, Eposta: o.email, Telefon: d.telefon || '' }); return r.data;
    },
    svGuncelle: async function (d) { hata(await sb.rpc('seslendirmen_guncelle', { p_aciklama: d.aciklama || null, p_fiyat: d.fiyat_tl || null, p_teslim: d.teslim_saat || null, p_iban: d.iban || null, p_sahip: d.hesap_sahibi || null })); },
    svSiparisleri: async function () { return hata(await sb.rpc('seslendirmen_siparisleri')); },
    svTeslim: async function (id, dosya) {
      var o = await canliApi.oturum(); var yol = o.id + '/' + id + '_' + Date.now() + '_' + dosya.name.replace(/[^\w.\-]+/g, '_');
      var u = await sb.storage.from('teslimat').upload(yol, dosya, { contentType: dosya.type }); if (u.error) throw new Error(u.error.message);
      hata(await sb.rpc('teslim_yukle', { p_id: id, p_yol: yol }));
    },
    svProgramEkle: async function (m, dosya) {
      var o = await canliApi.oturum(); var yol = o.id + '/' + Date.now() + '_' + dosya.name.replace(/[^\w.\-]+/g, '_');
      var u = await sb.storage.from('sesler').upload(yol, dosya, { contentType: dosya.type }); if (u.error) throw new Error(u.error.message);
      return hata(await sb.rpc('program_ekle', { p_ad: m.ad, p_aciklama: m.aciklama || null, p_fiyat: m.fiyat_tl || null, p_sure: m.sure_dk || null, p_anons: m.anons_sayisi || null, p_aralik: m.aralik || null, p_teslim: m.teslim_saat || null, p_yol: yol }));
    },
    svProgramlarim: async function () { var o = await canliApi.oturum(); return hata(await sb.from('sesler').select('*').eq('seslendirmen_id', o.id).eq('tur', 'program').order('created_at', { ascending: false })); },
    teslimUrl: async function (yol) { var r = await sb.storage.from('teslimat').createSignedUrl(yol, 300); if (r.error) throw new Error(r.error.message); return r.data.signedUrl; },
    musteriOnayla: async function (id) { hata(await sb.rpc('musteri_onayla', { p_id: id })); },
    svTum: async function () { return hata(await sb.from('seslendirmenler').select('*').order('created_at', { ascending: false })); },
    svKarar: async function (id, onay) { hata(await sb.rpc('seslendirmen_karar', { p_id: id, p_onay: onay })); },
    hakedisListesi: async function () { return hata(await sb.rpc('hakedis_listesi')); },
    hakedisOde: async function (uid_) { return hata(await sb.rpc('hakedis_ode', { p_user: uid_ })); },
    uyeler: async function (o) {
      var r = hata(await sb.rpc('uye_listesi', { p_ara: o.ara || '', p_plan: o.plan || '', p_sayfa: o.sayfa || 0, p_adet: o.adet }));
      return r;
    },
    uyeGuncelle: async function (id, d) { hata(await sb.from('profiles').update(d).eq('id', id)); },
    ozet: async function () { return hata(await sb.rpc('yonetim_ozet')); }
  } : null;

  var api = canli ? canliApi : demo;
  window.Veri = Object.assign({ canli: canli, marka: C.marka || 'Ses Efekti Spot Stüdyo', planAd: planAdi, planListesi: planListesi, planFiyat: fiyatOf, planYillik: function (k) { return !!YILLIK[k]; }, basvuruKod: function (b) { return 'SE-' + String(b && b.id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(); }, isPro: function (p) { return planKey(p) !== 'ucretsiz'; }, bildir: bildir }, api);
  var url0 = api.url;
  window.Veri.url = function (k, t) { return url0(k, t); };
})();
