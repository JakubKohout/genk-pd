import { useEffect, useState } from 'react';

/**
 * Toggle a debug overlay with the `D` key. Ignored while focus is in an input,
 * textarea, or contenteditable — otherwise typing "del perro" in the answer
 * input would flip debug mode mid-word.
 *
 * Lives at module scope only via React state; no persistence on purpose
 * (debug mode is an in-session diagnostic, not a user preference).
 */
export function useGeoDebugMode(): boolean {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'd') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
      }
      setDebug((d) => !d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return debug;
}
