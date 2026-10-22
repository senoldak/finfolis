// Taslak hazır olduktan sonraki Gemini istemleri (kontrol masası, düzeltme) için kaynak kırpma.
// Baştan kesmek yerine taslakla örtüşen paragrafları seçer; uzun resmi belgelerin sonundaki
// ilgili kısım da istemde kalır. Kesin kontroller (dogrula) her zaman TAM kaynağı kullanır.

const ACILIS = 1500; // kaynağın başı (başlık, tarih, ana duyuru) her zaman kalır
const AYRAC = '\n\n[…]\n\n';

// 1.250 / 1,250 / 1250 / 4,25 / 4.25 aynı sayılır: ayraçlar atılır, baştaki sıfırlar kırpılır.
const sayiAnahtari = (s) => s.replace(/[.,]/g, '').replace(/^0+(?=\d)/, '');
const sayilar = (t) => (t.match(/\d+(?:[.,]\d+)*/g) ?? []).map(sayiAnahtari).filter((s) => s.length >= 2);
const adlar = (t) => (t.match(/\p{Lu}[\p{L}\d'’-]{2,}/gu) ?? []).map((s) => s.replace(/['’].*$/, '').toLocaleLowerCase('tr'));
const uzunKelimeler = (t) => (t.toLocaleLowerCase('tr').match(/\p{L}{7,}/gu) ?? []).map((s) => s.slice(0, 7));
const alintilar = (t) => [...t.matchAll(/["“”«»]([^"“”«»]{8,}?)["“”«»]/g)].map((m) => m[1].toLocaleLowerCase('tr').trim());

// Kaynağı parçalara böler: boş satırlar; çok uzun paragraf cümlelere bölünür.
function parcala(metin, azami) {
  const out = [];
  for (const p of metin.split(/\n\s*\n/)) {
    if (!p.trim()) continue;
    if (p.length <= azami) { out.push(p); continue; }
    let buf = '';
    for (const c of p.match(/[^.!?]+[.!?]+["”»)]*\s*|[^.!?]+$/g) ?? [p]) {
      if (buf && buf.length + c.length > azami) { out.push(buf.trim()); buf = ''; }
      buf += c;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

export function ilgiliKisim(kaynak, taslakMetni, sinir) {
  const metin = String(kaynak ?? '');
  if (metin.length <= sinir) return metin;
  const taslak = String(taslakMetni ?? '');
  const tSayi = new Set(sayilar(taslak));
  const tAd = new Set(adlar(taslak));
  const tKelime = new Set(uzunKelimeler(taslak));
  const tAlinti = alintilar(taslak);

  const parcalar = parcala(metin, Math.max(500, Math.floor(sinir / 4)));
  const secili = new Set();
  let boy = 0;
  // açılış
  for (let i = 0; i < parcalar.length && boy < ACILIS; i++) {
    if (boy + parcalar[i].length > sinir) break;
    secili.add(i);
    boy += parcalar[i].length + 2;
  }
  const puan = (p) => {
    const kucuk = p.toLocaleLowerCase('tr');
    let s = 0;
    for (const n of new Set(sayilar(p))) if (tSayi.has(n)) s += 5;
    for (const a of new Set(adlar(p))) if (tAd.has(a)) s += 2;
    for (const k of new Set(uzunKelimeler(p))) if (tKelime.has(k)) s += 1;
    for (const q of tAlinti) if (kucuk.includes(q)) s += 10;
    return s / Math.sqrt(Math.max(p.length, 200) / 200); // uzun parçalar tek başına kazanmasın
  };
  const sira = parcalar
    .map((p, i) => ({ i, s: secili.has(i) ? -1 : puan(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i);
  for (const { i } of sira) {
    const ek = parcalar[i].length + AYRAC.length;
    if (boy + ek > sinir) continue;
    secili.add(i);
    boy += ek;
  }
  if (!secili.size) return metin.slice(0, sinir);

  let out = '';
  let onceki = -1;
  for (const i of [...secili].sort((a, b) => a - b)) {
    if (onceki >= 0) out += i === onceki + 1 ? '\n\n' : AYRAC;
    out += parcalar[i];
    onceki = i;
  }
  return out;
}
