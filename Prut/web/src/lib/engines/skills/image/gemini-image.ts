import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'gemini-image' as const,
  name: 'Gemini Image (Nanobanana)',
  examples: [
    {
      concept: 'דיוקן של שף במטבח',
      output:
        'A weathered male chef in his late 50s with close-cropped gray hair, deep smile lines, and calloused hands, wearing a well-used white chef coat with his name "Marco" embroidered in navy thread on the chest. He stands behind a stainless steel kitchen counter garnishing a plate with micro herbs using precision tweezers, his expression one of calm concentration. The restaurant kitchen behind him is alive with motion blur of other cooks moving. Warm tungsten overhead lighting mixed with the blue flame glow from a nearby gas burner. Tight medium shot, 85mm lens, f/2.0 shallow depth of field with creamy bokeh on the background activity. Editorial portrait style reminiscent of Platon Antoniou, high contrast, rich skin tones. No text overlay, no watermarks, no deformed hands, photorealistic skin texture [aspectRatio: 3:4]',
      category: 'portrait',
    },
    {
      concept: 'אריזת מוצר קוסמטיקה טבעית',
      output:
        'A premium skincare product line arranged on a raw travertine stone shelf against a warm plaster wall: a frosted glass serum bottle with a bamboo dropper cap, a matte ceramic moisturizer jar with a minimalist sans-serif logo, and a small amber glass essential oil roller. Fresh rosemary sprigs and dried lavender bundles frame the products. A single shaft of warm afternoon side-light creates long dramatic shadows and highlights the textures of each material. Earthy neutral palette of sand, sage, terracotta, and cream. Overhead view tilted at 30 degrees, 50mm lens, f/4.0, product photography with editorial styling. No text overlay, no watermarks, no distracting background elements [aspectRatio: 4:5]',
      category: 'product',
    },
    {
      concept: 'איור ספר ילדים של חתול עם כנפיים',
      output:
        'A whimsical children\'s book illustration of a fluffy orange tabby cat with large translucent butterfly wings in iridescent blue and purple, perched on a crescent moon over a sleeping village of tiny cottages with warm yellow windows. The cat has oversized expressive green eyes and a curled tail wrapping around a single glowing star. Stars are scattered across a deep navy sky with subtle watercolor texture. The style blends classic Beatrix Potter charm with modern picture book illustration — soft edges, gentle color gradients, visible brushstrokes, and a cozy fairy-tale atmosphere. Muted yet warm palette of midnight blue, golden amber, soft orange, and lavender. No text overlay, no watermarks, no photorealism [aspectRatio: 1:1]',
      category: 'fantasy',
    },
    {
      concept: 'רחוב ביפו העתיקה',
      output:
        'A sun-bleached narrow alley in Old Jaffa descending toward a glimpse of the Mediterranean Sea, ancient honey-colored limestone walls on both sides draped with cascading hot pink bougainvillea. Blue-painted wooden doors and green iron balconies punctuate the stone facades. A stray orange cat lounges in a patch of shade on the worn stone steps. The midday sun creates harsh geometric shadows and bright white highlights on the walls. A fig tree leans over a garden wall in the middle distance. Shot from the top of the stairs looking down, 35mm lens, f/5.6, sharp foreground to background. Warm Mediterranean color palette — golden stone, azure sky, magenta flowers, dusty green foliage. No watermarks, no modern signage, no people, no deformed architecture [aspectRatio: 9:16]',
      category: 'street',
    },
    {
      concept: 'קולאז׳ דיגיטלי של טבע ועיר',
      output:
        'A composite image split vertically down the center: the left half shows a dense ancient forest with towering redwood trees, ferns, and morning mist, while the right half shows a corresponding mirror image of a dense urban cityscape with skyscrapers of matching height and proportion. Where the two halves meet in the center, the elements merge and intertwine — tree branches becoming steel beams, leaves becoming glass windows, roots becoming subway tunnels visible in cross-section. A single hawk flies across both worlds, transitioning from a real bird on the forest side to a geometric wireframe version on the city side. Moody cinematic lighting with green tones on the left and blue-steel tones on the right. Conceptual digital art, precise symmetry, rich detail in both halves. No text overlay, no watermarks [aspectRatio: 16:9]',
      category: 'abstract',
    },
    {
      concept: 'שולחן ערוך לארוחת חג',
      output:
        'A beautifully set holiday dinner table viewed at a slight angle, a long rustic wooden farmhouse table covered with a natural linen runner. Twelve place settings with cream-colored ceramic plates, brass cutlery, and amber glass goblets. A centerpiece of seasonal eucalyptus branches, white pillar candles of varying heights in brass holders, and scattered pomegranates. Each plate has a linen napkin folded into a pocket holding a sprig of rosemary and a handwritten place card. Warm candlelight from the candles is the primary illumination, supplemented by soft overhead pendant lamps. The room has exposed wooden ceiling beams and white plaster walls. A warm, intimate atmosphere of anticipation before guests arrive. No text overlay, no watermarks, no modern electronics visible [aspectRatio: 16:9]',
      category: 'food',
    },
    {
      concept: 'רוכבת אופניים בשדה חיטה',
      output:
        'A woman in her late 20s riding a vintage cream-colored bicycle along a narrow dirt path cutting through a vast golden wheat field at the golden hour. She wears a light blue sundress and a straw hat that she holds with one hand against the wind, her other hand on the handlebars. The wheat is waist-high and glowing warm amber in the low sun. Behind her, the path stretches to the horizon where a row of dark cypress trees stands against a soft orange and pink sky. Her shadow stretches long across the wheat. The image has a nostalgic, dreamlike quality with warm film tones. No watermarks, no modern elements, no text overlay [aspectRatio: 16:9]',
      category: 'narrative',
    },
    {
      concept: 'חנות פרחים מבפנים',
      output:
        'The interior of a charming European flower shop, every surface overflowing with fresh blooms in galvanized buckets: lush peonies in blush pink, deep red garden roses, white ranunculus, purple sweet peas, and bright yellow sunflowers. The shop has exposed brick walls, a worn wooden plank floor, and vintage glass pendant lights. A female florist with an olive-green apron and her hair tied up in a messy bun arranges a bouquet at a rustic wooden work table, tissue paper and ribbon scattered around her. Morning light pours through a large front window, illuminating floating pollen particles and casting long warm shadows. The overall mood is romantic and artisanal. No text, no watermarks, no deformed hands [aspectRatio: 3:4]',
      category: 'interior',
    },
    {
      concept: 'זאב בודד בשלג',
      output:
        'A solitary gray wolf standing perfectly still atop a snow-covered ridge, its thick winter coat dusted with fresh snowflakes. The wolf gazes into the distance with alert amber eyes, ears forward, breath visible as a thin wisp of steam in the frigid air. Behind it, a vast frozen wilderness stretches to a horizon of dark pine forest under heavy gray clouds. The snow on the ridge catches the last pale light of a winter afternoon, creating subtle blue shadows in the footprints trailing behind the wolf. The mood is quiet, powerful, and deeply solitary. Wildlife photography style with a long telephoto lens creating slight compression and a shallow depth of field on the distant trees. No watermarks, no text, no human elements [aspectRatio: 16:9]',
      category: 'nature',
    },
    {
      concept: 'חדר ילדים צבעוני',
      output:
        'A cheerful children\'s bedroom designed for a young child, with soft pastel walls in pale mint green. A low wooden bed shaped like a house frame is dressed with cozy white bedding and a patchwork quilt in muted rainbow colors. A wall-mounted bookshelf in natural wood holds picture books with colorful spines. A small tepee tent in cream canvas with a string of warm fairy lights stands in the corner, a stuffed bear peeking out. Wooden toys, building blocks, and a toy train are scattered playfully on a soft round rug. Large windows let in diffused morning light. The room is tidy but lived-in, warm and inviting, with a Scandinavian-inspired aesthetic. No watermarks, no text overlay, no clutter [aspectRatio: 4:3]',
      category: 'interior',
    },
    {
      concept: 'גשר תלוי בג׳ונגל טרופי',
      output:
        'A weathered rope-and-plank suspension bridge stretching across a deep gorge in a dense tropical rainforest. The bridge sways slightly, its wooden slats worn smooth from use, with frayed hemp ropes as handrails. Below, a rushing river is visible through gaps in thick green canopy. Giant ferns, hanging vines, and bromeliads grow on every surface. Mist rises from the gorge, catching shafts of dappled sunlight breaking through the canopy above. A blue morpho butterfly hovers near the bridge entrance. The atmosphere is humid, lush, and adventurous. Shot from one end of the bridge looking across, wide angle lens creating dramatic perspective convergence. No people, no watermarks, no text [aspectRatio: 9:16]',
      category: 'landscape',
    },
    {
      concept: 'ספורטאית ריצת משוכות',
      output:
        'A female track athlete captured mid-flight clearing a hurdle in a 400-meter race, her body in a perfect lead-leg position with explosive power visible in her extended form. She wears a sleek red and white racing kit, muscles sharply defined, determination etched on her face. The other runners are a step behind, slightly out of focus. The track surface is vivid terracotta red with crisp white lane markings. A packed stadium rises in the background, blurred into a wash of colors. The lighting is bright afternoon sun from the left, creating sharp shadows on the track. Frozen motion sports photography, shot at 1/4000 second, 300mm telephoto lens. No watermarks, no text overlay, no deformed limbs [aspectRatio: 16:9]',
      category: 'action',
    },
  ],
  mistakes: [
    {
      bad: 'portrait of chef, kitchen background, Rembrandt lighting, 85mm, f/2.0, --ar 3:4 --s 600',
      good: 'A weathered male chef in his late 50s with close-cropped gray hair and calloused hands, wearing a well-used white chef coat. He stands behind a stainless steel counter garnishing a plate with micro herbs. Warm tungsten overhead lighting mixed with blue flame glow from a gas burner. Tight medium shot, 85mm lens, f/2.0, editorial portrait style. No text overlay, no watermarks [aspectRatio: 3:4]',
      why: 'Gemini Image does not support any special syntax parameters like --ar, --s, or --chaos. Use natural language only. Aspect ratio is specified as plain text [aspectRatio: 3:4], not as a flag.',
    },
    {
      bad: '(premium skincare:1.3), glass bottle, stone shelf, rosemary, (editorial lighting:1.2), product photo\nNegative prompt: blurry, ugly, text',
      good: 'A premium skincare product line arranged on a raw travertine stone shelf: a frosted glass serum bottle with a bamboo dropper cap and a matte ceramic moisturizer jar. Fresh rosemary sprigs frame the products. Warm afternoon side-light creates long dramatic shadows. Earthy palette of sand, sage, terracotta. Product photography with editorial styling. No text overlay, no watermarks [aspectRatio: 4:5]',
      why: 'Gemini Image does not support weighted emphasis (1.3), negative prompts, or any Stable Diffusion syntax. Write exclusions as natural language at the end (e.g., "No text overlay, no watermarks").',
    },
    {
      bad: 'cat, wings, moon, village, stars, children\'s book, cute, whimsical',
      good: 'A whimsical children\'s book illustration of a fluffy orange tabby cat with large translucent butterfly wings in iridescent blue and purple, perched on a crescent moon over a sleeping village of tiny cottages with warm yellow windows. The cat has oversized expressive green eyes. Stars scattered across a deep navy sky with watercolor texture. Soft edges, gentle color gradients, cozy fairy-tale atmosphere. No text overlay, no watermarks [aspectRatio: 1:1]',
      why: 'Keyword lists produce generic, unfocused results. Gemini Image excels with natural, flowing descriptions that paint a specific scene with spatial relationships, colors, and mood.',
    },
    {
      bad: 'A person riding a bicycle through a field.',
      good: 'A woman in her late 20s riding a vintage cream-colored bicycle along a narrow dirt path cutting through a vast golden wheat field at golden hour. She wears a light blue sundress and holds a straw hat against the wind. The wheat is waist-high and glowing warm amber. Behind her, dark cypress trees stand against an orange and pink sky. Nostalgic, dreamlike quality with warm film tones. No watermarks, no text [aspectRatio: 16:9]',
      why: 'Too vague for character consistency. Gemini Image needs specific details about the person (age, clothing, hair, expression), the environment (time of day, season, specific plants), and the visual style to produce a coherent, distinctive image.',
    },
    {
      bad: 'Professional photo of a wolf in winter, telephoto lens, wildlife photography, 8K, ultra detailed, best quality, masterpiece',
      good: 'A solitary gray wolf standing atop a snow-covered ridge, thick winter coat dusted with fresh snowflakes, alert amber eyes gazing into the distance, breath visible as steam. Behind it, a frozen wilderness stretches to dark pine forest under heavy gray clouds. The snow catches pale winter afternoon light creating blue shadows in the footprints. Quiet, powerful, solitary mood. Wildlife photography, long telephoto lens. No watermarks, no text [aspectRatio: 16:9]',
      why: 'Quality boosters like "8K, ultra detailed, masterpiece" are Stable Diffusion conventions and are ignored by Gemini. Focus on describing the actual scene with emotional language and specific visual details instead.',
    },
  ],
  scoringCriteria: [
    '40–100 words of ordered English: Subject → Action → Setting → Style → Composition → Lighting → Constraints',
    'Natural language only — no (weight:1.3) or comma-keyword stacks',
    'People: age, wardrobe, hair, expression, pose; objects: material and condition',
    'Spatial stack: foreground anchor, midground action, background context',
    'Lens/camera feel in prose (wide establishing, intimate portrait distance)',
    '[aspectRatio: X:Y] at end for delivery shape',
    'Constraints line: no watermarks, no illegible text, no deformed hands when relevant',
    'Mood words that are visual (somber, electric, serene) not vague "nice"',
    'If text in-image: exact wording + placement; otherwise forbid text',
    'Single scene beat — not a collage of unrelated ideas',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'איור ספר ילדים עם דמות חוזרת',
      reasoning:
        'Gemini needs consistency tokens: hair shape, outfit palette, prop. Establish camera distance and illustration medium (watercolor vs 3D). End with aspect ratio.',
      output:
        'A watercolor children\'s book illustration of a small round robot with copper rivets and a single teal eye, kneeling to plant a seedling in a community garden, soil on its metal fingers, children cheering in soft focus behind a fence, afternoon light with paper texture visible in washes. Whimsical but grounded. No text in frame [aspectRatio: 4:5]',
    },
    {
      concept: 'מוצר טק על רקע אבסטרקט',
      reasoning:
        'Product hero: material truth, rim light, gradient backdrop color. Constraints for clean catalog.',
      output:
        'A matte black wireless earbud case hovering slightly above a seamless gradient from deep navy to charcoal, crisp studio rim light tracing the hinge edge, micro-scratches visible for realism, centered hero product shot, ultra-refined commercial look. No logos, no watermark [aspectRatio: 1:1]',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        'Astronaut on Mars, cool, cinematic [aspectRatio: 16:9]',
      afterPrompt:
        'A lone astronaut in a dust-scuffed white suit walks toward a fractured copper cliff on Mars, fine red dust kicking in low gravity, sun a small brilliant disk in a butterscotch sky, visor reflecting the terrain, footprints trailing behind across rippled regolith. Cinematic widescreen still, desaturated except warm highlights. No text [aspectRatio: 16:9]',
      changes: [
        'Specified terrain, lighting, and suit condition for realism',
        'Replaced "cool/cinematic" with describable color and scale',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'Bowl of ramen, food photo',
      afterPrompt:
        'A ceramic bowl of tonkotsu ramen with slow-cooked chashu slices, soft egg with glossy yolk, scallion rings, and nori standing in steam, shot from 45° with a dark slate table and chopsticks resting on a holder, shallow depth of field, warm steam backlit. No watermark [aspectRatio: 4:5]',
      changes: [
        'Named ingredients, angle, steam behavior, and surface styling',
      ],
    },
  ],
};
