#!/usr/bin/env node
/**
 * Generates client/src/components/icons/index.js — a shim that re-exports
 * @phosphor-icons/react under the legacy lucide-react + react-icons/si names
 * so the codemod is just a literal "from 'lucide-react'" -> "from '@/components/icons'"
 * (and same for react-icons/si) rewrite. JSX call sites stay byte-identical.
 *
 * Inputs:
 *   - .multitask/icon-swap/inventory.json
 *   - LUCIDE_TO_PHOSPHOR + SI_TO_PHOSPHOR maps below
 *
 * Output:
 *   - client/src/components/icons/index.js (re-exports, alphabetically ordered)
 *   - .multitask/icon-swap/shim-coverage.md (which lucide/si symbols resolved + any fallbacks)
 *
 * Coverage policy:
 *   1. If a symbol is in the map AND maps to a real phosphor export -> alias re-export.
 *   2. If not in the map -> kept as a lucide fallback re-export (with a TODO comment).
 *      The build will still succeed; we audit/replace those in a follow-up.
 *
 * Phosphor name conventions used:
 *   - Brand logos suffixed `Logo` (DiscordLogo, TelegramLogo, etc.)
 *   - Carets for chevron-style arrows (CaretDown vs ArrowDown)
 *   - Loading spinner -> CircleNotch (paired with `animate-spin`)
 *   - Refresh -> ArrowClockwise / ArrowCounterClockwise / ArrowsClockwise
 *   - Search -> MagnifyingGlass
 *   - Mail -> Envelope; Mic -> Microphone; Settings -> GearSix
 *   - Volume -> SpeakerHigh/Low/None; Trending -> TrendUp/TrendDown
 *   - External link -> ArrowSquareOut; Save -> FloppyDisk; Filter -> FunnelSimple
 *   - Send -> PaperPlaneTilt; Edit -> PencilSimple; More -> DotsThree(Vertical)
 *   - Hamburger menu -> List; Layers -> Stack; Home -> House; MapPin -> MapPin
 *   - Flame -> Flame; Sparkles -> Sparkle; Wand2 -> MagicWand; Coins -> Coins
 *   - DollarSign -> CurrencyDollar; CreditCard -> CreditCard; Trash2 -> Trash
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..');
const IO_DIR = join(REPO_ROOT, '.multitask', 'icon-swap');
const SHIM_PATH = join(REPO_ROOT, 'client', 'src', 'components', 'icons', 'index.js');

const inventory = JSON.parse(readFileSync(join(IO_DIR, 'inventory.json'), 'utf8'));

/* ---------- LUCIDE -> PHOSPHOR (comprehensive map for all 179 symbols) -- */
const LUCIDE_TO_PHOSPHOR = {
  // ----- Core controls -----
  X: 'X',
  XCircle: 'XCircle',
  XSquare: 'XSquare',
  Check: 'Check',
  CheckCheck: 'Checks',
  CheckCircle: 'CheckCircle',
  CheckCircle2: 'CheckCircle',
  CheckSquare: 'CheckSquare',
  Plus: 'Plus',
  PlusCircle: 'PlusCircle',
  Minus: 'Minus',
  Ban: 'Prohibit',

  // ----- Spinners / refresh -----
  Loader2: 'CircleNotch',
  Loader: 'CircleNotch',
  RefreshCw: 'ArrowClockwise',
  RefreshCcw: 'ArrowCounterClockwise',
  RotateCw: 'ArrowClockwise',
  RotateCcw: 'ArrowCounterClockwise',
  Rotate3d: 'ArrowsClockwise',

  // ----- Arrows / carets -----
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUpRight: 'ArrowUpRight',
  ArrowDownRight: 'ArrowDownRight',
  ArrowUpFromLine: 'ArrowLineUp',
  ArrowDownAZ: 'SortAscending',
  ChevronUp: 'CaretUp',
  ChevronDown: 'CaretDown',
  ChevronLeft: 'CaretLeft',
  ChevronRight: 'CaretRight',
  ChevronsUp: 'CaretDoubleUp',
  ChevronsDown: 'CaretDoubleDown',
  ChevronsLeft: 'CaretDoubleLeft',
  ChevronsRight: 'CaretDoubleRight',
  ChevronsUpDown: 'CaretUpDown',
  TrendingUp: 'TrendUp',
  TrendingDown: 'TrendDown',
  ExternalLink: 'ArrowSquareOut',
  CornerDownRight: 'ArrowBendDownRight',
  CornerUpLeft: 'ArrowBendUpLeft',
  Move: 'ArrowsOutCardinal',
  Maximize2: 'ArrowsOut',
  Minimize2: 'ArrowsIn',
  Expand: 'ArrowsOut',

  // ----- Visibility / status -----
  Eye: 'Eye',
  EyeOff: 'EyeSlash',
  Lock: 'Lock',
  Unlock: 'LockOpen',
  Shield: 'Shield',
  ShieldAlert: 'ShieldWarning',
  ShieldCheck: 'ShieldCheck',
  ShieldOff: 'ShieldSlash',
  ShieldX: 'ShieldSlash',
  AlertCircle: 'WarningCircle',
  AlertTriangle: 'Warning',
  CircleAlert: 'WarningCircle',
  Info: 'Info',
  HelpCircle: 'Question',

  // ----- People -----
  User: 'User',
  UserPlus: 'UserPlus',
  UserCheck: 'UserCheck',
  UserX: 'UserMinus',
  Users: 'Users',

  // ----- Comms / mail -----
  Mail: 'Envelope',
  MessageSquare: 'ChatText',
  MessageCircle: 'ChatCircle',
  MessagesSquare: 'Chats',
  Send: 'PaperPlaneTilt',
  AtSign: 'At',
  Phone: 'Phone',
  Bell: 'Bell',
  BellOff: 'BellSlash',
  BellRing: 'BellRinging',

  // ----- Media -----
  Play: 'Play',
  Pause: 'Pause',
  StopCircle: 'StopCircle',
  PauseCircle: 'PauseCircle',
  SkipBack: 'SkipBack',
  SkipForward: 'SkipForward',
  Rewind: 'Rewind',
  FastForward: 'FastForward',
  Volume2: 'SpeakerHigh',
  VolumeX: 'SpeakerSlash',
  Mic: 'Microphone',
  MicOff: 'MicrophoneSlash',
  Image: 'Image',
  ImageIcon: 'Image',
  Images: 'Images',
  ImagePlus: 'ImageSquare',
  Video: 'VideoCamera',
  VideoOff: 'VideoCameraSlash',
  Camera: 'Camera',
  CameraOff: 'CameraSlash',
  Music: 'MusicNote',
  Headphones: 'Headphones',
  Film: 'FilmSlate',
  Clapperboard: 'FilmSlate',
  AudioWaveform: 'Waveform',
  Wand2: 'MagicWand',
  Wand: 'MagicWand',
  Sparkles: 'Sparkle',
  Sparkle: 'Sparkle',

  // ----- Files / data -----
  Folder: 'Folder',
  FolderOpen: 'FolderOpen',
  FolderPlus: 'FolderPlus',
  File: 'File',
  FileText: 'FileText',
  FileType2: 'FileText',
  FilePlus: 'FilePlus',
  FileDown: 'FileArrowDown',
  FileUp: 'FileArrowUp',
  FileCheck: 'FileCheck',
  FileX: 'FileX',
  FileImage: 'FileImage',
  FileVideo: 'FileVideo',
  Files: 'Files',
  Download: 'DownloadSimple',
  Upload: 'UploadSimple',
  CloudUpload: 'CloudArrowUp',
  CloudDownload: 'CloudArrowDown',
  Save: 'FloppyDisk',
  Copy: 'Copy',
  Trash: 'Trash',
  Trash2: 'Trash',
  Archive: 'Archive',
  Database: 'Database',
  HardDrive: 'HardDrive',
  Server: 'HardDrives',
  Cpu: 'Cpu',

  // ----- Search / nav -----
  Search: 'MagnifyingGlass',
  ScanSearch: 'MagnifyingGlass',
  ZoomIn: 'MagnifyingGlassPlus',
  ZoomOut: 'MagnifyingGlassMinus',
  Filter: 'FunnelSimple',
  SortAsc: 'SortAscending',
  SortDesc: 'SortDescending',
  Menu: 'List',
  MoreHorizontal: 'DotsThree',
  MoreVertical: 'DotsThreeVertical',
  Grid3X3: 'SquaresFour',
  LayoutDashboard: 'SquaresFour',
  List: 'List',
  ListChecks: 'ListChecks',
  Columns: 'Columns',
  Rows: 'Rows',
  Layers: 'Stack',

  // ----- Money / commerce -----
  Coins: 'Coins',
  DollarSign: 'CurrencyDollar',
  CreditCard: 'CreditCard',
  Wallet: 'Wallet',
  ShoppingBag: 'ShoppingBag',
  ShoppingCart: 'ShoppingCart',
  Package: 'Package',
  Tag: 'Tag',
  Receipt: 'Receipt',
  Bitcoin: 'CurrencyBtc',
  PiggyBank: 'PiggyBank',
  Gift: 'Gift',
  Percent: 'Percent',

  // ----- Misc semantic -----
  Flame: 'Flame',
  Sun: 'Sun',
  Moon: 'Moon',
  Cloud: 'Cloud',
  Snowflake: 'Snowflake',
  Wind: 'Wind',
  Waves: 'Waves',
  Thermometer: 'Thermometer',
  Sprout: 'Plant',
  Leaf: 'Leaf',
  TreePine: 'Tree',
  Mountain: 'Mountains',
  Rocket: 'Rocket',
  Star: 'Star',
  Heart: 'Heart',
  Crown: 'Crown',
  Award: 'Medal',
  Trophy: 'Trophy',
  Zap: 'Lightning',
  Bot: 'Robot',
  Shirt: 'TShirt',
  Banana: 'Carrot', // Phosphor has no banana; closest food icon
  Activity: 'Pulse',
  Workflow: 'TreeStructure',
  Key: 'Key',
  KeyRound: 'Key',
  Lightbulb: 'Lightbulb',
  LightbulbOff: 'LightbulbFilament',

  // ----- Time / calendar -----
  Clock: 'Clock',
  Calendar: 'Calendar',
  CalendarPlus: 'CalendarPlus',
  CalendarCheck: 'CalendarCheck',
  Hourglass: 'Hourglass',
  Timer: 'Timer',
  History: 'ClockCounterClockwise',

  // ----- Places -----
  Home: 'House',
  Building: 'Buildings',
  Building2: 'Buildings',
  MapPin: 'MapPin',
  Map: 'MapTrifold',
  Navigation: 'NavigationArrow',
  Compass: 'Compass',
  Globe: 'Globe',

  // ----- Editor / writing -----
  Edit: 'PencilSimple',
  Edit2: 'PencilSimple',
  Edit3: 'PencilSimpleLine',
  Pencil: 'PencilSimple',
  Pen: 'Pen',
  Type: 'TextT',
  Bold: 'TextB',
  Italic: 'TextItalic',
  Underline: 'TextUnderline',
  AlignLeft: 'TextAlignLeft',
  AlignCenter: 'TextAlignCenter',
  AlignRight: 'TextAlignRight',
  AlignJustify: 'TextAlignJustify',
  Quote: 'Quotes',
  Crop: 'Crop',
  Scissors: 'Scissors',
  Paintbrush: 'PaintBrush',
  Palette: 'Palette',
  Pipette: 'Eyedropper',
  Droplet: 'Drop',
  Eraser: 'Eraser',
  Highlighter: 'Highlighter',
  Sliders: 'SlidersHorizontal',
  Settings: 'GearSix',
  Settings2: 'GearSix',
  Cog: 'GearSix',

  // ----- Code / dev -----
  Code: 'Code',
  Code2: 'CodeBlock',
  Braces: 'Bracket',
  Terminal: 'Terminal',
  Bug: 'Bug',
  GitBranch: 'GitBranch',
  GitCommit: 'GitCommit',
  GitFork: 'GitFork',
  GitMerge: 'GitMerge',
  GitPullRequest: 'GitPullRequest',

  // ----- Hardware / devices -----
  Smartphone: 'DeviceMobile',
  Tablet: 'DeviceTablet',
  Laptop: 'Laptop',
  Monitor: 'Monitor',
  Tv: 'Television',
  Watch: 'Watch',
  Mouse: 'Mouse',
  Keyboard: 'Keyboard',
  Printer: 'Printer',
  Power: 'Power',
  Plug: 'Plug',
  Battery: 'BatteryFull',
  BatteryLow: 'BatteryLow',
  Wifi: 'WifiHigh',
  WifiOff: 'WifiSlash',
  Bluetooth: 'Bluetooth',
  Radio: 'Radio',
  Webcam: 'VideoCamera',

  // ----- Identity / verification -----
  ScanFace: 'UserFocus',
  Scan: 'Scan',
  QrCode: 'QrCode',
  Fingerprint: 'Fingerprint',

  // ----- Logos / brand-ish lucide -----
  Twitter: 'XLogo',
  Facebook: 'FacebookLogo',
  Instagram: 'InstagramLogo',
  Youtube: 'YoutubeLogo',
  Linkedin: 'LinkedinLogo',
  Github: 'GithubLogo',
  Apple: 'AppleLogo',
  Chrome: 'GoogleChromeLogo',

  // ----- Misc UX bits -----
  Bookmark: 'BookmarkSimple',
  Flag: 'Flag',
  Pin: 'PushPinSimple',
  PinOff: 'PushPinSimpleSlash',
  Hash: 'Hash',
  Briefcase: 'Briefcase',
  BookOpen: 'BookOpen',
  Book: 'Book',
  Languages: 'Translate',
  Globe2: 'Globe',
  ToggleLeft: 'ToggleLeft',
  ToggleRight: 'ToggleRight',
  Sliders2: 'SlidersHorizontal',
  EyeIcon: 'Eye',

  // ----- Second-pass coverage (turn lucide fallbacks into phosphor) -----
  BarChart: 'ChartBar',
  BarChart3: 'ChartBar',
  Brush: 'PaintBrush',
  Circle: 'Circle',
  Contrast: 'CircleHalf',
  Cookie: 'Cookie',
  Crosshair: 'Crosshair',
  Droplets: 'Drop',
  FilePenLine: 'NotePencil',
  FlipHorizontal: 'FlipHorizontal',
  FlipVertical: 'FlipVertical',
  Gauge: 'Gauge',
  GitCompare: 'GitDiff',
  GraduationCap: 'GraduationCap',
  Group: 'SquaresFour',
  Ungroup: 'Stack',
  Headset: 'Headset',
  Inbox: 'Tray',
  Library: 'Books',
  Link2: 'Link',
  LockOpen: 'LockOpen',
  LogOut: 'SignOut',
  Maximize: 'CornersOut',
  Megaphone: 'Megaphone',
  MessageCircleHeart: 'ChatCircleDots',
  MonitorPlay: 'MonitorPlay',
  Music4: 'MusicNotes',
  Redo2: 'ArrowUUpRight',
  Undo2: 'ArrowUUpLeft',
  Repeat: 'Repeat',
  Repeat2: 'RepeatOnce',
  Share2: 'ShareNetwork',
  Shuffle: 'Shuffle',
  Square: 'Square',
  // Coverage safety: any inventory symbol not mapped explicitly will fall back
  // to a lucide-react re-export at the bottom of the shim (see fallback logic).
};

