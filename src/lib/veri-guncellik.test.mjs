import { test } from 'node:test';
import assert from 'node:assert/strict';
import { donemSonu, metindenTarih, siklikBul, durumHesapla, guncellikListesi } from './veri-guncellik.mjs';

const g = (t) => new Date(`${t}T00:00:00Z`);

test('dönem sonu: tarih biçimleri', () => {
  assert.deepEqual(donemSonu({ tarih: '2026-10-16' }), g('2026-10-16'));
  assert.deepEqual(donemSonu({ tarih: '22-10-2026' }), g('2026-10-22'));
  assert.deepEqual(donemSonu({ tarih: '2026-9' }), g('2026-09-30'));
  assert.deepEqual(donemSonu({ donem: '2026-02' }), g('2026-02-28'));
  assert.deepEqual(donemSonu({ yil: 2026, ay: 12 }), g('2026-12-31'));
  assert.deepEqual(donemSonu({ yil: 2026, ceyrek: 3 }), g('2026-09-30'));
  assert.equal(metindenTarih('dün'), null);
  assert.equal(donemSonu(null), null);
});

test('sıklık satırlardan çıkar', () => {
  assert.equal(siklikBul([{ yil: 2026, ay: 8 }]), 'aylik');
  assert.equal(siklikBul([{ yil: 2026, ceyrek: 2 }]), 'ceyreklik');
  assert.equal(siklikBul([{ tarih: '2026-10-09' }, { tarih: '2026-10-16' }]), 'haftalik');
  assert.equal(siklikBul([{ tarih: '2026-10-26' }, { tarih: '2026-10-27' }]), 'gunluk');
  assert.equal(siklikBul([]), null);
});

test('durum: eşik ve üç katı', () => {
  const bugun = g('2026-10-28');
  assert.deepEqual(durumHesapla({ son: g('2026-08-31'), siklik: 'aylik' }, bugun), { yas: 58, esik: 75, durum: 'guncel' });
  assert.equal(durumHesapla({ son: g('2026-07-31'), siklik: 'aylik' }, bugun).durum, 'gecikmis');
  assert.equal(durumHesapla({ son: g('2026-01-31'), siklik: 'aylik' }, bugun).durum, 'durmus');
  assert.equal(durumHesapla({ son: g('2026-07-31'), siklik: 'aylik', esik: 110 }, bugun).durum, 'guncel');
  assert.equal(durumHesapla({ son: null, siklik: 'aylik' }, bugun).durum, 'bilinmiyor');
});

test('liste: RESMI bölümleri, ayrı dosyalar, sıralama', () => {
  const bugun = g('2026-10-28');
  const liste = guncellikListesi(
    {
      resmi: {
        kur: { tarih: '2026-10-27', kaynak: { ad: 'Kurlar' } },
        issizlik: { kaynak: { ad: 'İşsizlik' }, satirlar: [{ yil: 2026, ay: 3 }] },
        yeniBolum: { kaynak: { ad: 'Yeni' }, satirlar: [{ tarih: '2026-10-09' }, { tarih: '2026-10-16' }] },
        bos: { kaynak: { ad: 'Boş' }, satirlar: [] },
      },
      dosyalar: { 'abd-tahvilleri': { guncelleme: 'x', sonNokta: { tarih: '2026-08-01' } } },
    },
    bugun,
  );
  assert.deepEqual(liste.map((x) => x.id).sort(), ['abd-tahvilleri', 'issizlik', 'kur', 'yeniBolum']);
  assert.equal(liste[0].id, 'issizlik');
  assert.equal(liste[0].durum, 'gecikmis');
  const yeni = liste.find((x) => x.id === 'yeniBolum');
  assert.equal(yeni.siklik, 'haftalik');
  assert.equal(yeni.sayfa, '/veri/');
  const abd = liste.find((x) => x.id === 'abd-tahvilleri');
  assert.equal(abd.siklik, 'aylik');
  assert.equal(abd.ozelEsik, true);
  assert.equal(abd.durum, 'guncel');
  assert.ok(!liste.some((x) => x.id === 'bos'));
});
