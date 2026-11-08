// Haber sayfasının okur araçları: yazı boyu, yüksek karşıtlık, okuma modu, yazdır, Dinle, Paylaş menüsü ("Bağlantıyı
// kopyala"), sözcük açıklaması ve "Bu haber işinize yaradı mı?". Tek paketlenmiş betik (CSP satır içi betiğe izin vermez).
// Bütün kayıtlar try/catch içinde: gizli pencerede ya da kayıt engelliyken araçlar çalışır, yalnız hatırlamaz.

import { safeStorage } from '../lib/safe-storage.ts';

const kok = document.documentElement;

const oku = (anahtar: string): string | null => safeStorage.getItem(anahtar);
const yaz = (anahtar: string, deger: string) => safeStorage.setItem(anahtar, deger);


// ——— Yazı boyu ———
const OLCEKLER = ['0', '1', '2', '3'];
function olcekKur(o: string, hatirla: boolean) {
  const deger = OLCEKLER.includes(o) ? o : '1';
  kok.dataset.olcek = deger;
  document.querySelectorAll<HTMLButtonElement>('.ha-arac [data-olcek]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.olcek === deger)));
  if (hatirla) yaz('yazi-boyu', deger);
}
olcekKur(oku('yazi-boyu') ?? '1', false);
document.querySelectorAll<HTMLButtonElement>('.ha-arac [data-olcek]').forEach((b) => b.addEventListener('click', () => olcekKur(b.dataset.olcek ?? '1', true)));

// ——— Yüksek karşıtlık ———
const karsitlikDugme = document.querySelector<HTMLButtonElement>('.ha-arac .karsitlik');
function karsitlik(acik: boolean, hatirla: boolean) {
  kok.classList.toggle('karsitlik', acik);
  karsitlikDugme?.setAttribute('aria-pressed', String(acik));
  if (hatirla) yaz('karsitlik', acik ? '1' : '0');
}
karsitlik(oku('karsitlik') === '1', false);
karsitlikDugme?.addEventListener('click', () => karsitlik(!kok.classList.contains('karsitlik'), true));

// ——— Yazdır ———
document.querySelector('.ha-arac .yazdir')?.addEventListener('click', () => print());

// ——— Okuma modu (Esc ile çıkılır) ———
const okumaDugme = document.querySelector<HTMLButtonElement>('.ha-arac .okuma-modu');
function okumaModu(acik: boolean) {
  if (kok.classList.contains('okuma-modu') === acik) return;
  kok.classList.toggle('okuma-modu', acik);
  okumaDugme?.setAttribute('aria-pressed', String(acik));
  if (acik) {
    document.querySelector('.ha-arac details.aa')?.removeAttribute('open');
    scrollTo({ top: 0 });
  }
}
okumaDugme?.addEventListener('click', () => okumaModu(true));
document.querySelector('.okuma-modundan-cik')?.addEventListener('click', () => okumaModu(false));

// ——— Menüler: aynı anda biri açık; dışarı tıklayınca ve Esc ile kapanır ———
const acikMenuler = () => document.querySelectorAll<HTMLDetailsElement>('.ha-arac details[open]');
document.querySelectorAll<HTMLDetailsElement>('.ha-arac details').forEach((d) =>
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    acikMenuler().forEach((o) => {
      if (o !== d) o.open = false;
    });
  }),
);
document.addEventListener('click', (e) => {
  acikMenuler().forEach((d) => {
    if (!d.contains(e.target as Node)) d.open = false;
  });
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  acikMenuler().forEach((d) => (d.open = false));
  okumaModu(false);
});