/* ---------- react-icons/si -> phosphor brand logos --------------------- */
const SI_TO_PHOSPHOR = {
  SiDiscord: 'DiscordLogo',
  SiTelegram: 'TelegramLogo',
  SiGoogle: 'GoogleLogo',
  SiInstagram: 'InstagramLogo',
  // Phosphor doesn't ship a Trustpilot logo. Keep on react-icons/si fallback.
  // SiTrustpilot: null,
};

/* ---------- Build the shim --------------------------------------------- */
const lucideNeeded = inventory.lucide.map((r) => r.symbol);
const siNeeded = inventory.reactIconsSi.map((r) => r.symbol);

// Bucket every needed lucide symbol
const phosphorBuckets = new Map(); // phosphor name -> [lucide alias, ...]
const lucideFallbacks = [];
for (const sym of lucideNeeded) {
  const ph = LUCIDE_TO_PHOSPHOR[sym];
  if (ph) {
    const arr = phosphorBuckets.get(ph) ?? [];
    arr.push(sym);
    phosphorBuckets.set(ph, arr);
  } else {
    lucideFallbacks.push(sym);
  }
}

// Bucket every needed si symbol
const siBuckets = new Map(); // phosphor name -> si alias
const siFallbacks = [];
for (const sym of siNeeded) {
  const ph = SI_TO_PHOSPHOR[sym];
  if (ph) siBuckets.set(ph, sym);
  else siFallbacks.push(sym);
}

