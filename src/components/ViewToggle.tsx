import { Monitor, Smartphone } from 'lucide-react';
import { setMobileView, useMobileView } from '../lib/viewState';

// The round button in the bottom-right corner that switches between the desktop window and a phone-sized frame.
export default function ViewToggle({ className = 'right-5' }: { className?: string }) {
  const mobile = useMobileView();
  return (
    <button
      type="button"
      onClick={() => setMobileView(!mobile)}
      aria-label={mobile ? 'Switch to desktop view' : 'Switch to mobile view'}
      title={mobile ? 'Switch to desktop view' : 'Switch to mobile view'}
      className={`fixed bottom-5 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-muted shadow-[0_10px_28px_rgba(0,0,0,0.6)] transition-colors hover:bg-surface hover:text-ink ${className}`}
    >
      {mobile ? <Monitor className="h-[18px] w-[18px]" /> : <Smartphone className="h-[18px] w-[18px]" />}
    </button>
  );
}
