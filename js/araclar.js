/* Düzenleme araçları: ters çevir, perde, karıştırarak yapıştır */
(function (kok) {
  'use strict';
  function dB(d) { return Math.pow(10, d / 20); }
  function ters(x) { var n = x.length, y = new Float32Array(n); for (var i = 0; i < n; i++) y[i] = x[n - 1 - i]; return y; }
  // r>1: hızlı ve tiz (kısalır). Catmull-Rom aralama
  function yenidenOrnekle(x, r) {
    var m = Math.max(1, Math.floor(x.length / r)), y = new Float32Array(m), n = x.length;
    for (var i = 0; i < m; i++) {
      var p = i * r, a = Math.floor(p), t = p - a;
      var p0 = x[Math.max(0, a - 1)], p1 = x[a], p2 = x[Math.min(n - 1, a + 1)], p3 = x[Math.min(n - 1, a + 2)];
      y[i] = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    }
    return y;
  }
  // WSOLA: süreyi alpha kadar uzatır (perde değişmez)
  function sureUzat(x, alpha, hedefN) {
    var W = 2048, Hs = 512, Ha = Hs / alpha, D = 256, n = x.length;
    if (n < W * 2) { var o = new Float32Array(hedefN); for (var q = 0; q < hedefN; q++) o[q] = x[Math.min(n - 1, Math.floor(q / alpha))] || 0; return o; }
    var y = new Float32Array(hedefN + W), sum = new Float32Array(hedefN + W), w = new Float32Array(W), i;
    for (i = 0; i < W; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / W);
    var prev = 0, k = 0;
    for (var out = 0; out < hedefN; out += Hs, k++) {
      var nom = Math.round(k * Ha), best = nom, tgt = prev + Hs;
      if (k > 0 && tgt + W <= n) {
        var bc = -Infinity;
        for (var d = -D; d <= D; d += 2) {
          var c = nom + d; if (c < 0 || c + W > n) continue;
          var s = 0; for (i = 0; i < W; i += 4) s += x[tgt + i] * x[c + i];
          if (s > bc) { bc = s; best = c; }
        }
      }
      if (best + W > n) best = Math.max(0, n - W);
      if (best < 0) best = 0;
      prev = best;
      for (i = 0; i < W; i++) { y[out + i] += x[best + i] * w[i]; sum[out + i] += w[i]; }
    }
    var r = new Float32Array(hedefN);
    for (i = 0; i < hedefN; i++) r[i] = sum[i] > 1e-3 ? y[i] / sum[i] : 0;
    return r;
  }
  // yariTon: +12 bir oktav yukarı. sureKoru=false ise hız da değişir
  function perde(x, yariTon, sureKoru) {
    if (Math.abs(yariTon) < 0.01) return x;
    var r = Math.pow(2, yariTon / 12), y = yenidenOrnekle(x, r);
    if (!sureKoru) return y;
    return sureUzat(y, x.length / y.length, x.length);
  }
  // hedef (dL,dR) üzerine kaynağı (sL,sR) pos'tan itibaren karıştırır. gDdb/gSdb: hedef/kaynak seviyesi (dB)
  function karistir(dL, dR, sL, sR, pos, gDdb, gSdb, fiMs, foMs, uzat, sr) {
    var son = pos + sL.length, n = uzat ? Math.max(dL.length, son) : dL.length;
    var oL = new Float32Array(n), oR = (dR === dL) && (sR === sL) ? null : new Float32Array(n), gd = dB(gDdb), gs = dB(gSdb), i;
    for (i = 0; i < dL.length; i++) oL[i] = dL[i] * gd;
    if (oR) for (i = 0; i < dR.length; i++) oR[i] = dR[i] * gd;
    var fi = Math.round((fiMs || 0) * sr / 1000), fo = Math.round((foMs || 0) * sr / 1000), m = sL.length;
    for (i = 0; i < m && pos + i < n; i++) {
      var g = gs;
      if (fi > 0 && i < fi) g *= 0.5 - 0.5 * Math.cos(Math.PI * i / fi);
      if (fo > 0 && m - i < fo) g *= 0.5 - 0.5 * Math.cos(Math.PI * (m - i) / fo);
      oL[pos + i] += sL[i] * g; if (oR) oR[pos + i] += sR[i] * g;
    }
    return { L: oL, R: oR || oL };
  }
  function birles(taban, a, b, orta) { var y = new Float32Array(taban.length - (b - a) + orta.length); y.set(taban.subarray(0, a)); y.set(orta, a); y.set(taban.subarray(b), a + orta.length); return y; }
  kok.Araclar = { ters: ters, perde: perde, karistir: karistir, birles: birles, yenidenOrnekle: yenidenOrnekle, sureUzat: sureUzat, dB: dB };
  if (typeof module !== 'undefined') module.exports = kok.Araclar;
})(typeof window !== 'undefined' ? window : globalThis);
