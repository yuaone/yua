// 📂 src/stream/latex-utils.ts
export function containsLatex(s: string) {
  return /\\(frac|pm|sqrt|boxed|mathrm|left|right|\$)/.test(s);
}
