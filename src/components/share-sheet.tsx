import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Share2, Copy, X, MessageCircle, Send, Twitter, Facebook, Smartphone } from "lucide-react";

export type ShareTarget = { title: string; defaultText: string };

function withLink(text: string, link: string) {
  const filled = text.replace(/\{\{\s*link\s*\}\}/gi, link);
  return filled.includes(link) ? filled : `${filled.trim()} ${link}`.trim();
}

/**
 * Bottom sheet that lets an ambassador tweak the message before sharing it to
 * social apps. The referral link is always appended so attribution is kept.
 */
export function ShareSheet({
  open,
  onClose,
  target,
  referralUrl,
}: {
  open: boolean;
  onClose: () => void;
  target: ShareTarget | null;
  referralUrl: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open && target) setText(withLink(target.defaultText, referralUrl));
  }, [open, target, referralUrl]);

  const message = useMemo(() => withLink(text, referralUrl), [text, referralUrl]);
  const enc = encodeURIComponent(message);
  const encUrl = encodeURIComponent(referralUrl);

  if (!open || !target) return null;

  const channels = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${enc}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encUrl}&text=${enc}` },
    { label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?text=${enc}` },
    { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${enc}` },
  ];

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const ta = document.createElement("textarea");
        ta.value = message;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy — long-press to copy manually.");
    }
  }

  function openChannel(href: string) {
    // Preview/webview environments can block target="_blank"; fall back to a
    // same-tab navigation so sharing always works.
    const win = window.open(href, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = href;
  }

  async function nativeShare() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (!nav.share) return copy();
    try {
      await nav.share({ title: "Co-Research AI", text: message, url: referralUrl });
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-t-3xl border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-elegant)] sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold">Share “{target.title}”</h3>
            <p className="text-xs text-muted-foreground">Edit the message — your referral link stays attached.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl border p-1.5 hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mt-4 w-full resize-none rounded-2xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">Referral link: {referralUrl}</p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-[11px] hover:bg-surface"
            >
              <c.icon className="h-5 w-5 text-primary" />
              {c.label}
            </a>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={copy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm hover:bg-surface">
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            onClick={() => void nativeShare()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            <Smartphone className="h-4 w-4" /> More apps
          </button>
        </div>
      </div>
    </div>
  );
}

export { Share2 };
