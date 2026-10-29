// Haftalık veri takvimi haberi: her pazartesi (İstanbul 07:00'den sonra, haftada bir kez) o haftanın TÜİK ve TCMB yayınları.
// Yalnız src/data/veri-takvimi.json'daki bilgiler: beklenti, tahmin, yorum yok. Haftalık TCMB istatistikleri (her hafta
// tekrarlanan rutin yayınlar) listeye alınmaz; PPK toplantısı varsa öne çıkar.
// Yazı çoğunlukla kısa kalır (tarih ve başlık listesi): tek tek yayımlanmaz, havuzda dilim derlemesini bekler (havuz.mjs;
// veriHaberi işareti yok, yani alt sınır 200 kelime). Kapak yok. Kimlik haftanın pazartesi tarihidir: hafta başına bir aday.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { araliktakiOlaylar, bugunIstanbul, gunAdi, gunEkle, haftaninGunu, AYLAR } from '../../../src/lib/veri-takvimi.mjs';

const DOSYA = fileURLToPath(new URL('../../../src/data/veri-takvimi.json', import.meta.url));
const SAAT_ESIGI = 7; // İstanbul
const SAYFA = 'https://finfolis.com/veri/takvim/';

const gunMetni = (t) => `${Number(t.slice(8, 10))} ${AYLAR[Number(t.slice(5, 7)) - 1]}`;
const istanbulSaati = (simdi) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false }).format(simdi)) % 24;
const ppkMi = (o) => o.kurum === 'TCMB' && /PPK toplantı kararı/i.test(o.baslik);

export function takvimAdayi(takvim, simdi = new Date()) {
  const bugun = bugunIstanbul(simdi);
  if (haftaninGunu(bugun) !== 1 || istanbulSaati(simdi) < SAAT_ESIGI) return null;
  const bit = gunEkle(bugun, 6);
  const olaylar = araliktakiOlaylar(takvim?.olaylar ?? [], bugun, bit, { haftalikDahil: false });
  if (!olaylar.length) return null;
  const ppk = olaylar.filter(ppkMi);
  const gunler = new Map();
  for (const o of olaylar) {
    if (!gunler.has(o.tarih)) gunler.set(o.tarih, []);
    gunler.get(o.tarih).push(o);
  }
  const satirlar = [...gunler].map(([t, l]) => {
    const ogeler = l.map((o) => `${o.kurum}${o.saat ? ` ${o.saat}` : ''}: ${o.baslik}${o.donem ? ` (${o.donem})` : ''}`).join('; ');
    return `${gunAdi(t)} ${gunMetni(t)}: ${ogeler}.`;
  });
  const kaynaklar = (takvim?.kaynaklar ?? []).filter((k) => k?.ad && k?.url);
  const kaynakMetni = [
    `Official release calendar for the week of ${gunMetni(bugun)} to ${gunMetni(bit)} (Turkey time). Releases by TÜİK (Turkish Statistical Institute) and the Central Bank of the Republic of Türkiye (CBRT). Weekly routine CBRT statistics are left out.`,
    ppk.length ? `The CBRT Monetary Policy Committee (PPK) event this week: ${ppk.map((o) => `${gunAdi(o.tarih)} ${gunMetni(o.tarih)}, ${o.baslik}`).join('; ')}. Lead with it.` : '',
    ...satirlar,
    `Dates may be changed by the institutions. No forecasts or expectations are given. The full release calendar is on ${SAYFA}.`,
    `Source: ${kaynaklar.map((k) => k.ad).join('; ')}.`,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    id: `veri-takvimi:${bugun}`,
    baslik: ppk.length
      ? `Bu hafta PPK kararı dahil ${olaylar.length} resmi veri açıklanacak: ${gunMetni(bugun)}–${gunMetni(bit)} takvimi`
      : `Bu hafta ${olaylar.length} resmi veri açıklanacak: ${gunMetni(bugun)}–${gunMetni(bit)} takvimi`,
    tarih: simdi,
    onem: ppk.length ? 68 : 62,
    kategori: 'ekonomi',
    bolge: 'turkiye',
    ucretli: false,
    kaynakMetni,
    kaynaklar,
  };
}

export default {
  ad: 'veri-takvimi-haber',
  async hent(ctx = {}) {
    try {
      const takvim = JSON.parse(await readFile(ctx.takvimDosyasi ?? DOSYA, 'utf8'));
      const a = takvimAdayi(takvim, ctx.simdi ?? new Date());
      return a ? [a] : [];
    } catch (e) {
      console.error(`[veri-takvimi-haber] takvim okunamadı: ${e.message}`);
      return [];
    }
  },
};
