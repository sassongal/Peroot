import type { PlatformSkill } from "../index";

export const skill: PlatformSkill = {
  platform: "dalle" as const,
  name: "GPT Image (gpt-image-2)",
  examples: [
    {
      concept: "שלט ניאון של בית קפה בלילה",
      output:
        'A rain-soaked city street at night, dominated by a vintage neon sign reading "CAFE LUNA" in elegant cursive script glowing warm pink and soft white against the dark facade of a 1920s Art Deco building. Raindrops catch the neon reflections on the wet cobblestones below, creating streaks of rose and amber light. A lone figure with an umbrella approaches the entrance, silhouetted against the glow. The rest of the street recedes into moody blue darkness with distant warm windows. Cinematic noir atmosphere, the neon lettering is crisp and perfectly rendered with a subtle halo. In a vivid style, photorealistic with film grain and anamorphic lens flare. [size: 1792x1024] [quality: high]',
      category: "street",
    },
    {
      concept: "פורטרט אישה עם פרחים בשיער",
      output:
        "A striking close-up portrait of a young woman with rich dark skin and high cheekbones, her hair elaborately adorned with fresh white gardenias, deep burgundy dahlias, and trailing green ivy woven through thick natural curls. Her expression is serene and regal, eyes gazing slightly off-camera with quiet confidence. Soft golden light from the left illuminates the petals and creates delicate catchlights in her brown eyes. The background is a smooth gradient of deep emerald green to shadow. Color palette: ivory, burgundy, forest green, warm bronze. Painted in the tradition of Renaissance portraiture reimagined through a contemporary African lens. In a natural style, fine art portrait photography with shallow depth of field. [size: 1024x1792] [quality: high]",
      category: "portrait",
    },
    {
      concept: "עולם הפוך עם עצים מרחפים",
      output:
        "A surreal landscape where gravity has inverted: massive ancient oak trees float upside-down in a lavender sky, their root systems exposed and tangled like chandeliers, while their canopies form islands of green suspended above an endless reflective salt flat. A small child in a red raincoat stands at the center looking upward in wonder, casting a long shadow. Jellyfish-like luminous orbs drift between the floating trees. The horizon line blurs between sky and ground, creating a disorienting dreamscape. Warm amber and cool violet tones clash beautifully. In a vivid style, inspired by Rene Magritte meets Studio Ghibli, painterly digital illustration with soft edges and atmospheric perspective. [size: 1792x1024] [quality: high]",
      category: "fantasy",
    },
    {
      concept: "סושי מושלם על צלחת שחורה",
      output:
        "An exquisite omakase sushi plate: eight pieces of nigiri arranged in a gentle arc on a handmade black ceramic plate with an uneven, organic rim. Each piece is a tiny sculpture — translucent salmon belly glistening with a brushstroke of nikiri glaze, ruby-red tuna, pearlescent hirame, and a torch-kissed otoro with caramelized fat. A small mound of freshly grated wasabi and pickled ginger sit at one end. The plate rests on a warm hinoki cypress counter, a single pair of ebony chopsticks beside it. Dramatic top-down studio lighting with deep shadows and a single overhead spot highlighting the fish. Color palette: obsidian, coral, pearl, warm cedar. In a natural style, editorial food photography with extreme sharpness and rich textures. [size: 1024x1024] [quality: high]",
      category: "food",
    },
    {
      concept: "אינפוגרפיק: שלבי פיתוח אפליקציה",
      output:
        'A clean vertical infographic titled "App Development Lifecycle" in bold dark navy sans-serif across the top. Six numbered stages flow downward connected by thin arrows: 1. Discovery (magnifying glass icon), 2. Design (pencil icon), 3. Development (code brackets icon), 4. Testing (bug icon), 5. Launch (rocket icon), 6. Maintenance (gear icon). Each stage has a two-line description in 11pt gray text. Background is crisp white with a thin #E5E7EB border. Accent color: #2563EB electric blue for stage numbers and icons. Typography: stage titles in 14pt semibold dark navy, descriptions in 11pt regular gray. Clean corporate style, generous whitespace, print-ready infographic layout. [size: 1024x1792] [quality: high]',
      category: "commercial",
    },
    {
      concept: "קומיקס 4 פאנלים: חתול שונא ימי שני",
      output:
        "A 4-panel comic strip arranged in a 2x2 grid with clean black panel borders. Panel 1: A chubby orange tabby cat asleep on a couch, alarm clock shows 6AM Monday, speech bubble reads \"NO.\". Panel 2: Same cat dragging itself off the couch, eyes barely open, a tiny dark storm cloud over its head. Panel 3: Cat staring at a full food bowl with existential dread, tail drooping. Panel 4: Cat back on the couch wrapped in a blanket at 6:05AM, speech bubble reads \"Nope.\". Consistent character — same orange tabby with white chest patch and sleepy green eyes across all panels. Friendly cartoon illustration style, warm Sunday-paper palette of cream, orange, and ink black. [size: 1024x1024] [quality: high]",
      category: "fantasy",
    },
    {
      concept: "פוסטר אירוע בעברית ואנגלית",
      output:
        'A printed event poster held at a slight angle against a dark walnut table. Upper third: bold geometric Hebrew headline "השקה רשמית" in 48pt white letters. Center: English subtitle "Official Launch Event" in 24pt clean sans-serif italic below. Date line "יום חמישי, 15.5.2026 | 18:00" in 18pt amber. Abstract geometric gold foil diamonds frame the text on deep navy background. Bottom billing: venue name "TLV Design Hub" and website URL in small 10pt white. Typography crisp and fully legible in both scripts. Print texture visible on the paper surface, soft studio light with a gentle drop shadow. [size: 1024x1792] [quality: high]',
      category: "commercial",
    },
    {
      concept: "אסטרונאוט על כוכב זר",
      output:
        "A lone astronaut in a weathered white spacesuit standing on the surface of an alien planet, looking up at a sky filled with three overlapping moons in different phases and a massive ringed gas giant dominating the horizon. The terrain is covered in translucent crystalline formations that glow faintly turquoise from within, casting colored light on the astronaut's visor. Footprints trail behind through fine violet dust. In the far distance, a slender alien structure rises like a needle into the atmosphere. The scene is bathed in a warm amber light from the system's red dwarf star low on the horizon. In a vivid style, cinematic science fiction concept art with volumetric atmospheric haze. [size: 1792x1024] [quality: high]",
      category: "sci-fi",
    },
    {
      concept: "תפריט מסעדה יפנית",
      output:
        'A beautifully designed Japanese restaurant menu page, photographed flat-lay on a dark slate surface. Page header reads "OMAKASE MENU" in hand-brushed calligraphy above the Japanese "おまかせ" in smaller text. Three sections with clean dividers: Starters — "Edamame ¥800", "Miso Soup ¥600"; Mains — "Tuna Tataki ¥2,400", "Wagyu Shabu ¥4,800"; Desserts — "Mochi Ice Cream ¥900". All text fully legible, no spelling errors. Prices in clean tabular alignment. Paper texture is handmade washi with faint fibrous grain. Ink is deep sumi black. Sparse bamboo sprig watermark in bottom corner. [size: 1024x1792] [quality: high]',
      category: "commercial",
    },
    {
      concept: "נוף הרים עם אגם בשקיעה",
      output:
        "A panoramic mountain landscape at the golden hour: jagged snow-dusted peaks reflected perfectly in a mirror-still alpine lake, the water surface broken only by a single canoe with a tiny silhouetted figure paddling. The sky transitions from deep coral at the horizon through peach and lavender to a deepening indigo above. Wildflowers — lupines in purple and Indian paintbrush in scarlet — carpet the foreground shore. A thin veil of mist hovers just above the water. The scene has an almost spiritual stillness to it. In a natural style, fine art landscape photography with extreme depth of field and rich dynamic range. [size: 1792x1024] [quality: high]",
      category: "landscape",
    },
    {
      concept: "פרפר מאקרו על פרח",
      output:
        "An extreme close-up of a monarch butterfly perched on a dewy purple coneflower, its wings spread to reveal the intricate pattern of black veins against brilliant orange, each tiny scale visible. The butterfly's curled proboscis probes the flower's golden center. Behind it, the garden dissolves into a dreamy wash of soft green and yellow bokeh. Individual dewdrops cling to the flower petals, each one a tiny lens reflecting the morning sky. The light is soft, diffused, and warm from behind. In a natural style, macro nature photography with focus stacking for pin-sharp detail across the wings and flower. [size: 1024x1024] [quality: high]",
      category: "macro",
    },
    {
      concept: "בקבוק בושם על רקע שקוף",
      output:
        "An elegant crystal perfume bottle with a rose-gold cap, containing pale champagne liquid, photographed against a transparent background. The bottle casts a clean shadow to the lower right. Faceted glass surfaces refract a subtle spectrum of light. Product shot with studio lighting — a single soft box from the upper left, minimal fill. The image is suitable for e-commerce or packaging placement. Background: transparent PNG. [size: 1024x1024] [quality: high]",
      category: "product",
    },
  ],
  mistakes: [
    {
      bad: "neon sign, cafe, night, rain, street, moody",
      good: 'A rain-soaked city street at night, dominated by a vintage neon sign reading "CAFE LUNA" glowing warm pink against a dark Art Deco facade. Raindrops catch neon reflections on wet cobblestones, creating streaks of amber light. Cinematic noir atmosphere. [size: 1792x1024] [quality: high]',
      why: "gpt-image-2 requires rich prose sentences, not keyword lists. Short keyword prompts produce generic, flat results. Describe the scene as if writing a paragraph of a novel.",
    },
    {
      bad: 'A poster that says "SALE 50% OFF" with product images.',
      good: 'A clean retail promotional poster. Large centered headline text reading "SALE — 50% OFF" in bold white sans-serif on a deep red background. Below it, three product silhouettes arranged in a row. Fine print line at the bottom: "Valid through Sunday. In-store only." Vivid and eye-catching. [size: 1024x1024] [quality: high]',
      why: "gpt-image-2 renders multi-line text with 99% accuracy — no need for Canva post-processing. Describe the exact text, font character, color, and placement; the model renders it verbatim, including fine print.",
    },
    {
      bad: "A beautiful mountain landscape [quality: high]",
      good: "A panoramic view of jagged snow-capped peaks reflected in a mirror-still alpine lake at golden hour, wildflowers carpeting the foreground shore, thin mist hovering above the water, fine art landscape photography with extreme depth of field. [size: 1792x1024] [quality: high]",
      why: "Vague short prompts waste gpt-image-2's strength. The model excels with detailed, specific descriptions of lighting, composition, color palette, and atmosphere. Aim for 50-120 words of rich description.",
    },
    {
      bad: "photo of a cat, 4k, ultra realistic, 8k resolution, unreal engine, octane render --ar 16:9",
      good: "A regal Maine Coon cat with a luxurious silver-gray mane sitting on a velvet cushion by a frosted window, soft winter light illuminating each whisker, shallow depth of field with creamy bokeh. In a natural style, intimate pet portrait photography. [size: 1792x1024] [quality: high]",
      why: 'gpt-image-2 ignores technical jargon like "4k, 8k, octane render" and does not support Midjourney-style parameters (--ar). Use [size:] and [quality: low/medium/high] tags instead, and describe visual qualities in natural language.',
    },
    {
      bad: "An infographic about global warming with statistics and charts.",
      good: 'A clean infographic titled "Global Temperature Rise 2000–2024" in bold dark-red sans-serif. A line chart shows a rising curve from +0.4°C to +1.2°C with labeled years at 2000, 2010, 2020, 2024. Three stat callouts: "+1.2°C above pre-industrial average", "2023: hottest year on record", "Arctic warming 4× faster". Color palette: cream background, dark red data line, sky-blue axis labels. Clean editorial style, all text fully legible. [size: 1792x1024] [quality: high]',
      why: "gpt-image-2 excels at data visualizations and infographics — but you must specify exact text, numbers, and layout. Vague content descriptions produce hallucinated statistics; spell out every data point.",
    },
  ],
  scoringCriteria: [
    "50–120 words of rich prose — scene, lighting, composition, palette, mood",
    "[size: WxH] matches intent — square (1024x1024), landscape (1792x1024), portrait (1024x1792), or flexible 3:1–1:3 for wide/tall formats",
    "[quality: high] for dense text, infographics, portraits; [quality: medium] for social assets; [quality: low] for drafts",
    'Style phrase: "In a vivid style" (dramatic, hyper-real) vs "In a natural style" (organic, photographic)',
    "If text appears in-image: put literal copy in QUOTES or ALL CAPS, specify font character, size, color, and placement — spell unusual words letter-by-letter",
    "No Midjourney-style --flags; gpt-image-2 uses natural language + [size]/[quality] params",
    "Spatial relationships and camera feel (wide shot, close-up, depth of field) described in prose",
    "No copyrighted names — describe appearance, style, and visual essence instead",
    'For edits: state "change only X" + "preserve [face/pose/background/layout]" explicitly to prevent drift',
    "Ending ties the narrative: one cinematic moment, not a bullet list",
    'Transparent PNG: state "transparent background" or "transparent PNG" explicitly when needed',
    'For raw/imperfect look — state explicitly: "add film grain", "rough brush strokes", "hand-drawn feel"',
    "Multi-panel sequences: describe each panel individually with consistent character anchors (same color/features across panels)",
    "Infographics: spell out all numbers, labels, and chart data — never leave data content implicit",
  ],
  chainOfThoughtExamples: [
    {
      concept: "פוסטר אירוע עם טקסט בעברית ואנגלית",
      reasoning:
        "gpt-image-2 renders Hebrew with 90%+ accuracy — specify the exact Hebrew copy, hierarchy (ראשי vs משני), and contrast. Choose portrait [size: 1024x1792] for poster. Describe materials (paper, foil). Both scripts need explicit font character guidance.",
      output:
        'A printed event poster held at a slight angle against a dark walnut table. Bold geometric Hebrew headline "השקה רשמית" in 48pt white across the upper third. English subtitle "Official Launch Event" in 24pt italic below. Date "15.5.2026 | 18:00" in amber. Abstract gold foil shapes frame the text on deep navy background. Small venue URL in 10pt white at the bottom. Typography crisp and fully legible in both scripts. In a vivid style, print texture with soft studio light. [size: 1024x1792] [quality: high]',
    },
    {
      concept: "מוצר לבן על רקע נקי לקטלוג",
      reasoning:
        "Catalog needs material truth: surface (matte ceramic, brushed aluminum), edge highlights, shadow softness. Natural style reduces HDR look. Square [size: 1024x1024] for e-commerce grids. [quality: high] for material sharpness.",
      output:
        "A matte white ceramic pour-over dripper centered on seamless light grey cyclorama, soft three-point studio lighting with subtle contact shadow, 3/4 angle showing interior spiral ribs, minimal catalog aesthetic, razor-sharp focus edge-to-edge. In a natural style, true-to-life product photography. [size: 1024x1024] [quality: high]",
    },
    {
      concept: "קומיקס 4 פאנלים עם דמות עקבית",
      reasoning:
        "Multi-panel needs strong character anchors — repeat specific visual descriptors across all panel descriptions so gpt-image-2 maintains identity. Describe each panel explicitly. 2x2 grid layout in the prompt.",
      output:
        "A 4-panel comic strip in a 2x2 grid with clean black borders. Panel 1: a chubby orange tabby with white chest patch, sleeping, speech bubble \"MONDAY? NO.\". Panel 2: same orange tabby dragging himself off a couch, tiny storm cloud over his head. Panel 3: same tabby staring at a full food bowl, tail drooping. Panel 4: same tabby back under blanket, speech bubble \"Nope.\". Consistent character — orange fur, white chest, sleepy green eyes in every panel. Warm Sunday-paper cartoon palette. [size: 1024x1024] [quality: high]",
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: "A nice coffee cup on a table, morning light, cozy vibe [size: 1024x1024]",
      afterPrompt:
        "A hand-thrown stoneware mug with an uneven glaze rim sits on a pale oak table beside an open notebook, warm side light from a tall window throws long soft shadows across wood grain, shallow depth of field, steam wisps visible against the cooler background. In a natural style, quiet morning editorial. [size: 1024x1024] [quality: high]",
      changes: [
        'Replaced "nice/cozy" with concrete materials and light direction',
        "Added spatial staging (notebook, window direction) and depth of field",
        "Updated to [quality: high] for texture credibility",
      ],
    },
    {
      iteration: 2,
      beforePrompt: "Infographic about social media growth [size: 1792x1024]",
      afterPrompt:
        'A clean infographic titled "Social Media Users 2020–2024" in bold navy sans-serif. Bar chart shows five platforms: Instagram (1.4B → 2.1B), TikTok (0.7B → 1.9B), LinkedIn (0.7B → 1.0B), X (0.3B → 0.6B), Threads (0 → 0.3B). Each bar in a distinct color with exact labels. Three callout stats: "TikTok grew 171%", "Total: 5.9B users", "Mobile-first platforms dominate". White background, thin grid lines, fully legible text, editorial data design. [size: 1792x1024] [quality: high]',
      changes: [
        "Spelled out all data points — never leave chart data implicit with gpt-image-2",
        "Named each bar color distinctly to prevent the model from choosing arbitrary hues",
        "Added specific callout statistics with exact numbers",
      ],
    },
  ],
};
