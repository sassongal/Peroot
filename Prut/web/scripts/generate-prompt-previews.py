#!/usr/bin/env python3
"""Generate preview images for image generation prompts using Gemini API."""

import json
import os
import sys
import time
import base64
import requests

API_KEY = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY", "AIzaSyDiDxtKfFybjEPo-EhsikLVnXT7CPneUHo")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "images", "prompts")
MODEL = "gemini-2.5-flash-image"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Prompts with variables filled in with reasonable defaults
PROMPTS = {
    "img_001": "Professional headshot portrait of a woman in her 30s, Mediterranean appearance, wearing a navy blue blazer, shot with an 85mm f/1.4 lens, shallow depth of field, soft studio lighting with a key light at 45 degrees, clean light gray background, natural skin texture, confident expression, corporate professional style, 4K, photorealistic",
    "img_002": "Breathtaking mountain landscape at golden hour, autumn season, dramatic sky with warm orange and purple clouds, wildflowers in the foreground, shot with a wide-angle 16mm lens, deep depth of field, HDR, National Geographic quality, ultra-detailed, 8K resolution, cinematic color grading",
    "img_003": "Professional product photography of a premium wireless headphones, matte black color, placed on a clean white infinity background, soft diffused studio lighting from three angles, subtle reflection on surface, sharp focus, commercial catalog style, high-end advertising quality, 4K, no shadows on background",
    "img_004": "Minimalist modern logo design for a tech startup brand called Nexus, geometric style, using blue and silver color palette, clean vector lines, scalable design, white background, professional branding, inspired by top design agencies, flat design, no gradients, balanced composition",
    "img_005": "Eye-catching Instagram post design about sustainable fashion, bohemian aesthetic, vibrant earth tones color scheme, modern typography overlay with text 'Wear The Change', clean layout, trendy design elements, social media optimized, square format 1080x1080, professional graphic design, Instagram-worthy",
    "img_006": "Mouth-watering food photography of seared salmon with asparagus, Mediterranean cuisine, beautifully plated on a white ceramic plate, overhead flat lay angle, natural window light from the left, rustic wooden table surface, fresh herbs and ingredients scattered around, steam rising, shallow depth of field, editorial food magazine quality, appetizing colors",
    "img_007": "Photorealistic architectural visualization of a luxury villa, contemporary modern style, exterior view at sunset, lush landscaping, white concrete and glass facade, floor-to-ceiling windows, dramatic lighting, urban context, people walking nearby for scale, V-Ray render quality, ultra-detailed, 8K resolution, architectural photography style",
    "img_008": "High fashion editorial photograph of a woman wearing an elegant red evening gown, dramatic standing pose, shot in a grand marble staircase setting, dramatic Rembrandt lighting, Vogue magazine style, fashion week quality, cinematic color grading, 85mm lens, shallow depth of field, stylish and edgy",
    "img_009": "Abstract art painting, expressionism inspired, deep blue and gold color palette, heavy impasto texture, expressive brushstrokes, contemplative mood, large canvas format, gallery quality, oil on canvas feel, rich layered composition, contemporary fine art, museum quality print",
    "img_010": "Professional book cover design for a thriller book titled 'The Last Signal', dark and mysterious visual theme, suspenseful atmosphere, compelling typography, navy and crimson color palette, bestseller quality design, front cover only, suitable for print and digital, eye-catching from thumbnail size, bookstore shelf appeal",
    "img_011": "Detailed character design sheet for a warrior elf character, anime art style, fantasy medieval setting, showing front and side view, ornate leather armor outfit, enchanted bow accessory, dynamic pose, expressive face, rich detail, concept art quality, game-ready design, ArtStation trending, full body visible",
    "img_012": "Clean modern mobile app UI mockup for a fitness tracking application, minimalist design style, iPhone screen displaying dashboard screen, dark blue color theme, professional UX layout, clear navigation, readable typography, consistent spacing, iOS Human Interface Guidelines, Dribbble quality, high fidelity prototype look",
    "img_013": "Charming children's book illustration of a little fox exploring an enchanted forest, whimsical watercolor style, soft pastel colors with pops of orange, friendly and warm atmosphere, cute rounded characters, hand-drawn feel, storybook quality, suitable for ages 3-6, joyful and imaginative, detailed background",
    "img_014": "Professional real estate photography of a living room in a modern apartment home, Scandinavian interior design, natural daylight streaming through large windows, wide-angle 14mm lens, HDR look, warm and inviting atmosphere, staged with modern furniture, clean and decluttered, straight vertical lines, real estate listing quality, bright and airy",
    "img_015": "Professional infographic design about artificial intelligence trends, flat modern style, blue and teal color scheme, clear data visualization with icons and charts, 5 main sections, modern flat design icons, clean typography hierarchy, vertical scrolling layout, easy to understand at a glance, corporate presentation quality, white background with colored accents",
    "img_016": "Romantic wedding photography scene, a young couple in love, garden venue, golden hour lighting, dreamy bokeh background with fairy lights, soft warm tones, candid emotional moment, bohemian wedding style, editorial quality, shallow depth of field, 70-200mm lens look, timeless and elegant",
    "img_017": "Bold YouTube thumbnail design, tech reviewer as the main focus, excited facial expression, bright red and yellow color scheme, large bold text 'GAME CHANGER!', dramatic lighting with rim light, slightly blurred background, high contrast, clickbait-worthy but professional, 1280x720 resolution, clean composition with text space on the right",
    "img_018": "Professional podcast cover art for a technology podcast called 'Future Forward', modern minimalist style, electric blue and white color palette, bold readable title text, clean modern design, recognizable at small sizes, microphone or audio-related subtle design elements, square format 3000x3000, Apple Podcasts and Spotify optimized, memorable and brandable",
    "img_019": "Aesthetic flat lay photography of coffee and stationery items, arranged on a marble surface, neutral warm color theme, overhead bird's eye view, carefully curated composition, natural soft lighting, Instagram-worthy styling, negative space for text placement, clean and organized, lifestyle brand quality, autumn seasonal props",
    "img_020": "Epic sci-fi concept art of a floating city above the clouds, futuristic megacity environment, year 2350 era, volumetric lighting with cyan neon accents, detailed machinery and technology, cinematic wide shot, matte painting quality, Syd Mead and Blade Runner inspired, atmospheric fog, 8K ultra-detailed, trending on ArtStation",
    "img_021": "Delicate watercolor illustration of cherry blossoms on a branch, soft translucent washes, pink and sage green palette, visible paper texture, gentle bleeding edges, botanical art influence, serene mood, hand-painted feel, fine detail work, white space as design element, elegant and refined, suitable for greeting cards",
    "img_022": "Premium business card design mockup for creative director, modern minimalist style, black and gold color scheme, front and back view, clean modern typography, subtle embossed texture effect, rounded corners, printed on thick premium cardstock, professional layout with name, title, phone, email, and logo placeholder, minimalist and elegant",
    "img_023": "Creative t-shirt design, nature adventure theme, vintage illustration art style, 'EXPLORE MORE' text integrated into design, 4 colors maximum for screen printing, centered chest placement, transparent background, bold and expressive, young adults target audience, print-ready vector-style quality, trendy streetwear aesthetic",
    "img_024": "Modern Instagram Story design for wellness brand, promotional content, vertical 1080x1920 format, organic natural visual style, sage green and cream brand colors, bold headline 'Find Your Balance', call-to-action button at bottom, swipe-up friendly layout, engaging and scroll-stopping, mobile-first design, clean negative space",
    "img_025": "Vintage retro poster design, 1960s era style, advertising a jazz music festival, warm orange and teal faded color palette, aged paper texture, halftone dot pattern, classic typography, slight grain and wear effects, A2 poster format, nostalgic and charming, mid-century modern influence, collectible quality",
    "img_026": "Adorable oil painting portrait of a golden retriever, Labrador breed, golden fur, happy playful expression, soft gradient blue background, rich detail in fur texture, warm lighting, soulful eyes, high-quality fine art print style, suitable for framing, 16x20 canvas size, capturing the pet's personality and charm",
    "img_027": "Wide hero banner image for a fintech website, abstract geometric theme, deep navy and gold color palette, professional and modern, large area of left side left clean for text overlay, subtle gradient fade, abstract data visualization imagery, optimized for web 1920x800 resolution, fast-loading friendly composition, brand-appropriate aesthetic",
    "img_028": "Clean isometric 3D illustration of a modern co-working office space, pastel blue and coral color palette, soft shadows, clay render material style, cute miniature diorama feel, plants and coffee cups as detail elements, white or light gray background, modern tech company aesthetic, friendly and approachable, Slack or Notion illustration style",
    "img_029": "Premium product packaging design mockup for artisan chocolate, luxury premium brand style, burgundy and gold color scheme, 3D box render at three-quarter angle, clean modern typography, matte with foil material texture, minimalist yet informative layout, shelf-ready design, showing front and one side panel, studio lighting, photorealistic render",
    "img_030": "Elegant event invitation design for a gala dinner, art deco aesthetic, black and gold color palette, beautiful typography with event name 'Annual Gala Night', space for date, time, and venue details, geometric art deco decorative elements, printable A5 format, both digital and print friendly, sophisticated and eye-catching",
    "img_031": "Photorealistic interior design visualization of a master bedroom, mid-century modern style, warm earth tones color palette, hardwood flooring, natural light from west-facing windows, carefully selected furniture and decor, cozy and lived-in feel, Architectural Digest quality, V-Ray or Corona render look, 4K resolution, warm ambient lighting",
    "img_032": "Detailed pixel art of a medieval castle on a hill, 32x32 pixel resolution style, earthy greens and browns limited color palette, RPG overworld scene, clean pixel edges, retro SNES video game aesthetic, charming and nostalgic, suitable for game sprites or decorative prints, isometric perspective, no anti-aliasing, crisp pixels",
    "img_033": "Dynamic sports action photography of a female runner performing a sprint finish, outdoor stadium setting, frozen motion with fast shutter speed, dramatic golden hour lighting, sweat and intensity visible, Nike campaign quality, low angle camera angle, high energy and motivation, sharp focus on the athlete, motion blur in background",
    "img_034": "Cute sticker design of a happy cat character, joyful emotion expression, kawaii art style, thick black outline, vibrant colors, transparent background, slightly chibi proportions, expressive and fun, suitable for messaging app sticker pack, die-cut sticker shape, high resolution, kawaii influence",
    "img_035": "Stunning macro photography of a butterfly wing, extreme close-up, 100mm macro lens, razor-thin depth of field, natural sunlight lighting, visible fine details like individual scales and color patterns, dewdrops, vibrant natural colors, emerald green creamy bokeh background, National Geographic quality, tack sharp focus on subject",
    "img_036": "Iconic album cover art for a synthwave album titled 'Neon Dreams' by electronic artist, retrowave visual style, nostalgic yet energetic mood, neon pink and electric blue color palette, square format, vinyl record quality artwork, culturally resonant imagery, bold artistic statement, memorable and iconic, suitable for Spotify and physical release, high contrast",
    "img_037": "Hand-drawn fantasy world map, Tolkien-inspired cartography style, parchment paper texture, showing mountains, forests, rivers and coastlines, 5 kingdoms or regions labeled, compass rose, sea monsters in the ocean, mountain ranges with shading, forests represented as tiny trees, sepia and earth tone coloring, Lord of the Rings quality, detailed coastlines and rivers",
    "img_038": "Luxurious jewelry product photography of a diamond engagement ring, white gold metal with sapphire stones, placed on black velvet surface, soft focused sparkle and light reflections, macro detail showing craftsmanship, three-point lighting setup, elegant and premium feel, Tiffany catalog quality, shallow depth of field, 4K ultra-detailed",
    "img_039": "Professional presentation slide background, technology and innovation theme, navy blue and electric blue color scheme with subtle gradient, geometric polygon pattern or abstract shapes, large clean area for text content, corporate and modern feel, non-distracting yet visually appealing, 1920x1080 resolution, suitable for PowerPoint or Google Slides, flat modern style, light and dark variants",
    "img_040": "Vibrant street art mural on a brick wall, graffiti style by a famous street artist, depicting a lion's face, bold neon and earth tone colors, spray paint texture, drips and splatters, freedom and creativity as visual theme, urban environment context, photographed straight-on, Banksy or Shepard Fairey quality, powerful and thought-provoking, weathered brick showing through",
    "plp-img-01": "Professional product photography of premium wireless earbuds on a gradient gray background. Soft studio lighting with delicate shadows, 45-degree angle, shallow depth of field with soft bokeh. Minimalist and clean style, warm colors, high resolution. Suitable for online catalog.",
    "plp-img-02": "Modern social media banner design for a tech startup. Gradient style with blue and orange colors, bold typography with headline 'Innovation Starts Here', floating geometric graphic elements, digital and contemporary feel. 16:9 ratio.",
    "plp-img-03": "Logo concept design for a company called 'Bloom' in the wellness industry. Modern minimalist style, using sage green and gold palette. The logo should work at small and large sizes, on dark and light backgrounds. Includes icon and text.",
    "plp-img-04": "Colorful digital illustration for a blog article about remote work. Modern flat illustration style with diverse human characters, soft pastel colors, balanced composition with white space. Suitable for article header. 2:1 ratio.",
    "plp-img-05": "UI design mockup of a mobile app screen for a meditation application. Modern UI design with dark mode, cards with rounded corners, subtle gradients, clean typography. Includes navigation bar, prominent CTA button, and breathing timer elements. Dribbble-worthy style.",
    "plp-img-06": "Stunning event poster design for 'Tech Summit 2024'. Futuristic style with dramatic light effects, bold 3D typography, combination of photography and graphic elements. Color palette: electric blue and white. Must include venue and time info. A3 print format.",
    "plp-img-07": "Professional food photography of grilled steak with roasted vegetables in editorial style. Soft natural side lighting, dark background with wood texture, styling with fresh herbs and vintage kitchen accessories. Shallow depth of field, warm and inviting colors. Suitable for restaurant menu.",
    "plp-img-08": "Book cover design for 'The Midnight Garden' by Sarah Chen, in the fantasy genre. Dramatic visual style: dramatic use of light and shadow, eye-catching composition that tells the book's story in one image. Elegant typography matching the genre. Standard paperback format.",
    "plp-img-09": "Surrealist urban landscape blending Tokyo with fantastical elements. Buildings floating in air, hanging gardens, sky with two moons, golden-purple sunset lighting. Digital hyper-realistic style with art nouveau touches. 4K resolution, 21:9 panoramic ratio.",
    "plp-img-10": "Professional business portrait of a confident businesswoman in a modern office environment. Soft Rembrandt lighting, blurred glass window background, confident and welcoming facial expression, elegant business attire. Warm tones, high-level corporate photography style.",
    "plp-img-11": "Designed infographic about climate change impact. Modern flat design with colorful icons, illustrated graphs and tables, clear visual flow from top to bottom, color palette of blue and green. Includes 5 key data points with prominent numbers. Vertical format for social sharing.",
    "plp-img-12": "Premium packaging design for artisan candles. Minimalist luxury style with kraft paper material, gold foil stamping, elegant typography, product name 'Lumiere'. Studio photography on dark background with dramatic lighting highlighting textures. Realistic 3D mockup.",
    "plp-img-13": "Cute and happy children's illustration of a bunny playing in a flower meadow. Digital watercolor style with soft, inviting colors, characters with big eyes and warm expression, nature and flower elements. Suitable for children's book or room decor. Pastel tones.",
    "plp-img-14": "Photorealistic architectural rendering of a modern residential tower. Contemporary design with clean lines, large windows, combination of concrete, wood and glass. Green surroundings with vegetation, golden hour lighting. Dramatic perspective angle. V-Ray quality render.",
    "plp-img-15": "Digital abstract painting in expressionism style. Dynamic combination of organic and geometric shapes, color palette of deep purple and gold, deep layered textures, movement and energy. Suitable for large canvas print. Contemplative atmosphere.",
    "plp-img-16": "Instagram Stories design for a fashion brand in minimalist style. Vertical gradient background, bold centered text 'New Collection', modern decorative elements, relevant icon. Clean design that works with and without photos. 9:16 vertical format.",
    "plp-img-17": "Luxury jewelry photography - gold necklace with emerald pendant on marble surface with delicate decorative elements. Focused lighting with sparkles on metal and stones, very shallow depth of field, warm gold colors. Luxury fashion magazine editorial style. Macro close-up.",
    "plp-img-18": "Double-sided digital business card design for Alex Rivera - Creative Director at Studio Nova. Clean modern style, using navy and copper brand colors. Front: name and minimalist logo. Back: contact details with icons. Realistic mockup on dark wood surface.",
    "plp-img-19": "Stunning nature landscape of a fjord at sunrise. Dramatic sky colors, reflections in water, rich vegetation in foreground. Panoramic landscape photography with infinite depth of field, perfect sharpness. National Geographic style. High resolution, 3:2 ratio.",
    "plp-img-20": "Set of 9 custom icons for a cooking app theme. Line outline style with consistent stroke, limited color palette of coral and dark gray. 3x3 grid on white background. Each icon uniform size with equal padding. Suitable for app or website.",
}

