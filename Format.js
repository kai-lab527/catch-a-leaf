/* Format.js - short money/number labels.  1,000 = 1A | 1,000,000 = 1C | 1e9 = 1E ...
   (A, C, E, G... one letter per x1000, every other letter, to match "thousand = 1A, million = 1C") */
const Fmt = {
  LETTERS: 'ACEGIKMOQSUWY'.split(''),
  short(n) {
    n = Math.floor(Number(n) || 0);
    if (n < 1000) return String(n);
    let v = n, t = 0;
    while (v >= 1000 && t < Fmt.LETTERS.length) { v /= 1000; t++; }
    const p = 10 ** (v >= 100 ? 0 : v >= 10 ? 1 : 2);
    return String(Math.floor(v * p) / p) + Fmt.LETTERS[t - 1];
  }
};