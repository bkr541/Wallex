import {createRoot} from 'react-dom/client';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import {useAppearance} from './lib/appearance';
import './index.css';

// Reduce motion forces every animation off; otherwise the system's own setting decides.
function Root() {
  const {reduceMotion} = useAppearance();
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <App />
    </MotionConfig>
  );
}

// Phones: keep the app's height equal to what is visible. With the on-screen keyboard open that is less than the screen, so
// the page resizes instead of being scrolled out of place, and when the keyboard closes the page is put back at the top.
const viewport = window.visualViewport;
if (viewport) {
  const fit = () => document.documentElement.style.setProperty('--vvh', `${Math.round(viewport.height)}px`);
  fit();
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', () => {
    if (viewport.offsetTop !== 0) window.scrollTo(0, 0);
  });
}
document.addEventListener('focusout', () => {
  window.setTimeout(() => {
    if (!document.activeElement || document.activeElement === document.body) window.scrollTo(0, 0);
  }, 60);
});

createRoot(document.getElementById('root')!).render(<Root />);