// Emit shim. For multiple lucide names that map to the same phosphor name we
// re-export it under every alias (e.g. `Loader2` and `Loader` both -> CircleNotch).
const lines = [];
lines.push('// AUTO-GENERATED by scripts/icon-shim-build.mjs');
lines.push('// Do not edit by hand. Re-run the script to regenerate.');
lines.push('//');
lines.push('// This shim re-exports @phosphor-icons/react under the legacy lucide-react +');
lines.push('// react-icons/si names so JSX call sites stay identical after the codemod.');
lines.push('// A small tail of unmapped lucide symbols is re-exported from lucide-react');
lines.push('// directly as a fallback; they can be migrated to phosphor in a follow-up.');
lines.push('');
lines.push('// ----- Phosphor (primary) -----');
const phEntries = [...phosphorBuckets.entries()].sort(([a], [b]) => a.localeCompare(b));
for (const [phName, aliases] of phEntries) {
  // Always alias even if name matches, for consistency.
  const specs = aliases.sort().map((a) => (a === phName ? phName : `${phName} as ${a}`));
  lines.push(`export { ${specs.join(', ')} } from '@phosphor-icons/react';`);
}
lines.push('');

if (siBuckets.size) {
  lines.push('// ----- Phosphor brand logos (replacing react-icons/si) -----');
  const siEntries = [...siBuckets.entries()].sort(([, a], [, b]) => a.localeCompare(b));
  for (const [phName, siAlias] of siEntries) {
    lines.push(`export { ${phName} as ${siAlias} } from '@phosphor-icons/react';`);
  }
  lines.push('');
}

