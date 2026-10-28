import test from 'node:test';
import assert from 'node:assert/strict';
import { belgeAyristir, cumleBol, faizKarari, listedenBelgeler, trTarih, duzMetin } from './ppk-metin.mjs';

const KARAR_HTML = `<html><body><nav>Menü</nav>
<div id="tcmbMainContent"><div class="tcmb-content type-prg">
<p dir="ltr">Sayı: 2026-45</p>
<p dir="ltr" style="text-align: right;">22&nbsp;Ekim 2026</p>
<h2 dir="ltr">Faiz Oranlarına İlişkin Basın Duyurusu</h2>
<h3 dir="ltr">Toplantıya Katılan Kurul Üyeleri</h3>
<p dir="ltr">Ayşe Örnek (Başkan), Ali Veli.</p>
<p dir="ltr">Para Politikası Kurulu (Kurul), politika faizi olan bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir. Kurul ayrıca&nbsp;başka adım atmıştır.</p>
<p dir="ltr">&nbsp;</p>
<p dir="ltr">Kurul, kararlarını <strong>şeffaf</strong> bir çerçevede alacaktır.</p>
</div><div><a target="_blank" href="/x.pdf">PDF</a></div><footer>Altbilgi metni</footer></body></html>`;

const OZET_HTML = `<div class="tcmb-content"><p>Sayı: 2026-42</p><p>17 Eylül 2026</p><h2>Para Politikası Kurulu Toplantı Özeti</h2>
<p>Toplantı Tarihi: 10 Eylül 2026</p><h3>Küresel Ekonomi</h3><p>1.&nbsp; &nbsp; Birinci paragraf burada yer alır.</p><p>2.&nbsp; &nbsp; İkinci paragraf da var.</p>
<h3>Enflasyon</h3><p>3.&nbsp; &nbsp; Üçüncü paragraf.</p></div><div><a target="_blank">x</a></div>`;

test('karar sayfası: menü ve altbilgi yok, başlık, tarih ve üyeler ayrılır', () => {
  const s = belgeAyristir(KARAR_HTML);
  assert.equal(s.sayi, '2026-45');
  assert.equal(s.tarih, '2026-10-22');
  assert.equal(s.baslik, 'Faiz Oranlarına İlişkin Basın Duyurusu');
  assert.equal(s.uyeler, 'Ayşe Örnek (Başkan), Ali Veli.');
  assert.equal(s.paragraflar.length, 2);
  assert.match(s.paragraflar[0], /^Para Politikası Kurulu \(Kurul\)/);
  assert.match(s.paragraflar[0], /ayrıca başka adım/);
  assert.equal(s.paragraflar[1], 'Kurul, kararlarını şeffaf bir çerçevede alacaktır.');
  assert.ok(!s.paragraflar.join(' ').includes('Menü'));
  assert.ok(!s.paragraflar.join(' ').includes('Altbilgi'));
});

test('özet sayfası: numaralar atılır, bölüm ve toplantı tarihi alınır', () => {
  const s = belgeAyristir(OZET_HTML);
  assert.equal(s.toplantiTarihi, '2026-09-10');
  assert.deepEqual(s.paragraflar, ['Birinci paragraf burada yer alır.', 'İkinci paragraf da var.', 'Üçüncü paragraf.']);
  assert.deepEqual(s.bolumler, ['Küresel Ekonomi', 'Küresel Ekonomi', 'Enflasyon']);
});

test('içerik bulunamazsa hata verir', () => {
  assert.throws(() => belgeAyristir('<html><body>boş</body></html>'));
});

test('cümle bölme: yüzde 37’den, vb., sayı içi nokta, Dr. bölünmez', () => {
  assert.deepEqual(cumleBol('Faiz yüzde 37’den yüzde 36’ya indirilmiştir. Kurul izlemektedir.'), ['Faiz yüzde 37’den yüzde 36’ya indirilmiştir.', 'Kurul izlemektedir.']);
  assert.deepEqual(cumleBol('Rezervler 1.250,5 milyon dolar olmuştur. Ardından arttı.'), ['Rezervler 1.250,5 milyon dolar olmuştur.', 'Ardından arttı.']);
  assert.deepEqual(cumleBol('Dr. Ahmet Bey konuştu. Toplantı bitti.'), ['Dr. Ahmet Bey konuştu.', 'Toplantı bitti.']);
  assert.deepEqual(cumleBol('Gıda, enerji vb. kalemler yükselmiştir. Hizmet de arttı.'), ['Gıda, enerji vb. kalemler yükselmiştir.', 'Hizmet de arttı.']);
  assert.deepEqual(cumleBol('Birinci cümle “alıntı yaptı.” İkinci cümle geldi.'), ['Birinci cümle “alıntı yaptı.”', 'İkinci cümle geldi.']);
  assert.deepEqual(cumleBol('Tek cümle'), ['Tek cümle']);
  assert.deepEqual(cumleBol('  '), []);
});

test('faiz kararı: indirim, artış, sabit', () => {
  assert.deepEqual(faizKarari(['Kurul, bir hafta vadeli repo ihale faiz oranının yüzde 37’den yüzde 36’ya indirilmesine karar vermiştir.']), { onceki: 37, yeni: 36, karar: 'indirim' });
  assert.deepEqual(faizKarari(['Kurul, bir hafta vadeli repo ihale faiz oranının yüzde 17,5’ten yüzde 25 düzeyine yükseltilmesine karar vermiştir.']), { onceki: 17.5, yeni: 25, karar: 'artis' });
  assert.deepEqual(faizKarari(['Kurul, bir hafta vadeli repo ihale faiz oranının yüzde 37’de sabit tutulmasına karar vermiştir.']), { onceki: 37, yeni: 37, karar: 'sabit' });
  assert.equal(faizKarari(['İlgisiz cümle.']), null);
});

test('liste: yalnız karar ve özet başlıkları, kredi kartı duyurusu girmez', () => {
  const html = ['Faiz Oranlarına İlişkin Basın Duyurusu (2026-45)', 'Para Politikası Kurulu Toplantı Özeti (2026-42)', 'Kredi Kartı Azami Faiz Oranlarına İlişkin Basın Duyurusu (2026-10)', 'Başka Duyuru (2026-44)']
    .map((b) => `<a class="collection-title" href="/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026/DUY2026-${b.match(/-(\d+)\)/)[1]}" class="type-link" title="${b}">${b}</a>`)
    .join('\n');
  const l = listedenBelgeler(html, 2026);
  assert.deepEqual(l.map((x) => [x.kod, x.tur]), [['2026-45', 'karar'], ['2026-42', 'ozet']]);
  assert.equal(l[0].baslik, 'Faiz Oranlarına İlişkin Basın Duyurusu');
  assert.match(l[0].url, /Basin\/2026\/DUY2026-45$/);
});

test('tarih ve düz metin', () => {
  assert.equal(trTarih('3 Mart 2024'), '2024-03-03');
  assert.equal(trTarih('20&nbsp;Temmuz&nbsp;2023'), '2023-07-20');
  assert.equal(trTarih('Aralık'), null);
  assert.equal(duzMetin('<b>a</b>&nbsp;&amp;&#39;b'), "a &'b");
});
