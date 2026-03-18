# ModelClone - Design Guidelines

## Design Approach
Reference-Based Approach inspired by premium AI creative tools (Midjourney, Runway ML) combined with Linear's refined typography and Stripe's restraint. This positions ModelClone as a professional, trustworthy AI platform with creative emphasis.

## Core Design Principles
1. **Visual Credibility**: Showcase AI capabilities prominently with example generations
2. **Premium Positioning**: Refined aesthetics that justify subscription pricing
3. **Clarity Over Complexity**: Streamlined user flows for technical processes
4. **Trust Building**: Professional polish with clear value communication

---

## Typography System

**Primary Font**: Inter (Google Fonts)
- Headlines: 600-700 weight, tight letter-spacing (-0.02em)
- Body: 400-500 weight, comfortable line-height (1.6)
- Numbers/Credits: Tabular numbers, 600 weight

**Hierarchy**:
- Hero H1: text-5xl md:text-7xl, font-bold
- Section H2: text-3xl md:text-5xl, font-semibold
- Feature H3: text-xl md:text-2xl, font-semibold
- Body: text-base md:text-lg
- Captions: text-sm, opacity-70

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 4, 8, 12, 16, 20, 24 (e.g., p-4, gap-8, mt-12, py-20)

**Container Strategy**:
- Full-width sections: w-full with inner max-w-7xl mx-auto px-6
- Content sections: max-w-6xl mx-auto
- Text content: max-w-3xl for optimal readability
- Dashboard content: max-w-screen-2xl for breathing room

**Grid Systems**:
- Feature showcases: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Pricing cards: grid-cols-1 md:grid-cols-3
- Generation gallery: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Two-column layouts: grid-cols-1 lg:grid-cols-2

---

## Component Library

### Navigation
- Sticky header with backdrop blur (backdrop-blur-lg bg-white/80)
- Logo left, navigation center, CTA + user menu right
- Mobile: Hamburger menu with slide-out drawer
- Dashboard nav: Sidebar on desktop (w-64), collapsible on mobile

### Buttons
- Primary CTA: Large (px-8 py-4), rounded-xl, font-semibold, shadow-lg
- Secondary: Border style with hover fill transition
- Ghost buttons: Transparent with hover background
- Icon buttons: Circular with centered icon

### Cards
- Subtle border (border border-gray-200)
- Rounded corners (rounded-2xl)
- Generous padding (p-6 md:p-8)
- Hover lift effect (hover:shadow-xl transition-shadow)

### Forms
- Floating labels or clear top-aligned labels
- Large input fields (h-12 px-4, rounded-lg)
- Focus states with subtle ring
- Error states with red accent and message below
- Success states with green checkmark

### Generation Results
- Masonry grid layout for varied aspect ratios
- Image cards with hover overlay showing actions (download, delete)
- Video thumbnails with play button overlay
- Loading skeletons for pending generations

---

## Page-Specific Guidelines

### Landing Page (8-10 sections)

**Hero Section** (90vh):
- Split layout: Left - compelling headline + subheadline + CTA, Right - Showcase video or animated demo
- Headline emphasis on "AI face swapping" and "your face, any scene"
- Dual CTAs: "Start Creating Free" (primary) + "View Examples" (secondary)
- Trust indicator: "Join 10,000+ creators" with avatar stack

**Features Section**:
- 3-column grid showcasing: Upload Photos → Create Model → Generate Anywhere
- Each feature with icon, title, description, and example thumbnail
- Visual progression arrows between steps

**Showcase Gallery**:
- Before/After image comparisons in 2-column grid
- Video examples with autoplay on hover
- Real generation examples demonstrating quality

**How It Works**:
- 3-4 step process cards with numbers, visual examples
- Timeline or flowchart visual connecting steps

**Pricing Section**:
- 3 pricing tiers side-by-side
- Highlight "Pro" tier with badge and subtle scale/shadow
- Clear credit amounts and monthly/annual toggle
- Feature comparison list below cards

**Use Cases**:
- 4-6 creative applications (content creation, personal branding, entertainment)
- Icon + headline + short description format

**Social Proof**:
- Customer testimonials with photos and generation examples
- Stats showcase: "X generations created", "X happy creators"

**FAQ Section**:
- Accordion-style questions about credits, quality, privacy

**Final CTA**:
- Full-width section with gradient background
- Strong headline + primary CTA
- Secondary benefit bullets

### Dashboard

**Header**:
- Welcome message with user name
- Credit balance prominently displayed (large number with icon)
- Quick action buttons: "New Image", "New Video", "Create Model"

**Main Content Area** (2-column on desktop):
- Left column (wider): Recent generations grid with filtering
- Right sidebar: Quick stats, credit usage chart, model list

**Generation Cards**:
- Thumbnail preview
- Type badge (Image/Video)
- Status indicator (Completed/Processing/Failed)
- Action menu (Download, Delete, Regenerate)
- Timestamp and credits used

### Generate Pages

**Image Generation**:
- Step indicator at top (Select Model → Upload Scene → Configure → Generate)
- Large dropzone for scene upload
- Model selector as thumbnail grid
- Quantity slider (1-10) with live credit calculation
- Prominent "Generate" button showing credits to be deducted
- Preview area showing selected inputs

**Video Generation**:
- Two-step wizard: Step 1 (Prepare) → Step 2 (Complete)
- Clear explanation of process at each step
- Three variation cards in Step 1 with radio selection
- Processing status with progress indicator
- Preview player for completed video

### History Page

**Filters Bar**:
- Type filter (All/Images/Videos)
- Date range picker
- Status filter
- Search by prompt

**Gallery Layout**:
- Masonry grid for optimal space usage
- Infinite scroll or pagination
- Batch actions (select multiple, download all, delete)

---

## Images

**Hero Section**: Large, high-quality showcase image or looping video demonstrating face-swapping quality. Should show dramatic before/after or person appearing in fantastical scene. Position: Right 50% of hero on desktop, below text on mobile.

**Features Section**: 3 example thumbnails showing: (1) uploaded selfies, (2) AI model creation visualization, (3) final generated result.

**Gallery Section**: 6-8 stunning example generations in varied contexts (professional headshot, fantasy scene, historical setting, artistic style).

**Use Cases**: Icon-style illustrations or real example images for each use case.

**Testimonials**: User profile photos alongside their generated images.

---

## Animation Strategy

**Minimal Approach** - animations only where they enhance understanding:
- Fade-in on scroll for section reveals
- Smooth transitions between generation steps
- Loading spinner for API calls
- Success checkmark animation on completion
- Hover lift for cards and buttons (scale: 1.02, shadow increase)

---

## Accessibility

- Minimum contrast ratio 4.5:1 for all text
- Focus visible states on all interactive elements
- Alt text for all generated images
- Keyboard navigation throughout
- ARIA labels for icon-only buttons
- Loading states announced to screen readers