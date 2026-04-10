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
    'Subject is clear in the first ~10 words (v7 weights early tokens heavily)',
    'Must include --ar with an aspect ratio that matches the composition (portrait 2:3, landscape 16:9, etc.)',
    'Natural flowing prose — not comma-separated keyword tags or prompt stuffing',
    'Length ~20–40 words of scene description before parameters (sweet spot for v7)',
    'Lighting and mood are named (golden hour, Rembrandt, rim light, moody, ethereal)',
    'No deprecated flags: --v 5.x, --quality, --tile, --cref; use --oref/--ow for references',
    '--stylize (--s) in 200–800 unless --raw photorealism calls for lower stylization',
    'Use --no for exclusions (text, watermark) — not "no X" sentences in the prose',
    'Atmosphere and material detail (fabric, weather, texture) — not generic "beautiful 8k"',
    'Parameters at end: --ar, --s, optional --chaos/--weird only when creative intent needs it',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'דיוקן מקצועי ללינקדאין',
      reasoning:
        '1) Subject: professional headshot → aspect ratio 3:4 or 4:5, shallow depth of field. 2) Lighting: soft key + subtle rim for separation. 3) Avoid keyword soup; one paragraph. 4) End with --ar --s; add --no text, watermark if branding matters.',
      output:
        'A confident executive in a navy blazer, subtle smile, soft studio key light with gentle rim separation on the jawline, neutral grey background with slight gradient, shallow depth of field, editorial LinkedIn portrait photography --ar 4:5 --s 550 --no text, watermark',
    },
    {
      concept: 'נוף טבע דרמטי להדפסה',
      reasoning:
        '1) Establish scale (wide vs intimate). 2) Time of day + weather for mood. 3) Foreground anchor + midground + background layers. 4) --ar 16:9 or 2:1 for print landscape; --chaos low for coherent landscape.',
      output:
        'A storm front rolls over jagged alpine peaks at last light, sunbeams piercing through breaking clouds and igniting fresh snow on the ridgeline, wind-sculpted cornices on the ridge, foreground wildflowers bent by gusts, epic scale landscape photography --ar 16:9 --s 500 --chaos 12',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        'A cat on a roof, sunset, nice view, beautiful, detailed, 8k --ar 16:9',
      afterPrompt:
        'A ginger tabby cat perched on a Mediterranean clay rooftop at golden hour, whiskers catching the last rays, terracotta tiles warm under its paws, coastal village tumbling toward a turquoise sea below, soft volumetric haze in the valleys --ar 16:9 --s 600 --chaos 15',
      changes: [
        'Replaced generic "nice/beautiful/8k" with concrete texture and palette',
        'Specified camera mood (golden hour) and spatial layers (roof → village → sea)',
        'Tuned --s and added modest --chaos for variation without incoherence',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'Coffee shop in Paris, woman reading, cozy, cinematic --ar 3:2 --s 400',
      afterPrompt:
        'A woman in a wool coat reads a paperback at a small marble table beside rain-streaked café glass, warm tungsten interior light against cool blue-grey daylight outside, steam rising from a white espresso cup, intimate Parisian street photography --ar 3:2 --s 520',
      changes: [
        'Added specific materials (marble, glass, steam) and color contrast (warm/cool)',
        'Removed vague "cozy/cinematic" in favor of describable light and weather',
        'Slightly raised --s for stronger Midjourney aesthetic interpretation',
      ],
    },
  ],
};
