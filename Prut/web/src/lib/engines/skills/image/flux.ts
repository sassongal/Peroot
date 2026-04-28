import type { PlatformSkill } from "../index";

export const skill: PlatformSkill = {
  platform: "flux" as const,
  name: "FLUX.2 Pro",
  examples: [
    {
      concept: "דוגמנית אופנה בגשם",
      output:
        "A tall woman in her mid-20s wearing an oversized #1A1A2E trench coat and #C0392B crimson leather boots, standing in the middle of a rain-drenched Tokyo crosswalk at night, neon signs reflected in puddles around her feet, shot on Sony A7IV, 85mm lens, f/1.8, rain droplets frozen mid-air, editorial fashion photography, Kodak Portra 800 film grain, cinematic color grading with teal shadows and amber highlights",
      category: "fashion",
    },
    {
      concept: "שעון יוקרתי על רקע כהה",
      output:
        "A luxury mechanical wristwatch with a #0D1B2A midnight blue dial and rose gold hands, displayed at a slight angle on a slab of raw black obsidian, the open caseback revealing intricate gears and springs, single directional studio light from upper left creating a dramatic specular highlight on the sapphire crystal, shot on Phase One IQ4, 120mm macro lens, f/5.6, product photography, ultra-sharp focus stacking, #F5F5DC cream lume dots glowing subtly",
      category: "product",
    },
    {
      concept: "רחוב שוק ישן בירושלים",
      output:
        "A narrow cobblestone alley in the Old City Jerusalem market, morning light cutting diagonally between ancient limestone walls, a vendor arranging pyramids of #FF6B35 turmeric and #8B0000 sumac spices in brass bowls, hanging fabric in #1B4332 emerald and #FFD700 gold sways overhead, shot on Leica M11, 35mm Summicron, f/4, street photography, natural daylight, warm earth tones, shallow depth of field blurring distant archway",
      category: "street",
    },
    {
      concept: "טיפת מים על עלה",
      output:
        "Extreme macro of a single water droplet balanced on the tip of a #2D6A4F deep green leaf, the droplet acting as a lens refracting an inverted garden scene within it, morning dew scattered across the leaf surface, shot on Canon EOS R5, Laowa 100mm macro lens, f/2.8, focus stacking, translucent leaf veins backlit by soft #FFF8DC warm sunlight, studio-quality natural lighting, botanical photography",
      category: "macro",
    },
    {
      concept: "אדם מורכב מאלפי ציפורים",
      output:
        "A human silhouette composed entirely of thousands of small origami paper cranes in a gradient from #FFFFFF white at the head to #1A1A2E deep navy at the feet, the figure standing in a T-pose with arms extended, cranes at the edges breaking away and taking flight into an empty #F0F0F0 light gray background, conceptual art photography, clean minimalist composition, shot on Hasselblad X2D, 45mm lens, f/8, even studio lighting, surreal and poetic",
      category: "abstract",
    },
    {
      concept: "פורטרט רחוב של מוזיקאי זקן",
      output:
        "An elderly street musician with deep wrinkles and warm brown eyes playing a battered #8B4513 wooden violin on a Parisian bridge at dusk, his fedora tilted slightly, a #C0C0C0 silver stubble catching the last orange light, shot on Fujifilm X-T5, 56mm f/1.2, shallow depth of field, the Seine River and city lights bokeh behind him, candid documentary portrait, Fujifilm Classic Chrome film simulation",
      category: "portrait",
    },
    {
      concept: "עוגת שוקולד מפוארת",
      output:
        "A three-layer dark chocolate cake with glossy #2C1810 ganache dripping down the sides, topped with fresh #FF2D2D raspberries and edible #FFD700 gold leaf, placed on a #F5F5F0 marble cake stand, a slice cut away revealing rich fudgy layers, shot on Canon EOS R5, 100mm macro lens, f/4, overhead soft diffused studio light, editorial food photography, shallow depth of field on background scattered cocoa powder",
      category: "food",
    },
    {
      concept: "חוף ים בשקיעה מהאוויר",
      output:
        "Aerial drone shot looking straight down at a crescent-shaped beach where #1A8FA0 turquoise waves meet #F5DEB3 golden sand, long shadows of palm trees stretching across the shoreline, a lone surfer paddling out leaving a white wake trail, shot on DJI Mavic 3 Cine, Hasselblad lens, f/5.6, late afternoon golden light, landscape photography, warm Mediterranean color palette, the ocean gradient deepening to #003366 navy at the horizon",
      category: "landscape",
    },
    {
      concept: "רובוט עתידני בעיר",
      output:
        "A humanoid robot with a sleek #E0E0E0 polished titanium chassis and glowing #00FFAA cyan optical sensors walking through a rain-slicked neon-lit cyberpunk street, holographic advertisements in #FF00FF magenta and #00BFFF blue reflecting off its surface, shot on Sony A1, 24mm f/1.4, street level perspective, volumetric fog from steam vents, science fiction editorial photography, Blade Runner atmosphere",
      category: "sci-fi",
    },
    {
      concept: "חדר שינה בוהמייני עם צמחים",
      output:
        "A bohemian bedroom with #F5F0E8 whitewashed walls and a low wooden bed draped in #D4A373 terracotta linen, macrame plant hangers holding cascading pothos and string of pearls, a rattan peacock chair in the corner with a stack of vintage books, morning light streaming through sheer curtains casting long shadows, shot on Sony A7III, 24mm f/2.8, interior design photography, warm earthy tones, #5C4033 walnut wood accents throughout",
      category: "interior",
    },
    {
      concept: "ילד עם בועות סבון בפארק",
      output:
        "A joyful five-year-old girl with curly #3D2B1F brown hair blowing iridescent soap bubbles in a sun-dappled park, each bubble catching rainbow reflections, her #FF6B6B coral sundress bright against the #4A7C59 deep green grass, laughter frozen mid-expression, shot on Nikon Z9, 85mm f/1.4, golden hour backlight creating a warm halo around her hair, candid childhood photography, Kodak Portra 400 color science",
      category: "emotion",
    },
    {
      concept: "שער כניסה למקדש יפני",
      output:
        "A traditional Japanese torii gate in #FF3300 vermillion red standing at the entrance to a forest shrine, moss-covered stone steps ascending into mist, ancient cedar trees flanking the path with #5D4E37 weathered brown bark, stone lanterns covered in lichen lining the walkway, shot on Fujifilm GFX 100S, 45mm f/4, overcast soft diffused light, architectural photography, subtle #90A955 sage green moss tones contrasting the vibrant gate",
      category: "architecture",
    },
    {
      concept: "בקבוק מוצר עם צבע מותג מדויק",
      output:
        '{"subject": "a cylindrical glass water bottle with matte brushed aluminum cap", "color": "bottle body in #1A6B4A forest green, cap in #C0C0C0 brushed silver", "lighting": "single soft diffused overhead key light, gentle fill from the left, clean white studio background", "camera": "slightly elevated 3/4 angle, 85mm equivalent lens, shallow depth of field", "style": "product photography, clean editorial, e-commerce ready"}',
      category: "product",
    },
  ],
  mistakes: [
    {
      bad: "a woman in rain, beautiful, fashion, neon lights, cinematic",
      good: "A tall woman in her mid-20s wearing an oversized #1A1A2E trench coat, standing in rain-drenched Tokyo crosswalk at night, shot on Sony A7IV, 85mm lens, f/1.8, editorial fashion photography, Kodak Portra 800 film grain",
      why: 'FLUX requires subject-first structure with specific details. Vague adjectives like "beautiful" and "cinematic" produce generic results. Lead with the subject, then add technical camera specs.',
    },
    {
      bad: "luxury watch on dark background, no reflections, no dust, no scratches",
      good: "A luxury mechanical wristwatch with a #0D1B2A midnight blue dial displayed on raw black obsidian, single directional studio light from upper left, shot on Phase One IQ4, 120mm macro lens, f/5.6, product photography",
      why: 'FLUX does not support negative prompts. There is no "no X" or negative prompt syntax. Describe only what you want to see — the model cannot process exclusions.',
    },
    {
      bad: "Close-up of a leaf with water drops. Green. Macro.",
      good: "Extreme macro of a single water droplet balanced on the tip of a #2D6A4F deep green leaf, the droplet refracting an inverted garden scene, shot on Canon EOS R5, Laowa 100mm macro lens, f/2.8, focus stacking, translucent leaf veins backlit by #FFF8DC warm sunlight",
      why: "Wrong word order and missing camera specs. FLUX works best with subject-first descriptions (30-80 words) followed by specific camera, lens, and aperture details. Short fragments produce flat results.",
    },
    {
      bad: "a cat, orange fur, sitting, window, rain, cozy, warm lighting, bokeh background, 8k, ultra HD, best quality, masterpiece",
      good: "A fluffy orange tabby cat sitting on a windowsill watching rain stream down glass, warm interior lamplight reflecting in droplets, shot on Sony A7IV, 85mm f/1.4, shallow depth of field, cozy domestic scene, Fujifilm Velvia color tones",
      why: 'Quality boosters like "8k, ultra HD, best quality, masterpiece" are Stable Diffusion conventions and have no effect in FLUX. Use realistic camera/lens specifications instead to control quality and style.',
    },
  ],
  scoringCriteria: [
    "Subject-first ordering — most important element leads the prompt",
    "30–80 words of dense, specific description (FLUX rewards precision)",
    "Camera + lens + aperture when photoreal (e.g., 85mm f/1.8, full-frame)",
    "Hex codes for critical colors bound to objects (#F4E8D1 skin tone, #1B263B shadow)",
    "Quoted in-image text if lettering must appear",
    'No negative-prompt syntax — FLUX ignores "no X" lists',
    'Avoid SD-style "masterpiece/best quality" spam; use real gear and light instead',
    "Motion or material physics when relevant (wet skin, brushed metal)",
    "Single coherent scene — not a list of unrelated keywords",
    "Optional model variant hint (Pro/Ultra/Dev) only if product flow requires it",
    'JSON format for precise multi-axis control: {"subject", "camera", "lighting", "style", "color"}',
    "HEX color matching: attach #RRGGBB hex codes to specific objects for exact brand colors",
    "Natural prose for creative freedom; JSON structure for product/commercial precision",
  ],
  chainOfThoughtExamples: [
    {
      concept: "מקרוב למזון עם טקסטורות",
      reasoning:
        "Macro food needs focal length, aperture for depth, and light direction. Lead with hero ingredient; specify steam, oil sheen, crumbs. Hex for sauce and plate.",
      output:
        "A fork lifting glossy pappardelle coated in #5C1A1B deep red ragu, fine Parmesan snow on the tines, shallow steam rising into soft side light, dark slate plate with #2A2A2A rim, shot on Sony A7IV, 90mm macro f/4, focus on sauce texture",
    },
    {
      concept: "דיוקן סטודיו מינימליסטי",
      reasoning:
        "Portrait: subject pose + wardrobe fabric + background color as hex. Key vs fill ratio in words. 50–85mm language for compression.",
      output:
        "A woman with slicked-back hair in a charcoal #2C2C2C wool blazer, shoulders squared to camera, soft butterfly lighting with subtle shadow under cheekbones, seamless #E8E4E1 backdrop, shot on Canon R5, 85mm f/2, crisp commercial portrait",
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: "Sports car, red, night city, cinematic, fast",
      afterPrompt:
        "A low wide-body sports car in #C41E3A metallic red idles under elevated train tracks at night, wet asphalt mirrors cyan storefront glow, single overhead practical casts a narrow pool of light on the hood, shot on ARRI Alexa look, 35mm lens, light rain beads on carbon fiber",
      changes: [
        "Added palette hooks (hex red), environment specificity, and wet-surface physics",
        'Replaced "cinematic/fast" with describable light and lens',
      ],
    },
    {
      iteration: 2,
      beforePrompt: "Forest path, morning, peaceful, trees",
      afterPrompt:
        "A narrow dirt path curves through towering coastal redwoods at dawn, low fog threads between trunks, sun shafts cut through canopy haze, ferns glistening with dew in foreground, shot on Nikon Z9, 24mm f/2.8, vertical depth layers",
      changes: ["Specified time (dawn), moisture (fog/dew), and focal length for scale"],
    },
  ],
};
