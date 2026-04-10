import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'general' as const,
  name: 'General',
  examples: [
    {
      concept: 'זריחה מעל אגם הררי',
      output: 'A slow aerial glide over a mirror-still alpine lake at dawn as the first rays of golden sunlight crest a snow-capped mountain ridge, painting the water in streaks of rose and amber while thin wisps of morning mist curl off the glassy surface and drift between dark green pine trees lining the shore, a lone wooden canoe resting motionless at a weathered dock, the entire scene bathed in soft ethereal light with a 35mm lens and gentle film grain.',
      category: 'landscape',
    },
    {
      concept: 'רחוב עירוני גשום בלילה',
      output: 'A rain-soaked city intersection at midnight gleams under the fractured light of neon signs reflected in deep puddles, taxis and buses crawling through the downpour as pedestrians clutch umbrellas and dash between awnings, steam rising from a manhole cover into the cold air mixing with the warm glow of a ramen shop doorway, shot low at street level with a wide anamorphic lens capturing streaking headlights and the kinetic energy of urban life in the rain.',
      category: 'street',
    },
    {
      concept: 'אישה זקנה מחייכת ליד חלון',
      output: 'An intimate close-up of an elderly woman with deep smile lines and silver hair swept into a loose bun, sitting beside a lace-curtained window as soft afternoon light falls across her weathered hands clasped around a porcelain teacup, her eyes crinkling warmly as a gentle smile spreads across her face, dust motes drifting lazily through the golden light beam, filmed with an 85mm portrait lens at a wide aperture creating a creamy bokeh of the sunlit garden visible beyond the glass.',
      category: 'portrait',
    },
    {
      concept: 'פרש דוהר על חוף ים',
      output: 'A powerful black horse gallops along the edge of the surf at golden hour, its rider crouched low in the saddle with a dark cloak billowing behind them, hooves kicking up explosions of wet sand and seawater that hang suspended in the warm backlight as each stride sends spray arcing into the air, waves rolling in from the right crashing into white foam, the horizon ablaze with deep orange and purple, captured with a long telephoto lens compressing the layers of horse, surf, and sunset into a single dramatic plane.',
      category: 'action',
    },
    {
      concept: 'ערפל כבד ביער במבוק',
      output: 'A slow tracking shot drifts through a dense bamboo forest shrouded in heavy morning fog, impossibly tall green stalks disappearing into the white void above, droplets of condensation sliding down the smooth surfaces and falling in slow motion to the mossy ground below, a narrow stone path winding into the mist ahead, shafts of diffused pale light breaking through gaps in the canopy creating soft volumetric beams, the atmosphere thick and dreamlike with muted emerald and jade tones.',
      category: 'nature',
    },
    {
      concept: 'רקדנית באלט בחדר חזרות',
      output: 'A lone ballerina in a faded pink leotard and worn pointe shoes practices a slow adagio in an empty rehearsal studio with scuffed wooden floors and a wall of mirrors, her reflection doubling every movement as she extends one leg into a perfect arabesque, arms floating upward with effortless control, late afternoon light streaming through tall industrial windows casting long golden rectangles across the floor and her silhouette, dust rising from each soft landing, the silence broken only by the creak of the floorboards, filmed on 50mm with shallow depth of field.',
      category: 'action',
    },
    {
      concept: 'שוק תבלינים במרקש',
      output: 'A vibrant overhead tracking shot glides above open burlap sacks overflowing with pyramids of saffron gold and paprika red and turmeric orange in a narrow Marrakech souk, a merchant in a white djellaba scooping crimson powder into a brass scale, sunlight piercing through a slatted wooden roof creating zebra stripes of light and shadow across the kaleidoscope of color, hands reaching in to feel textures, aromatic dust floating in the beams, filmed with a wide 24mm lens capturing the sensory overload of the spice market.',
      category: 'street',
    },
    {
      concept: 'צוללן שוחה עם כרישי לוויתן',
      output: 'A diver in a black wetsuit glides beside a massive whale shark in crystal-clear tropical water, the enormous spotted creature moving with slow prehistoric grace as filtered sunlight penetrates from above in shifting columns of aquamarine and jade, the diver reaching out a hand that looks impossibly small against the shark\'s enormous pectoral fin, tiny remora fish clinging to the spotted grey skin, the blue abyss falling away beneath them into darkness, captured with an underwater wide-angle lens emphasizing the vast scale difference.',
      category: 'nature',
    },
    {
      concept: 'עיר עתידנית בשקיעה',
      output: 'A sweeping aerial pan across a futuristic metropolis at sunset where towering glass spires catch the dying amber light and holographic billboards shimmer between the structures, flying vehicles tracing glowing blue trails through the warm air between buildings, a monorail curving silently around a central tower, the sky painted in gradients of coral and violet fading into deep indigo above, street level far below alive with pedestrian movement and neon signage, shot on an anamorphic lens with cinematic flares and Blade Runner atmosphere.',
      category: 'sci-fi',
    },
    {
      concept: 'ילד בונה ארמון חול על חוף',
      output: 'A boy around six with sun-bleached hair and sandy swim trunks crouches at the waterline on a wide golden beach, carefully patting wet sand into a lopsided tower on an elaborate sandcastle, his tongue poking out the corner of his mouth in concentration as a small wave rushes in and laps at the castle moat sending tiny walls crumbling, his eyes widening before he scrambles to rebuild with urgent cupped handfuls, warm late-afternoon light painting everything in honeyed tones, an 85mm lens throwing the sparkling ocean into creamy bokeh behind him.',
      category: 'narrative',
    },
    {
      concept: 'פרסומת לשוקולד יוקרתי',
      output: 'A hand breaks a thick bar of dark Belgian chocolate in extreme close-up and slow motion, the clean snap sending tiny fragments and cocoa dust exploding outward into warm directional light, revealing the smooth glossy interior with visible layers and a swirl of caramel stretching between the halves, the broken surface catching highlights like polished mahogany, a curl of steam rising from a porcelain cup of hot chocolate in soft focus behind, the entire composition on dark slate with moody chiaroscuro lighting and macro lens detail.',
      category: 'commercial',
    },
    {
      concept: 'זוג מטייל ביער סתווי',
      output: 'A couple walks hand in hand along a winding trail through a forest ablaze with autumn color, crimson maples and golden oaks arching overhead creating a cathedral of warm light, fallen leaves carpeting the path in amber and rust, the woman in a cream cable-knit sweater leaning into the man\'s shoulder as he points upward at something through the canopy, sunlight filtering through the remaining leaves in dappled patterns across their faces, a gentle breeze sending a flurry of leaves spiraling down around them, captured at eye level with a 50mm lens and the soft warmth of expired Kodak film stock.',
      category: 'narrative',
    },
    {
      concept: 'מוזיקאי מנגן כינור ברחוב',
      output: 'A street violinist in a long dark coat stands on a cobblestone corner beneath a flickering gas lamp at dusk, drawing the bow across the strings with eyes closed and head tilted into the instrument, the melody seeming to pull passersby to slow their pace and gather, warm amber lamplight catching the polished wood of the violin and the musician\'s weathered face, breath visible in the cold air mixing with the soft halo of the lamp, the surrounding buildings fading into blue-grey twilight, filmed with an 85mm lens creating a shallow plane of focus that isolates the performer from the hushed audience.',
      category: 'music-video',
    },
  ],
  mistakes: [
    {
      bad: '1. Subject: a woman sitting by a window\n2. Lighting: afternoon sun\n3. Action: she drinks tea\n4. Mood: peaceful\n5. Camera: close-up portrait lens',
      good: 'An intimate close-up of an elderly woman with deep smile lines and silver hair swept into a loose bun, sitting beside a lace-curtained window as soft afternoon light falls across her weathered hands clasped around a porcelain teacup, her eyes crinkling warmly as a gentle smile spreads across her face, dust motes drifting lazily through the golden light beam, filmed with an 85mm portrait lens at a wide aperture creating a creamy bokeh.',
      why: 'General video prompts must be a single flowing paragraph, never numbered sections or bullet points. Most video models parse a continuous prose description — numbered lists break the prompt into disconnected fragments the model processes unevenly.',
    },
    {
      bad: 'A horse runs on a beach at sunset.',
      good: 'A powerful black horse gallops along the edge of the surf at golden hour, its rider crouched low in the saddle with a dark cloak billowing behind them, hooves kicking up explosions of wet sand and seawater that hang suspended in the warm backlight, waves crashing into white foam, the horizon ablaze with deep orange and purple, captured with a long telephoto lens.',
      why: 'Too short — general video prompts need 30-80 words to cover all 7 layers: subject, action, environment, lighting, mood, camera, and style. Under 20 words produces generic, under-directed results.',
    },
    {
      bad: 'A person walks down a street in a city, there are buildings and cars and people around them.',
      good: 'A rain-soaked city intersection at midnight gleams under neon signs reflected in deep puddles, taxis crawling through the downpour as pedestrians clutch umbrellas and dash between awnings, steam rising from a manhole cover mixing with the warm glow of a ramen shop doorway, shot low at street level with a wide anamorphic lens capturing streaking headlights and kinetic urban energy.',
      why: 'Missing lighting, mood, and camera/lens information. General prompts must include lighting conditions (time of day, quality of light), emotional atmosphere, and a lens or style reference. Without them, the model defaults to flat, generic rendering.',
    },
    {
      bad: 'תיאור של סצנה עם אישה יושבת ליד חלון ושותה תה בשקט ובשלווה',
      good: 'An intimate close-up of an elderly woman with deep smile lines and silver hair, sitting beside a lace-curtained window as soft afternoon light falls across her hands clasped around a porcelain teacup, filmed with an 85mm portrait lens creating creamy bokeh of the sunlit garden beyond the glass.',
      why: 'General video prompts must always be written in English. Hebrew descriptions will not be parsed correctly by any current video generation model. Translate the concept into vivid English prose.',
    },
  ],
  scoringCriteria: [
    'Single English paragraph — no bullets or numbered beats in output',
    'Layers: subject, action, environment, lighting, mood, camera/lens, style cue',
    '30–80 words — one moment, one location',
    'Lighting: time + direction + quality + palette',
    'Camera: shot size + movement + focal length feel',
    'Motion: who moves, how fast, what reacts (fabric, dust, water)',
    'Style: reference director/film stock only if it clarifies look',
    'Continuity: wardrobe and weather stable across the sentence',
    'No platform-specific negative syntax unless target app supports it',
    'Opening words anchor shot type (Wide shot:, Close-up:, etc.)',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'חתונה בחוץ',
      reasoning:
        'Establish wide geography, time (golden hour), key motion (veil, walk), camera (dolly back), audio-neutral phrasing.',
      output:
        'Wide shot: Slow dolly backward reveals a bride in an ivory lace train walking between rows of vineyard vines at golden hour, guests blurred as warm bokeh orbs, dust motes in slanted sunlight, long shadows stretching across gravel, handheld micro-sway for intimacy, Terrence Malick pastoral glow.',
    },
    {
      concept: 'מכונית לילה',
      reasoning:
        'Reflective wet road, camera parallel tracking, neon smear, single sentence mood.',
      output:
        'Low tracking shot: A vintage coupe cruises parallel to camera along a rain-slicked boulevard, taillights smearing into long red ribbons, puddles exploding under tires, neon signage doubling in the hood paint, anamorphic flares, moody noir haze hugging the asphalt.',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        'Kids playing soccer, field, sunny, fun',
      afterPrompt:
        'Medium-wide shot: Steadicam sweeps beside eight-year-olds chasing a scuffed soccer ball across clover-strewn grass, late afternoon sun flaring through oak branches, jerseys dark with sweat, long shadows wheeling as a kid slides for a tackle, chalk line puffing from the grass, documentary sports energy.',
      changes: [
        'Specified age, equipment wear, camera move, and light behavior',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'Cooking in kitchen, fast cuts feeling',
      afterPrompt:
        'Close-up: A chef\'s wrist flicks diced shallots into a roaring pan, orange-blue flame whooshing upward, oil shimmer on stainless steel, fine steam catching a single under-cabinet LED strip, shallow depth of field isolating the flame from a blurred subway tile wall, visceral ASMR motion.',
      changes: [
        'Single continuous moment with materials and light instead of "fast cuts" meta',
      ],
    },
  ],
};
