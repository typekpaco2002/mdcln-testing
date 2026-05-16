#!/usr/bin/env node
/**
 * Builds lucide-react -> coolicons + react-icons/si -> socials mapping.
 *
 * Inputs:
 *   - .multitask/icon-swap/inventory.json       (from icon-inventory.mjs)
 *   - .multitask/icon-swap/coolicons-metadata.xml  (Figma metadata dump)
 *   - .multitask/icon-swap/socials-metadata.xml    (Figma metadata dump)
 *
 * Outputs:
 *   - .multitask/icon-swap/mapping.json    (machine-readable; node ids for fetch step)
 *   - .multitask/icon-swap/MAPPING.md      (human-readable coverage report)
 *
 * Matching pipeline per lucide symbol (first hit wins):
 *   1. Manual ALIAS_MAP  (curated overrides for known semantic equivalents)
 *   2. Exact match after lowercase+strip-non-alnum normalization
 *   3. Suffix-stripped exact match (e.g. Loader2 -> Loader -> Loading)
 *   4. Fuzzy: substring containment + Levenshtein top-3 candidates -> requires-review
 *   5. No-match -> requires-decision (will fall back to lucide at codemod time)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..');
const IO_DIR = join(REPO_ROOT, '.multitask', 'icon-swap');

const inventory = JSON.parse(readFileSync(join(IO_DIR, 'inventory.json'), 'utf8'));
const coolXml = readFileSync(join(IO_DIR, 'coolicons-metadata.xml'), 'utf8');
const socialsXml = readFileSync(join(IO_DIR, 'socials-metadata.xml'), 'utf8');

/* ---------- Parse coolicons catalog ------------------------------------- */
// Each icon is a <symbol id="x:y" name="Category / Icon_Name" .../>
// Skip layout-symbols like "Shape / Square" since those are decorative.
const SYMBOL_RE = /<symbol\s+id="([^"]+)"\s+name="([^"]+)"/g;
const SKIP_CATEGORIES = new Set(['shape']); // decorative-only

const coolicons = []; // { nodeId, category, name, normalized, fullName }
{
  let m;
  while ((m = SYMBOL_RE.exec(coolXml)) !== null) {
    const nodeId = m[1];
    const full = m[2].trim();
    const parts = full.split('/').map((s) => s.trim());
    if (parts.length !== 2) continue;
    const [category, name] = parts;
    if (SKIP_CATEGORIES.has(category.toLowerCase())) continue;
    coolicons.push({
      nodeId,
      category,
      name,
      fullName: full,
      normalized: normalize(name),
    });
  }
}

/* ---------- Parse socials ----------------------------------------------- */
// We only want Color=Negative (monochrome). Original variants are full-color brand.
const SOCIAL_RE = /<symbol\s+id="([^"]+)"\s+name="Platform=([^,]+),\s*Color=Negative"/g;
const socials = []; // { nodeId, platform, normalized }
{
  let m;
  while ((m = SOCIAL_RE.exec(socialsXml)) !== null) {
    socials.push({
      nodeId: m[1],
      platform: m[2].trim(),
      normalized: normalize(m[2]),
    });
  }
}

/* ---------- Normalization & similarity ---------------------------------- */
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[a.length][b.length];
}

/* ---------- Manual alias table -----------------------------------------
 * Keys are lucide symbol names. Values are coolicons "Icon_Name" strings
 * (without the category prefix). Used when the names don't trivially line up.
 * Picked by reading the coolicons catalog and choosing the closest semantic
 * + visual match per the "closest-match" policy.
 * ------------------------------------------------------------------------ */
