import { motion, useReducedMotion } from 'motion/react';
import { useAppearance } from '../../lib/appearance';

// A flat, bold illustration for linking accounts: a bank on the left, a shield that keeps the data safe in the middle, and
// the Wallex app on the right. Coins travel from the bank, behind the shield, and out to the app, where the list ticks
// itself off. Small chips float around it. While Plaid is open the coins speed up and a ring turns around the shield; once an
// account is linked the checks stay on and a badge pops in.

const C = {
  paper: '#f4f4f1',
  sky: '#a9e4ff',
  skyDeep: '#6cc4f0',
  ink: '#1a2233',
  periwinkle: '#6f86e8',
  periwinkleSoft: '#cfd6f5',
  green: '#3bb273',
  greenLight: '#58cf8f',
  mint: '#b8f2d8',
  yellow: '#ffd84a',
  orange: '#ffa94d',
  orangeDeep: '#f08a24',
};

function Coin({ r = 11 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill={C.orange} stroke={C.orangeDeep} strokeWidth="2" />
      <text y={r * 0.38} textAnchor="middle" fontSize={r * 1.2} fontWeight="700" fill="#fff">$</text>
    </g>
  );
}

function Plus({ x, y, delay = 0, reduce }: { x: number; y: number; delay?: number; reduce: boolean }) {
  return (
    <motion.path
      d={`M${x - 4},${y} H${x + 4} M${x},${y - 4} V${y + 4}`}
      stroke={C.paper}
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity={0.5}
      {...(reduce ? {} : { animate: { opacity: [0.15, 0.7, 0.15] }, transition: { duration: 2.8, repeat: Infinity, delay } })}
    />
  );
}

