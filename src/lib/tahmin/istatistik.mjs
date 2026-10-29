// Tahmin sayfası için küçük istatistik araçları: en küçük kareler, normal dağılım, sıralı probit. Bağımlılık yok; bot
// zincirinde saniyeler içinde çalışır.

// Gauss eliminasyonu, kısmi pivotla. A kare (n×n), b uzunluk n. Tekil matriste null.
export function coz(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

export function tersMatris(A) {
  const n = A.length;
  const cols = [];
  for (let j = 0; j < n; j++) {
    const e = Array.from({ length: n }, (_, i) => (i === j ? 1 : 0));
    const x = coz(A, e);
    if (!x) return null;
    cols.push(x);
  }
  return A.map((_, i) => cols.map((c) => c[i]));
}

// En küçük kareler. X satırları (sabit terim dahil verilmeli), y. Dönen: katsayılar, artık standart sapması (s),
// (X'X)^-1 ve tahmin için öngörü varyansı fonksiyonu.
export function ekk(X, y) {
  const k = X[0].length;
  const n = X.length;
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((t, r) => t + r[i] * r[j], 0)));
  const Xty = Array.from({ length: k }, (_, i) => X.reduce((t, r, s) => t + r[i] * y[s], 0));
  const beta = coz(XtX, Xty);
  if (!beta) return null;
  const artik = y.map((v, i) => v - X[i].reduce((t, x, j) => t + x * beta[j], 0));
  const sd = n - k;
  const s = Math.sqrt(artik.reduce((t, e) => t + e * e, 0) / Math.max(sd, 1));
  const ters = tersMatris(XtX);
  return {
    beta,
    s,
    serbestlik: sd,
    tahmin: (x) => x.reduce((t, v, j) => t + v * beta[j], 0),
    // Öngörü standart hatası: s · √(1 + x'(X'X)^-1 x)
    ongoruSh: (x) => {
      if (!ters) return s;
      let q = 0;
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) q += x[i] * ters[i][j] * x[j];
      return s * Math.sqrt(1 + q);
    },
  };
}

// Standart normal dağılım fonksiyonu (Abramowitz-Stegun 7.1.26 erf yaklaşımı, hata < 1.5e-7).
export function normalDF(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export const normalYO = (z) => Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);

// Student t ters dağılımı yerine kullanılan iki aralık çarpanı (iki yanlı %80 ve %95). Serbestlik derecesi 30'un
// üstünde normal değerler; altında Cornish-Fisher düzeltmesi.
export function tCarpani(olasilik, serbestlik) {
  const z = olasilik === 0.8 ? 1.2815515655 : olasilik === 0.95 ? 1.9599639845 : null;
  if (z == null) throw new Error('Yalnız %80 ve %95 aralığı');
  const v = Math.max(serbestlik, 1);
  return z + (z ** 3 + z) / (4 * v) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * v * v);
}

// Sıralı probit, üç sınıf (0, 1, 2). Newton-Raphson; küçük örneklemde ayrışma olmasın diye katsayılara sabit ceza
// (lambda · Σβ²) uygulanır, eşiklere uygulanmaz. Dönen: olasılık fonksiyonu.
export function siraliProbit(X, y, { lambda = 1, adim = 100 } = {}) {
  const k = X[0].length;
  // Parametreler: β (k), c1, d (c2 = c1 + exp(d)).
  let p = [...Array(k).fill(0), -0.5, 0];
  const ayir = (p) => ({ b: p.slice(0, k), c1: p[k], c2: p[k] + Math.exp(p[k + 1]) });
  const ll = (p) => {
    const { b, c1, c2 } = ayir(p);
    let t = -lambda * b.reduce((s, v) => s + v * v, 0);
    for (let i = 0; i < X.length; i++) {
      const xb = X[i].reduce((s, v, j) => s + v * b[j], 0);
      const pr = olasiliklar(xb, c1, c2)[y[i]];
      t += Math.log(Math.max(pr, 1e-12));
    }
    return t;
  };
  // Sayısal türevle Newton; parametre sayısı küçük (≤ 6).
  const m = k + 2;
  const h = 1e-4;
  let f = ll(p);
  for (let it = 0; it < adim; it++) {
    const g = [];
    const H = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      const a = [...p];
      a[i] += h;
      const z = [...p];
      z[i] -= h;
      g.push((ll(a) - ll(z)) / (2 * h));
    }
    for (let i = 0; i < m; i++) {
      for (let j = i; j < m; j++) {
        const pp = [...p], pm = [...p], mp = [...p], mm = [...p];
        pp[i] += h; pp[j] += h;
        pm[i] += h; pm[j] -= h;
        mp[i] -= h; mp[j] += h;
        mm[i] -= h; mm[j] -= h;
        H[i][j] = H[j][i] = (ll(pp) - ll(pm) - ll(mp) + ll(mm)) / (4 * h * h);
      }
    }
    // Newton yönü: -H^-1 g; H negatif tanımlı değilse gradyan yönü.
    const negH = H.map((r) => r.map((v) => -v));
    let yon = coz(negH, g) ?? g;
    let ad = 1;
    let yeni = p.map((v, i) => v + ad * yon[i]);
    let fy = ll(yeni);
    while (!(fy > f - 1e-12) && ad > 1e-6) {
      ad /= 2;
      yeni = p.map((v, i) => v + ad * yon[i]);
      fy = ll(yeni);
    }
    if (!(fy >= f)) break;
    const fark = fy - f;
    p = yeni;
    f = fy;
    if (fark < 1e-9) break;
  }
  const { b, c1, c2 } = ayir(p);
  return { b, c1, c2, olasilik: (x) => olasiliklar(x.reduce((s, v, j) => s + v * b[j], 0), c1, c2) };
}

function olasiliklar(xb, c1, c2) {
  const p0 = normalDF(c1 - xb);
  const p1 = normalDF(c2 - xb) - p0;
  return [p0, Math.max(p1, 0), 1 - normalDF(c2 - xb)];
}

export const ortalama = (a) => a.reduce((t, v) => t + v, 0) / a.length;
export const rmse = (hatalar) => Math.sqrt(ortalama(hatalar.map((e) => e * e)));

// Örneklem yüzdeliği (doğrusal ara değer).
export function yuzdelik(a, q) {
  const s = [...a].sort((x, y) => x - y);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
}
