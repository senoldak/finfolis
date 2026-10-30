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

test('C dili: kâğıt zemin, başlık kapağında sağ üstte pişmiş toprak vurgu boncuğu, altta koyu marka yazısı', async () => {
  const { default: sharp } = await import('sharp');
  const piksel = async (png, x, y) => {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const yakin = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 8);
  for (const kategori of ['piyasalar', 'doviz', 'kripto']) {
    const png = await kapakCiz(haberKapagi({ kategori, baslik: 'Test başlığı' }));
    assert.ok(yakin(await piksel(png, 4, 4), [0xf4, 0xf3, 0xee]), kategori);
    // Vurgu boncuğu: büyük abaküsün üst teli, sağ uç (x = 820 + 100/120 × 470 ≈ 1192, y = −30 + 24/120 × 470 ≈ 64).
    assert.ok(yakin(await piksel(png, 1190, 64), [0xc2, 0x50, 0x2b]), kategori);
  }
  const png = await kapakCiz(haberKapagi({ kategori: 'ekonomi', baslik: 'Test başlığı' }));
  const { data } = await sharp(png).extract({ left: 64, top: 585, width: 160, height: 50 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let min = 765;
  for (let i = 0; i < data.length; i += 3) min = Math.min(min, data[i] + data[i + 1] + data[i + 2]);
  assert.ok(min < 150);
});

test('rakamKapagi ve bultenKapagi: uzun rakam, uzun maddeler ve örnek notuyla PNG üretir', async () => {
  const r = await kapakCiz(rakamKapagi({ kategori: 'doviz', ust: 'Gösterge tahvil getirisi', rakam: '1.234.567,89 milyar', alt: 'Kısa satır', ornek: true }));
  assert.ok(r.length > 3000);
  const b = await kapakCiz(bultenKapagi({ tarih: '13 Ekim', basliklar: ['Çok uzun bir madde '.repeat(8), 'İkinci', 'Üçüncü', 'Dördüncü (çizilmez)'] }));
  assert.ok(b.length > 3000);
});

test('yazı tipi bekçisi: kapak yazı tipi Türkçe harfleri ve ₺ simgesini içerir', async () => {
  const { fontlariDenetle } = await import('./kapak.mjs');
  await fontlariDenetle();
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

test('veri kapakları (grafik, karne, gösterge, rakam) kâğıt zeminli; karnede yükselen yeşil, düşen kırmızı', async () => {
  const { default: sharp } = await import('sharp');
  const sol = async (png) => [...(await sharp(png).extract({ left: 4, top: 4, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
  const gun = (i) => `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, '0')}`;
  const seri = Array.from({ length: 30 }, (_, i) => ({ tarih: gun(i), deger: 100 + i }));
  for (const k of [
    grafikKapagi({ kategori: 'borsa', baslik: 'KOSPI düştü', seri }),
    rakamKapagi({ kategori: 'piyasalar', ust: 'TCMB politika faizi', rakam: '%39,50' }),
    karneKapagi({ kategori: 'piyasalar', baslik: 'Karne', satirlar: [{ etiket: 'A', deger: 2 }, { etiket: 'B', deger: -1 }] }),
    gostergeKapagi({ kategori: 'ekonomi', baslik: 'Gösterge', birim: 10, birimEtiket: '10', satirlar: [{ etiket: '2024', deger: 30 }] }),
  ]) assert.deepEqual(await sol(await kapakCiz(k)), [0xf4, 0xf3, 0xee]);
  const karne = await karneKapagi({ kategori: 'piyasalar', baslik: 'Karne', satirlar: [{ etiket: 'A', deger: 2 }, { etiket: 'B', deger: -1 }] })();
  assert.match(karne.svg, /fill="#3f7350"/);
  assert.match(karne.svg, /fill="#a3243b"/);
});

test('grafikKapagi: olay günleri veri renginde (düşüş kırmızı), olay yoksa çizgi mürekkep', async () => {
  const seri = Array.from({ length: 40 }, (_, i) => ({ tarih: `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, '0')}`, deger: 100 - i }));
  const d = await grafikKapagi({ kategori: 'borsa', baslik: 'Seri', seri, olay: { bas: seri.at(-8).tarih, yon: 'dusus' } })();
  assert.match(d.svg, /stroke="#a3243b" stroke-width="6"/);
  const y = await grafikKapagi({ kategori: 'borsa', baslik: 'Seri', seri, olay: { bas: seri.at(-8).tarih, yon: 'yukselis' } })();
  assert.match(y.svg, /stroke="#3f7350" stroke-width="6"/);
  const yok = await grafikKapagi({ kategori: 'borsa', baslik: 'Seri', seri })();
  assert.doesNotMatch(yok.svg, /stroke-width="6"/);
});

test('ajandaKapagi: günün öne çıkan verileri kartı kâğıt zeminli ve geçerli PNG üretir', async () => {
  const { ajandaKapagi } = await import('./kapak.mjs');
  const { default: sharp } = await import('sharp');

  const maddeler = [
    {
      saat: '10:00',
      ulke: 'Türkiye',
      ulkeKodu: 'TR',
      gosterge: 'İSO İmalat PMI',
      donem: 'Ekim 2026',
      onceki: '49,2',
      beklenti: '50,1',
      aciklanan: '49,8',
      esik: { aciklama: 'Eşik 50 · Üzeri büyüme' },
      nedenOnemli: 'Satın Alma Yöneticileri Endeksi sanayide büyüme ve daralmayı ölçer.',
    },
    {
      saat: '13:00',
      ulke: 'Euro Bölgesi',
      ulkeKodu: 'EU',
      gosterge: 'TÜFE Enflasyonu (Öncü)',
      donem: 'Ekim 2026',
      onceki: '%2,2',
      beklenti: '%2,0',
      aciklanan: '%2,1',
      esik: { aciklama: 'ECB Hedefi: %2,0' },
      nedenOnemli: 'Avrupa Merkez Bankası faiz kararlarında bu göstergeyi izler.',
    },
  ];

  const png = await kapakCiz(
    ajandaKapagi({
      tarih: 'Günün Öne Çıkan Verileri · 31 Ekim 2026',
      altBaslik: 'Küresel ve Yerel Makroekonomik Ajanda',
      maddeler,
      ornek: true,
    })
  );

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);

  const meta = await sharp(png).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);

  // Kâğıt zemin kontrolü
  const solUst = [...(await sharp(png).extract({ left: 4, top: 12, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
  assert.deepEqual(solUst, [0xf4, 0xf3, 0xee]);

  // Üst 6px pişmiş toprak şerit kontrolü (y = 2)
  const serit = [...(await sharp(png).extract({ left: 600, top: 2, width: 1, height: 1 }).removeAlpha().raw().toBuffer())];
  assert.deepEqual(serit, [0xc2, 0x50, 0x2b]);
});

test('ajandaKartiUret: betik programatik olarak çağrıldığında kartı üretir', async () => {
  const { ajandaKartiUret } = await import('./ajanda-kart-uret.mjs');
  const sonuc = await ajandaKartiUret({ ornek: true });

  assert.ok(sonuc.buffer);
  assert.ok(sonuc.buffer.length > 5000);
  assert.ok(sonuc.yol);
  assert.ok(sonuc.tarih);
});

test('ajandaKapagi: 6 göstergeli tam ajanda ve 7+ göstergeli önceliklendirme taşmadan çizilir', async () => {
  const { ajandaKapagi } = await import('./kapak.mjs');
  const rawData = (await import('../../src/data/ajanda.json', { with: { type: 'json' } })).default;
  const altiMadde = rawData.ajandalar[0].gostergeler;
  assert.equal(altiMadde.length, 6, 'İlk günün 6 göstergesi olmalıdır');

  // 6 göstergeli çizim
  const pngAlti = await kapakCiz(
    ajandaKapagi({
      tarih: '31 Ekim 2026',
      altBaslik: '6 Göstergeli Ajanda Kartı',
      maddeler: altiMadde,
    })
  );
  assert.ok(Buffer.isBuffer(pngAlti));
  assert.ok(pngAlti.length > 5000);

  // 7 göstergeli (önceliklendirme testi)
  const yediMadde = [
    ...altiMadde,
    {
      saat: '19:00',
      ulke: 'ABD',
      ulkeKodu: 'US',
      gosterge: 'Düşük Öncelikli Veri',
      onem: 'dusuk',
      onceki: '10',
      nedenOnemli: 'Açıklayıcı metin örneğidir.',
      kaynak: 'Kaynak',
    },
  ];
  const pngYedi = await kapakCiz(
    ajandaKapagi({
      tarih: '31 Ekim 2026',
      altBaslik: '7 Göstergeli Önceliklendirme Kartı',
      maddeler: yediMadde,
    })
  );
  assert.ok(Buffer.isBuffer(pngYedi));
  assert.ok(pngYedi.length > 5000);
});

