import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

// Something that can't be undone. It starts as a quiet red link; clicking it opens a warning card that says
// what will happen and asks for a second click, so nothing is lost by accident.
export default function DestructiveAction({
  heading,
  description,
  trigger,
  title,
  body,
  confirm,
  cancel = 'Keep',
  onConfirm,
  confirmDisabled = false,
  onClose,
  children,
}: {
  heading?: string;
  description?: string;
  trigger: string; // the link, e.g. "Delete account…"
  title: string; // the question on the card
  body: string; // what will happen
  confirm: string; // the red button
  cancel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  onClose?: () => void; // called when the card closes, so extra fields inside it can be cleared
  children?: React.ReactNode; // extra content on the card, such as a "type DELETE" field
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {heading && (
          <div className="min-w-0">
            <p className="text-sm font-medium">{heading}</p>
            {description && <p className="font-support text-sm text-muted">{description}</p>}
          </div>
        )}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
          className="ml-auto cursor-pointer font-support text-sm text-red-300 underline underline-offset-2 transition-colors hover:text-red-200"
        >
          {trigger}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            role="alertdialog"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="mt-4 origin-top rounded-2xl border border-red-400/40 bg-red-400/10 p-4"
          >
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 font-support text-xs text-muted">{body}</p>
            {children && <div className="mt-3">{children}</div>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={confirmDisabled}
                onClick={() => {
                  onConfirm();
                  close();
                }}
                className="cursor-pointer rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {confirm}
              </button>
              <button type="button" onClick={close} className="cursor-pointer rounded-lg px-3 py-1.5 text-sm">
                {cancel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
