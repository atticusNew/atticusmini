import { useEffect, useRef, useState } from 'react';

/**
 * Measures an element's content box and keeps it updated on resize. Lets the
 * chart render in real pixel coordinates (1 viewBox unit = 1px) so nothing
 * gets stretched by SVG aspect scaling.
 */
export const useElementSize = <T extends HTMLElement = HTMLDivElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (w: number, h: number) =>
      setSize(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (!e) return;
      update(Math.round(e.contentRect.width), Math.round(e.contentRect.height));
    });
    ro.observe(el);
    update(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};
