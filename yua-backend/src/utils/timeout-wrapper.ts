export async function withTimeout(promise: Promise<any>, ms = 10000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function retry(fn: () => Promise<any>, count = 1) {
  try {
    return await fn();
  } catch (err) {
    if (count <= 0) throw err;
    return retry(fn, count - 1);
  }
}
