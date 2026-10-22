import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ayniOlay, iz, adlar, rakamlar, tekrarBul, hafizayaEkle, hafizaTohumla, tekrarlariAyikla, TEKRAR_SAAT } from './tekrar.mjs';

const simdi = new Date('2026-10-14T12:00:00Z');
const aday = (baslik, ozet = '') => ({ id: `x:${baslik}`, baslik, ozet });
const olay = (id, ...adaylar) => ({ id, baslik: adaylar[0].baslik, onem: 60, adaylar });
const kayit = (slug, adaylar, saatOnce = 5) => ({
  slug,
  baslik: adaylar[0].baslik,
  kaynaklar: adaylar.map(({ baslik, ozet }) => ({ baslik, ozet })),
  zaman: new Date(simdi.getTime() - saatOnce * 3600e3).toISOString(),
});
const ayni = (a, b) => ayniOlay(iz(a), iz(b));

// Gerçek kopyalar (12-14.10.2026'da ayrı ayrı yayımlandılar)
test('aynı olayın farklı kaynaklardaki başlıkları eşleşir', () => {
  assert.ok(ayni(aday('IonQ to buy cybersecurity firm Elisity in up to $1.3 billion deal'), aday('IonQ to acquire cybersecurity firm Elisity in an all-stock deal for up to $1.3 billion')));
  assert.ok(ayni(aday('Hackers heat French supermarket fridges, sparking fires and food losses'), aday('Hackers heat French supermarket fridges, sparking fires and spoiling food')));
  assert.ok(ayni(aday('Amazon in talks to buy AI startup Decart for around $7 billion, report says'), aday('Amazon in talks to buy AI start-up Decart for around US$7 billion: Report')));
  assert.ok(
    ayni(
      aday('Treasury fines Bank of America $1.2 billion over money laundering failures', 'The U.S. Treasury fined Bank of America for failing to report suspicious transactions.'),
      aday('Bank of America to pay $1.2 billion to settle money laundering, sanctions violations', 'Regulators said Bank of America failed to report suspicious transactions worth billions.'),
    ),
  );
});

test('şablon başlıklar ve ortak adlı farklı olaylar eşleşmez', () => {
  assert.equal(ayni(aday("EA Series Trust yeni ETF/fon için SEC'e 485APOS başvurusu yaptı"), aday("Harbor ETF Trust yeni ETF/fon için SEC'e 485APOS başvurusu yaptı")), null);
  assert.equal(ayni(aday('Indonesia stocks lower at close of trade; IDX Composite Index down 2.47%'), aday('Indonesia stocks lower at close of trade; IDX Composite Index down 0.54%')), null);
  assert.equal(ayni(aday('Joyy stock hits 52-week high at 82.63 USD'), aday('CeriBell Inc stock hits 52-week high at 26.66 USD')), null);
  assert.equal(
    ayni(
      aday('Bank of America is set to report third-quarter earnings', 'The U.S. Treasury Department announced a $1.2 billion penalty against Bank of America on Tuesday.'),
      aday('Bank of America adds a profit miss to the misery of a $1.2 billion government fine', 'Bank of America’s stock falls as investor disappointment over the $1.2 billion government fine added to the earnings report.'),
    ),
    null,
  );
  assert.equal(ayni(aday('Oil falls after Trump declares energy ceasefire between Russia and Ukraine'), aday('Burnham wants to repair bridges between Trump and Zelenskyy')), null);
});

test('adlar: cümle düzenindeki metinden çok kelimeli adlar, genel adlar hariç', () => {
  const a = adlar('Regulators said Bank of America and Hyundai Motor Group met in the United States with the Fed.');
  assert.ok(a.has('bank of america'));
  assert.ok(a.has('hyundai motor group'));
  assert.ok(!a.has('fed'));
  assert.ok(!a.has('regulators')); // cümle başı
  assert.equal(adlar('Amazon In Talks To Buy AI Startup Decart').size, 0); // Her Kelimesi Büyük başlık
});

test('rakamlar: birimli sayılar, yıllar ve küçük birimsiz sayılar hariç', () => {
  assert.deepEqual([...rakamlar('a $1.2 billion fine in 2026, 3 days, 36.3% rise')].sort(), ['1.2 billion', '36.3 %']);
});

