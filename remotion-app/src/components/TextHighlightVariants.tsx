import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {BRAND} from '../config';
import type {HighlightPlan, HighlightTheme, HighlightType, HighlightPosition} from '../types';

const POSITION_STYLES: Record<HighlightPosition, CSSProperties> = {
  top: {justifyContent: 'flex-start', alignItems: 'center', paddingTop: 140},
  center: {justifyContent: 'center', alignItems: 'center'},
  bottom: {justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 140},
};

const ease = Easing.bezier(0.42, 0, 0.58, 1);

interface HighlightRenderContext {
  highlight: HighlightPlan;
  appear: number;
  exit: number;
  theme?: HighlightTheme;
  width: number;
  height: number;
}

type HighlightRenderer = (context: HighlightRenderContext) => ReactNode;

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const computeFocusScale = (appear: number, exit: number) => {
  const appearEased = ease(clamp01(appear));
  const exitEased = clamp01(exit);
  const introZoom = 0.985 + appearEased * 0.035;
  const outroZoom = 0.99 + exitEased * 0.02;
  return introZoom * outroZoom;
};

const applyPositioning = (
  highlight: HighlightPlan,
  theme: HighlightTheme | undefined,
  children: ReactNode
) => {
  const baseStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    padding: '0 6%',
    color: theme?.textColor ?? BRAND.white,
    fontFamily: theme?.fontFamily ?? BRAND.fonts.body,
    fontWeight: 500,
    letterSpacing: 0.2,
    textRendering: 'optimizeLegibility',
    pointerEvents: 'none',
    ...POSITION_STYLES[highlight.position ?? 'center'],
  };

  return <div style={baseStyle}>{children}</div>;
};

const renderTypewriter: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const text = highlight.text ?? '';
  if (!text) {
    return null;
  }

  const eased = ease(clamp01(appear));
  const exitEased = clamp01(exit);
  const totalChars = text.length;
  const visibleChars = Math.max(0, Math.round(totalChars * eased));
  const content = text.slice(0, visibleChars);
  const caretOpacity = 0.35 + 0.65 * Math.abs(Math.sin(eased * Math.PI * 2.8));

  const scale = computeFocusScale(appear, exit);

  const cardStyle: CSSProperties = {
    padding: '2.8rem 4.5rem',
    borderRadius: '1rem',
    border: `1px solid ${theme?.accentColor ?? BRAND.overlays.glassBorder}`,
    background:
      theme?.backgroundColor ??
      `linear-gradient(140deg, ${BRAND.overlays.glassBackground} 0%, rgba(28,28,28,0.72) 100%)`,
    backdropFilter: 'blur(18px)',
    fontSize: 60,
    fontFamily: BRAND.fonts.heading,
    fontWeight: 600,
    lineHeight: 1.28,
    letterSpacing: 0.6,
    color: BRAND.white,
    textShadow: '0 16px 40px rgba(12,12,12,0.45)',
    boxShadow: '0 18px 70px rgba(12,12,12,0.3)',
    opacity: exitEased,
    transform: `translateY(${(1 - eased) * 26}px) scale(${scale})`,
    position: 'relative',
    overflow: 'hidden',
  };

  const caret: CSSProperties = {
    display: 'inline-block',
    width: '0.6ch',
    height: '1.05em',
    marginLeft: '0.3ch',
    background: theme?.accentColor ?? BRAND.primary,
    opacity: caretOpacity,
    verticalAlign: 'baseline',
  };

  return applyPositioning(
    highlight,
    theme,
    <div style={cardStyle}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: BRAND.radialGlow,
          mixBlendMode: 'screen',
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-18%',
          right: '-12%',
          width: '32%',
          height: '48%',
          background: BRAND.overlays.triangle,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
          opacity: 0.8,
        }}
      />
      <span style={{position: 'relative', zIndex: 1}}>{content}</span>
      <span style={{...caret, position: 'relative', zIndex: 1}} />
    </div>
  );
};

