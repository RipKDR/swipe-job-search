/**
 * Clipboard utility — writes text to clipboard without expo-clipboard dependency.
 * Uses navigator.clipboard on web, falls back to a temporary textarea trick.
 */

export async function setClipboardAsync(text: string): Promise<void> {
  try {
    // Web: navigator.clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback: create a temporary textarea element
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  } catch {
    // Silently fail — clipboard best-effort
  }
}
