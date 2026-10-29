import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yanitDogrula, yarimPuan, donguler, tonAdi, istemKur, normal } from './ppk-ton.mjs';

const belge = {
  id: 'ppk_2026-45',
  tur: 'karar',
  tarih: '2026-10-22',
  baslik: 'Faiz Oranlarına İlişkin Basın Duyurusu (2026-45)',
  paragraflar: [
    'Kurul, politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir.',
    'Adımların büyüklüğü ve zamanlaması enflasyon görünümü odaklı, toplantı bazlı ve ihtiyatlı bir yaklaşımla belirlenecektir.',
  ],
};

test('yarım puan: yuvarlama ve sınır', () => {
  assert.equal(yarimPuan(1.2), 1);
  assert.equal(yarimPuan(1.3), 1.5);
  assert.equal(yarimPuan(-4), -3);
  assert.equal(yarimPuan('x'), null);
});

test('alıntı birebir değilse atılır, hiç kalmazsa red', () => {
  const ok = yanitDogrula(
    {
      ileri_yon: -1.1,
      durus: 2,
      gerekce: 'İndirim ve ihtiyatlı adımlar.',
      alintilar: [
        'yüzde 37\'den yüzde 36\'ya indirilmesine karar vermiştir',
        'faizler hızla düşürülecektir',
      ],
    },
    belge,
  );
  assert.deepEqual(ok, {
    ileriYon: -1,
    durus: 2,
    gerekce: 'İndirim ve ihtiyatlı adımlar.',
    alintilar: ["yüzde 37'den yüzde 36'ya indirilmesine karar vermiştir"],
  });
  assert.equal(yanitDogrula({ ileri_yon: 0, durus: 0, gerekce: 'x', alintilar: ['uydurma cümle burada'] }, belge), null);
  assert.equal(yanitDogrula({ ileri_yon: 0, durus: 0, gerekce: '', alintilar: ['toplantı bazlı ve ihtiyatlı'] }, belge), null);
  assert.equal(yanitDogrula(null, belge), null);
});

test('normal: tırnak ve boşluk', () => {
  assert.equal(normal('  “Yüzde  37’den”. '), '"yüzde 37\'den"'.replace(/^"|"$/g, ''));
});

test('istem metni içerir', () => {
  assert.match(istemKur(belge), /ihtiyatlı bir yaklaşımla/);
  assert.match(istemKur(belge), /PPK karar metni/);
});

test('döngüler: özet önceki karara bağlanır, ortalama', () => {
  const belgeler = [
    { id: 'k1', tur: 'karar', tarih: '2026-09-10' },
    { id: 'o1', tur: 'ozet', tarih: '2026-09-17' },
    { id: 'k2', tur: 'karar', tarih: '2026-10-22' },
    { id: 'o0', tur: 'ozet', tarih: '2026-09-01' }, // ilk karardan önce: döngüsü yok
  ];
  const puanlar = { k1: { ileriYon: 0.5, durus: 2 }, o1: { ileriYon: 1.5, durus: 2.5 }, k2: { ileriYon: -1, durus: 2 } };
  const d = donguler(belgeler, puanlar);
  assert.equal(d.length, 2);
  const { turler, ...ilk } = d[0];
  assert.deepEqual(ilk, { toplanti: '2026-09-10', kararId: 'k1', ozetId: 'o1', ileriYon: 1, durus: 2.25, kararIleriYon: 0.5, ozetIleriYon: 1.5, metin: 2 });
  assert.equal(turler.konusma, null);
  assert.equal(d[1].ozetId, null);
  assert.equal(d[1].ileriYon, -1);
});

test('ton adı', () => {
  assert.equal(tonAdi(2.5), 'şahin');
  assert.equal(tonAdi(1), 'ılımlı şahin');
  assert.equal(tonAdi(0.4), 'dengeli');
  assert.equal(tonAdi(-1), 'ılımlı güvercin');
  assert.equal(tonAdi(-2.5), 'güvercin');
  assert.equal(tonAdi(null), '–');
});

test('döngüler: tür dengeli ortalama, politika içeriği yoksa sayılmaz', () => {
  const belgeler = [
    { id: 'k1', tur: 'karar', tarih: '2026-09-10' },
    { id: 's1', tur: 'konusma', tarih: '2026-09-12' },
    { id: 's2', tur: 'konusma', tarih: '2026-09-20' },
    { id: 's3', tur: 'konusma', tarih: '2026-09-25' },
    { id: 'r1', tur: 'rapor_fir', tarih: '2026-09-30' },
    { id: 'k2', tur: 'karar', tarih: '2026-10-22' },
  ];
  const puanlar = {
    k1: { ileriYon: 1, durus: 2 },
    s1: { ileriYon: -1, durus: 2 },
    s2: { ileriYon: 0, durus: 1 },
    s3: { politikaYok: true, ileriYon: null, durus: null },
    r1: { ileriYon: 2, durus: 3 },
  };
  const d = donguler(belgeler, puanlar);
  // karar 1, konuşmalar ort. −0,5, rapor 2 → (1 − 0,5 + 2) / 3
  assert.equal(d[0].ileriYon, 0.83);
  assert.equal(d[0].metin, 4);
  assert.deepEqual(d[0].turler.konusma, { ileriYon: -0.5, durus: 1.5 });
  assert.equal(d[1].metin, 0);
});

test('politika içeriği yok yanıtı', () => {
  const b = { tur: 'konusma', paragraflar: ['Finansal istikrar görünümü anlatıldı.'] };
  assert.deepEqual(yanitDogrula({ ileri_yon: 0, durus: 0, gerekce: 'Politika yok.', alintilar: [], politika_icerigi: false }, b), {
    politikaYok: true,
    ileriYon: null,
    durus: null,
    gerekce: 'Politika yok.',
    alintilar: [],
  });
});
