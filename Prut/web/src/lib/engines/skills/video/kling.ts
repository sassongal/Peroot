import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'kling' as const,
  name: 'Kling 3.0',
  examples: [
    {
      concept: 'רקדנית היפ הופ על גג בניין',
      output: 'Tracking shot from the side, medium full shot, a young woman in baggy olive cargo pants and a cropped white tank top explodes into a hip-hop routine on a concrete rooftop at golden hour. She drops low, weight sinking into her right heel as left leg sweeps out, momentum carrying her torso forward. Initially she pops her chest with sharp isolation, arms locking at 90-degree angles — then transitions into a fluid wave rolling from fingertips through shoulders to hips, weight transferring from ball of left foot to right heel. Finally she spins on her right foot, left knee driving the rotation, arms pulling tight to accelerate the turn before snapping open to freeze in a power stance. City skyline behind bathed in warm amber light, lens flare from the setting sun. Shot on RED V-Raptor, 35mm lens, music video grade color, shallow depth of field.\nNegative: morphing, distorted limbs, extra fingers, flickering, jittery movement, blurry.',
      category: 'action',
    },
    {
      concept: 'שחקן כדורסל מטביע סלאם דאנק',
      output: 'Slow dolly push-in, low angle shot, a tall athletic man in a red basketball jersey drives toward the hoop on an outdoor court. His right foot plants hard, knees bending deep to load energy — then he explodes upward, left knee driving momentum as his body accelerates vertically. His right arm extends fully overhead, the ball gripped tightly, wrist cocking back. At the apex his body hangs momentarily — then the arm hammers downward, fingers releasing as the ball crashes through the chain net which whips violently. He lands on both feet, knees absorbing the impact, weight settling through his heels as the ground seems to shake. Harsh midday sun casting sharp shadows on cracked asphalt, heat shimmer rising in the background. ARRI Alexa, 24mm wide angle, documentary realism with saturated color.\nNegative: morphing, extra limbs, distorted hands, flickering, blurry faces.',
      category: 'action',
    },
    {
      concept: 'שף מכין פסטה טרייה ביד',
      output: 'Overhead crane slowly descending to medium close-up, an Italian chef with flour-dusted hands works fresh pasta dough on a marble countertop. His palms press firmly into the golden dough, weight shifting forward from his hips through his arms, the dough compressing and spreading outward. He folds it back — fingers curling under to gather the edges, lifting with a smooth scoop, then rotating the mass 90 degrees before pressing down again. The rhythm is hypnotic: press-spread-fold-rotate. Flour particles drift upward into warm sidelight streaming through a kitchen window. Then he picks up a wooden rolling pin and begins to roll, arms extending in long strokes from center outward, the dough thinning into a translucent sheet. Rustic Tuscan kitchen, copper pots hanging in soft focus background, 85mm lens creating creamy bokeh.\nNegative: morphing, extra fingers, distorted hands, blurry, flickering.',
      category: 'food',
    },
    {
      concept: 'זאב רץ בשלג עמוק',
      output: 'Tracking shot from the side, full shot, a large grey timber wolf bounds through deep powdery snow in a dense pine forest. Each stride launches arcs of snow crystals into the cold air — front paws punch through the crust, chest plowing forward as rear legs drive with powerful extension, back muscles visibly contracting. Initially the wolf accelerates from a trot, body lowering as legs stretch longer. Then at full gallop the spine flexes dramatically — compressing as rear legs drive under the body, then extending as front legs reach forward, creating a rocking wave of momentum. Snow explodes outward with each impact. Finally the wolf slows, weight settling back onto haunches as front paws brake through the snow. Pale winter light filtering through frosted pine branches, breath visible as white plumes. Shot on 200mm telephoto, ARRI signature prime, nature documentary cinematography with shallow depth of field isolating the wolf against a soft white forest backdrop.\nNegative: morphing, extra legs, distorted face, flickering, jittery movement.',
      category: 'nature',
    },
    {
      concept: 'שני אנשים מדברים בבית קפה',
      output: 'Slow dolly right, medium two-shot, a man and woman sit across from each other at a small marble cafe table. The woman leans forward, her weight shifting onto her elbows, hands animated — right hand gesturing palm-up as she speaks, left hand wrapping around a ceramic coffee cup. The man tilts his head slightly left, listening, his shoulders relaxed but leaning back. Then he straightens, weight coming forward as he responds — his right hand rises from the table to emphasize a point, index finger extended, before settling back down. She laughs, head tilting back slightly, shoulders lifting, then returns to center. Warm interior lighting from vintage Edison bulbs overhead, steam curling from espresso cups. Shot on 50mm at f/1.4, golden afternoon light through a rain-streaked window casting soft moving shadows. Film grain, intimate drama.\nNegative: morphing, distorted hands, extra limbs, blurry faces, flickering.',
      category: 'narrative',
    },
    {
      concept: 'פרפר מתעורר מגולם',
      output: 'Extreme close-up macro shot, a monarch butterfly chrysalis hanging from a milkweed branch trembles as hairline cracks appear along the translucent green casing. The butterfly pushes outward — initially the head emerges, compound eyes catching morning dew, antennae unfurling in slow spiraling motions. Then wet crumpled wings slide out, the weight of the body causing the chrysalis to swing gently. The wings begin to pump — folding and extending in rhythmic pulses as hemolymph flows through the veins, each expansion revealing more of the orange and black pattern. Finally the wings spread fully, drying in warm sunlight, membrane stretching taut. The butterfly releases its grip, testing the air with delicate leg movements before lifting off. Dewy garden background in soft bokeh, golden backlight through translucent wings. Shot on 100mm macro with extension tubes, f/4, BBC Earth cinematography.\nNegative: morphing, extra wings, distorted patterns, flickering, blurry details.',
      category: 'macro',
    },
    {
      concept: 'גולש גלים רוכב על גל ענק',
      output: 'Tracking shot from water level, wide angle, a surfer in a black wetsuit drops into the face of a massive wave at Nazare. His front foot presses hard into the board, knees deeply bent absorbing the steep drop — body weight shifts backward as the wave wall rises behind him, water spraying off the lip in a white curtain. Initially the board accelerates down the face, the surfer crouching low with arms wide for balance — then he carves a hard bottom turn, rear foot driving the tail, body leaning into the turn as centrifugal force pulls outward. The wave curls overhead forming a barrel, green-blue water creating a cathedral of moving glass around him. Finally he races the closing section, body compressed, the white water explosion chasing just behind. Overcast grey sky, massive scale. Shot on RED Gemini with waterproof housing, 16mm fisheye, surf documentary grade.\nNegative: morphing, extra limbs, distorted board, flickering, blurry water.',
      category: 'action',
    },
    {
      concept: 'רובוט מרכיב את עצמו במפעל',
      output: 'Medium shot, slow dolly around, a humanoid robot torso stands upright on an assembly platform in a dark industrial factory. Mechanical arms descend from overhead rails carrying a chrome shoulder joint — initially the joint hovers above the socket, alignment pins rotating to match, hydraulic pistons extending with visible pressure gauges reading. Then the arm lowers precisely, the joint clicking into place with a physical snap, electromagnetic locks engaging. Sparks fly as micro-welders seal the seam from four points simultaneously. The robot\'s newly attached arm twitches — fingers curling one by one from pinky to thumb, testing each servo, the motion accelerating from cautious to fluid. Blue LED status lights pulse along the arm circuits. Cool industrial lighting with orange sparks providing contrast, steam venting from floor grates. ARRI Alexa Mini, 35mm anamorphic, Ridley Scott industrial aesthetic.\nNegative: morphing, extra fingers, distorted joints, flickering, inconsistent robot design.',
      category: 'sci-fi',
    },
    {
      concept: 'ילדה מציירת על קיר ברחוב',
      output: 'Medium close-up, slow push-in, a girl around 10 years old with paint-stained overalls and a messy ponytail kneels before a brick wall in an urban alley. Her right hand grips a thick brush loaded with bright yellow paint — she reaches up and drags a long deliberate stroke across the rough surface, the bristles catching on mortar lines. Her left hand braces against the wall for balance, body weight shifting onto her forward knee. Then she dips the brush into a bucket of electric blue, the paint swirling, and switches to quick dabbing motions — her wrist flicking rhythmically, adding dots that form a constellation pattern. She leans back onto her heels, head tilting to assess the work, eyes squinting, then nods to herself with a small smile. Late afternoon sun rakes down the alley creating long shadows. 50mm at f/2, warm urban light, indie film intimacy.\nNegative: morphing, extra fingers, distorted hands, flickering, blurry face.',
      category: 'street',
    },
    {
      concept: 'רכבת קיטור חוצה גשר בהרים',
      output: 'Wide establishing shot, tracking from helicopter altitude, a black steam locomotive pulling five weathered carriages crosses a stone viaduct spanning a deep mountain gorge. Thick white steam erupts from the stack — initially billowing vertically, then caught by mountain wind and dragged horizontally along the train\'s length, partially obscuring the carriages. The locomotive\'s driving wheels rotate with visible mechanical linkage, pistons pumping in rhythmic sequence. The bridge\'s stone arches cast deep shadows into the forested ravine below where a river glints silver. As the train reaches mid-bridge, the steam catches golden sunlight, transforming from white to luminous amber. Finally the last carriage clears the bridge and enters a tunnel cut into the mountainside, the steam trailing behind like a ghost. Early morning alpine light, mist in the valley below. Shot on 70mm IMAX, David Lean epic scope.\nNegative: morphing, distorted wheels, flickering, train cars changing shape, inconsistent steam.',
      category: 'landscape',
    },
    {
      concept: 'זוג רוקד וולס באולם נשפים',
      output: 'Slow orbit shot, medium full frame, a couple in formal attire waltzes across a polished marble ballroom floor. The man in a tailored black tuxedo leads — his right hand pressing firmly against her lower back, weight transferring from his right foot to left in smooth gliding steps. The woman in a floor-length ivory gown follows, her skirt swirling outward with each turn, fabric catching the light from crystal chandeliers above. Initially they move in a tight box step, bodies close — then he extends his left arm, guiding her into a spin, her body rotating on the ball of her right foot, hair and dress trailing in a graceful arc. She returns to closed position, her left hand settling on his shoulder. Their movements are synchronized, rising and falling with the invisible rhythm. Warm golden chandelier light, reflections sliding across the mirror-finish floor. 50mm anamorphic, Barry Lyndon candlelit elegance.\nNegative: morphing, extra limbs, distorted faces, flickering, clipping through bodies.',
      category: 'narrative',
    },
    {
      concept: 'פרסומת לרכב חשמלי יוקרתי',
      output: 'Wide shot, smooth tracking alongside, a sleek white electric sedan glides silently along a coastal highway at dawn. The car\'s polished surface reflects the pink and gold sky — initially the camera tracks at bumper height showing the seamless body lines, wheels rotating on dark asphalt. Then the camera rises in a sweeping crane up, revealing the dramatic cliff road with ocean below, the car appearing to float along the edge. Morning sun strikes the windshield creating a perfect flare. The car rounds a gentle curve, body leaning slightly into the turn, headlights cutting through thin coastal mist. Finally a wide aerial reveals the car as a white speck on the serpentine road carved into green cliffs above turquoise water. Shot on ARRI Alexa 65, 40mm, automotive commercial grade with rich saturated color.\nNegative: morphing, distorted car body, flickering, inconsistent reflections, blurry wheels.',
      category: 'commercial',
    },
  ],
  mistakes: [
    {
      bad: 'A dancer moves. Negative: bad quality.',
      good: 'Tracking shot from the side, medium full shot, a young woman in olive cargo pants explodes into a hip-hop routine on a concrete rooftop at golden hour. She drops low, weight sinking into her right heel as left leg sweeps — then transitions into a fluid wave rolling from fingertips through shoulders. 35mm lens, music video grade.\nNegative: morphing, distorted limbs, extra fingers, flickering, jittery movement.',
      why: 'Kling needs detailed physics — specify body weight distribution, which muscles engage, how momentum transfers. Vague descriptions produce generic, uncontrolled motion.',
    },
    {
      bad: 'A man jumps from one place to another place quickly.',
      good: 'Low angle, a man plants his right foot and explodes upward — left knee driving momentum, body accelerating vertically. At the apex he hangs momentarily, then descends, landing on both feet with knees absorbing impact, weight settling through heels.',
      why: 'Motion must have clear start and end positions. Specify the arc: preparation (loading), action (the move), and resolution (landing/settling). Vague endpoints produce floating, directionless motion.',
    },
    {
      bad: 'A cat walks on a table and knocks things over.',
      good: 'Close-up, a grey tabby cat steps delicately onto a wooden table — initially placing one paw carefully, then shifting weight forward as the second paw reaches past a glass. Then its tail swings right, clipping the glass which wobbles, tilts, and falls — the cat\'s ears flatten as the glass hits the floor. Shot on 85mm, warm kitchen light.\nNegative: morphing, extra legs, distorted face, flickering.',
      why: 'Kling needs temporal markers (initially, then, finally) to sequence events clearly. Without them, all actions may happen simultaneously or in random order.',
    },
    {
      bad: 'A beautiful sunset over mountains with birds flying.',
      good: 'Wide shot, golden hour, the sun sinks behind jagged mountain peaks as a V-formation of geese crosses the frame from left to right — their wings pump in synchronized rhythm, initially high against the orange sky, then gradually descending toward a dark tree line. Warm light catches the snow-capped ridges. 200mm telephoto compression, nature documentary grade.\nNegative: morphing, extra wings, flickering, distorted birds.',
      why: 'Even landscape shots need motion physics for Kling. Describe how birds fly (wing rhythm, formation, direction), how light changes, or how clouds move. Static descriptions waste Kling\'s motion strengths.',
    },
    {
      bad: 'Two people talking at a table.',
      good: 'Slow dolly right, medium two-shot, a man and woman sit at a cafe table. The woman leans forward, weight shifting onto elbows, right hand gesturing palm-up. The man tilts his head left, listening, shoulders relaxed. Then he straightens, weight coming forward, right hand rising to emphasize a point before settling down. She laughs, head tilting back. 50mm at f/1.4, warm afternoon light.\nNegative: morphing, distorted hands, blurry faces, flickering.',
      why: 'Kling requires body mechanics even for dialogue scenes. Describe weight shifts, gesture arcs, and postural changes — not just "talking." The prompt should be 50-200 words to give enough physical detail.',
    },
  ],
  scoringCriteria: [
    'Physics-first: weight transfer, momentum, material response (fabric, water, metal)',
    'Each motion has start → peak → settle (endpoints explicit)',
    'Camera move + lens named (35mm tracking, 85mm portrait)',
    'Temporal spine: initially / then / finally across the clip duration',
    '50–200 words — dense but one coherent timeline',
    'Negative line at end for artifacts (hands, flicker, morph) — Kling supports negatives',
    'Multi-layer depth: foreground / mid / background motion if needed',
    'Lip-sync or dialogue format if audio-in-video is required',
    'Speed words match emotion (explosive vs gentle)',
    'Single primary scene — multi-shot only when storyboard syntax is intentional',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'אגרוף במהירות בסלואו מושן',
      reasoning:
        'Kling needs impact physics: hip rotation, shoulder whip, sweat droplets, camera speed. Mark time. Add negative for morphing fists.',
      output:
        'Initially: Medium shot, handheld at shoulder height — a boxer in red gloves shifts weight to his back foot, knuckles whitening. Then: He uncoils a straight right, shoulder rolling forward, sweat beads flinging into warm gym haze. Finally: The heavy bag shudders on its chain, dust puffs from the canvas. 85mm lens, slow-motion feel, harsh overhead practicals. Negative: morphing gloves, extra limbs, flicker.',
    },
    {
      concept: 'מכונית חולפת בלילה',
      reasoning:
        'Vehicle motion: speed, reflections on wet asphalt, camera parallel tracking. Environment: rain, neon smear.',
      output:
        'Wide tracking shot: A matte sedan glides parallel to camera along a rain-slicked avenue, neon ribbons streaking across wet paint, tires throwing fine mist that catches magenta storefront glow. Street steam rolls at ankle height. Anamorphic flares, low shutter energy. Negative: jitter, duplicated cars, warped reflections.',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt:
        'A dancer spins, fast, stage, lights',
      afterPrompt:
        'Medium shot: Initially a ballerina in white gathers momentum with arms crossed tight. Then she opens into a rapid chainé turn, skirt flaring in a perfect disk under a single cold spotlight, toe shoes blurring at the edge of frame. Finally she brakes into fourth position, chest heaving. Stage haze catches the beam. Negative: extra legs, face morph, flicker.',
      changes: [
        'Beat structure + garment physics; specified lighting and shot size',
      ],
    },
    {
      iteration: 2,
      beforePrompt:
        'Dragon flies over castle',
      afterPrompt:
        'Aerial shot: A jade-scaled dragon banks over a fog-wreathed castle spire, wings flexing with slow power, tail trailing ember sparks into the wind. Clouds part around the tower as the camera tilts up to follow the climb, moonlight rim-lighting scales. Fantasy epic, 35mm aerial lens feel. Negative: melting wings, duplicate heads, flicker.',
      changes: [
        'Added scale layers, light direction, and negative artifact list',
      ],
    },
  ],
};
