import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'higgsfield' as const,
  name: 'Higgsfield Cinema',
  examples: [
    {
      concept: 'רקדנית סלסה בהופעה',
      output: `[Camera: medium shot, slow orbit right]
[Subject: woman in her 20s, dark curly hair pinned up, fitted emerald sequin dress, gold heels, stage spotlight]
[Motion: at 0s spins into frame with arms extended — at 1s hips snap left then right with sharp isolation — at 2s drops into a low dip, back arching, partner's hand at her waist — at 3s whips back upright, hair escaping pins, dress catching the light]
Shot on full-frame cinema camera, dramatic warm spotlight with haze, Latin dance showcase aesthetic. Total: 4s.`,
      category: 'action',
    },
    {
      concept: 'שוער כדורגל מרחיק כדור',
      output: `[Camera: low angle, tracking shot left to right]
[Subject: goalkeeper in neon yellow kit, athletic build, muddy knees, goal frame behind]
[Motion: at 0s ball enters frame from top-right — at 0.5s goalkeeper launches sideways, arms fully extended, body horizontal — at 1.5s fingertips deflect the ball over the crossbar, body rotating — at 2.5s crashes onto turf, slides through wet grass, immediately pushes up to knees]
Shot on cinema camera 24mm wide, stadium floodlights cutting through rain, sports broadcast aesthetic. Total: 3.5s.`,
      category: 'action',
    },
    {
      concept: 'דיוקן אישה מדליקה סיגריה',
      output: `[Camera: close-up, static with subtle handheld drift]
[Subject: woman in her 40s, sharp cheekbones, dark lipstick, black turtleneck, face half in shadow from a neon hotel sign outside]
[Motion: at 0s raises a cigarette to her lips with two fingers — at 1.5s flicks a brass lighter, flame illuminating her eyes — at 3s inhales slowly, ember glowing orange, then exhales a thin stream of smoke that curls upward through the neon light]
Anamorphic lens flare, neo-noir chiaroscuro, Wong Kar-wai color palette. Total: 4s.`,
      category: 'portrait',
    },
    {
      concept: 'חשיפת מוצר - אוזניות חדשות',
      output: `[Camera: macro to medium, crane up while pulling out]
[Subject: matte black wireless earbuds on a dark reflective surface, minimal packaging, single overhead spot]
[Motion: at 0s tight macro on the earbud surface showing texture detail — at 1s camera pulls back as a hand enters frame and lifts one earbud — at 2.5s hand places it in ear, camera now at medium shot revealing a model in a clean white studio — at 3.5s model turns head to profile, earbud catching the light]
Commercial product reveal lighting, Apple-grade minimalism, 100mm macro transitioning to 50mm. Total: 4s.`,
      category: 'product',
    },
    {
      concept: 'אישה הולכת ברחוב פריזאי',
      output: `[Camera: full shot, slow dolly backward keeping subject centered]
[Subject: woman in her 30s, auburn bob, camel trench coat, white sneakers, tote bag on left shoulder, Haussmann buildings behind]
[Motion: at 0s walks toward camera with confident stride on cobblestone — at 1.5s wind catches her coat, she tucks hair behind her ear with her right hand without breaking pace — at 3s glances left at a patisserie window, slight smile, then returns gaze forward]
Shot on 50mm at f/2, soft overcast Parisian light, pastel storefronts in background bokeh, French New Wave aesthetic. Total: 4s.`,
      category: 'fashion',
    },
    {
      concept: 'ברמן מכין קוקטייל',
      output: `[Camera: medium close-up, slow push-in with slight downward tilt]
[Subject: bartender in his 30s, trimmed beard, white dress shirt with rolled sleeves, black vest, standing behind a polished oak bar with amber bottle-lit shelves]
[Motion: at 0s grabs a silver shaker with right hand and a bottle of bourbon with left — at 1s pours a measured stream into the shaker, liquid catching the amber backlight — at 2s snaps the shaker shut and shakes overhead with both hands, ice rattling — at 3s strains the cocktail into a coupe glass in one smooth pour — at 3.5s garnishes with a twist of orange peel, flame-expressed over the surface]
Warm amber bar lighting, shallow DOF, Prohibition-era elegance. Total: 4s.`,
      category: 'food',
    },
    {
      concept: 'חייל עתידני מתכונן לקרב',
      output: `[Camera: medium shot, slow tracking right to reveal full armor]
[Subject: soldier in matte dark-grey exoskeleton armor with glowing blue joint seams, visor retracted showing a scarred face, standing in a dimly lit armory]
[Motion: at 0s reaches for a pulse rifle mounted on the wall rack — at 1s slides it off and racks the charging handle with a mechanical snap — at 2s visor closes over face with a hydraulic whirr, blue HUD elements flickering on — at 3s turns toward camera, rifle held at low-ready, the blue joint lights pulsing once in sync]
Cool steel-blue industrial lighting, Ridley Scott military aesthetic, 35mm anamorphic. Total: 4s.`,
      category: 'sci-fi',
    },
    {
      concept: 'ילדה מקבלת גור כלבים',
      output: `[Camera: medium shot, static with gentle handheld sway]
[Subject: girl around 6, messy blonde pigtails, pink overalls, sitting cross-legged on a living room carpet, a cardboard box with a ribbon in front of her]
[Motion: at 0s lifts the box lid and peers inside — at 0.5s eyes go wide, mouth drops open in shock — at 1s a golden retriever puppy scrambles out of the box — at 2s she scoops the puppy up, pressing it to her face, shoulders shaking with silent laughter — at 3s the puppy licks her cheek, she falls backward onto the carpet clutching it, legs kicking with joy]
Warm living room light, soft afternoon glow through curtains, 50mm shallow DOF, Spielberg domestic warmth. Total: 4s.`,
      category: 'emotion',
    },
    {
      concept: 'שפית קוצצת ירקות במהירות',
      output: `[Camera: close-up on hands, static shot with slight overhead angle]
[Subject: chef's hands — tanned, strong, a thin scar across the left thumb — gripping a carbon-steel knife, a pile of fresh herbs and vegetables on a thick wooden cutting board]
[Motion: at 0s left hand positions a bunch of chives with curled fingertips — at 0.5s right hand begins rapid-fire mincing, the blade a blur, a rhythmic tok-tok-tok — at 2s sweeps the chives aside and pulls a bell pepper into position — at 2.5s rocks the knife through clean julienne strips, each cut identical — at 3.5s wipes the blade on a towel with a single confident stroke]
Warm overhead kitchen light, documentary food-show intimacy, macro clarity on the blade. Total: 4s.`,
      category: 'food',
    },
    {
      concept: 'רקדן ברייקדאנס על הרחוב',
      output: `[Camera: low angle, slow pan left following rotation]
[Subject: man in his early 20s, red bandana, sleeveless white tee, black track pants, dancing on a flattened cardboard sheet on a sidewalk, boombox in the background]
[Motion: at 0s plants both hands and kicks legs into a windmill — at 1s body rotates on upper back, legs sweeping in a wide circle — at 2s transitions to a one-handed freeze, body inverted, legs split in a V — at 3s drops down and spins into a backspin, momentum slowing — at 3.5s pops to his feet and throws both arms up in a victory pose]
Golden hour sidelight on concrete, urban street performance energy, 24mm wide-angle distortion. Total: 4s.`,
      category: 'street',
    },
    {
      concept: 'מודל מצטלמת לשער מגזין',
      output: `[Camera: medium close-up, slow orbit left with slight tilt down]
[Subject: woman in her late 20s, high cheekbones, slicked-back dark hair, dramatic winged eyeliner, oversized emerald blazer with nothing underneath, gold chain necklace, standing against a seamless cream backdrop]
[Motion: at 0s turns chin slowly toward camera, eyes following a beat later — at 1s left hand rises to the blazer lapel, fingers grazing the fabric — at 2s she tilts her head right, a knowing half-smile forming — at 3s looks directly into lens, jaw tightening, commanding presence — at 3.5s exhales through parted lips, shoulders relaxing]
Studio beauty lighting with a large softbox key and a hard rim, editorial Vogue precision, 85mm f/1.4. Total: 4s.`,
      category: 'editorial',
    },
    {
      concept: 'רוכב אופניים דוהר במורד הר',
      output: `[Camera: chest-mounted POV transitioning to side tracking shot]
[Subject: mountain biker in red helmet and black jersey, riding a full-suspension bike down a steep rocky trail through a pine forest]
[Motion: at 0s POV shot — handlebars visible, trail rushing toward camera, rocks and roots flying past — at 1s cut to side tracking shot as biker launches off a natural rock drop — at 2s lands on rear wheel first, suspension compressing, body absorbing impact — at 3s carves a tight berm turn, inside pedal raised, dirt spraying outward — at 3.5s accelerates out of the turn, standing on pedals, pumping into the next section]
Dappled forest light, dust catching golden backlight, GoPro-to-cinema transition, Red Bull edit energy. Total: 4s.`,
      category: 'action',
    },
    {
      concept: 'קוסם מוציא ארנב מכובע',
      output: `[Camera: medium shot, static with slow push-in]
[Subject: magician in his 50s, silver goatee, classic black tuxedo with red pocket square, standing on a small theater stage, a black top hat on a velvet-draped table]
[Motion: at 0s waves his right hand over the hat in three slow circles — at 1s reaches inside with dramatic flair, arm disappearing to the elbow — at 2s pauses with a puzzled expression, then his eyes widen — at 3s pulls out a fluffy white rabbit by the scruff, holding it high as it wiggles its nose — at 3.5s tucks the rabbit into the crook of his left arm and takes a bow]
Single warm spotlight with theatrical haze, deep shadows around the stage, old-world magic show ambiance, 50mm. Total: 4s.`,
      category: 'narrative',
    },
  ],
  mistakes: [
    {
      bad: '[Camera: medium shot]\n[Subject: a strong person with cool armor, blue lights, looks futuristic]\n[Motion: picks up a weapon and gets ready]\nSci-fi style. Total: 4s.',
      good: '[Camera: medium shot, slow tracking right to reveal full armor]\n[Subject: soldier in matte dark-grey exoskeleton armor with glowing blue joint seams, visor retracted showing a scarred face, standing in a dimly lit armory]\n[Motion: at 0s reaches for a pulse rifle on the wall rack — at 1s slides it off and racks the charging handle — at 2s visor closes with a hydraulic whirr, blue HUD elements flickering on — at 3s turns toward camera, rifle at low-ready]\nCool steel-blue lighting, Ridley Scott aesthetic, 35mm anamorphic. Total: 4s.',
      why: 'Subject descriptions belong in the [Subject] bracket, and identity/appearance details must never leak into [Motion]. Motion must have second-by-second timing (at 0s, at 1s). Vague motion like "gets ready" produces randomized movement.',
    },
    {
      bad: 'The woman walks toward the camera. She is wearing a trench coat. The street is Parisian. She smiles at a bakery. Shot on 50mm.\nTotal: 4s.',
      good: '[Camera: full shot, slow dolly backward keeping subject centered]\n[Subject: woman in her 30s, auburn bob, camel trench coat, white sneakers, tote bag on left shoulder, Haussmann buildings behind]\n[Motion: at 0s walks toward camera with confident stride on cobblestone — at 1.5s wind catches her coat, she tucks hair behind ear — at 3s glances left at a patisserie window, slight smile, then returns gaze forward]\n50mm at f/2, soft overcast Parisian light, French New Wave aesthetic. Total: 4s.',
      why: 'Higgsfield requires the strict 3-bracket format: [Camera], [Subject], [Motion]. Paragraph prose is not parsed correctly. Each bracket serves a distinct purpose — mixing them degrades control.',
    },
    {
      bad: '[Camera: medium shot]\n[Subject: dancer on stage]\n[Motion: she dances around for a while and does some spins]\nTotal: 4s.',
      good: '[Camera: medium shot, slow orbit right]\n[Subject: woman in her 20s, dark curly hair pinned up, fitted emerald sequin dress, gold heels, stage spotlight]\n[Motion: at 0s spins into frame with arms extended — at 1s hips snap left then right with sharp isolation — at 2s drops into a low dip, back arching — at 3s whips back upright, hair escaping pins, dress catching the light]\nDramatic warm spotlight with haze. Total: 4s.',
      why: 'Motion bracket needs timing cues at specific seconds (at 0s, at 1s, at 2s). Without them, Higgsfield cannot sequence the choreography and produces a single blurred action. Total duration must match the last timing marker.',
    },
    {
      bad: '[Camera: wide shot, then close-up, then aerial]\n[Subject: a man running]\n[Motion: at 0s he runs — at 2s he runs faster — at 4s he stops]\nTotal: 4s.',
      good: '[Camera: low angle, tracking shot left to right]\n[Subject: athlete in neon yellow kit, athletic build, muddy knees, stadium behind]\n[Motion: at 0s sprints from left — at 0.5s launches into a diving leap, body horizontal — at 1.5s hits the ground and slides — at 2.5s pushes up to knees, fist pumping]\n24mm wide, stadium floodlights, sports broadcast aesthetic. Total: 3.5s.',
      why: 'Higgsfield processes one camera setup per clip. Listing multiple camera changes (wide, then close-up, then aerial) breaks the render. Choose one camera angle and movement per clip.',
    },
  ],
  scoringCriteria: [
    '3-layer bracket structure is used: [Camera], [Subject], and [Motion] are all present and distinct',
    'Timing cues at specific seconds: Motion bracket includes "at 0s," "at 1s," etc. with 0.5-1s granularity',
    'Total duration is specified and matches the final timing marker in the Motion bracket',
    'No layer mixing: identity/appearance details stay in [Subject], actions stay in [Motion], shot setup stays in [Camera]',
    'Subject bracket has 5+ specific details (age, hair, clothing, accessories, environment)',
    'Camera bracket specifies both shot size and movement type (e.g., "medium shot, slow orbit right")',
  ],
};
