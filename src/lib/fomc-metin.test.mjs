import test from 'node:test';
import assert from 'node:assert/strict';
import { cumleBol, fedKarari, oranSayisi, oyOzeti, enTarih, takvimdenToplantilar, aciklamaAyristir, tutanakAyristir } from './fomc-metin.mjs';

test('cumleBol: U.S., Jr., e.g., i.e., Mr., Ms. ve baş harfler bölünmez', () => {
  assert.deepEqual(cumleBol('The U.S. Treasury yields rose. Equity prices fell.'), ['The U.S. Treasury yields rose.', 'Equity prices fell.']);
  assert.deepEqual(cumleBol('Thomas D. Tallarini, Jr. Smith spoke. Ms. Jones agreed with Mr. Brown.'), ['Thomas D. Tallarini, Jr. Smith spoke.', 'Ms. Jones agreed with Mr. Brown.']);
  assert.deepEqual(cumleBol('Some measures (e.g. Treasury yields) rose, i.e. markets repriced. Then they fell.'), ['Some measures (e.g. Treasury yields) rose, i.e. markets repriced.', 'Then they fell.']);
  assert.deepEqual(cumleBol('Michael S. Barr voted for the action.'), ['Michael S. Barr voted for the action.']);
});

test('cumleBol: "U.S." cümleyi bitirebilir; "percent." sonrası sayı, ondalık ve kesir bölünmez', () => {
  assert.deepEqual(cumleBol('Growth slowed in the U.S. The Committee noted this.'), ['Growth slowed in the U.S.', 'The Committee noted this.']);
  assert.deepEqual(cumleBol('Rates stayed at 3.75 percent. 2 more members agreed. The range is 1-3/4 to 2 percent.'), ['Rates stayed at 3.75 percent. 2 more members agreed.', 'The range is 1-3/4 to 2 percent.']);
  assert.deepEqual(cumleBol('The meeting ended at 2:00 p.m. EDT on Wednesday. Next came the vote.'), ['The meeting ended at 2:00 p.m. EDT on Wednesday.', 'Next came the vote.']);
});

test('cumleBol: tırnak içi cümle sonu ve boş metin', () => {
  assert.deepEqual(cumleBol('He said "prices rose." The staff agreed.'), ['He said "prices rose."', 'The staff agreed.']);
  assert.deepEqual(cumleBol('  '), []);
  assert.deepEqual(cumleBol('Tek cümle'), ['Tek cümle']);
});

test('oranSayisi: kesir, karma sayı, ondalık', () => {
  assert.equal(oranSayisi('3-3/4'), 3.75);
  assert.equal(oranSayisi('1/4'), 0.25);
  assert.equal(oranSayisi('4'), 4);
  assert.equal(oranSayisi('5.5'), 5.5);
  assert.ok(Number.isNaN(oranSayisi('abc')));
});

test('fedKarari: sabit, indirim ve artış; kesirli aralıklar', () => {
  assert.deepEqual(fedKarari(["The Committee decided to maintain the target range for the federal funds rate at 3-3/4 to 4 percent, in support of the Federal Reserve's dual mandate."]), { alt: 3.75, ust: 4, yon: 'sabit' });
  assert.deepEqual(fedKarari('the Committee decided to lower the target range for the federal funds rate by 1/4 percentage point to 4 to 4-1/4 percent.'), { alt: 4, ust: 4.25, yon: 'indirim' });
  assert.deepEqual(fedKarari('the Committee decided to raise the target range for the federal funds rate to 4-1/2 to 4-3/4 percent.'), { alt: 4.5, ust: 4.75, yon: 'artis' });
  assert.deepEqual(fedKarari('decided to lower the target range for the federal funds rate by 1/2 percentage point to 4-3/4 to 5 percent'), { alt: 4.75, ust: 5, yon: 'indirim' });
  assert.deepEqual(fedKarari('decided to maintain the target range for the federal funds rate at 0 to 1/4 percent'), { alt: 0, ust: 0.25, yon: 'sabit' });
  assert.equal(fedKarari('Inflation remains elevated.'), null);
});

