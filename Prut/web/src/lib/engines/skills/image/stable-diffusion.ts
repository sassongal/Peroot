import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'stable-diffusion' as const,
  name: 'Stable Diffusion XL / SD3.5',
  examples: [
    {
      concept: 'לוחמת אנימה עם חרב אנרגיה',
      output:
        '(anime warrior girl:1.4), long flowing silver hair with (glowing blue tips:1.2), wearing intricate black and gold battle armor, holding a (translucent energy katana:1.3) emanating cyan light, dynamic action pose mid-leap, cherry blossom petals swirling around her, dramatic backlighting, dark crimson sky, (anime cel shading:1.2), vibrant colors, detailed eyes, masterpiece, best quality, highly detailed, sharp focus\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, realistic, photo, 3d, bad anatomy, extra fingers\nRecommended: sampler Euler a, steps 25, CFG 6, clip skip 2',
      category: 'fantasy',
    },
    {
      concept: 'אישה על חוף ים בשקיעה',
      output:
        '(beautiful young woman:1.3), long auburn hair blowing in ocean breeze, wearing flowing white linen dress, standing barefoot on wet sand, (golden hour:1.4), dramatic sunset with orange and purple clouds reflected in shallow tidepool, volumetric god rays, waves gently washing over her feet, (photorealistic:1.3), skin pores, freckles, natural skin texture, Canon EOS R5, 85mm f/1.4, shallow depth of field, bokeh, masterpiece, best quality, highly detailed, RAW photo, 8K\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, painting, illustration, anime, cartoon, extra fingers, mutated hands, bad anatomy\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      category: 'portrait',
    },
    {
      concept: 'עיר עתידנית צפה באוויר',
      output:
        '(floating cyberpunk city:1.4), massive platforms suspended by (anti-gravity engines with blue plasma:1.2), interconnected by glass sky-bridges and light rail, (bioluminescent gardens:1.3) hanging from undersides, holographic billboards projecting neon advertisements, flying vehicles weaving between towers, dramatic sunset sky with two moons visible, (digital matte painting:1.3), concept art, volumetric lighting, atmospheric perspective, epic scale, hyper-detailed architecture, masterpiece, best quality, highly detailed\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, simple, flat, boring, empty sky\nRecommended: sampler DPM++ 2M Karras, steps 40, CFG 8, clip skip 1',
      category: 'sci-fi',
    },
    {
      concept: 'דרקון ענק בתוך מערה של קריסטלים',
      output:
        '(enormous ancient dragon:1.4) coiled around a mountain of gold coins inside a (vast crystal cavern:1.3), scales iridescent deep emerald and obsidian, (glowing amber eyes:1.2), steam rising from nostrils, massive crystalline formations in purple and blue refracting the dragon\'s internal fire glow, stalactites dripping, scattered gemstones and ancient artifacts, (epic fantasy illustration:1.3), dramatic chiaroscuro lighting, D&D concept art style, rich saturated colors, masterpiece, best quality, highly detailed, sharp focus, <lora:add_detail:0.7>\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, photorealistic, photo, simple background\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      category: 'fantasy',
    },
    {
      concept: 'תחנת חלל מעל כדור הארץ',
      output:
        '(massive orbital space station:1.4), ring-shaped rotating habitat section with visible interior greenery through panoramic windows, (Earth rising in background:1.3), solar panel arrays extending like golden wings, docked spacecraft with running lights, (hard science fiction:1.2), realistic spacecraft design, lens flare from distant sun, stars visible in deep black void, subtle blue atmospheric glow on Earth\'s limb, NASA concept art style, technical precision, masterpiece, best quality, highly detailed, sharp focus, 8K\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, cartoon, anime, fantasy, magic, unrealistic proportions\nRecommended: sampler DDIM, steps 40, CFG 8, clip skip 1',
      category: 'sci-fi',
    },
    {
      concept: 'טבע דומם עם פירות ויין',
      output:
        '(classical still life:1.4), an ornate wooden table draped with (deep burgundy velvet cloth:1.2), overflowing silver fruit bowl with grapes, pomegranates, figs, and a halved peach, a half-filled crystal wine glass catching warm candlelight, (Dutch Golden Age painting style:1.3), dramatic chiaroscuro, Vermeer-like light from a single window on the left, visible brushstrokes, oil on canvas texture, rich warm tones, masterpiece, best quality, highly detailed\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, photorealistic, photo, modern, plastic\nRecommended: sampler DPM++ 2M Karras, steps 30, CFG 7, clip skip 1',
      category: 'food',
    },
    {
      concept: 'נוף הרים יפני עם פריחת דובדבן',
      output:
        '(breathtaking Japanese mountain landscape:1.3), Mount Fuji in the distance with snow cap, foreground of (cherry blossom trees in full bloom:1.4), soft pink petals drifting in gentle wind, a traditional wooden bridge over a calm stream, (ukiyo-e inspired:1.2) with photorealistic details, morning mist in the valley, volumetric god rays, golden hour warm light, (landscape photography:1.3), Canon 24mm f/8, masterpiece, best quality, highly detailed, sharp focus, 8K\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, people, cars, modern buildings, power lines\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      category: 'landscape',
    },
    {
      concept: 'חנות ספרים עתיקה מבפנים',
      output:
        '(cozy antique bookshop interior:1.4), floor-to-ceiling mahogany shelves packed with (leather-bound volumes:1.2), a rolling library ladder, warm yellow light from green banker lamps and dusty sunbeams through a bay window, a worn leather armchair with a reading blanket, stacked books on every surface, a sleeping ginger cat on a pile of books, (Victorian era atmosphere:1.3), rich warm tones, detailed textures, architectural interior photography, masterpiece, best quality, highly detailed\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, modern furniture, minimalist, empty, clean\nRecommended: sampler DPM++ 2M Karras, steps 30, CFG 7, clip skip 1',
      category: 'interior',
    },
    {
      concept: 'רקדנית פלמנקו בתנועה',
      output:
        '(flamenco dancer:1.4) in a dramatic spin, (flowing red and black ruffled dress:1.3) caught mid-swirl creating a spiral of fabric, arms raised in passionate expression, (motion blur on dress edges:1.2), wooden stage floor, dramatic single spotlight from above, dark background, scattered rose petals, visible sweat and intensity, (fine art dance photography:1.3), high contrast, cinematic lighting, Canon 70-200mm f/2.8, masterpiece, best quality, highly detailed, sharp focus\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, extra limbs, bad anatomy, stiff pose, mannequin\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      category: 'action',
    },
    {
      concept: 'פורטרט אישה בסגנון אר נובו',
      output:
        '(Art Nouveau portrait:1.4) of a woman with (flowing auburn hair intertwined with golden vines and lilies:1.3), decorative ornamental border with organic curved lines and floral motifs, soft pastel background in muted sage and cream, (Alphonse Mucha style:1.3), intricate linework, subtle watercolor washes, jewel-toned accents of emerald and amber, elegant and ethereal expression, masterpiece, best quality, highly detailed, illustration, <lora:alphonse_mucha:0.6>\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, photorealistic, photo, modern, harsh colors\nRecommended: sampler Euler a, steps 30, CFG 7, clip skip 2',
      category: 'editorial',
    },
    {
      concept: 'רחוב ביפן בלילה עם גשם',
      output:
        '(rainy Tokyo street at night:1.4), narrow alley in Shinjuku with glowing (neon signs in Japanese kanji:1.2), wet asphalt reflecting a kaleidoscope of red, blue, and yellow light, a lone figure with a transparent umbrella walking away, steam rising from a ramen shop entrance, vending machines glowing in the corner, (cyberpunk atmosphere:1.2), photorealistic, Blade Runner vibes, shot on Sony A7III, 35mm f/1.4, masterpiece, best quality, highly detailed, RAW photo\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, daytime, sunny, dry, western\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      category: 'street',
    },
    {
      concept: 'פרפר על פרח בצילום מאקרו',
      output:
        '(extreme macro photography:1.4), a (blue morpho butterfly:1.3) perched on a dewy red rose, iridescent wing scales visible at microscopic detail, each tiny scale reflecting light differently, water droplets on petals acting as tiny lenses, (focus stacking:1.2), creamy green bokeh background, warm morning backlight creating a golden rim on the butterfly, Canon MP-E 65mm at 5x magnification, masterpiece, best quality, highly detailed, sharp focus, 8K\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, painting, illustration, flat, simple background\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      category: 'macro',
    },
    {
      concept: 'פרסומת לבושם יוקרתי',
      output:
        '(luxury perfume advertisement:1.4), an elegant crystal perfume bottle with (amber liquid catching light:1.3) on a slab of white marble, surrounded by scattered fresh rose petals and a sprig of jasmine, (golden hour warm light:1.2) from the side creating long dramatic shadows, particles of gold dust floating in the air, soft gradient background from cream to deep plum, (commercial product photography:1.3), Phase One 120mm macro, masterpiece, best quality, highly detailed, sharp focus\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, cheap, plastic, cluttered background\nRecommended: sampler DPM++ 2M Karras, steps 30, CFG 7, clip skip 1',
      category: 'commercial',
    },
  ],
  mistakes: [
    {
      bad: '(beautiful woman:1.3), long hair, blue eyes, studio lighting, photorealistic\nNegative prompt:\nRecommended: sampler Euler a, steps 20, CFG 7',
      good: '(beautiful woman:1.3), long auburn hair, striking blue eyes, soft Rembrandt studio lighting, skin pores, natural texture, Canon 85mm f/1.4, shallow depth of field, masterpiece, best quality, highly detailed, RAW photo\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, bad anatomy, extra fingers\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      why: 'Empty negative prompt is a critical mistake. The negative prompt is essential in Stable Diffusion to exclude common artifacts like bad anatomy, watermarks, and low quality. Always include it.',
    },
    {
      bad: '(woman:2.5), (beautiful:3.0), (perfect:2.8), ultra detailed, 8K, masterpiece',
      good: '(beautiful young woman:1.3), flowing dark hair, warm smile, soft natural light, garden background with roses, (portrait photography:1.2), Canon 85mm f/1.4, masterpiece, best quality, highly detailed',
      why: 'Weights above 1.5 cause severe distortion and artifacts. Keep emphasis weights between 1.1-1.5 for natural-looking results. Excessive weights fight against each other and produce incoherent images.',
    },
    {
      bad: '(portrait photo:1.3), woman in park\nNegative prompt: bad quality\nRecommended: sampler LMS, steps 10, CFG 15',
      good: '(portrait photo:1.3), woman in park, golden hour, soft backlight\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, bad anatomy\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      why: 'Wrong sampler and generation settings. LMS is outdated, 10 steps is too few for quality, and CFG 15 is too high causing oversaturation. Use DPM++ 2M Karras with 25-40 steps and CFG 5-8.',
    },
    {
      bad: 'A beautiful scenic mountain landscape with snow and a lake reflecting the mountains, shot during golden hour with dramatic clouds, hyperrealistic, 8K resolution, award-winning photography',
      good: '(alpine mountain landscape:1.3), snow-capped peaks reflected in (mirror-still lake:1.2), golden hour, dramatic cumulus clouds, volumetric god rays, (landscape photography:1.3), Canon 16-35mm f/8, masterpiece, best quality, highly detailed, sharp focus, 8K\nNegative prompt: worst quality, low quality, blurry, watermark, text, people, cars, power lines\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
      why: 'Writing in natural prose sentences ignores SD\'s strength. Stable Diffusion uses a CLIP text encoder that responds best to weighted keyword phrases with commas, not flowing paragraphs. Structure as comma-separated descriptors with (emphasis:weight) syntax.',
    },
  ],
  scoringCriteria: [
    'Comma-separated tags with clear emphasis (word:1.2) — not long prose paragraphs',
    'Quality tokens: masterpiece, best quality, highly detailed where appropriate',
    'Negative prompt covers anatomy, blur, watermark, text, extra limbs',
    'Weights stay ≤1.5 per token to avoid artifact wars',
    'Sampler + steps + CFG in a sensible band (DPM++ 2M Karras, 25–40 steps, CFG 5–8)',
    'clip skip noted when using certain checkpoints',
    'LoRA syntax <lora:name:weight> when style must lock to a trained adapter',
    'Hires fix / upscale mentioned only if workflow needs it',
    'Subject, style, lighting, and background each get tag coverage',
    'Recommended resolution matches model (SDXL vs 1.5) when giving JSON width/height',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'דיוקן SDXL עם רקע סטודיו',
      reasoning:
        'SD wants weighted tags: subject, clothing, lighting setup, lens look. Separate line for Negative prompt. Recommend realistic CFG and steps.',
      output:
        '(professional portrait:1.3), young woman, freckles, red hair in loose waves, soft Rembrandt lighting, dark grey seamless backdrop, 85mm lens bokeh, sharp focus on eyes, masterpiece, best quality, highly detailed skin texture\nNegative prompt: worst quality, low quality, blurry, deformed hands, extra fingers, watermark, text\nRecommended: sampler DPM++ 2M Karras, steps 30, CFG 7, clip skip 1',
    },
    {
      concept: 'נוף פנטזיה עם משקלים',
      reasoning:
        'Emphasize sky and mountains separately; keep weights moderate. Add atmospheric tags (volumetric, mist).',
      output:
        '(fantasy landscape:1.25), jagged peaks, glowing aurora ribbons, moonlit glacier, mist in valley, (dramatic clouds:1.15), wide angle, epic scale, highly detailed, sharp focus\nNegative prompt: blurry, low quality, oversaturated, people, text, watermark\nRecommended: sampler DPM++ SDE Karras, steps 35, CFG 6.5',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        '(girl:1.8), anime, cute, best quality',
      afterPrompt:
        '(young woman:1.25), anime style, large expressive eyes, pastel pink hair in twin tails, school uniform with ribbon tie, soft cel shading, cherry blossom petals, spring daylight, masterpiece, best quality, highly detailed\nNegative prompt: worst quality, low quality, blurry, deformed, extra limbs, watermark, text',
      changes: [
        'Lowered destructive weights; expanded subject and scene tags',
        'Added full negative prompt line',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'dragon, castle, epic',
      afterPrompt:
        '(massive dragon:1.3) perched on (stone castle tower:1.2), storm clouds with lightning forks, fire glow on scales, aerial wide angle, cinematic lighting, highly detailed scales and masonry, masterpiece, best quality\nNegative prompt: blurry, low quality, cartoon, watermark, text, modern objects',
      changes: [
        'Split subjects with weights; added weather and light for coherence',
      ],
    },
  ],
};
