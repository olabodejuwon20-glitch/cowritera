import { useEffect, useState } from "react";
import { X, MessageSquare } from "lucide-react";

// Show popup only for real user exports (not the sample/demo)
const SHOW_ON_SAMPLES = false;
const WHATSAPP_LINK = "https://wa.link/vg9fhh";

export default function FinalizePopup() {
  const [visible, setVisible] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: any) {
      try {
        const detail = e?.detail ?? {};
        const { isSample, filename: fn } = detail as { isSample?: boolean; filename?: string };
        if (!SHOW_ON_SAMPLES && isSample) return;
        setFilename(fn ?? null);
        setVisible(true);
      } catch (err) {
        // ignore
        // eslint-disable-next-line no-console
        console.warn("finalize-popup handler error", err);
      }
    }
    window.addEventListener("cowritera:exportFinished", handler as EventListener);
    return () => window.removeEventListener("cowritera:exportFinished", handler as EventListener);
  }, []);

  if (!visible) return null;

  const onClose = () => setVisible(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(filename ?? "");
      setVisible(false);
    } catch (err) {
      // ignore
      // eslint-disable-next-line no-console
      console.warn("copy failed", err);
    }
  };

  const message = `Hi — I’ve just finished my Co-Research project and exported \"${filename ?? "project"}\". I’d like to share it with you.`;
  const waHref = `${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="max-w-lg w-full bg-background rounded-2xl shadow-lg border border-muted-foreground/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Finalize your project</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your export is ready. You can message me on WhatsApp to send the project.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-full p-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Exported file</div>
          <div className="mt-2 flex items-center justify-between rounded-md bg-muted-foreground/5 px-3 py-2">
            <div className="text-sm text-foreground truncate">{filename}</div>
            <div className="ml-3 text-xs text-muted-foreground">{new Date().toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 font-medium hover:brightness-95"
            onClick={() => setVisible(false)}
          >
            <MessageSquare className="h-4 w-4" />
            Message on WhatsApp
          </a>

          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-primary-soft"
          >
            Copy file name
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-primary-soft"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
