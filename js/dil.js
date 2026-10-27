/* Dil: Türkçe / English. Seçim tarayıcıda saklanır. Metinler Türkçe yazılıdır; İngilizce seçilince sözlükten çevrilir. */
(function () {
  'use strict';
  var L = 'tr'; try { L = localStorage.getItem('spot_dil') === 'en' ? 'en' : 'tr'; } catch (e) {}
  window.DIL = L; document.documentElement.lang = L;
  var EN = {
    'Otomatik': 'Automatic', 'Manuel stüdyo': 'Manual studio', 'Bize gönder · Prodüksiyonu biz yapalım': 'Send to us · We produce it', 'Stüdyo': 'Studio', 'Panelim': 'My panel', 'Paketler': 'Plans', 'Yönetim': 'Admin', 'Çıkış': 'Log out', 'Giriş yap': 'Log in', 'Dışa aktar': 'Export',
    'Dosya': 'File', 'Düzen': 'Edit', 'Görünüm': 'View', 'Ekle': 'Insert', 'Çal': 'Play', 'İşlem': 'Process', 'Efekt': 'Effects', 'Araçlar': 'Tools', 'FX Favorileri': 'FX Favorites', 'Seçenekler': 'Options', 'Pencere': 'Window', 'Yardım': 'Help',
    'Yeni dosya': 'New file', 'Aç…': 'Open…', 'Mikrofonla kayıt': 'Record from microphone', 'Seçimi yeni pencerede aç': 'Open selection in new window', 'Kapat': 'Close', 'Tüm pencereleri kapat': 'Close all windows', 'Çalışma alanı…': 'Workspace…', 'Çalışma alanı': 'Workspace', 'Kaydet': 'Save', 'Farklı kaydet…': 'Save as…', 'Tümünü kaydet': 'Save all', 'Dışa aktar…': 'Export / Render as…', 'Panelime dön': 'Back to my panel',
    'Geri al': 'Undo', 'Yinele': 'Redo', 'Kes': 'Cut', 'Kopyala': 'Copy', 'Yapıştır': 'Paste', 'Üzerine yapıştır': 'Paste over', 'Karıştırarak yapıştır…': 'Mix paste…', 'Panodan yeni pencere': 'New window from clipboard', 'Hepsini seç': 'Select all', 'Seçimi kaldır': 'Deselect', 'Seçimi sil': 'Delete selection', 'Seçimi tut, gerisini at': 'Trim to selection', 'Seçimi sessiz yap': 'Silence selection',
    'Zamanı yakınlaştır': 'Zoom in (time)', 'Zamanı uzaklaştır': 'Zoom out (time)', 'Tamamını göster': 'Show all', 'Seçime yakınlaş': 'Zoom to selection', 'Seviyeyi büyüt': 'Level zoom in', 'Seviyeyi küçült': 'Level zoom out', 'Seviyeyi sıfırla (1×)': 'Reset level (1×)', 'Çalarken dalgayı takip et': 'Follow while playing',
    'Sessizlik ekle (imlece)…': 'Insert silence (at cursor)…', 'Sessizlik ekle (başa)…': 'Insert silence (start)…', 'Sessizlik ekle (sona)…': 'Insert silence (end)…', 'Oynat / Durdur': 'Play / Stop', 'Durdur': 'Stop', 'Başa dön': 'Go to start', 'Sona git': 'Go to end', 'İleri sar (2 sn)': 'Forward (2 s)', 'Geri sar (2 sn)': 'Back (2 s)', 'Döngü (seçimi sürekli çal)': 'Loop selection',
    'Ses seviyesi…': 'Volume…', 'Normalleştir (tepe −1 dB)': 'Normalize (peak −1 dB)', 'Normalleştir (gürlüğe göre)…': 'Normalize (loudness)…', 'Yumuşak giriş (fade in)': 'Fade in', 'Yumuşak çıkış (fade out)': 'Fade out', 'Ters çevir (geriye doğru)': 'Reverse', 'Fazı ters çevir': 'Invert phase', 'DC kaymasını sil': 'Remove DC offset', 'Mono’ya çevir': 'Convert to mono', 'Kanalları değiştir': 'Swap channels', 'Süreyi değiştir…': 'Time stretch…', 'Baş ve sondaki sessizliği kırp': 'Trim silence at ends',
    'Reverb (oda yankısı)…': 'Reverb…', 'Eko (gecikme)…': 'Echo (delay)…', 'Wave Hammer (kompresör + limiter)…': 'Wave Hammer (compressor + limiter)…', 'Noise Gate (sessizlikte sesi kıs)…': 'Noise Gate…', 'Ses rengi (EQ)…': 'Equalizer (EQ)…', 'Filtre (alçak / yüksek geçiren)…': 'Filter (low / high pass)…', 'Perde değiştir…': 'Pitch shift…', 'Telefon': 'Telephone', 'Megafon': 'Megaphone',
    'Dip sesi temizle': 'Clean background noise', 'Gürültü azaltma…': 'Noise reduction…', 'İstatistik…': 'Statistics…', 'Radyo spikeri sesi': 'Radio announcer voice', 'Sıcak spiker sesi': 'Warm announcer voice', 'Parlak spiker sesi': 'Bright announcer voice', 'Temizle + radyo sesi + seviye': 'Clean + radio voice + level', 'Telefon hattı': 'Phone line', 'Megafon anons': 'Megaphone announcement',
    'Mikrofon seç…': 'Choose microphone…', 'Alt alta diz': 'Tile vertically', 'Yan yana diz': 'Tile side by side', 'Basamak düzeni': 'Cascade', 'Menü rehberi': 'Menu guide', 'Kısayollar': 'Shortcuts', 'Nasıl çalışır?': 'How it works',
    'Baş': 'Start', 'Son': 'End', 'Çalışma alanı boş': 'Workspace is empty', 'Dosyayı buraya sürükleyin ya da kayıt düğmesine basın': 'Drop a file here or press the record button',
    'Otomatik spot hazırla': 'Prepare spot automatically', 'Sesiniz': 'Your voice', 'Müzik': 'Music', 'Çıkış türü': 'Output type', 'Radyo': 'Radio', 'Televizyon': 'Television', 'Santral': 'Phone system', 'Sonuç': 'Result', 'Sonuç burada görünür': 'The result appears here',
    'Otomatik hazırla': 'Prepare automatically', 'Başka bir tarz dene': 'Try another style', '▶ Sonucu dinle': '▶ Listen to result', 'Manuel stüdyoda düzenle': 'Edit in manual studio', 'Dışa aktar…': 'Export…', 'Dosya yükle…': 'Upload file…', '● Mikrofonla kayıt al': '● Record from microphone',
    'Ses dosyanızı buraya sürükleyip bırakın': 'Drag and drop your audio file here', 'Müzik dosyanızı buraya sürükleyip bırakın': 'Drag and drop your music file here', 'Sesiniz yok mu?': 'No voice yet?', 'Biz seslendirelim': 'We can voice it', 'Bize gönder sekmesine git': 'Go to the Send to us tab',
    'Prodüksiyonu biz yapalım': 'We produce it for you', 'Spot metni': 'Spot script', 'Seslendirmen': 'Voice talent', 'Seslendirmenler': 'Voice talents', 'Seçilmedi': 'Not selected', 'Adınız': 'Your name', 'E-posta': 'Email', 'Telefon ': 'Phone', 'Not (isteğe bağlı)': 'Note (optional)', 'Siparişi gönder': 'Send order', 'Müzik klasörü': 'Music folder', 'Tümü': 'All', 'Seç': 'Select', '+ Ekle': '+ Add', '✓ Seçildi': '✓ Selected',
    'Spot metninizi buraya yazın.': 'Write your script here.', 'Müzik ara': 'Search music',
    'Kaydetmek istiyor musunuz?': 'Do you want to save?', 'Evet': 'Yes', 'Hayır': 'No', 'İptal': 'Cancel', 'Tamam': 'OK', 'Önizleme': 'Preview', 'Ön ayar': 'Preset',
    'Siparişiniz alındı.': 'Your order has been received.', 'Siparişlerim': 'My orders', 'İndirmelerim': 'My downloads', 'Üyelik': 'Plan', 'Ücretsiz plan': 'Free plan', 'Premium plan': 'Premium plan', 'Hesap': 'Account', 'Yeni spot yap': 'Make a new spot', 'Bu ay indirme': 'Downloads this month', 'İndir': 'Download', 'Henüz sipariş yok.': 'No orders yet.',
    'Yeni': 'New', 'Hazırlanıyor': 'In progress', 'Tamamlandı': 'Completed', 'Durum': 'Status', 'Tarih': 'Date', 'Sipariş': 'Order', '■ Durdur': '■ Stop', 'Ses efektini değiştir': 'Change sound effect', 'Geri bildirim': 'Feedback', 'Yapay zeka modu': 'AI mode', 'ÜCRETLİ': 'PAID', 'Sizi önemsiyoruz': 'We care about you', 'Vazgeç': 'Cancel', 'Gönder': 'Send', 'Equalizer': 'Equalizer', 'Alçak kes': 'Low cut', 'Yüksek kes': 'High cut', 'Bas': 'Low', 'Alt orta': 'Low-mid', 'Üst orta': 'High-mid', 'Tiz': 'High', 'Frekans': 'Frequency', 'Kazanç': 'Gain', 'Genişlik': 'Width',
    'Otomatik spot': 'Automatic spot',
    '(önce ses yükle ya da kayıt al)': '(upload or record a voice first)',
    'Sesinizi yükleyin ya da kaydedin, isterseniz müzik ekleyin. Gürültüyü temizler, sesi dengeler, müziği sesin altına oturtur ve yayına hazır dosyayı çıkarır.': 'Upload or record your voice and add music if you like. It removes noise, balances the voice, sits the music under it and outputs a broadcast-ready file.',
    'Ses': 'Voice',
    'Henüz ses yok': 'No voice yet',
    'Ses dosyanızı buraya bırakın': 'Drop your audio file here',
    'MP3, WAV, M4A ve video dosyaları': 'MP3, WAV, M4A and video files',
    'Dosya yükle': 'Upload file',
    '■ Kaydı bitir': '■ Stop recording',
    'isteğe bağlı': 'optional',
    'Müziksiz': 'No music',
    'Kaldır': 'Remove',
    'Müzik kütüphanesinden seç': 'Choose from music library',
    'Ya da kendi müziğinizi buraya bırakın': 'Or drop your own music here',
    'Müzik dosyası yükle': 'Upload music file',
    'Müziğin bitişi': 'Music ending',
    'Otomatik (tarza göre)': 'Automatic (by style)',
    'Yumuşak fade out': 'Soft fade out',
    'Vuruş (dunk) ile bitir': 'End with a hit (dunk)',
    'Yayına hazır, −11,6 LUFS, MP3': 'Broadcast-ready, −11.6 LUFS, MP3',
    'Yayın standardı, −23 LUFS': 'Broadcast standard, −23 LUFS',
    'Telefon anonsu, 8 kHz WAV': 'Phone announcement, 8 kHz WAV',
    '▶ Dinle': '▶ Play',
    'Paylaş': 'Share',
    'Seçildi': 'Selected',
    'Kullanılacak ses': 'Voice to use',
    'Kullanılacak müzik': 'Music to use',
    'Aramanıza uyan müzik yok.': 'No music matches your search.',
    'Müzik kütüphanesi henüz boş.': 'The music library is empty for now.',
    'Yapay zeka metin desteği': 'AI writing help',
    'Spot metninizi, jingle sözünüzü ya da santral anonsunuzu yapay zekayla birlikte yazın. Ücretli pakete dahildir.': 'Write your spot script, jingle lyrics or phone announcement together with AI. Included in the paid plan.',
    'Kendi spotunuzu hazırlayabilir, otomatik kurgulatabilir ya da yapay zekadan metin desteği alabilirsiniz.': 'You can prepare your own spot, have it produced automatically, or get writing help from AI.',
  };
  var RE = [
    [/^Bu ay (\d+) \/ (\S+) indirme$/, '$1 / $2 downloads this month'],
    [/^Ücretsiz$/, 'Free'], [/^Bu ay (\d+) \/ (\S+) indirme hakkı$/, '$1 / $2 downloads this month']
  ];
  function t1(s) {
    var t = s.trim(); if (!t) return s; if (EN[t]) return s.replace(t, EN[t]);
    for (var i = 0; i < RE.length; i++) if (RE[i][0].test(t)) return s.replace(t, t.replace(RE[i][0], RE[i][1])); return s;
  }
  window.T = function (s) { return L === 'en' ? t1(s) : s; };
  function dugum(n) {
    if (n.nodeType === 3) { var v = n.nodeValue, r = t1(v); if (r !== v) n.nodeValue = r; return; }
    if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
    ['title', 'placeholder', 'aria-label'].forEach(function (a) { if (n.hasAttribute(a)) { var v = n.getAttribute(a), r = t1(v); if (r !== v) n.setAttribute(a, r); } });
    for (var c = n.firstChild; c; c = c.nextSibling) dugum(c);
  }
  window.dilSec = function (l) { try { localStorage.setItem('spot_dil', l); } catch (e) {} location.reload(); };
  if (L === 'en') {
    var basla = function () {
      dugum(document.body);
      new MutationObserver(function (ml) { ml.forEach(function (m) { if (m.type === 'characterData') dugum(m.target); else m.addedNodes.forEach(dugum); if (m.type === 'attributes') dugum(m.target); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
  }
})();
