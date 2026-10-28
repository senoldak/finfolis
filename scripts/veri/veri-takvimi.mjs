// Resmi veri yayın takvimi çekici: TÜİK haber bültenleri ve TCMB yayınları.
// Kaynaklar (yalnız resmi):
//  - TÜİK: Resmi İstatistik Portalı ulusal veri yayımlama takvimi (GetTakvimHaberBulteniListesi, yıl bazlı)
//  - TCMB veri yayımlama takvimi (appg.tcmb.gov.tr/igmvytsms-dis/veriTakvimi/list, ay bazlı)
//  - TCMB "Para Politikası Kurulu Toplantıları ve Rapor Takvimi" sayfası (PPK, Enflasyon Raporu, Finansal İstikrar Raporu)
// Hiçbir tarih elle yazılmaz. Bir kaynak düşerse onun eski kayıtları korunur, çalışanlar güncellenir.
//
// Kullanım: node scripts/veri/veri-takvimi.mjs [--yaz]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hentJson, hentMetin } from '../haberler/lib.mjs';
import {
  birlestir,
  bugunIstanbul,
  gunEkle,
  pencereyeKirp,
  ppkTablosuAyristir,
  tcmbKaydiniOlayYap,
  tuikKaydiniOlayYap,
  tekrarsiz,
} from '../../src/lib/veri-takvimi.mjs';

const HEDEF_DOSYA = fileURLToPath(new URL('../../src/data/veri-takvimi.json', import.meta.url));

const TUIK_URL = 'https://www.resmiistatistik.gov.tr/Home/GetTakvimHaberBulteniListesi?dilId=1&yil=';
const TCMB_API = 'https://appg.tcmb.gov.tr/igmvytsms-dis/veriTakvimi/list?lang=tr';
const TCMB_TAKVIM_URL = 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim';

export const KAYNAKLAR = [
  { ad: 'TÜİK ulusal veri yayımlama takvimi (Resmi İstatistik Portalı)', url: 'https://www.resmiistatistik.gov.tr/' },
  { ad: 'TCMB veri yayımlama takvimi', url: 'https://appg.tcmb.gov.tr/igmvytsfe-dis/tr' },
  { ad: 'TCMB Para Politikası Kurulu toplantıları ve rapor takvimi', url: TCMB_TAKVIM_URL },
];

const ayinSonu = (yil, ay) => new Date(Date.UTC(yil, ay, 0)).getUTCDate();

async function tuikCek(bugun) {
  const yillar = [...new Set([gunEkle(bugun, -35), bugun, gunEkle(bugun, 125)].map((t) => Number(t.slice(0, 4))))];
  const olaylar = [];
  for (const yil of yillar) {
    const liste = await hentJson(`${TUIK_URL}${yil}`);
    if (!Array.isArray(liste)) throw new Error(`TÜİK yanıtı liste değil (${yil})`);
    for (const k of liste) {
      const o = tuikKaydiniOlayYap(k);
      if (o) olaylar.push(o);
    }
  }
  // Bugünün yılı boş gelirse kaynak düşmüş sayılır; sonraki yıl henüz yayımlanmamış olabilir.
  if (!olaylar.some((o) => o.tarih.startsWith(`${bugun.slice(0, 4)}-`))) throw new Error('TÜİK takviminde bu yıl için kayıt yok');
  return { olaylar: tekrarsiz(olaylar), bas: `${yillar[0]}-01-01`, bit: `${yillar.at(-1)}-12-31` };
}

