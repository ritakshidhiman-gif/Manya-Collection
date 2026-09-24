# Atelier — Design Direction

## Three Stylistic Approaches

### Theme Name: Quiet Utility
Very brief intro: A warm, tactile interpretation of modern essentials with utilitarian details, natural fibers, and an editorial rhythm. It feels grounded, considered, and quietly confident.
Probability: 0.07

### Theme Name: Coastal Light
Very brief intro: A sun-washed, Mediterranean wardrobe world built from chalky neutrals, soft blue, and relaxed photography. It feels open, calm, and distinctly seasonal.
Probability: 0.03

### Theme Name: Ink & Oxblood
Very brief intro: A nocturnal fashion journal with near-black grounds, oxblood punctuation, and dramatic studio portraits. It feels sharp, rare, and slightly subversive.
Probability: 0.09

## Chosen Approach: Quiet Utility

### Design Movement
Contemporary editorial minimalism with references to Japanese utility design, independent fashion lookbooks, and tactile print catalogs. The design should feel like a well-made garment: precise, durable, and better with attention.

### Core Principles
1. **Tactile restraint:** Use warm paper, graphite, raw umber, and vegetal green rather than glossy digital color.
2. **Editorial asymmetry:** Let oversized photography, narrow text columns, and offset modules create rhythm instead of default centered blocks.
3. **Useful clarity:** Every interaction should help someone browse, compare, or understand the garment without visual noise.
4. **Material honesty:** Favor texture, real-looking fabric surfaces, fine rules, and subtle grain over decorative effects.

### Color Philosophy
The palette is built around warm mineral neutrals and one ownable vegetal green. Bone keeps the site light and breathable; graphite supplies structure; faded clay adds human warmth; vegetal green signals the brand’s connection to natural materials without becoming outdoorsy or rustic. Color appears with intention, like a stitch or a label, not as a gradient wash.

### Layout Paradigm
A magazine-like vertical journey: a slim utility rail, an offset hero composition, a horizontal product rail, and editorial story blocks that alternate image weight and copy density. The page should feel composed rather than tiled; use wide negative space and controlled overlaps to create hierarchy.

### Signature Elements
- A slim left-side editorial index/utility rail on desktop, collapsing into a compact top bar on mobile.
- A recurring “field note” label treatment with mono metadata, hairline rules, and small uppercase captions.
- Product cards with tonal cutout backgrounds, a quiet “quick add” affordance, and tactile hover lift.

### Interaction Philosophy
Interactions should feel like handling a garment: deliberate, responsive, and never theatrical. Hover states reveal detail through a small lift or image crop; add-to-bag gives immediate confirmation; navigation opens with a compact, clear panel rather than an overwhelming mega menu. Placeholder destinations must announce that they are coming soon.

### Animation
Use short, physical transitions with a strong ease-out. Hero content enters as a staggered editorial reveal; product cards lift 4–6px on hover with a soft shadow; the utility rail and mobile menu slide 180–240ms; toast confirmations arrive with a 220ms fade-and-rise. Avoid looping spectacle. Respect `prefers-reduced-motion` and turn off non-essential reveals when requested.

### Typography System
- Display: **Cormorant Garamond**, 600–700 for the brand title and section headlines; use slightly tight leading and occasional italic emphasis for editorial warmth.
- Body: **DM Sans**, 400–500 for navigation, product names, descriptions, and UI labels.
- Metadata: **IBM Plex Mono**, 400–500 for prices, collection codes, and small uppercase field notes.
- Hierarchy: oversized display headline, medium editorial section titles, compact mono labels, and calm body copy with generous line-height.

### Brand Essence
Atelier is a considered wardrobe of modern essentials for people who want fewer, better pieces with a point of view. Personality: **quiet, exacting, grounded**.

### Brand Voice
Headlines are short, tactile, and assured. CTAs are specific and active. Microcopy sounds like a thoughtful studio note, never like pressure marketing.

Example lines:
- “Built for the long way around.”
- “See the fabric. Choose your layer.”

### Wordmark & Logo
A compact geometric “A” mark built from two offset vertical strokes and a cut-through crossbar, suggesting a garment pattern notch and a drafting table. The wordmark uses a refined serif with a custom clipped terminal on the final “r”; the symbol should stand alone as a stamp on packaging, favicon, and garment labels.

### Signature Brand Color
**Vegetal Green — #4D6048.** It is muted enough to feel grown-up and ownable enough to instantly identify Atelier across buttons, labels, and accents.

### File-level reminder
All edited CSS and component/page files should preserve the Quiet Utility system: tactile restraint, editorial asymmetry, useful clarity, and material honesty. Ask before each choice: “Does this reinforce or dilute the design philosophy?”
