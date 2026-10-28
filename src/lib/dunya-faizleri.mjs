// Dünya politika faizleri: saf hesap mantığı (ağ yok). Veri BIS WS_CBPOL (günlük politika faizi) ve WS_LONG_CPI
// (aylık TÜFE, yıllık değişim) serilerinden gelir; çekme işini scripts/veri/dunya-faizleri.mjs yapar.

// Sayfaların ortak ülke tablosu. bis: BIS iki harfli kodu; oecd: OECD SDMX üç harfli kod adayları (euro bölgesi için
// birden çok olabilir, en yeni gözlemi veren kullanılır); grup: IMF WEO sınıflaması (emsal ülkeler sayfası).
export const ULKELER = [
  { kod: 'TUR', bis: 'TR', oecd: ['TUR'], ad: 'Türkiye', banka: 'TCMB', grup: 'tr' },
  { kod: 'USA', bis: 'US', oecd: ['USA'], ad: 'ABD', banka: 'Fed', grup: 'gelismis', aralik: true },
  { kod: 'XM', bis: 'XM', oecd: ['EA20', 'EA21', 'EA19', 'EA'], ad: 'Euro Bölgesi', banka: 'ECB', grup: 'gelismis' },
  { kod: 'JPN', bis: 'JP', oecd: ['JPN'], ad: 'Japonya', banka: 'Japonya Merkez Bankası', grup: 'gelismis' },
  { kod: 'GBR', bis: 'GB', oecd: ['GBR'], ad: 'Birleşik Krallık', banka: 'İngiltere Merkez Bankası', grup: 'gelismis' },
  { kod: 'CHE', bis: 'CH', oecd: ['CHE'], ad: 'İsviçre', banka: 'İsviçre Ulusal Bankası', grup: 'gelismis' },
  { kod: 'CAN', bis: 'CA', oecd: ['CAN'], ad: 'Kanada', banka: 'Kanada Merkez Bankası', grup: 'gelismis' },
  { kod: 'AUS', bis: 'AU', oecd: ['AUS'], ad: 'Avustralya', banka: 'Avustralya Merkez Bankası', grup: 'gelismis' },
  { kod: 'NZL', bis: 'NZ', oecd: ['NZL'], ad: 'Yeni Zelanda', banka: 'Yeni Zelanda Merkez Bankası', grup: 'gelismis' },
  { kod: 'NOR', bis: 'NO', oecd: ['NOR'], ad: 'Norveç', banka: 'Norveç Merkez Bankası', grup: 'gelismis' },
  { kod: 'SWE', bis: 'SE', oecd: ['SWE'], ad: 'İsveç', banka: 'İsveç Merkez Bankası', grup: 'gelismis' },
  { kod: 'CZE', bis: 'CZ', oecd: ['CZE'], ad: 'Çekya', banka: 'Çek Ulusal Bankası', grup: 'gelismis' },
  { kod: 'KOR', bis: 'KR', oecd: ['KOR'], ad: 'Güney Kore', banka: 'Kore Merkez Bankası', grup: 'gelismis' },
  { kod: 'BRA', bis: 'BR', oecd: ['BRA'], ad: 'Brezilya', banka: 'Brezilya Merkez Bankası', grup: 'gelismekte' },
  { kod: 'MEX', bis: 'MX', oecd: ['MEX'], ad: 'Meksika', banka: 'Meksika Merkez Bankası', grup: 'gelismekte' },
  { kod: 'CHL', bis: 'CL', oecd: ['CHL'], ad: 'Şili', banka: 'Şili Merkez Bankası', grup: 'gelismekte' },
  { kod: 'COL', bis: 'CO', oecd: ['COL'], ad: 'Kolombiya', banka: 'Kolombiya Merkez Bankası', grup: 'gelismekte' },
  { kod: 'POL', bis: 'PL', oecd: ['POL'], ad: 'Polonya', banka: 'Polonya Ulusal Bankası', grup: 'gelismekte' },
  { kod: 'HUN', bis: 'HU', oecd: ['HUN'], ad: 'Macaristan', banka: 'Macaristan Merkez Bankası', grup: 'gelismekte' },
  { kod: 'ZAF', bis: 'ZA', oecd: ['ZAF'], ad: 'Güney Afrika', banka: 'Güney Afrika Merkez Bankası', grup: 'gelismekte' },
  { kod: 'IND', bis: 'IN', oecd: ['IND'], ad: 'Hindistan', banka: 'Hindistan Merkez Bankası', grup: 'gelismekte' },
  { kod: 'IDN', bis: 'ID', oecd: ['IDN'], ad: 'Endonezya', banka: 'Endonezya Merkez Bankası', grup: 'gelismekte' },
  { kod: 'CHN', bis: 'CN', oecd: ['CHN'], ad: 'Çin', banka: 'Çin Halk Bankası', grup: 'gelismekte' },
];

