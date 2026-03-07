// 📂 src/ai/utils/utils-merge.ts
// 🔥 YUA-AI UtilsMerge — FINAL (TS5 / Node20)

import { isPlainObject } from "./utils-safe";

export type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

/**
 * 얕은 병합 (우측 우선)
 */
export function shallowMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  override: U
): T & U {
  return { ...base, ...override };
}

/**
 * 깊은 병합 (객체/배열 모두 처리, 우측 우선)
 */
export function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  target: T,
  source: U
): T & U {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const targetValue = result[key];

    if (Array.isArray(value) && Array.isArray(targetValue)) {
      // 배열은 단순 concat (중복 허용)
      result[key] = [...targetValue, ...value];
    } else if (isPlainObject(value) && isPlainObject(targetValue)) {
      // 객체는 재귀 병합
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      // 나머지는 source 우선
      result[key] = value;
    }
  }

  return result as T & U;
}

/**
 * 배열 + 중복 제거
 */
export function mergeArraysUnique<T>(...arrays: T[][]): T[] {
  const set = new Set<T>();
  for (const arr of arrays) {
    for (const item of arr) {
      set.add(item);
    }
  }
  return Array.from(set);
}
