// src/ai/vkr/license-checker.ts

import { VKRSource } from "./types";

const ALLOWED_LICENSES = [
  "MIT",
  "Apache-2.0",
  "CC BY 4.0",
  "BSD",
];

export function isLicenseAllowed(source: VKRSource): boolean {
  return ALLOWED_LICENSES.some(l =>
    source.license?.toUpperCase().includes(l)
  );
}
