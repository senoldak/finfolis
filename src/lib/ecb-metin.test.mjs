import test from 'node:test';
import assert from 'node:assert/strict';
import { enTarih, hesapToplantiTarihi, yilParcalari, listeAyristir, belgeTuru, adresTarihi, kararAyristir, aciklamaAyristir, hesapAyristir, ecbKarari } from './ecb-metin.mjs';

const sayfa = (govde, baslik = 'Monetary policy decisions') =>
  `<html><body><main >\n<div class="title"><ul><li>PRESS RELEASE</li></ul><h1>${baslik}</h1></div><div class="section">${govde}</div>\n<div class="related-topics"><h4>Related topics</h4></div></main></body></html>`;

test('enTarih ve hesapToplantiTarihi: toplantının son günü', () => {
  assert.equal(enTarih('10 September 2026 '), '2026-09-10');
  assert.equal(enTarih('Nonsense'), null);
  assert.equal(hesapToplantiTarihi('Meeting of 26-27 July 2023'), '2023-07-27');
  assert.equal(hesapToplantiTarihi('Meeting of 17-18 December 2025'), '2025-12-18');
  assert.equal(hesapToplantiTarihi('Meeting of 29 April-1 May 2026'), '2026-05-01');
  assert.equal(hesapToplantiTarihi('Meeting of 30 January 2025'), '2025-01-30');
  assert.equal(hesapToplantiTarihi('Başka başlık'), null);
});

test('yilParcalari: data-snippets göreli adresleri mutlak yapar', () => {
  const h = `<dl data-snippets='../2026/html/index_include.en.html,../2025/html/index_include.en.html'></dl>`;
  assert.deepEqual(yilParcalari(h, 'https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html'), [
    { yil: 2026, url: 'https://www.ecb.europa.eu/press/govcdec/mopo/2026/html/index_include.en.html' },
    { yil: 2025, url: 'https://www.ecb.europa.eu/press/govcdec/mopo/2025/html/index_include.en.html' },
  ]);
  assert.deepEqual(yilParcalari('<p>yok</p>', 'https://x/'), []);
});

test('listeAyristir: iç içe "Related" kayıtlar dahil, sorgu dizisi atılır, tekilleştirilir', () => {
  const h =
    `<dt isoDate="2026-09-10"><div class="date">10 September 2026</div></dt><dd><div class="title"><a href="/press/pr/date/2026/html/ecb.mp260910~314e508016.en.html"  >Monetary policy decisions</a></div>` +
    `<div class='accordion'><dl><dt isoDate="2026-09-10"><div class="date">10 September 2026</div></dt><dd><div class="title"><a href="/press/x/ecb.ds260910~fbf0ab9b8d.en.pdf?abc"  >Combined monetary policy decisions and statement</a></div></dd></dl></div></dd>` +
    `<dt isoDate="2026-10-08"><div class="date">8 October 2026</div></dt><dd><div class="title"><a href="/press/accounts/2026/html/ecb.mg261008~a10153d090.en.html?x=1"  >Meeting of 9-10 September 2026</a></div></dd>` +
    `<dt isoDate="2026-09-10"><div class="date">10 September 2026</div></dt><dd><div class="title"><a href="/press/pr/date/2026/html/ecb.mp260910~314e508016.en.html"  >Monetary policy decisions</a></div></dd>`;
  const l = listeAyristir(h);
  assert.equal(l.length, 3);
  assert.deepEqual(l.map((k) => belgeTuru(k.url)), ['karar', null, 'hesap']);
  assert.equal(l[2].url, 'https://www.ecb.europa.eu/press/accounts/2026/html/ecb.mg261008~a10153d090.en.html');
  assert.equal(adresTarihi(l[0].url), '2026-09-10');
  assert.equal(belgeTuru('https://www.ecb.europa.eu/press/press_conference/monetary-policy-statement/2026/html/ecb.is260910~6a45359cfc.en.html'), 'aciklama');
  assert.equal(belgeTuru('https://www.ecb.europa.eu/press/pr/date/2025/html/ecb.pr250313~9d160bc6e2.en.html'), null);
});

test("kararAyristir: ayraç, tarih ve basın toplantısı satırı atılır; ara başlıklar bolumler'e gider", () => {
  const h = sayfa(
    '<p class="ecb-publicationDate">10 September 2026 </p><p>The Governing Council today decided to raise the three key ECB interest rates by 25&nbsp;basis points.</p><p>The baseline sees inflation at 3.0% in 2026.</p><p>The outlook remains uncertain.</p>' +
      '<h2>Key ECB interest rates</h2><p>The interest rates on the deposit facility, the main refinancing operations and the marginal lending facility will be increased to 2.50%, 2.65% and 2.90% respectively.</p><p>***</p><p>The President of the ECB will comment on the considerations underlying these decisions at a press conference starting at 14:45 CET today.</p>',
  );
  const k = kararAyristir(h);
  assert.equal(k.tarih, '2026-09-10');
  assert.equal(k.paragraflar.length, 4);
  assert.equal(k.paragraflar[0], 'The Governing Council today decided to raise the three key ECB interest rates by 25 basis points.');
  assert.deepEqual(k.bolumler, ['', '', '', 'Key ECB interest rates']);
  assert.throws(() => kararAyristir('<html></html>'));
});

