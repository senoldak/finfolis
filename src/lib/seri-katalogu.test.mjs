import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seriKatalogu, satirTarihi, yoldanDeger, TANIMLAR, DIGER_TANIMLAR } from './seri-katalogu.mjs';
import { ULKELER } from './dunya-faizleri.mjs';

const kaynak = { ad: 'Deneme kaynağı', url: 'https://ornek.test/' };

test('satirTarihi: ay, çeyrek, gün ve özel biçimler', () => {
  assert.deepEqual(satirTarihi({ yil: 2026, ay: 9 }), { tarih: '2026-09-01', siklik: 'ay' });
  assert.deepEqual(satirTarihi({ yil: 2026, ceyrek: 3 }), { tarih: '2026-07-01', siklik: 'ceyrek' });
  assert.deepEqual(satirTarihi({ tarih: '2026-10-16' }, null, 'hafta'), { tarih: '2026-10-16', siklik: 'hafta' });
  assert.deepEqual(satirTarihi({ tarih: '21-10-2026' }, 'gunAyYil'), { tarih: '2026-10-21', siklik: 'gun' });
  assert.deepEqual(satirTarihi({ tarih: '2026-8' }, 'yilAy'), { tarih: '2026-08-01', siklik: 'ay' });
  assert.deepEqual(satirTarihi({ donem: '2026-07' }, 'donem'), { tarih: '2026-07-01', siklik: 'ay' });
  assert.equal(satirTarihi({ x: 1 }), null);
});

test('yoldanDeger: iç içe yol, sayı olmayan değer null', () => {
  const s = { bolgeler: { TR: { endeks: 100.5 } }, bos: null, metin: 'a' };
  assert.equal(yoldanDeger(s, 'bolgeler.TR.endeks'), 100.5);
  assert.equal(yoldanDeger(s, 'bolgeler.TR10.endeks'), null);
  assert.equal(yoldanDeger(s, 'bos'), null);
  assert.equal(yoldanDeger(s, 'metin'), null);
});

test('seriKatalogu: küçük girdiden seri kurar, boş değerleri atlar, tarihe göre sıralar', () => {
  const k = seriKatalogu({
    resmi: {
      enflasyon: {
        kaynak,
        satirlar: [
          { yil: 2026, ay: 2, yillik: 30, aylik: 2 },
          { yil: 2026, ay: 1, yillik: 31, aylik: null },
        ],
      },
      makas: { kaynak, satirlar: [{ tarih: '2026-01-02', ihtiyac: 50, tasit: 40, konut: 30, mevduat: 20 }] },
    },
  });
  const yillik = k.find((s) => s.id === 'enflasyon.yillik');
  assert.deepEqual(yillik.noktalar, [['2026-01-01', 31], ['2026-02-01', 30]]);
  assert.equal(yillik.siklik, 'ay');
  assert.equal(yillik.sayfa, '/veri/enflasyon/');
  assert.deepEqual(yillik.kaynak, kaynak);
  assert.deepEqual(k.find((s) => s.id === 'enflasyon.aylik').noktalar, [['2026-02-01', 2]]);
  assert.equal(k.find((s) => s.id === 'makas.ihtiyac').siklik, 'hafta');
});

test('seriKatalogu: kaynakta bulunmayan bölüm ya da alan seri üretmez', () => {
  assert.deepEqual(seriKatalogu({}), []);
  const k = seriKatalogu({ resmi: { issizlik: { kaynak, satirlar: [{ yil: 2026, ay: 1 }] } } });
  assert.equal(k.length, 0);
});

test('seriKatalogu: politika faizi ay sonu geçerli oran (ayinFaizi), alınma ayına kadar', () => {
  const k = seriKatalogu({
    resmi: {
      faiz: {
        kaynak,
        alinma: '2026-03-10T00:00:00Z',
        gecmis: [
          { tarih: '2026-01-15', oran: 40 },
          { tarih: '2026-02-20', oran: 38 },
        ],
      },
    },
  });
  const f = k.find((s) => s.id === 'faiz.politika');
  assert.deepEqual(f.noktalar, [['2026-01-01', 40], ['2026-02-01', 38], ['2026-03-01', 38]]);
});

