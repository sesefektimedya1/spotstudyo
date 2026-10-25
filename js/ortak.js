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
  window.ustCubuk = async function (aktif, oturum) {
    var h = '';
    if (!Veri.canli) h += '<div class="deneme">Deneme modu: kayıtlar yalnız bu tarayıcıda durur. Canlı yayın için Supabase bilgilerini js/config.js dosyasına yazın.</div>';
    h += '<header class="ust"><a class="logo" href="index.html"><i></i>' + esc(Veri.marka) + '</a><nav>';
    if (oturum) {
      h += '<a href="studyo.html"' + (aktif === 'studyo' ? ' class="acik"' : '') + '>Stüdyo</a><a href="panel.html"' + (aktif === 'panel' ? ' class="acik"' : '') + '>Panelim</a>';
      if (oturum.role === 'admin') h += '<a href="yonetim.html"' + (aktif === 'yonetim' ? ' class="acik"' : '') + '>Yönetim</a>';
    }
    h += '</nav><div class="sag">';
    if (oturum) {
      var d = await Veri.hakDurumu(), lim = d.limit > 0 ? d.limit : '∞';
      h += '<span class="kota" title="Bu ayki MP3 indirme hakkınız">Bu ay ' + d.kullanilan + ' / ' + lim + ' indirme</span><span>' + esc(oturum.ad || oturum.email) + '</span><button class="btn kucuk" id="cikisBtn">Çıkış</button>';
    } else h += '<a class="btn kucuk" href="index.html#giris">Giriş yap</a>';
    h += '</div></header>';
    var kab = document.createElement('div'); kab.innerHTML = h; document.body.insertBefore(kab, document.body.firstChild);
    var c = $('#cikisBtn'); if (c) c.onclick = async function () { await Veri.cikis(); location.href = 'index.html'; };
  };
  window.korumali = async function (aktif, yonetici) {
    var o = await Veri.oturum();
    if (!o) { location.href = 'index.html#giris'; return null; }
    if (yonetici && o.role !== 'admin') { location.href = 'panel.html'; return null; }
    await ustCubuk(aktif, o); return o;
  };
})();
