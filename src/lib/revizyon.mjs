// Veri revizyonu: resmi.json'daki geçmiş bir dönemin rakamı sonradan değişirse (TÜİK/TCMB olağan revizyonu) yakalanır.
// Karşılaştırma iki resmi.json görüntüsü arasındadır (eski, yeni). Yeni eklenen dönem revizyon değildir.

// Alan türleri ve eşik gerekçesi:
//  yuzde: oran ve yüzde değişimler. Kaynaklar iki ondalıkla yayımlar; 0,01 puandan küçük fark yuvarlama/kayan nokta
//         gürültüsüdür (29,73 ile 29,7300001 gibi), bundan büyüğü yayımlanmış rakamın değişmesidir.
//  puan:  endeksler (taban 100 civarı). Aynı gerekçeyle 0,01 puan.
//  duzey: tutarlar (milyon USD, bin TL...). Büyüklüğü bölümden bölüme çok değişir; göreli %0,05 (yaklaşık 4. anlamlı basamak)
//         altı yuvarlama sayılır. Mutlak taban 0,001: sıfıra yakın değerlerde göreli eşik boşa çıkmasın.
export const ESIKLER = { yuzde: { mutlak: 0.01 }, puan: { mutlak: 0.01 }, duzey: { goreli: 0.0005, mutlak: 0.001 } };

// Bir alanda tek çalıştırmada bu kadardan çok dönem değiştiyse bu seri yeniden hesaplanmıştır (taban yılı değişimi, mevsimsellikten
// arındırmanın tüm geçmişi güncellemesi); tek tek revizyon haberi değildir, kayda girmez (toplu olarak bildirilir).
export const TOPLU_ESIK = 12;
export const EN_COK_KAYIT = 500;

// bolum -> { kurum, donem: 'ay'|'tarih', alanlar: { yol: { ad, tur, birim } } }; yol noktalı olabilir (bolgeler.TR.yillik).
// Yalnız manşet rakamlar izlenir.
export const IZLENEN = {
  enflasyon: { kurum: 'TÜİK', donem: 'ay', alanlar: { yillik: { ad: 'Yıllık TÜFE', tur: 'yuzde', birim: '%' }, aylik: { ad: 'Aylık TÜFE', tur: 'yuzde', birim: '%' } } },
  tufeArindirilmis: { kurum: 'TÜİK', donem: 'ay', alanlar: { aylik: { ad: 'Mevsimsellikten arındırılmış aylık TÜFE', tur: 'yuzde', birim: '%' } } },
  issizlik: { kurum: 'TÜİK', donem: 'ay', alanlar: { oran: { ad: 'İşsizlik oranı (mevsimsellikten arındırılmış)', tur: 'yuzde', birim: '%' } } },
  sanayi: {
    kurum: 'TÜİK',
    donem: 'ay',
    alanlar: {
      yillik: { ad: 'Sanayi üretimi, yıllık değişim', tur: 'yuzde', birim: '%' },
      aylik: { ad: 'Sanayi üretimi, aylık değişim', tur: 'yuzde', birim: '%' },
      endeks: { ad: 'Sanayi üretim endeksi', tur: 'puan', birim: 'puan' },
    },
  },
  disTicaret: {
    kurum: 'TÜİK',
    donem: 'ay',
    alanlar: { ihracat: { ad: 'İhracat', tur: 'duzey', birim: 'bin USD' }, ithalat: { ad: 'İthalat', tur: 'duzey', birim: 'bin USD' } },
  },
  cari: { kurum: 'TCMB', donem: 'ay', alanlar: { cari: { ad: 'Cari işlemler dengesi', tur: 'duzey', birim: 'milyon USD' } } },
  butce: {
    kurum: 'Hazine ve Maliye Bakanlığı',
    donem: 'ay',
    alanlar: {
      denge: { ad: 'Bütçe dengesi', tur: 'duzey', birim: 'bin TL' },
      gelir: { ad: 'Bütçe gelirleri', tur: 'duzey', birim: 'bin TL' },
      harcama: { ad: 'Bütçe harcamaları', tur: 'duzey', birim: 'bin TL' },
    },
  },
  kredi: {
    kurum: 'TCMB',
    donem: 'ay',
    alanlar: { toplam: { ad: 'Toplam krediler', tur: 'duzey', birim: 'bin TL' }, toplamYillik: { ad: 'Toplam krediler, yıllık artış', tur: 'yuzde', birim: '%' } },
  },
  konut: { kurum: 'TCMB', donem: 'ay', alanlar: { 'bolgeler.TR.yillik': { ad: 'Konut fiyat endeksi, Türkiye, yıllık değişim', tur: 'yuzde', birim: '%' } } },
  kira: { kurum: 'TCMB', donem: 'ay', alanlar: { 'bolgeler.TR.yillik': { ad: 'Yeni kiracı kira endeksi, Türkiye, yıllık değişim', tur: 'yuzde', birim: '%' } } },
  guven: { kurum: 'TÜİK', donem: 'ay', alanlar: { endeks: { ad: 'Tüketici güven endeksi', tur: 'puan', birim: 'puan' } } },
  kapasite: { kurum: 'TCMB', donem: 'ay', alanlar: { arindirilmis: { ad: 'Kapasite kullanım oranı (mevsimsellikten arındırılmış)', tur: 'yuzde', birim: '%' } } },
  beklenti: { kurum: 'TCMB', donem: 'ay', alanlar: { ay12: { ad: '12 ay sonrası enflasyon beklentisi', tur: 'yuzde', birim: '%' } } },
  rek: { kurum: 'TCMB', donem: 'ay', alanlar: { genel: { ad: 'Reel efektif döviz kuru endeksi (TÜFE bazlı)', tur: 'puan', birim: 'puan' } } },
  portfoyAylik: { kurum: 'TCMB', donem: 'ay', alanlar: { hisse: { ad: 'Yabancı hisse alımı (aylık, ödemeler dengesi)', tur: 'duzey', birim: 'milyon USD' } } },
};

