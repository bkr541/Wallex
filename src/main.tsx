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

createRoot(document.getElementById('root')!).render(<Root />);
