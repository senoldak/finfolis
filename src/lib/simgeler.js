// Sitenin simge seti: Isotype geleneğinde düz, tek renkli siluetler (24×24 kutu).
// Hem site (Pictograms.astro) hem kapak çizici (scripts/kapak) bu dosyayı kullanır.
// Her simge bir path listesidir; evenodd: true olanlar delikli çizilir, soluk: değer o path'in opaklığıdır.

/** @type {Record<string, { d: string; evenodd?: boolean; soluk?: number }[]>} */
export const SIMGELER = {
  lira: [
    { d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z', evenodd: true },
    {
      d: 'M10.4 7.5h1.8v2.3l2.6-1v1.6l-2.6 1v1.2l2.6-1v1.6l-2.6 1v2.1c1.4-.2 2.3-1 2.5-2.4h1.6c-.2 2.4-2 4-4.6 4.1h-1.3v-3.2l-1.5.6v-1.6l1.5-.6v-1.2l-1.5.6V11l1.5-.6Z',
    },
  ],
  sepet: [
    { d: 'M6.6 9.5 9.9 3.4l1.6.9-2.8 5.2Zm10.8 0-3.3-6.1-1.6.9 2.8 5.2Z' },
    { d: 'M1.5 9.5h21v3h-1.3l-2 9H4.8l-2-9H1.5Zm6 4.5v5h1.8v-5Zm3.6 0v5h1.8v-5Zm3.6 0v5h1.8v-5Z', evenodd: true },
  ],
  kulce: [{ d: 'M6.5 6h11l2 5h-15Z' }, { d: 'M3.8 12.5h16.4l2.3 6H1.5Z' }],
  fabrika: [{ d: 'M2 21V11l5 3v-3l5 3v-3l5 3V3h3.5v18Z' }],
  banka: [{ d: 'M12 1.8 22 7v2H2V7Zm-8 8.7h3v7.5H4Zm6.5 0h3v7.5h-3Zm6.5 0h3v7.5h-3ZM2 19h20v3H2Z' }],
  varil: [{ d: 'M5 2h14v20H5Zm0 5.2v1.6h14V7.2Zm0 8v1.6h14v-1.6Z', evenodd: true }],
  terazi: [
    { d: 'M11 4.5h2V19h4v2.5H7V19h4ZM3.5 6h17v1.8h-17Z' },
    { d: 'M6 7.8 9.3 14H2.7Zm12 0L21.3 14h-6.6Z', soluk: 0.55 },
    { d: 'M2.4 14.6h7.2a3.6 3.6 0 0 1-7.2 0Zm12 0h7.2a3.6 3.6 0 0 1-7.2 0Z' },
  ],
  altigen: [{ d: 'm12 1.5 9.1 5.2v10.6L12 22.5l-9.1-5.2V6.7Zm0 5L7.2 9.2v5.6L12 17.5l4.8-2.7V9.2Z', evenodd: true }],
  insan: [{ d: 'M14.7 4.2a2.7 2.7 0 1 1-5.4 0 2.7 2.7 0 0 1 5.4 0Z' }, { d: 'M7.6 8h8.8l-.9 7.6h-1.4V22h-4.2v-6.4H8.5Z' }],
  cuzdan: [{ d: 'M3 5.5h14.5V9H21v11.5H3Zm11.5 6.5v4H21v-4Zm1.8 1.2h1.8V15h-1.8Z', evenodd: true }],
};

// Değişim işaretleri (12×12 kutu).
export const ISARETLER = {
  yukari: 'M6 2 11 10H1Z',
  asagi: 'M6 10 1 2h10Z',
  sabit: 'M1 5h10v2H1Z',
};
