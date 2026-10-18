import test from 'node:test';
import assert from 'node:assert/strict';
import { kapakCiz, haberKapagi, rakamKapagi, kaynakKapagi, bultenKapagi, gostergeKapagi, grafikKapagi, karneKapagi } from './kapak.mjs';

test('haberKapagi: rakamsız başlık ve spot ile geçerli PNG üretir', async () => {
  const png = await kapakCiz(haberKapagi({
    kategori: 'ekonomi',
    bolge: 'asya',
    baslik: 'Singapurlu yatırımcıların yerel borsadaki risk iştahı düşük',
    spot: 'Singapur Borsası Başkanı Koh Boon Hwee açıklamada bulundu.',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('haberKapagi: rakamlı iki kolonlu kart ile geçerli PNG üretir', async () => {
  const png = await kapakCiz(haberKapagi({
    kategori: 'ekonomi',
    bolge: 'küresel',
    baslik: 'Yapay zeka yatırımları küresel büyümeyi destekliyor',
    spot: 'IMF küresel büyüme tahminini güncelledi.',
    rakam: { etiket: '2026 Büyüme Tahmini', deger: '%3,1' },
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('rakamKapagi: makro rakam kartı dengeli boyutta PNG üretir', async () => {
  const png = await kapakCiz(rakamKapagi({
    kategori: 'piyasalar',
    ust: 'TCMB Politika Faizi',
    rakam: '%50,0',
    alt: 'PPK faiz kararını açıkladı.',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('kaynakKapagi: şirket veya dosya kartı geçerli PNG üretir', async () => {
  const png = await kapakCiz(kaynakKapagi({
    kategori: 'borsa',
    konu: 'TRex Bio, Inc.',
    alt: 'Halka arz nihai izahnamesi',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('bultenKapagi: bülten kartı geçerli PNG üretir', async () => {
  const png = await kapakCiz(bultenKapagi({
    saat: '14:00',
    tarih: '13 Ekim',
    basliklar: ['Başlık bir', 'Başlık iki'],
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('grafikKapagi: çizgi grafiği, referans çizgisi ve vurgu ile geçerli PNG üretir', async () => {
  const { grafikKapagi } = await import('./kapak.mjs');
  const seri = Array.from({ length: 900 }, (_, i) => ({
    tarih: new Date(Date.UTC(2023, 0, 1) + i * 864e5).toISOString().slice(0, 10),
    deger: 1000 + i + 80 * Math.sin(i / 20),
  }));
  const png = await kapakCiz(grafikKapagi({
    kategori: 'borsa',
    baslik: 'BIST 100 son bir yılın zirvesinden yüzde 10\'un üzerinde geriledi',
    seri,
    cizgiler: [{ deger: 2000, etiket: 'Zirve 2.000,00 · 1 Mayıs 2025' }],
    vurgu: 'Zirveden −%10,2',
  }));
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 3000);
});

test('eksenAdimi ve incelt: okunaklı adım, tepe ve son nokta korunur', async () => {
  const { eksenAdimi, incelt } = await import('./kapak.mjs');
  assert.equal(eksenAdimi(5000), 2000);
  assert.equal(eksenAdimi(37), 10);
  const seri = Array.from({ length: 5000 }, (_, i) => ({ tarih: String(i).padStart(5, '0'), deger: i === 1234 ? 99999 : i % 7 }));
  const az = incelt(seri);
  assert.ok(az.length <= 601);
  assert.ok(az.some((p) => p.deger === 99999));
  assert.equal(az.at(-1), seri.at(-1));
});

test('mürekkep bloğu: zemin kategorinin mürekkep rengidir; döviz & altında zemin beyaz, yazı mürekkep renginde', async () => {
  const { default: sharp } = await import('sharp');
  const piksel = async (png, x, y) => {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const yakin = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 6);
  const mavi = await kapakCiz(haberKapagi({ kategori: 'piyasalar', baslik: 'Test başlığı' }));
  assert.ok(yakin(await piksel(mavi, 4, 4), [0x2e, 0x5d, 0x8a]));
  const sari = await kapakCiz(haberKapagi({ kategori: 'doviz', baslik: 'Test başlığı' }));
  assert.ok(yakin(await piksel(sari, 4, 4), [0xff, 0xff, 0xff]));
  // Alt bantta marka yazısı: sarıda koyu, mavide açık renkli piksel bulunur.
  const enKoyu = async (png) => {
    const { data } = await sharp(png).extract({ left: 120, top: 560, width: 150, height: 50 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let min = 765, max = 0;
    for (let i = 0; i < data.length; i += 3) { const t = data[i] + data[i + 1] + data[i + 2]; min = Math.min(min, t); max = Math.max(max, t); }
    return { min, max };
  };
  assert.ok((await enKoyu(sari)).min < 150);
  assert.ok((await enKoyu(mavi)).max > 700);
});

test('rakamKapagi ve bultenKapagi: uzun rakam, uzun maddeler ve örnek notuyla PNG üretir', async () => {
  const r = await kapakCiz(rakamKapagi({ kategori: 'doviz', ust: 'Gösterge tahvil getirisi', rakam: '1.234.567,89 milyar', alt: 'Kısa satır', ornek: true }));
  assert.ok(r.length > 3000);
  const b = await kapakCiz(bultenKapagi({ tarih: '13 Ekim', basliklar: ['Çok uzun bir madde '.repeat(8), 'İkinci', 'Üçüncü', 'Dördüncü (çizilmez)'] }));
  assert.ok(b.length > 3000);
});

test('yazı tipi bekçisi: kullanılan kesimler denetimden geçer, yanlış kesim ya da yedek yazı tipi yakalanır', async () => {
  const { fontlariDenetle, fontIzi, izUyusuyor, FONT_IZI } = await import('./kapak.mjs');
  await fontlariDenetle();
  for (const ad of ['Jost-600', 'Jost-700', 'Literata-500', 'Literata-700']) assert.ok(FONT_IZI[ad], ad);
  assert.ok(izUyusuyor(await fontIzi('Jost', 700), FONT_IZI['Jost-700']));
  // Komşu kalınlık ve başka aile eşleşmemeli.
  assert.equal(izUyusuyor(await fontIzi('Jost', 600), FONT_IZI['Jost-700']), false);
  assert.equal(izUyusuyor(await fontIzi('Literata', 700), FONT_IZI['Jost-700']), false);
  // Tidsrost'ta ölçülen türden bir yedek yazı tipi izi (950×100, az mürekkep) reddedilir.
  assert.equal(izUyusuyor({ w: 950, h: 100, murekkep: 12859 }, FONT_IZI['Literata-700']), false);
});

test('yenile.kapakTuru: yalnız kesin tanınan kapaklar yeniden çizilir', async () => {
  const { kapakTuru, bultenBasliklari } = await import('./yenile.mjs');
  assert.equal(kapakTuru({ tur: 'bulten', title: 'Piyasa bülteni · 11 Ekim 2026, kapanış' }), 'bulten');
  assert.equal(kapakTuru({ title: 'Nasdaq düştü', coverAlt: 'ABD · Nasdaq düştü' }), 'haber');
  assert.equal(kapakTuru({ title: 'Büyüme', coverAlt: 'Büyüme tahmini %3,1', rakamlar: [{ etiket: 'Büyüme tahmini', deger: 'yüzde 3,1' }] }), 'haber');
  assert.equal(kapakTuru({ title: 'TCMB faizi sabit tuttu', coverAlt: 'TCMB politika faizi %50,0' }), null);
  assert.equal(kapakTuru({ title: 'KOSPI düştü', coverAlt: 'Güney Kore KOSPI günlük kapanış grafiği' }), null);
  assert.deepEqual(bultenBasliklari('## ABD\n\n- **A:** x\n- **B:** y\n\n## Asya\n\n- **C:** z\n- **D:** w'), ['A', 'B', 'C']);
});

test('veri kapakları (grafik, karne, gösterge, rakam) her kategoride beyaz zeminli; karnede yükselen yeşil, düşen kırmızı', async () => {
  const { default: sharp } = await import('sharp');
  const sol = async (png) => [...(await sharp(png).extract({ left: 4, top: 4, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
  const gun = (i) => `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, '0')}`;
  const seri = Array.from({ length: 30 }, (_, i) => ({ tarih: gun(i), deger: 100 + i }));
  for (const k of [
    grafikKapagi({ kategori: 'borsa', baslik: 'KOSPI düştü', seri }),
    rakamKapagi({ kategori: 'piyasalar', ust: 'TCMB politika faizi', rakam: '%39,50' }),
    karneKapagi({ kategori: 'piyasalar', baslik: 'Karne', satirlar: [{ etiket: 'A', deger: 2 }, { etiket: 'B', deger: -1 }] }),
    gostergeKapagi({ kategori: 'ekonomi', baslik: 'Gösterge', simge: 'fabrika', birim: 10, birimEtiket: '10', satirlar: [{ etiket: '2024', deger: 30 }] }),
  ]) assert.deepEqual(await sol(await kapakCiz(k)), [255, 255, 255]);
  const karne = await karneKapagi({ kategori: 'piyasalar', baslik: 'Karne', satirlar: [{ etiket: 'A', deger: 2 }, { etiket: 'B', deger: -1 }] })();
  assert.match(karne.svg, /fill="#3f7350"/);
  assert.match(karne.svg, /fill="#c43d2b"/);
});
