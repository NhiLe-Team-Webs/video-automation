import {useMemo} from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CSSProperties, ReactNode} from 'react';
import type {HighlightPlan, HighlightTheme, IconAnimation} from '../types';
import {BRAND} from '../config';
import {resolveIconVisual} from '../icons/registry';

const POSITION_STYLE = {
  top: {justifyContent: 'flex-start', paddingTop: 140},
  center: {justifyContent: 'center'},
  bottom: {justifyContent: 'flex-end', paddingBottom: 140},
} as const;

const ICON_ANIMATIONS: readonly IconAnimation[] = ['float', 'pulse', 'spin', 'pop'];

const normalizeAnimation = (value: unknown): IconAnimation | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase() as IconAnimation;
  return (ICON_ANIMATIONS as readonly string[]).includes(normalized) ? normalized : undefined;
};

const withAlpha = (color: string | undefined, alpha: number, fallback: string) => {
  if (!color) {
    return fallback;
  }

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  return fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface IconEffectProps {
  highlight: HighlightPlan;
  durationInFrames: number;
  theme?: HighlightTheme;
}

export const IconEffect: React.FC<IconEffectProps> = ({highlight, durationInFrames, theme}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  const iconKey = useMemo(() => {
    if (typeof highlight.icon === 'string' && highlight.icon.trim()) {
      return highlight.icon.trim();
    }
    if (typeof highlight.name === 'string' && highlight.name.trim()) {
      return highlight.name.trim();
    }
    return undefined;
  }, [highlight.icon, highlight.name]);

  const visual = useMemo(() => resolveIconVisual(iconKey), [iconKey]);
  const IconComponent = visual?.component ?? null;
  const assetSource = highlight.asset ? staticFile(highlight.asset) : null;

  const appearSpring = spring({
    frame,
    fps,
    durationInFrames: Math.min(durationInFrames, Math.round(fps * 0.6)),
    config: {
      damping: 200,
      stiffness: 130,
      overshootClamping: false,
    },
  });

  const exitWindow = Math.max(1, Math.round(fps * 0.6));
  const exitDamp = clamp((durationInFrames - frame) / exitWindow, 0, 1);
  const animationEnergy = clamp(appearSpring * 0.8 + exitDamp * 0.4, 0, 1);

  const baseScale = 0.9 + appearSpring * 0.2;

  const animationVariant =
    normalizeAnimation(highlight.animation) ??
    normalizeAnimation(highlight.variant) ??
    visual?.defaultAnimation ??
    'float';

  let translateX = 0;
  let translateY = 0;
  let rotateDeg = 0;
  let scaleMultiplier = 1;

  switch (animationVariant) {
    case 'pulse': {
      const pulseWave = Math.sin((frame / fps) * Math.PI * 2.2);
      scaleMultiplier += pulseWave * 0.08 * animationEnergy;
      translateY = Math.sin((frame / fps) * Math.PI * 1.4) * 2 * animationEnergy;
      break;
    }
    case 'spin': {
      const spinSpeed = 120;
      rotateDeg = (frame / fps) * spinSpeed * animationEnergy;
      scaleMultiplier += Math.sin((frame / fps) * Math.PI * 1.2) * 0.05 * animationEnergy;
      break;
    }
    case 'pop': {
      const popProgress = clamp(frame / Math.max(1, fps * 0.45), 0, 1);
      const popWave = Math.sin(popProgress * Math.PI);
      translateY = -popWave * 14 * animationEnergy;
      scaleMultiplier += popWave * 0.18 * animationEnergy;
      break;
    }
    case 'float':
    default: {
      translateY = Math.sin((frame / fps) * Math.PI * 1.4) * 8 * animationEnergy;
      rotateDeg = Math.sin((frame / fps) * Math.PI * 0.8) * 5 * animationEnergy;
      scaleMultiplier += Math.sin((frame / fps) * Math.PI * 1.2) * 0.04 * animationEnergy;
      break;
    }
  }

  const transformParts: string[] = [];
  if (translateX || translateY) {
    transformParts.push(`translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px)`);
  }
  if (rotateDeg) {
    transformParts.push(`rotate(${rotateDeg.toFixed(2)}deg)`);
  }
  transformParts.push(`scale(${(baseScale * scaleMultiplier).toFixed(3)})`);
  const iconTransform = transformParts.join(' ');

  const accentColor =
    highlight.accentColor ?? theme?.accentColor ?? visual?.defaultAccent ?? BRAND.red;
  const iconColor = highlight.iconColor ?? accentColor ?? '#ffffff';
  const bubbleBackground =
    highlight.backgroundColor ??
    highlight.bg ??
    theme?.backgroundColor ??
    visual?.defaultBackground ??
    'linear-gradient(135deg, rgba(28,28,36,0.95) 0%, rgba(12,12,18,0.95) 100%)';

  const accentGlow = withAlpha(accentColor, 0.55, 'rgba(255,255,255,0.35)');
  const accentHalo = withAlpha(accentColor, 0.22, 'rgba(255,255,255,0.18)');
  const accentRim = withAlpha(accentColor, 0.75, accentColor);

  const containerStyle = {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: 'transparent',
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
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    transform: iconTransform,
    boxShadow: `0 28px 80px rgba(0,0,0,0.45), 0 0 62px ${accentGlow}`,
  };

  const bubbleLayer: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: bubbleBackground,
    border: `2px solid ${accentRim}`,
    boxShadow: `inset 0 0 16px ${withAlpha(accentColor, 0.35, 'rgba(255,255,255,0.22)')}`,
  };

  const glowLayer: CSSProperties = {
    position: 'absolute',
    inset: '-32%',
    borderRadius: '50%',
    background: accentHalo,
    filter: 'blur(40px)',
    opacity: 0.35 + animationEnergy * 0.45,
  };

  const ringRotation = frame * (animationVariant === 'spin' ? 3.6 : 1.5);

  const ringStyle: CSSProperties = {
    position: 'absolute',
    inset: '-8%',
    borderRadius: '50%',
    border: `2px ${animationVariant === 'spin' ? 'dashed' : 'solid'} ${accentGlow}`,
    transform: `rotate(${ringRotation.toFixed(2)}deg) scale(${(0.9 + appearSpring * 0.15).toFixed(3)})`,
    opacity: 0.4 + animationEnergy * 0.4,
    filter: `drop-shadow(0 0 18px ${accentGlow})`,
  };

  const accentArc: CSSProperties = {
    position: 'absolute',
    inset: '-15%',
    borderRadius: '50%',
    borderTop: `3px solid ${accentRim}`,
    borderLeft: '3px solid transparent',
    borderRight: '3px solid transparent',
    borderBottom: '3px solid transparent',
    transform: `rotate(${(ringRotation * 1.4).toFixed(2)}deg) scale(${(0.88 + appearSpring * 0.18).toFixed(3)})`,
    opacity: 0.45 + animationEnergy * 0.35,
  };

  const particleColor = withAlpha(accentColor, 0.45, 'rgba(255,255,255,0.35)');
  const particleCount = 3;

  const particles = new Array(particleCount).fill(null).map((_, index) => {
    const orbitProgress = (frame / fps) * 1.2 + index * 0.7;
    const angle = orbitProgress * Math.PI * 2;
    const radius = bubbleSize * (0.55 + Math.sin(orbitProgress * 2.2 + index) * 0.06);
    const size = bubbleSize * (0.08 + Math.sin(orbitProgress * 3.1 + index) * 0.015);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const opacity = 0.18 + animationEnergy * 0.45;

    return (
      <div
        key={`particle-${index}`}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: particleColor,
          filter: 'blur(1.6px)',
          opacity,
          transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` as CSSProperties['transform'],
        }}
      />
    );
  });

  let content: ReactNode = null;
  const iconAlt = (typeof highlight.name === 'string' && highlight.name) || iconKey || 'icon';

  if (assetSource) {
    content = (
      <Img
        src={assetSource}
        style={{width: '88%', height: '88%', objectFit: 'contain'}}
        alt={iconAlt}
      />
    );
  } else if (IconComponent) {
    content = (
      <IconComponent size={Math.round(bubbleSize * 0.56)} color={iconColor} strokeWidth={1.8} />
    );
  } else {
    content = (
      <div
        style={{
          width: '55%',
          height: '55%',
          borderRadius: '18%',
          background: accentColor,
          opacity: 0.82,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={containerStyle}>
      <div style={iconWrapper}>
        <div style={glowLayer} />
        <div style={bubbleLayer} />
        <div style={ringStyle} />
        <div style={accentArc} />
        {particles}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72%',
            height: '72%',
          }}
        >
          {content}
        </div>
      </div>
    </AbsoluteFill>
  );
};