async function tcmbApiCek(bugun) {
  const bas = gunEkle(bugun, -35);
  const bit = gunEkle(bugun, 100);
  let yil = Number(bas.slice(0, 4));
  let ay = Number(bas.slice(5, 7));
  const sonYil = Number(bit.slice(0, 4));
  const sonAy = Number(bit.slice(5, 7));
  const olaylar = [];
  while (yil < sonYil || (yil === sonYil && ay <= sonAy)) {
    for (let sayfa = 0; sayfa < 30; sayfa++) {
      const d = await hentJson(`${TCMB_API}&yil=${yil}&ay=${ay}&page=${sayfa}&size=100`);
      for (const k of d.content ?? []) {
        const o = tcmbKaydiniOlayYap(k);
        if (o) olaylar.push(o);
      }
      if (sayfa + 1 >= (d.page?.totalPages ?? 1)) break;
    }
    if (++ay > 12) {
      ay = 1;
      yil++;
    }
  }
  if (olaylar.length < 10) throw new Error(`TCMB takvim API'sinden çok az kayıt geldi (${olaylar.length})`);
  const iki = (n) => String(n).padStart(2, '0');
  const bitAy = `${sonYil}-${iki(sonAy)}-${iki(ayinSonu(sonYil, sonAy))}`;
  return { olaylar: tekrarsiz(olaylar), bas: `${bas.slice(0, 7)}-01`, bit: bitAy };
}

async function ppkCek() {
  const html = await hentMetin(TCMB_TAKVIM_URL);
  const olaylar = ppkTablosuAyristir(html, TCMB_TAKVIM_URL);
  if (olaylar.length < 8) throw new Error(`PPK tablosundan çok az kayıt çıktı (${olaylar.length})`);
  const tarihler = olaylar.map((o) => o.tarih).sort();
  return { olaylar, bas: tarihler[0], bit: tarihler.at(-1) };
}

export async function veriTakvimiUret({ eski = null, bugun = bugunIstanbul(), cekiciler } = {}) {
  const kaynaklar = cekiciler ?? { tuik: () => tuikCek(bugun), 'tcmb-api': () => tcmbApiCek(bugun), 'tcmb-takvim': ppkCek };
  let olaylar = eski?.olaylar ?? [];
  const durum = {};
  for (const [ad, cek] of Object.entries(kaynaklar)) {
    try {
      const { olaylar: yeni, bas, bit } = await cek();
      olaylar = birlestir(olaylar, yeni, ad, { bas, bit });
      durum[ad] = `${yeni.length} kayıt`;
    } catch (hata) {
      durum[ad] = `DÜŞTÜ: ${hata.message} (eski kayıtlar korundu)`;
    }
  }
  const basarili = Object.values(durum).some((d) => !d.startsWith('DÜŞTÜ'));
  return {
    basarili,
    durum,
    veri: {
      alinma: new Date().toISOString(),
      kaynaklar: KAYNAKLAR,
      olaylar: pencereyeKirp(olaylar, bugun),
    },
  };
}

async function main() {
  const yaz = process.argv.includes('--yaz');
  let eski = null;
  try {
    eski = JSON.parse(await readFile(HEDEF_DOSYA, 'utf-8'));
  } catch {
    /* ilk çalıştırma */
  }
  console.log('Veri yayın takvimi çekiliyor (TÜİK, TCMB)...');
  const { basarili, durum, veri } = await veriTakvimiUret({ eski });
  for (const [ad, d] of Object.entries(durum)) console.log(` - ${ad}: ${d}`);
  const tarihler = veri.olaylar.map((o) => o.tarih);
  console.log(`Toplam olay: ${veri.olaylar.length}${tarihler.length ? ` (${tarihler[0]} – ${tarihler.at(-1)})` : ''}`);
  if (!basarili) {
    console.log('Hiçbir kaynak alınamadı; mevcut dosya olduğu gibi bırakıldı.');
    return;
  }
  if (yaz) {
    await writeFile(HEDEF_DOSYA, JSON.stringify(veri, null, 2) + '\n', 'utf-8');
    console.log(`Veri kaydedildi: ${HEDEF_DOSYA}`);
  } else {
    console.log('Veriyi kaydetmek için --yaz parametresini ekleyin.');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((hata) => {
    console.error('Hata:', hata);
    process.exit(1);
  });
}
