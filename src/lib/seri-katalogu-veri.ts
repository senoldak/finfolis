// Seri gezgini için kataloğu sitenin veri dosyalarından kurar (derleme anında; sayfa ve JSON uç noktası kullanır).
import resmi from '../data/resmi.json';
import bistTufe from '../data/bist-tufe.json';
import reelBist from '../data/reel-bist.json';
import altin from '../data/tcmb-altin-kazanci.json';
import netPozisyon from '../data/tcmb-net-pozisyon-degisimi.json';
import swap from '../data/tcmb-swap-orani.json';
import abdTahvilleri from '../data/abd-tahvilleri.json';
import abdTahvil from '../data/abd-tahvil.json';
import ito from '../data/ito-enflasyon.json';
import dunya from '../data/dunya-faizleri.json';
import { ULKELER } from './dunya-faizleri.mjs';
import { seriKatalogu } from './seri-katalogu.mjs';

export const SERI_KATALOGU_ADRESI = '/veri/seri-gezgini.json';

export function veriKatalogu() {
  return seriKatalogu({ resmi, bistTufe, reelBist, altin, netPozisyon, swap, abdTahvilleri, abdTahvil, ito, dunya, ulkeler: ULKELER });
}
