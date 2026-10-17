// ink: kategorinin sabit rengi (global.css'teki --ink-* değişkenleri), icon: src/lib/simgeler.js'teki simge.
// Düz JS: hem site hem kapak çizici (scripts/kapak, Node 22) okur.
export const CATEGORIES = /** @type {const} */ ([
  { slug: 'piyasalar', name: 'Piyasalar', ink: 'blue', icon: 'terazi' },
  { slug: 'borsa', name: 'Borsa', ink: 'red', icon: 'fabrika' },
  { slug: 'doviz', name: 'Döviz & Altın', ink: 'ochre', icon: 'kulce' },
  { slug: 'kripto', name: 'Kripto', ink: 'black', icon: 'altigen' },
  { slug: 'ekonomi', name: 'Ekonomi', ink: 'brown', icon: 'insan' },
  { slug: 'kisisel-finans', name: 'Kişisel Finans', ink: 'green', icon: 'cuzdan' },
]);