const ALIAS_MAP = {
  // Most-used / strongest semantic mismatches
  X: 'Close',
  Loader2: 'Loading_01',
  Loader: 'Loading_01',
  Zap: 'Lightning',
  Sparkles: 'Stars',
  Wand2: 'Magic_Wand',
  Wand: 'Magic_Wand',
  RefreshCw: 'Refresh_01',
  RefreshCcw: 'Refresh_02',
  Trash2: 'Trash_Full',
  Trash: 'Trash_Empty',
  CheckCircle2: 'Check_Circle',
  AlertTriangle: 'Warning_Triangle',
  AlertCircle: 'Warning_Circle',
  Coins: 'Money',
  DollarSign: 'Dollar',
  Volume2: 'Volume_Max',
  VolumeX: 'Volume_Off',
  Volume1: 'Volume_Min',
  Mail: 'Mail_Open',
  Mic: 'Mic_01',
  MicOff: 'Mic_Off_01',
  Image: 'Image_01',
  Images: 'Image_02',
  ImagePlus: 'Image_Plus',
  ImageOff: 'Image_Cross',
  Video: 'Video_Recorder',
  VideoOff: 'Video_Recorder_Off',
  Camera: 'Camera',
  CameraOff: 'Camera_Off',
  Plus: 'Plus',
  Minus: 'Minus',
  Menu: 'Hamburger_Menu',
  MoreHorizontal: 'More_Horizontal',
  MoreVertical: 'More_Vertical',
  ChevronDown: 'Chevron_Down',
  ChevronUp: 'Chevron_Up',
  ChevronLeft: 'Chevron_Left',
  ChevronRight: 'Chevron_Right',
  ChevronsLeft: 'Chevrons_Left',
  ChevronsRight: 'Chevrons_Right',
  ChevronsUp: 'Chevrons_Up',
  ChevronsDown: 'Chevrons_Down',
  ArrowLeft: 'Arrow_Left_LG',
  ArrowRight: 'Arrow_Right_LG',
  ArrowUp: 'Arrow_Up_LG',
  ArrowDown: 'Arrow_Down_LG',
  ArrowUpRight: 'Arrow_Up_Right_LG',
  ArrowDownRight: 'Arrow_Down_Right_LG',
  ArrowLeftRight: 'Arrows_Horizontal',
  ArrowUpDown: 'Arrows_Vertical',
  TrendingUp: 'Trending_Up',
  TrendingDown: 'Trending_Down',
  ExternalLink: 'External_Link',
  Link: 'Link_01',
  Link2: 'Link_02',
  Unlink: 'Link_Broken',
  Lock: 'Lock_Closed',
  Unlock: 'Lock_Open',
  Eye: 'Eye',
  EyeOff: 'Eye_Slash',
  Heart: 'Heart_01',
  HeartOff: 'Heart_Broken',
  Star: 'Star_01',
  StarOff: 'Star_Off',
  Send: 'Send',
  Search: 'Search',
  Filter: 'Filter',
  Edit: 'Edit_Pen_01',
  Edit2: 'Edit_Pen_02',
  Edit3: 'Edit_Pen_03',
  Pencil: 'Pencil',
  PenTool: 'Pen',
  Save: 'Save',
  FileText: 'File_Text',
  File: 'File_Blank',
  FilePlus: 'File_Plus',
  FileDown: 'File_Download',
  FileUp: 'File_Upload',
  Folder: 'Folder',
  FolderOpen: 'Folder_Open',
  Download: 'Download',
  Upload: 'Upload',
  Cloud: 'Cloud',
  CloudUpload: 'Cloud_Upload',
  CloudDownload: 'Cloud_Download',
  CloudOff: 'Cloud_Off',
  User: 'User_01',
  UserPlus: 'User_Add',
  UserMinus: 'User_Close',
  UserX: 'User_Close',
  UserCheck: 'User_Check',
  UserCircle: 'User_Circle',
  Users: 'Users',
  Settings: 'Settings_Future',
  Settings2: 'Settings',
  Cog: 'Settings_Future',
  Sliders: 'Sliders_Horizontal',
  Bell: 'Bell',
  BellOff: 'Bell_Off',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Timer: 'Stopwatch',
  Hourglass: 'Hourglass',
  Globe: 'Globe',
  Map: 'Map',
  MapPin: 'Location',
  Navigation: 'Navigation',
  Compass: 'Compass',
  Home: 'Home',
  Building: 'Building',
  Building2: 'Building',
  Briefcase: 'Briefcase',
  ShoppingBag: 'Shopping_Bag',
  ShoppingCart: 'Shopping_Cart',
  Package: 'Package',
  Box: 'Box',
  Truck: 'Truck',
  CreditCard: 'Credit_Card',
  Wallet: 'Wallet',
  PiggyBank: 'Piggybank',
  Receipt: 'Receipt',
  Tag: 'Tag',
  Bookmark: 'Bookmark',
  Flag: 'Flag_01',
  Pin: 'Pin',
  PinOff: 'Pin_Off',
  Hash: 'Hashtag',
  AtSign: 'At_Sign',
  Phone: 'Phone',
  PhoneOff: 'Phone_Off',
  PhoneCall: 'Phone_Call',
  MessageSquare: 'Message_Square_Lines',
  MessageCircle: 'Message_Circle_Lines',
  MessagesSquare: 'Messages_Square_Lines',
  // Feedback / states
  Check: 'Check',
  CheckCheck: 'Check_All',
  XCircle: 'Close_Circle',
  XSquare: 'Close_Square',
  HelpCircle: 'Help_Circle',
  Info: 'Info_Circle',
  ShieldAlert: 'Shield_Warning',
  ShieldCheck: 'Shield_Check',
  ShieldX: 'Shield_Close',
  Shield: 'Shield',
  // Layout / dev
  Layers: 'Stack',
  Grid: 'Grid_Layout',
  Grid3x3: 'Grid_Layout',
  Columns: 'Columns',
  Rows: 'Rows',
  LayoutDashboard: 'Dashboard',
  LayoutGrid: 'Grid_Layout',
  Square: 'Square',
  Circle: 'Circle',
  Triangle: 'Triangle',
  Code: 'Code',
  Code2: 'Code_Square',
  Terminal: 'Command',
  Bug: 'Bug',
  Database: 'Database',
  Server: 'Server',
  HardDrive: 'Hard_Drive',
  Cpu: 'Cpu',
  Wifi: 'Wifi',
  WifiOff: 'Wifi_Off',
  Bluetooth: 'Bluetooth',
  Battery: 'Battery_Full',
  BatteryLow: 'Battery_Low',
  Power: 'Power',
  Plug: 'Plug',
  // Misc semantic
  Flame: 'Fire',
  Sun: 'Sun',
  Moon: 'Moon',
  CloudRain: 'Cloud_Rain',
  Snowflake: 'Snowflake',
  Wind: 'Wind',
  Waves: 'Wave',
  Droplet: 'Droplet',
  Thermometer: 'Thermometer',
  Sprout: 'Plant',
  Leaf: 'Leaf',
  TreePine: 'Tree',
  Mountain: 'Mountain',
  Rocket: 'Rocket',
  Award: 'Award',
  Trophy: 'Trophy',
  Crown: 'Crown',
  Gift: 'Gift',
  PartyPopper: 'Party',
  Gamepad: 'Gamepad',
  Gamepad2: 'Gamepad_Modern',
  Music: 'Music_Note',
  Music2: 'Music_Note_02',
  Music3: 'Music_Note_03',
  Music4: 'Music_Note_04',
  Headphones: 'Headphones',
  Speaker: 'Speaker',
  Radio: 'Radio',
  Tv: 'Tv',
  Monitor: 'Monitor',
  Smartphone: 'Phone',
  Tablet: 'Tablet',
  Laptop: 'Laptop',
  Watch: 'Watch',
  Mouse: 'Mouse',
  Keyboard: 'Keyboard',
  Printer: 'Printer',
  Scissors: 'Scissors',
  Paperclip: 'Paperclip',
  Pin2: 'Pin',
  Anchor: 'Anchor',
  Key: 'Key',
  KeyRound: 'Key_Round',
  Crosshair: 'Crosshair',
  Target: 'Target',
  Focus: 'Focus',
  ZoomIn: 'Zoom_In',
  ZoomOut: 'Zoom_Out',
  Maximize: 'Maximize',
  Maximize2: 'Maximize_02',
  Minimize: 'Minimize',
  Minimize2: 'Minimize_02',
  Expand: 'Expand',
  Shrink: 'Shrink',
  Move: 'Move',
  MousePointer: 'Cursor',
  MousePointer2: 'Cursor_02',
  Hand: 'Hand',
  HandMetal: 'Hand_Rock',
  ThumbsUp: 'Thumbs_Up',
  ThumbsDown: 'Thumbs_Down',
  Smile: 'Smile',
  Frown: 'Frown',
  Meh: 'Neutral',
  Eraser: 'Eraser',
  Paintbrush: 'Paint_Brush',
  Paintbrush2: 'Paint_Brush',
  PaintBucket: 'Paint_Bucket',
  Palette: 'Palette',
  Pipette: 'Color_Picker',
  Droplets: 'Droplet',
  // Numbers / sequencing
  ListChecks: 'List_Check',
  List: 'List',
  ListOrdered: 'List_Numbered',
  ListTree: 'List_Tree',
  ChevronsUpDown: 'Sort',
  ArrowUpDown_Alt: 'Sort_Up_Down',
  SortAsc: 'Sort_Ascending',
  SortDesc: 'Sort_Descending',
  // Faces / Bodies
  ScanFace: 'Face_Id',
  ScanLine: 'Scan',
  Scan: 'Scan',
  QrCode: 'Qr_Code',
  // Editor
  Type: 'Text_Align_Left',
  Bold: 'Bold',
  Italic: 'Italic',
  Underline: 'Underline',
  AlignLeft: 'Text_Align_Left',
  AlignRight: 'Text_Align_Right',
  AlignCenter: 'Text_Align_Center',
  AlignJustify: 'Text_Align_Justify',
  Quote: 'Quote',
  // Undo/redo + groups
  Undo: 'Undo',
  Undo2: 'Undo',
  Redo: 'Redo',
  Redo2: 'Redo',
  Group: 'Group',
  Ungroup: 'Ungroup',
  // Time / Direction
  Repeat: 'Repeat',
  Repeat2: 'Repeat',
  Shuffle: 'Shuffle',
  Rewind: 'Rewind',
  FastForward: 'Forward',
  SkipBack: 'Skip_Back',
  SkipForward: 'Skip_Forward',
  Play: 'Play',
  Pause: 'Pause',
  Square_Alt: 'Square',
  Circle_Alt: 'Circle',
  PlayCircle: 'Play_Circle',
  PauseCircle: 'Pause_Circle',
  StopCircle: 'Stop_Circle',
  // Logic / Devs
  GitBranch: 'Git_Branch',
  GitCommit: 'Git_Commit',
  GitMerge: 'Git_Merge',
  GitPullRequest: 'Git_Pull_Request',
  Github: 'Github',
  // Avatars/identity
  Crop: 'Crop',
  Rotate: 'Rotate',
  RotateCcw: 'Rotate_Left',
  RotateCw: 'Rotate_Right',
  FlipHorizontal: 'Flip_Horizontal',
  FlipVertical: 'Flip_Vertical',
  // Indicators
  Dot: 'Circle_Filled',
  CircleDot: 'Radio_Filled',
  // Brand-ish lucide
  Twitter: '__SOCIAL__X (Twitter)', // these route to socials file (handled separately)
  Facebook: '__SOCIAL__Facebook',
  Instagram: '__SOCIAL__Instagram',
  Youtube: '__SOCIAL__YouTube',
  Linkedin: '__SOCIAL__LinkedIn',
  // Plus a few catch-alls
  BookOpen: 'Book_Open',
  Book: 'Book',
  Trash3: 'Trash_Full',
  Bot: 'Robot',
  // Action verbs
  Play_Alt: 'Play',
  Power_Alt: 'Power',
};

