import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {BRAND} from '../config';
import type {HighlightPlan, HighlightTheme, HighlightType, HighlightPosition} from '../types';

const POSITION_STYLES: Record<HighlightPosition, CSSProperties> = {
  top: {justifyContent: 'flex-start', alignItems: 'center', paddingTop: 140},
  center: {justifyContent: 'center', alignItems: 'center'},
  bottom: {justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 140},
};

const ease = Easing.bezier(0.42, 0, 0.21, 1);

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
    fontFamily: theme?.fontFamily ?? "'Inter Tight', 'Inter', sans-serif",
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

  const cardStyle: CSSProperties = {
    padding: '40px 68px',
    borderRadius: 32,
    border: `2px solid ${theme?.accentColor ?? BRAND.red}`,
    background: 'rgba(10, 12, 18, 0.78)',
    fontSize: 60,
    lineHeight: 1.3,
    letterSpacing: 0.4,
    boxShadow: '0 26px 80px rgba(0,0,0,0.45)',
    opacity: exitEased,
    transform: `translateY(${(1 - eased) * 24}px)` as string,
  };

  const caret: CSSProperties = {
    display: 'inline-block',
    width: '0.6ch',
    height: '1.05em',
    marginLeft: '0.3ch',
    background: theme?.accentColor ?? BRAND.red,
    opacity: caretOpacity,
    verticalAlign: 'baseline',
  };

  return applyPositioning(
    highlight,
    theme,
    <div style={cardStyle}>
      <span>{content}</span>
      <span style={caret} />
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

  const cardStyle: CSSProperties = {
    minWidth: '48%',
    maxWidth: '68%',
    padding: '36px 48px',
    borderRadius: highlight.radius ?? 24,
    background: highlight.bg ?? 'rgba(18, 22, 30, 0.92)',
    border: `2px solid ${theme?.accentColor ?? BRAND.red}`,
    boxShadow: '0 22px 70px rgba(0,0,0,0.45)',
    fontSize: 54,
    lineHeight: 1.35,
    letterSpacing: 0.4,
    transform: translate,
    opacity: exitEased,
  };

  const typedChars = Math.max(0, Math.round(text.length * clamp01(appear)));
  const content = text.slice(0, typedChars);

  return applyPositioning(
    highlight,
    theme,
    <div
      style={{
        ...cardStyle,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: cardStyle.borderRadius,
          background:
            highlight.bg ??
            'linear-gradient(135deg, rgba(30,34,44,0.95) 0%, rgba(12,12,16,0.95) 100%)',
          opacity: 0.92,
        }}
      />
      <div style={{position: 'relative'}}>
        <div
          style={{
            position: 'absolute',
            height: 6,
            width: '12%',
            top: -14,
            left: 0,
            background: theme?.accentColor ?? BRAND.red,
            borderRadius: 6,
            opacity: 0.9,
          }}
        />
        <span>{content}</span>
        <span
          style={{
            display: 'inline-block',
            width: '0.4ch',
            height: '1em',
            marginLeft: '0.3ch',
            background: theme?.accentColor ?? BRAND.red,
            opacity: 0.45 + 0.45 * Math.abs(Math.sin(appear * Math.PI * 3.1)),
          }}
        />
      </div>
    </div>
  );
};

const buildGridBackground = (base: string) =>
  `linear-gradient(90deg, transparent 0%, transparent 92%, rgba(255,255,255,0.03) 100%),
   linear-gradient(0deg, transparent 0%, transparent 92%, rgba(255,255,255,0.03) 100%),
   ${base}`;

const renderSectionTitle: HighlightRenderer = ({highlight, appear, exit, theme}) => {
  const title = highlight.title ?? highlight.text ?? '';
  if (!title) {
    return null;
  }

  const backgroundVariant = (highlight.variant ?? '').toLowerCase();
  const baseColor = backgroundVariant === 'black' ? BRAND.black : BRAND.red;

  const eased = ease(clamp01(appear));
  const exitEased = clamp01(exit);
  const scale = 1 + (1 - exitEased) * 0.015 + (1 - eased) * 0.015;

  const container: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme?.textColor ?? BRAND.white,
    background: buildGridBackground(
      `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 60%), ${baseColor}`
    ),
    transform: `scale(${scale})`,
    opacity: exitEased,
    textAlign: 'center',
    boxShadow: '0 0 120px rgba(0,0,0,0.45)',
    padding: '0 12%',
    pointerEvents: 'none',
  };

  return (
    <AbsoluteFill style={container}>
      {highlight.badge ? (
        <div
          style={{
            fontSize: 32,
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginBottom: 28,
            opacity: 0.76,
          }}
        >
          {highlight.badge}
        </div>
      ) : null}
      <div style={{fontSize: 96, fontWeight: 700, lineHeight: 1.1, letterSpacing: 1.4}}>{title}</div>
      {highlight.subtitle ? (
        <div
          style={{
            marginTop: 28,
            fontSize: 42,
            opacity: 0.8,
            maxWidth: '80%',
            lineHeight: 1.4,
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
