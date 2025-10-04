import type {ComponentType} from 'react';
import {
  Rocket,
  Sparkles,
  Target,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Camera,
  BrainCircuit,
  BarChart3,
  Megaphone,
  Trophy,
  CalendarClock,
  Users,
  MessageCircle,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {FaPlayCircle, FaRobot, FaGraduationCap, FaBolt} from 'react-icons/fa';
import {SiTiktok, SiYoutube, SiLinkedin} from 'react-icons/si';
import {MdCelebration, MdOutlineAutoAwesome} from 'react-icons/md';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as SiIcons from 'react-icons/si';
import type {IconAnimation} from '../types';

export type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}>;

type IconSource = 'lucide' | 'react-icons/fa' | 'react-icons/md' | 'react-icons/si';

export interface IconVisualDescriptor {
  id: string;
  component: IconComponent;
  source: IconSource;
  defaultAccent?: string;
  defaultBackground?: string;
  defaultSfx?: string;
  defaultAnimation?: IconAnimation;
}

interface CuratedIconEntry {
  aliases: string[];
  descriptor: IconVisualDescriptor;
}

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const curatedEntries: CuratedIconEntry[] = [
  {
    aliases: ['rocket', 'launch', 'launch-mode', 'boost', 'lucide:rocket'],
    descriptor: {
      id: 'rocket',
      component: Rocket,
      source: 'lucide',
      defaultAccent: '#f97316',
      defaultBackground: 'linear-gradient(135deg, rgba(249,115,22,0.16) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/whoosh/woosh.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['sparkles', 'sparkle', 'shine', 'magic', 'lucide:sparkles', 'md:autoawesome'],
    descriptor: {
      id: 'sparkles',
      component: Sparkles,
      source: 'lucide',
      defaultAccent: '#a855f7',
      defaultBackground: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.92) 100%)',
      defaultSfx: 'assets/sfx/ui/bubble-pop.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['target', 'focus', 'bullseye', 'lucide:target'],
    descriptor: {
      id: 'target',
      component: Target,
      source: 'lucide',
      defaultAccent: '#38bdf8',
      defaultBackground: 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(17,24,39,0.94) 100%)',
      defaultSfx: 'assets/sfx/tech/notification.mp3',
      defaultAnimation: 'pop',
    },
  },
  {
    aliases: ['idea', 'light', 'lightbulb', 'lucide:lightbulb'],
    descriptor: {
      id: 'idea',
      component: Lightbulb,
      source: 'lucide',
      defaultAccent: '#fde047',
      defaultBackground: 'linear-gradient(135deg, rgba(250,204,21,0.18) 0%, rgba(17,24,39,0.95) 100%)',
      defaultSfx: 'assets/sfx/emphasis/ding.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['growth', 'trend', 'trending-up', 'lucide:trendingup'],
    descriptor: {
      id: 'growth',
      component: TrendingUp,
      source: 'lucide',
      defaultAccent: '#34d399',
      defaultBackground: 'linear-gradient(135deg, rgba(52,211,153,0.14) 0%, rgba(17,24,39,0.93) 100%)',
      defaultSfx: 'assets/sfx/ui/swipe.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['success', 'check', 'approved', 'lucide:checkcircle2'],
    descriptor: {
      id: 'success',
      component: CheckCircle2,
      source: 'lucide',
      defaultAccent: '#4ade80',
      defaultBackground: 'linear-gradient(135deg, rgba(74,222,128,0.14) 0%, rgba(17,24,39,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/notification.mp3',
      defaultAnimation: 'pop',
    },
  },
  {
    aliases: ['camera', 'record', 'lucide:camera'],
    descriptor: {
      id: 'camera',
      component: Camera,
      source: 'lucide',
      defaultAccent: '#60a5fa',
      defaultBackground: 'linear-gradient(135deg, rgba(96,165,250,0.16) 0%, rgba(15,23,42,0.95) 100%)',
      defaultSfx: 'assets/sfx/tech/camera-click.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['play', 'video', 'fa:play', 'fa:playcircle'],
    descriptor: {
      id: 'play',
      component: FaPlayCircle,
      source: 'react-icons/fa',
      defaultAccent: '#f87171',
      defaultBackground: 'linear-gradient(135deg, rgba(248,113,113,0.16) 0%, rgba(15,23,42,0.95) 100%)',
      defaultSfx: 'assets/sfx/ui/pop.mp3',
      defaultAnimation: 'pop',
    },
  },
  {
    aliases: ['robot', 'automation', 'fa:robot'],
    descriptor: {
      id: 'robot',
      component: FaRobot,
      source: 'react-icons/fa',
      defaultAccent: '#38bdf8',
      defaultBackground: 'linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/tech/notification.mp3',
      defaultAnimation: 'spin',
    },
  },
  {
    aliases: ['celebrate', 'party', 'md:celebration'],
    descriptor: {
      id: 'celebrate',
      component: MdCelebration,
      source: 'react-icons/md',
      defaultAccent: '#fbbf24',
      defaultBackground: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/emotion/applause.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['highlight', 'spotlight', 'md:outlineautoawesome', 'md:autoawesome'],
    descriptor: {
      id: 'spotlight',
      component: MdOutlineAutoAwesome,
      source: 'react-icons/md',
      defaultAccent: '#c084fc',
      defaultBackground: 'linear-gradient(135deg, rgba(192,132,252,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/bubble-pop.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['brain', 'brainpower', 'lucide:braincircuit', 'ai'],
    descriptor: {
      id: 'brain',
      component: BrainCircuit,
      source: 'lucide',
      defaultAccent: '#6366f1',
      defaultBackground: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(15,23,42,0.95) 100%)',
      defaultSfx: 'assets/sfx/tech/notification.mp3',
      defaultAnimation: 'spin',
    },
  },
  {
    aliases: ['analytics', 'report', 'metrics', 'lucide:barchart3'],
    descriptor: {
      id: 'analytics',
      component: BarChart3,
      source: 'lucide',
      defaultAccent: '#34d399',
      defaultBackground: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(15,23,42,0.93) 100%)',
      defaultSfx: 'assets/sfx/ui/keyboard-typing.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['megaphone', 'announce', 'lucide:megaphone'],
    descriptor: {
      id: 'megaphone',
      component: Megaphone,
      source: 'lucide',
      defaultAccent: '#f97316',
      defaultBackground: 'linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(15,23,42,0.92) 100%)',
      defaultSfx: 'assets/sfx/ui/notification.mp3',
      defaultAnimation: 'pop',
    },
  },
  {
    aliases: ['schedule', 'calendar', 'timeline', 'lucide:calendarclock'],
    descriptor: {
      id: 'schedule',
      component: CalendarClock,
      source: 'lucide',
      defaultAccent: '#38bdf8',
      defaultBackground: 'linear-gradient(135deg, rgba(56,189,248,0.14) 0%, rgba(17,24,39,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/notification.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['award', 'trophy', 'lucide:trophy'],
    descriptor: {
      id: 'trophy',
      component: Trophy,
      source: 'lucide',
      defaultAccent: '#facc15',
      defaultBackground: 'linear-gradient(135deg, rgba(250,204,21,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/emotion/applause.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['community', 'team', 'audience', 'lucide:users'],
    descriptor: {
      id: 'community',
      component: Users,
      source: 'lucide',
      defaultAccent: '#f472b6',
      defaultBackground: 'linear-gradient(135deg, rgba(244,114,182,0.16) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/emotion/applause.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['message', 'chat', 'support', 'lucide:messagecircle'],
    descriptor: {
      id: 'chat',
      component: MessageCircle,
      source: 'lucide',
      defaultAccent: '#60a5fa',
      defaultBackground: 'linear-gradient(135deg, rgba(96,165,250,0.16) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/bubble-pop.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['tiktok', 'si:tiktok'],
    descriptor: {
      id: 'tiktok',
      component: SiTiktok,
      source: 'react-icons/si',
      defaultAccent: '#ec4899',
      defaultBackground: 'linear-gradient(135deg, rgba(236,72,153,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/swipe.mp3',
      defaultAnimation: 'spin',
    },
  },
  {
    aliases: ['youtube', 'si:youtube'],
    descriptor: {
      id: 'youtube',
      component: SiYoutube,
      source: 'react-icons/si',
      defaultAccent: '#ef4444',
      defaultBackground: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/pop.mp3',
      defaultAnimation: 'pulse',
    },
  },
  {
    aliases: ['linkedin', 'si:linkedin'],
    descriptor: {
      id: 'linkedin',
      component: SiLinkedin,
      source: 'react-icons/si',
      defaultAccent: '#0ea5e9',
      defaultBackground: 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/notification.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['bolt', 'energy', 'fa:bolt'],
    descriptor: {
      id: 'energy',
      component: FaBolt,
      source: 'react-icons/fa',
      defaultAccent: '#facc15',
      defaultBackground: 'linear-gradient(135deg, rgba(250,204,21,0.18) 0%, rgba(15,23,42,0.93) 100%)',
      defaultSfx: 'assets/sfx/cartoon/boing.mp3',
      defaultAnimation: 'pop',
    },
  },
  {
    aliases: ['education', 'learn', 'fa:graduationcap'],
    descriptor: {
      id: 'education',
      component: FaGraduationCap,
      source: 'react-icons/fa',
      defaultAccent: '#fde68a',
      defaultBackground: 'linear-gradient(135deg, rgba(253,230,138,0.18) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/emotion/applause.mp3',
      defaultAnimation: 'float',
    },
  },
  {
    aliases: ['announcement', 'fa:megaphone'],
    descriptor: {
      id: 'announcement',
      component: Megaphone,
      source: 'lucide',
      defaultAccent: '#fb7185',
      defaultBackground: 'linear-gradient(135deg, rgba(251,113,133,0.16) 0%, rgba(15,23,42,0.94) 100%)',
      defaultSfx: 'assets/sfx/ui/notification.mp3',
      defaultAnimation: 'pulse',
    },
  },
];

const curatedIconMap = new Map<string, IconVisualDescriptor>();
const curatedNameSet = new Set<string>();

for (const {aliases, descriptor} of curatedEntries) {
  curatedNameSet.add(descriptor.id);
  const aliasSet = new Set<string>();
  aliases.forEach((alias) => {
    const normalized = normalizeKey(alias);
    if (normalized) {
      aliasSet.add(normalized);
    }
  });
  aliasSet.add(normalizeKey(descriptor.id));
  aliasSet.forEach((alias) => {
    if (alias) {
      curatedIconMap.set(alias, descriptor);
    }
  });
}

export const curatedIconNames = Array.from(curatedNameSet);

export interface IconVisual extends IconVisualDescriptor {}

const buildLookupKeys = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [] as string[];
  }
  const keys = new Set<string>();
  keys.add(trimmed);
  keys.add(trimmed.toLowerCase());
  keys.add(trimmed.replace(/_/g, ' '));
  if (trimmed.includes(':')) {
    const [prefix, rest] = trimmed.split(':', 2);
    keys.add(rest);
    keys.add(`${prefix}:${rest}`);
  }
  return Array.from(keys);
};

const isIconComponent = (value: unknown): value is IconComponent => {
  if (!value) {
    return false;
  }
  if (typeof value === 'function') {
    return true;
  }
  if (typeof value === 'object') {
    return '$$typeof' in (value as Record<string, unknown>);
  }
  return false;
};

const toComponentName = (raw: string | undefined | null) => {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (/[A-Z]/.test(trimmed) && !/[\s:_-]/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  const parts = trimmed.split(/[\s:_-]+/).filter(Boolean);
  if (!parts.length) {
    return null;
  }
  return parts
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
};

const tryResolveLucideIcon = (iconName: string): IconVisual | null => {
  const componentName = toComponentName(iconName);
  if (!componentName) {
    return null;
  }
  const component = (LucideIcons as Record<string, unknown>)[componentName];
  if (!isIconComponent(component)) {
    return null;
  }
  const id = normalizeKey(`lucide-${componentName}`) || componentName.toLowerCase();
  return {
    id,
    component,
    source: 'lucide',
  };
};

const REACT_ICON_PACKS = {
  fa: {module: FaIcons, prefix: 'Fa', source: 'react-icons/fa' as const},
  md: {module: MdIcons, prefix: 'Md', source: 'react-icons/md' as const},
  si: {module: SiIcons, prefix: 'Si', source: 'react-icons/si' as const},
} satisfies Record<string, {module: Record<string, unknown>; prefix: string; source: IconSource}>;

type ReactIconPackKey = keyof typeof REACT_ICON_PACKS;

const reactIconPrefixMap: Record<string, ReactIconPackKey> = {
  fa: 'fa',
  'react-icons/fa': 'fa',
  md: 'md',
  'react-icons/md': 'md',
  si: 'si',
  'react-icons/si': 'si',
};

const tryResolveReactIcon = (
  prefix: string,
  iconName: string,
): IconVisual | null => {
  const key = reactIconPrefixMap[prefix.toLowerCase()];
  if (!key) {
    return null;
  }
  const pack = REACT_ICON_PACKS[key];
  const componentName = toComponentName(iconName);
  if (!componentName) {
    return null;
  }
  const lookupName = `${pack.prefix}${componentName}`;
  const component = pack.module[lookupName as keyof typeof pack.module];
  if (!isIconComponent(component)) {
    return null;
  }
  const id = normalizeKey(`${pack.prefix}-${componentName}`) || lookupName.toLowerCase();
  return {
    id,
    component: component as IconComponent,
    source: pack.source,
  };
};

const tryResolveFallbackIcon = (candidate: string): IconVisual | null => {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }
  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }
  const prefix = trimmed.slice(0, separatorIndex);
  const iconName = trimmed.slice(separatorIndex + 1);
  if (!iconName) {
    return null;
  }
  if (prefix.toLowerCase() === 'lucide') {
    return tryResolveLucideIcon(iconName);
  }
  return tryResolveReactIcon(prefix, iconName);
};

const resolveWithFallback = (candidates: string[]): IconVisual | null => {
  for (const candidate of candidates) {
    const descriptor = tryResolveFallbackIcon(candidate);
    if (descriptor) {
      return descriptor;
    }
  }
  return null;
};

export const resolveIconVisual = (name?: string | null): IconVisual | null => {
  if (!name) {
    return null;
  }
  const candidates = buildLookupKeys(name);
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    if (!normalized) {
      continue;
    }
    const descriptor = curatedIconMap.get(normalized);
    if (descriptor) {
      return {...descriptor};
    }
  }
  return resolveWithFallback(candidates);
};
