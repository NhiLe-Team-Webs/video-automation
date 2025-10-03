import {AbsoluteFill} from 'remotion';
import type {CSSProperties} from 'react';
import {BRAND} from '../config';

export type BrollPlaceholderVariant = 'fullwidth' | 'roundedFrame';

interface BrollPlaceholderProps {
  title: string;
  subtitle?: string;
  variant?: BrollPlaceholderVariant;
}

export const BrollPlaceholder: React.FC<BrollPlaceholderProps> = ({
  title,
  subtitle,
  variant = 'fullwidth',
}) => {
  const isRounded = variant === 'roundedFrame';

  const background =
    variant === 'fullwidth'
      ? `radial-gradient(circle at 10% 10%, rgba(255,255,255,0.08), transparent 55%), ${BRAND.black}`
      : BRAND.black;

  const frameStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isRounded ? '8%' : '6%',
    background,
  };

  const contentStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: isRounded ? 32 : 24,
    border: '2px solid rgba(255,255,255,0.18)',
    background:
      variant === 'fullwidth'
        ? `linear-gradient(135deg, rgba(25,25,35,0.92) 0%, rgba(12,12,18,0.92) 100%)`
        : `linear-gradient(135deg, ${BRAND.red} 0%, #ff2748 100%)`,
    boxShadow: '0 34px 120px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: BRAND.white,
    textAlign: 'center',
    padding: '6% 10%',
  };

  return (
    <AbsoluteFill style={frameStyle}>
      <div style={contentStyle}>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 24,
              fontSize: 42,
              opacity: 0.8,
              maxWidth: '70%',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
