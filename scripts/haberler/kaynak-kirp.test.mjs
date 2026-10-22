import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ilgiliKisim } from './kaynak-kirp.mjs';

const dolgu = (n) => Array.from({ length: n }, (_, i) => `Paragraph ${i} discusses general background about markets and institutions in broad terms only.`).join('\n\n');

test('ilgiliKisim: sınırın altındaki kaynak aynen döner', () => {
  const k = 'Kısa kaynak.\n\nİkinci paragraf.';
  assert.equal(ilgiliKisim(k, 'taslak', 20000), k);
});

test('ilgiliKisim: taslaktaki sayı geç paragrafı çeker, açılış kalır, sıra korunur', () => {
  const acilis = 'The Central Bank announced its decision on interest rates.';
  const gec = 'Reserve requirement ratio was set at 1,250 basis points for foreign currency deposits.';
  const k = `${acilis}\n\n${dolgu(300)}\n\n${gec}\n\nClosing remarks.`;
  const out = ilgiliKisim(k, 'Zorunlu karşılık oranı 1.250 baz puan oldu.', 4000);
  assert.ok(out.length <= 4000);
  assert.ok(out.startsWith(acilis));
  assert.ok(out.includes(gec));
  assert.ok(out.includes('[…]'));
  assert.ok(out.indexOf(acilis) < out.indexOf(gec));
});

test('ilgiliKisim: alıntı ve isim örtüşmesi', () => {
  const alinti = 'Governor Karahan said "we will keep a tight stance for longer" at the meeting.';
  const k = `Opening.\n\n${dolgu(200)}\n\n${alinti}\n\n${dolgu(50)}`;
  const out = ilgiliKisim(k, 'Karahan, "we will keep a tight stance for longer" dedi.', 3000);
  assert.ok(out.includes(alinti));
});

test('ilgiliKisim: dev tek paragraf cümlelere bölünür', () => {
  const k = `${'Filler sentence about nothing in particular here. '.repeat(800)}Inflation reached 33,29 percent in September.`;
  const out = ilgiliKisim(k, 'Enflasyon yüzde 33,29 oldu.', 5000);
  assert.ok(out.length <= 5000);
  assert.ok(out.includes('33,29 percent'));
});