// Haber değeri taşıyan alanlar: bölüm.alan -> haber için asgari fark (alanın kendi biriminde) ve önem puanı.
export const HABER_ALANLARI = {
  'enflasyon.yillik': { enAz: 0.1, onem: 66 },
  'enflasyon.aylik': { enAz: 0.1, onem: 65 },
  'issizlik.oran': { enAz: 0.1, onem: 64 },
  'sanayi.yillik': { enAz: 0.3, onem: 63 },
  'cari.cari': { enAz: 250, onem: 64 },
  'disTicaret.ihracat': { enAz: 200000, onem: 62 },
  'disTicaret.ithalat': { enAz: 200000, onem: 62 },
  'butce.denge': { enAz: 5000000, onem: 62 },
  'kredi.toplamYillik': { enAz: 0.3, onem: 62 },
};

export const alanTanimi = (bolum, alan) => IZLENEN[bolum]?.alanlar?.[alan] ?? null;
export const alanAdi = (bolum, alan) => alanTanimi(bolum, alan)?.ad ?? `${bolum}.${alan}`;
export const kurumAdi = (bolum) => IZLENEN[bolum]?.kurum ?? null;

const iki = (n) => String(n).padStart(2, '0');
const yuvarla = (x, h = 4) => Math.round(x * 10 ** h) / 10 ** h;

const deger = (nesne, yol) => {
  let d = nesne;
  for (const p of yol.split('.')) {
    if (d == null || typeof d !== 'object') return undefined;
    d = d[p];
  }
  return typeof d === 'number' && Number.isFinite(d) ? d : undefined;
};

export function donemAnahtari(satir, tur) {
  if (tur === 'tarih') return typeof satir?.tarih === 'string' ? satir.tarih : null;
  return Number.isInteger(satir?.yil) && Number.isInteger(satir?.ay) ? `${satir.yil}-${iki(satir.ay)}` : null;
}

// Fark yuvarlama gürültüsünün ötesinde mi?
export function anlamliFark(tur, eski, yeni) {
  const e = ESIKLER[tur] ?? ESIKLER.duzey;
  const fark = Math.abs(yeni - eski);
  const esik = Math.max(e.mutlak ?? 0, (e.goreli ?? 0) * Math.max(Math.abs(eski), Math.abs(yeni)));
  return fark >= esik - 1e-12; // tam sınırdaki fark kayan nokta yüzünden kaçmasın
}

/**
 * @param {object} eski önceki resmi.json
 * @param {object} yeni güncel resmi.json
 * @returns {{ revizyonlar: object[], toplu: { bolum: string, alan: string, adet: number }[] }}
 */
