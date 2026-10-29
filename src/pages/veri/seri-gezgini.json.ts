// Seri gezgini kataloğu (/veri/seri-gezgini/ sayfası tarayıcıda bunu yükler): sitenin veri sayfalarındaki bütün
// zaman serileri, derlemede src/data/*.json dosyalarından kurulur (bkz. src/lib/seri-katalogu.mjs).
import { veriKatalogu } from '../../lib/seri-katalogu-veri';

export function GET() {
  return new Response(JSON.stringify(veriKatalogu()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
