import test from 'node:test';
import assert from 'node:assert/strict';
import { duzeltmeKayitlari, notMetni, notTarihi } from './duzeltmeler.mjs';

const yedek = new Date('2026-10-01T00:00:00Z');

test('notTarihi: baştaki gg.aa.yyyy tarihi okunur, yoksa yedek', () => {
  assert.equal(notTarihi('20.10.2026: Tutar düzeltildi.', yedek).toISOString().slice(0, 10), '2026-10-20');
  assert.equal(notTarihi('19.10.2026 14:00: Tutar düzeltildi.', yedek).toISOString().slice(0, 10), '2026-10-19');
  assert.equal(notTarihi('Tutar düzeltildi, tarihsiz.', yedek), yedek);
});

test('notMetni: baştaki tarih atılır', () => {
  assert.equal(notMetni('20.10.2026: Tutar düzeltildi.'), 'Tutar düzeltildi.');
  assert.equal(notMetni('Tarihsiz not metni.'), 'Tarihsiz not metni.');
});

test('duzeltmeKayitlari: iki kaynak birleşir, yeniden eskiye sıralanır, notsuz haber atlanır', () => {
  const haberler = [
    { id: 'a', data: { title: 'A', date: new Date('2026-10-10T00:00:00Z'), duzeltme: '18.10.2026: Rakam düzeltildi.' } },
    { id: 'b', data: { title: 'B', date: new Date('2026-10-11T00:00:00Z') } },
  ];
  const kaldirilan = [{ tarih: '2026-10-20', ilkYayin: '2026-10-13', neden: 'Kaldırıldı.' }];
  const k = duzeltmeKayitlari(haberler, kaldirilan);
  assert.equal(k.length, 2);
  assert.equal(k[0].tur, 'kaldirildi');
  assert.equal(k[0].baslik, null);
  assert.equal(k[1].tur, 'duzeltme');
  assert.equal(k[1].href, '/haber/a/');
  assert.equal(k[1].metin, 'Rakam düzeltildi.');
});

test('duzeltmeKayitlari: kayıt yoksa boş dizi', () => {
  assert.deepEqual(duzeltmeKayitlari([], []), []);
});