test('tekrarBul: 72 saat içindeki yayınla eşleşir, daha eskiyle eşleşmez', () => {
  const e = aday('IonQ to buy cybersecurity firm Elisity in up to $1.3 billion deal');
  const o = olay('y', aday('IonQ to acquire cybersecurity firm Elisity in an all-stock deal for up to $1.3 billion'));
  assert.deepEqual(tekrarBul(o, [kayit('ionq-elisity', [e])], simdi), { slug: 'ionq-elisity', neden: 'başlık' });
  assert.equal(tekrarBul(o, [kayit('ionq-elisity', [e], TEKRAR_SAAT + 1)], simdi), null);
});

test('hafizayaEkle: yazılan olaylar eklenir, süresi dolanlar atılır, aynı slug iki kez girmez', () => {
  const eski = kayit('eski', [aday('Old')], TEKRAR_SAAT + 2);
  const taze = kayit('taze', [aday('Fresh')], 2);
  const yazilan = [{ ...olay('a', aday('New story', 'x'.repeat(500))), haberSlug: 'yeni' }, { ...olay('b', aday('Fresh')), haberSlug: 'taze' }, olay('c', aday('Yazılmadı'))];
  const h = hafizayaEkle([eski, taze], yazilan, simdi);
  assert.deepEqual(h.map((x) => x.slug), ['taze', 'yeni']);
  assert.equal(h[1].kaynaklar[0].ozet.length, 300);
  assert.equal(h[1].zaman, simdi.toISOString());
});

test('tekrarlariAyikla: hafızadakiyle ve aynı çalıştırmadaki kopyayla eşleşen çıkarılır', () => {
  const liste = [
    olay('fr2', aday('Hackers heat French supermarket fridges, sparking fires and spoiling food')),
    { ...olay('ionq2', aday('IonQ to acquire cybersecurity firm Elisity in an all-stock deal for up to $1.3 billion')), onem: 80 },
    { ...olay('ionq3', aday('IonQ to buy cybersecurity firm Elisity in up to $1.3 billion deal')), onem: 40 },
    olay('baska', aday('Copper prices climb on supply worries')),
  ];
  const hafiza = [kayit('fransa', [aday('Hackers heat French supermarket fridges, sparking fires and food losses')])];
  const cikan = tekrarlariAyikla(liste, hafiza, simdi);
  assert.deepEqual(cikan.map((c) => [c.olay.id, c.slug]).sort(), [['fr2', 'fransa'], ['ionq3', 'ionq2']]);
  assert.deepEqual(liste.map((o) => o.id), ['ionq2', 'baska']);
});

async function icerik(yazilar) {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'tekrar-'));
  for (const [slug, on] of Object.entries(yazilar)) {
    await mkdir(path.join(rot, 'src/content/haberler', slug), { recursive: true });
    const satirlar = Object.entries(on).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
    await writeFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), `---\n${satirlar.join('\n')}\n---\n\nGövde.\n`);
  }
  return rot;
}

test('hafizaTohumla: son 72 saatin yayımlanmış haberleri; bülten, taslak ve eski yazı alınmaz', async () => {
  const saatOnce = (n) => new Date(simdi.getTime() - n * 3600e3).toISOString();
  const rot = await icerik({
    'bofa-ceza': { title: "Bank of America'ya kara para aklama cezası", description: "Bakanlık, Bank of America'ya 1,2 milyar dolar ceza kesti.", date: saatOnce(20), tur: 'haber' },
    eski: { title: 'Eski haber', description: 's', date: saatOnce(TEKRAR_SAAT + 5), tur: 'haber' },
    'bulten-1': { title: 'Piyasa bülteni', description: 's', date: saatOnce(2), tur: 'bulten' },
    taslak: { title: 'Taslak', description: 's', date: saatOnce(2), tur: 'haber', draft: true },
  });
  const h = await hafizaTohumla(rot, simdi);
  assert.deepEqual(h.map((x) => x.slug), ['bofa-ceza']);
  assert.equal(h[0].baslik, "Bank of America'ya kara para aklama cezası");
  assert.equal(h[0].tohum, true);
  assert.equal(h[0].zaman, saatOnce(20));
  assert.deepEqual(await hafizaTohumla(path.join(rot, 'yok'), simdi), []);

  // İngilizce kaynak adayı Türkçe tohum kaydıyla ortak ad + birimli rakamdan eşleşir; başka olay eşleşmez.
  const ayniOlayAday = olay('y', aday('Bank of America to pay $1.2 billion to settle laundering case', 'Regulators said Bank of America must pay $1.2 billion.'));
  assert.equal(tekrarBul(ayniOlayAday, h, simdi)?.slug, 'bofa-ceza');
  const baska = olay('z', aday('Copper prices climb', 'Copper rose 2% on Monday as Chile supply worries grew.'));
  assert.equal(tekrarBul(baska, h, simdi), null);
});

