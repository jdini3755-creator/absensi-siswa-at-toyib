import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';

interface SchoolLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  customLogoUrl?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  size = 56,
  showText = false,
  customLogoUrl,
}) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(customLogoUrl || null);

  useEffect(() => {
    if (customLogoUrl) {
      setLogoSrc(customLogoUrl);
    } else {
      const settings = StorageService.getSettings();
      if (settings.logoBase64) {
        setLogoSrc(settings.logoBase64);
      } else if (settings.logoUrl && !settings.logoUrl.includes('file_000000005df48211a3bd68595e8ebec9')) {
        setLogoSrc(settings.logoUrl);
      } else {
        setLogoSrc(null);
      }
    }
  }, [customLogoUrl]);

  if (logoSrc) {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <img
          src={logoSrc}
          alt="Logo Sekolah"
          style={{ width: size, height: size, objectFit: 'contain' }}
          className="drop-shadow-sm rounded-md"
        />
        {showText && (
          <div className="text-center mt-1.5">
            <span className="block text-xs font-bold tracking-tight text-emerald-950">
              SMP ISLAM AT-TOYIB 45
            </span>
            <span className="block text-[10px] text-emerald-700 font-medium">
              Disiplin • Berilmu • Berakhlak Mulia
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size * 1.15}
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm select-none"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="60" y1="0" x2="60" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#075B36" />
            <stop offset="1" stopColor="#054327" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="60" y1="0" x2="60" y2="140" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FCD34D" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <radialGradient id="starGlow" cx="60" cy="38" r="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF08A" stopOpacity="0.8" />
            <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Shield Border */}
        <path
          d="M60 4C30 4 12 18 12 36C12 85 45 125 60 136C75 125 108 85 108 36C108 18 90 4 60 4Z"
          fill="url(#shieldGrad)"
          stroke="#E5F5EC"
          strokeWidth="3.5"
        />

        {/* Inner Golden Line */}
        <path
          d="M60 10C34 10 18 22 18 38C18 80 48 118 60 128C72 118 102 80 102 38C102 22 86 10 60 10Z"
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="2"
          strokeDasharray="4 2"
        />

        {/* Inner Arch / Mihrab silhouette */}
        <path
          d="M32 95V55C32 40 44 32 60 32C76 32 88 40 88 55V95C78 105 68 112 60 118C52 112 42 105 32 95Z"
          fill="#064E2E"
        />

        {/* Radiant Star */}
        <circle cx="60" cy="40" r="14" fill="url(#starGlow)" />
        <polygon
          points="60,30 63,37 70,37 64,42 66,49 60,45 54,49 56,42 50,37 57,37"
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth="0.8"
        />

        {/* Open Book / Al-Qur'an pages */}
        <path
          d="M38 74C46 71 54 73 60 77C66 73 74 71 82 74V90C74 87 66 89 60 93C54 89 46 87 38 90V74Z"
          fill="#FFFFFF"
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        {/* Book lines / text indication */}
        <line x1="43" y1="78" x2="55" y2="79.5" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />
        <line x1="43" y1="82" x2="55" y2="83.5" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />
        <line x1="43" y1="86" x2="53" y2="87" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />

        <line x1="65" y1="79.5" x2="77" y2="78" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />
        <line x1="65" y1="83.5" x2="77" y2="82" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />
        <line x1="67" y1="87" x2="77" y2="86" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />

        {/* Book Stand (Rehal) */}
        <path
          d="M48 94L60 91L72 94L78 102L72 103L60 97L48 103L42 102L48 94Z"
          fill="#D97706"
        />

        {/* Lower Banner / Text Plaque */}
        <path
          d="M26 112C36 109 48 108 60 108C72 108 84 109 94 112L90 122C80 120 70 119 60 119C50 119 40 120 30 122L26 112Z"
          fill="#078749"
          stroke="#FCD34D"
          strokeWidth="1"
        />
        <text
          x="60"
          y="117.5"
          fill="#FFFFFF"
          fontSize="5.8"
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing="0.4"
          fontFamily="system-ui, sans-serif"
        >
          AT-TOYIB 45
        </text>
      </svg>

      {showText && (
        <div className="text-center mt-1.5">
          <span className="block text-xs font-bold tracking-tight text-emerald-950">
            SMP ISLAM AT-TOYIB 45
          </span>
          <span className="block text-[10px] text-emerald-700 font-medium">
            Disiplin • Berilmu • Berakhlak Mulia
          </span>
        </div>
      )}
    </div>
  );
};