// ——— Bağlantıyı kopyala ———
const duyuru = document.querySelector('.ha-duyuru');
document.querySelectorAll<HTMLButtonElement>('.ha-arac .kopyala').forEach((dugme) => {
  if (!navigator.clipboard?.writeText) return;
  dugme.hidden = false;
  const metin = dugme.querySelector('span');
  const ilk = metin?.textContent ?? 'Bağlantıyı kopyala';
  dugme.addEventListener('click', async () => {
    let tamam = true;
    try {
      await navigator.clipboard.writeText(dugme.dataset.url ?? location.href);
    } catch {
      tamam = false;
    }
    if (duyuru) duyuru.textContent = tamam ? 'Bağlantı kopyalandı.' : 'Bağlantı kopyalanamadı.';
    if (metin) {
      metin.textContent = tamam ? 'Kopyalandı' : 'Kopyalanamadı';
      setTimeout(() => (metin.textContent = ilk), 2000);
    }
  });
});

// ——— Dinle (tarayıcının Türkçe sesi). Desteklenmiyorsa düğme gizli kalır ———
const dinle = document.querySelector<HTMLButtonElement>('.ha-arac .dinle');
if (dinle && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
  dinle.hidden = false;
  const etiket = dinle.querySelector('.metin');
  let sesler: SpeechSynthesisVoice[] = [];
  const sesleriAl = () => (sesler = speechSynthesis.getVoices());
  sesleriAl();
  // getVoices() ilk çağrıda çoğu zaman boş; liste voiceschanged ile gelir.
  speechSynthesis.addEventListener?.('voiceschanged', sesleriAl);
  const paragraflar = () =>
    [document.querySelector('.makale-bas h1'), document.querySelector('.makale-spot'), ...document.querySelectorAll('.makale .prose > p, .makale .prose > h2')]
      .map((el) => el?.textContent?.trim() ?? '')
      .filter(Boolean);
  let tur = 0;
  const durum = (caliyor: boolean) => {
    dinle.setAttribute('aria-pressed', String(caliyor));
    dinle.setAttribute('aria-label', caliyor ? 'Okumayı durdur' : 'Haberi dinle');
    if (etiket) etiket.textContent = caliyor ? 'Durdur' : 'Dinle';
  };
  const durdur = () => {
    tur++;
    speechSynthesis.cancel();
    durum(false);
  };
  dinle.addEventListener('click', () => {
    if (dinle.getAttribute('aria-pressed') === 'true') return durdur();
    if (sesler.length === 0) sesleriAl();
    const ses = sesler.find((s) => s.lang?.toLowerCase().startsWith('tr'));
    const bu = ++tur;
    const parcalar = paragraflar();
    if (parcalar.length === 0) return;
    speechSynthesis.cancel();
    // Paragraf paragraf: uzun metinler bazı tarayıcılarda yarıda kesiliyor.
    parcalar.forEach((metin, n) => {
      const s = new SpeechSynthesisUtterance(metin);
      s.lang = 'tr-TR';
      if (ses) s.voice = ses;
      const bitti = () => {
        if (bu === tur && n === parcalar.length - 1) durum(false);
      };
      s.onend = bitti;
      s.onerror = bitti;
      speechSynthesis.speak(s);
    });
    durum(true);
  });
  addEventListener('pagehide', () => speechSynthesis.cancel());
}

