import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {
  HighlightAnimation,
  HighlightPlan,
  HighlightPosition,
  HighlightTheme,
  HighlightVariant,
} from '../types';
import {BRAND_COLORS, BRAND_FONT_FAMILY, BRAND_OVERLAY_GRADIENT} from '../design/brand';

const POSITION_STYLES: Record<HighlightPosition, CSSProperties> = {
  top: {justifyContent: 'flex-start', paddingTop: 120},
  center: {justifyContent: 'center'},
  bottom: {justifyContent: 'flex-end', paddingBottom: 120},
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeInOut = (value: number) => Easing.bezier(0.4, 0, 0.2, 1)(clamp01(value));

const computeAnimationTransform = (
  animation: HighlightAnimation,
  appear: number,
  exit: number,
  theme: HighlightTheme | undefined
): CSSProperties => {
  const appearProgress = easeInOut(appear);
  const exitProgress = easeInOut(exit);
  const exitNormalized = 1 - exitProgress;
  const accent = theme?.accentColor ?? BRAND_COLORS.accent;

  switch (animation) {
    case 'zoom': {
      const scale = interpolate(appearProgress, [0, 1], [0.82, 1.02], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const disappearScale = 1 - exitNormalized * 0.12;
      return {transform: `scale(${scale * disappearScale})`};
    }
    case 'slide': {
      const enterTranslate = interpolate(appearProgress, [0, 1], [50, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const exitTranslate = interpolate(exitNormalized, [0, 1], [0, -60], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return {transform: `translateY(${enterTranslate + exitTranslate}px)`};
    }
    case 'bounce': {
      const bounce = Math.sin(appearProgress * Math.PI);
      const lift = -bounce * 32 * exitProgress;
      const scale = 1 + bounce * 0.18;
      const settleScale = 1 - exitNormalized * 0.15;
      return {
        transform: `translateY(${lift}px) scale(${scale * settleScale})`,
        filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.25)) drop-shadow(0 0 26px ${accent})`,
      };
    }
    case 'float': {
      const driftX = Math.sin(appearProgress * Math.PI * 1.5) * 18 * exitProgress;
      const driftY = -interpolate(appearProgress, [0, 1], [0, 48], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }) * exitProgress;
      const shimmer = 1 + Math.sin((appearProgress + exitNormalized) * Math.PI) * 0.05;
      return {
        transform: `translate(${driftX}px, ${driftY}px) scale(${shimmer})`,
        filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.25)) drop-shadow(0 0 32px ${accent}) saturate(${1 + appearProgress * 0.2})`,
      };
    }
    case 'flip': {
      const rotate = interpolate(appearProgress, [0, 1], [-80, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const exitRotate = interpolate(exitNormalized, [0, 1], [0, 50], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const scale = 1 - exitNormalized * 0.1;
      return {
        transform: `perspective(1400px) rotateX(${rotate + exitRotate}deg) scale(${scale})`,
        transformStyle: 'preserve-3d',
      };
    }
    case 'typewriter':
    case 'fade':
    default:
      return {};
  }
};

interface HighlightVariantContext {
  highlight: HighlightPlan;
  theme?: HighlightTheme;
  appear: number;
  exit: number;
  animation: HighlightAnimation;
  width: number;
  height: number;
}

type HighlightRenderer = (context: HighlightVariantContext) => ReactNode;

const getContainerStyle = (
  position: HighlightPosition | undefined,
  theme: HighlightTheme | undefined
): CSSProperties => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  color: theme?.textColor ?? BRAND_COLORS.light,
  fontFamily: theme?.fontFamily ?? BRAND_FONT_FAMILY,
  boxSizing: 'border-box',
  padding: '0 4%',
  pointerEvents: 'none',
  ...POSITION_STYLES[position ?? 'center'],
});

const renderCallout: HighlightRenderer = ({highlight, theme, appear, exit, animation}) => {
  const opacity = Math.min(appear, exit);
  const transformStyle = computeAnimationTransform(animation, appear, exit, theme);

  const bubbleStyle: CSSProperties = {
    background: theme?.backgroundColor ?? 'rgba(0, 0, 0, 0.65)',
    borderLeft: `6px solid ${theme?.accentColor ?? BRAND_COLORS.accent}`,
    padding: '32px 48px',
    borderRadius: 24,
    fontSize: 52,
    lineHeight: 1.2,
    maxWidth: '70%',
    boxShadow: '0 22px 60px rgba(0, 0, 0, 0.35), 0 0 38px rgba(255, 255, 255, 0.15)',
    opacity,
    ...transformStyle,
    transformOrigin: 'center',
    backfaceVisibility: 'hidden',
  };

  return (
    <div style={getContainerStyle(highlight.position, theme)}>
      <div style={bubbleStyle}>{highlight.text}</div>
    </div>
  );
};

const renderBlurred: HighlightRenderer = (context) => {
  const {appear, exit, theme, width, height} = context;
  const opacity = Math.min(appear, exit);
  const backdropStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backdropFilter: 'blur(18px)',
    background: 'rgba(7, 11, 19, 0.55)',
    opacity,
  };

  return (
    <AbsoluteFill>
      <div style={backdropStyle} />
      <div style={{position: 'relative', width, height}}>
        {renderCallout({...context, theme: {...theme, backgroundColor: 'rgba(7, 9, 18, 0.7)'}})}
      </div>
    </AbsoluteFill>
  );
};

const renderCutaway: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const opacity = Math.min(appear, exit);
  const container: CSSProperties = {
    ...getContainerStyle('center', theme),
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
  };

  const textStyle: CSSProperties = {
    fontSize: 66,
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: 0.8,
    padding: '0 12%',
    opacity,
  };

  return (
    <AbsoluteFill style={container}>
      <div style={{height: 6, width: '18%', backgroundColor: theme?.accentColor ?? BRAND_COLORS.accent, marginBottom: 36}} />
      <div style={textStyle}>{highlight.text}</div>
    </AbsoluteFill>
  );
};

const renderBrand: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const opacity = Math.min(appear, exit);
  const overlay: CSSProperties = {
    background: BRAND_OVERLAY_GRADIENT,
    color: BRAND_COLORS.light,
    fontFamily: theme?.fontFamily ?? BRAND_FONT_FAMILY,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    pointerEvents: 'none',
  };

  const motifLarge: CSSProperties = {
    position: 'absolute',
    top: '-30%',
    right: '-18%',
    width: '55%',
    height: '160%',
    background: `linear-gradient(145deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.accent} 100%)`,
    opacity: 0.85,
    transform: 'rotate(18deg)',
    filter: 'drop-shadow(0 38px 90px rgba(0,0,0,0.45))',
  };

  const motifSmall: CSSProperties = {
    position: 'absolute',
    bottom: '-18%',
    left: '-12%',
    width: '32%',
    height: '120%',
    background: `linear-gradient(135deg, ${BRAND_COLORS.accent} 0%, ${BRAND_COLORS.primary} 100%)`,
    opacity: 0.6,
    transform: 'rotate(-22deg)',
  };

  const textBlock: CSSProperties = {
    position: 'relative',
    padding: '60px 72px',
    borderRadius: 32,
    background: 'rgba(8, 12, 22, 0.65)',
    border: `3px solid ${theme?.accentColor ?? BRAND_COLORS.accent}`,
    boxShadow: '0 24px 90px rgba(0,0,0,0.45)',
    fontSize: 60,
    fontWeight: 600,
    lineHeight: 1.25,
    maxWidth: '60%',
    opacity,
  };

  return (
    <AbsoluteFill style={overlay}>
      <div style={motifLarge} />
      <div style={motifSmall} />
      <div style={textBlock}>{highlight.text}</div>
    </AbsoluteFill>
  );
};

const renderTypewriter: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const easedAppear = easeInOut(appear);
  const opacity = Math.min(easedAppear, easeInOut(exit));
  const totalChars = highlight.text.length || 1;
  const visibleChars = Math.ceil(totalChars * clamp01(easedAppear));
  const displayText = highlight.text.slice(0, visibleChars);
  const caretAlpha = 0.35 + 0.65 * Math.abs(Math.sin(easedAppear * Math.PI * 3));

  const container: CSSProperties = {
    backgroundColor: BRAND_COLORS.darker,
    color: theme?.textColor ?? BRAND_COLORS.light,
    fontFamily: theme?.fontFamily ?? BRAND_FONT_FAMILY,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
  };

  const panel: CSSProperties = {
    borderRadius: 28,
    border: `2px solid ${theme?.accentColor ?? BRAND_COLORS.accent}`,
    padding: '48px 72px',
    background: 'rgba(8, 10, 18, 0.82)',
    minWidth: '60%',
    maxWidth: '80%',
    boxShadow: '0 26px 80px rgba(0,0,0,0.5)',
    fontSize: 58,
    lineHeight: 1.35,
    letterSpacing: 0.6,
    opacity,
  };

  const caret: CSSProperties = {
    display: 'inline-block',
    marginLeft: '0.4ch',
    width: '0.6ch',
    background: theme?.accentColor ?? BRAND_COLORS.accent,
    opacity: caretAlpha,
    height: '1.05em',
    verticalAlign: 'middle',
  };

  return (
    <AbsoluteFill style={container}>
      <div style={{height: 10, width: '14%', background: theme?.accentColor ?? BRAND_COLORS.accent, marginBottom: 40}} />
      <div style={panel}>
        <span>{displayText}</span>
        <span style={caret} />
      </div>
    </AbsoluteFill>
  );
};

const VARIANT_RENDERERS: Record<HighlightVariant, HighlightRenderer> = {
  callout: renderCallout,
  blurred: renderBlurred,
  cutaway: renderCutaway,
  brand: renderBrand,
  typewriter: renderTypewriter,
};

export interface RenderHighlightOptions {
  variant?: HighlightVariant;
  highlight: HighlightPlan;
  theme?: HighlightTheme;
  appear: number;
  exit: number;
  animation?: HighlightAnimation;
  width: number;
  height: number;
}

export const renderHighlightVariant = (options: RenderHighlightOptions): ReactNode => {
  const {variant, animation, ...rest} = options;
  const resolvedVariant = variant ?? 'callout';
  const renderer = VARIANT_RENDERERS[resolvedVariant] ?? renderCallout;
  const context: HighlightVariantContext = {
    ...rest,
    animation: animation ?? 'fade',
  };
  return renderer(context);
};

export const getPositioningStyle = (position: HighlightPosition | undefined): CSSProperties =>
  POSITION_STYLES[position ?? 'center'];

export const resolveAnimationTransform = (
  animation: HighlightAnimation,
  appear: number,
  exit: number,
  theme: HighlightTheme | undefined
): CSSProperties => computeAnimationTransform(animation, appear, exit, theme);
