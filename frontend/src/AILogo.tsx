
interface AILogoProps {
  size?: number | string;
  className?: string;
  color?: string;
}

export default function AILogo({ size = 24, className = '', color = 'currentColor' }: AILogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`ai-logo ${className}`}
      style={{ color }}
    >
      {/* Outer Shell */}
      <rect 
        x="4" 
        y="6" 
        width="24" 
        height="20" 
        rx="6" 
        fill="currentColor" 
        fillOpacity="0.05" 
        stroke="currentColor" 
        strokeWidth="2.5" 
      />
      
      {/* Ears */}
      <path 
        d="M1 13v6M31 13v6" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Visor Area */}
      <rect 
        x="8" 
        y="10" 
        width="16" 
        height="7" 
        rx="3.5" 
        fill="var(--text-main, #111827)" 
      />
      
      {/* Glowing Eyes */}
      <circle 
        cx="12.5" 
        cy="13.5" 
        r="1.5" 
        fill="var(--bg-main, #FFFFFF)" 
      />
      <circle 
        cx="19.5" 
        cy="13.5" 
        r="1.5" 
        fill="var(--primary, #6366F1)" 
      />
      
      {/* Mouth */}
      <path 
        d="M14 21h4" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
    </svg>
  );
}
