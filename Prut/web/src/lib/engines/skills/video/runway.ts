import type { PlatformSkill } from "../index";

export const skill: PlatformSkill = {
  platform: "runway" as const,
  name: "Runway Gen-4.5",
  examples: [
    {
      concept: "מרדף רכבים בעיר בלילה",
      output:
        "Wide shot: Rapid tracking shot chases a matte-black muscle car drifting through a rain-slicked Tokyo alley at night, tires spraying arcs of water against neon-lit storefronts. The car slides sideways through a tight corner, headlights cutting through steam rising from grates. Whip pan reveals a pursuing motorcycle weaving between parked cars. Anamorphic lens flares streak across the frame. Michael Mann night-city palette, urgent energy.",
      category: "action",
    },
    {
      concept: "שחקנית בוכה בחדר חשוך",
      output:
        "Extreme close-up: Slow push-in on a woman's face half-lit by a single flickering candle, tears tracing down her left cheek catching the warm light. Her jaw trembles, eyes glistening, lashes heavy with moisture. Shallow depth of field dissolves the dark bedroom behind her into soft amber bokeh. A slight handheld drift adds intimacy. Bergman-inspired chiaroscuro, 85mm portrait lens, devastating stillness.",
      category: "emotion",
    },
    {
      concept: "נשר טס מעל קניון סלעי",
      output:
        "Aerial shot: Crane down following a golden eagle soaring over a vast red-rock canyon at sunrise, wings fully extended catching thermal updrafts. The bird banks right, tilting into a sweeping dive along the cliff face as morning mist curls through the gorge below. Long shadows stretch across striated sandstone walls. Shot on 35mm, Terrence Malick golden hour warmth, breathtaking scale.",
      category: "nature",
    },
    {
      concept: "רקדנית פלמנקו על במה",
      output:
        "Medium shot: Slow dolly circles a flamenco dancer mid-zapateado, her crimson dress whipping in a controlled spiral as her heels strike the wooden stage with percussive precision. Arms sweep overhead in a dramatic arch, fingers snapping. Dust particles float through a single harsh spotlight beam cutting through surrounding darkness. Anamorphic 2.0x, De Palma theatrical staging, raw intensity.",
      category: "action",
    },
    {
      concept: "גשם כבד ברחוב ניו יורק",
      output:
        "Low angle shot: Static camera at street level captures torrential rain hammering a Manhattan crosswalk at twilight, yellow taxi cabs crawling through deep puddles sending spray against the lens. Pedestrians sprint under black umbrellas, reflections of Broadway marquees ripple across the flooded asphalt. Steam pours from a subway grate. Gordon Willis available-light aesthetic, melancholic urban poetry.",
      category: "street",
    },
    {
      concept: "שף מצית תבשיל באש גבוהה",
      output:
        "Close-up: Static shot captures a chef tilting a copper pan over a roaring gas flame as cognac ignites in a dramatic flambe, fire erupting upward in a controlled column of blue and orange. The flame reflects off stainless steel counters and the chef's focused face. Wisps of aromatic smoke curl into the warm overhead light. 50mm lens, documentary kitchen aesthetic, visceral heat.",
      category: "food",
    },
    {
      concept: "חללית ממריאה מכוכב לכת",
      output:
        "Wide shot: Slow tilt up as a weathered silver spacecraft lifts off from a barren alien plateau, thrusters blasting twin columns of blue fire that scorch the cracked earth below. Dust and debris spiral outward in expanding rings. The ship rises through a thin amber atmosphere, hull catching the light of a distant binary star. Villeneuve-scale grandeur, IMAX clarity, 24mm anamorphic.",
      category: "sci-fi",
    },
    {
      concept: "דוגמנית הולכת על מסלול אופנה",
      output:
        "Medium shot: Slow dolly backward as a model strides confidently down a glossy white runway, wearing an architectural silver gown that catches strobing flashbulbs from the audience. Her expression is composed and sharp, chin slightly elevated. The fabric ripples with each deliberate step. Shallow depth of field blurs the seated crowd into warm golden bokeh. 85mm lens, high-fashion editorial precision.",
      category: "fashion",
    },
    {
      concept: "גלים מתנפצים על צוק בסערה",
      output:
        "Wide shot: Static camera mounted on a cliff edge captures massive storm waves slamming into jagged basalt rocks, sending explosions of white spray thirty feet into the grey sky. Wind tears the spray into horizontal streaks. Dark green water churns and pulls back, exposing barnacle-covered stone before the next wave hits. Overcast diffused light, telephoto compression, raw elemental power.",
      category: "landscape",
    },
    {
      concept: "ילד רץ דרך שדה חמניות",
      output:
        "Tracking shot: Steadicam follows a barefoot boy sprinting through towering sunflowers at golden hour, his outstretched hands brushing the yellow petals as he runs. Pollen drifts in the warm backlight. The camera keeps pace at his shoulder height, sunflowers parting around him. Lens flares peek through the stalks. 35mm lens, Malick-inspired wonder, joyful kinetic energy.",
      category: "narrative",
    },
    {
      concept: "שף מכין סושי - עם שמע",
      output: `Medium shot: Slow dolly inward as a sushi chef in a pristine white uniform slices sashimi with deliberate strokes at a hinoki counter, fish glistening under a single warm overhead practical. The camera settles on a close-up of the knife contacting the fish, then pulls back to the full counter as he lifts a piece onto a dish.

Audio:
Dialogue: None.
SFX: "clean knife blade on hinoki wood, rhythmic, precise", "soft wooden tray set down on counter."
Ambient: "quiet restaurant murmur, soft ventilation hum."
Music: "sparse Japanese koto, slow tempo, contemplative."`,
      category: "food",
    },
    {
      concept: "סיקוונס רב-סצנה: פריחת עץ",
      output: `Multi-shot sequence across seasons — all from the same fixed wide angle looking up through the canopy of a cherry tree in a city park.

Scene 1 (0-15s): Bare winter branches against a pale grey sky, occasional snowflakes drifting.
Scene 2 (15-30s): Early spring — pale pink buds beginning to open on the tips of branches, soft morning light.
Scene 3 (30-45s): Full bloom — canopy exploded in deep pink blossoms, petals drifting through golden sunlight, pedestrians visible below.
Scene 4 (45-60s): Late summer — dense green leaves, dappled light, children playing beneath in warm afternoon shade.

Audio:
Dialogue: None.
SFX: "winter wind through bare branches", "spring birdsong emerging", "summer park ambience, distant laughter."
Ambient: "seasonal transition — each scene's natural environment layer."
Music: "slow minimalist piano, cycling through four quiet phrases matching each seasonal shift."`,
      category: "nature",
    },
    {
      concept: "פרסומת לבושם יוקרתי",
      output:
        "Macro shot: Impossibly smooth orbit around a crystal perfume bottle on black velvet, golden liquid catching a single focused beam of light that splits into prismatic refractions on the dark surface. A woman's hand enters frame with lacquered nails and lifts the bottle, tilting it so the light dances through the faceted glass. Slow rack focus to her lips as she applies a touch to her wrist. Fincher-level precision, aspirational luxury.",
      category: "commercial",
    },
    {
      concept: "לוחם מתאמן עם חרב בערפל",
      output:
        "Medium wide shot: Slow pan follows a lone swordsman practicing precise kata movements in a misty bamboo clearing at dawn. His blade arcs through the fog, leaving visible trails in the heavy air. Each movement is deliberate and controlled, feet shifting on wet stone. Pale diffused light wraps around his silhouette. 50mm lens, Kurosawa-inspired composition, meditative discipline.",
      category: "fantasy",
    },
    {
      concept: "סלון מעוצב בסגנון מודרני",
      output:
        "Wide shot: Slow dolly forward into a sunlit minimalist living room with floor-to-ceiling windows overlooking a forested hillside. Morning light sweeps across a white sectional sofa and polished concrete floor. Dust motes drift through the golden beams. A single potted monstera casts geometric shadows on the wall. The camera settles into a composed frame. 28mm lens, architectural digest elegance, serene stillness.",
      category: "interior",
    },
  ],
  mistakes: [
    {
      bad: "A car chase, fast, neon lights, rain, exciting --no blur",
      good: "Wide shot: Rapid tracking shot follows a black sedan drifting through rain-slicked neon streets at night, tires throwing water against glowing storefronts. Whip pan to a pursuing motorcycle. Anamorphic flares, Michael Mann palette.",
      why: "Runway uses natural flowing sentences, not keyword lists. It does not support negative prompts (--no syntax). Describe the scene cinematically.",
    },
    {
      bad: "Pan left then dolly forward then crane up then zoom in on a woman walking through a park.",
      good: "Medium shot: Slow dolly forward follows a woman walking through a sun-dappled park, camera gently rising to reveal the tree canopy above her. 35mm lens, soft natural light.",
      why: "Stacking multiple camera movements confuses Runway. Stick to one primary camera move with at most one subtle secondary move.",
    },
    {
      bad: "Negative prompt: no blur, no distortion, no flickering. A bird flies over mountains.",
      good: "Aerial shot: A hawk glides over snow-capped mountain ridges at golden hour, wings fully extended, banking into a gentle turn along the cliff face. 35mm telephoto compression, Malick warmth.",
      why: "Runway Gen-4 does not process negative prompts at all. Put all your effort into describing what you want to see, not what you want to avoid.",
    },
    {
      bad: "A kitchen scene where cooking is happening. The kitchen is busy and loud.",
      good: `Medium shot: Static camera captures a chef tilting a copper pan over a gas flame as cognac ignites in a controlled flambe, fire erupting upward in blue and orange. The flame reflects off stainless counters.

Audio:
Dialogue: None.
SFX: "cognac igniting with a deep whoosh", "sizzling fat on hot metal."
Ambient: "busy kitchen clatter, extractor fans humming in the background."
Music: "None."`,
      why: "Gen-4.5 supports native audio generation. Always include the Audio block with all four sub-keys (Dialogue, SFX, Ambient, Music). Prompts without an Audio block produce silent video.",
    },
    {
      bad: "A woman walks into a bar, orders a drink, has a conversation, then leaves and drives home.",
      good: `Wide shot: A woman in a worn leather jacket pushes through a dimly lit bar door, smoke curling around her as warm amber light from vintage fixtures catches her face. She pauses, scanning the room.

Audio:
Dialogue: None.
SFX: "bar door swinging open with a creak", "low murmur of conversation inside."
Ambient: "smoky bar ambience, low music from a jukebox."
Music: "slow blues guitar, melancholic, low in the mix."`,
      why: "Even at 60s duration, Runway Gen-4.5 works best with one coherent cinematic beat per generation. Multi-scene stories work better as separate clips using the multi-shot sequencing format.",
    },
  ],
  scoringCriteria: [
    "Shot size stated first (wide, medium, close-up) to anchor framing",
    "Exactly one primary camera move; at most one subtle secondary move",
    "Subject motion + camera motion + environment motion each get a phrase",
    "For single-scene clips: one location / moment per generation",
    "For multi-shot sequences: use Scene N (start-end): format with temporal markers",
    "30–80 words of flowing English prose (not comma keywords) for single-scene; longer for multi-shot",
    'No negatives: Runway ignores "no blur" style exclusions — describe positives only',
    "Lens or film reference when it helps (anamorphic flare, 85mm portrait)",
    "Mood line at end (melancholic, urgent, serene)",
    "Duration: up to 60s — design motion arc accordingly",
    'Audio block required: Dialogue (exact quote or "None"), SFX (2+ descriptors), Ambient, Music',
    "Lighting vocabulary (neon bounce, golden side light, single practical)",
  ],
  chainOfThoughtExamples: [
    {
      concept: "מרדף לילי בעיר",
      reasoning:
        "Runway Gen-4.5: establish wide geography, then camera move (tracking), then vehicle motion, then environment (rain, neon). One scene. No negatives. Add Audio block — SFX for tire squeal and rain, ambient city noise, music for urgency.",
      output: `Wide shot: A tracking shot races beside a black coupe sliding through a rain-slicked alley, neon kanji reflections streaking across the hood. Steam rises from a grate; the camera whips slightly as the car drifts the corner. Anamorphic lens flares, Michael Mann night palette, urgent energy.

Audio:
Dialogue: None.
SFX: "tire squeal on wet asphalt, sharp and brief", "rain hammering car roof."
Ambient: "city traffic hum, distant sirens."
Music: "urgent low synth pulse, driving tempo."`,
    },
    {
      concept: "ריקוד סולו על במה",
      reasoning:
        "Start medium; specify body motion endpoints; light as theatrical spotlight; camera orbit or slow dolly — not five moves. Audio: no dialogue, SFX for heel strikes, ambient silence, music for flamenco.",
      output: `Medium shot: Slow dolly inward as a flamenco dancer stamps a rapid zapateado, her crimson dress flaring in a single spotlight beam, dust visible in the light. The camera gently orbits her shoulders while the background falls to black. 85mm anamorphic, theatrical intensity.

Audio:
Dialogue: None.
SFX: "rapid heel strikes on wooden stage, sharp percussive crack", "fabric swish of dress."
Ambient: "silent theatre, faint audience breath."
Music: "live flamenco guitar, driving compás, building in intensity."`,
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: "A bird flying over mountains, beautiful, cinematic",
      afterPrompt:
        "Aerial shot: The camera cranes down following a golden eagle gliding over red-rock canyon walls at sunrise, wings fully extended, mist curling through the gorge below. Long lens compression stacks distant peaks. Terrence Malick golden light, slow majestic motion.",
      changes: [
        "Specified shot type, species, time, and camera behavior",
        "Removed non-actionable words in favor of motion and light",
      ],
    },
    {
      iteration: 2,
      beforePrompt: "Coffee shop, people talking, cozy",
      afterPrompt:
        "Medium shot: Slow tracking shot slides past marble café tables where two friends lean in across a small round table, steam rising from ceramic cups, warm tungsten practicals overhead, rain-streaked glass blurring the street into bokeh. Intimate conversational energy, 35mm lens.",
      changes: [
        "Grounded setting details and camera move; replaced vague mood with light behavior",
      ],
    },
  ],
};