def generate_image(prompt_id, prompt_text, retries=2):
    """Generate an image using Gemini API."""
    output_path = os.path.join(OUTPUT_DIR, f"{prompt_id}.png")

    # Skip if already generated
    if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
        print(f"  [SKIP] {prompt_id} - already exists")
        return True

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"Generate this image: {prompt_text}"}
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"]
        }
    }

    data = json.dumps(payload).encode("utf-8")

    for attempt in range(retries + 1):
        try:
            resp = requests.post(API_URL, json=payload, timeout=120)

            if resp.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"  [WAIT] Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue

            if resp.status_code != 200:
                print(f"  [ERR] {prompt_id} - HTTP {resp.status_code}: {resp.text[:200]}")
                if attempt < retries:
                    time.sleep(10)
                    continue
                return False

            result = resp.json()

            # Extract image from response
            candidates = result.get("candidates", [])
            if not candidates:
                print(f"  [WARN] {prompt_id} - No candidates in response")
                if attempt < retries:
                    time.sleep(5)
                    continue
                return False

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    img_data = base64.b64decode(part["inlineData"]["data"])
                    with open(output_path, "wb") as f:
                        f.write(img_data)
                    size_kb = len(img_data) / 1024
                    print(f"  [OK] {prompt_id} - {size_kb:.0f}KB saved")
                    return True

            print(f"  [WARN] {prompt_id} - No image in response parts")
            if attempt < retries:
                time.sleep(5)
                continue
            return False

        except Exception as e:
            print(f"  [ERR] {prompt_id} - {e}")
            if attempt < retries:
                time.sleep(10)
            else:
                return False

    return False


def main():
    # Allow filtering by prefix
    prefix = sys.argv[1] if len(sys.argv) > 1 else ""

    prompts = {k: v for k, v in PROMPTS.items() if k.startswith(prefix)} if prefix else PROMPTS

    total = len(prompts)
    success = 0
    failed = []

    print(f"\n=== Generating {total} preview images ===\n")

    for i, (prompt_id, prompt_text) in enumerate(prompts.items(), 1):
        print(f"[{i}/{total}] {prompt_id}")
        if generate_image(prompt_id, prompt_text):
            success += 1
        else:
            failed.append(prompt_id)

        # Rate limiting: pause between requests
        if i < total:
            time.sleep(3)

    print(f"\n=== Done: {success}/{total} succeeded ===")
    if failed:
        print(f"Failed: {', '.join(failed)}")

    return 0 if not failed else 1


if __name__ == "__main__":
    main()
