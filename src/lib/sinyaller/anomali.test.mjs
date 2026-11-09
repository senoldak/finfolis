import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zSkorHesapla,
  seriAnomaliTara,
  anomaliFisleriUret
} from './anomali.mjs';

test('zSkorHesapla: ortalama, standart sapma ve z-skorunu doğru hesaplar', () => {
  // 10 haftalık seri: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] -> std=0
  assert.equal(zSkorHesapla(10, [10, 10, 10]), 0);

  // Seri: [10, 12, 14, 16, 18] -> ort=14, std ~ 2.8284
  // Yeni değer: 20 -> z = (20 - 14) / 2.8284 = 2.12
  const z = zSkorHesapla(20, [10, 12, 14, 16, 18]);
  assert.ok(z > 2.0 && z < 2.2);
});

test('seriAnomaliTara: 2 sigma üzerindeki değerleri anomali olarak yakalar', () => {
  // Normal giden 12 hafta, ardından ani sıçrama
  const noktalar = [
    { tarih: '2026-01-02', deger: 100 },
    { tarih: '2026-01-09', deger: 102 },
    { tarih: '2026-01-16', deger: 98 },
    { tarih: '2026-01-23', deger: 101 },
    { tarih: '2026-01-30', deger: 99 },
    { tarih: '2026-02-06', deger: 100 },
    { tarih: '2026-02-13', deger: 103 },
    { tarih: '2026-02-20', deger: 97 },
    { tarih: '2026-02-27', deger: 101 },
    { tarih: '2026-03-06', deger: 100 },
    { tarih: '2026-03-13', deger: 102 },
    { tarih: '2026-03-20', deger: 99 },
    // 13. hafta anomali:
    { tarih: '2026-03-27', deger: 120 }
  ];

  const anomaliler = seriAnomaliTara(noktalar, {
    pencere: 12,
    esikSigma: 2.0
  });

  assert.equal(anomaliler.length, 1);
  assert.equal(anomaliler[0].tarih, '2026-03-27');
  assert.equal(anomaliler[0].yon, 'yukari');
  assert.ok(anomaliler[0].zSkor > 3.0); // 120 çok büyük bir sapma -> ekstrem
  assert.equal(anomaliler[0].seviye, 'ekstrem');
});

test('seriAnomaliTara: 2 sigma altındaki normal dalgalanmaları anomali saymaz', () => {
  const noktalar = Array.from({ length: 20 }, (_, i) => ({
    tarih: `2026-01-${String(i + 1).padStart(2, '0')}`,
    deger: 50 + (i % 2 === 0 ? 1 : -1)
  }));

  const anomaliler = seriAnomaliTara(noktalar, { pencere: 12, esikSigma: 2.0 });
  assert.equal(anomaliler.length, 0);
});

test('anomaliFisleriUret: resmi veri sözlüğünden öncü serileri tarar ve fiş üretir', () => {
  const sahteResmi = {
    portfoyHaftalik: {
      satirlar: [
        ...Array.from({ length: 14 }, (_, i) => ({
          tarih: `2026-0${Math.floor(i / 4) + 1}-${String((i % 4) * 7 + 1).padStart(2, '0')}`,
          dibs: 50 + (i % 2 === 0 ? 10 : -10),
          hisse: 20 + (i % 2 === 0 ? 5 : -5)
        })),
        // Son hafta ekstrem çıkış
        { tarih: '2026-04-20', dibs: -500, hisse: -200 }
      ]
    }
  };

  const fisler = anomaliFisleriUret(sahteResmi);
  assert.ok(fisler.length >= 1);
  const dibsFisi = fisler.find((f) => f.gostergeKodu === 'yabanciDibs');
  assert.ok(dibsFisi);
  assert.equal(dibsFisi.yon, 'asagi');
  assert.equal(dibsFisi.tarih, '2026-04-20');
});