test('oyOzeti: sayım, muhalefet ve oy listesi', () => {
  assert.deepEqual(oyOzeti('The Federal Open Market Committee approved the following statement for release by a 9 – 3 vote.'), { lehte: 9, karsi: 3, muhalefet: true });
  assert.deepEqual(oyOzeti('The Federal Open Market Committee approved the following statement for release by a 12 – 0 vote.'), { lehte: 12, karsi: 0, muhalefet: false });
  assert.equal(oyOzeti('Voting for the monetary policy action were A; B. Voting against this action was C, who preferred to lower.').muhalefet, true);
  assert.equal(oyOzeti('Voting for the monetary policy action were A; B.').muhalefet, false);
  assert.equal(oyOzeti(undefined).muhalefet, false);
});

test('enTarih', () => {
  assert.equal(enTarih('September 16, 2026'), '2026-09-16');
  assert.equal(enTarih('Released April 12, 2023'), '2023-04-12');
  assert.equal(enTarih('metin'), null);
});

const TAKVIM = `<div class="fomc-meeting--shaded row fomc-meeting" ">
<div class="fomc-meeting__date">21-22*</div><strong>Statement:</strong><br>
<a href="/monetarypolicy/files/monetary20230322a1.pdf">PDF</a> | <a href="/newsevents/pressreleases/monetary20230322a.htm">HTML</a><br>
<a href="/newsevents/pressreleases/monetary20230322a1.htm">Implementation Note</a>
<strong>Minutes:</strong><br><a href="/monetarypolicy/fomcminutes20230322.htm">HTML</a><br> (Released April 12, 2023)
</div>
<div class="row fomc-meeting" ">
<div class="fomc-meeting__date">2-3</div><strong>Statement:</strong><br>
<a href="/newsevents/pressreleases/monetary20230503a.htm">HTML</a>
</div>
<div class="row fomc-meeting" "><strong>Minutes:</strong> yok</div>`;

