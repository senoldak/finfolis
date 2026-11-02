// Sözcük açıklamasının kısa tanımları (src/lib/sozluk-kisa.mjs); haber sayfasının betiği ilk tıklamada okur.
import { kisaTanimlar } from '../../lib/sozluk-kisa.mjs';

export function GET() {
  return new Response(JSON.stringify(kisaTanimlar()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