test('aciklamaAyristir: yalnız giriş konuşması; soru-cevap, karşılama ve yer-tarih satırı alınmaz', () => {
  const p = (n) => `<p>Paragraph number ${n} of the introductory statement.</p>`;
  const h = sayfa(
    '<h2>Christine Lagarde, President of the ECB,<br>Boris Vujčić, Vice-President of the ECB</h2><p>Berlin, 10 September 2026</p><a href="#qa">Jump</a>' +
      '<p>Good afternoon, the Vice-President and I welcome you to our press conference.</p>' +
      p(1) + p(2) + '<h2>Inflation</h2>' + p(3) + p(4) + p(5) +
      '<p>The decisions taken today are set out in a <a href="/x">press release</a> available on our website.</p><p>We are now ready to take your questions.</p><p>* * *<a id="qa"></a></p><p><strong>Question?</strong></p><p>Answer.</p>',
    'PRESS CONFERENCE',
  );
  const a = aciklamaAyristir(h);
  assert.equal(a.tarih, '2026-09-10');
  assert.equal(a.paragraflar.length, 5);
  assert.deepEqual(a.bolumler, ['', '', 'Inflation', 'Inflation', 'Inflation']);
  assert.ok(!a.paragraflar.some((s) => /Good afternoon|Answer|press release/.test(s)));
});

test('hesapAyristir: bölüm adı en alttaki başlıktır, numara atılır, dördüncü düzey başlıkta (katılımcılar) biter', () => {
  const p = (n) => `<p>Members discussed point ${n}.</p>`;
  let govde = '<h2>Account of the monetary policy meeting of the Governing Council of the European Central Bank held in Berlin on Wednesday and Thursday, 9-10 September 2026</h2><p>8 October 2026</p>';
  govde += '<h2>1. Review of financial developments</h2><h3>Financial market developments</h3>' + p(1) + p(2) + p(3) + p(4);
  govde += '<h3>Monetary policy considerations and policy options</h3>' + p(5) + p(6) + p(7);
  govde += '<h2>2. Discussion and monetary policy decisions</h2><h3>Monetary policy decisions and communication</h3>' + p(8) + p(9) + p(10);
  govde += '<h4>Members</h4><ul><li>Ms Lagarde, President</li></ul>';
  const s = hesapAyristir(sayfa(govde, 'Meeting of 9-10 September 2026'));
  assert.equal(s.tarih, '2026-10-08');
  assert.equal(s.aralik, '9-10 September 2026');
  assert.equal(s.paragraflar.length, 10);
  assert.equal(s.bolumler[0], 'Financial market developments');
  assert.equal(s.bolumler[4], 'Monetary policy considerations and policy options');
  assert.equal(s.bolumler[9], 'Monetary policy decisions and communication');
  assert.ok(!s.paragraflar.some((x) => /Lagarde/.test(x)));
});

test('ecbKarari: artış, indirim, sabit; kolaylık sırası cümleden okunur', () => {
  assert.deepEqual(
    ecbKarari(['Accordingly, the interest rates on the deposit facility, the main refinancing operations and the marginal lending facility will be increased to 2.50%, 2.65% and 2.90% respectively, with effect from 16 September 2026.']),
    { mevduat: 2.5, mro: 2.65, mlf: 2.9, yon: 'artis' },
  );
  assert.deepEqual(
    ecbKarari(['The interest rate on the main refinancing operations and the interest rates on the marginal lending facility and the deposit facility will be increased to 3.00%, 3.25% and 2.50% respectively.']),
    { mevduat: 2.5, mro: 3, mlf: 3.25, yon: 'artis' },
  );
  assert.deepEqual(
    ecbKarari(['The interest rates on the deposit facility, the main refinancing operations and the marginal lending facility will be decreased to 2.00%, 2.15% and 2.40% respectively.']),
    { mevduat: 2, mro: 2.15, mlf: 2.4, yon: 'indirim' },
  );
  assert.deepEqual(
    ecbKarari(['The interest rates on the deposit facility, the main refinancing operations and the marginal lending facility will remain unchanged at 2.00%, 2.15% and 2.40% respectively.']),
    { mevduat: 2, mro: 2.15, mlf: 2.4, yon: 'sabit' },
  );
  assert.deepEqual(
    ecbKarari(['The interest rate on the main refinancing operations and the interest rates on the marginal lending facility and the deposit facility will remain unchanged at 4.50%, 4.75% and 4.00% respectively.']),
    { mevduat: 4, mro: 4.5, mlf: 4.75, yon: 'sabit' },
  );
});

test('ecbKarari: Eylül 2024 kalıbı (mevduat ayrı cümle) ve okunamayan metin', () => {
  const c = ['Accordingly, the deposit facility rate will be decreased to 3.50%.', 'The interest rates on the main refinancing operations and the marginal lending facility will be decreased to 3.65% and 3.90% respectively.'];
  assert.deepEqual(ecbKarari(c), { mevduat: 3.5, mro: 3.65, mlf: 3.9, yon: 'indirim' });
  assert.equal(ecbKarari(['No rates here.']), null);
});
