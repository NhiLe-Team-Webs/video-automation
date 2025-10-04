import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CSSProperties} from 'react';
import {Clapperboard, Image as ImageIcon, Sparkles} from 'lucide-react';
import {PiMusicNotesBold} from 'react-icons/pi';
import {BRAND} from '../config';

export type BrollPlaceholderVariant = 'fullwidth' | 'roundedFrame';

interface BrollPlaceholderProps {
  title: string;
  subtitle?: string;
  variant?: BrollPlaceholderVariant;
  keyword?: string;
  mediaType?: 'image' | 'video';
}

export const BrollPlaceholder: React.FC<BrollPlaceholderProps> = ({
  title,
  subtitle,
  variant = 'fullwidth',
  keyword,
  mediaType = 'video',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const safeFps = Math.max(fps, 1);
  const loopProgress = (frame / safeFps) % 1;
  const floatOffset = Math.sin(loopProgress * Math.PI * 2) * 10;
  const pulseScale = 1 + Math.sin(loopProgress * Math.PI * 2) * 0.045;
  const sparkleOpacity = 0.45 + Math.sin(loopProgress * Math.PI * 2) * 0.25;

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
    position: 'relative',
  };

  const keywordText = (keyword ?? title ?? 'keyword').toString().trim() || 'keyword';
  const descriptor = `Broll - ${mediaType.toLowerCase()} - ${keywordText}`;

  const descriptorStyle: CSSProperties = {
    fontSize: 68,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadow: '0 12px 32px rgba(0,0,0,0.65)',
  };

  const hintStyle: CSSProperties = {
    marginTop: 18,
    fontSize: 30,
    opacity: 0.75,
    maxWidth: '80%',
    lineHeight: 1.35,
  };

  const chipRowStyle: CSSProperties = {
    marginTop: 36,
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
  };

  const chipStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999,
    padding: '10px 20px',
    fontSize: 24,
    fontWeight: 500,
    letterSpacing: 0.4,
  };

  const mediaIcon =
    mediaType === 'image' ? (
      <ImageIcon size={96} color={BRAND.white} strokeWidth={1.8} />
    ) : (
      <Clapperboard size={96} color={BRAND.white} strokeWidth={1.8} />
    );

  return (
    <AbsoluteFill style={frameStyle}>
      <div style={contentStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 26,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 156,
              height: 156,
              borderRadius: '50%',
              background:
                variant === 'fullwidth'
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 100%)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              transform: `translateY(${floatOffset}px) scale(${pulseScale})`,
              transition: 'transform 0.3s ease-out',
            }}
          >
            {mediaIcon}
            <Sparkles
              size={38}
              color={BRAND.red}
              strokeWidth={1.6}
              style={{
                position: 'absolute',
                top: 16,
                right: 12,
                opacity: sparkleOpacity,
                transform: 'rotate(-8deg)',
              }}
            />
          </div>
          <div style={descriptorStyle}>{descriptor}</div>
          {title ? (
            <div style={hintStyle}>{title}</div>
          ) : null}
          {subtitle ? (
            <div
              style={{
                ...hintStyle,
                fontSize: 26,
                opacity: 0.65,
              }}
            >
              {subtitle}
            </div>
          ) : null}
          <div style={chipRowStyle}>
            <div style={chipStyle}>
              <Sparkles size={22} strokeWidth={1.8} />
              Chờ tải b-roll phù hợp
            </div>
            <div style={chipStyle}>
              <PiMusicNotesBold size={24} />
              Gợi ý thêm SFX sinh động
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