/* ---------- Build coolicons name index --------------------------------- */
const coolByNormalized = new Map(); // normalized -> [icon, ...]
for (const ic of coolicons) {
  const arr = coolByNormalized.get(ic.normalized) ?? [];
  arr.push(ic);
  coolByNormalized.set(ic.normalized, arr);
}

function findCoolicon(needle) {
  const arr = coolByNormalized.get(normalize(needle));
  if (!arr || arr.length === 0) return null;
  // If multiple categories provide the same name, prefer non-generic categories
  arr.sort((a, b) => a.category.localeCompare(b.category));
  return arr[0];
}

function fuzzyCandidates(lucideName, limit = 3) {
  const n = normalize(lucideName);
  const scored = coolicons.map((ic) => {
    const dist = levenshtein(n, ic.normalized);
    const contains = ic.normalized.includes(n) || n.includes(ic.normalized);
    // Lower score is better. Bias substring hits.
    const score = dist - (contains ? Math.min(n.length, ic.normalized.length) : 0);
    return { ic, score, dist };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => ({
    fullName: s.ic.fullName,
    nodeId: s.ic.nodeId,
    distance: s.dist,
  }));
}

/* ---------- Map each lucide symbol ------------------------------------- */
const lucideMappings = [];
const requiresReview = [];
const requiresDecision = [];

for (const { symbol } of inventory.lucide) {
  const alias = ALIAS_MAP[symbol];

  // Socials routed through alias map (e.g. lucide.Twitter -> socials file)
  if (alias && alias.startsWith('__SOCIAL__')) {
    const platform = alias.slice('__SOCIAL__'.length);
    const social = socials.find((s) => s.platform === platform);
    if (social) {
      lucideMappings.push({
        lucide: symbol,
        method: 'alias-social',
        target: { source: 'socials', nodeId: social.nodeId, name: social.platform },
        targetName: `Social/${social.platform}`,
      });
      continue;
    }
  }

  if (alias && !alias.startsWith('__SOCIAL__')) {
    const ic = findCoolicon(alias);
    if (ic) {
      lucideMappings.push({
        lucide: symbol,
        method: 'alias',
        target: { source: 'coolicons', nodeId: ic.nodeId, name: ic.name, category: ic.category },
        targetName: ic.fullName,
      });
      continue;
    }
    // Alias hint exists but the suggested coolicons name doesn't exist in catalog.
    // Fall through to fuzzy/decision.
  }

  // Exact (normalized) match against catalog
  const ic = findCoolicon(symbol);
  if (ic) {
    lucideMappings.push({
      lucide: symbol,
      method: 'exact',
      target: { source: 'coolicons', nodeId: ic.nodeId, name: ic.name, category: ic.category },
      targetName: ic.fullName,
    });
    continue;
  }

  // Suffix-strip retry (e.g. Loader2 -> Loader, Image2 -> Image)
  const stripped = symbol.replace(/\d+$/, '');
  if (stripped !== symbol) {
    const ic2 = findCoolicon(stripped);
    if (ic2) {
      lucideMappings.push({
        lucide: symbol,
        method: 'exact-suffix-stripped',
        target: { source: 'coolicons', nodeId: ic2.nodeId, name: ic2.name, category: ic2.category },
        targetName: ic2.fullName,
      });
      continue;
    }
  }

  // Fuzzy fallback: store top-3 candidates for review
  const cands = fuzzyCandidates(symbol, 3);
  lucideMappings.push({
    lucide: symbol,
    method: 'fuzzy-pending',
    target: null,
    candidates: cands,
  });
  if (cands[0] && cands[0].distance <= 3) requiresReview.push(symbol);
  else requiresDecision.push(symbol);
}

/* ---------- Map each react-icons/si symbol ----------------------------- */
const siMappings = [];
const siRequiresDecision = [];

for (const { symbol } of inventory.reactIconsSi) {
  // SiInstagram -> Instagram, SiTrustpilot -> Trustpilot
  const platformGuess = symbol.replace(/^Si/, '');
  const social = socials.find((s) => normalize(s.platform) === normalize(platformGuess));
  if (social) {
    siMappings.push({
      si: symbol,
      method: 'exact-social',
      target: { source: 'socials', nodeId: social.nodeId, name: social.platform },
      targetName: `Social/${social.platform}`,
    });
  } else {
    siMappings.push({ si: symbol, method: 'no-match', target: null });
    siRequiresDecision.push(symbol);
  }
}

/* ---------- Write outputs ---------------------------------------------- */
mkdirSync(IO_DIR, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  cooliconsCatalogSize: coolicons.length,
  socialsCatalogSize: socials.length,
  lucide: {
    total: inventory.lucide.length,
    alias: lucideMappings.filter((m) => m.method === 'alias').length,
    aliasSocial: lucideMappings.filter((m) => m.method === 'alias-social').length,
    exact: lucideMappings.filter((m) => m.method === 'exact').length,
    exactSuffix: lucideMappings.filter((m) => m.method === 'exact-suffix-stripped').length,
    fuzzyPending: lucideMappings.filter((m) => m.method === 'fuzzy-pending').length,
  },
  reactIconsSi: {
    total: inventory.reactIconsSi.length,
    matched: siMappings.filter((m) => m.target).length,
    unmatched: siMappings.filter((m) => !m.target).length,
  },
  requiresReview,
  requiresDecision,
  siRequiresDecision,
};

const mappingJson = {
  ...summary,
  lucideMappings,
  siMappings,
};
writeFileSync(join(IO_DIR, 'mapping.json'), JSON.stringify(mappingJson, null, 2));

/* ---------- Markdown report -------------------------------------------- */
const lines = [];
lines.push('# Icon mapping coverage');
lines.push('');
lines.push(`Generated: ${summary.generatedAt}`);
lines.push(`Coolicons catalog: **${summary.cooliconsCatalogSize}** icons`);
lines.push(`Socials catalog: **${summary.socialsCatalogSize}** platforms (Color=Negative only)`);
lines.push('');
lines.push('## Lucide coverage');
lines.push('');
const total = summary.lucide.total;
const resolved =
  summary.lucide.alias + summary.lucide.aliasSocial + summary.lucide.exact + summary.lucide.exactSuffix;
const pct = ((resolved / total) * 100).toFixed(1);
lines.push(`Resolved: **${resolved} / ${total}** (${pct}%)`);
lines.push('');
lines.push(`| Method | Count |`);
lines.push(`|---|---:|`);
lines.push(`| Manual alias -> coolicons | ${summary.lucide.alias} |`);
lines.push(`| Manual alias -> socials | ${summary.lucide.aliasSocial} |`);
lines.push(`| Exact match | ${summary.lucide.exact} |`);
lines.push(`| Exact (numeric-suffix-stripped) | ${summary.lucide.exactSuffix} |`);
lines.push(`| Fuzzy candidates, **needs review** | ${summary.lucide.fuzzyPending} |`);
lines.push('');

lines.push('## react-icons/si coverage');
lines.push('');
lines.push(`Resolved: **${summary.reactIconsSi.matched} / ${summary.reactIconsSi.total}**`);
lines.push('');
for (const m of siMappings) {
  const ok = m.target ? `OK -> Social/${m.target.name}` : 'NO MATCH (keep react-icons/si as fallback)';
  lines.push(`- \`${m.si}\` -> ${ok}`);
}
lines.push('');

lines.push('## Fuzzy-pending lucide symbols (top-3 candidates each)');
lines.push('');
lines.push('Review the suggested coolicons name; pick the best fit OR mark "keep lucide as fallback".');
lines.push('');
for (const m of lucideMappings.filter((x) => x.method === 'fuzzy-pending')) {
  lines.push(`### \`${m.lucide}\``);
  for (const c of m.candidates) {
    lines.push(`- \`${c.fullName}\`  _(distance ${c.distance})_`);
  }
  lines.push('');
}

lines.push('## Resolved mappings (full table)');
lines.push('');
lines.push('| Lucide | Target | Method |');
lines.push('|---|---|---|');
for (const m of lucideMappings.filter((x) => x.target)) {
  lines.push(`| \`${m.lucide}\` | \`${m.targetName}\` | ${m.method} |`);
}
lines.push('');

writeFileSync(join(IO_DIR, 'MAPPING.md'), lines.join('\n'));

console.log(`Coolicons catalog: ${summary.cooliconsCatalogSize} icons`);
console.log(`Socials catalog: ${summary.socialsCatalogSize} platforms`);
console.log(`Lucide: ${resolved}/${total} (${pct}%) resolved automatically`);
console.log(`Lucide fuzzy-pending (needs review): ${summary.lucide.fuzzyPending}`);
console.log(`react-icons/si: ${summary.reactIconsSi.matched}/${summary.reactIconsSi.total} matched`);
if (summary.siRequiresDecision.length) console.log(`  Unmatched: ${summary.siRequiresDecision.join(', ')}`);
console.log(`Wrote ${IO_DIR}/mapping.json and MAPPING.md`);
