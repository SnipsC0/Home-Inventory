import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/I18nContext';

export default function Loading({ animated = false }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    return () => setVisible(false);
  }, []);

  return (
    <>
      <div
        className={`flex flex-col items-center justify-center text-ha-text
        transition-opacity duration-500 ease-in-out
        ${
          animated
            ? 'absolute inset-0 bg-ha-bg/80 backdrop-blur-sm z-[9999]'
            : 'w-full min-h-[calc(100vh-10rem)]'
        }
        ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ color: 'var(--ha-text, currentColor)' }}
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className={`flex flex-col items-center gap-6 ${
            animated ? 'animate-bounce-in' : ''
          }`}
        >
          <svg
            className="loading-logo"
            xmlns="http://www.w3.org/2000/svg"
            width={animated ? 180 : 130}
            height={animated ? 180 : 130}
            viewBox="0 0 200 200"
            fill="none"
            role="img"
            aria-label="Home Inventory"
          >
            <ellipse className="li-shadow" cx="100" cy="182" rx="62" ry="5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
              <path className="li-draw" pathLength="1" d="M26 98 L100 34 L174 98" />
              <path
                className="li-draw"
                pathLength="1"
                d="M44 84 V162 a10 10 0 0 0 10 10 H146 a10 10 0 0 0 10 -10 V84"
              />
              <path className="li-draw li-shelf" pathLength="1" d="M60 122 H140" strokeWidth="5" />
              <path className="li-draw li-shelf" pathLength="1" d="M60 158 H140" strokeWidth="5" />
            </g>
            <g className="li-accent">
              <rect className="li-box" style={{ animationDelay: '0s' }} x="64" y="98" width="20" height="20" rx="4" />
              <rect className="li-box" style={{ animationDelay: '0.12s' }} x="90" y="86" width="22" height="32" rx="4" />
              <rect className="li-box" style={{ animationDelay: '0.24s' }} x="118" y="102" width="18" height="16" rx="4" />
              <rect className="li-box" style={{ animationDelay: '0.36s' }} x="64" y="134" width="30" height="20" rx="4" />
              <rect className="li-box" style={{ animationDelay: '0.48s' }} x="102" y="124" width="18" height="30" rx="4" />
              <rect className="li-box" style={{ animationDelay: '0.6s' }} x="124" y="140" width="12" height="14" rx="4" />
            </g>
          </svg>

          <div className={`font-medium tracking-wide text-ha-text/80 ${
              animated ? 'text-3xl' : 'text-xl'
            }`}>
            {animated ? 'Home Inventory' : t.common.loading}
          </div>
        </div>
      </div>
      <style>{`
        .loading-logo { overflow: visible; }
        .li-accent { fill: var(--primary-color, #03a9f4); }
        .li-draw {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: liDraw 3.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .li-shelf { animation-delay: 0.35s; }
        .li-box {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: 50% 100%;
          animation: liPop 3.6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
        }
        .li-shadow { opacity: 0.12; transform-origin: 100px 182px; animation: liShadow 3.6s ease-in-out infinite; }
        @keyframes liDraw {
          0% { stroke-dashoffset: 1; opacity: 1; }
          40%, 85% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes liPop {
          0%, 38% { opacity: 0; transform: scale(0.3); }
          52% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes liShadow {
          0%, 100% { transform: scaleX(0.7); opacity: 0.06; }
          50% { transform: scaleX(1); opacity: 0.16; }
        }
        @media (prefers-reduced-motion: reduce) {
          .li-draw, .li-box, .li-shadow { animation: none; stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(-25px);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.6) translateY(70px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05) translateY(-10px);
          }
          70% {
            transform: scale(0.97) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out 0;
        }

        .animate-bounce-in {
          animation: bounceIn 1.5s cubic-bezier(0.28, 0.84, 0.42, 1) 1;
        }
      `}</style>
    </>
  );
}
