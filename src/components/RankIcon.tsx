import React from 'react';

type RankProps = {
  role: string;
  className?: string;
};

// SVG Helpers
const PraçaShield = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 80 90" className="w-full h-full drop-shadow-md">
    <path d="M 5,30 L 40,5 L 75,30 L 75,75 C 75,75 40,90 40,90 C 40,90 5,75 5,75 Z" fill="#2b2d31" stroke="#1e1f22" strokeWidth="3" />
    {children}
  </svg>
);

const Epaulette = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 70 110" className="w-full h-full drop-shadow-md">
    <rect x="5" y="5" width="60" height="100" fill="#2b2d31" stroke="#1e1f22" strokeWidth="3" rx="4" />
    {children}
  </svg>
);

const GoldStar = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x}, ${y}) scale(0.18)`}>
    <circle cx="100" cy="100" r="45" fill="#1d4ed8" stroke="#ef4444" strokeWidth="10" />
    <polygon points="100,10 120,70 190,70 135,110 155,180 100,140 45,180 65,110 10,70 80,70" fill="#fbbf24" />
  </g>
);

const SilverStar = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x}, ${y}) scale(0.18)`}>
    <circle cx="100" cy="100" r="45" fill="#1d4ed8" stroke="#ef4444" strokeWidth="10" />
    <polygon points="100,10 120,70 190,70 135,110 155,180 100,140 45,180 65,110 10,70 80,70" fill="#e2e8f0" />
  </g>
);

const SimpleStar = ({ x, y, color }: { x: number; y: number, color: string }) => (
  <polygon points="100,10 120,70 190,70 135,110 155,180 100,140 45,180 65,110 10,70 80,70" fill={color} transform={`translate(${x}, ${y}) scale(0.18)`} />
);

const Chevron = ({ y }: { y: number }) => (
  <path d={`M 20,${y} L 40,${y - 15} L 60,${y} L 60,${y + 10} L 40,${y - 5} L 20,${y + 10} Z`} fill="#fbbf24" />
);

export const RankIcon: React.FC<RankProps> = ({ role, className = "w-8 h-8" }) => {
  // Guard against undefined/null roles
  const safeRole = role || '';
  // Normalize old roles
  const normalizedRole = safeRole.replace('1-soldado', 'soldado').replace('2-soldado', 'aluno');

  const renderIcon = () => {
    switch (normalizedRole) {
      // PRAÇAS
      case 'aluno':
        return (
          <PraçaShield>
            <SimpleStar x={22} y={15} color="#fbbf24" />
          </PraçaShield>
        );
      case 'soldado':
        return (
          <PraçaShield>
            <Chevron y={40} />
          </PraçaShield>
        );
      case 'cabo':
        return (
          <PraçaShield>
            <Chevron y={32} />
            <Chevron y={44} />
          </PraçaShield>
        );
      case '3-sargento':
        return (
          <PraçaShield>
            <Chevron y={24} />
            <Chevron y={36} />
            <Chevron y={48} />
          </PraçaShield>
        );
      case '2-sargento':
        return (
          <PraçaShield>
            <Chevron y={16} />
            <Chevron y={28} />
            <Chevron y={40} />
            <Chevron y={52} />
          </PraçaShield>
        );
      case '1-sargento':
        return (
          <PraçaShield>
            <Chevron y={8} />
            <Chevron y={20} />
            <Chevron y={32} />
            <Chevron y={44} />
            <Chevron y={56} />
          </PraçaShield>
        );
      
      // PRAÇAS ESPECIAIS
      case 'subtenente':
        return (
          <Epaulette>
            <polygon points="25,35 45,65 25,65" fill="none" stroke="#fbbf24" strokeWidth="4" />
          </Epaulette>
        );
      case 'aspirante':
        return (
          <Epaulette>
            <SimpleStar x={17} y={35} color="#e2e8f0" />
          </Epaulette>
        );

      // OFICIAIS SUBALTERNOS
      case '2-tenente':
        return (
          <Epaulette>
            <SilverStar x={17} y={35} />
          </Epaulette>
        );
      case '1-tenente':
        return (
          <Epaulette>
            <SilverStar x={17} y={20} />
            <SilverStar x={17} y={50} />
          </Epaulette>
        );

      // OFICIAIS INTERMEDIÁRIOS
      case 'capitao':
        return (
          <Epaulette>
            <SilverStar x={17} y={10} />
            <SilverStar x={17} y={35} />
            <SilverStar x={17} y={60} />
          </Epaulette>
        );

      // OFICIAIS SUPERIORES
      case 'major':
        return (
          <Epaulette>
            <GoldStar x={17} y={10} />
            <SilverStar x={17} y={35} />
            <SilverStar x={17} y={60} />
          </Epaulette>
        );
      case 'tenente-coronel':
        return (
          <Epaulette>
            <GoldStar x={17} y={10} />
            <GoldStar x={17} y={35} />
            <SilverStar x={17} y={60} />
          </Epaulette>
        );
      case 'coronel':
        return (
          <Epaulette>
            <GoldStar x={17} y={10} />
            <GoldStar x={17} y={35} />
            <GoldStar x={17} y={60} />
          </Epaulette>
        );

      default:
        // Fallback for unknown
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full opacity-30">
            <rect x="5" y="5" width="30" height="30" fill="#2b2d31" rx="5" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {renderIcon()}
    </div>
  );
};
