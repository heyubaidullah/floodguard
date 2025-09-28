export function stopwatch() { const t = Date.now(); return () => Date.now() - t; }