if (lucideFallbacks.length) {
  lines.push('// ----- Lucide fallbacks (no clean phosphor equivalent yet) -----');
  lines.push('// TODO: revisit and migrate one-by-one when phosphor adds equivalents.');
  const sorted = [...new Set(lucideFallbacks)].sort();
  lines.push(`export { ${sorted.join(', ')} } from 'lucide-react';`);
  lines.push('');
}

if (siFallbacks.length) {
  lines.push('// ----- react-icons/si fallbacks (phosphor has no equivalent) -----');
  for (const sym of siFallbacks) {
    lines.push(`export { ${sym} } from 'react-icons/si';`);
  }
  lines.push('');
}

mkdirSync(dirname(SHIM_PATH), { recursive: true });
writeFileSync(SHIM_PATH, lines.join('\n'));

/* ---------- Coverage report -------------------------------------------- */
const report = [];
report.push('# Icon shim coverage');
report.push('');
report.push(`Generated: ${new Date().toISOString()}`);
report.push(`Lucide symbols needed: ${lucideNeeded.length}`);
report.push(`Mapped to phosphor: **${lucideNeeded.length - lucideFallbacks.length}**`);
report.push(`Lucide fallbacks (kept as lucide-react re-exports): **${lucideFallbacks.length}**`);
report.push(`react-icons/si symbols needed: ${siNeeded.length}`);
report.push(`Mapped to phosphor: **${siNeeded.length - siFallbacks.length}**`);
report.push(`react-icons/si fallbacks: **${siFallbacks.length}** -> ${siFallbacks.join(', ') || 'none'}`);
report.push('');

