/* Ortak: üst çubuk, uyarı, oturum koruması */
(function () {
  'use strict';
  window.$ = function (s, k) { return (k || document).querySelector(s); };
  window.$$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  window.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  window.toast = function (m) {
    var t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('goster'); clearTimeout(t._z); t._z = setTimeout(function () { t.classList.remove('goster'); }, 3200);
  };
  window.geriBildirimAc = function (sayfa) {
    if (!$('#gbStil')) { var st = document.createElement('style'); st.id = 'gbStil'; st.textContent = '.gbPerde{position:fixed;inset:0;background:rgba(20,25,35,.5);display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem}.gbKutu{background:#fff;color:#1d2430;border-radius:12px;width:min(520px,100%);box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;font:15px/1.5 "Open Sans",Barlow,system-ui,sans-serif}.gbKutu h3{padding:1rem 1.2rem .2rem;font-size:1.4rem;font-family:inherit;font-weight:700}.gbKutu p{padding:0 1.2rem;color:#5d6673}.gbKutu .gv{padding:.9rem 1.2rem;display:grid;gap:.6rem}.gbKutu textarea,.gbKutu select{width:100%;background:#fff;color:#1d2430;border:1px solid #bcc3cc;border-radius:8px;padding:.6rem .7rem;font:inherit}.gbKutu textarea{min-height:140px;resize:vertical}.gbKutu .ga{display:flex;gap:.5rem;justify-content:flex-end;padding:.8rem 1.2rem;background:#f3f4f6;border-top:1px solid #dde1e6}.gbKutu .ga button{border:1px solid #bcc3cc;background:#fff;color:#1d2430;border-radius:8px;padding:.5rem 1rem;cursor:pointer;font:inherit}.gbKutu .ga button.gp{background:linear-gradient(180deg,#ff7a2e,#e0452f);border-color:#b9301d;color:#fff;font-weight:700}'; document.head.appendChild(st); }
    var p = document.createElement('div'); p.className = 'gbPerde';
    p.innerHTML = '<div class="gbKutu" role="dialog" aria-modal="true"><h3>Sizi önemsiyoruz</h3><p>Programla ilgili görüşlerinizi, yapamadığınız ya da sizi rahatsız eden şeyleri bize yazın. Her mesajı okuyoruz.</p><div class="gv"><select id="gbTur"><option>Bir sorunla karşılaştım</option><option>Yapamadığım bir şey var</option><option>Önerim var</option><option>Beğendiğim bir şey var</option></select><textarea id="gbMesaj" placeholder="Mesajınızı buraya yazın…"></textarea></div><div class="ga"><button id="gbIptal">Vazgeç</button><button class="gp" id="gbGonder">Gönder</button></div></div>';
    document.body.appendChild(p); $('#gbMesaj', p).focus();
    $('#gbIptal', p).onclick = function () { p.remove(); };
    p.addEventListener('mousedown', function (e) { if (e.target === p) p.remove(); });
    $('#gbGonder', p).onclick = async function () {
      var m = $('#gbMesaj', p).value.trim(); if (m.length < 3) return toast('Lütfen bir mesaj yazın');
      var b = $('#gbGonder', p); b.disabled = true; b.textContent = 'Gönderiliyor…';
      var kayit = { tur: $('#gbTur', p).value, mesaj: m, sayfa: sayfa || location.pathname.split('/').pop() };
      try {
        await Veri.geriBildirim(kayit);
        try { fetch('https://formsubmit.co/ajax/sesefektimedya@gmail.com', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ _subject: 'Geri bildirim: ' + kayit.tur, _template: 'table', Tur: kayit.tur, Mesaj: m, Sayfa: kayit.sayfa }) }).catch(function () {}); } catch (x) {}
        p.remove(); toast('Teşekkürler, mesajınız bize ulaştı');
      } catch (e) { b.disabled = false; b.textContent = 'Gönder'; toast(e.message || 'Gönderilemedi'); }
    };
  };
  window.ustCubuk = async function (aktif, oturum) {
    var h = '';
    if (!Veri.canli) h += '<div class="deneme">Deneme modu: kayıtlar yalnız bu tarayıcıda durur. Canlı yayın için Supabase bilgilerini js/config.js dosyasına yazın.</div>';
    h += '<header class="ust"><a class="logo" href="index.html" title="Ses Efekti Spot Stüdyo"><i></i><b>sesefekti.com</b><span>/spot-stüdyo</span></a><nav>';
    if (oturum) {
      h += '<a href="studyo.html"' + (aktif === 'studyo' ? ' class="acik"' : '') + '>Stüdyo</a><a href="panel.html"' + (aktif === 'panel' ? ' class="acik"' : '') + '>Panelim</a>';
      if (oturum.role === 'admin') h += '<a href="yonetim.html"' + (aktif === 'yonetim' ? ' class="acik"' : '') + '>Yönetim</a>';
    }
    h += '</nav><div class="sag">';
    h += '<div class="dilSec" role="group" aria-label="Dil / Language"><button data-dil="tr" class="' + (window.DIL !== 'en' ? 'acik' : '') + '">TR</button><button data-dil="en" class="' + (window.DIL === 'en' ? 'acik' : '') + '">EN</button></div>';
    if (oturum) {
      var d = await Veri.hakDurumu(), lim = d.limit > 0 ? d.limit : '∞';
      h += '<span class="plan' + (oturum.plan === 'premium' ? ' pr' : '') + '">' + (oturum.plan === 'premium' ? 'Premium plan' : 'Ücretsiz plan') + '</span>';
      h += '<span class="kota" title="Bu ayki MP3 indirme hakkınız">Bu ay ' + d.kullanilan + ' / ' + lim + ' indirme</span>';
      h += '<button class="gbBtn" id="gbBtn" title="Bize görüşlerinizi yazın">Geri bildirim</button>';
      if (aktif === 'studyo') h += '<button class="ustDisa" id="ustDisa" title="MP3, WAV ya da santral dosyası olarak dışa aktar (Ctrl+E)"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M4 17v3h16v-3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Dışa aktar</button>';
      h += '<span>' + esc(oturum.ad || oturum.email) + '</span><button class="btn kucuk" id="cikisBtn">Çıkış</button>';
    } else h += '<a class="btn kucuk" href="index.html#giris">Giriş yap</a>';
    h += '</div>';
    h += '</header>';
    var kab = document.createElement('div'); kab.innerHTML = h; document.body.insertBefore(kab, document.body.firstChild);
    $$('[data-dil]', kab).forEach(function (b) { b.onclick = function () { if (b.dataset.dil !== window.DIL) dilSec(b.dataset.dil); }; });
    var gb = $('#gbBtn'); if (gb) gb.onclick = function () { geriBildirimAc(aktif); };
    var c = $('#cikisBtn'); if (c) c.onclick = async function () { await Veri.cikis(); location.href = 'index.html'; };
  };
  window.korumali = async function (aktif, yonetici) {
    var o = await Veri.oturum();
    if (!o) { location.href = 'index.html#giris'; return null; }
    if (yonetici && o.role !== 'admin') { location.href = 'panel.html'; return null; }
    await ustCubuk(aktif, o); return o;
  };
})();
