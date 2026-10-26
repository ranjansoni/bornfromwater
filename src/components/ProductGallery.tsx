"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ProductImage } from "@/lib/products";

export function ProductGallery({ name, images, containPrimary = false }: {
  name: string;
  images: ProductImage[];
  containPrimary?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [active, setActive] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [primary, ...rest] = images;

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  function open(index: number) {
    setActive(index);
    dialog.current?.showModal();
    setIsOpen(true);
  }

  function move(direction: number) {
    setActive(current => (current + direction + images.length) % images.length);
  }

  function description(index: number) {
    return `${name} — ${images[index].kind === "graphic" ? "product information" : "view"} ${index + 1}`;
  }

  return (
    <div className="md:rule-r">
      {primary ? (
        <button type="button" onClick={() => open(0)} aria-label={`Enlarge ${description(0)}`}
          aria-haspopup="dialog" className={`rule-b relative block w-full cursor-zoom-in overflow-hidden bg-surface ${
            containPrimary ? "aspect-square md:aspect-auto md:h-[min(70vh,680px)]" : "aspect-square"
          }`}>
          <Image src={primary.src} alt={name} fill priority sizes="(max-width: 768px) 100vw, 50vw"
            className={containPrimary ? "object-contain" : "object-cover"} />
        </button>
      ) : (
        <div className="rule-b flex aspect-square w-full flex-col items-center justify-center gap-3 bg-accent-100 px-6 text-center">
          <span className="text-[11px] tracking-[0.18em] text-accent-700 uppercase">Born From Water · Tide</span>
          <span className="text-[26px] font-extrabold tracking-[-0.02em]">Photography coming soon</span>
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-3">
          {rest.map((img, i) => (
            <button key={img.src} type="button" onClick={() => open(i + 1)}
              aria-label={`Enlarge ${description(i + 1)}`} aria-haspopup="dialog"
              className={`relative aspect-square w-full cursor-zoom-in overflow-hidden bg-surface ${i % 3 !== 0 ? "rule-l" : ""} ${i >= 3 ? "rule-t" : ""}`}>
              <Image src={img.src} alt={description(i + 1)} fill sizes="(max-width: 768px) 33vw, 17vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <dialog ref={dialog} aria-labelledby={titleId}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none flex-col bg-black/95 p-4 text-white backdrop:bg-black/70 open:flex sm:p-6"
        onClose={() => setIsOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}>
        <div className="flex shrink-0 items-center justify-between gap-4 pb-4">
          <h2 id={titleId} className="text-sm font-semibold">{name} — image gallery</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close image viewer"
            className="min-h-11 shrink-0 cursor-pointer border border-white/50 px-4 text-sm hover:bg-white/15">Close ×</button>
        </div>
        {isOpen && images[active] && (
          <div className="flex min-h-0 flex-1 items-center justify-center"
            onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
            <Image key={images[active].src} src={images[active].src} alt={description(active)}
              width={1600} height={2000} sizes="100vw"
              className="h-auto max-h-full w-auto max-w-full object-contain" />
          </div>
        )}
        <div className="flex shrink-0 items-center justify-center gap-6 pt-4">
          <button type="button" onClick={() => move(-1)} disabled={images.length < 2} aria-label="Previous image"
            className="min-h-11 cursor-pointer border border-white/50 px-4 hover:bg-white/15 disabled:opacity-40">← Previous</button>
          <p aria-live="polite" aria-atomic="true" className="text-sm tabular-nums">{active + 1} / {images.length}</p>
          <button type="button" onClick={() => move(1)} disabled={images.length < 2} aria-label="Next image"
            className="min-h-11 cursor-pointer border border-white/50 px-4 hover:bg-white/15 disabled:opacity-40">Next →</button>
        </div>
      </dialog>
    </div>
  );
}