export function revizyonlariBul(eski, yeni, { tespit = new Date().toISOString() } = {}) {
  const revizyonlar = [];
  const toplu = [];
  for (const [bolum, tanim] of Object.entries(IZLENEN)) {
    const eskiSatirlar = eski?.[bolum]?.satirlar;
    const yeniSatirlar = yeni?.[bolum]?.satirlar;
    if (!Array.isArray(eskiSatirlar) || !Array.isArray(yeniSatirlar)) continue;
    const eskiHarita = new Map();
    for (const s of eskiSatirlar) {
      const k = donemAnahtari(s, tanim.donem);
      if (k) eskiHarita.set(k, s);
    }
    const kaynak = yeni[bolum].kaynak ? { ad: yeni[bolum].kaynak.ad, url: yeni[bolum].kaynak.url } : null;
    for (const [alan, a] of Object.entries(tanim.alanlar)) {
      const bulunan = [];
      for (const s of yeniSatirlar) {
        const k = donemAnahtari(s, tanim.donem);
        const onceki = k && eskiHarita.get(k);
        if (!onceki) continue; // yeni eklenen dönem
        const e = deger(onceki, alan);
        const y = deger(s, alan);
        if (e === undefined || y === undefined) continue; // alan bir tarafta yoksa revizyon değil
        if (!anlamliFark(a.tur, e, y)) continue;
        bulunan.push({ bolum, alan, donem: k, eski: yuvarla(e), yeni: yuvarla(y), fark: yuvarla(y - e), tespit, kaynak });
      }
      if (bulunan.length > TOPLU_ESIK) toplu.push({ bolum, alan, adet: bulunan.length });
      else revizyonlar.push(...bulunan);
    }
  }
  return { revizyonlar, toplu };
}

export const revizyonAnahtari = (r) => [r.bolum, r.alan, r.donem, r.eski, r.yeni].join('|');

// Yeniler üste; aynı revizyon ikinci kez eklenmez; en çok EN_COK_KAYIT kayıt.
export function birlestir(mevcut, yeni, enCok = EN_COK_KAYIT) {
  const goruldu = new Set((mevcut ?? []).map(revizyonAnahtari));
  const eklenen = [];
  for (const r of yeni) {
    const k = revizyonAnahtari(r);
    if (goruldu.has(k)) continue;
    goruldu.add(k);
    eklenen.push(r);
  }
  return { liste: [...eklenen, ...(mevcut ?? [])].slice(0, enCok), eklenen };
}

// ---- Gösterim ----
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function donemMetni(donem) {
  const m = String(donem).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return String(donem);
  return m[3] ? `${Number(m[3])} ${AYLAR[Number(m[2]) - 1]} ${m[1]}` : `${AYLAR[Number(m[2]) - 1]} ${m[1]}`;
}

// 1234567.891 -> "1.234.568"; yüzde/puan iki ondalık, virgüllü.
export function sayiMetni(n, tur) {
  const hane = tur === 'duzey' ? (Math.abs(n) >= 1000 ? 0 : 1) : 2;
  const ham = Math.abs(n).toFixed(hane);
  const s = tur === 'duzey' ? ham.replace(/\.0$/, '') : ham;
  const [tam, kes] = s.split('.');
  const binli = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${binli}${kes ? `,${kes}` : ''}`;
}

// Değerin birimiyle yazımı: yüzde "%29,73", diğerleri "4.053 milyon USD".
export function degerMetni(bolum, alan, n) {
  const a = alanTanimi(bolum, alan);
  if (!a) return sayiMetni(n, 'puan');
  if (a.birim === '%') return `%${sayiMetni(n, a.tur)}`;
  return `${sayiMetni(n, a.tur)} ${a.birim}`;
}

export function farkMetni(bolum, alan, f) {
  const a = alanTanimi(bolum, alan);
  const isaret = f > 0 ? '+' : f < 0 ? '−' : '';
  const mutlak = sayiMetni(Math.abs(f), a?.tur ?? 'puan');
  if (!a) return `${isaret}${mutlak}`;
  if (a.birim === '%') return `${isaret}${mutlak} puan`;
  return `${isaret}${mutlak} ${a.birim}`;
}