// ——— Sözcük açıklaması: metindeki sözlük bağlantısı (a.sozluk-baglanti) tek bir balon açar ———
// Kısa tanımlar /sozluk/kisa.json'dan ilk tıklamada bir kez okunur; okunamazsa bağlantı sözlük sayfasına gider.
// Tanım textContent ile yazılır (HTML olarak değil). Esc, dışarı tıklama, kaydırma ve pencere boyutu değişince kapanır.
{
  let balon: HTMLDivElement | null = null;
  let etkin: HTMLAnchorElement | null = null;
  const KENAR = 12;
  type Kisa = Record<string, { terim: string; tanim: string }>;
  let tanimlar: Promise<Kisa | null> | null = null;
  const tanimlariAl = () =>
    (tanimlar ??= fetch('/sozluk/kisa.json')
      .then((r) => (r.ok ? (r.json() as Promise<Kisa>) : null))
      .catch(() => null));
  const slugOf = (a: HTMLAnchorElement) => /^\/sozluk\/([^/]+)\/$/.exec(new URL(a.href).pathname)?.[1] ?? '';
  const kur = (): HTMLDivElement => {
    if (balon) return balon;
    const b = document.createElement('div');
    b.className = 'ha-balon';
    b.id = 'ha-balon';
    b.setAttribute('role', 'tooltip');
    b.hidden = true;
    document.body.append(b);
    balon = b;
    return b;
  };
  const yerlestir = () => {
    if (!balon || !etkin) return;
    const gen = document.documentElement.clientWidth;
    balon.style.maxWidth = `${Math.min(300, gen - 2 * KENAR)}px`;
    const satirlar = etkin.getClientRects();
    const r = satirlar[satirlar.length - 1] ?? etkin.getBoundingClientRect();
    const sol = Math.max(KENAR, Math.min(r.left, gen - balon.offsetWidth - KENAR));
    balon.style.left = `${Math.round(sol + scrollX)}px`;
    balon.style.top = `${Math.round(r.bottom + scrollY + 8)}px`;
  };
  const kapat = (odak = false) => {
    if (!etkin) return;
    const a = etkin;
    a.setAttribute('aria-expanded', 'false');
    a.removeAttribute('aria-describedby');
    if (balon) balon.hidden = true;
    etkin = null;
    if (odak) a.focus();
  };
  const ac = (a: HTMLAnchorElement, t: { terim: string; tanim: string }) => {
    kapat();
    const b = kur();
    const terim = document.createElement('b');
    terim.textContent = t.terim;
    const tanim = document.createElement('p');
    tanim.textContent = t.tanim;
    const devam = document.createElement('a');
    devam.href = a.href;
    devam.textContent = 'Sözlükte devamı →';
    b.replaceChildren(terim, tanim, devam);
    b.hidden = false;
    etkin = a;
    a.setAttribute('aria-expanded', 'true');
    a.setAttribute('aria-describedby', b.id);
    yerlestir();
  };
  document.querySelectorAll<HTMLAnchorElement>('.prose a.sozluk-baglanti').forEach((a) => a.setAttribute('aria-expanded', 'false'));
  document.addEventListener('click', async (e) => {
    const h = e.target as Element | null;
    const a = h?.closest?.('.prose a.sozluk-baglanti') as HTMLAnchorElement | null;
    if (a) {
      // Değiştirici tuşla tıklama (yeni sekme) bağlantıyı açar.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      if (a === etkin) return kapat();
      const t = (await tanimlariAl())?.[slugOf(a)];
      if (t) ac(a, t);
      else location.href = a.href;
    } else if (etkin && !h?.closest?.('.ha-balon')) kapat();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') kapat(true);
  });
  addEventListener('scroll', () => kapat(), { passive: true });
  addEventListener('resize', () => kapat());
}

// ——— "Bu haber işinize yaradı mı?" (adsız sayaç; tarayıcı başına haber başına bir yanıt) ———
const yararli = document.querySelector<HTMLElement>('.ha-yararli[data-slug]');
if (yararli) {
  const slug = yararli.dataset.slug as string;
  const anahtar = `yararli:${slug}`;
  const dugmeler = yararli.querySelectorAll<HTMLButtonElement>('button[data-yanit]');
  const tesekkur = yararli.querySelector<HTMLElement>('.tesekkur');
  const bitir = () => {
    dugmeler.forEach((b) => {
      b.disabled = true;
      b.hidden = true;
    });
    yararli.querySelector<HTMLElement>('.soru')?.setAttribute('hidden', '');
    if (tesekkur) tesekkur.hidden = false;
  };
  yararli.hidden = false;
  if (oku(anahtar)) bitir();
  else
    dugmeler.forEach((b) =>
      b.addEventListener('click', () => {
        dugmeler.forEach((d) => (d.disabled = true));
        yaz(anahtar, '1');
        fetch('/api/yararli', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug, yanit: b.dataset.yanit }),
          keepalive: true,
        }).catch(() => {});
        bitir();
      }),
    );
}
