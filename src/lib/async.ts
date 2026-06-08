export async function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 650) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } catch (error) {
    console.error("Operacao lenta ou indisponivel", error);
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
