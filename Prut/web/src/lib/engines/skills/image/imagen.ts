import type { PlatformSkill } from "../index";

export const skill: PlatformSkill = {
  platform: "imagen" as const,
  name: "Imagen 4",
  examples: [
    {
      concept: "משפחה בפיקניק ביער",
      output:
        "A young family of four enjoying a leisurely picnic in a sun-dappled Mediterranean pine forest. The mother, a woman in her early 30s with shoulder-length dark hair and a straw sunhat, laughs as she passes a plate of watermelon slices to her daughter, around age 5, who sits cross-legged on a checkered red and white blanket. The father, bearded and relaxed in a linen shirt, plays guitar while leaning against a thick tree trunk. A toddler boy crawls toward a basket overflowing with bread, cheese, and grapes. Afternoon sunlight filters through the canopy creating warm pools of light and long soft shadows. Pine needles carpet the ground. Lifestyle photography, candid and joyful, warm golden tones. [aspectRatio: 16:9] [exclude: watermark, blurry, deformed]",
      category: "documentary",
    },
    {
      concept: "עורך דין בחדר ישיבות מודרני",
      output:
        "A confident woman in her early 40s wearing a tailored charcoal suit and crisp white blouse, standing at the head of a long glass conference table gesturing toward a presentation screen. Her expression is focused and authoritative. The room is a sleek modern office with floor-to-ceiling windows revealing a cityscape of glass towers under an overcast sky. Six colleagues sit around the table with laptops and coffee cups, leaning in attentively. The conference table reflects the blue-white light from the screen. Clean lines, neutral corporate color palette of slate gray, navy, and warm wood accents. Editorial business photography, sharp focus on the presenter with subtle depth of field blur on the background figures. [aspectRatio: 16:9] [exclude: watermark, text overlay, blurry]",
      category: "editorial",
    },
    {
      concept: "שדה לבנדר בפרובנס בשקיעה",
      output:
        "Endless rows of lavender stretch toward a horizon of rolling Provencal hills, the plants in full bloom creating parallel lines of deep violet and silver-green that converge at a lone stone farmhouse with faded blue shutters in the middle distance. The sky blazes with sunset colors — bands of apricot, rose, and deepening indigo above. A single cypress tree stands like a dark exclamation mark against the sky. The warm golden light rakes across the field at a low angle, making the lavender tips glow almost incandescent. A dirt path winds between the rows, and a rustic wooden bench sits at the edge of the frame. The air seems to shimmer with heat. Fine art landscape photography, rich saturated color, sweeping panoramic composition. [aspectRatio: 16:9] [exclude: people, cars, watermark, modern buildings]",
      category: "landscape",
    },
    {
      concept: "ילד מחופש לאסטרונאוט",
      output:
        'A boy around age 6 with a wide grin and missing front tooth wearing a homemade astronaut costume — a cardboard box helmet painted white with a cut-out visor covered in plastic wrap, aluminum foil gloves, and a silver-painted backpack with plastic tubes as oxygen hoses. He stands in a suburban backyard at dusk, one foot planted on a wooden crate marked "MOON ROCK" in crayon, pointing triumphantly at the actual moon visible in the pale blue-pink sky above. A cardboard rocket ship built from appliance boxes stands behind him, decorated with hand-drawn mission patches and a small American flag. Fireflies dot the darkening yard. Warm nostalgic tones, childhood wonder and imagination, candid lifestyle photography with soft natural twilight light. [aspectRatio: 4:3] [exclude: watermark, deformed, blurry]',
      category: "emotion",
    },
    {
      concept: "שולחן ארוחת בוקר ישראלי",
      output:
        "An abundant Israeli breakfast spread on a large rustic olive wood table viewed from directly above. A dazzling array of small plates and bowls: creamy hummus drizzled with olive oil and paprika, bright pink pickled turnips, diced cucumber-tomato salad glistening with fresh lemon juice, a basket of warm pita bread with golden spots, labneh topped with za'atar and a pool of green olive oil, a plate of sliced avocado fanned into a rosette, three types of cheese including salty Bulgarian white cheese, a small cast-iron shakshuka still bubbling with two eggs nested in vibrant red tomato sauce, and a glass of fresh-squeezed orange juice catching the morning light. A hand reaches in from the corner to tear a piece of pita. Bright, clean morning light from a nearby window, Mediterranean color palette of white, terracotta, olive green, and warm red. Editorial food photography, sharp throughout, inviting and abundant. [aspectRatio: 1:1] [exclude: watermark, text, blurry, artificial lighting]",
      category: "food",
    },
    {
      concept: "פורטרט סבתא בגינה",
      output:
        "A warm portrait of an elderly grandmother in her late 70s with silver hair pulled back in a loose bun, deep laugh lines around her hazel eyes, wearing a faded floral cotton dress and a wide-brimmed gardening hat. She kneels in a lush backyard vegetable garden, her weathered hands gently cupping a perfectly ripe tomato still on the vine. Rows of basil, peppers, and sunflowers surround her. The afternoon light is golden and soft, filtering through a pergola draped with grapevines. Her expression radiates pride and contentment. Shallow depth of field blurs the garden into a wash of green and gold behind her. Intimate lifestyle portrait photography, warm earthy palette, natural light only. [aspectRatio: 3:4] [exclude: watermark, deformed, blurry, text overlay]",
      category: "portrait",
    },
    {
      concept: "בית קפה פריזאי בבוקר",
      output:
        'A charming Parisian corner cafe on a quiet morning, small round marble-top tables with wrought iron chairs arranged on a narrow sidewalk under a dark green striped awning. A waiter in a white apron and black vest carries a tray with two espressos and croissants. Through the large front window, warm interior lighting reveals a zinc-topped bar and shelves of wine bottles. The building facade is classic Haussmann style with ornate iron balconies above. A bicycle with a wicker basket leans against a lamppost. Morning light bathes the scene in soft warmth. The cafe sign reads "Le Petit Matin" in elegant hand-painted gold script on a dark background. Documentary street photography, Parisian color palette of cream stone, forest green, and warm brass. [aspectRatio: 4:3] [exclude: watermark, modern cars, tourists, blurry]',
      category: "street",
    },
    {
      concept: "מעבדה מדעית עתידנית",
      output:
        "A gleaming futuristic research laboratory with clean white surfaces and cool blue accent lighting. A young female scientist in a crisp white lab coat examines a holographic molecular model floating above her workstation, the transparent 3D structure rotating slowly and casting colorful light patterns on her face. Banks of high-tech equipment line the walls — gene sequencers with blinking indicator lights, robotic arm sample handlers, and wall-mounted displays showing real-time data streams. Through a large observation window, a verdant biodome is visible. The space is orderly, spotless, and filled with the sense of cutting-edge discovery. Science fiction editorial photography grounded in near-future realism. [aspectRatio: 16:9] [exclude: watermark, blurry, deformed, cluttered]",
      category: "sci-fi",
    },
    {
      concept: "חתונה בוהמיינית בטבע",
      output:
        "A bohemian outdoor wedding ceremony in a sunlit meadow surrounded by towering old-growth oaks. The couple stands under a handmade arch of driftwood and dried pampas grass, wildflowers, and trailing eucalyptus. The bride wears a flowing lace dress with bare feet on the grass, the groom in a relaxed tan linen suit with rolled sleeves. Guests sit on mismatched vintage chairs and wooden benches arranged in a gentle semicircle. Mason jar lanterns hang from low branches. Late afternoon golden light streams through the trees, creating long shadows and warm backlit halos around every figure. The atmosphere is intimate, joyful, and deeply personal. Fine art wedding photography, soft romantic palette of sage, cream, blush, and warm amber. [aspectRatio: 3:2] [exclude: watermark, blurry, deformed, modern buildings]",
      category: "narrative",
    },
    {
      concept: "מוצר קוסמטיקה על רקע טבעי",
      output:
        "A premium skincare bottle with a frosted glass body and minimalist white label sits on a flat river stone surrounded by fresh green leaves, raw honeycomb, and scattered dried chamomile flowers. A thin stream of golden serum drips from the pipette onto the stone surface, catching the light. The background is a soft blur of a zen garden with raked gravel and moss-covered rocks. Warm natural side-lighting from the right creates gentle shadows and highlights the translucent quality of the product. Clean, organic, luxurious composition. Commercial product photography with natural lifestyle elements, earthy neutral palette of stone gray, forest green, honey gold, and cream. [aspectRatio: 4:5] [exclude: watermark, text, blurry, artificial-looking]",
      category: "product",
    },
    {
      concept: "ביצת פברז׳ה מפוארת",
      output:
        "A magnificent Faberge-style imperial egg standing open on a gilded pedestal, revealing an intricate miniature palace scene inside. The egg exterior is deep royal blue enamel with delicate gold filigree scrollwork, tiny seed pearls lining the edges, and a diamond-encrusted clasp. The interior miniature shows a ballroom with crystal chandeliers and tiny painted figures dancing. The egg rests on dark velvet under museum-quality directional lighting that makes the gold and gemstones sparkle. Every detail is rendered with jeweler-like precision. Fine art still life photography of decorative art, rich color palette of sapphire blue, gold, pearl white, and deep crimson velvet. [aspectRatio: 3:4] [exclude: watermark, blurry, fingerprints, modern objects]",
      category: "product",
    },
    {
      concept: "גשר עתיק בערפל",
      output:
        "An ancient stone bridge with three graceful arches spanning a misty river valley at dawn. The bridge is covered in moss and wildflowers growing from cracks between the weathered stones, with a single iron lantern still standing at its center. Dense fog obscures the far bank, giving the scene a mysterious, timeless quality. Below, the calm river reflects the bridge and the pale sky above. Ancient oak trees with gnarled branches frame both sides. The light is soft, diffused, and ethereal — no direct sun, just a luminous pearl-gray sky brightening toward the horizon. Fine art landscape photography with a romantic, painterly quality reminiscent of Caspar David Friedrich. [aspectRatio: 16:9] [exclude: watermark, people, modern elements, blurry]",
      category: "architecture",
    },
  ],
  mistakes: [
    {
      bad: "lavender field, sunset, beautiful, Provence, stunning, vibrant colors [aspectRatio: 16:9]",
      good: "Endless rows of lavender stretch toward rolling Provencal hills, plants in full bloom creating parallel lines of deep violet and silver-green converging at a lone stone farmhouse with faded blue shutters. The sky blazes with bands of apricot, rose, and deepening indigo. Fine art landscape photography, rich saturated color. [aspectRatio: 16:9] [exclude: people, cars, watermark]",
      why: 'Imagen responds to narrative paragraphs, not keyword lists. Write as if describing a scene in a novel — with spatial relationships, specific details, and atmosphere. Keywords like "beautiful" and "stunning" are wasted tokens.',
    },
    {
      bad: "A family having a picnic in a forest.",
      good: "A young family of four enjoying a leisurely picnic in a sun-dappled Mediterranean pine forest. The mother in her early 30s with a straw sunhat laughs as she passes watermelon slices to her daughter on a checkered blanket. Afternoon sunlight filters through the canopy creating warm pools of light. Lifestyle photography, candid, warm golden tones. [aspectRatio: 16:9] [exclude: watermark, blurry]",
      why: "Too short and generic. Imagen needs 60-150 words of rich description with specific ages, clothing, actions, lighting, and atmosphere to produce distinctive images. One sentence gives the model nothing to work with.",
    },
    {
      bad: "Israeli breakfast, top view, food photography --ar 1:1 --s 500 --no watermark",
      good: "An abundant Israeli breakfast spread on a rustic olive wood table viewed from directly above. Creamy hummus drizzled with olive oil and paprika, diced cucumber-tomato salad, warm pita bread, labneh topped with za'atar, and a cast-iron shakshuka with two eggs. Morning light from a nearby window. Editorial food photography. [aspectRatio: 1:1] [exclude: watermark, text, blurry]",
      why: "Imagen uses [aspectRatio:] and [exclude:] tags, not Midjourney-style --ar or --no parameters. Using wrong platform syntax will cause the parameters to be ignored entirely.",
    },
    {
      bad: "A woman in an office, wearing a suit, looking professional [aspectRatio: 16:9]",
      good: "A confident woman in her early 40s wearing a tailored charcoal suit and crisp white blouse, standing at the head of a long glass conference table gesturing toward a presentation screen. The room has floor-to-ceiling windows revealing a cityscape. Six colleagues sit with laptops, leaning in attentively. Editorial business photography, sharp focus, neutral corporate palette. [aspectRatio: 16:9] [exclude: watermark, text overlay, blurry]",
      why: "Missing [exclude:] tag and lacking scene context. Imagen benefits from specific details about the environment, other people, lighting, and color palette — not just the main subject in isolation.",
    },
  ],
  scoringCriteria: [
    "60–150 words of flowing narrative — Imagen follows prose, not SD tags",
    "[aspectRatio:] matches delivery (social vs print vs slide)",
    "[exclude:] lists artifact classes: watermark, blurry, deformed, text overlay when needed",
    "People: age range, wardrobe, pose, expression, relationship to others in frame",
    "Environment: materials, era, weather, time-of-day light color",
    "Camera feel in words (editorial, telephoto compression) without fake --params",
    "Multi-subject: who looks where and spatial relationships",
    "Brand-safe: no real celebrity or trademark names — describe look-alike traits",
    "Story beat in one paragraph — beginning/middle/end of a single moment",
    'Palette named (warm amber, cool teal) not just "nice colors"',
    "Model tier: Ultra for portraits and hero shots; Fast for iteration",
    "Supported aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9 — specify via [aspectRatio:]",
    '2K resolution available — mention "high resolution" or "2K" for detail-critical shots',
  ],
  chainOfThoughtExamples: [
    {
      concept: "צוות בישיבת משרד",
      reasoning:
        "Imagen needs social geometry: how many people, where they sit, what screen shows. Light from window vs overhead. [aspectRatio] for slide. [exclude] for UI text if not wanted.",
      output:
        "Seven colleagues sit around a U-shaped oak table in a glass-walled conference room on the 24th floor at dusk, city lights softening outside the windows. A woman in her 40s stands at a wall-mounted display, pointing at a bar chart while others lean in with laptops open. The room has warm recessed lighting and cool spill from the screens. [aspectRatio: 16:9] [exclude: watermark, blurry, text overlay, extra limbs]",
    },
    {
      concept: "מאפה קינוח אופנתי",
      reasoning:
        "Food: texture, glaze, crumbs, plate material, angle. Macro distance in words. Exclude steam if not wanted.",
      output:
        "A glossy chocolate dome dessert on a matte black ceramic plate, mirror glaze reflecting a single strip of soft key light, gold leaf flakes on top, scattered crumbs of cocoa nib, shallow depth of field with the restaurant blurred into warm bokeh. Editorial dessert photography. [aspectRatio: 4:5] [exclude: watermark, text, plastic look, deformed fork]",
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: "A dog in a park, sunny day, happy, [aspectRatio: 16:9]",
      afterPrompt:
        "A golden retriever with a damp coat shakes off water droplets beside a wooden park bench, late afternoon sun skims across wet grass and leaves long shadows from maples, a tennis ball frozen mid-air at frame edge, families blurred in the background bokeh. Warm documentary pet photography. [aspectRatio: 16:9] [exclude: watermark, blurry, deformed legs]",
      changes: [
        "Specified breed behavior, light direction, and background separation",
        "Added [exclude] for common failure modes",
      ],
    },
    {
      iteration: 2,
      beforePrompt: "Interior of a modern kitchen, white, clean",
      afterPrompt:
        "A bright Scandinavian kitchen with white oak cabinets, veined quartz countertop, and matte black fixtures, morning light through a side window catches steam from a kettle, a bowl of lemons on the island, shallow depth of field with dining nook soft in back. Architectural interior photography. [aspectRatio: 3:2] [exclude: watermark, text, distorted perspective]",
      changes: ['Replaced "clean" with materials, light source, and staging props'],
    },
  ],
};
