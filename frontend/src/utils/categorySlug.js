/**
 * Utility functions for clean, SEO-friendly category URLs and slug resolution.
 * Converts "Battery Packs" -> "battery-packs-products" and maps slugs back to display names.
 */

/**
 * Converts a category name or path string into a clean, SEO-friendly URL slug.
 * E.g. "Battery Packs" -> "battery-packs"
 *      "battery-packs-products" -> "battery-packs"
 *      "Electronics Components" -> "electronics-components"
 *      "BMS" -> "bms"
 */
export function categoryToSlug(categoryName) {
  if (!categoryName) return "";
  let cleaned = decodeURIComponent(categoryName.toString())
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!cleaned) return "";

  // Canonical slug overrides for SEO
  const key = cleaned.replace(/[^a-z0-9]/g, "");
  if (key === "batterypacks" || key === "batterypacksproducts") {
    return "battery-packs";
  }

  return cleaned.replace(/-products$/i, "");
}

/**
 * Normalizes any category string or slug into a pure alphanumeric key for matching.
 * E.g. "battery-packs-products" -> "batterypacks"
 *      "Battery Packs" -> "batterypacks"
 *      "BATTERY PACKS" -> "batterypacks"
 */
export function normalizeCategoryKey(val) {
  if (!val) return "";
  return decodeURIComponent(val.toString())
    .toLowerCase()
    .replace(/-products$/i, "")
    .replace(/products$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Finds a category object from the categories array that matches the given slug or name.
 */
export function findMatchingCategory(slugOrName, categories = []) {
  if (!slugOrName || !Array.isArray(categories)) return null;
  const targetKey = normalizeCategoryKey(slugOrName);
  if (!targetKey) return null;

  return (
    categories.find(c => {
      if (!c) return false;
      const cKey = normalizeCategoryKey(c.name);
      return cKey === targetKey;
    }) || null
  );
}

/**
 * Formats a clean category display title without redundant "PRODUCTS".
 * E.g. "battery-packs-products" -> "BATTERY PACKS"
 *      "Electronics Components" -> "ELECTRONICS COMPONENTS"
 */
export function getCategoryDisplayTitle(slugOrName, categories = []) {
  if (!slugOrName) return "";

  const match = findMatchingCategory(slugOrName, categories);
  if (match && match.name) {
    return match.name
      .replace(/\s*products\s*$/i, "")
      .trim()
      .toUpperCase();
  }

  // Fallback: format words cleanly from slug
  const cleaned = decodeURIComponent(slugOrName.toString())
    .trim()
    .replace(/-products$/i, "")
    .replace(/products$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return cleaned.toUpperCase();
}

/**
 * Resolves a URL slug into the best matching category name for the backend API query.
 * E.g. "battery-packs-products" -> "BATTERY PACKS" (or "Battery Packs" if matched in DB) or "battery packs"
 */
export function resolveCategoryQueryName(slugOrName, categories = []) {
  if (!slugOrName) return "";
  const match = findMatchingCategory(slugOrName, categories);
  if (match && match.name) return match.name;

  return decodeURIComponent(slugOrName.toString())
    .trim()
    .replace(/-products$/i, "")
    .replace(/products$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

/**
 * Returns rich SEO content (Section 1: Hero Intro, Section 2: In-depth About Content) for category pages.
 */
export function getCategorySeoContent(slugOrName, displayTitle = "") {
  const key = normalizeCategoryKey(slugOrName);

  const contentMap = {
    batterypacks: {
      hideProducts: true,
      metaTitle: "Battery Packs and Power Solutions | EToSM Technology",
      metaDescription:
        "Explore battery packs, Lithium-Ion batteries, LiFePO4 batteries, and accessories from EToSM Technology for various electronic and industrial applications.",
      canonicalUrl: "https://etosmtechnology.in/category/battery-packs",
      section1: {
        h1: "Battery Packs for Different Power Requirements",
        description:
          "Explore battery packs designed to support the power needs of different products and applications. EToSM Technology offers battery solutions for electronic devices, industrial equipment, and energy storage systems.",
        cta: "Explore Our Products",
        image: "/battery-packs-hero.jpg"
      },
      section2: {
        eyebrow: "ABOUT BATTERY PACKS",
        h2: "Find the Right Battery Packs for Your Application",
        description:
          "Every product needs the right power source to work as expected. Battery packs bring individual cells together to deliver the voltage and capacity required for different applications. They are used in a wide range of products, from everyday electronic devices to industrial equipment. At EToSM Technology we offer battery pack solutions to suit different products and their power needs.",
        image: "/battery-pack-engineering.jpg"
      },
      section3: {
        eyebrow: "OUR PRODUCT RANGE",
        h3: "Types of Battery Packs We Offer",
        description:
          "Explore our range of battery products and accessories for different applications. Each product category offers options to suit specific power and usage requirements.",
        cards: [
          {
            id: "lithium-ion",
            title: "Lithium-Ion Battery",
            icon: "battery-charging",
            image: "/lithium-ion-battery.webp",
            subcategory: "Lithium-Ion Battery",
            link: "/category/battery-packs/lithium-ion-battery"
          },
          {
            id: "lifepo4",
            title: "LiFePO4 (LFP) Battery",
            icon: "shield-check",
            image: "/lifepo4-battery.jpg",
            subcategory: "LiFePO4 (LFP) Battery",
            link: "/category/battery-packs/lifepo4-battery"
          },
          {
            id: "accessories",
            title: "Battery Accessories",
            icon: "package",
            image: "/battery-accessories.webp",
            subcategory: "Battery Accessories",
            link: "/category/battery-packs/battery-accessories"
          }
        ]
      },
      section4: {
        eyebrow: "CHOOSING THE RIGHT BATTERY",
        h2: "What to Look for in a Battery Pack",
        description:
          "Choosing a battery pack becomes easier when you know what your product needs. A few basic details, such as power, usage time, battery type, and size, can help you find the right option for your application.",
        points: [
          {
            title: "Voltage",
            description:
              "Check the voltage your product needs and choose a battery pack that matches those requirements for smooth operation.",
            icon: "zap"
          },
          {
            title: "Capacity",
            description:
              "Think about how long you want your product to run between charges. The battery capacity should provide enough energy for its expected usage.",
            icon: "gauge"
          },
          {
            title: "Battery Chemistry",
            description:
              "Different battery types are suited to different applications. Choose one based on how your product is used, how it is charged, and the power it requires.",
            icon: "cpu"
          },
          {
            title: "Size and Design",
            description:
              "Consider where the battery will be placed inside your product and choose a design that fits the available space and connection requirements.",
            icon: "box"
          },
          {
            title: "Protection Features",
            description:
              "Safety features such as overcharge, over-discharge, short-circuit, and temperature protection help keep the battery operating safely during everyday use.",
            icon: "shield-check"
          }
        ]
      },
      section5: {
        eyebrow: "APPLICATIONS & INDUSTRIES",
        h2: "Battery Packs Across Different Industries",
        description:
          "Battery packs are used in several industries to support different power needs. They play an important role in running electronic products, industrial equipment, and energy systems.",
        industries: [
          {
            title: "Electronics and Electrical",
            description:
              "These solutions provide power for electronic devices, portable products, and electrical equipment.",
            icon: "cpu"
          },
          {
            title: "Automotive and Electric Mobility",
            description:
              "They supply the energy needed to operate electric vehicles, two-wheelers, and other mobility systems.",
            icon: "car"
          },
          {
            title: "Industrial Manufacturing",
            description:
              "These products support the operation of industrial machinery, production equipment, and specialised tools.",
            icon: "factory"
          },
          {
            title: "Renewable Energy",
            description:
              "They store energy generated from solar and other renewable sources for later use.",
            icon: "sun"
          },
          {
            title: "Telecommunications",
            description:
              "These power solutions help run communication devices, networking equipment, and backup systems.",
            icon: "radio"
          },
          {
            title: "Power and Energy Storage",
            description:
              "They store electrical energy for backup power and other energy storage applications.",
            icon: "battery-charging"
          }
        ]
      },
      section6: {
        eyebrow: "LET'S START A CONVERSATION",
        h2: "Tell Us What Your Project Needs",
        description:
          "Have a specific battery requirement in mind? Share your ideas and product specifications with EToSM Technology. Let's discuss the possibilities for your next project.",
        cta: "Contact Our Team",
        ctaLink: "/contact"
      }
    },
    bms: {
      section1: {
        h1: "Battery Management Systems (BMS)",
        description:
          "Engineered for reliability, our smart and hardware BMS boards provide multi-level protection, cell balancing, and optimal lifecycle management for lithium-ion and LiFePO4 packs.",
        cta: "Explore Our Products"
      },
      section2: {
        eyebrow: "ABOUT BATTERY MANAGEMENT SYSTEMS",
        h2: "Intelligent Protection for Lithium Batteries",
        description:
          "Battery Management Systems are essential to ensure the longevity, safety, and efficiency of high-energy battery packs. At EToSM Technology, we provide tailored BMS solutions for EV, solar, and industrial energy storage."
      }
    },
    electronicscomponents: {
      section1: {
        h1: "Electronic Components & Power Solutions",
        description:
          "High-grade capacitors, semiconductors, modules, and hardware components tested for professional engineering projects, industrial automation, and power electronics.",
        cta: "Explore Our Products"
      },
      section2: {
        eyebrow: "ABOUT ELECTRONICS COMPONENTS",
        h2: "Reliable Hardware Components for Every Project",
        description:
          "From precision passive components to robust switching modules, EToSM Technology supplies tested, industry-grade electronic components across India."
      }
    },
    amplifier: {
      section1: {
        h1: "Audio Amplifiers & Sound Modules",
        description:
          "High-efficiency digital stereo power amplifiers and wireless audio modules engineered for pure sound quality, low distortion, and robust speaker driving capability.",
        cta: "Explore Our Products"
      },
      section2: {
        eyebrow: "ABOUT AUDIO AMPLIFIERS",
        h2: "High-Fidelity Audio Engineering",
        description:
          "Explore our power amplifiers and digital sound processing boards designed for high thermal stability, minimal distortion, and versatile audio connectivity."
      }
    }
  };

  if (key && contentMap[key]) {
    return contentMap[key];
  }

  const title = (displayTitle || slugOrName || "Category").toUpperCase();
  return {
    section1: {
      h1: `${title} PRODUCTS`,
      description: `Explore our collection of high-performance ${title.toLowerCase()} engineered and tested by EToSM Technology to support your power and project requirements.`,
      cta: "Explore Our Products"
    },
    section2: null
  };
}