if (lucideFallbacks.length) {
  report.push('## Lucide fallbacks (need phosphor names later)');
  report.push('');
  for (const sym of [...new Set(lucideFallbacks)].sort()) report.push(`- \`${sym}\``);
  report.push('');
}

report.push('## Full lucide -> phosphor map (sorted by lucide name)');
report.push('');
report.push('| Lucide | Phosphor |');
report.push('|---|---|');
const mapEntries = lucideNeeded
  .map((s) => [s, LUCIDE_TO_PHOSPHOR[s] ?? '(fallback: lucide-react)'])
  .sort((a, b) => a[0].localeCompare(b[0]));
for (const [lc, ph] of mapEntries) report.push(`| \`${lc}\` | \`${ph}\` |`);

writeFileSync(join(IO_DIR, 'shim-coverage.md'), report.join('\n'));

console.log(`Lucide symbols needed: ${lucideNeeded.length}`);
console.log(`Mapped to phosphor: ${lucideNeeded.length - lucideFallbacks.length}`);
console.log(`Lucide fallbacks: ${lucideFallbacks.length}${lucideFallbacks.length ? ' -> ' + [...new Set(lucideFallbacks)].sort().join(', ') : ''}`);
console.log(`react-icons/si: ${siNeeded.length - siFallbacks.length}/${siNeeded.length} to phosphor; fallbacks: ${siFallbacks.join(', ') || 'none'}`);
console.log(`Wrote ${SHIM_PATH}`);
console.log(`Wrote ${IO_DIR}/shim-coverage.md`);
