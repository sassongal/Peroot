import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'sora' as const,
  name: 'Sora 2',
  examples: [
    {
      concept: 'חללית נוחתת על כוכב זר',
      output: `A battered silver spacecraft with glowing blue thrusters descends through a swirling orange atmosphere toward an alien landscape of dark obsidian plains and towering crystalline formations. The pilot — a woman with close-cropped auburn hair, wearing a grey flight suit with mission patches, visor raised — grips the controls. Duration: 12s.

Cinematography:
Camera shot: 50mm lens, begins inside cockpit over the pilot's shoulder, then cuts to wide exterior as the ship breaks through the cloud layer
Mood: Tense wonder

Actions:
- Ship rattles as it hits turbulence in the first three seconds, cockpit instruments flashing amber warnings
- Pilot adjusts a lever with her right hand while bracing against the seat with her left
- Ship punches through the clouds at six seconds revealing the alien vista, thrusters firing blue cones of light
- Landing struts deploy as the ship settles onto the dark surface, kicking up swirls of iridescent dust

Lighting: Orange atmospheric glow from above, blue thruster light from below, cockpit lit by green and amber instrument panels; palette: burnt orange, cobalt blue, obsidian black, silver.
Style: Anamorphic 2.0x, Villeneuve-scale grandeur, practical-feeling VFX, IMAX clarity.`,
      category: 'sci-fi',
    },
    {
      concept: 'אב ובת אופים עוגה יחד',
      output: `A warm sunlit kitchen with butcher-block counters and white subway tile backsplash. A father in his mid-30s — tall, dark beard, rolled-up flannel sleeves — stands beside his 5-year-old daughter who has curly blonde hair, a pink apron dusted with flour, and stands on a wooden step stool. Duration: 8s.

Cinematography:
Camera shot: 35mm lens, eye-level medium shot, gentle handheld sway
Mood: Warm, joyful, intimate

Actions:
- Father cracks an egg one-handed into a mixing bowl while daughter watches with wide eyes in the first two seconds
- She plunges both hands into the flour bag and tosses a cloud upward, white powder floating everywhere
- Father turns to her with mock surprise, mouth open, then breaks into laughter, flour settling on his beard
- She giggles and claps her flour-covered hands together creating a small puff

Dialogue:
Daughter: "Daddy, look — it's snowing!"
Father: (laughing) "Inside snow, huh? Your grandma is going to love this mess."

Lighting: Soft morning window light from the right, warm fill from overhead pendant lamp; palette: cream, honey gold, soft white, blush pink.
Style: 35mm film stock texture, A24 domestic intimacy, shallow DOF on the daughter's face.`,
      category: 'emotion',
    },
    {
      concept: 'דולפינים קופצים ליד סירה',
      output: `A pod of six bottlenose dolphins races alongside a weathered wooden fishing boat cutting through deep turquoise Mediterranean waters. The late afternoon sun hangs low, casting a wide golden path across gentle swells. A young fisherman in a sun-bleached blue shirt leans over the railing watching. Duration: 8s.

Cinematography:
Camera shot: 85mm telephoto, tracking shot from the boat's stern keeping dolphins in mid-frame, slight handheld movement from the boat's motion
Mood: Exhilarating freedom

Actions:
- Lead dolphin breaches fully out of the water in the first two seconds, body arcing in a perfect crescent, droplets spraying in slow motion
- Two more dolphins leap in staggered sequence, water cascading off their sleek grey bodies
- Fisherman points excitedly and turns toward camera with an astonished grin
- Final dolphin performs a spinning leap, sunlight catching the spray like scattered diamonds

Lighting: Low golden backlight through water spray creating rim-lit silhouettes, deep blue-green water reflecting sky; palette: turquoise, gold, silver, weathered blue.
Style: National Geographic cinematic grade, Attenborough-era nature documentary beauty, 85mm compression.`,
      category: 'nature',
    },
    {
      concept: 'זמרת שרה בהקלטה באולפן',
      output: `A recording studio with dark acoustic panels and warm amber mood lighting. A young Black woman with long braided hair, gold hoop earrings, and a vintage burgundy leather jacket stands before a Neumann U87 microphone, eyes closed, large headphones on. Duration: 8s.

Cinematography:
Camera shot: 50mm anamorphic, slow push-in from medium to medium close-up, shallow DOF
Mood: Raw emotional intensity

Actions:
- She opens her eyes slowly in the first second, inhales deeply, shoulders rising
- Begins singing at two seconds, leaning slightly toward the microphone, right hand rising to the headphone cup
- At five seconds she pulls back from the mic and belts a powerful note, chin lifting, tendons visible in her neck
- Control room glass in the background reveals the producer leaning forward with both hands on the console

Dialogue:
Singer: (singing, soulful and building) "I been holding on so long, my hands don't know how to let go..."

Lighting: Warm amber from a desk lamp stage-left, cool blue monitor glow from the control room behind glass, red recording light glowing above the door; palette: burgundy, amber, midnight blue, gold.
Style: Anamorphic bokeh, intimate music documentary feel, grain and warmth of Kodak Vision3 500T.`,
      category: 'music-video',
    },
    {
      concept: 'פרסומת לשעון יוקרה',
      output: `A luxury watch with a midnight-blue dial and polished steel bracelet rests on a dark slate surface beside a crystal glass of whiskey. Water droplets bead on the watch crystal, catching light. Behind, a floor-to-ceiling window reveals a nighttime cityscape. Duration: 8s.

Cinematography:
Camera shot: 100mm macro, impossibly smooth orbit around the watch face, rack focus between watch and city lights
Mood: Aspirational elegance

Actions:
- Camera begins tight on the watch dial, second hand sweeping past the twelve marker in the first two seconds
- Slow orbit reveals the bracelet links catching light, each facet sparking a tiny flare
- At four seconds, a man's hand enters frame and lifts the watch with precise, unhurried fingers
- He turns it once, light playing across the bezel, then fastens it to his wrist with a satisfying click

Lighting: Single overhead spotlight on the watch with dramatic falloff, warm amber from the whiskey, cool blue city glow from the window; palette: midnight blue, brushed silver, amber, deep charcoal.
Style: Fincher-level product photography precision, anamorphic flare on highlights, 4K razor sharpness.`,
      category: 'commercial',
    },
    {
      concept: 'קוסם מבצע טריק קלפים ברחוב',
      output: `A narrow cobblestone street in the Latin Quarter of Paris, late afternoon. A street magician — a man in his late 20s with sharp dark eyes, a fitted black vest over a white henley, sleeves rolled to the elbows, silver rings on his fingers — stands before a small crowd. Duration: 10s.

Cinematography:
Camera shot: 50mm, starts at medium shot, pushes to close-up on hands at the climax
Mood: Playful mystery

Actions:
- Magician fans a deck of cards between both hands in the first two seconds, cards spreading in a perfect arc, each one catching the light
- At three seconds he invites a woman from the crowd to pick a card, she reaches forward tentatively
- He shuffles the deck with a cascade flourish at five seconds, cards waterfalling between hands
- At eight seconds he slaps the deck on the table and flips the top card — her card — as the crowd erupts, the woman's hands flying to her mouth

Dialogue:
Magician: "Now watch very carefully — the card doesn't choose you, you choose the card."
Woman: (gasping) "No way... that's impossible!"

Lighting: Warm golden hour light raking down the narrow street, soft shadows from awnings, Parisian storefronts glowing in background; palette: warm stone, ivory, charcoal, gold.
Style: Handheld intimacy, Linklater-style street realism, 35mm grain, available light only.`,
      category: 'street',
    },
    {
      concept: 'דרקון מתעורר במערה',
      output: `A vast underground cavern filled with mountains of ancient gold coins, jeweled goblets, and rusted swords. In the center, a colossal dragon — emerald scales the size of shields, horns like gnarled oak branches, a ridge of spines running down its back — lies coiled in sleep. Its belly glows faintly from internal fire. Duration: 12s.

Cinematography:
Camera shot: Wide establishing shot on 24mm, slowly pushing in toward the dragon's massive head
Mood: Ancient, ominous dread

Actions:
- A single gold coin tumbles down a treasure pile in the first two seconds, the tiny metallic clink echoing through the cavern
- The dragon's nostril twitches at three seconds, a curl of smoke escaping
- At five seconds one enormous amber eye snaps open, the vertical slit pupil dilating as it focuses
- The dragon raises its head at eight seconds, coins cascading off its neck, a deep rumbling growl vibrating the gold piles into small avalanches
- At ten seconds it opens its jaws revealing rows of obsidian teeth and a glow building deep in its throat

Lighting: Faint amber glow from the dragon's internal fire illuminating the gold, cool blue mineral light from bioluminescent cave crystals above; palette: emerald green, molten gold, obsidian black, amber.
Style: Peter Jackson epic scale, 65mm IMAX, VFX-heavy with practical weight, deep Dolby contrast.`,
      category: 'fantasy',
    },
    {
      concept: 'צלם מתעד חתונה בגשם',
      output: `A country estate garden where an outdoor wedding reception continues despite sudden rain. A wedding photographer — a woman in her 30s with a pixie cut, wearing a dark blazer with camera straps crossed over her chest, Canon R5 in hand — moves through the chaos. Duration: 10s.

Cinematography:
Camera shot: 35mm, medium shot tracking the photographer, shallow DOF
Mood: Romantic chaos, beautiful imperfection

Actions:
- Guests scatter from the long banquet table in the first two seconds, grabbing napkins and champagne flutes, laughing
- The photographer drops to one knee at three seconds, framing the bride and groom who have stayed at the table, rain streaming down their faces as they laugh
- At five seconds she fires a burst of shots, the flash illuminating raindrops frozen in mid-air
- The bride grabs the groom's face and kisses him at seven seconds, rain soaking them both, the photographer circling them for the shot

Dialogue:
Bride: (laughing through rain) "This is perfect — this is actually perfect!"
Photographer: "Don't stop, don't stop — that's the cover shot!"

Lighting: Overcast grey sky with warm string lights glowing along the table, camera flash creating staccato highlights on rain; palette: ivory, sage green, warm gold, storm grey.
Style: Documentary wedding film aesthetic, Robert Richardson natural light sensibility, beautiful chaos.`,
      category: 'documentary',
    },
    {
      concept: 'מנתח רובוט מבצע ניתוח עתידני',
      output: `A sterile white surgical suite in a futuristic hospital. A humanoid robot surgeon — matte white chassis with articulated surgical arms ending in micro-tool fingers, a single blue optical sensor as its "eye" — stands over a patient on a hovering surgical table. Holographic displays float around the operating field. Duration: 10s.

Cinematography:
Camera shot: 50mm, begins at wide establishing, moves to extreme close-up on the robot's precise instruments
Mood: Clinical wonder, unsettling precision

Actions:
- The robot's optical sensor scans the patient in the first two seconds, a blue laser line tracing the body contour, holographic anatomy appearing above
- At three seconds it selects a micro-scalpel from a rotating instrument array with mechanical precision
- The robot makes an incision at five seconds, its movements impossibly steady, a magnified hologram showing the work at cellular level
- At eight seconds a human surgeon watching from behind glass leans forward and nods slowly, impressed

Lighting: Cool clinical white overhead panels, blue holographic glow on the robot's chassis, warm amber observation room behind glass; palette: sterile white, surgical blue, chrome, amber.
Style: Ex Machina precision, Kubrickian symmetry, 4K ultra-sharp with shallow DOF on the instruments.`,
      category: 'sci-fi',
    },
    {
      concept: 'ילד מגלה כלב גור ברחוב',
      output: `A quiet residential street lined with autumn maple trees dropping red and gold leaves. A boy around 8 years old — dark hair, oversized denim jacket, backpack slung over one shoulder — walks home from school kicking a small rock. Duration: 8s.

Cinematography:
Camera shot: 35mm, medium shot at the boy's eye level, gentle handheld following from behind
Mood: Pure discovery, instant love

Actions:
- The boy stops mid-kick at the first second, head turning toward a cardboard box beside a lamppost
- At two seconds he crouches down and peers inside — a tiny golden retriever puppy looks up at him with huge brown eyes
- His mouth falls open at three seconds, then transforms into the widest grin, eyes watering
- At five seconds he reaches in with both hands and carefully lifts the puppy, which immediately licks his chin, and the boy dissolves into helpless giggles, pressing the puppy to his chest
- He stands at seven seconds, looking around the empty street as if asking permission, then tucks the puppy inside his jacket

Dialogue:
Boy: (whispering, voice cracking) "Hey... hey little guy. Are you alone? You're coming home with me."

Lighting: Warm golden autumn afternoon, long shadows from the maple trees, leaves backlit as they fall; palette: amber, russet red, denim blue, golden retriever gold.
Style: Spielberg suburban magic, 35mm Kodak warmth, shallow DOF isolating the boy and puppy from the world.`,
      category: 'emotion',
    },
    {
      concept: 'פרסומת לנעלי ספורט',
      output: `A concrete basketball court in an industrial neighborhood at dawn. A pair of brand-new neon green running shoes sit on the free-throw line, morning dew beading on the mesh upper. The city skyline is a silhouette behind. Duration: 8s.

Cinematography:
Camera shot: 100mm macro opening, pulling to 35mm wide as action begins
Mood: Electric anticipation, launch energy

Actions:
- Camera orbits the shoes at ground level in the first three seconds, catching light refracting through dew drops on the sole tread
- A runner's foot steps into frame at three seconds, sliding into the right shoe with a satisfying fit
- At five seconds both shoes are laced and the runner explodes into a sprint, camera tracking at ankle height, shoes pounding the court with visible impact compression
- At seven seconds the runner leaps, shoes catching golden dawn light mid-air, freeze-frame at the apex

Lighting: Cool blue pre-dawn shifting to warm golden first light, neon green shoe color popping against grey concrete; palette: neon green, concrete grey, dawn gold, urban steel.
Style: Nike commercial grade, slow-motion at 120fps for the sprint, macro-to-action transition, product hero lighting.`,
      category: 'commercial',
    },
    {
      concept: 'גיטריסט מנגן סולו בהופעה חיה',
      output: `A packed concert venue, haze machines filling the air with thick atmosphere. A lead guitarist — a man in his 40s with long grey-streaked hair, worn leather jacket, vintage Fender Stratocaster in sunburst finish — stands center stage in a pool of white spotlight. Duration: 10s.

Cinematography:
Camera shot: 50mm anamorphic, starts at medium shot, crash-zooms to close-up on fretboard at the solo climax
Mood: Transcendent intensity

Actions:
- He bends a note in the first two seconds, face contorting with effort, left hand vibrato shaking the string
- At three seconds his right hand shifts to rapid alternate picking, fingers blurring across the strings, the crowd's hands visible reaching upward
- At six seconds he steps to the monitor edge, leans back at a dramatic angle, the spotlight catching sweat on his forehead
- At eight seconds he hits the final sustained note, holding the guitar up toward the ceiling, feedback ringing, the crowd erupting

Dialogue:
(No spoken dialogue — the guitar's wailing solo fills the entire audio space)

Lighting: Single harsh white spot from directly above cutting through blue haze, crowd lit by red and purple wash; palette: spotlight white, haze blue, leather brown, guitar sunburst amber.
Style: Concert film aesthetic, Scorsese-Shine a Light energy, 35mm pushed stock grain, anamorphic flares through haze.`,
      category: 'music-video',
    },
  ],
  mistakes: [
    {
      bad: 'A spaceship lands on a planet. It looks cool and cinematic.',
      good: 'A battered silver spacecraft with glowing blue thrusters descends through a swirling orange atmosphere toward an alien landscape of dark obsidian plains. The pilot — a woman with close-cropped auburn hair, grey flight suit, visor raised — grips the controls. Duration: 12s.\n\nActions:\n- Ship rattles as it hits turbulence in the first three seconds\n- Ship punches through clouds at six seconds revealing the vista\n- Landing struts deploy as the ship settles, kicking up iridescent dust',
      why: 'Sora requires structured sections (Cinematography, Actions, Lighting, Style) and a specified duration. Vague descriptions without structure produce unfocused results.',
    },
    {
      bad: 'Duration: 8s. A man walks into a room and sits down. Actions: - He walks. - He sits.',
      good: 'Duration: 8s.\n\nActions:\n- Man pushes open the heavy oak door in the first two seconds, warm light spilling across his face\n- He pauses in the doorway at three seconds, scanning the room, right hand still on the handle\n- At five seconds he crosses to a leather armchair and lowers himself into it with a weary exhale\n- At seven seconds he loosens his tie and leans back, eyes closing',
      why: 'Sora actions need beat-timed specificity — "in the first two seconds," "at five seconds." Each action should be a vivid micro-moment, not a generic description. Aim for 5+ timed action beats.',
    },
    {
      bad: 'A woman talks to a man in a cafe. She has brown hair. He wears a blue shirt.',
      good: 'A woman — dark brown hair in a low bun, tortoiseshell glasses, olive linen blazer with a silver pendant, three freckles across her left cheek — sits across from a man — sandy hair parted left, fitted navy henley with sleeves pushed to the elbows, a faded tattoo of a compass on his right forearm. Duration: 8s.',
      why: 'Characters need 5+ identifying details for Sora to maintain consistency. Include hair, clothing, accessories, distinguishing marks, and posture to prevent the model from morphing features between frames.',
    },
    {
      bad: 'A dog runs in a park. It is sunny. The dog is happy.',
      good: 'A golden retriever with a red bandana sprints across a manicured park lawn, ears flapping, tongue lolling sideways. Duration: 6s.\n\nCinematography:\nCamera shot: 35mm, low tracking shot at the dog\'s eye level\nMood: Unbridled joy\n\nActions:\n- Dog launches from a sitting position in the first second, rear legs driving forward\n- At two seconds it catches a frisbee mid-leap, body fully extended\n- Lands and skids on the grass at four seconds, immediately spinning back to its owner\n\nLighting: Bright midday sun with hard shadows on green grass; palette: golden fur, red bandana, emerald green, blue sky.',
      why: 'Sora needs the full structured format including Duration, Cinematography, Actions, and Lighting sections. Missing duration means the model picks arbitrarily. Missing structure means the visual coherence drops significantly.',
    },
  ],
  scoringCriteria: [
    'Duration line (e.g. Duration: 8s) anchors clip length',
    'Sections: Cinematography, Actions, Lighting, Style — each populated',
    '5+ concrete identity hooks per recurring character',
    '4+ beats in Actions with second-level timing',
    'Lighting: direction, quality, palette (named colors)',
    'Cinematography: shot size + lens/move + mood',
    'Style: film stock / era / reference when useful',
    'No contradictory beats — one clear narrative arc',
    'Actions use verbs with physical consequence (pushes, catches, stumbles)',
    'Dialogue beats in Actions if speech matters — timed to seconds',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'סצנת משרד מתרגשת',
      reasoning:
        'Sora wants structure first. Pick duration. Cinematography: over-shoulder vs wide. Characters: wardrobe + tick. Actions: 4 beats with seconds. Lighting: fluorescent + window spill.',
      output:
        'Duration: 8s.\n\nCinematography:\nCamera shot: 35mm, over-the-shoulder from behind a woman\nMood: Tense anticipation\n\nActions:\n- In the first second she taps a pen against a contract, knuckles white\n- At three seconds a man across the table slides the document closer, sleeve revealing a vintage watch\n- At five seconds she signs with a quick flourish, breath visible\n- At seven seconds she stands, chair scraping, and exits frame left\n\nLighting: Cool overhead fluorescents mixed with warm sunset through blinds; palette: navy suit, cream paper, amber rim light.\n\nStyle: Fincher-inspired corporate thriller stillness.',
    },
    {
      concept: 'מרדף רגלי בשוק',
      reasoning:
        'Chase: geography, obstacles, camera tracking. Beat-timed actions. Short duration if chaotic.',
      output:
        'Duration: 6s.\n\nCinematography:\nCamera shot: handheld 28mm at chest height\nMood: frantic energy\n\nActions:\n- First second: shoulder checks through a crowded spice aisle, baskets swinging\n- At two seconds: runner leaps over a fallen sack, cumin dust puffing\n- At four seconds: tight squeeze past a hanging fabric awning\n- At six seconds: bursts into sunlight at the market exit, breathless pause\n\nLighting: Harsh midday sun with hard shadows; palette: ochre, paprika red, white cotton.',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        'Duration: 10s. A chef cooks. Kitchen. Lighting: bright.',
      afterPrompt:
        'Duration: 8s.\n\nCinematography:\nCamera shot: 50mm, slow push-in on hands\nMood: Controlled heat\n\nActions:\n- In the first two seconds a chef tilts a copper pan; cognac ignites in a vertical flambe\n- At four seconds blue-orange flame reflects in his eyes as he adjusts the angle\n- At six seconds steam rises into a single exhaust hood beam\n- At seven seconds he kills the heat with a confident wrist snap\n\nLighting: Warm key from overhead practical; palette: copper, steel, deep blue apron.',
      changes: [
        'Tightened duration; replaced vague "bright" with practical light behavior',
        'Added timed micro-beats and camera intent',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'Two people talk in a car. Night.',
      afterPrompt:
        'Duration: 10s.\n\nCharacters:\nDriver — woman, early 30s, auburn hair in a loose ponytail, silver hoop earrings, black leather jacket with white stitching\nPassenger — man, late 20s, stubble, grey hoodie, nervous thumb rubbing his knee\n\nCinematography:\nCamera shot: 35mm, slow lateral track outside the rain-streaked window\nMood: Intimate unease\n\nActions:\n- First three seconds: she speaks without turning, reflection in windshield\n- At five seconds: he looks down, then up at a passing neon sign\n- At eight seconds: she grips the wheel harder, knuckles pale\n\nLighting: Neon bounce on wet glass; palette: cyan, magenta, skin tones desaturated.',
      changes: [
        'Added identity detail + structured dialogue-free tension beats',
      ],
    },
  ],
};
