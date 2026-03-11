const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://peroot.space";

export function articleSchema(post: {
  title: string;
  excerpt?: string | null;
  published_at?: string | null;
  author?: string | null;
  thumbnail_url?: string | null;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    datePublished: post.published_at || undefined,
    author: {
      "@type": "Organization",
      name: post.author || "Peroot",
    },
    publisher: {
      "@type": "Organization",
      name: "Peroot",
      url: SITE_URL,
    },
    image: post.thumbnail_url || undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    inLanguage: "he",
  };
}

export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Peroot",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    description:
      "מחולל פרומפטים מקצועי בעברית - שדרג כל פרומפט באמצעות AI מתקדם",
    url: SITE_URL,
    inLanguage: "he",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ILS",
    },
  };
}

export function faqSchema(
  items: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
