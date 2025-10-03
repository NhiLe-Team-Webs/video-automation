import type {FC, ReactNode} from 'react';

export type IconComponent = FC<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const createIcon = (nodes: ReactNode[]): IconComponent => {
  const Icon: IconComponent = ({size = 48, color = 'currentColor', strokeWidth = 1.8}) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {nodes}
    </svg>
  );
  Icon.displayName = 'LucideIcon';
  return Icon;
};

const Rocket = createIcon([
  <path
    key="body"
    d="M12 2C9.2 4.5 7.5 7.9 7.5 11.2V14l-1.8 1.8 2.6.6.6 2.6 1.8-1.8H14c3.3 0 6.1-1.4 8.2-3.5C20.8 8 17.5 4.6 12 2Z"
  />,
  <circle key="window" cx="12" cy="9" r="1.4" />,
  <path key="flame" d="M9.8 19c.5 1.3 1.6 2.4 2.2 2.7.6-.3 1.7-1.4 2.2-2.7" />,
]);

const Sparkles = createIcon([
  <path key="large" d="M12 11l1.4 4.2 4.2 1.4-4.2 1.4-1.4 4.2-1.4-4.2-4.2-1.4 4.2-1.4Z" />,
  <path key="small" d="M5 3.2l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7Z" />,
  <path key="top" d="M18 4l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z" />,
]);

const Target = createIcon([
  <circle key="outer" cx="12" cy="12" r="8" />,
  <circle key="mid" cx="12" cy="12" r="4.8" />,
  <circle key="inner" cx="12" cy="12" r="2" />,
  <path key="arrow" d="M18 6 21 3" />,
]);

const Lightbulb = createIcon([
  <path key="bulb" d="M9 10a3 3 0 1 1 6 0c0 2-1.2 3.5-3 5-1.8-1.5-3-3-3-5Z" />,
  <path key="base" d="M10 17h4" />,
  <path key="stem" d="M10.5 20h3" />,
]);

const TrendingUp = createIcon([
  <path key="line" d="M3 17l6-6 4 4 7-7" />,
  <path key="arrow" d="M18 8h3v3" />,
]);

const Star = createIcon([
  <path key="star" d="M12 4l2 4.6 5 .7-3.8 3.4.9 5-4.1-2.3-4.1 2.3.9-5-3.8-3.4 5-.7Z" />,
]);

const CheckCircle = createIcon([
  <circle key="circle" cx="12" cy="12" r="8.5" />,
  <path key="check" d="m9 12 2 2 4-4" />,
]);

const IconMap: Record<string, IconComponent> = {
  Rocket,
  Sparkles,
  Target,
  Lightbulb,
  TrendingUp,
  Star,
  CheckCircle,
};

export const getIconByName = (name: string | undefined): IconComponent | null => {
  if (!name) {
    return null;
  }
  const direct = IconMap[name];
  if (direct) {
    return direct;
  }
  const normalized = name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('');
  return IconMap[normalized] ?? null;
};

export const iconNames = Object.keys(IconMap);
