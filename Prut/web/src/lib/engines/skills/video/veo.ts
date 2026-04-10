import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'veo' as const,
  name: 'Veo 3',
  examples: [
    {
      concept: 'תוכנית בישול ביתית',
      output: `Medium close-up of a cheerful woman in her 40s with silver-streaked dark hair pulled back, wearing a linen apron over a teal blouse, standing at a butcher-block island in a bright farmhouse kitchen. She tosses diced tomatoes into a sizzling cast-iron skillet with a confident flick of her wrist, oil spattering as the tomatoes hit the hot surface. Steam billows upward into soft natural light pouring through a window above the sink. Herbs in terracotta pots line the windowsill. She turns toward the camera with a warm smile and gestures with her wooden spoon. Duration: 8s.

Audio:
Dialogue: "Now this is where the magic happens — you hear that sizzle? That means the pan is perfect."
SFX: "tomatoes hitting hot oil with an aggressive sizzle and pop", "wooden spoon tapping the edge of the skillet twice."
Ambient: "gentle hum of a kitchen exhaust fan, birds chirping faintly through the open window."
Music: "upbeat acoustic ukulele with light percussion, cheerful and warm."`,
      category: 'food',
    },
    {
      concept: 'רחוב שוק בבנגקוק בלילה',
      output: `Wide shot of a bustling Bangkok night market street drenched in neon light — hot pink, electric blue, and warm gold signs reflecting off wet pavement. Vendors work woks over roaring gas flames, clouds of fragrant smoke rising past hanging paper lanterns. A young backpacker with a large olive rucksack weaves through the dense crowd, pausing at a stall where a vendor flips skewers of satay with practiced speed. Motorbikes edge through the pedestrian flow. Shallow depth of field isolates the backpacker against the chaotic tapestry of light and movement. Duration: 10s.

Audio:
Dialogue: None.
SFX: "wok flames roaring with a sharp whoosh on each toss", "satay sizzling with fat dripping onto charcoal producing sharp hisses", "motorbike engine buzzing past from left to right."
Ambient: "dense crowd murmur in Thai, clinking of metal utensils on plates, distant thump of pop music from a bar."
Music: "lo-fi beat with Thai saw duang melody woven in, relaxed nocturnal groove."`,
      category: 'street',
    },
    {
      concept: 'ראיון עם מדענית במעבדה',
      output: `Medium shot of a woman in her early 50s with short grey hair and tortoiseshell glasses, wearing a white lab coat with a university crest, seated on a stool in a modern genetics laboratory. Rows of illuminated centrifuges and blue-lit gel electrophoresis stations fill the background in soft focus. She speaks directly to camera with calm authority, occasionally gesturing with her right hand, a pipette still held loosely between her fingers. Cool fluorescent overhead light mixes with the warm glow of a desk lamp beside her. Duration: 10s.

Audio:
Dialogue: "What we discovered is that this particular gene sequence activates only under specific environmental stress — it's like a hidden switch the organism kept in reserve for millions of years."
SFX: "soft mechanical hum of centrifuge spinning in the background", "quiet beep of a timer going off on a nearby bench."
Ambient: "sterile laboratory quiet with a low ventilation drone, faint footsteps on linoleum in the distance."
Music: "minimal piano, sparse and contemplative, single notes with long reverb tails."`,
      category: 'documentary',
    },
    {
      concept: 'ינשוף לבן צד עכבר בשדה',
      output: `Low angle wide shot of a barn owl gliding silently over a moonlit wheat field, wings spread wide with primary feathers splayed like fingers. The owl banks sharply, folding its wings into a steep dive — talons extending forward as it plunges into the tall golden grass. A split second of stillness, then it rises with powerful wingbeats, a field mouse clutched in its right talon, wheat stalks swaying in the wake of its departure. Cool blue moonlight casts long shadows across the undulating field. Mist hugs the ground. Shot with a telephoto lens compressing the field into soft golden layers. Duration: 8s.

Audio:
Dialogue: None.
SFX: "rush of air through wing feathers during the dive, a muffled thud as talons strike ground", "rapid wingbeats producing a soft rhythmic whooshing on the ascent."
Ambient: "crickets chirping in steady rhythm, distant hoot of a second owl, gentle breeze rustling through dry wheat."
Music: "solo cello, slow and haunting, a single sustained phrase rising and falling."`,
      category: 'nature',
    },
    {
      concept: 'אופנוען קופץ מעל גבעה במדבר',
      output: `Tracking shot from a chase vehicle, wide angle following a motocross rider in red and black gear launching off a desert ridge at full speed. The bike arcs high against a blazing orange sunset sky, rear wheel spinning freely, rider standing on the pegs with knees bent absorbing the trajectory. Red dust erupts from the launch point and hangs in the golden backlight like a suspended curtain. The bike descends steeply, front wheel touching down first on the sandy slope, suspension compressing as the rider absorbs the landing and accelerates away trailing a rooster tail of sand. Duration: 6s.

Audio:
Dialogue: None.
SFX: "two-stroke engine screaming at peak RPM, pitch dropping as the bike goes airborne", "heavy crunch of tires slamming into packed sand on landing", "chain and sprocket whine as throttle reopens."
Ambient: "desert wind howling steadily, small rocks skittering down the hillside after the jump."
Music: "driving electric guitar riff, heavy palm-muted chugging with open power chord hits synced to the jump and landing."`,
      category: 'action',
    },
    {
      concept: 'נגר בונה כיסא עץ בסדנה',
      output: `Medium shot of a weathered carpenter in his 60s with calloused hands and a grey canvas apron, working in a sunlit wood shop. Sawdust dances in golden shafts of light from a high window. He runs a hand plane along a curved chair leg clamped in a vice, long ribbons of pale oak curling upward and falling to the floor. He pauses, lifts the piece close to his eye to check the line, squinting along the edge, then nods and returns to the rhythmic pull of the plane. Vintage hand tools hang on a pegboard wall behind him. Duration: 8s.

Audio:
Dialogue: (muttering quietly to himself) "There she is... nice and straight now."
SFX: "the shhhk-shhhk rhythm of the hand plane biting into oak, each stroke producing a crisp shaving curl", "the clank of the plane being set down on the metal bench."
Ambient: "a wall-mounted radio playing faint classical music, workshop fan humming, distant traffic through an open garage door."
Music: "warm fingerpicked acoustic guitar, unhurried and meditative, folk-Americana warmth."`,
      category: 'documentary',
    },
    {
      concept: 'ילדה מנגנת פסנתר בקונצרט',
      output: `Wide shot of a grand concert hall with dark velvet seats, a single Steinway grand piano on a polished wooden stage. A girl around 12 with long black hair in a white recital dress walks nervously to the bench, sits, and adjusts the height. Her small hands hover above the keys. She begins to play, tentatively at first, then with growing confidence as the melody takes hold. The camera slowly pushes in to a medium close-up on her focused face, eyes following her fingers. The audience is visible in soft bokeh, utterly still. Duration: 10s.

Audio:
Dialogue: None.
SFX: "the soft thud of piano pedal being pressed", "the resonant ring of each struck key filling the hall's natural reverb."
Ambient: "absolute silence from the audience, the faintest creak of a wooden seat, hall air conditioning barely audible."
Music: "Chopin Nocturne in E-flat major — she plays it live, building from pianissimo to a soaring mezzo-forte in the middle passage."`,
      category: 'emotion',
    },
    {
      concept: 'סצנת אקשן - מרדף על גגות',
      output: `Wide shot of two figures sprinting across flat rooftops in a dense Mediterranean city at sunset. The lead runner — a woman in dark tactical clothing — leaps a three-foot gap between buildings, landing in a roll and continuing without breaking stride. The pursuer, a larger man in a grey jacket, hesitates at the gap, then jumps with less grace, stumbling on landing. Satellite dishes and hanging laundry flash past as the camera tracks from a parallel rooftop. Duration: 8s.

Audio:
Dialogue: (the woman shouts over her shoulder without looking back) "You can't keep up — give it up!"
SFX: "boots pounding on concrete roof tiles in rapid rhythm", "the whoosh of the gap jump followed by a heavy impact-roll", "a clothesline snapping as the pursuer clips it, fabric fluttering."
Ambient: "distant city traffic horns, a muezzin's call echoing from a minaret, pigeons bursting into flight from a rooftop coop."
Music: "tense percussion-driven score, taiko drums with electronic bass pulses, building tempo matching the chase."`,
      category: 'action',
    },
    {
      concept: 'זוג זקנים יושבים על ספסל בשקיעה',
      output: `Medium shot of an elderly couple sitting side by side on a weathered wooden bench at the edge of a seaside promenade. The man, in his 80s with a flat cap and wool cardigan, rests his hand on his wife's — she wears a floral dress and a light shawl, silver hair lifted gently by the ocean breeze. They watch the sun descend into the sea, the sky turning from peach to deep rose. She leans her head on his shoulder. He pats her hand twice, slowly. Duration: 8s.

Audio:
Dialogue: (she speaks softly) "Remember our first time here? You bought me that terrible ice cream." (he chuckles quietly) "It wasn't terrible — you ate all of it."
SFX: "gentle waves lapping against the seawall below", "a distant ice cream truck jingle, barely audible."
Ambient: "seagulls calling overhead, light wind through coastal grass, children laughing far down the beach."
Music: "solo acoustic guitar, a simple major-key fingerpicking pattern, nostalgic and tender, unhurried."`,
      category: 'emotion',
    },
    {
      concept: 'פרסומת לקפה פרימיום',
      output: `Extreme close-up of dark espresso pouring from a brushed-steel portafilter into a white ceramic cup, the stream splitting into twin ribbons of deep mahogany liquid. Crema builds on the surface in a rich golden-brown layer, tiny bubbles forming and popping in slow motion. The camera pulls back to reveal a barista's tattooed hands lifting the cup, then a slow orbit shows a minimalist cafe interior with exposed brick and morning light. A woman receives the cup, wraps both hands around it, and inhales deeply, eyes closing. Duration: 8s.

Audio:
Dialogue: (barista, warm and measured) "Single origin Ethiopian Yirgacheffe — notes of jasmine and dark honey. Made just for you."
SFX: "the pressurized hiss of the espresso machine building to extraction", "liquid hitting ceramic with a rich trickle", "the ceramic cup being set on a wooden saucer with a gentle clink."
Ambient: "low cafe murmur, soft jazz from a speaker, the distant whir of a coffee grinder."
Music: "warm upright bass and brushed snare jazz trio, intimate and sophisticated, coffee-house tempo."`,
      category: 'commercial',
    },
    {
      concept: 'סצנת מדבר בסגנון דיון',
      output: `Wide aerial shot descending over endless sand dunes stretching to the horizon under a pale orange sky with two distant suns. A lone figure in a flowing sand-colored robe walks along a dune ridge, their footprints disappearing behind them as wind erases each step. The figure stops and kneels, pressing a gloved hand into the sand, which ripples outward as if the desert itself is alive. Far in the distance, a dark geometric structure half-buried in sand catches the light. Duration: 10s.

Audio:
Dialogue: (voice-over, low and reverent) "The desert does not forget — it only decides what to reveal."
SFX: "sand grains hissing across the dune surface in sheets", "the deep resonant vibration as the figure touches the ground, a subsonic pulse radiating outward", "fabric of the robe snapping in the wind."
Ambient: "vast empty wind with no human sound, occasional deep sand-bass rumble from shifting dunes, a high-pitched whistle through exposed rock."
Music: "Hans Zimmer-style brass and strings swell, beginning as a single sustained cello note, building to a massive horn-and-choir crescendo as the structure is revealed."`,
      category: 'sci-fi',
    },
    {
      concept: 'דוגמנית בצילומי אופנה על חוף',
      output: `Medium shot of a model in a flowing white linen dress standing barefoot on wet sand at the waterline during golden hour. Wind catches the fabric, sending it billowing dramatically to the left as she turns her profile to camera, chin lifted, one hand brushing hair from her face. A wave rushes in around her ankles, foam curling past her feet. The photographer is visible as a silhouette in the foreground, camera clicking. She shifts her weight and pivots, the dress wrapping around her legs, then spreading again as the wind gusts. Duration: 8s.

Audio:
Dialogue: (photographer, calling over the wind) "Turn into the light — yes, exactly like that. Hold it. Beautiful."
SFX: "camera shutter firing in rapid bursts", "wave rushing onto sand with a soft foamy hiss", "wind snapping through the dress fabric like a flag."
Ambient: "steady ocean wind, gulls calling, distant waves breaking further out."
Music: "airy electronic ambient, soft pads with a gentle four-on-the-floor pulse, editorial fashion show energy."`,
      category: 'fashion',
    },
    {
      concept: 'סיור בחנות ספרים עתיקה',
      output: `Slow tracking shot drifting through a narrow, floor-to-ceiling antique bookshop with dark mahogany shelves and a rolling ladder. Leather-bound volumes packed tightly together, gold-embossed spines catching warm lamplight. An elderly shopkeeper with round spectacles perched on his nose stands behind a cluttered wooden desk, wrapping a book in brown paper with practiced hands. Dust motes float through a shaft of light from a high arched window. A cat sleeps on a stack of atlases. Duration: 8s.

Audio:
Dialogue: (shopkeeper, without looking up, dry and warm) "First edition, 1923. Smells like the decade it was printed — tobacco and old promises."
SFX: "crisp crinkle of brown paper being folded around the book", "a soft thump as the cat shifts position on the atlas stack", "the creak of a floorboard as someone moves down the aisle."
Ambient: "deep silence of a room full of paper, a ticking grandfather clock in the corner, rain pattering against the arched window."
Music: "solo piano, Satie-like simplicity, sparse Gymnopedies-style notes with long sustain."`,
      category: 'interior',
    },
  ],
  mistakes: [
    {
      bad: 'Medium shot of a chef cooking in a kitchen. She is making pasta. The kitchen is nice. Duration: 8s.',
      good: 'Medium close-up of a cheerful woman in her 40s with silver-streaked dark hair, wearing a linen apron over a teal blouse, standing at a butcher-block island. She tosses diced tomatoes into a sizzling cast-iron skillet, oil spattering as they hit. Steam billows into soft window light. Duration: 8s.\n\nAudio:\nDialogue: "You hear that sizzle? That means the pan is perfect."\nSFX: "tomatoes hitting hot oil with an aggressive sizzle and pop."\nAmbient: "kitchen exhaust fan humming, birds chirping through the window."\nMusic: "upbeat acoustic ukulele, cheerful and warm."',
      why: 'Veo 3\'s killer feature is native audio generation. A prompt without an Audio section (Dialogue + SFX + Ambient + Music) wastes the platform\'s greatest strength. Always include all four audio subsections.',
    },
    {
      bad: 'Audio:\nSFX: "some cooking sounds"\nMusic: "background music"',
      good: 'Audio:\nSFX: "tomatoes hitting hot oil with an aggressive sizzle and pop", "wooden spoon tapping the skillet edge twice."\nAmbient: "gentle hum of kitchen exhaust fan, birds chirping faintly through the open window."\nMusic: "upbeat acoustic ukulele with light percussion, cheerful and warm."',
      why: 'Vague audio descriptions produce generic sound. Specify exact actions that cause sounds, describe the sonic quality (aggressive sizzle, sharp hiss, gentle hum), name instruments and genres for music, and separate SFX/Ambient/Music distinctly.',
    },
    {
      bad: 'Dialogue: The woman says something about cooking.',
      good: 'Dialogue: "Now this is where the magic happens — you hear that sizzle? That means the pan is perfect."',
      why: 'Dialogue must be exact quoted text with delivery style context (speaking softly, laughing, shouting over wind). Veo generates the actual spoken words, so paraphrasing or indirect speech produces mumbled, unclear audio.',
    },
    {
      bad: 'A man sits on a bench watching the sunset. Audio: ocean waves.',
      good: 'Medium shot of an elderly man in a flat cap and wool cardigan on a weathered seaside bench. He watches the sun descend into the sea. Duration: 8s.\n\nAudio:\nDialogue: (speaks softly) "Remember our first time here?"\nSFX: "gentle waves lapping against the seawall below."\nAmbient: "seagulls calling overhead, light wind through coastal grass."\nMusic: "solo acoustic guitar, simple major-key fingerpicking, nostalgic and tender."',
      why: 'The Audio section needs all four layers: Dialogue, SFX, Ambient, and Music. Even if Dialogue is "None," state it explicitly so Veo knows to generate a non-dialogue scene. One-line audio loses ambient texture and musical mood.',
    },
    {
      bad: 'A long detailed paragraph about the visual scene spanning 200 words with every possible detail about the environment and character and their backstory and motivation...\n\nAudio:\nSFX: "a sound."',
      good: 'A 50-100 word visual paragraph with essential visual details.\n\nAudio:\nDialogue: Exact quoted text or "None."\nSFX: 2-3 specific sound effects with descriptive quality.\nAmbient: Environmental soundscape with 2-3 layered elements.\nMusic: Genre, instruments, tempo, and emotional tone.',
      why: 'Visual paragraph should be 50-100 words, Audio section 20-40 words. Veo balances visual and audio generation — an overloaded visual section with a thin audio section produces stunning footage with flat, lifeless sound.',
    },
  ],
  scoringCriteria: [
    'Visual block ~50–100 words — balanced with Audio block',
    'Audio has Dialogue, SFX, Ambient, Music — Dialogue exact quotes or "None"',
    'SFX: 2–3 sounds with texture words (crisp, muffled, distant)',
    'Ambient: spatial layers (near traffic, far birds, room tone)',
    'Music: genre + instruments + tempo + emotional function',
    'Duration stated when format requires it',
    'Picture and sound emotionally aligned (horror vs cozy)',
    'No audio overload — leave headroom for dialogue intelligibility',
    'Visual camera + subject motion summarized before audio detail',
    'Lip-sync lines quoted verbatim if characters speak on camera',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'שוק בוקר עם מוזיקה אתנית',
      reasoning:
        'Veo: visual paragraph for geography + light. Audio: dialogue often None. Layer ambient (vendors, pots) then music (instrument + mode).',
      output:
        'Medium-wide shot of a bustling morning market alley with terracotta pots stacked beside hanging dried herbs, steam rising from a brass samovar, sunlight slicing between awnings. Duration: 8s.\n\nAudio:\nDialogue: None\nSFX: "crisp knife on wooden board," "hissing steam release," "rustle of paper bags"\nAmbient: "distant muezzin-like vocal melisma blended with bicycle bells"\nMusic: "oud and frame drum, moderate tempo, warm Phrygian color, hopeful energy."',
    },
    {
      concept: 'שיחה ברכבת תחתית',
      reasoning:
        'Interior: fluorescent, crowd walla. Dialogue quoted. SFX: train screech, PA muffled. Music sparse or none.',
      output:
        'Close-medium shot inside a subway car, fluorescent panels flicker subtly, commuters sway as the train banks a curve, condensation streaks the window. Duration: 10s.\n\nAudio:\nDialogue: (whispered) "We get off next stop."\nSFX: "metal screech on rails," "compressed air hiss at doors"\nAmbient: "muffled PA announcement," "distant coughs and shoe shuffles"\nMusic: "sparse piano + low strings, uneasy half-step tension."',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        'Beach at sunset. Audio: waves.',
      afterPrompt:
        'Wide shot of a wind-sculpted dune at sunset, foam catching last orange light, a lone figure walks the tideline leaving footprints. Duration: 8s.\n\nAudio:\nDialogue: None\nSFX: "heavy surf collapse with rolling undertow," "crystalline water receding over shells"\nAmbient: "gulls wheeling wide, distant children\'s laughter swallowed by wind"\nMusic: "solo cello, slow rubato, bittersweet major lift on final bar."',
      changes: [
        'Expanded SFX/ambient; music tied to emotion; richer visual grounding',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'Office argument. Loud.',
      afterPrompt:
        'Medium shot across a glass conference table, two executives lean in, reflections doubling their gestures, city dusk behind blinds. Duration: 6s.\n\nAudio:\nDialogue: "You buried the variance in footnote seven."\nSFX: "plastic folder slap on table," "ringing office phone ignored"\nAmbient: "low HVAC hum, muffled city traffic 12 floors below"\nMusic: "none — let dialogue drive."',
      changes: [
        'Specific dialogue beat; SFX tied to props; removed vague "loud"',
      ],
    },
  ],
};
