import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'midjourney' as const,
  name: 'Midjourney v7/v8',
  examples: [
    {
      concept: 'פורטרט דרמטי של זקן עם זקן לבן',
      output:
        'An elderly man with a flowing white beard and deeply weathered skin, Rembrandt lighting casting one half of his face in warm shadow, piercing blue eyes reflecting a lifetime of stories, dark studio background, intimate close-up portrait, shot on medium format film --ar 2:3 --s 750',
      category: 'portrait',
    },
    {
      concept: 'נוף הרים בשלג עם אגם',
      output:
        'A pristine alpine lake perfectly mirroring snow-capped peaks at dawn, thin mist hovering above the glassy turquoise water, a lone wooden dock extends into the foreground, Patagonian wilderness, ethereal pink and violet light breaking over jagged granite ridgeline, landscape photography --ar 16:9 --s 500 --chaos 15',
      category: 'landscape',
    },
    {
      concept: 'צורות גיאומטריות מרחפות באוויר',
      output:
        'Luminous geometric polyhedra suspended in a vast dark void, translucent facets refracting prismatic light, interconnected by thin threads of golden energy, iridescent surfaces shifting between deep cobalt and molten copper, abstract cosmic sculpture, dramatic volumetric lighting from below --ar 1:1 --s 900 --chaos 40',
      category: 'abstract',
    },
    {
      concept: 'בקבוק בושם יוקרתי על רקע שיש',
      output:
        'An amber glass perfume bottle with a sculptural gold cap resting on a slab of Calacatta marble, a single orchid petal fallen beside it, diffused studio lighting with a warm highlight kissing the bottle edge, luxury editorial product photography, shallow depth of field --ar 4:5 --s 600',
      category: 'product',
    },
    {
      concept: 'בניין ברוטליסטי עם צמחייה',
      output:
        'A monumental brutalist concrete tower reclaimed by cascading tropical vegetation, ferns and vines spilling from every balcony, late afternoon sunlight filtering through the canopy casting dappled shadows across raw béton brut surfaces, solarpunk utopia, architectural photography shot from a low angle --ar 9:16 --s 550 --chaos 20',
      category: 'architecture',
    },
    {
      concept: 'דוגמנית בשמלת ערב אדומה על מדרגות',
      output:
        'A tall woman in a flowing crimson silk gown descending a grand marble staircase in a Venetian palazzo, the fabric trailing behind her catching warm golden candlelight, baroque gilded mirrors reflecting the scene infinitely, cinematic editorial fashion photography, moody renaissance atmosphere --ar 2:3 --s 700',
      category: 'fashion',
    },
    {
      concept: 'סושי יפני מושלם על צלחת עץ',
      output:
        'An exquisite omakase platter of eight nigiri pieces arranged on a rustic hinoki cypress board, glistening otoro with marbled fat, translucent shima aji, and vibrant uni glowing under warm overhead light, a small ramekin of freshly grated wasabi, clean minimalist composition, luxury food editorial --ar 3:2 --s 600',
      category: 'food',
    },
    {
      concept: 'חתול בחלון בגשם',
      output:
        'A fluffy orange tabby cat sitting on a windowsill watching rain stream down the glass, the droplets catching reflections of warm interior lamplight against a moody blue-gray cityscape outside, cozy domestic scene with a steaming mug beside the cat, intimate nostalgic atmosphere --ar 4:5 --s 450',
      category: 'emotion',
    },
    {
      concept: 'לוחם סמוראי בשדה אורז ירוק',
      output:
        'A lone samurai in full traditional armor standing in a vast rice paddy at golden hour, the wet field reflecting the sky like a mirror, his katana drawn and gleaming, wind rippling through green stalks around his feet, dramatic clouds building behind distant mountains, epic cinematic composition --ar 16:9 --s 600 --chaos 10',
      category: 'action',
    },
    {
      concept: 'רחוב ביפו העתיקה עם בוגנוויליה',
      output:
        'A narrow sun-bleached stone alley in Old Jaffa cascading with hot pink bougainvillea spilling over ancient honey-colored limestone walls, a blue wooden door weathered by salt air, a stray cat napping in a patch of shade, Mediterranean golden light filtering through the canopy of flowers, street photography --ar 9:16 --s 500',
      category: 'street',
    },
    {
      concept: 'תחנת חלל עתידנית מקרוב',
      output:
        'A massive orbital space station with a rotating habitat ring surrounded by docked spacecraft, solar arrays extending like golden wings, Earth rising in the background with a thin blue atmosphere line, hard science fiction aesthetic, dramatic rim lighting from the distant sun against the void of space --ar 16:9 --s 700 --chaos 15',
      category: 'sci-fi',
    },
    {
      concept: 'דרקון מעל טירה בערפל',
      output:
        'An enormous dragon with iridescent emerald scales soaring above a fog-shrouded gothic castle perched on a cliff edge, moonlight catching the creature\'s outstretched wings, embers trailing from its jaws, dark fantasy atmosphere with volumetric mist and faint aurora in the sky, epic illustration --ar 16:9 --s 800 --chaos 25',
      category: 'fantasy',
    },
    {
      concept: 'סלון מעוצב עם חלון גדול',
      output:
        'A minimalist Scandinavian living room with warm oak floors and a low linen sofa in soft ivory, a floor-to-ceiling window framing a snowy forest landscape, a single potted monstera plant catching diffused winter light, clean lines and muted earth tones, interior design editorial photography --ar 3:2 --s 500',
      category: 'interior',
    },
  ],
  mistakes: [
    {
      bad: 'beautiful woman, long hair, blue eyes, studio, lighting, 4k, realistic, detailed --ar 2:3',
      good: 'A serene young woman with flowing chestnut hair and striking blue eyes, bathed in soft Rembrandt studio lighting, her gaze contemplative and slightly off-camera, porcelain skin with natural texture, intimate close-up portrait --ar 2:3 --s 600',
      why: 'Midjourney responds to natural prose descriptions, not comma-separated keyword lists. Full sentences with emotional and atmospheric context produce dramatically better results.',
    },
    {
      bad: 'A beautiful sunset landscape --chaos 100 --s 1000 --weird 3000',
      good: 'A dramatic sunset over rolling Tuscan hills, bands of amber and violet light painting the sky, lone cypress trees silhouetted against the horizon, warm pastoral atmosphere --ar 16:9 --s 600 --chaos 20',
      why: 'Extreme parameter values (--chaos 100, --weird 3000) produce incoherent or unusable results. Keep --chaos between 10-40, --stylize between 200-800 for controlled creative variation.',
    },
    {
      bad: 'portrait of a man --v 5.2 --quality 2 --tile',
      good: 'A weathered fisherman with deep-set eyes and salt-crusted beard, golden hour light warming his face, coastal backdrop with crashing waves --ar 2:3 --s 500',
      why: 'Deprecated parameters like --v 5.2, --quality 2, and --tile are from older Midjourney versions. Current v7/v8 does not require version flags and uses --s (stylize) instead of --quality.',
    },
    {
      bad: 'A cat sitting on a chair, no background noise, no blur, no watermark, no text',
      good: 'A regal Persian cat perched on a velvet armchair in a dimly lit Victorian parlor, warm firelight casting long shadows, dust motes floating in a beam of window light, intimate moody atmosphere --ar 4:5 --s 500',
      why: 'Midjourney does not support negative prompts in the main prompt. Use --no flag for exclusions (e.g., --no text watermark) rather than writing "no X" in the description.',
    },
  ],
  scoringCriteria: [
    'Must include --ar parameter with appropriate aspect ratio for the subject',
    'Natural flowing prose, not comma-separated keyword lists',
    'Prompt length between 20-40 words (excluding parameters) for optimal results',
    'No deprecated parameters (--v, --quality, --tile) — use current v7/v8 defaults',
    'Includes atmosphere, lighting, and emotional tone — not just subject description',
    '--stylize (--s) value between 200-800 for controlled aesthetics',
  ],
};
