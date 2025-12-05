import React, { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  html: string | null;
  onOpenChange: (v: boolean) => void;
  autoPrint?: boolean;
};

export default function Factura({ open, html, onOpenChange, autoPrint }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!open || !html) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      try {
        // focus the iframe before printing
        const w = iframe.contentWindow;
        if (!w) return;
        w.focus();
        if (autoPrint) {
          // small delay to ensure fonts/images loaded
          setTimeout(() => {
            try {
              w.print();
            } catch (err) {
              // ignore
            }
          }, 300);
        }
      } catch (err) {
        // ignore
      }
    };

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [open, html, autoPrint]);

  if (!open || !html) return null;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      title="Factura"
      className="w-full h-[70vh] border"
    />
  );
}
