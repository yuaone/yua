declare module "tesseract.js" {
  export function createWorker(lang?: string): Promise<any>;
}
