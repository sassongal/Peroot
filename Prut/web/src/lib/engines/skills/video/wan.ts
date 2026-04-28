import type { PlatformSkill } from "../index";

export const skill: PlatformSkill = {
  platform: "wan" as const,
  name: "Wan 2.6",
  examples: [
    {
      concept: "נשר טס מעל קניון צבעוני",
      output:
        "A golden eagle with wings fully extended soaring over a vast red-rock canyon at dusk, riding thermal updrafts along the sheer cliff face. The camera follows from behind in a low tracking arc, revealing layers of striated sandstone glowing amber and burgundy in the fading light. Sparse desert shrubs cling to ledges far below. Cinematic wide lens, high-contrast golden light from low sun angle, deep shadow pools in the canyon floor. Atmosphere: majestic solitude, vast geological scale. Negative prompt: morphing, warping, flickering, distortion, artifacts.",
      category: "nature",
    },
    {
      concept: "דוגמנית עם שמלה זורמת בשדה פרחים",
      output:
        "A model in a flowing champagne silk dress walks slowly through a field of wild lavender at golden hour, the fabric catching the warm breeze in long ribbons. She turns her face toward the low sun, eyes closed, hair loose. Camera: slow push-in from medium to close-up on her profile, shallow depth of field. Lighting: warm sidelight from the left, soft diffused fill from overcast sky, creating a luminous halo effect. Color: champagne, violet, sage, warm gold. Atmosphere: editorial, serene, aspirational beauty. Negative prompt: warping limbs, flickering dress, face morphing, temporal artifacts.",
      category: "fashion",
    },
    {
      concept: "מכונית ספורט דוהרת בכביש מפותל",
      output:
        "A matte-black sports car accelerates through a winding mountain road at sunrise, tires gripping the asphalt as it exits a sharp left-hand bend and launches into a straight. Camera: low side angle tracking shot keeping pace with the vehicle, road surface rushing beneath the frame. The car's body catches the first amber rays of dawn over the ridge. Pine forest lines both sides of the road, dark silhouettes against a coral and gold sky. Motion blur on the wheels, sharp chassis. Atmosphere: raw speed, mechanical precision, solitude of early morning. Negative prompt: warping bodywork, flickering headlights, judder, motion artifacts.",
      category: "commercial",
    },
    {
      concept: "מחול קלאסי על במה מוארת",
      output:
        "A female ballet dancer in a white tutu performs a slow arabesque at center stage, her supporting leg perfectly straight, the extended leg forming a long diagonal line. A single overhead spotlight casts a sharp circular pool of white light around her, the rest of the stage falling into deep shadow. She transitions into a slow pirouette, tutu fanning outward in a perfect disc. Camera: static medium shot from the audience perspective, then slow push-in to waist-up. Lighting: harsh theatrical spot, warm floor footlights adding a soft amber base. Color: ivory, charcoal, warm amber. Atmosphere: disciplined grace, theatrical intimacy. Negative prompt: flickering, morphing limbs, tutu distortion, frame judder.",
      category: "action",
    },
    {
      concept: "נוף עירוני גשום בלילה",
      output:
        "A rain-slicked city intersection at 2am, neon signs from a ramen shop and a convenience store reflecting in long pink and green ribbons across the wet asphalt. A lone pedestrian in a yellow rain jacket crosses the frame left-to-right under a black umbrella. Steam rises from a manhole cover. Camera: static wide shot from a slightly elevated angle, no camera movement. Environmental motion: rain streaking through the light cones, puddles rippling with each drop, steam drifting. Cinematic anamorphic lens compression. Color: deep teal, neon pink, amber yellow, charcoal. Atmosphere: urban solitude, quiet melancholy. Negative prompt: warping reflections, flickering neon, temporal smearing.",
      category: "street",
    },
  ],
  mistakes: [
    {
      bad: "A woman dancing beautifully in a field, graceful, cinematic, beautiful light",
      good: "A dancer in a white linen dress spins slowly in a sunflower field at golden hour, arms extended, fabric trailing in the warm breeze. Camera follows in a slow circular orbit at waist height. Sidelight from low sun, long shadows across the field. Color: gold, ivory, sage. Atmosphere: joyful freedom. Negative prompt: warping, flickering, limb morphing.",
      why: "Wan 2.6 responds to the full prompt formula: subject + movement + scene + camera + lighting + atmosphere. Vague adjectives give the model nothing to work with. Subject movement must be described with specific verbs and direction.",
    },
    {
      bad: "A car driving on a road. Negative prompt: bad quality.",
      good: "A pearl-white sedan moves steadily through a coastal highway at late afternoon. Camera: low front-quarter tracking angle, ocean visible beyond the guardrail to the right. Warm sidelight from the west catching the car's roofline. Atmospheric haze from sea spray. Color: pearl white, ocean blue, tawny amber. Negative prompt: warping chassis, flickering headlights, morphing wheels, motion artifacts, jerky movement.",
      why: 'Generic negative prompts like "bad quality" do not prevent Wan 2.6\'s common artifacts (morphing, warping, flickering). Use specific artifact terms: morphing, warping, flickering, distortion, judder, temporal artifacts.',
    },
    {
      bad: "A chef making sushi, then the restaurant fills with guests, then the chef bows.",
      good: "A sushi chef in a white jacket slices sashimi at a hinoki counter with deliberate, precise strokes, fish glistening under a single warm overhead light. Camera: static medium close-up on hands and cutting board, slight upward tilt to face at the end. Negative prompt: warping hands, flickering knife, temporal artifacts.",
      why: "Wan 2.6 struggles with multi-scene narratives in a single generation. Describe one continuous action beat. Save scene transitions for multi-clip workflows.",
    },
  ],
  scoringCriteria: [
    "Subject + subject description + movement described with specific action verbs",
    "Scene + scene description grounding the environment",
    "Camera language: shot type, movement direction, lens type",
    "Lighting: source type, direction, quality (hard/soft), color temperature",
    "Atmosphere: mood or emotional tone, 1 sentence",
    "Negative prompt with artifact-specific terms: morphing, warping, flickering, distortion, judder",
    "Color palette stated explicitly (3-5 colors)",
    "50-120 words total; no keyword lists — flowing descriptive prose",
    "Single scene or single action beat per generation",
  ],
  chainOfThoughtExamples: [
    {
      concept: "שחקנית בוכה בגשם",
      reasoning:
        "Wan formula: subject (actress, appearance) + movement (subtle — tears, shoulders) + scene (rain, street) + camera (push-in to close-up) + lighting (rain diffuses light, backlight creates halo) + atmosphere (raw grief). Add negative prompt for faces and rain artifacts.",
      output:
        "A woman in her 30s with dark wet hair stands motionless on an empty rain-soaked sidewalk at night, tears streaming silently down her face, shoulders slightly bowed. Camera: slow push-in from medium to extreme close-up on her face, rain droplets catching the backlight from a streetlamp behind her, creating a soft halo. The wet pavement reflects a blurred amber glow from a shop window. Color: near-monochrome — charcoal, pale skin, amber halo. Atmosphere: devastating stillness, private grief. Negative prompt: face morphing, flickering rain, warping, temporal artifacts.",
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: "A landscape with mountains and fog, cinematic, beautiful colors",
      afterPrompt:
        "A mountain range at dawn emerges slowly from a sea of low cloud fog, jagged granite peaks catching the first coral light while the valleys remain hidden in grey mist. Camera: slow crane up from just above the cloud layer, rising to reveal the full ridgeline against a pale rose sky. Lighting: low-angle sunrise from the east, warm sidelight on east-facing cliff faces, cool blue in shadow zones. Color: coral, pale rose, cool grey, granite charcoal. Atmosphere: geological timescale, sacred silence. Negative prompt: flickering, warping mountains, fog morphing, temporal artifacts.",
      changes: [
        "Added specific mountain and fog behavior (sea of cloud, peaks emerging)",
        "Defined camera movement (crane up from cloud level)",
        "Specified lighting source, angle, and shadow zones",
        "Added color palette and atmosphere sentence",
        "Added artifact-specific negative prompt",
      ],
    },
  ],
};
