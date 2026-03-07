export const Normalizer = {
  utf8(text: string): string {
    return Buffer.from(text, "utf8").toString();
  }
};
