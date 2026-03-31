const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JoyaTech",
    url: "https://joya-tech.net",
    description: "JoyaTech - חברת טכנולוגיה ישראלית המפתחת כלי AI חדשניים בעברית",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/assets/branding/logo.png`,
    },
    sameAs: [
      "https://www.facebook.com/profile.php?id=61579689932777",
    ],
    founder: {
      "@type": "Person",
      name: "Gal Sasson",
      jobTitle: "Founder & Developer",
      sameAs: [
        "https://github.com/sassongal",
        "https://www.linkedin.com/in/sassongal/",
      ],
    },
    brand: {
      "@type": "Brand",
      name: "Peroot",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: "Israel",
    },
    inLanguage: "he",
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
    datePublished: post.published_at || new Date().toISOString(),
    dateModified: post.published_at || new Date().toISOString(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    author: {
      "@type": "Person",
      name: post.author || "Gal Sasson",
      url: SITE_URL,
      sameAs: [
        "https://www.linkedin.com/in/sassongal/",
        "https://github.com/sassongal",
      ],
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
        description: "תוכנית חינמית עם 2 קרדיטים ביום, גישה לספריית 480+ פרומפטים, שיתוף פרומפטים ותוסף Chrome",
        image: `${SITE_URL}/assets/branding/logo.png`,
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
        description: "150 קרדיטים בחודש, גישה לכל המנועים המתקדמים, שיפור איטרטיבי, ספריה אישית ומועדפים ללא הגבלה, תוסף Chrome עם סנכרון מלא, יום ניסיון במתנה",
        image: `${SITE_URL}/assets/branding/logo.png`,
        brand: { "@type": "Brand", name: "Peroot" },
        offers: {
          "@type": "Offer",
          price: "3.99",
          priceCurrency: "ILS",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/pricing`,
          priceValidUntil: "2027-12-31",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "3.99",
            priceCurrency: "ILS",
            unitText: "MONTH",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitCode: "MON",
            },
          },
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

export function howToSchema(params: {
  name: string;
  description?: string;
  steps: { name: string; text: string }[];
  totalTime?: string; // ISO 8601 duration, e.g. "PT15M"
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    description: params.description || "",
    ...(params.totalTime ? { totalTime: params.totalTime } : {}),
    inLanguage: "he",
    step: params.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function promptCreativeWorkSchema(prompt: {
  title: string;
  description: string;
  category: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: prompt.title,
    description: prompt.description,
    inLanguage: "he",
    genre: prompt.category,
    url: prompt.url,
    creator: { "@type": "Organization", name: "Peroot" },
    datePublished: new Date().toISOString().split("T")[0],
  };
}

export function promptCollectionSchema(collection: {
  name: string;
  description: string;
  url: string;
  itemCount: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    description: collection.description,
    url: collection.url,
    inLanguage: "he",
    numberOfItems: collection.itemCount,
    provider: { "@type": "Organization", name: "Peroot" },
  };
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Peroot",
    alternateName: "פירוט",
    url: SITE_URL,
    inLanguage: "he",
    publisher: {
      "@type": "Organization",
      name: "JoyaTech",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/prompts?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
