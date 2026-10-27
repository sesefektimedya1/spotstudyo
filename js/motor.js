/* Spot Stüdyo — ses motoru
 * Tarayıcıda ve Node'da çalışır. Hiçbir sunucu gerektirmez.
 * Sıra: Gürültü azaltma → Kapı → EQ → Kompresör → Efekt → Miks → Seviye (LUFS + sınırlayıcı)
 */
(function (kok) {
  'use strict';

  var dB = function (x) { return Math.pow(10, x / 20); };
  var toDb = function (x) { return 20 * Math.log10(Math.max(x, 1e-12)); };

  /* ---------- FFT ---------- */
  var fftOnbellek = {};
  function fftHazirla(n) {
    if (fftOnbellek[n]) return fftOnbellek[n];
    var rev = new Uint32Array(n), bits = Math.round(Math.log2(n));
    for (var i = 0; i < n; i++) {
      var r = 0, v = i;
      for (var b = 0; b < bits; b++) { r = (r << 1) | (v & 1); v >>= 1; }
      rev[i] = r;
    }
    var cs = new Float64Array(n / 2), sn = new Float64Array(n / 2);
    for (var k = 0; k < n / 2; k++) { cs[k] = Math.cos(2 * Math.PI * k / n); sn[k] = Math.sin(2 * Math.PI * k / n); }
    return (fftOnbellek[n] = { rev: rev, cs: cs, sn: sn });
  }
  function fft(re, im, ters) {
    var n = re.length, t = fftHazirla(n), rev = t.rev, i, j, tmp;
    for (i = 0; i < n; i++) {
      j = rev[i];
      if (j > i) { tmp = re[i]; re[i] = re[j]; re[j] = tmp; tmp = im[i]; im[i] = im[j]; im[j] = tmp; }
    }
    var isg = ters ? 1 : -1;
    for (var len = 2; len <= n; len <<= 1) {
      var half = len >> 1, step = n / len;
      for (i = 0; i < n; i += len) {
        for (var k = 0, ti = 0; k < half; k++, ti += step) {
          var wr = t.cs[ti], wi = isg * t.sn[ti];
          var a = i + k, bb = a + half;
          var xr = re[bb] * wr - im[bb] * wi, xi = re[bb] * wi + im[bb] * wr;
          re[bb] = re[a] - xr; im[bb] = im[a] - xi;
          re[a] += xr; im[a] += xi;
        }
      }
    }
    if (ters) { for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; } }
  }

  /* ---------- Biquad (RBJ) ---------- */
  function biquadKatsayi(tip, fs, f0, Q, gainDb) {
    var w0 = 2 * Math.PI * Math.min(f0, fs * 0.49) / fs, cw = Math.cos(w0), sw = Math.sin(w0);
    var A = Math.pow(10, (gainDb || 0) / 40), alpha = sw / (2 * (Q || 0.7071));
    var b0, b1, b2, a0, a1, a2, s;
    switch (tip) {
      case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'lp': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'bp': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'peak': b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
      case 'lowshelf':
        s = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s);
        a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; break;
      case 'highshelf':
        s = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s);
        a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; break;
      default: b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  }
  function biquadUygula(x, k) {
    var n = x.length, y = new Float32Array(n), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < n; i++) {
      var xi = x[i], yi = k.b0 * xi + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2;
      y[i] = yi; x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    }
    return y;
  }

  /* Frekans cevabi egrisine gore sifir faz filtre (Graphic EQ): Hann pencereli bindirmeli FFT */
  function frekFiltre(x, sr, mag, N) {
    N = N || 4096; var n = x.length; if (!n) return x;
    var hop = N >> 1, H = new Float64Array(N / 2 + 1), k, i, s;
    for (k = 0; k <= N / 2; k++) H[k] = mag(k * sr / N);
    var win = new Float64Array(N); for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    var y = new Float32Array(n), re = new Float64Array(N), im = new Float64Array(N);
    for (s = -hop; s < n; s += hop) {
      for (i = 0; i < N; i++) { var ix = s + i; re[i] = (ix >= 0 && ix < n ? x[ix] : 0) * win[i]; im[i] = 0; }
      fft(re, im, false);
      for (k = 0; k < N; k++) { var h = H[k <= N / 2 ? k : N - k]; re[k] *= h; im[k] *= h; }
      fft(re, im, true);
      for (i = 0; i < N; i++) { var iy = s + i; if (iy >= 0 && iy < n) y[iy] += re[i]; }
    }
    return y;
  }
  function genisligdenQ(bw) { var p = Math.pow(2, bw); return Math.sqrt(p) / (p - 1); }

  function eq(x, sr, bantlar) {
    var y = x;
    for (var i = 0; i < bantlar.length; i++) {
      var b = bantlar[i];
      var q = b.q || (b.bw ? genisligdenQ(b.bw) : 0.7071);
      y = biquadUygula(y, biquadKatsayi(b.t, sr, b.f, q, b.g || 0));
    }
    return y;
  }

  /* ---------- Gürültü azaltma (gürültü izi + spektral çıkarma) ---------- */
  function gurultuAzalt(x, sr, p, iz) {
    var n = 2048, hop = 512, yari = n / 2 + 1, pad = n, len = x.length;
    if (len < n * 2) return x;
    var xp = new Float32Array(len + 2 * pad); xp.set(x, pad);
    var F = Math.floor((xp.length - n) / hop) + 1;
    var win = new Float64Array(n);
    for (var i = 0; i < n; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    var re = new Float64Array(n), im = new Float64Array(n);
    function cerceve(kaynak, o) {
      for (var i = 0; i < n; i++) { re[i] = (kaynak[o + i] || 0) * win[i]; im[i] = 0; }
      fft(re, im, false);
    }
    var N = new Float64Array(yari), sayi = 0, f, k;
    if (iz && iz.length >= n) {
      for (var o = 0; o + n <= iz.length; o += hop) {
        cerceve(iz, o); for (k = 0; k < yari; k++) N[k] += re[k] * re[k] + im[k] * im[k]; sayi++;
      }
    } else {
      var E = [];
      for (f = 0; f < F; f++) {
        var o2 = f * hop;
        if (o2 < pad || o2 + n > pad + len) continue;
        cerceve(xp, o2); var s = 0;
        for (k = 0; k < yari; k++) s += re[k] * re[k] + im[k] * im[k];
        E.push([s, f]);
      }
      E.sort(function (a, b) { return a[0] - b[0]; });
      var al = Math.max(8, Math.floor(E.length * 0.12));
      for (var j = 0; j < al && j < E.length; j++) {
        cerceve(xp, E[j][1] * hop); for (k = 0; k < yari; k++) N[k] += re[k] * re[k] + im[k] * im[k]; sayi++;
      }
    }
    if (!sayi) return x;
    for (k = 0; k < yari; k++) N[k] /= sayi;

    var alpha = 2 * Math.pow(10, (p.bias || 0) / 20);
    var beta = Math.pow(10, -(p.db) / 10);
    var rel = 0.95 - 0.003 * (p.hiz == null ? 50 : p.hiz);
    var y = new Float32Array(xp.length), Gp = new Float64Array(yari).fill(1);
    var Gn = new Float64Array(yari), Gs = new Float64Array(yari);
    for (f = 0; f < F; f++) {
      var off = f * hop;
      cerceve(xp, off);
      for (k = 0; k < yari; k++) {
        var P = re[k] * re[k] + im[k] * im[k];
        var g = 1 - alpha * N[k] / (P + 1e-18);
        Gn[k] = Math.sqrt(g < beta ? beta : g);
      }
      for (k = 0; k < yari; k++) {
        var s2 = 0, c = 0;
        for (var d = -2; d <= 2; d++) { var kk = k + d; if (kk >= 0 && kk < yari) { s2 += Gn[kk]; c++; } }
        Gs[k] = s2 / c;
      }
      for (k = 0; k < yari; k++) {
        var v = rel * Gp[k] + (1 - rel) * Gs[k];
        var gg = Gs[k] > v ? Gs[k] : v; Gp[k] = gg;
        re[k] *= gg; im[k] *= gg;
        if (k > 0 && k < n / 2) { re[n - k] *= gg; im[n - k] *= gg; }
      }
      fft(re, im, true);
      for (i = 0; i < n; i++) y[off + i] += re[i] * win[i] * 0.5;
    }
    return y.slice(pad, pad + len);
  }

  /* ---------- Kapı (Noise Gate) ---------- */
  function kapi(x, sr, p) {
    var fr = Math.round(sr * 0.01), n = Math.floor(x.length / fr);
    if (n < 8) return x;
    var edb = new Float64Array(n), i, j;
    for (i = 0; i < n; i++) {
      var s = 0; for (j = 0; j < fr; j++) { var v = x[i * fr + j]; s += v * v; }
      edb[i] = 10 * Math.log10(s / fr + 1e-18);
    }
    var sirali = Array.prototype.slice.call(edb).sort(function (a, b) { return a - b; });
    var m = Math.max(5, Math.floor(0.08 * n)), dip = 0;
    for (i = 0; i < m; i++) dip += sirali[i]; dip /= m;
    var konus = sirali[Math.floor(sirali.length * 0.9)], konum = (p.konum == null) ? 0.45 : p.konum;
    var esik = (p.esik == null) ? Math.max(dip + 12, dip + (konus - dip) * konum) : p.esik;
    var bekle = Math.max(0, Math.round((p.bekle == null ? 60 : p.bekle) / 10));
    var ac = new Uint8Array(n), say = 0;
    for (i = 0; i < n; i++) {
      var acik = edb[i] > esik;
      if (acik) say = bekle;
      ac[i] = (acik || say > 0) ? 1 : 0;
      if (!acik && say > 0) say--;
    }
    var la = 2, ac2 = new Uint8Array(n);
    for (i = 0; i < n; i++) ac2[i] = (i + la < n) ? ac[i + la] : 1;
    var cAc = Math.exp(-10 / Math.max(1, p.ac || 15)), cKapa = Math.exp(-10 / Math.max(1, p.kapa || 120));
    var taban = dB(-(p.aralik == null ? 30 : p.aralik)), gs = new Float64Array(n), cur = 1;
    for (i = 0; i < n; i++) {
      var hedef = ac2[i], cf = hedef > cur ? cAc : cKapa;
      cur = cf * cur + (1 - cf) * hedef;
      gs[i] = taban + (1 - taban) * cur;
    }
    var y = new Float32Array(x.length);
    for (i = 0; i < x.length; i++) {
      var pos = i / fr - 0.5, i0 = Math.floor(pos), fk = pos - i0;
      var a = gs[Math.max(0, Math.min(n - 1, i0))], b = gs[Math.max(0, Math.min(n - 1, i0 + 1))];
      y[i] = x[i] * (a + (b - a) * fk);
    }
    return y;
  }

  /* ---------- Kompresör ---------- */
  function kompresor(x, sr, p) {
    var n = x.length, y = new Float32Array(n);
    var ca = Math.exp(-1 / (sr * Math.max(0.1, p.atak) / 1000)), cr = Math.exp(-1 / (sr * Math.max(1, p.birak) / 1000));
    var cd = Math.exp(-1 / (sr * 0.005)), r2 = 0, gr = 0, diz = p.diz == null ? 6 : p.diz;
    var esik = p.esik, oran = Math.max(1, p.oran), mk = p.makyaj || 0;
    for (var i = 0; i < n; i++) {
      var xi = x[i];
      r2 = cd * r2 + (1 - cd) * xi * xi;
      var lvl = 10 * Math.log10(r2 + 1e-12), over = lvl - esik, red;
      if (2 * over < -diz) red = 0;
      else if (2 * Math.abs(over) <= diz) red = (1 / oran - 1) * Math.pow(over + diz / 2, 2) / (2 * diz);
      else red = (1 / oran - 1) * over;
      var hedef = -red;
      gr = hedef > gr ? ca * gr + (1 - ca) * hedef : cr * gr + (1 - cr) * hedef;
      y[i] = xi * dB(-gr + mk);
    }
    return y;
  }

  /* ---------- Sınırlayıcı (ileri bakışlı, bağlı stereo) ---------- */
  function kayanMin(a, w) {
    var n = a.length, out = new Float32Array(n), dq = new Int32Array(n), h = 0, t = 0, j = 0;
    for (var i = 0; i < n; i++) {
      var hi = Math.min(n - 1, i + w);
      while (j <= hi) { while (t > h && a[dq[t - 1]] >= a[j]) t--; dq[t++] = j; j++; }
      while (dq[h] < i - w) h++;
      out[i] = a[dq[h]];
    }
    return out;
  }
  function sinirla(L, R, sr, tavanDb, birakMs) {
    var n = L.length, c = dB(tavanDb), gReq = new Float32Array(n), i;
    for (i = 0; i < n; i++) {
      var pk = Math.max(Math.abs(L[i]), R ? Math.abs(R[i]) : 0);
      gReq[i] = pk > c ? c / pk : 1;
    }
    var la = Math.max(4, Math.round(sr * 0.004)), gm = kayanMin(gReq, la), h = Math.floor(la / 2);
    var pre = new Float64Array(n + 1);
    for (i = 0; i < n; i++) pre[i + 1] = pre[i] + gm[i];
    var rc = Math.exp(-1 / (sr * (birakMs || 80) / 1000)), r = 1;
    var oL = new Float32Array(n), oR = R ? new Float32Array(n) : null;
    for (i = 0; i < n; i++) {
      var lo = Math.max(0, i - h), hi = Math.min(n - 1, i + h);
      var ga = (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
      r = r + (1 - r) * (1 - rc);
      if (ga < r) r = ga;
      oL[i] = L[i] * r; if (R) oR[i] = R[i] * r;
    }
    return { L: oL, R: oR };
  }

  /* ---------- Ses yüksekliği (ITU-R BS.1770 / EBU R128) ---------- */
  function lufs(kanallar, sr) {
    var yu = biquadKatsayi('highshelf', sr, 1681.974450955533, 0.7071752369554196, 3.999843853973347);
    var hp = biquadKatsayi('hp', sr, 38.13547087602444, 0.5003270373238773, 0);
    var sub = Math.round(0.1 * sr), len = kanallar[0].length, ns = Math.floor(len / sub);
    if (ns < 4) return -70;
    var sq = new Float64Array(ns), c, j, i;
    for (c = 0; c < kanallar.length; c++) {
      var f = biquadUygula(biquadUygula(kanallar[c], yu), hp);
      for (j = 0; j < ns; j++) { var s = 0, o = j * sub; for (i = 0; i < sub; i++) { var v = f[o + i]; s += v * v; } sq[j] += s; }
    }
    var z = [];
    for (j = 0; j + 3 < ns; j++) z.push((sq[j] + sq[j + 1] + sq[j + 2] + sq[j + 3]) / (4 * sub));
    function lk(v) { return -0.691 + 10 * Math.log10(v + 1e-20); }
    var t1 = z.filter(function (v) { return lk(v) > -70; });
    if (!t1.length) return -70;
    var ort = t1.reduce(function (a, b) { return a + b; }, 0) / t1.length, kapi2 = lk(ort) - 10;
    var t2 = t1.filter(function (v) { return lk(v) > kapi2; });
    if (!t2.length) return -70;
    return lk(t2.reduce(function (a, b) { return a + b; }, 0) / t2.length);
  }
  function tepeDb(kanallar) {
    var m = 0;
    for (var c = 0; c < kanallar.length; c++) { var x = kanallar[c]; for (var i = 0; i < x.length; i++) { var a = Math.abs(x[i]); if (a > m) m = a; } }
    return toDb(m);
  }
  function rmsDb(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * x[i]; return 10 * Math.log10(s / Math.max(1, x.length) + 1e-18); }

  /* ---------- Efektler ---------- */
  function yankiHesapla(x, sr, p) {
    var sc = sr / 44100, cT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aT = [556, 441, 341, 225], yay = Math.round(23 * sc);
    var fb = 0.7 + 0.28 * Math.max(0, Math.min(1, p.oda)), d1 = 0.4 * Math.max(0, Math.min(1, p.sonum)), d2 = 1 - d1;
    var pre = Math.round(sr * (p.onGecikme || 0) / 1000), n = x.length;
    function kanal(ek) {
      var cb = cT.map(function (v) { return new Float32Array(Math.round(v * sc) + ek); });
      var ci = cb.map(function () { return 0; }), cf = cb.map(function () { return 0; });
      var ab = aT.map(function (v) { return new Float32Array(Math.round(v * sc) + ek); });
      var ai = ab.map(function () { return 0; });
      var out = new Float32Array(n), i, k;
      for (i = 0; i < n; i++) {
        var inp = (i - pre >= 0 ? x[i - pre] : 0) * 0.015, s = 0;
        for (k = 0; k < cb.length; k++) {
          var b = cb[k], o = b[ci[k]];
          cf[k] = o * d2 + cf[k] * d1; b[ci[k]] = inp + cf[k] * fb;
          if (++ci[k] >= b.length) ci[k] = 0; s += o;
        }
        for (k = 0; k < ab.length; k++) {
          var bb = ab[k], bo = bb[ai[k]], o2 = -s + bo; bb[ai[k]] = s + bo * 0.5;
          if (++ai[k] >= bb.length) ai[k] = 0; s = o2;
        }
        out[i] = s;
      }
      return out;
    }
    var wL = kanal(0), wR = kanal(yay), rx = Math.sqrt(Math.max(1e-18, rmsLin(x))), rw = Math.sqrt(Math.max(1e-18, (rmsLin(wL) + rmsLin(wR)) / 2));
    var g = (p.karisim || 0) * rx / rw, L = new Float32Array(n), R = new Float32Array(n);
    for (var i = 0; i < n; i++) { L[i] = x[i] + wL[i] * g; R[i] = x[i] + wR[i] * g; }
    return { L: L, R: R };
  }
  function rmsLin(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * x[i]; return s / Math.max(1, x.length); }
  function gecikmeHesapla(x, sr, p) {
    var d = Math.max(1, Math.round(sr * p.sure / 1000)), n = x.length, y = new Float32Array(n), buf = new Float32Array(d), idx = 0, lp = 0;
    var a = Math.exp(-2 * Math.PI * (p.ton || 4000) / sr);
    for (var i = 0; i < n; i++) {
      var dl = buf[idx]; lp = (1 - a) * dl + a * lp;
      y[i] = x[i] + p.karisim * dl; buf[idx] = x[i] + p.geriBes * lp;
      if (++idx >= d) idx = 0;
    }
    return y;
  }
  function telefon(x, sr) {
    var y = biquadUygula(biquadUygula(x, biquadKatsayi('hp', sr, 320, 0.8)), biquadKatsayi('lp', sr, 3300, 0.8));
    for (var i = 0; i < y.length; i++) y[i] = Math.tanh(1.8 * y[i]);
    return eslestirRms(y, x);
  }
  function megafon(x, sr) {
    var y = biquadUygula(biquadUygula(x, biquadKatsayi('hp', sr, 520, 0.8)), biquadKatsayi('lp', sr, 4200, 0.8));
    y = biquadUygula(y, biquadKatsayi('peak', sr, 1600, 1.2, 6));
    for (var i = 0; i < y.length; i++) y[i] = Math.tanh(3 * y[i]);
    return eslestirRms(y, x);
  }
  function robot(x, sr, p) {
    var f = p.frek || 50, mix = p.karisim == null ? 0.85 : p.karisim, y = new Float32Array(x.length), i;
    for (i = 0; i < x.length; i++) y[i] = x[i] * (1 - mix) + mix * x[i] * Math.sin(2 * Math.PI * f * i / sr);
    var d = Math.max(1, Math.round(sr * 0.006)), c = new Float32Array(x.length);
    for (i = 0; i < x.length; i++) c[i] = y[i] + (i >= d ? 0.5 * c[i - d] : 0);
    return eslestirRms(c, x);
  }
  function eslestirRms(y, ref) {
    var g = Math.sqrt(rmsLin(ref) / Math.max(1e-18, rmsLin(y)));
    for (var i = 0; i < y.length; i++) y[i] *= g;
    return y;
  }
  function uzat(x, sn, sr) { var y = new Float32Array(x.length + Math.round(sn * sr)); y.set(x); return y; }

  function efektUygula(y, sr, e) {
    var t = e && e.tur ? e.tur : 'yok', p = (e && e.p) || {}, o;
    if (t === 'yok') return { L: y, R: y };
    if (t === 'yanki') { o = yankiHesapla(uzat(y, 0.5 + (p.oda || 0.5) * 1.5, sr), sr, p); return o; }
    if (t === 'gecikme') { o = gecikmeHesapla(uzat(y, 2.5, sr), sr, p); return { L: o, R: o }; }
    if (t === 'telefon') { o = telefon(y, sr); return { L: o, R: o }; }
    if (t === 'megafon') { o = megafon(y, sr); return { L: o, R: o }; }
    if (t === 'robot') { o = robot(y, sr, p); return { L: o, R: o }; }
    return { L: y, R: y };
  }

  /* ---------- Miks ---------- */
  function muzikHazirla(m, n, sr) {
    var L = new Float32Array(n), R = new Float32Array(n), ml = m.L.length;
    if (!ml) return { L: L, R: R };
    var cf = Math.min(Math.round(0.3 * sr), Math.floor(ml / 4)), pos = 0, i, kaynakOfs = 0;
    while (pos < n) {
      var kalan = ml - kaynakOfs, yaz = Math.min(kalan, n - pos);
      for (i = 0; i < yaz; i++) {
        var gk = 1;
        if (kaynakOfs + i < cf && pos > 0) gk = Math.sin(0.5 * Math.PI * (kaynakOfs + i) / cf);
        else if (ml - (kaynakOfs + i) < cf && pos + yaz < n) gk = Math.cos(0.5 * Math.PI * (1 - (ml - (kaynakOfs + i)) / cf));
        L[pos + i] += m.L[kaynakOfs + i] * gk; R[pos + i] += m.R[kaynakOfs + i] * gk;
      }
      pos += yaz - (yaz === kalan ? cf : 0);
      if (yaz < kalan) break;
      if (pos < 0) break;
      kaynakOfs = 0;
      if (pos >= n) break;
    }
    return { L: L, R: R };
  }
  function sesEtkinlik(mono, sr, n, giris) {
    // 10 ms çerçevelerle konuşma var/yok eğrisi, 0..1
    var fr = Math.round(sr * 0.01), nf = Math.ceil(n / fr), env = new Float64Array(nf), i, j;
    for (i = 0; i < nf; i++) {
      var s = 0, c = 0;
      for (j = 0; j < fr; j++) { var k = i * fr + j - giris; if (k >= 0 && k < mono.length) { s += mono[k] * mono[k]; c++; } }
      env[i] = 10 * Math.log10((c ? s / fr : 0) + 1e-18);
    }
    var siral = Array.prototype.slice.call(env).sort(function (a, b) { return a - b; });
    var ref = siral[Math.floor(siral.length * 0.9)], esik = ref - 25, tut = 0, ak = new Float64Array(nf);
    for (i = 0; i < nf; i++) { if (env[i] > esik) tut = 15; ak[i] = tut > 0 ? 1 : 0; if (env[i] <= esik && tut > 0) tut--; }
    return ak;
  }
  function miksle(vL, vR, sr, muzik, p) {
    var vlen = vL.length, giris = muzik ? Math.round((p.giris || 0) * sr) : 0, vurus = !!(muzik && p.bitis === 'vurus'), kuyruk = Math.round((muzik ? (vurus ? Math.max(p.kuyruk, 2.2) : p.kuyruk) : 0.1) * sr);
    var n = giris + vlen + kuyruk, oL = new Float32Array(n), oR = new Float32Array(n), i;
    for (i = 0; i < vlen; i++) { oL[giris + i] = vL[i]; oR[giris + i] = vR[i]; }
    var sesLufs = lufs([vL, vR], sr), muzikLufs = null;
    if (muzik && muzik.L.length) {
      var m = muzikHazirla(muzik, n, sr);
      var seg = [m.L.subarray(giris, giris + vlen), m.R.subarray(giris, giris + vlen)];
      muzikLufs = lufs(seg, sr);
      var baz = sesLufs - (p.altDb == null ? 10 : p.altDb) - muzikLufs;
      var mono = new Float32Array(vlen); for (i = 0; i < vlen; i++) mono[i] = 0.5 * (vL[i] + vR[i]);
      var ak = sesEtkinlik(mono, sr, n, giris), nf = ak.length;
      var ca = Math.exp(-10 / (p.duckAtak || 200)), cr = Math.exp(-10 / (p.duckBirak || 600)), cur = 0, sm = new Float64Array(nf);
      for (i = 0; i < nf; i++) { var cf = ak[i] > cur ? ca : cr; cur = cf * cur + (1 - cf) * ak[i]; sm[i] = cur; }
      var fr = Math.round(sr * 0.01), yuk = p.yuksel || 0, fadeO = Math.round((p.cikisFade == null ? 1.5 : p.cikisFade) * sr), fadeI = Math.round((p.girisFade == null ? 0.05 : p.girisFade) * sr);
      for (i = 0; i < n; i++) {
        var pos = i / fr - 0.5, i0 = Math.floor(pos), fk = pos - i0;
        var a = sm[Math.max(0, Math.min(nf - 1, i0))], b = sm[Math.max(0, Math.min(nf - 1, i0 + 1))], act = a + (b - a) * fk;
        var g = dB(baz + (1 - act) * yuk);
        if (i < fadeI) g *= i / fadeI;
        if (vurus) { var hitI = giris + vlen + Math.round(0.35 * sr), kes = Math.round(0.12 * sr); if (i > hitI) g *= i > hitI + kes ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * (i - hitI) / kes); }
        else { var kal = n - i; if (kal < fadeO) g *= 0.5 - 0.5 * Math.cos(Math.PI * kal / fadeO); }
        oL[i] += m.L[i] * g; oR[i] += m.R[i] * g;
      }
      if (vurus) { var v = vurusUret(sr, 1.9), hi = giris + vlen + Math.round(0.35 * sr), vg = dB(sesLufs - 4 - toDb(Math.max(1e-4, Math.sqrt(rmsLin(v.subarray(0, Math.round(0.25 * sr))))))); for (i = 0; i < v.length && hi + i < n; i++) { oL[hi + i] += v[i] * vg; oR[hi + i] += v[i] * vg; } }
    }
    return { L: oL, R: oR, sesBasi: giris / sr, sesLufs: sesLufs, muzikLufs: muzikLufs };
  }

  /* ---------- Seviye ---------- */
  function seviyeAyarla(L, R, sr, hedef, tavan) {
    var n = L.length, mevcut = lufs([L, R], sr);
    if (mevcut <= -69) return { L: L, R: R, lufs: mevcut, tepeDb: tepeDb([L, R]) };
    var g = hedef - mevcut, son = null, sL = new Float32Array(n), sR = new Float32Array(n);
    for (var tur = 0; tur < 6; tur++) {
      var k = dB(g);
      for (var i = 0; i < n; i++) { sL[i] = L[i] * k; sR[i] = R[i] * k; }
      son = sinirla(sL, sR, sr, tavan, 80);
      var m = lufs([son.L, son.R], sr), hata = hedef - m;
      if (Math.abs(hata) < 0.1) break;
      g += hata;
    }
    return { L: son.L, R: son.R, lufs: lufs([son.L, son.R], sr), tepeDb: tepeDb([son.L, son.R]) };
  }

  /* ---------- Ön ayarlar ---------- */
  var TON = {
    duz: { ad: 'Düz', bantlar: [] },
    radyo: { ad: 'Radyo spikeri', bantlar: [{ t: 'hp', f: 80 }, { t: 'peak', f: 150, g: 2, bw: 1.2 }, { t: 'peak', f: 3200, g: 2, bw: 1.5 }, { t: 'highshelf', f: 9000, g: 1.5 }] },
    sicak: { ad: 'Sıcak', bantlar: [{ t: 'hp', f: 70 }, { t: 'lowshelf', f: 180, g: 2.5 }, { t: 'peak', f: 3500, g: -1.5, bw: 1.2 }, { t: 'highshelf', f: 9000, g: -1 }] },
    parlak: { ad: 'Parlak', bantlar: [{ t: 'hp', f: 80 }, { t: 'peak', f: 3000, g: 2.5, bw: 1.2 }, { t: 'highshelf', f: 7000, g: 3.5 }] },
    tok: { ad: 'Tok erkek sesi', bantlar: [{ t: 'hp', f: 60 }, { t: 'lowshelf', f: 120, g: 3 }, { t: 'peak', f: 350, g: -2, bw: 1 }, { t: 'peak', f: 3000, g: 1.5, bw: 1.2 }, { t: 'highshelf', f: 8000, g: 1 }] },
    net: { ad: 'Net kadın sesi', bantlar: [{ t: 'hp', f: 100 }, { t: 'peak', f: 250, g: -2, bw: 1 }, { t: 'peak', f: 4000, g: 2.5, bw: 1.5 }, { t: 'highshelf', f: 9000, g: 2 }] },
    uRadyo: { ad: 'Prodüksiyon: radyo', bantlar: [{ t: 'hp', f: 90 }, { t: 'lowshelf', f: 130, g: 1.5 }, { t: 'peak', f: 300, g: -3.5, bw: 1.3 }, { t: 'peak', f: 550, g: -1, bw: 1 }, { t: 'peak', f: 3200, g: 3, bw: 1.4 }, { t: 'highshelf', f: 9500, g: 3 }] },
    uSicak: { ad: 'Prodüksiyon: sıcak', bantlar: [{ t: 'hp', f: 80 }, { t: 'lowshelf', f: 160, g: 2.5 }, { t: 'peak', f: 320, g: -3, bw: 1.3 }, { t: 'peak', f: 3500, g: 1.5, bw: 1.3 }, { t: 'highshelf', f: 10000, g: 1.5 }] },
    uParlak: { ad: 'Prodüksiyon: parlak', bantlar: [{ t: 'hp', f: 90 }, { t: 'peak', f: 280, g: -3.5, bw: 1.3 }, { t: 'peak', f: 3000, g: 3.5, bw: 1.3 }, { t: 'highshelf', f: 7500, g: 4 }] },
    uTok: { ad: 'Prodüksiyon: tok', bantlar: [{ t: 'hp', f: 70 }, { t: 'lowshelf', f: 120, g: 3 }, { t: 'peak', f: 320, g: -3, bw: 1.2 }, { t: 'peak', f: 3000, g: 2.5, bw: 1.3 }, { t: 'highshelf', f: 9000, g: 2 }] },
    sonytiz: { ad: 'Tizi aç (Sony hazır ayarına benzer)', bantlar: [{ t: 'highshelf', f: 5000, g: 9 }] },
    fletcher: { ad: 'Fletcher-Munson (Sony)', bantlar: [{ t: 'lowshelf', f: 200, g: 6 }, { t: 'peak', f: 4000, g: -12, bw: 1 }, { t: 'highshelf', f: 8000, g: 6 }] }
  };
  var KUVVET = {
    kapali: { ad: 'Kapalı', aktif: false },
    hafif: { ad: 'Hafif (Graphic Dynamics)', aktif: true, uEsik: -22, esik: -14.5, oran: 1.4, atak: 1, birak: 500, makyaj: 0 },
    radyo: { ad: 'Radyo (Wave Hammer)', aktif: true, uEsik: -22, esik: -8.1, oran: 4, atak: 40, birak: 80, makyaj: 2 },
    siki: { ad: 'Sıkı', aktif: true, uEsik: -25, esik: -12, oran: 6, atak: 10, birak: 120, makyaj: 3 },
    coksiki: { ad: 'Çok sıkı', aktif: true, uEsik: -28, esik: -16, oran: 8, atak: 5, birak: 150, makyaj: 4 }
  };
  var TEMIZLE = {
    yok: { ad: 'Temizlik yok', g: { aktif: false }, k: { aktif: false } },
    hafif: { ad: 'Hafif (12 dB, yumuşak kapı)', g: { aktif: true, db: 12, bias: 0, hiz: 50 }, k: { aktif: true, esik: null, konum: 0.35, aralik: 40, bekle: 40, ac: 12, kapa: 80 } },
    standart: { ad: 'Standart (18 dB + kapı)', g: { aktif: true, db: 18, bias: 0, hiz: 50 }, k: { aktif: true, esik: null, konum: 0.45, aralik: 70, bekle: 20, ac: 8, kapa: 40 } },
    guclu: { ad: 'Güçlü (24 dB + sıkı kapı)', g: { aktif: true, db: 24, bias: 2, hiz: 50 }, k: { aktif: true, esik: null, konum: 0.5, aralik: 80, bekle: 15, ac: 8, kapa: 35 } },
    cokguclu: { ad: 'Çok kirli oda (30 dB)', g: { aktif: true, db: 30, bias: 3, hiz: 50 }, k: { aktif: true, esik: null, konum: 0.55, aralik: 90, bekle: 10, ac: 6, kapa: 30 } },
    kapi: { ad: 'Yalnız kapı', g: { aktif: false }, k: { aktif: true, esik: null, konum: 0.45, aralik: 70, bekle: 20, ac: 8, kapa: 40 } }
  };
  var EFEKT = {
    yok: { ad: 'Yok', tur: 'yok', p: {} },
    oda: { ad: 'Hafif oda', tur: 'yanki', p: { oda: 0.3, sonum: 0.5, karisim: 0.08, onGecikme: 10 } },
    plak: { ad: 'Stüdyo plak', tur: 'yanki', p: { oda: 0.5, sonum: 0.4, karisim: 0.12, onGecikme: 20 } },
    salon: { ad: 'Büyük salon', tur: 'yanki', p: { oda: 0.8, sonum: 0.3, karisim: 0.2, onGecikme: 30 } },
    yanki: { ad: 'Yankı (slapback)', tur: 'gecikme', p: { sure: 120, geriBes: 0.25, karisim: 0.2, ton: 4000 } },
    telefon: { ad: 'Telefon', tur: 'telefon', p: {} },
    megafon: { ad: 'Megafon', tur: 'megafon', p: {} },
    robot: { ad: 'Robot', tur: 'robot', p: { frek: 50, karisim: 0.85 } }
  };
  var SEVIYE = {
    radyo: { ad: 'Radyo', hedef: -11.6, tavan: -1.5, bicim: 'mp3' },
    tv: { ad: 'Televizyon', hedef: -23, tavan: -2, bicim: 'mp3' },
    santral: { ad: 'Santral', hedef: -16, tavan: -1.5, bicim: 'wav8' }
  };
  var TARZ = [
    { ad: 'Dengeli radyo', temizle: 'standart', ton: 'uRadyo', kuvvet: 'radyo', efekt: 'yok', muzik: { altDb: 15, yuksel: 1.5, giris: 1, kuyruk: 1.2, cikisFade: 1 } },
    { ad: 'Sıcak', temizle: 'standart', ton: 'uSicak', kuvvet: 'radyo', efekt: 'oda', muzik: { altDb: 14, yuksel: 2, giris: 1.2, kuyruk: 1.4, cikisFade: 1.2 } },
    { ad: 'Parlak', temizle: 'standart', ton: 'uParlak', kuvvet: 'siki', efekt: 'yok', muzik: { altDb: 16, yuksel: 2, giris: 0.9, kuyruk: 1.1, cikisFade: 1 } },
    { ad: 'Enerjik', temizle: 'standart', ton: 'uParlak', kuvvet: 'siki', efekt: 'plak', muzik: { altDb: 13, yuksel: 3, giris: 0.8, kuyruk: 1, cikisFade: 0.8, bitis: 'vurus' } },
    { ad: 'Tok ve resmi', temizle: 'standart', ton: 'uTok', kuvvet: 'radyo', efekt: 'yok', muzik: { altDb: 17, yuksel: 2, giris: 1.4, kuyruk: 1.5, cikisFade: 1.2 } }
  ];

  function varsayilanZincir() {
    return {
      agiz: { aktif: true, guc: 1 },
      deess: { aktif: true, oran: 3 },
      gurultu: { aktif: true, db: 18, bias: 0, hiz: 50, iz: null },
      kapi: { aktif: true, esik: null, konum: 0.45, aralik: 70, bekle: 20, ac: 8, kapa: 40 },
      ton: { onayar: 'duz', bantlar: [] },
      kuvvet: { aktif: true, esik: -8.1, oran: 4, atak: 40, birak: 80, makyaj: 2, diz: 6 },
      efekt: { tur: 'yok', onayar: 'yok', p: {} },
      muzik: { altDb: 15, yuksel: 1.5, giris: 1, kuyruk: 1.2, cikisFade: 1, girisFade: 0.05, duckAtak: 200, duckBirak: 600, bitis: 'fade' },
      seviye: { tur: 'radyo', hedef: -11.6, tavan: -1.5 }
    };
  }
  function tarzUygula(z, t) {
    var T = TEMIZLE[t.temizle];
    z.gurultu = Object.assign({ aktif: false, db: 12, bias: 0, hiz: 50, iz: z.gurultu.iz }, T.g);
    z.kapi = Object.assign({ aktif: false, esik: null, aralik: 30, bekle: 60, ac: 15, kapa: 120 }, T.k);
    z.ton = { onayar: t.ton, bantlar: JSON.parse(JSON.stringify(TON[t.ton].bantlar)) };
    var K = KUVVET[t.kuvvet]; z.kuvvet = Object.assign({ aktif: true, diz: 6 }, K, K.uEsik != null ? { esik: K.uEsik } : {}); z.uretim = { aktif: true, hedefLufs: -20 };
    var E = EFEKT[t.efekt]; z.efekt = { tur: E.tur, onayar: t.efekt, p: JSON.parse(JSON.stringify(E.p)) };
    z.muzik = Object.assign({}, z.muzik, { bitis: 'fade' }, t.muzik);
    if (!z.agiz) z.agiz = { aktif: true, guc: 1 }; if (!z.deess) z.deess = { aktif: true, oran: 3 };
    return z;
  }


  /* ---------- Ağız sesi (dudak/dil tıkırtısı) temizleyici ---------- */
  function agizTemizle(x, sr, p) {
    p = p || {}; var guc = p.guc == null ? 1 : p.guc, n = x.length, i, j;
    if (n < sr / 10) return { y: x, adet: 0 };
    var e = new Float32Array(n);
    for (i = 2; i < n; i++) e[i] = Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]);
    var ps = new Float64Array(n + 1); for (i = 0; i < n; i++) ps[i + 1] = ps[i] + e[i] * e[i];
    var W = Math.round(sr * 0.02), T = 7 / Math.max(0.4, guc);
    var mx = 0, st = new Float32Array(n); for (i = 0; i < n; i++) st[i] = Math.abs(x[i]);
    var srt = Array.prototype.slice.call(st.filter(function (v, k) { return k % 7 === 0; })).sort(function (a, b) { return a - b; }), ref = srt[Math.floor(srt.length * 0.995)] || 0.1;
    var maxSpan = Math.round(sr * 0.012), sure = Math.round(sr * 0.0015);
    var aralik = [], son = -1e9;
    for (i = 3; i < n - 3; i++) {
      var a = Math.max(0, i - W), b = Math.min(n, i + W), bas = Math.sqrt((ps[b] - ps[a] - e[i] * e[i]) / Math.max(1, b - a)) + 1e-5;
      if (e[i] > T * bas && e[i] > 0.003) {
        if (i - son <= sure && aralik.length) aralik[aralik.length - 1][1] = i; else aralik.push([i, i]);
        son = i;
      }
    }
    var y = Float32Array.from(x), adet = 0, lpk = biquadKatsayi('lp', sr, 1100, 0.7071), lp = null;
    for (var k = 0; k < aralik.length; k++) {
      var s0 = aralik[k][0] - Math.round(sr * 0.0008), s1 = aralik[k][1] + Math.round(sr * 0.0025);
      s0 = Math.max(3, s0); s1 = Math.min(n - 4, s1);
      if (s1 - s0 > maxSpan) continue;
      var pk = 0; for (j = s0; j <= s1; j++) pk = Math.max(pk, Math.abs(x[j]));
      if (pk > 0.22 * ref) continue; /* konuşmanın patlayıcı harfleri (p, t, k) bu kadar yüksektir; dokunma */
      var lw0 = Math.max(0, s0 - W), lw1 = Math.min(n, s1 + W), lr = 0; for (j = lw0; j < lw1; j++) lr += x[j] * x[j]; if (10 * Math.log10(lr / Math.max(1, lw1 - lw0) + 1e-12) > -21) continue; /* yüksek sesli konuşma içi: ses zaten örter */
      if (!lp) lp = biquadUygula(biquadUygula(x, lpk), lpk);
      var cf = Math.round(sr * 0.0008);
      for (j = s0 - cf; j <= s1 + cf; j++) {
        if (j < 0 || j >= n) continue;
        var w = j < s0 ? (j - (s0 - cf)) / cf : j > s1 ? 1 - (j - s1) / cf : 1;
        y[j] = x[j] * (1 - w) + (lp[j] * 0.8) * w;
      }
      adet++;
    }
    return { y: y, adet: adet };
  }

  /* ---------- De-esser: s / ş harflerinin cızırtısını yumuşatır ---------- */
  function deEss(x, sr, p) {
    p = p || {}; var oran = p.oran || 3, n = x.length, i;
    var bk = biquadKatsayi('bp', sr, p.frek || 7000, 1.1), band = biquadUygula(biquadUygula(x, bk), biquadKatsayi('hp', sr, 4500, 0.7071));
    var env = new Float32Array(n), ca = Math.exp(-1 / (sr * 0.0015)), cr = Math.exp(-1 / (sr * 0.04)), c = 0;
    for (i = 0; i < n; i++) { var a = Math.abs(band[i]); c = a > c ? ca * c + (1 - ca) * a : cr * c + (1 - cr) * a; env[i] = c; }
    var sr2 = [], ad = Math.max(1, Math.floor(n / 4000));
    for (i = 0; i < n; i += ad) sr2.push(env[i]);
    sr2.sort(function (a, b) { return a - b; });
    var esik = Math.max(1e-4, (sr2[Math.floor(sr2.length * (p.yuzde || 0.82))] || 0) * (p.carpan || 1));
    var y = new Float32Array(n), x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = null, maxAz = p.maxDb || 6, gdb = 0, fr = p.frek || 7000;
    for (i = 0; i < n; i++) {
      if (i % 48 === 0) {
        var ex = env[i] > esik ? 20 * Math.log10(env[i] / esik) * (1 - 1 / oran) : 0; ex = Math.min(maxAz, ex);
        gdb = ex > gdb ? ex : gdb + (ex - gdb) * 0.06; /* hızlı kıs, yavaş bırak */
        k = biquadKatsayi('peak', sr, fr, 0.8, -gdb);
      }
      var xi = x[i], yi = k.b0 * xi + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2;
      y[i] = yi; x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    }
    return y;
  }

  /* ---------- Bitiş vuruşu ("dunk") ---------- */
  function vurusUret(sr, sn) {
    var n = Math.round(sn * sr), o = new Float32Array(n), ph = 0, i, nz = 12345;
    for (i = 0; i < n; i++) {
      var t = i / sr, f = 42 + 70 * Math.exp(-t * 18); ph += 2 * Math.PI * f / sr;
      nz = (nz * 1103515245 + 12345) & 0x7fffffff; var r = (nz / 0x3fffffff) - 1;
      o[i] = Math.sin(ph) * Math.exp(-t * 3.6) * 0.9 + r * Math.exp(-t * 28) * 0.35;
    }
    var ln = biquadKatsayi('lp', sr, 2600, 0.7071); return biquadUygula(o, ln);
  }


  /* ---------- Kayıt başındaki mikrofon açma takırtısı ---------- */
  function baslangicTemizle(x, sr) {
    var n = x.length, F = Math.round(sr * 0.01), nf = Math.floor(n / F), i, j;
    if (nf < 60) return { y: x, kesildi: 0 };
    var env = new Float64Array(nf);
    for (i = 0; i < nf; i++) { var s = 0; for (j = 0; j < F; j++) { var v = x[i * F + j]; s += v * v; } env[i] = 10 * Math.log10(s / F + 1e-12); }
    var srt = Array.prototype.slice.call(env).sort(function (a, b) { return a - b; }), ref = srt[Math.floor(nf * 0.9)], esik = ref - 12, sessiz = ref - 18;
    var ilk = 0; while (ilk < nf && env[ilk] < -80) ilk++;                    /* baştaki dijital sessizlik */
    var a = ilk; if (a >= nf || a > 40) return { y: x, kesildi: 0 };          /* ilk ses kaydın başından çok sonra: takırtı değil */
    var b = a; while (b < nf && b - a < 40 && env[b] > esik - 6) b++;         /* yüksek bölüm (en çok 400 ms) */
    if (b >= nf || b - a > 25 || env[a] < esik - 6) return { y: x, kesildi: 0 };
    var bosluk = 0; for (i = b; i < Math.min(nf, b + 20) && env[i] < sessiz; i++) bosluk++;
    if (bosluk < 12) return { y: x, kesildi: 0 };                              /* ardından en az ~120 ms sakinlik yoksa bu bir kelimedir */
    var y = Float32Array.from(x), s0 = a * F, s1 = Math.min(n, (b + 3) * F), fd = Math.round(sr * 0.006);
    for (i = s0; i < s1; i++) y[i] = 0;
    for (i = 0; i < fd && s1 + i < n; i++) y[s1 + i] = x[s1 + i] * (i / fd);   /* çıkışta yumuşak geçiş */
    return { y: y, kesildi: (s1 - s0) / sr };
  }


  /* ---------- Baş ve son kırpma: konuşmadan önceki takırtı, sonraki gürültü ---------- */
  function uclariKes(x, sr, p) {
    p = p || {}; var n = x.length, F = Math.round(sr * 0.01), nf = Math.floor(n / F), i, j, k;
    var ON = p.on == null ? 0.15 : p.on, SON = p.son == null ? 0.2 : p.son;
    if (nf < 80) return { y: x, bas: 0, son: 0 };
    var env = new Float64Array(nf);
    for (i = 0; i < nf; i++) { var s = 0; for (j = 0; j < F; j++) { var v = x[i * F + j]; s += v * v; } env[i] = 10 * Math.log10(s / F + 1e-12); }
    var srt = Array.prototype.slice.call(env).sort(function (a, b) { return a - b; }), ref = srt[Math.floor(nf * 0.9)], T = ref - 20;
    /* Sesli (perdeli) çerçeveler: gerçek konuşmayı mikrofon/ağız takırtısından ayırır. Takırtılarda periyodik yapı yoktur. */
    var dec = 4, dn = Math.floor(n / dec), d = new Float32Array(dn);
    for (i = 0; i < dn; i++) d[i] = (x[i * dec] + x[i * dec + 1] + x[i * dec + 2] + x[i * dec + 3]) * 0.25;
    var fd = F / dec, W = Math.round(0.03 * sr / dec), L0 = Math.round(sr / dec / 420), L1 = Math.round(sr / dec / 80), V = new Uint8Array(nf);
    for (i = 0; i < nf; i++) {
      if (env[i] < ref - 24) continue;
      var a0 = Math.round(i * fd), best = 0;
      if (a0 + W + L1 >= dn) continue;
      for (var lag = L0; lag <= L1; lag++) { var sx = 0, e1 = 0, e2 = 0; for (k = 0; k < W; k++) { var u = d[a0 + k], w2 = d[a0 + k + lag]; sx += u * w2; e1 += u * u; e2 += w2 * w2; } var r = sx / Math.sqrt(e1 * e2 + 1e-18); if (r > best) best = r; }
      if (best > 0.5) V[i] = 1;
    }
    function kumeler(gap) { var out = [], a = -1, bos = 0; for (i = 0; i < nf; i++) { if (env[i] > T) { if (a < 0) a = i; bos = 0; } else if (a >= 0) { bos++; if (bos > gap) { out.push([a, i - bos + 1]); a = -1; bos = 0; } } } if (a >= 0) out.push([a, nf - bos]); return out; }
    function sesliSay(r) { var c = 0; for (var q = r[0]; q < r[1]; q++) c += V[q]; return c; }
    var bas = kumeler(15).filter(function (r) { return sesliSay(r) >= 6; });
    if (!bas.length) bas = kumeler(15).filter(function (r) { return r[1] - r[0] >= 13; }); /* hiç perdeli parça yoksa süreye bak */
    if (!bas.length) return { y: x, bas: 0, son: 0 };
    var son = kumeler(8).filter(function (r) { return r[1] - r[0] >= 8 && sesliSay(r) >= 4; });
    var sonKume = son.length ? son[son.length - 1][1] : bas[bas.length - 1][1];
    var b0 = Math.max(0, Math.round((bas[0][0] * F) - ON * sr)), b1 = Math.min(n, Math.round(Math.max(sonKume, bas[0][1]) * F + SON * sr));
    if (b0 < 0.03 * sr) b0 = 0; if (n - b1 < 0.03 * sr) b1 = n;
    if (b0 === 0 && b1 === n) return { y: x, bas: 0, son: 0 };
    var y = Float32Array.from(x.subarray(b0, b1)), fi = Math.min(Math.round(sr * 0.008), y.length >> 2), fo = Math.min(Math.round(sr * 0.12), y.length >> 2);
    if (b0 > 0) for (i = 0; i < fi; i++) y[i] *= i / fi;
    if (b1 < n) for (i = 0; i < fo; i++) y[y.length - 1 - i] *= i / fo;
    return { y: y, bas: b0 / sr, son: (n - b1) / sr };
  }

  /* ---------- Hat ---------- */
  function sesIsle(x, sr, z) {
    var y = x;
    if (z.basla !== false) { var bs = baslangicTemizle(y, sr); y = bs.y; z.baslaKesilen = bs.kesildi; }
    if (z.agiz && z.agiz.aktif) { var ag = agizTemizle(y, sr, z.agiz); y = ag.y; z.agiz.sonAdet = ag.adet; }
    if (z.gurultu && z.gurultu.aktif) y = gurultuAzalt(y, sr, z.gurultu, z.gurultu.iz);
    if (z.kapi && z.kapi.aktif) y = kapi(y, sr, z.kapi);
    if (z.uretim && z.uretim.aktif) {
      /* PRODÜKSİYON ZİNCİRİ: ses önce sabit bir seviyeye getirilir, sonra çamurluk kesilir, parlaklık eklenir, iki kademe sıkıştırılır */
      var lf = lufs([y, y], sr); if (isFinite(lf) && lf > -70) { var gg = dB(z.uretim.hedefLufs - lf), y2 = new Float32Array(y.length); for (var q = 0; q < y.length; q++) y2[q] = y[q] * gg; y = y2; }
      if (z.ton && z.ton.bantlar && z.ton.bantlar.length) y = eq(y, sr, z.ton.bantlar);
      if (z.deess && z.deess.aktif) y = deEss(y, sr, z.deess);
      y = kompresor(y, sr, { esik: -26, oran: 2.2, atak: 12, birak: 220, makyaj: 0, diz: 6 });
    } else { if (z.ton && z.ton.bantlar && z.ton.bantlar.length) y = eq(y, sr, z.ton.bantlar); if (z.deess && z.deess.aktif) y = deEss(y, sr, z.deess); }
    if (z.kuvvet && z.kuvvet.aktif) { y = kompresor(y, sr, z.kuvvet); if (z.kapi && z.kapi.aktif) y = kapi(y, sr, z.kapi); }
    return y;
  }
  function uret(x, sr, muzik, z) {
    if (z.kes !== false) { var uk = uclariKes(x, sr, z.kes); x = uk.y; z.kesilen = { bas: uk.bas, son: uk.son }; }
    var islenmis = sesIsle(x, sr, z), e = efektUygula(islenmis, sr, z.efekt);
    var m = miksle(e.L, e.R, sr, muzik, z.muzik);
    var s = seviyeAyarla(m.L, m.R, sr, z.seviye.hedef, z.seviye.tavan);
    return { L: s.L, R: s.R, sr: sr, lufs: s.lufs, tepeDb: s.tepeDb, sesBasi: m.sesBasi, sure: s.L.length / sr, islenmis: islenmis };
  }

  /* ---------- Düzenleme işlemleri (kaynak ses) ---------- */
  function kirp(x, a, b) { return x.slice(a, b); }
  function sil(x, a, b) { var y = new Float32Array(x.length - (b - a)); y.set(x.subarray(0, a)); y.set(x.subarray(b), a); return y; }
  function sessizlikEkle(x, pos, n) { var y = new Float32Array(x.length + n); y.set(x.subarray(0, pos)); y.set(x.subarray(pos), pos + n); return y; }
  function sessizYap(x, a, b) { var y = x.slice(); for (var i = a; i < b; i++) y[i] = 0; return y; }
  function fade(x, a, b, yon) {
    var y = x.slice(), n = b - a;
    for (var i = 0; i < n; i++) { var t = i / Math.max(1, n - 1), g = 0.5 - 0.5 * Math.cos(Math.PI * (yon === 'giris' ? t : 1 - t)); y[a + i] *= g; }
    return y;
  }
  function kazan(x, a, b, db) { var y = x.slice(), g = dB(db); for (var i = a; i < b; i++) y[i] *= g; return y; }
  function normallestir(x, tepeHedefDb) {
    var m = 0; for (var i = 0; i < x.length; i++) { var a = Math.abs(x[i]); if (a > m) m = a; }
    if (m < 1e-9) return x; var g = dB(tepeHedefDb) / m, y = new Float32Array(x.length);
    for (i = 0; i < x.length; i++) y[i] = x[i] * g; return y;
  }
  function dcSil(x) { var s = 0, i; for (i = 0; i < x.length; i++) s += x[i]; s /= Math.max(1, x.length); var y = new Float32Array(x.length); for (i = 0; i < x.length; i++) y[i] = x[i] - s; return y; }

  /* ---------- İstatistik ve görüntü ---------- */
  function istatistik(x, sr) {
    var fr = Math.round(sr * 0.05), n = Math.floor(x.length / fr), r = [];
    for (var i = 0; i < n; i++) { var s = 0; for (var j = 0; j < fr; j++) { var v = x[i * fr + j]; s += v * v; } r.push(10 * Math.log10(s / fr + 1e-18)); }
    r.sort(function (a, b) { return a - b; });
    var p = function (q) { return r.length ? r[Math.min(r.length - 1, Math.floor(r.length * q))] : -120; };
    return { sure: x.length / sr, tepeDb: tepeDb([x]), rmsDb: rmsDb(x), lufs: lufs([x], sr), zeminDb: p(0.1), konusmaDb: p(0.9) };
  }
  function tepeler(x, adet) {
    var out = new Float32Array(adet * 2), kare = x.length / adet;
    for (var i = 0; i < adet; i++) {
      var a = Math.floor(i * kare), b = Math.max(a + 1, Math.min(x.length, Math.floor((i + 1) * kare))), mn = 1, mx = -1;
      for (var j = a; j < b && j < x.length; j++) { var v = x[j]; if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mn > mx) { mn = 0; mx = 0; } out[2 * i] = mn; out[2 * i + 1] = mx;
    }
    return out;
  }

  /* ---------- Dışa aktarma ---------- */
  function wav16(kanallar, sr) {
    var nc = kanallar.length, n = kanallar[0].length, buf = new ArrayBuffer(44 + n * nc * 2), v = new DataView(buf), o = 0, i, c;
    function yaz(s) { for (var q = 0; q < s.length; q++) v.setUint8(o++, s.charCodeAt(q)); }
    yaz('RIFF'); v.setUint32(o, 36 + n * nc * 2, true); o += 4; yaz('WAVEfmt '); v.setUint32(o, 16, true); o += 4;
    v.setUint16(o, 1, true); o += 2; v.setUint16(o, nc, true); o += 2; v.setUint32(o, sr, true); o += 4;
    v.setUint32(o, sr * nc * 2, true); o += 4; v.setUint16(o, nc * 2, true); o += 2; v.setUint16(o, 16, true); o += 2;
    yaz('data'); v.setUint32(o, n * nc * 2, true); o += 4;
    for (i = 0; i < n; i++) for (c = 0; c < nc; c++) { var s = Math.max(-1, Math.min(1, kanallar[c][i])); v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true); o += 2; }
    return buf;
  }
  function mp3Kodla(L, R, sr, kbps) {
    var lj = kok.lamejs; if (!lj) throw new Error('MP3 kodlayıcı yüklenemedi');
    var enc = new lj.Mp3Encoder(2, sr, kbps || 192), blok = 1152, parcalar = [], n = L.length;
    function i16(x, a, b) { var o = new Int16Array(b - a); for (var i = a; i < b; i++) { var s = Math.max(-1, Math.min(1, x[i])); o[i - a] = s < 0 ? s * 32768 : s * 32767; } return o; }
    for (var i = 0; i < n; i += blok) {
      var b = Math.min(n, i + blok), d = enc.encodeBuffer(i16(L, i, b), i16(R, i, b));
      if (d.length) parcalar.push(new Uint8Array(d));
    }
    var son = enc.flush(); if (son.length) parcalar.push(new Uint8Array(son));
    return parcalar;
  }

  var Motor = {
    SR: 44100, dB: dB, toDb: toDb,
    TON: TON, KUVVET: KUVVET, TEMIZLE: TEMIZLE, EFEKT: EFEKT, SEVIYE: SEVIYE, TARZ: TARZ,
    varsayilanZincir: varsayilanZincir, tarzUygula: tarzUygula,
    baslangicTemizle: baslangicTemizle, uclariKes: uclariKes, agizTemizle: agizTemizle, deEss: deEss, vurusUret: vurusUret,
    gurultuAzalt: gurultuAzalt, kapi: kapi, eq: eq, kompresor: kompresor, sinirla: sinirla,
    efektUygula: efektUygula, miksle: miksle, seviyeAyarla: seviyeAyarla, sesIsle: sesIsle, uret: uret,
    lufs: lufs, tepeDb: tepeDb, rmsDb: rmsDb, istatistik: istatistik, tepeler: tepeler,
    kirp: kirp, sil: sil, sessizlikEkle: sessizlikEkle, sessizYap: sessizYap, fade: fade, kazan: kazan, normallestir: normallestir, dcSil: dcSil,
    frekFiltre: frekFiltre, wav16: wav16, mp3Kodla: mp3Kodla, biquadKatsayi: biquadKatsayi, biquadUygula: biquadUygula
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Motor;
  kok.Motor = Motor;
})(typeof window !== 'undefined' ? window : globalThis);