const renderNoteBox: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const text = highlight.text ?? '';
  if (!text) {
    return null;
  }

  const eased = ease(clamp01(appear));
  const exitEased = clamp01(exit);

  const direction = highlight.side ?? 'bottom';
  const distance = direction === 'bottom' ? 120 : 120;
  const translateValue = (1 - eased) * distance;
  const translate =
    direction === 'bottom'
      ? `translateY(${translateValue}px)`
      : `translateX(${direction === 'left' ? -translateValue : translateValue}px)`;

  const scale = computeFocusScale(appear, exit);

  const cardStyle: CSSProperties = {
    minWidth: '48%',
    maxWidth: '72%',
    padding: '3rem 3.6rem',
    borderRadius: highlight.radius ? `${highlight.radius}px` : '1rem',
    background:
      highlight.bg ??
      `linear-gradient(150deg, ${BRAND.overlays.glassBackground} 0%, rgba(28,28,28,0.72) 100%)`,
    border: `1px solid ${theme?.accentColor ?? BRAND.overlays.glassBorder}`,
    boxShadow: '0 18px 70px rgba(12,12,12,0.28)',
    color: BRAND.white,
    fontSize: 52,
    fontFamily: BRAND.fonts.body,
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: 0.5,
    transform: `${translate} scale(${scale})`,
    opacity: exitEased,
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  };

  const typedChars = Math.max(0, Math.round(text.length * clamp01(appear)));
  const content = text.slice(0, typedChars);

  return applyPositioning(
    highlight,
    theme,
    <div style={cardStyle}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: cardStyle.borderRadius,
          background:
            highlight.bg ??
            `linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(28,28,28,0.6) 100%)`,
          mixBlendMode: 'soft-light',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-20%',
          width: '45%',
          height: '70%',
          background: BRAND.overlays.triangle,
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          opacity: 0.65,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-28%',
          right: '-18%',
          width: '36%',
          height: '54%',
          background: BRAND.overlays.accentGradient,
          clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
          opacity: 0.55,
        }}
      />
      <div style={{position: 'relative', zIndex: 1}}>
        <div
          style={{
            display: 'inline-block',
            height: 8,
            width: '18%',
            marginBottom: 24,
            background: theme?.accentColor ?? BRAND.primary,
            borderRadius: 999,
            boxShadow: '0 6px 24px rgba(200,16,46,0.45)',
          }}
        />
        <div style={{fontSize: 'inherit'}}>
          <span>{content}</span>
          <span
            style={{
              display: 'inline-block',
              width: '0.4ch',
              height: '1.05em',
              marginLeft: '0.3ch',
              background: theme?.accentColor ?? BRAND.primary,
              opacity: 0.45 + 0.45 * Math.abs(Math.sin(appear * Math.PI * 3.1)),
            }}
          />
        </div>
      </div>
    </div>
  );
};

const renderSectionTitle: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const title = highlight.title ?? highlight.text ?? '';
  if (!title) {
    return null;
  }

  const backgroundVariant = (highlight.variant ?? '').toLowerCase();
  const baseGradient =
    backgroundVariant === 'black'
      ? `linear-gradient(140deg, rgba(28,28,28,0.95) 0%, rgba(12,12,12,0.98) 100%)`
      : BRAND.gradient;

  const eased = ease(clamp01(appear));
  const exitEased = clamp01(exit);
  const focusScale = computeFocusScale(appear, exit);
  const macroScale = 1 + (1 - exitEased) * 0.012 + (1 - eased) * 0.01;
  const scale = focusScale * macroScale;

  const container: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme?.textColor ?? BRAND.white,
    background: baseGradient,
    transform: `scale(${scale})`,
    opacity: exitEased,
    textAlign: 'center',
    boxShadow: '0 24px 120px rgba(12,12,12,0.32)',
    padding: '0 12%',
    pointerEvents: 'none',
    borderRadius: '1rem',
    overflow: 'hidden',
    fontFamily: BRAND.fonts.heading,
  };

  return (
    <AbsoluteFill style={container}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: BRAND.radialGlow,
          opacity: 0.6,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-18%',
          right: '-12%',
          width: '35%',
          height: '55%',
          background: BRAND.overlays.accentGradient,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
          opacity: 0.65,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-25%',
          left: '-15%',
          width: '38%',
          height: '58%',
          background: BRAND.overlays.triangle,
          clipPath: 'polygon(0 100%, 0 0, 100% 100%)',
          opacity: 0.7,
        }}
      />
      {highlight.badge ? (
        <div
          style={{
            fontSize: 32,
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginBottom: 28,
            opacity: 0.8,
            fontFamily: BRAND.fonts.body,
          }}
        >
          {highlight.badge}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 100,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          textShadow: '0 22px 60px rgba(12,12,12,0.45)',
          WebkitTextStroke: '1px rgba(255,255,255,0.22)',
          padding: '0 4%',
        }}
      >
        {title}
      </div>
      {highlight.subtitle ? (
        <div
          style={{
            marginTop: 28,
            fontSize: 40,
            opacity: 0.86,
            maxWidth: '70%',
            lineHeight: 1.4,
            fontFamily: BRAND.fonts.body,
          }}
        >
          {highlight.subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const RENDERERS: Record<HighlightType, HighlightRenderer> = {
  typewriter: renderTypewriter,
  noteBox: renderNoteBox,
  sectionTitle: renderSectionTitle,
  icon: () => null,
};

export const renderHighlightByType = (context: HighlightRenderContext): ReactNode => {
  const highlightType = (context.highlight.type as HighlightType | undefined) ?? 'noteBox';
  const renderer = RENDERERS[highlightType] ?? renderNoteBox;
  return renderer(context);
};
