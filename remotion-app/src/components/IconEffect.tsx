import {useMemo} from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CSSProperties, ReactNode} from 'react';
import type {HighlightPlan, HighlightTheme} from '../types';
import {BRAND} from '../config';
import {getIconByName} from '../icons/lucide';

const POSITION_STYLE = {
  top: {justifyContent: 'flex-start', paddingTop: 140},
  center: {justifyContent: 'center'},
  bottom: {justifyContent: 'flex-end', paddingBottom: 140},
} as const;

interface IconEffectProps {
  highlight: HighlightPlan;
  durationInFrames: number;
  theme?: HighlightTheme;
}

export const IconEffect: React.FC<IconEffectProps> = ({highlight, durationInFrames, theme}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  const IconComponent = useMemo(() => getIconByName(highlight.name as string | undefined), [highlight.name]);
  const assetSource = highlight.asset ? staticFile(highlight.asset) : null;

  const progress = spring({
    frame,
    fps,
    durationInFrames: Math.min(durationInFrames, Math.round(fps * 0.6)),
    config: {
      damping: 200,
      stiffness: 130,
      overshootClamping: false,
    },
  });

  const settle = Math.min(1, frame / Math.max(1, durationInFrames));
  const floatOffset = Math.sin((frame / fps) * Math.PI * 1.6) * 4 * (1 - Math.min(1, settle * 1.2));

  const baseScale = 0.86 + progress * 0.18;
  const glowOpacity = 0.35 + progress * 0.35;

  const containerStyle = {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6%',
    pointerEvents: 'none' as const,
    color: theme?.textColor ?? BRAND.white,
    fontFamily: theme?.fontFamily ?? "'Inter Tight', 'Inter', sans-serif",
    ...(POSITION_STYLE[highlight.position ?? 'center'] ?? POSITION_STYLE.center),
  };

  const bubbleSize = Math.min(width, height) * 0.22;

  const iconWrapper: CSSProperties = {
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: '50%',
    background:
      theme?.backgroundColor ?? 'linear-gradient(135deg, rgba(28,28,36,0.95) 0%, rgba(12,12,18,0.95) 100%)',
    border: `2px solid ${theme?.accentColor ?? BRAND.red}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: `scale(${baseScale}) translateY(${floatOffset}px)`,
    boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 46px rgba(255,255,255,${glowOpacity * 0.25})`,
  };

  let content: ReactNode = null;

  if (assetSource) {
    content = (
      <Img
        src={assetSource}
        style={{width: '70%', height: '70%', objectFit: 'contain'}}
        alt={highlight.name ?? 'icon'}
      />
    );
  } else if (IconComponent) {
    content = <IconComponent size={Math.round(bubbleSize * 0.55)} color={theme?.accentColor ?? '#fff'} />;
  } else {
    content = (
      <div
        style={{
          width: '55%',
          height: '55%',
          borderRadius: '18%',
          background: theme?.accentColor ?? BRAND.red,
          opacity: 0.85,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={containerStyle}>
      <div style={iconWrapper}>{content}</div>
    </AbsoluteFill>
  );
};
