// A simple line-art pinecone — the namesake of "אצטרובל" (itztrubal = pinecone).
// Used sparingly: header mark, success states, and the PDF watermark.
// Rounded body tapering to a point, with a diamond-scale pattern that
// narrows toward the tip — reads as a pinecone at both small and large sizes.

interface PineconeMarkProps {
  className?: string;
  strokeWidth?: number;
  color?: string;
}

export function PineconeMark({
  className = "h-8 w-8",
  strokeWidth = 1.6,
  color = "currentColor",
}: PineconeMarkProps) {
  return (
    <svg
      viewBox="0 0 48 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M24 1V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d="M24 6 C33 7 39 16 39 27 C39 40 35 51 24 60 C13 51 9 40 9 27 C9 16 15 7 24 6 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="M14 18 Q19 14 24 18 Q19 22 14 18 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M24 18 Q29 14 34 18 Q29 22 24 18 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M11 28 Q17 24 23 28 Q17 32 11 28 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M23 28 Q29 24 35 28 Q29 32 23 28 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M12 38 Q18 34 24 38 Q18 42 12 38 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M24 38 Q30 34 36 38 Q30 42 24 38 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M15 47 Q19.5 44 24 47 Q19.5 50 15 47 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M24 47 Q28.5 44 33 47 Q28.5 50 24 47 Z" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinejoin="round" />
      <path d="M18 54 Q21.5 51.5 24 54.5 Q21 56.5 18 54 Z" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinejoin="round" />
      <path d="M24 54.5 Q26.5 51.5 30 54 Q27 56.5 24 54.5 Z" stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinejoin="round" />
    </svg>
  );
}