test('seriKatalogu: dünya faizleri grafik sütunlarını ülke adıyla seri yapar', () => {
  const k = seriKatalogu({
    ulkeler: ULKELER,
    dunya: {
      kaynaklar: [kaynak],
      grafik: { seriIdleri: ['TUR', 'USA'], noktalar: [[24286, 40, 5.375], [24287, 42.5, null]] },
    },
  });
  const tur = k.find((s) => s.id === 'dunya-faiz.tur');
  assert.equal(tur.ad, 'Politika faizi, Türkiye');
  assert.deepEqual(tur.noktalar, [['2023-11-01', 40], ['2023-12-01', 42.5]]);
  assert.deepEqual(k.find((s) => s.id === 'dunya-faiz.usa').noktalar, [['2023-11-01', 5.375]]);
});

test('tanım tablosu: yinelenen kimlik yok, her tanımın alanı var', () => {
  // Gerçek tablo kimlik çakışması yaratmamalı (seriKatalogu çakışmada hata verir).
  const kimlikler = new Set();
  for (const t of TANIMLAR) for (const a of t.alanlar) kimlikler.add(`${t.idOnek ?? t.bolum}.${a[1]}`);
  assert.ok(kimlikler.size > 50);
  assert.ok(DIGER_TANIMLAR.every((d) => d.onek && d.alanlar.length));
});

test('gerçek veri dosyaları: katalog tutarlı', () => {
  const oku = (ad) => JSON.parse(readFileSync(new URL(`../data/${ad}.json`, import.meta.url), 'utf8'));
  const k = seriKatalogu({
    resmi: oku('resmi'),
    bistTufe: oku('bist-tufe'),
    reelBist: oku('reel-bist'),
    altin: oku('tcmb-altin-kazanci'),
    netPozisyon: oku('tcmb-net-pozisyon-degisimi'),
    swap: oku('tcmb-swap-orani'),
    abdTahvilleri: oku('abd-tahvilleri'),
    abdTahvil: oku('abd-tahvil'),
    ito: oku('ito-enflasyon'),
    dunya: oku('dunya-faizleri'),
    ulkeler: ULKELER,
  });
  assert.ok(k.length > 100);
  const kimlikler = new Set(k.map((s) => s.id));
  assert.equal(kimlikler.size, k.length);
  for (const s of k) {
    assert.match(s.id, /^[a-z0-9.-]+$/, s.id);
    assert.ok(s.ad && s.birim && s.bolum && s.kaynak?.ad && s.sayfa.startsWith('/veri/'), s.id);
    assert.ok(['gun', 'hafta', 'ay', 'ceyrek'].includes(s.siklik), s.id);
    assert.ok(s.noktalar.length > 0, s.id);
    for (let i = 0; i < s.noktalar.length; i++) {
      const [t, v] = s.noktalar[i];
      assert.match(t, /^\d{4}-\d{2}-\d{2}$/, s.id);
      assert.ok(Number.isFinite(v), s.id);
      if (i) assert.ok(s.noktalar[i - 1][0] < t, `${s.id}: tarihler artan olmalı (${t})`);
    }
  }
  // Veri sayfasındaki son değerlerle aynı (resmi.json'daki son satır).
  const resmi = oku('resmi');
  const enf = resmi.enflasyon.satirlar.at(-1);
  assert.deepEqual(k.find((s) => s.id === 'enflasyon.yillik').noktalar.at(-1), [`${enf.yil}-${String(enf.ay).padStart(2, '0')}-01`, enf.yillik]);
  assert.equal(k.find((s) => s.id === 'faiz.politika').noktalar.at(-1)[1], resmi.faiz.oran);
});
