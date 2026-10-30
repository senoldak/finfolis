import test from 'node:test';
import assert from 'node:assert/strict';
import { FİNFOLİS_GRAFİKLER } from './finfolis-charts-data.ts';

test('FİNFOLİS_GRAFİKLER: tam 62 mebius grafik bileşeni finfolis için tanımlı', () => {
  assert.equal(FİNFOLİS_GRAFİKLER.length, 62, 'Tam 62 grafik tanımlı olmalı');
});

test('FİNFOLİS_GRAFİKLER: her grafiğin id değeri tekil ve geçerli formatta', () => {
  const idler = new Set();
  for (const g of FİNFOLİS_GRAFİKLER) {
    assert.ok(g.id.startsWith('charts-'), `${g.id} charts- ile başlamalı`);
    assert.ok(!idler.has(g.id), `${g.id} tekil olmalı`);
    idler.add(g.id);
  }
  assert.equal(idler.size, 62);
});

test('FİNFOLİS_GRAFİKLER: finfolis kimliğine uygun kategori ve başlık kuralları', () => {
  const GECERLI_KATEGORILER = new Set([
    'PİYASALAR',
    'BORSA',
    'DÖVİZ & ALTIN',
    'EKONOMİ',
    'KİŞİSEL FİNANS',
    'BANKACILIK',
  ]);

  for (const g of FİNFOLİS_GRAFİKLER) {
    assert.ok(GECERLI_KATEGORILER.has(g.kategori), `${g.id} kategorisi geçerli olmalı: ${g.kategori}`);
    assert.ok(g.baslik && g.baslik.trim().length > 3, `${g.id} Türkçe başlığı olmalı`);
    assert.ok(g.aciklama && g.aciklama.trim().length > 10, `${g.id} öğretici açıklaması olmalı`);
    assert.ok(g.metrik && g.metrik.trim().length > 0, `${g.id} metrik değeri olmalı`);
    assert.ok(typeof g.degisim === 'number' && !Number.isNaN(g.degisim), `${g.id} sayısal değişim taşımalı`);
    assert.ok(g.degisimEtiket && g.degisimEtiket.trim().length > 0, `${g.id} değişim etiketi taşımalı`);
    assert.ok(g.kaynak && g.kaynak.trim().length > 0, `${g.id} resmi kaynak taşımalı`);
    assert.ok(g.tarih && g.tarih.trim().length > 0, `${g.id} tarih taşımalı`);
  }
});

test('FİNFOLİS_GRAFİKLER: mebius kaynak metadata izlenebilirliği', () => {
  for (const g of FİNFOLİS_GRAFİKLER) {
    assert.ok(g.mebiusTitle, `${g.id} mebiusTitle taşımalı`);
    assert.ok(g.exportName, `${g.id} exportName taşımalı`);
    assert.ok(g.mebiusFile.endsWith('.tsx'), `${g.id} mebiusFile .tsx ile bitmeli`);
    assert.ok(g.previewImage.endsWith('.webp'), `${g.id} previewImage .webp olmalı`);
  }
});

test('FİNFOLİS_GRAFİKLER: her grafik türünün çizim veri bütünlüğü', () => {
  for (const g of FİNFOLİS_GRAFİKLER) {
    switch (g.tur) {
      case 'alan':
      case 'sutun':
        assert.ok(Array.isArray(g.seri) && g.seri.length >= 3, `${g.id} (${g.tur}) en az 3 noktalı seri taşımalı`);
        for (const pt of g.seri) {
          assert.ok(typeof pt.deger === 'number' && !Number.isNaN(pt.deger));
          assert.ok(typeof pt.etiket === 'string' && pt.etiket.length > 0);
        }
        break;
      case 'halka-pay':
        assert.ok(Array.isArray(g.dilimler) && g.dilimler.length >= 3, `${g.id} en az 3 dilim taşımalı`);
        const toplamOran = g.dilimler.reduce((acc, d) => acc + d.oran, 0);
        assert.equal(toplamOran, 100, `${g.id} dilim oranları toplamı %100 olmalı`);
        break;
      case 'aralik-bant':
        assert.ok(Array.isArray(g.araliklar) && g.araliklar.length >= 3, `${g.id} aralık listesi taşımalı`);
        for (const a of g.araliklar) {
          assert.ok(a.min <= a.mevcut && a.mevcut <= a.max, `${g.id} min <= mevcut <= max olmalı`);
        }
        break;
      case 'yigilmis-sutun':
        assert.ok(Array.isArray(g.gruplar) && g.gruplar.length >= 2, `${g.id} gruplar taşımalı`);
        break;
      case 'ayrisan-cubuk':
        assert.ok(Array.isArray(g.seri) && g.seri.length >= 3, `${g.id} seri taşımalı`);
        break;
      case 'radyal-hedef':
        assert.ok(typeof g.oran === 'number' && g.oran >= 0 && g.oran <= 100, `${g.id} 0-100 arası oran taşımalı`);
        break;
      case 'coklu-karma':
        assert.ok(Array.isArray(g.seriler) && g.seriler.length >= 3, `${g.id} seriler taşımalı`);
        break;
      case 'nokta-dagilim':
        assert.ok(Array.isArray(g.noktalar) && g.noktalar.length >= 5, `${g.id} noktalar taşımalı`);
        break;
      case 'siralama-cubuk':
        assert.ok(Array.isArray(g.ogeler) && g.ogeler.length >= 3, `${g.id} ogeler taşımalı`);
        break;
      case 'akis-selale':
        assert.ok(Array.isArray(g.adimlari) && g.adimlari.length >= 3, `${g.id} adimlari taşımalı`);
        const netAdimi = g.adimlari.find(a => a.tur === 'net');
        assert.ok(netAdimi, `${g.id} akis-selale net adımına sahip olmalı`);
        break;
      default:
        assert.fail(`Bilinmeyen grafik türü: ${g.tur}`);
    }
  }
});

test('FİNFOLİS_GRAFİKLER: 62 kartın tamamı abaküs boncuk verisi taşır', () => {
  for (const g of FİNFOLİS_GRAFİKLER) {
    assert.ok(
      typeof g.boncukMiktar === 'number' && g.boncukMiktar >= 1 && g.boncukMiktar <= 10,
      `${g.id} 1-10 arası boncuk miktarı taşımalı`
    );
    assert.ok(
      typeof g.boncukBirim === 'string' && g.boncukBirim.trim().length > 0,
      `${g.id} boncuk birimi açıklaması taşımalı`
    );
  }
});

test('FİNFOLİS_GRAFİKLER: BRAND.md renk kurallarına tam uyum (mavi yok, onaylı renkler)', () => {
  const ONAYLI_RENKLER = new Set(['toprak', 'murekkep', 'komur', 'yesil', 'gri']);
  for (const g of FİNFOLİS_GRAFİKLER) {
    if (g.dilimler) {
      for (const d of g.dilimler) {
        assert.ok(
          ONAYLI_RENKLER.has(d.renk),
          `${g.id} dilim rengi onaylı olmalı: ${d.renk}`
        );
        assert.notEqual(d.renk, 'mavi', `${g.id} diliminde BRAND.md gereği mavi renk kullanılamaz`);
      }
    }
  }
});