test('rakamlar: Türkçe biçim İngilizceyle aynı anahtara çevrilir', () => {
  assert.deepEqual([...rakamlar('yüzde 3,1 büyüme ve 1,2 milyar dolar')].sort(), ['1.2 billion', '3.1 %']);
  assert.deepEqual([...rakamlar('growth of 3.1% and $1.2 billion')].sort(), ['1.2 billion', '3.1 %']);
});

// 21-22.10.2026: Meta'nın üçüncü çeyrek bilançosu dört ayrı haber oldu (sonuç, kâr, "hisse yükseldi", "değer kaybetti").
test('aynı şirketin bilançosu 48 saat içinde farklı başlık ve rakamla gelse de tekrar sayılır', () => {
  const ilk = kayit('meta-gelir', [aday('Meta Q3 revenue rises 26% to $64.6 billion as AI spending climbs', 'Meta Platforms reported third-quarter revenue of $64.60 billion.')], 20);
  const adaylar = [
    aday('Meta shares jump after-hours as AI agent Muse draws investor interest', 'Shares of Meta rose more than 4% in extended trading after the company reported earnings.'),
    aday('Meta stock falls as free cash flow turns negative', 'Meta shares fell 6% Thursday after the third-quarter results showed higher capital spending.'),
  ];
  for (const a of adaylar) assert.deepEqual(tekrarBul(olay('m', a), [ilk], simdi), { slug: 'meta-gelir', neden: 'şirket+olay' });
  // Türkçe tohum kaydı da İngilizce adayı yakalar.
  const tohum = { ...kayit('meta-tr', [aday('Meta üçüncü çeyrekte gelirini artırdı', 'Meta Platforms, üçüncü çeyrekte geliri yüzde 26 artırdı.')], 20), tohum: true };
  assert.equal(tekrarBul(olay('m', adaylar[1]), [tohum], simdi)?.slug, 'meta-tr');
});

test('şirket+olay kuralı: 48 saati geçen, başka şirket ya da başka türdeki haber tekrar sayılmaz', () => {
  const a = aday('Meta stock falls as free cash flow turns negative', 'Meta shares fell 6% after the third-quarter results.');
  const bilanco = [aday('Meta Q3 revenue rises 26%', 'Meta Platforms reported third-quarter revenue.')];
  assert.equal(tekrarBul(olay('m', a), [kayit('eski', bilanco, 60)], simdi), null); // 72 saat içinde ama 48'i geçti
  assert.equal(tekrarBul(olay('m', aday('Tesla stock falls after quarterly results', 'Tesla shares fell 5% after earnings.')), [kayit('meta', bilanco, 5)], simdi), null);
  assert.equal(tekrarBul(olay('m', aday('Meta unveils new AI model Muse Wonder', 'Meta launched Muse Wonder for its assistants.')), [kayit('meta', bilanco, 5)], simdi), null);
  // Başka şirketin bilançosu özette Meta'yı ansa da tekrar sayılmaz (şirket yalnız başlıktan okunur).
  assert.equal(tekrarBul(olay('m', aday('Alphabet beats quarterly estimates on cloud growth', 'Alphabet outpaced rivals Meta and Microsoft in third-quarter results.')), [kayit('meta', bilanco, 5)], simdi), null);
  // Başlığı "Stocks"/"Shares" ile başlayan iki farklı şirketin bilançosu şirket anahtarı sayılmaz.
  assert.equal(tekrarBul(olay('m', aday('Stocks slide after Nike earnings', 'Nike shares fell.')), [kayit('x', [aday('Stocks rise after Tesla earnings', 'Tesla shares rose.')], 5)], simdi), null);
});
