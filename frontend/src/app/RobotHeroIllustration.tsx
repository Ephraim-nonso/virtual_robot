export const RobotHeroIllustration = () => (
  <div className="hero-visual" aria-hidden="true">
    <svg viewBox="0 0 520 280" role="img" className="hero-visual-svg">
      <title>Robot control illustration</title>
      <defs>
        <linearGradient id="robotCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5f6fff" />
          <stop offset="100%" stopColor="#2de2e6" />
        </linearGradient>
        <linearGradient id="robotAccent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8cff9c" />
          <stop offset="100%" stopColor="#2de2e6" />
        </linearGradient>
      </defs>

      <g opacity="0.3">
        <circle cx="82" cy="68" r="34" fill="#5f6fff" />
        <circle cx="430" cy="56" r="22" fill="#2de2e6" />
        <circle cx="470" cy="212" r="28" fill="#5f6fff" />
      </g>

      <path
        d="M102 218C140 170 196 140 259 140C322 140 379 170 418 218"
        fill="none"
        stroke="rgba(141,160,201,0.24)"
        strokeWidth="14"
        strokeLinecap="round"
      />

      <path
        d="M154 214C182 179 219 162 260 162C301 162 338 179 366 214"
        fill="none"
        stroke="url(#robotAccent)"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <g transform="translate(154 46)">
        <rect x="46" y="32" width="120" height="104" rx="28" fill="url(#robotCore)" />
        <rect x="68" y="56" width="76" height="42" rx="18" fill="#08111f" opacity="0.95" />
        <circle cx="92" cy="78" r="9" fill="#8cff9c" />
        <circle cx="120" cy="78" r="9" fill="#2de2e6" />
        <rect x="98" y="4" width="16" height="30" rx="8" fill="#7f9ec9" />
        <circle cx="106" cy="0" r="12" fill="#ff7f7f" />
        <rect x="88" y="108" width="36" height="10" rx="5" fill="#8da0c9" opacity="0.8" />
        <path d="M22 78H46" stroke="#7f9ec9" strokeWidth="10" strokeLinecap="round" />
        <path d="M166 78H190" stroke="#7f9ec9" strokeWidth="10" strokeLinecap="round" />
        <path d="M66 136L48 178" stroke="#7f9ec9" strokeWidth="12" strokeLinecap="round" />
        <path d="M146 136L164 178" stroke="#7f9ec9" strokeWidth="12" strokeLinecap="round" />
        <path d="M34 174H72" stroke="#2de2e6" strokeWidth="10" strokeLinecap="round" />
        <path d="M140 174H178" stroke="#2de2e6" strokeWidth="10" strokeLinecap="round" />
      </g>

      <g transform="translate(44 176)">
        <rect x="0" y="0" width="84" height="52" rx="16" fill="#0b1528" stroke="rgba(127,158,201,0.24)" />
        <circle cx="24" cy="20" r="6" fill="#2de2e6" />
        <circle cx="44" cy="20" r="6" fill="#8cff9c" />
        <path d="M18 34H66" stroke="#7f9ec9" strokeWidth="6" strokeLinecap="round" />
      </g>

      <g transform="translate(392 170)">
        <rect x="0" y="0" width="84" height="58" rx="18" fill="#0b1528" stroke="rgba(127,158,201,0.24)" />
        <path d="M18 20H66" stroke="#2de2e6" strokeWidth="8" strokeLinecap="round" />
        <path d="M18 34H54" stroke="#5f6fff" strokeWidth="8" strokeLinecap="round" />
        <path d="M18 48H44" stroke="#8cff9c" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  </div>
);
