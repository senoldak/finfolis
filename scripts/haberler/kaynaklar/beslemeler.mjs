// Yurtdışı haber beslemeleri. bolge: abd | avrupa | asya | kuresel. ucretli: true ise makale sayfası çekilmez.
// resmi: true yalnızca resmi kurumlar (merkez bankası vb.). Sahibin kuralı (2026-10-11): resmi olmayan haber
// sitelerinin adı ve bağlantısı hiçbir yerde (metin, kaynak listesi, kapak, bülten, Telegram) gösterilmez.
// Resmi olmayan beslemeler repoda açık durmaz; gizli-kaynaklar.sifreli dosyasından okunur (bkz. ../gizli.mjs).
import { gizliKaynaklar } from '../gizli.mjs';

export const RESMI_BESLEMELER = [
  { ad: 'Bank of England', rss: 'https://www.bankofengland.co.uk/rss/news', bolge: 'avrupa', ucretli: false, kategori: 'ekonomi', onem: 2, resmi: true },
];

export const BESLEMELER = [...gizliKaynaklar().beslemeler, ...RESMI_BESLEMELER];