export default function LinkIllustration({ linked = 0, busy = false, className = '' }: { linked?: number; busy?: boolean; className?: string }) {
  const osReduce = useReducedMotion();
  const appReduce = useAppearance().reduceMotion;
  const reduce = Boolean(osReduce || appReduce);
  const D = busy ? 1.9 : 3.8;
  const done = linked > 0;

  const float = (amp: number, dur: number, delay = 0) =>
    reduce ? {} : { animate: { y: [0, -amp, 0] }, transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const, delay } };

  return (
    <svg viewBox="0 0 960 360" className={`block h-auto w-full ${className}`} role="img" aria-label="Your bank connects to Wallex through Plaid" fill="none">
      {/* Soft backdrop */}
      <circle cx="480" cy="185" r="160" fill="var(--accent)" opacity="0.1" />
      <circle cx="480" cy="185" r="118" fill="var(--accent)" opacity="0.08" />

      <Plus x={28} y={60} reduce={reduce} />
      <Plus x={300} y={330} delay={0.4} reduce={reduce} />
      <Plus x={372} y={52} delay={1.2} reduce={reduce} />
      <Plus x={640} y={40} delay={0.8} reduce={reduce} />
      <Plus x={706} y={318} delay={2} reduce={reduce} />
      <Plus x={932} y={96} delay={1.4} reduce={reduce} />
      <Plus x={918} y={330} delay={1.6} reduce={reduce} />

      {/* The route the coins take */}
      <line x1="168" y1="222" x2="818" y2="222" stroke={C.paper} strokeOpacity="0.28" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />

      {/* Bank */}
      <g transform="translate(40 170)">
      <motion.g {...float(3, 5)}>
        <path d="M-4,40 L60,2 L124,40 Z" fill={C.sky} />
        <rect x="-4" y="40" width="128" height="8" rx="2" fill={C.skyDeep} />
        {[8, 34, 60, 86].map((x) => (
          <rect key={x} x={x} y="52" width="16" height="54" rx="3" fill={C.paper} />
        ))}
        <rect x="-4" y="108" width="128" height="9" rx="2" fill={C.skyDeep} />
        <rect x="-12" y="117" width="144" height="8" rx="2" fill={C.sky} />
        <circle cx="60" cy="24" r="6" fill={C.paper} />
      </motion.g>
      </g>

      {/* Phone: the Wallex app */}
      <g transform="translate(480 0)">
      <motion.g {...float(4, 5.5, 0.6)}>
        <rect x="340" y="104" width="92" height="188" rx="18" fill={C.periwinkle} />
        <rect x="347" y="116" width="78" height="164" rx="11" fill={C.paper} />
        <rect x="357" y="128" width="30" height="6" rx="3" fill={C.periwinkleSoft} />
        {[0, 1, 2].map((i) => {
          const y = 156 + i * 34;
          return (
            <g key={i}>
              <circle cx="365" cy={y} r="9" fill={done ? C.green : C.paper} stroke={done ? C.green : C.periwinkleSoft} strokeWidth="2" />
              <motion.path
                d={`M360.5,${y} l3.4,3.6 l6.4,-7`}
                stroke={done ? '#fff' : C.green}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={false}
                {...(done || reduce
                  ? { animate: { pathLength: 1 } }
                  : { animate: { pathLength: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] }, transition: { duration: D, repeat: Infinity, times: [0, 0.86 + i * 0.035, 0.89 + i * 0.035, 0.985, 1], ease: 'easeOut' } })}
              />
              <rect x="380" y={y - 7} width="34" height="6" rx="3" fill={C.periwinkleSoft} />
              <rect x="380" y={y + 2} width="22" height="5" rx="2.5" fill={C.periwinkleSoft} opacity="0.7" />
            </g>
          );
        })}
        <g transform="translate(436 150)"><Coin r={17} /></g>
        <g transform="translate(436 196)"><Coin r={17} /></g>
      </motion.g>
      </g>

      {/* Coins: bank to shield, then shield to phone */}
      {!reduce && (
        <>
          <motion.g
            initial={{ x: 170, opacity: 0 }}
            animate={{ x: [170, 190, 440, 452, 452], opacity: [0, 1, 1, 0, 0] }}
            transition={{ duration: D, repeat: Infinity, times: [0, 0.08, 0.4, 0.45, 1], ease: 'linear' }}
          >
            <g transform="translate(0 222)"><Coin /></g>
          </motion.g>
          <motion.g
            initial={{ x: 508, opacity: 0 }}
            animate={{ x: [508, 508, 516, 800, 812, 812], opacity: [0, 0, 1, 1, 0, 0] }}
            transition={{ duration: D, repeat: Infinity, times: [0, 0.5, 0.56, 0.86, 0.9, 1], ease: 'linear' }}
          >
            <g transform="translate(0 222)"><Coin /></g>
          </motion.g>
        </>
      )}
      {reduce && <g transform="translate(168 222)"><Coin /></g>}

      {/* Shield */}
      <g transform="translate(240 0)">
      <motion.g
        style={{ transformOrigin: '240px 182px' }}
        {...(reduce ? {} : { animate: { scale: busy ? [1, 1.05, 1] : [1, 1.02, 1] }, transition: { duration: busy ? 0.9 : 3.8, repeat: Infinity, ease: 'easeInOut' } })}
      >
        <path d="M240,92 L302,114 V186 C302,226 272,254 240,268 C208,254 178,226 178,186 V114 Z" fill={C.green} />
        <path d="M240,92 L178,114 V186 C178,226 208,254 240,268 Z" fill={C.greenLight} opacity="0.55" />
        <rect x="222" y="168" width="36" height="30" rx="6" fill="#fff" />
        <path d="M229,168 v-8 a11,11 0 0 1 22,0 v8" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="240" cy="181" r="4" fill={C.green} />
        <rect x="238" y="183" width="4" height="8" rx="2" fill={C.green} />
      </motion.g>
      </g>

      {/* Ring turning while Plaid is open */}
      {busy && !reduce && (
        <g transform="translate(240 0)">
        <motion.circle
          cx="240"
          cy="182"
          r="94"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeDasharray="10 14"
          strokeLinecap="round"
          style={{ transformOrigin: '240px 182px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        </g>
      )}

      {/* Floating chips */}
      <motion.g {...float(5, 4.9, 0.7)}>
        <rect x="236" y="112" width="84" height="54" rx="8" fill={C.periwinkle} />
        <rect x="236" y="124" width="84" height="12" fill={C.ink} opacity="0.35" />
        <rect x="246" y="146" width="30" height="6" rx="3" fill={C.periwinkleSoft} />
        <circle cx="300" cy="150" r="6" fill={C.yellow} />
        <circle cx="308" cy="150" r="6" fill={C.orange} opacity="0.9" />
      </motion.g>
      <motion.g {...float(4, 5.4, 1.1)}>
        <rect x="668" y="236" width="64" height="30" rx="15" fill={C.paper} />
        <circle cx="684" cy="251" r="9" fill={C.orange} />
        <text x="684" y="255" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">$</text>
        <rect x="698" y="246" width="26" height="5" rx="2.5" fill={C.periwinkleSoft} />
        <rect x="698" y="254" width="18" height="4" rx="2" fill={C.periwinkleSoft} opacity="0.7" />
      </motion.g>
      <motion.g {...float(5, 4.4)}>
        <rect x="66" y="62" width="100" height="30" rx="5" fill={C.paper} />
        <path d="M82,80 v-8 l7,-5 l7,5 v8 z" fill={C.yellow} stroke={C.ink} strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="108" y="69" width="16" height="12" rx="2.5" fill={C.yellow} stroke={C.ink} strokeWidth="1.4" />
        <circle cx="146" cy="76" r="6.5" fill={C.yellow} stroke={C.ink} strokeWidth="1.4" />
        <circle cx="146" cy="76" r="2" fill={C.ink} />
      </motion.g>

      <g transform="translate(240 0)">
      <motion.g {...float(4, 5, 0.9)}>
        <rect x="292" y="34" width="46" height="46" rx="7" fill={C.sky} />
        <rect x="304" y="55" width="22" height="16" rx="3" fill={C.ink} />
        <path d="M308,55 v-5 a7,7 0 0 1 14,0 v5" stroke={C.ink} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="315" cy="62.5" r="2" fill={C.sky} />
        {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={354 + c * 11} cy={46 + r * 11} r="2.2" fill={C.sky} opacity="0.85" />))}
      </motion.g>
      </g>

      <motion.g {...float(4, 4.8, 0.3)}>
        <path d="M44,118 h32 v22 c0,12 -9,20 -16,24 c-7,-4 -16,-12 -16,-24 z" fill={C.paper} />
        <path d="M44,118 h16 v46 c-7,-4 -16,-12 -16,-24 z" fill={C.skyDeep} />
        <circle cx="60" cy="140" r="9" fill={C.paper} stroke={C.ink} strokeWidth="1.2" />
        <text x="60" y="143" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.ink}>256</text>
      </motion.g>

      <g transform="translate(480 0)">
      <motion.g {...float(3, 4.2, 1.2)}>
        <rect x="296" y="258" width="52" height="19" rx="3" fill={C.paper} />
        <text x="322" y="272" textAnchor="middle" fontSize="11" fontWeight="600" letterSpacing="1" fill={C.ink}>1234</text>
        <rect x="306" y="281" width="52" height="19" rx="3" fill={C.paper} />
        <text x="332" y="295" textAnchor="middle" fontSize="11" fontWeight="600" letterSpacing="1" fill={C.ink}>5678</text>
      </motion.g>
      </g>

      <g transform="translate(240 0)">
      <motion.g {...float(4, 5.2, 0.5)}>
        <path d="M188,292 h44 v52 l-5.5,-4 l-5.5,4 l-5.5,-4 l-5.5,4 l-5.5,-4 l-5.5,4 l-5.5,-4 l-5,4 z" fill={C.paper} />
        {[302, 312, 322].map((y) => <rect key={y} x="196" y={y} width="28" height="3" rx="1.5" fill={C.periwinkleSoft} />)}
        <rect x="196" y="332" width="16" height="3" rx="1.5" fill={C.periwinkleSoft} />
      </motion.g>
      </g>

      <g transform="translate(480 0)">
      <motion.g {...float(3, 5.6, 1.5)}>
        <path d="M410,300 l22,-14 l22,14 z" fill={C.mint} />
        <rect x="412" y="302" width="40" height="4" rx="1" fill={C.mint} />
        {[414, 425, 437].map((x) => <rect key={x} x={x} y="308" width="6" height="14" rx="1.5" fill={C.mint} />)}
        <rect x="408" y="323" width="48" height="5" rx="1.5" fill={C.mint} />
      </motion.g>
      </g>

      {/* Linked: the badge pops in */}
      <g transform="translate(480 0)">
      <motion.g
        style={{ transformOrigin: '426px 102px' }}
        initial={false}
        animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 16 }}
      >
        <circle cx="426" cy="102" r="19" fill={C.yellow} />
        <path d="M417,102 l6.5,6.5 l12,-13" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      </g>
    </svg>
  );
}
