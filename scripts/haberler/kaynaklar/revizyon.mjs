// Veri revizyonu: bir resmi göstergenin daha önce yayımlanmış bir dönemi sonradan değiştiyse (scripts/veri/revizyon.mjs
// src/data/revizyonlar.json'a yazar) son iki gün içinde tespit edilen, haber değeri taşıyanlar aday olur.
// Yalnız rakamlar: eski değer, yeni değer, fark. Neden açıklanmaz, yorum yapılmaz. Az rakamlı kısa bir not olduğundan
// tek başına yayımlanmaz, havuzda dilim derlemesini bekler (havuz.mjs; yabanci-portfoy ile aynı yol). Kapak yok.
// Aynı revizyon ikinci kez aday olmaz: kimlik dönem ve yeni değerleri taşır, uyarlayıcı görülen kimliği eler.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { HABER_ALANLARI, alanAdi, kurumAdi, donemMetni, degerMetni, farkMetni } from '../../../src/lib/revizyon.mjs';

const DOSYA = fileURLToPath(new URL('../../../src/data/revizyonlar.json', import.meta.url));
const GUN_MS = 86400000;
const TAZE_GUN = 2;
const ENG = { enflasyon: 'consumer price index (CPI)', issizlik: 'unemployment', sanayi: 'industrial production', cari: 'current account', disTicaret: 'foreign trade', butce: 'central government budget', kredi: 'bank loans' };

const haberDegerli = (r) => {
  const t = HABER_ALANLARI[`${r.bolum}.${r.alan}`];
  return t && Math.abs(r.fark) >= t.enAz ? t : null;
};

// Aynı bölümün aynı dönemi için değişen alanlar tek adayda toplanır.
export function revizyonAdaylari(kayitlar, simdi = new Date()) {
  const gruplar = new Map();
  for (const r of kayitlar ?? []) {
    const yas = simdi.getTime() - Date.parse(r.tespit);
    if (!(yas >= 0 && yas <= TAZE_GUN * GUN_MS)) continue;
    if (!haberDegerli(r)) continue;
    const k = `${r.bolum}|${r.donem}`;
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(r);
  }
  const adaylar = [];
  for (const liste of gruplar.values()) {
    liste.sort((a, b) => a.alan.localeCompare(b.alan));
    const { bolum, donem } = liste[0];
    const kurum = kurumAdi(bolum) ?? 'the data provider';
    const kaynak = liste.find((r) => r.kaynak)?.kaynak;
    if (!kaynak) continue;
    const onem = Math.max(...liste.map((r) => haberDegerli(r).onem));
    const ilk = liste.reduce((a, b) => (haberDegerli(a).onem >= haberDegerli(b).onem ? a : b));
    const satirlar = liste.map((r) => `${alanAdi(r.bolum, r.alan)}, ${donemMetni(r.donem)}: ${degerMetni(r.bolum, r.alan, r.eski)} before, ${degerMetni(r.bolum, r.alan, r.yeni)} now (change ${farkMetni(r.bolum, r.alan, r.fark)}).`);
    const kaynakMetni = [
      `Revision of an already published figure (${ENG[bolum] ?? bolum}), source ${kurum}. Detected ${liste[0].tespit.slice(0, 10)} by comparing the official series pulled by the site with the previous pull.`,
      ...satirlar,
      `The value for the same period in the official series differs from the one published earlier. The reason for the change is not stated in the data; do not speculate about it.`,
      `Revisions are a routine practice of statistical institutions.`,
      `Source: ${kaynak.ad}.`,
    ].join(' ');
    const baslik = liste.length === 1
      ? `${alanAdi(ilk.bolum, ilk.alan)}, ${donemMetni(donem)}: ${degerMetni(ilk.bolum, ilk.alan, ilk.eski)} olan rakam ${degerMetni(ilk.bolum, ilk.alan, ilk.yeni)} olarak güncellendi`
      : `${donemMetni(donem)} dönemi için ${kurum} verilerinde ${liste.length} rakam güncellendi`;
    adaylar.push({
      id: `revizyon:${bolum}:${donem}:${liste.map((r) => `${r.alan}=${r.yeni}`).join(',')}`,
      baslik,
      tarih: new Date(Math.max(...liste.map((r) => Date.parse(r.tespit)))),
      onem,
      kategori: 'ekonomi',
      bolge: 'turkiye',
      ucretli: false,
      kaynakMetni,
      kaynaklar: [kaynak],
    });
  }
  return adaylar.sort((a, b) => b.onem - a.onem);
}

export default {
  ad: 'veri-revizyonu',
  async hent(ctx = {}) {
    try {
      const k = JSON.parse(await readFile(ctx.revizyonDosyasi ?? DOSYA, 'utf8'));
      return revizyonAdaylari(k.revizyonlar, ctx.simdi ?? new Date());
    } catch (e) {
      console.error(`[veri-revizyonu] revizyon kaydı okunamadı: ${e.message}`);
      return [];
    }
  },
};
