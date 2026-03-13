const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://peroot.space";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JoyaTech",
    url: "https://joya-tech.net",
    founder: {
      "@type": "Person",
      name: "Gal Sasson",
      jobTitle: "Founder & Developer",
      sameAs: [
        "https://github.com/sassongal",
      ],
    },
    brand: {
      "@type": "Brand",
      name: "Peroot",
      url: SITE_URL,
    },
  };
}

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
      "@type": "Person",
      name: post.author || "Gal Sasson",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Peroot",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/assets/branding/logo.png`,
      },
    },
    image: post.thumbnail_url || undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    inLanguage: "he",
    isPartOf: {
      "@type": "WebSite",
      name: "Peroot",
      url: SITE_URL,
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
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
    author: {
      "@type": "Organization",
      name: "Peroot",
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ILS",
    },
  };
}

export function pricingSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "תוכניות ומחירים - Peroot",
    description: "השוואת תוכניות Peroot: חינם ו-Pro",
    url: `${SITE_URL}/pricing`,
    mainEntity: [
      {
        "@type": "Product",
        name: "Peroot Free",
        description: "תוכנית חינמית עם 2 קרדיטים ביום, גישה לספריית 410+ פרומפטים, שיתוף פרומפטים ותוסף Chrome",
        brand: { "@type": "Brand", name: "Peroot" },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "ILS",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/pricing`,
        },
      },
      {
        "@type": "Product",
        name: "Peroot Pro",
        description: "150 קרדיטים בחודש, גישה לכל המנועים המתקדמים, שיפור איטרטיבי, ספריה אישית ומועדפים ללא הגבלה, תוסף Chrome עם סנכרון מלא, 4 ימי ניסיון חינם",
        brand: { "@type": "Brand", name: "Peroot" },
        offers: {
          "@type": "Offer",
          price: "3.99",
          priceCurrency: "ILS",
          billingIncrement: 1,
          unitCode: "MON",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/pricing`,
          priceValidUntil: "2027-12-31",
        },
      },
    ],
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
