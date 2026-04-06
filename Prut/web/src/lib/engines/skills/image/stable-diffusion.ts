export const skill = {
  platform: 'stable-diffusion' as const,
  name: 'Stable Diffusion XL / SD3.5',
  examples: [
    {
      concept: 'לוחמת אנימה עם חרב אנרגיה',
      output:
        '(anime warrior girl:1.4), long flowing silver hair with (glowing blue tips:1.2), wearing intricate black and gold battle armor, holding a (translucent energy katana:1.3) emanating cyan light, dynamic action pose mid-leap, cherry blossom petals swirling around her, dramatic backlighting, dark crimson sky, (anime cel shading:1.2), vibrant colors, detailed eyes, masterpiece, best quality, highly detailed, sharp focus\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, realistic, photo, 3d, bad anatomy, extra fingers\nRecommended: sampler Euler a, steps 25, CFG 6, clip skip 2',
    },
    {
      concept: 'אישה על חוף ים בשקיעה',
      output:
        '(beautiful young woman:1.3), long auburn hair blowing in ocean breeze, wearing flowing white linen dress, standing barefoot on wet sand, (golden hour:1.4), dramatic sunset with orange and purple clouds reflected in shallow tidepool, volumetric god rays, waves gently washing over her feet, (photorealistic:1.3), skin pores, freckles, natural skin texture, Canon EOS R5, 85mm f/1.4, shallow depth of field, bokeh, masterpiece, best quality, highly detailed, RAW photo, 8K\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, painting, illustration, anime, cartoon, extra fingers, mutated hands, bad anatomy\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
    },
    {
      concept: 'עיר עתידנית צפה באוויר',
      output:
        '(floating cyberpunk city:1.4), massive platforms suspended by (anti-gravity engines with blue plasma:1.2), interconnected by glass sky-bridges and light rail, (bioluminescent gardens:1.3) hanging from undersides, holographic billboards projecting neon advertisements, flying vehicles weaving between towers, dramatic sunset sky with two moons visible, (digital matte painting:1.3), concept art, volumetric lighting, atmospheric perspective, epic scale, hyper-detailed architecture, masterpiece, best quality, highly detailed\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, simple, flat, boring, empty sky\nRecommended: sampler DPM++ 2M Karras, steps 40, CFG 8, clip skip 1',
    },
    {
      concept: 'דרקון ענק בתוך מערה של קריסטלים',
      output:
        '(enormous ancient dragon:1.4) coiled around a mountain of gold coins inside a (vast crystal cavern:1.3), scales iridescent deep emerald and obsidian, (glowing amber eyes:1.2), steam rising from nostrils, massive crystalline formations in purple and blue refracting the dragon\'s internal fire glow, stalactites dripping, scattered gemstones and ancient artifacts, (epic fantasy illustration:1.3), dramatic chiaroscuro lighting, D&D concept art style, rich saturated colors, masterpiece, best quality, highly detailed, sharp focus, <lora:add_detail:0.7>\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, photorealistic, photo, simple background\nRecommended: sampler DPM++ 2M Karras, steps 35, CFG 7, clip skip 1',
    },
    {
      concept: 'תחנת חלל מעל כדור הארץ',
      output:
        '(massive orbital space station:1.4), ring-shaped rotating habitat section with visible interior greenery through panoramic windows, (Earth rising in background:1.3), solar panel arrays extending like golden wings, docked spacecraft with running lights, (hard science fiction:1.2), realistic spacecraft design, lens flare from distant sun, stars visible in deep black void, subtle blue atmospheric glow on Earth\'s limb, NASA concept art style, technical precision, masterpiece, best quality, highly detailed, sharp focus, 8K\nNegative prompt: worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, cartoon, anime, fantasy, magic, unrealistic proportions\nRecommended: sampler DDIM, steps 40, CFG 8, clip skip 1',
    },
  ],
};