const yuvarla = (n, o = 2) => Math.round(n * 10 ** o) / 10 ** o;

// Tırnaklı alan destekleyen küçük CSV ayrıştırıcı; başlık satırına göre nesne dizisi verir.
export function csvAyristir(metin) {
  const satirlar = [];
  let alan = '';
  let satir = [];
  let tirnak = false;
  const bitirAlan = () => {
    satir.push(alan);
    alan = '';
  };
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') {
        alan += '"';
        i++;
      } else if (c === '"') tirnak = false;
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') bitirAlan();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++;
      bitirAlan();
      if (satir.length > 1 || satir[0] !== '') satirlar.push(satir);
      satir = [];
    } else alan += c;
  }
  if (alan !== '' || satir.length) {
    bitirAlan();
    satirlar.push(satir);
  }
  if (!satirlar.length) return [];
  const [baslik, ...govde] = satirlar;
  return govde.map((s) => Object.fromEntries(baslik.map((b, i) => [b, s[i] ?? ''])));
}

const sayiMi = (v) => v !== '' && v !== 'NaN' && Number.isFinite(Number(v));

// BIS CSV (detail=dataonly) -> { 'TR': [{ t: '2026-10-16', v: 37 }, ...] }; gözlemi olmayan (NaN) satırlar atılır.
export function bisSeriler(csv) {
  const sonuc = {};
  for (const r of csvAyristir(csv)) {
    if (!sayiMi(r.OBS_VALUE) || !r.REF_AREA || !r.TIME_PERIOD) continue;
    (sonuc[r.REF_AREA] ??= []).push({ t: r.TIME_PERIOD, v: Number(r.OBS_VALUE) });
  }
  for (const k of Object.keys(sonuc)) sonuc[k].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  return sonuc;
}

// 'YYYY-MM-DD' tarihine n ay ekler (ay sonu taşmasında ayın son gününe iner).
export function ayEkle(tarih, n) {
  const y = Number(tarih.slice(0, 4));
  const a = Number(tarih.slice(5, 7)) - 1 + n;
  const gun = Number(tarih.slice(8, 10)) || 1;
  const yeniY = y + Math.floor(a / 12);
  const yeniA = ((a % 12) + 12) % 12;
  const sonGun = new Date(Date.UTC(yeniY, yeniA + 1, 0)).getUTCDate();
  return `${yeniY}-${String(yeniA + 1).padStart(2, '0')}-${String(Math.min(gun, sonGun)).padStart(2, '0')}`;
}

// Değerin değiştiği günler. Gün gün seride değer bir öncekinden farklıysa o gün hareket günüdür.
export function hareketler(seri) {
  const sonuc = [];
  for (let i = 1; i < seri.length; i++) {
    const fark = seri[i].v - seri[i - 1].v;
    if (Math.abs(fark) > 1e-9) sonuc.push({ tarih: seri[i].t, onceki: seri[i - 1].v, yeni: seri[i].v, bp: Math.round(fark * 100) });
  }
  return sonuc;
}

export const sonHareket = (seri) => hareketler(seri).at(-1) ?? null;

// Belirli bir tarihte ya da ondan önceki son gözlem.
export function tarihtekiDeger(seri, tarih) {
  let sonuc = null;
  for (const o of seri) {
    if (o.t <= tarih) sonuc = o;
    else break;
  }
  return sonuc;
}

// Son 12 ayın değişimi (baz puan). Seri 12 ay öncesini kapsamıyorsa null.
export function degisim12Ay(seri) {
  if (!seri.length) return null;
  const son = seri.at(-1);
  if (seri[0].t > ayEkle(son.t, -12)) return null;
  const once = tarihtekiDeger(seri, ayEkle(son.t, -12));
  return once ? Math.round((son.v - once.v) * 100) : null;
}

// Faz kuralı: referans tarihten geriye 6 ay içinde hareket varsa en son hareketin yönü belirler
// (artırım: Sıkılaştırma, indirim: Gevşeme); hareket yoksa Beklemede.
export function faz(seri, ref = seri.at(-1)?.t, ay = 6) {
  const h = sonHareket(seri);
  if (!h || !ref || h.tarih < ayEkle(ref, -ay)) return 'Beklemede';
  return h.bp > 0 ? 'Sıkılaştırma' : 'Gevşeme';
}

