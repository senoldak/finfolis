// Yurtdışı haber beslemeleri. bolge: abd | avrupa | asya | kuresel. ucretli: true ise makale sayfası çekilmez.
// resmi: true yalnızca resmi kurumlar (merkez bankası vb.). Sahibin kuralı (2026-10-11): resmi olmayan haber
// sitelerinin adı ve bağlantısı hiçbir yerde (metin, kaynak listesi, kapak, bülten, Telegram) gösterilmez.
// Resmi olmayan beslemeler repoda açık durmaz; gizli-kaynaklar.sifreli dosyasından okunur (bkz. ../gizli.mjs).
// Resmi beslemeler resmi-beslemeler.mjs dosyasındadır.
import { gizliKaynaklar } from '../gizli.mjs';
import { RESMI_BESLEMELER } from './resmi-beslemeler.mjs';

export { RESMI_BESLEMELER };

const gizli = gizliKaynaklar();
export const BESLEMELER = [...gizli.beslemeler, ...RESMI_BESLEMELER];
// Bağlantı blogları (derleyici.mjs): adayları kendi yazıları değil, bağlantı verdikleri sayfalardır.
export const DERLEYICILER = gizli.derleyiciler;
