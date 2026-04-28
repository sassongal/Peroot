import type { PlatformSkill } from "../index";

export const skill: PlatformSkill = {
  platform: "dalle" as const,
  name: "GPT Image (gpt-image-1)",
  examples: [
    {
      concept: "שלט ניאון של בית קפה בלילה",
      output:
        'A rain-soaked city street at night, dominated by a vintage neon sign reading "CAFE LUNA" in elegant cursive script glowing warm pink and soft white against the dark facade of a 1920s Art Deco building. Raindrops catch the neon reflections on the wet cobblestones below, creating streaks of rose and amber light. A lone figure with an umbrella approaches the entrance, silhouetted against the glow. The rest of the street recedes into moody blue darkness with distant warm windows. Cinematic noir atmosphere, the neon lettering is crisp and perfectly rendered with a subtle halo. In a vivid style, photorealistic with film grain and anamorphic lens flare. [size: 1792x1024] [quality: hd]',
      category: "street",
    },
    {
      concept: "פורטרט אישה עם פרחים בשיער",
      output:
        "A striking close-up portrait of a young woman with rich dark skin and high cheekbones, her hair elaborately adorned with fresh white gardenias, deep burgundy dahlias, and trailing green ivy woven through thick natural curls. Her expression is serene and regal, eyes gazing slightly off-camera with quiet confidence. Soft golden light from the left illuminates the petals and creates delicate catchlights in her brown eyes. The background is a smooth gradient of deep emerald green to shadow. Color palette: ivory, burgundy, forest green, warm bronze. Painted in the tradition of Renaissance portraiture reimagined through a contemporary African lens. In a natural style, fine art portrait photography with shallow depth of field. [size: 1024x1792] [quality: hd]",
      category: "portrait",
    },
    {
      concept: "עולם הפוך עם עצים מרחפים",
      output:
        "A surreal landscape where gravity has inverted: massive ancient oak trees float upside-down in a lavender sky, their root systems exposed and tangled like chandeliers, while their canopies form islands of green suspended above an endless reflective salt flat. A small child in a red raincoat stands at the center looking upward in wonder, casting a long shadow. Jellyfish-like luminous orbs drift between the floating trees. The horizon line blurs between sky and ground, creating a disorienting dreamscape. Warm amber and cool violet tones clash beautifully. In a vivid style, inspired by Rene Magritte meets Studio Ghibli, painterly digital illustration with soft edges and atmospheric perspective. [size: 1792x1024] [quality: hd]",
      category: "fantasy",
    },
    {
      concept: "סושי מושלם על צלחת שחורה",
      output:
        "An exquisite omakase sushi plate: eight pieces of nigiri arranged in a gentle arc on a handmade black ceramic plate with an uneven, organic rim. Each piece is a tiny sculpture — translucent salmon belly glistening with a brushstroke of nikiri glaze, ruby-red tuna, pearlescent hirame, and a torch-kissed otoro with caramelized fat. A small mound of freshly grated wasabi and pickled ginger sit at one end. The plate rests on a warm hinoki cypress counter, a single pair of ebony chopsticks beside it. Dramatic top-down studio lighting with deep shadows and a single overhead spot highlighting the fish. Color palette: obsidian, coral, pearl, warm cedar. In a natural style, editorial food photography with extreme sharpness and rich textures. [size: 1024x1024] [quality: hd]",
      category: "food",
    },
    {
      concept: "סלון יפני מינימליסטי עם נוף להרים",
      output:
        'A minimalist Japanese living room with tatami mat flooring and a single low walnut chabudai table, two floor cushions in undyed linen. A floor-to-ceiling glass wall frames a breathtaking view of misty mountains and a bamboo forest below. A single branch of cherry blossom stands in a celadon ceramic vase on the table. The interior is bathed in soft, diffused morning light filtering through shoji screen panels on the left side. The ceiling is exposed timber beams with clean, precise joinery. An alcove tokonoma on the right wall holds a hanging scroll with calligraphy reading "Stillness" in a flowing brush font. Color palette: warm sand, soft sage, cream, dark walnut, blush pink. In a natural style, architectural interior photography with perfect symmetry and quiet elegance. [size: 1792x1024] [quality: hd]',
      category: "interior",
    },
    {
      concept: "אסטרונאוט על כוכב זר",
      output:
        "A lone astronaut in a weathered white spacesuit standing on the surface of an alien planet, looking up at a sky filled with three overlapping moons in different phases and a massive ringed gas giant dominating the horizon. The terrain is covered in translucent crystalline formations that glow faintly turquoise from within, casting colored light on the astronaut's visor. Footprints trail behind through fine violet dust. In the far distance, a slender alien structure rises like a needle into the atmosphere. The scene is bathed in a warm amber light from the system's red dwarf star low on the horizon. In a vivid style, cinematic science fiction concept art with volumetric atmospheric haze. [size: 1792x1024] [quality: hd]",
      category: "sci-fi",
    },
    {
      concept: "שוק פירות צבעוני מהאוויר",
      output:
        "A vibrant open-air fruit market seen from directly above in a flat lay composition. Wooden crates and woven baskets overflow with perfectly arranged produce: pyramids of bright mangoes, deep red pomegranates split open to reveal jewel-like seeds, bunches of green bananas, glossy purple figs, and scattered lychees with rough pink shells. Vendors' hands reach into frame adjusting displays. The ground is sun-bleached concrete with puddles of water reflecting the colorful canopy overhead. Morning light creates crisp shadows. Color palette: tropical — mango gold, pomegranate ruby, banana green, fig purple, lychee pink. In a natural style, documentary overhead photography with rich saturated color. [size: 1024x1024] [quality: hd]",
      category: "documentary",
    },
    {
      concept: "נוף הרים עם אגם בשקיעה",
      output:
        "A panoramic mountain landscape at the golden hour: jagged snow-dusted peaks reflected perfectly in a mirror-still alpine lake, the water surface broken only by a single canoe with a tiny silhouetted figure paddling. The sky transitions from deep coral at the horizon through peach and lavender to a deepening indigo above. Wildflowers — lupines in purple and Indian paintbrush in scarlet — carpet the foreground shore. A thin veil of mist hovers just above the water. The scene has an almost spiritual stillness to it. In a natural style, fine art landscape photography with extreme depth of field and rich dynamic range. [size: 1792x1024] [quality: hd]",
      category: "landscape",
    },
    {
      concept: "פרפר מאקרו על פרח",
      output:
        "An extreme close-up of a monarch butterfly perched on a dewy purple coneflower, its wings spread to reveal the intricate pattern of black veins against brilliant orange, each tiny scale visible. The butterfly's curled proboscis probes the flower's golden center. Behind it, the garden dissolves into a dreamy wash of soft green and yellow bokeh. Individual dewdrops cling to the flower petals, each one a tiny lens reflecting the morning sky. The light is soft, diffused, and warm from behind. In a natural style, macro nature photography with focus stacking for pin-sharp detail across the wings and flower. [size: 1024x1024] [quality: hd]",
      category: "macro",
    },
    {
      concept: "לוגו לחברת תכנות עם האות A",
      output:
        'A clean modern logo mark featuring a stylized letter "A" constructed from two bold geometric strokes that form a subtle upward arrow, rendered in a gradient from electric blue to deep indigo on a pure white background. The negative space within the letterform creates a small diamond shape at the center. Below the mark, the company name "APEX" is set in a sleek custom sans-serif typeface with generous letter spacing, each character precisely weighted. The overall design conveys precision, innovation, and upward momentum. Minimalist flat design, perfectly centered, vector-quality crispness. In a natural style, professional brand identity design. [size: 1024x1024] [quality: hd]',
      category: "commercial",
    },
    {
      concept: "רקדנית בלט בתנועה",
      output:
        "A prima ballerina captured mid-grand jeté against a stark black stage, her body forming a perfect horizontal split in the air, arms extended gracefully. She wears a classic white tutu that blurs with motion at the edges. A single powerful spotlight from above creates a cone of light around her, dust particles sparkling in the beam. Her expression is one of absolute focus and controlled intensity. The wooden stage floor reflects a faint golden glow. Long exposure trails from her fingertips suggest ethereal motion. In a vivid style, dramatic fine art dance photography with high contrast and cinematic lighting. [size: 1024x1792] [quality: hd]",
      category: "action",
    },
    {
      concept: "סצנה מאגדה עם פטריות זוהרות ביער",
      output:
        "A magical forest clearing at twilight where dozens of bioluminescent mushrooms of varying sizes emit a soft teal and violet glow from beneath their translucent caps, illuminating the mossy forest floor like tiny lanterns. Ancient twisted oak trees form a cathedral-like canopy above, their bark covered in luminous lichen. Fireflies drift in lazy spirals, their warm yellow light contrasting with the cool mushroom glow. A small fox with curious eyes peers from behind a root. Faint mist curls along the ground. The atmosphere is enchanting and slightly mysterious. In a vivid style, fantasy illustration with painterly textures and rich atmospheric depth. [size: 1792x1024] [quality: hd]",
      category: "nature",
    },
    {
      concept: "פוסטר לסרט עם כותרת מרובת שורות",
      output:
        'A dramatic movie poster for a thriller titled "THE LAST SIGNAL" in bold condensed white type stacked over a secondary line "NO ONE IS COMING" in smaller italic red text below. The background is a lone figure in a long coat standing on a rain-soaked rooftop at night, the city skyline behind them blurred and lit in cold blue tones. Official film billing block in tiny white text at the bottom. The typography is crisp, perfectly rendered, and fully legible. Cinematic noir, high contrast, photorealistic composition. [size: 1024x1792] [quality: hd]',
      category: "commercial",
    },
    {
      concept: "בקבוק בושם על רקע שקוף",
      output:
        "An elegant crystal perfume bottle with a rose-gold cap, containing pale champagne liquid, photographed against a transparent background. The bottle casts a clean shadow to the lower right. Faceted glass surfaces refract a subtle spectrum of light. Product shot with studio lighting — a single soft box from the upper left, minimal fill. The image is suitable for e-commerce or packaging placement. Background: transparent PNG. [size: 1024x1024] [quality: hd]",
      category: "product",
    },
  ],
  mistakes: [
    {
      bad: "neon sign, cafe, night, rain, street, moody",
      good: 'A rain-soaked city street at night, dominated by a vintage neon sign reading "CAFE LUNA" glowing warm pink against a dark Art Deco facade. Raindrops catch neon reflections on wet cobblestones, creating streaks of amber light. Cinematic noir atmosphere. [size: 1792x1024] [quality: hd]',
      why: "DALL-E/GPT Image requires rich prose sentences, not keyword lists. Short keyword prompts produce generic, flat results. Describe the scene as if writing a paragraph of a novel.",
    },
    {
      bad: "A poster that says a lot of text about a sale with product images and fine print at the bottom.",
      good: 'A clean retail promotional poster. Large centered headline text reading "SALE — 50% OFF" in bold white sans-serif on a deep red background. Below it, three product silhouettes arranged in a row. Fine print line at the bottom: "Valid through Sunday. In-store only." Vivid and eye-catching. [size: 1024x1024] [quality: hd]',
      why: "gpt-image-1 handles multi-line text and complex layouts natively in one pass — no need for Canva post-processing. Describe the text content and layout clearly; the model renders it correctly, including fine print.",
    },
    {
      bad: "A beautiful mountain landscape [quality: hd]",
      good: "A panoramic view of jagged snow-capped peaks reflected in a mirror-still alpine lake at golden hour, wildflowers carpeting the foreground shore, thin mist hovering above the water, fine art landscape photography with extreme depth of field. [size: 1792x1024] [quality: hd]",
      why: "Vague short prompts waste DALL-E's strength. The model excels with detailed, specific descriptions of lighting, composition, color palette, and atmosphere. Aim for 50-120 words of rich description.",
    },
    {
      bad: "photo of a cat, 4k, ultra realistic, 8k resolution, unreal engine, octane render --ar 16:9",
      good: "A regal Maine Coon cat with a luxurious silver-gray mane sitting on a velvet cushion by a frosted window, soft winter light illuminating each whisker, shallow depth of field with creamy bokeh. In a natural style, intimate pet portrait photography. [size: 1792x1024] [quality: hd]",
      why: 'DALL-E ignores technical jargon like "4k, 8k, octane render" and does not support Midjourney-style parameters (--ar). Use [size:] and [quality:] tags instead, and describe visual qualities in natural language.',
    },
  ],
  scoringCriteria: [
    "50–120 words of rich prose — scene, lighting, composition, palette, mood",
    "[size: WxH] matches intent (square vs landscape vs portrait)",
    "[quality: hd] when fine detail or typography matters",
    'Style phrase: "In a vivid style" vs "In a natural style" per desired look',
    "If text appears in-image: exact copy, hierarchy, placement, and font character",
    "No Midjourney-style --flags; GPT Image uses natural language + [size]/[quality]",
    "Spatial relationships and camera feel (wide shot, close-up, depth of field) in prose",
    "No copyrighted names — describe appearance instead",
    'Negative constraints in plain language ("avoid cluttered background") not --no',
    "Ending ties narrative together (single cinematic moment, not a bullet list)",
    'Transparent PNG: state "transparent background" or "transparent PNG" explicitly when needed',
    'For raw/imperfect look — state explicitly: "add film grain", "rough brush strokes", "hand-drawn feel"',
  ],
  chainOfThoughtExamples: [
    {
      concept: "פוסטר אירוע עם טקסט בעברית",
      reasoning:
        'GPT Image renders text well — specify Hebrew copy exactly, hierarchy (headline vs sub), and contrast background. Choose [size] for poster aspect ratio. Describe materials (paper, foil) not just "poster".',
      output:
        'A printed event poster held at a slight angle against a dark walnut table, headline text "השקה רשמית" in bold geometric Hebrew letters across the upper third, subline "יום חמישי 18:00" in smaller clean sans-serif below, abstract gold foil shapes framing the text, soft studio light with gentle shadow. In a vivid style, crisp typography and print texture. [size: 1024x1792] [quality: hd]',
    },
    {
      concept: "מוצר לבן על רקע נקי לקטלוג",
      reasoning:
        "Catalog needs material truth: surface (matte ceramic, brushed aluminum), edge highlights, shadow softness. Natural style reduces HDR look. Square [size: 1024x1024] for e-commerce grids.",
      output:
        "A matte white ceramic pour-over dripper centered on seamless light grey cyclorama, soft three-point studio lighting with subtle contact shadow, 3/4 angle showing interior spiral ribs, minimal catalog aesthetic, razor-sharp focus edge-to-edge. In a natural style, true-to-life product photography. [size: 1024x1024] [quality: hd]",
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: "A nice coffee cup on a table, morning light, cozy vibe [size: 1024x1024]",
      afterPrompt:
        "A hand-thrown stoneware mug with an uneven glaze rim sits on a pale oak table beside an open notebook, warm side light from a tall window throws long soft shadows across wood grain, shallow depth of field, steam wisps visible against the cooler background. In a natural style, quiet morning editorial. [size: 1024x1024] [quality: hd]",
      changes: [
        'Replaced "nice/cozy" with concrete materials and light direction',
        "Added spatial staging (notebook, window direction) and depth of field",
        "Added [quality: hd] for texture credibility",
      ],
    },
    {
      iteration: 2,
      beforePrompt: "Cyberpunk street at night, neon, rain [size: 1792x1024]",
      afterPrompt:
        "A narrow rain-slicked alley at night reflects magenta and cyan neon from stacked kanji signage overhead, puddles mirror fragmented light, a lone figure in a hooded coat walks away from camera under a battered steel fire escape, steam vents at ankle height, anamorphic lens flare streaks across wet asphalt. In a vivid style, cinematic widescreen still. [size: 1792x1024] [quality: hd]",
      changes: [
        "Specified palette (magenta/cyan), weather behavior, and figure blocking",
        "Added lens/language (anamorphic) and ground-level detail (steam, puddles)",
      ],
    },
  ],
};