// Her ayın son gözlemi: [{ ay: '2026-09', v }].
export function ayinSonu(seri) {
  const sonuc = [];
  for (const o of seri) {
    const ay = o.t.slice(0, 7);
    if (sonuc.at(-1)?.ay === ay) sonuc[sonuc.length - 1] = { ay, v: o.v };
    else sonuc.push({ ay, v: o.v });
  }
  return sonuc;
}

// ZamanGrafik zaman anahtarı (aylık): yıl × 12 + (ay − 1).
export const ayAnahtari = (ay) => Number(ay.slice(0, 4)) * 12 + Number(ay.slice(5, 7)) - 1;

// Reel faiz (puan) = politika faizi − yıllık TÜFE.
export const reelFaiz = (faiz, tufe) => (faiz == null || tufe == null ? null : yuvarla(faiz - tufe, 2));

// ABD: BIS hedef aralığın orta noktasını verir; aralık orta ± 0,125.
export const abdAraligi = (orta) => ({ alt: yuvarla(orta - 0.125, 3), ust: yuvarla(orta + 0.125, 3) });

// BIS WS_LONG_CPI -> { 'TR': { donem: '2026-08', deger: 31.5 } }: her ülkenin son aylık gözlemi.
export function tufeSonlari(csv) {
  const sonuc = {};
  for (const r of csvAyristir(csv)) {
    if (!sayiMi(r.OBS_VALUE) || !r.REF_AREA || !r.TIME_PERIOD) continue;
    const m = sonuc[r.REF_AREA];
    if (!m || r.TIME_PERIOD > m.donem) sonuc[r.REF_AREA] = { donem: r.TIME_PERIOD, deger: Number(r.OBS_VALUE) };
  }
  return sonuc;
}

// En çok görülen dönem (eşitlikte en yeni); başlıkta gösterilen dönem budur.
export function cogunlukDonemi(donemler) {
  const sayac = new Map();
  for (const d of donemler) if (d) sayac.set(d, (sayac.get(d) ?? 0) + 1);
  let en = null;
  for (const [d, n] of sayac) if (!en || n > en.n || (n === en.n && d > en.d)) en = { d, n };
  return en?.d ?? null;
}

// Tek ülkenin tablo satırı. tufe: { donem, deger } | null. ref: faz için referans tarih. bugun: 12 aydan eski TÜFE'yi dışarıda bırakır.
export function faizSatiri({ ulke, seri, tufe, ref, bugun }) {
  if (!seri?.length) return null;
  const son = seri.at(-1);
  const h = sonHareket(seri);
  const tufeGecerli = tufe && (!bugun || tufe.donem >= ayEkle(`${bugun.slice(0, 7)}-01`, -12).slice(0, 7)) ? tufe : null;
  return {
    kod: ulke.kod,
    ad: ulke.ad,
    banka: ulke.banka,
    faiz: yuvarla(son.v, 3),
    aralik: ulke.aralik ? abdAraligi(son.v) : null,
    tarih: son.t,
    sonHareket: h ? { yon: h.bp > 0 ? 'artırım' : 'indirim', bp: Math.abs(h.bp), tarih: h.tarih } : null,
    degisim12Ay: degisim12Ay(seri),
    faz: faz(seri, ref),
    tufe: tufeGecerli ? { donem: tufeGecerli.donem, deger: yuvarla(tufeGecerli.deger, 2) } : null,
    reel: reelFaiz(son.v, tufeGecerli?.deger),
  };
}

// BIS'in Türkiye serisi TCMB kararlarının birkaç gün gerisinden gelir. BIS'in son gözleminden sonraki TCMB
// değişiklikleri (resmi.json faiz.gecmis: { tarih, oran }, TCMB'nin 1 hafta repo tablosu) seriye eklenir.
// Dönen dizi yeni bir dizidir; eklenen gözlemler kaynak: 'tcmb' taşır.
export function tcmbIleUzat(seri, gecmis) {
  const son = seri.at(-1)?.t ?? '';
  const ek = (gecmis ?? [])
    .filter((g) => g && typeof g.oran === 'number' && typeof g.tarih === 'string' && g.tarih > son)
    .sort((a, b) => (a.tarih < b.tarih ? -1 : 1))
    .map((g) => ({ t: g.tarih, v: g.oran, kaynak: 'tcmb' }));
  return [...seri, ...ek];
}
