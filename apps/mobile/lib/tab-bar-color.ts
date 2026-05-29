/**
 * tabBarIcon `color` is usually a string, but on web React Navigation can pass
 * a `color` package instance or a null-prototype object. Avoid `String(color)` —
 * it throws "Cannot convert object to primitive value" for the latter.
 */
export function resolveTabBarColor(color: unknown, fallback = '#64748b'): string {
  if (typeof color === 'string') return color;
  if (color != null && typeof color === 'object') {
    const stringFn = (color as { string?: () => string }).string;
    if (typeof stringFn === 'function') {
      try {
        return stringFn.call(color);
      } catch {
        /* fall through */
      }
    }
  }
  return fallback;
}