test('takvimdenToplantilar: açıklama ve tutanak bağlantıları sayfadan alınır; yayımlanmamış tutanak null', () => {
  const t = takvimdenToplantilar(TAKVIM);
  assert.equal(t.length, 2);
  assert.equal(t[0].toplantiTarihi, '2023-03-22');
  assert.equal(t[0].aciklama.url, 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20230322a.htm');
  assert.deepEqual(t[0].tutanak, { url: 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20230322.htm', yayim: '2023-04-12' });
  assert.equal(t[1].toplantiTarihi, '2023-05-03');
  assert.equal(t[1].tutanak, null);
});

const ACIKLAMA_HTML = `<html><nav>Menü</nav><div id="article"><div class="heading"><p class="article__time">September 16, 2026</p>
<h3 class="title">Federal Reserve issues FOMC statement</h3><ul><li><a href="x">Share</a></li></ul></div>
<div class="col-xs-12 col-sm-4 col-md-4 hidden-sm"></div><div>
<p>The Federal Open Market Committee approved the following statement for release by a 9&nbsp;&ndash; 3 vote:</p>
<p>The Committee decided to raise the target range for the federal funds rate by 1/4 percentage point<strong> </strong>to 3&#8209;3/4<strong> </strong>to 4 percent. Another sentence.</p>
<p>Inflation remains elevated.</p>
<p><strong>Voting for this action:</strong> A, B.</p>
<p>Voting against this action: C, who preferred to hold.</p>
<p>For media inquiries, please email <a href="/cdn">x</a>.</p>
<p><a href="/newsevents/pressreleases/monetary20260916a1.htm">Implementation Note issued September 16, 2026</a></p>
</div></div><div id="lastUpdate">Last Update</div></html>`;

test('aciklamaAyristir: gövde ile oy cümlesi ayrılır, altbilgi atılır, kesir tiresi düzeltilir', () => {
  const s = aciklamaAyristir(ACIKLAMA_HTML);
  assert.equal(s.tarih, '2026-09-16');
  assert.equal(s.baslik, 'Federal Reserve issues FOMC statement');
  assert.equal(s.paragraflar.length, 2);
  assert.match(s.paragraflar[0], /to 3-3\/4 to 4 percent/);
  assert.equal(s.paragraflar[1], 'Inflation remains elevated.');
  assert.equal(s.oyCumlesi, 'Voting for this action: A, B. Voting against this action: C, who preferred to hold.');
  assert.ok(!JSON.stringify(s).includes('media inquiries'));
  assert.ok(!JSON.stringify(s).includes('Implementation Note'));
});

test('aciklamaAyristir: oy listesi yoksa "N – M vote" cümlesi oyCumlesi olur', () => {
  const s = aciklamaAyristir(ACIKLAMA_HTML.replace(/<p><strong>Voting for[^\n]*\n<p>Voting against[^\n]*\n/, ''));
  assert.equal(s.oyCumlesi, 'The Federal Open Market Committee approved the following statement for release by a 9 – 3 vote.');
  assert.deepEqual(fedKarari(s.paragraflar), { alt: 3.75, ust: 4, yon: 'artis' });
});

test('aciklamaAyristir: içerik yoksa hata', () => {
  assert.throws(() => aciklamaAyristir('<html>boş</html>'), /bulunamadı/);
});

const govde = (n) => Array.from({ length: n }, (_, i) => `<p>Paragraph number ${i} has some words.</p>`).join('\n');
const TUTANAK_YENI = `<div id="article"><h3>Minutes of the Federal Open Market Committee</h3>
<p><strong>July 28–29, 2026</strong><br />
A joint meeting was held.<a href="#fn1"><sup>1</sup></a><a name="f1"></a></p>
<p><strong>Developments in Financial Markets</strong><br />
The manager began by noting something.</p>${govde(10)}
<p><strong>Participants' Views on Current Conditions</strong><br />
Participants acknowledged things.</p>
<p>Vote:</p><blockquote><p>"Effective July 30, the Committee directs the Desk to:</p><ul><li>Undertake operations.</li></ul></blockquote>
<p><strong>Notation Vote</strong><br />By notation vote the minutes were approved.</p>
<p><strong>Attendance</strong><br />Kevin A, Chairman<br />Jane B</p>
<p>_______________________</p><hr /><p>1. Footnote. Return to text</p></div><div id="lastUpdate">x</div>`;

const TUTANAK_ESKI = `<div id="article"><h3>Minutes of the Federal Open Market Committee</h3>
<p><strong>March 21–22, 2023</strong></p>
<p>A joint meeting was held.</p>
<p><strong>Attendance </strong><br />Jerome H. Powell, Chair<br />John C. Williams</p>
<p>Thomas I. Barkin, Alternate Members of the Committee</p>
<p><strong>Developments in Financial Markets</strong><br />The manager turned first to a review.</p>${govde(10)}
<p><strong>Notation Vote</strong><br />x</p></div>`;

test('tutanakAyristir: yeni biçim — bölümler paragraflarla aynı uzunlukta, katılımcı ve dipnotlar yok, dipnot numarası atılır', () => {
  const s = tutanakAyristir(TUTANAK_YENI);
  assert.equal(s.aralik, 'July 28–29, 2026');
  assert.equal(s.bolumler.length, s.paragraflar.length);
  assert.equal(s.paragraflar[0], 'A joint meeting was held.');
  assert.equal(s.bolumler[0], '');
  assert.equal(s.bolumler[1], 'Developments in Financial Markets');
  assert.equal(s.bolumler.at(-1), "Participants' Views on Current Conditions");
  assert.ok(s.paragraflar.some((p) => p.startsWith('"Effective July 30')));
  assert.ok(s.paragraflar.includes('Undertake operations.'));
  const hepsi = s.paragraflar.join(' ');
  assert.ok(!/Notation|Attendance|Kevin A|Footnote/.test(hepsi));
  assert.ok(!/held\.1/.test(hepsi));
});

test('tutanakAyristir: eski biçim — tarih ayrı satırda, katılımcı listesi başta atlanır', () => {
  const s = tutanakAyristir(TUTANAK_ESKI);
  assert.equal(s.aralik, 'March 21–22, 2023');
  assert.equal(s.paragraflar[0], 'A joint meeting was held.');
  assert.ok(!s.paragraflar.join(' ').match(/Powell|Barkin/));
  assert.equal(s.bolumler[1], 'Developments in Financial Markets');
  assert.equal(s.bolumler.length, s.paragraflar.length);
});
