import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'minimax' as const,
  name: 'Minimax Hailuo 2.3',
  examples: [
    {
      concept: 'ילד מגלה מתנה ליום הולדת',
      output: '[Push in, Static shot] A boy around 7 years old with messy brown hair and a striped birthday party hat sits cross-legged on a living room carpet in front of a large wrapped box with a gold bow. His eyes are wide, pupils dilating as he tears away the wrapping paper. His mouth falls open — jaw drops slowly, brow arches high, then his entire face transforms: corners of mouth spread into an enormous grin, cheeks bunch up pushing his eyes into happy crescents. He gasps and bounces on his knees, shoulders rising with excitement, both hands flying to his cheeks. Then he lunges forward and wraps his arms around the box, pressing his cheek against it. Warm living room light from a floor lamp, colorful balloons in soft focus behind.',
      category: 'emotion',
    },
    {
      concept: 'שני חברים ישנים משוחחים על ספסל בפארק',
      output: '[Tracking shot, slow truck right] Two elderly men in their 70s sit on a weathered wooden park bench beneath an oak tree — one in a flat cap and brown cardigan, the other in a navy windbreaker with reading glasses perched on his nose. The man in the cap speaks, right hand gesturing slowly palm-up, head nodding gently. The other listens, eyes narrowing slightly, lip pressing together in thought. Then his brow furrows, he tilts his head left and raises an index finger — "but wait" — before breaking into a chuckle, shoulders shaking, crow\'s feet deepening around his eyes. The first man responds with a dismissive wave but can\'t suppress a smirk, the corner of his mouth twitching upward. Dappled sunlight through autumn leaves, golden warm tones, documentary style.',
      category: 'narrative',
    },
    {
      concept: 'לוחמת קונג פו מוכנה לקרב',
      output: '[Pan right, Push in] A young woman in a black silk kung fu uniform with red trim stands barefoot on a stone courtyard in a mountain temple. She shifts her weight onto her back foot, right arm sweeping slowly across her body into a guard position — fingers tight, wrist aligned. Her jaw tightens, nostrils flare slightly as she inhales through her nose, eyes locked forward with razor focus. Then she snaps into a front kick — rear leg driving forward with explosive speed, hips rotating, arms chambered tight to her ribs. She lands softly on her front foot, weight transferring smoothly, and flows immediately into a low sweeping stance, left palm pressing toward the ground, right fist cocked at her hip. Pupils contract with intensity. Early morning mist drifts across the stone floor, warm golden sidelight from the rising sun.',
      category: 'action',
    },
    {
      concept: 'אישה קוראת מכתב מרגש',
      output: '[Static shot, slow zoom in] A woman in her early 30s with dark hair in a loose bun, wearing a cream knit sweater, sits in an armchair by a rain-streaked window holding a handwritten letter. Her eyes scan the page — initially neutral, lips slightly parted. Then her brow softens, the hard line between her eyes dissolving. Her bottom lip quivers almost imperceptibly. A slow blink pushes a single tear from her right eye that traces down her cheek. She presses her lips together hard, chin dimpling as she fights to maintain composure, then exhales shakily, shoulders dropping. Her free hand rises to her collarbone and rests there. She closes her eyes and brings the letter to her chest. Soft grey window light, shallow depth of field, intimate and quiet.',
      category: 'emotion',
    },
    {
      concept: 'צופה בקהל מגיב לגול בכדורגל',
      output: '[Pull out, Shake] A man in his 30s wearing a blue and white striped football scarf stands packed among stadium fans. His body is tense, leaning forward, both fists clenched at chest height, jaw set, eyes locked on something off-screen. Then the moment hits — his eyes blow wide, pupils dilating, mouth ripping open into a scream. His arms explode upward, fists pumping above his head, entire body launching from his seat. His face contorts through shock to pure euphoria in under a second: brow shoots up, eyes squeeze shut, veins appear on his neck as he roars. He grabs the stranger next to him by the shoulders, shaking him. Tears begin to form at the corners of his eyes. Stadium floodlights create a harsh top-light, confetti drifting in the air, blue and white scarves waving in the background.',
      category: 'action',
    },
    {
      concept: 'שף מצלה סטייק על גריל',
      output: '[Push in, Static shot] A bearded chef in a black apron grips tongs in his right hand, hovering over a blazing charcoal grill. He lowers a thick-cut ribeye onto the grate — the instant it makes contact, his eyes narrow with satisfaction as sizzling oil and fat send a burst of flame licking upward. His left hand reaches for a long-handled brush, sweeping herb butter across the surface in three precise strokes. He leans in, nostrils widening as he inhales the smoke, corners of his mouth curling into a subtle self-assured grin. Then he flips the steak with a confident wrist snap, revealing a deep mahogany crust, and steps back slightly, chin lifting as he surveys the sear. Warm firelight from the grill illuminating his face from below, smoke curling upward into dark evening air.',
      category: 'food',
    },
    {
      concept: 'חוקרת מגלה ממצא במערה',
      output: '[Tracking shot, slow push in] A woman in her 40s wearing a dusty khaki field vest and headlamp crawls through a narrow limestone cave passage. Her fingers brush away centuries of calcite deposit from a section of wall — then freeze. Her eyes widen, pupils expanding in the dim light, brow lifting high. Her mouth parts silently, the lower lip trembling once. She traces the outline of what she has found with her index finger, barely touching the surface, hand visibly shaking. Then she sits back on her heels, free hand pressing against her sternum, eyes glistening, a slow exhale escaping through her nose. She blinks rapidly three times, fighting tears, then lets a breathless laugh escape — one sharp exhale of disbelief followed by a grin that crumples her composure completely. Cool blue headlamp cutting through dusty cave air, warm ochre tones on the ancient stone.',
      category: 'documentary',
    },
    {
      concept: 'ילדה מנסה לימון בפעם הראשונה',
      output: '[Static shot, slow zoom in] A toddler around 2 years old with wispy red curls and a polka-dot bib sits in a high chair at a kitchen table. A hand from off-screen offers a lemon wedge. The toddler grabs it with both hands, mouth already open. She bites down — immediately her entire face contracts: eyes scrunch shut, nose crinkles upward, lips pucker dramatically inward, chin jutting forward. Her shoulders rise to her ears. A full-body shudder runs through her. Then her eyes pop open in bewildered outrage, brow furrowing, lower lip pushing out into a pout. But she looks at the lemon again — and bites it a second time, producing the exact same convulsive reaction but followed this time by a tiny giggle, tongue poking out. Bright kitchen light, clean white background, family documentary warmth.',
      category: 'emotion',
    },
    {
      concept: 'מוזיקאי רחוב מנגן סקסופון',
      output: '[Pan left, Static shot] A man in his 60s in a rumpled tweed blazer and a porkpie hat stands on a rain-dampened New Orleans sidewalk, a battered brass tenor saxophone at his lips. His cheeks balloon outward as he sustains a long note, eyes closed, head tilting slowly to the left. Then his fingers begin to dance — ring finger lifting while pinky presses, a cascade of rapid key changes. His brow furrows with effort on a high note, nostrils flaring as he pushes air, the tendons in his neck standing out. He pulls the saxophone away from his lips for a breath, mouth stretching into a warm gap-toothed smile, then brings it back for a final crescendo, body swaying right as the last note rings. Warm golden streetlight from behind, neon bar signs reflected in wet cobblestones, evening mist.',
      category: 'street',
    },
    {
      concept: 'חתול קופץ על שולחן ומפיל כוס',
      output: '[Static shot, slight pan right] A sleek grey tabby cat crouches on a kitchen counter, eyes fixed on a glass of water sitting on the edge of a dining table two feet away. Its pupils are huge black circles, ears rotated forward, haunches wiggling in pre-jump calibration. Then it launches — body stretching into a long arc, front paws reaching. It lands on the table with a soft thud, but its right rear paw clips the glass. The glass wobbles once, twice, then tips — the cat watches it fall with an expression of studied indifference, ears rotating backward slightly. Its head tracks the glass all the way down. Then it looks directly into the camera with narrowed eyes, one ear flicking. No remorse. Bright overhead kitchen light, clean modern kitchen background.',
      category: 'narrative',
    },
    {
      concept: 'פנים של אדם שומע בשורה רעה',
      output: '[Static shot, slow zoom in] A man in his 50s with salt-and-pepper stubble, wearing a wrinkled white dress shirt with the collar open, sits at a desk holding a phone to his ear. His expression is neutral, attentive. Then the shift begins — almost imperceptible at first: the light leaves his eyes, focus dissolving. His jaw slackens, the phone drifting a centimeter from his ear. A single swallow moves his Adam\'s apple. His nostrils widen as breathing becomes deliberate and controlled. Then his eyes glass over, reddening at the rims, but no tears fall — instead his jaw sets hard, muscles bunching at the temples. He lowers the phone slowly, places it face-down on the desk with exaggerated care, and stares at nothing, both hands flat on the surface, fingers spread. Flat office fluorescent light, desaturated tones, uncomfortable stillness.',
      category: 'emotion',
    },
    {
      concept: 'ספורטאית זורקת כדור במשחק כדורעף',
      output: '[Pull out, Pan up] A tall woman in a teal volleyball jersey, ponytail whipping, stands at the service line gripping a volleyball in her left hand. Her eyes lock onto a target across the net, nostrils flaring as she takes a deep breath — chest expanding, shoulders squaring. She tosses the ball high with her left hand, arm extending fully. Her right arm cocks back behind her head, elbow high. Then she explodes upward off both feet — back arching, abs contracting as her right hand accelerates forward and connects with the ball at the peak of her jump. Her hand wraps over the top creating topspin, the ball rocketing forward. She lands with a forward lean, eyes tracking the ball, then pumps her fist with a sharp exhale. Harsh gymnasium overhead lights, polished wooden floor, crowd in soft focus.',
      category: 'action',
    },
  ],
  mistakes: [
    {
      bad: 'A woman in a beautiful dress stands in a garden. She looks happy and waves.',
      good: '[Push in, Static shot] A woman in her 30s in a flowing emerald sundress stands in a rose garden. Her lips part into a warm smile — cheeks rising, crow\'s feet forming. Her right hand lifts in a gentle wave, fingers spreading, wrist rotating. Then her head tilts, eyes crinkling as the smile deepens, dimples appearing on both cheeks.',
      why: 'Minimax requires [Camera bracket] commands at the start. Without brackets, the camera defaults to a random angle. Also, "looks happy" is too vague — describe the micro-expressions: which muscles move, how the eyes change, what the lips do.',
    },
    {
      bad: '[Static shot] A man is sad and crying. He looks away.',
      good: '[Static shot, slow zoom in] A man in his 40s sits at a desk, phone pressed to his ear. His jaw slackens, the light leaving his eyes. A single swallow moves his Adam\'s apple. His nostrils widen as breathing becomes controlled. Then his eyes glass over, reddening at the rims, jaw setting hard, muscles bunching at the temples. He lowers the phone slowly and stares at nothing, both hands flat on the desk.',
      why: '"Sad and crying" is a general emotion label, not a performance direction. Minimax excels at micro-expressions — describe the physical cascade: how the face changes muscle by muscle, where tension appears, what the eyes and mouth do sequentially.',
    },
    {
      bad: '[Pan right] A dancer does a routine. She kicks and spins and jumps around the stage for a while.',
      good: '[Pan right, Push in] A young woman in a black kung fu uniform shifts weight onto her back foot, right arm sweeping into a guard position. Her jaw tightens, nostrils flare. Then she snaps into a front kick — rear leg driving forward, hips rotating, arms chambered. She lands softly and flows into a low sweeping stance, left palm pressing toward the ground, right fist cocked at her hip.',
      why: 'Minimax needs sequential body choreography — describe each move as a chain: which foot plants, how weight transfers, what the arms do simultaneously. "Kicks and spins and jumps" is a list of moves without physical connection between them.',
    },
    {
      bad: '[Zoom in] She walks across the room and picks something up and puts it down and then walks back.',
      good: '[Push in, Static shot] She crosses the room with deliberate steps, right hand reaching forward. Her fingers close around the object — a porcelain figurine — lifting it to eye level, head tilting as she examines it. Then her expression softens, a faint smile forming at the left corner of her mouth. She places it back with care, fingertips lingering on the surface, before turning away.',
      why: 'Minimax uses specific camera bracket commands: [Push in], [Pull out], [Pan left/right], [Tracking shot], [Static shot], [Shake]. "Zoom in" is not a recognized bracket command. Also, each action needs physical detail, not just a sequence of verbs.',
    },
  ],
  scoringCriteria: [
    '[Camera bracket] commands are present at the start with recognized Minimax camera types (Push in, Pull out, Pan, Tracking shot, Static shot, Shake)',
    'Micro-expression vocabulary used: specific facial muscle movements (brow lifts, pupils dilate, jaw slackens, nostrils flare, lip quivers) rather than emotion labels',
    'Sequential body choreography: each physical action connects to the next with weight transfer and momentum described',
    'Prompt length is 40-100 words of dense physical description following the camera bracket',
    'At least 3 distinct sequential actions are described with physical cause-and-effect relationships',
    'Environmental lighting and mood are specified to ground the scene visually',
  ],
};
