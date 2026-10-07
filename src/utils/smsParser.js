/**
 * SMS / Text Message Parser for Cooperative Order Intake
 * Parses informal text messages sent by customers/restaurants to extract:
 * - Customer name
 * - Phone number
 * - Requested items with quantities
 */

export const SAMPLE_SMS_TEMPLATES = [
  {
    title: 'Carinderia Bulk Order',
    sender: 'Aling Maring Eatery (+63 918 333 4411)',
    text: 'Magandang araw po coop! Pa-order po kami ng 10kg Tilapia at 15kg Highland Benguet Tomatoes para sa ulam bukas. Paki-reserve po agad. Salamat!',
  },
  {
    title: 'High-Value Seafood Catering',
    sender: 'Chef Brandon / Bayfront Bistro (+63 920 777 9922)',
    text: 'Good morning Agri-Fishery Coop. Need 12kg Yellowfin Tuna Loin and 8kg Giant Tiger Prawns (Sugpo) for Friday banquet. Please confirm if stock is available.',
  },
  {
    title: 'Community Rice Distribution',
    sender: 'Kapitan Jose (+63 915 222 6633)',
    text: 'Kapitan Jose here. Booking 20 sacks Dinorado Heritage Rice for barangay assistance program. Ready for pickup this afternoon.',
  },
  {
    title: 'Oversell Stress Test SMS',
    sender: 'Overzealous Buyer (+63 999 000 1122)',
    text: 'Urgent order! Need 80kg Yellowfin Tuna Loin and 50 crates Carabao Mangoes ASAP!',
  },
];

export function parseSmsOrder(text, availableProducts) {
  if (!text || typeof text !== 'string') {
    return { detectedItems: [], customerName: '', customerPhone: '' };
  }

  // Extract phone number if present
  const phoneMatch = text.match(/(?:\+63|0)?\s?9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/);
  const customerPhone = phoneMatch ? phoneMatch[0].trim() : '';

  // Attempt to extract name
  let customerName = '';
  const namePatterns = [
    /(?:from|kay|order po|ni|ako po si|order ni)\s+([A-Z][a-zA-Z\s]{2,25})/i,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,2})/,
  ];

  for (const pat of namePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      customerName = match[1].trim();
      break;
    }
  }

  // Match items against known products
  const detectedItems = [];
  const lowerText = text.toLowerCase();

  for (const product of availableProducts) {
    const prodNameLower = product.name.toLowerCase();
    // Keywords for product
    const keywords = [
      prodNameLower,
      product.category,
      ...product.name.split(' ').map((w) => w.toLowerCase()).filter((w) => w.length > 3),
    ];

    // Check if any keyword appears
    let matchFound = false;
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        matchFound = true;
        break;
      }
    }

    if (matchFound) {
      // Find quantity near keyword
      // e.g. "10kg tilapia", "5 sacks rice", "10 kg", "5 crates"
      const unit = product.unit.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      const regexes = [
        new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${unit}|kg|kilo|kilos|crate|crates|sack|sacks)?\\s*(?:ng|of)?\\s*(?:[a-z\\s]{0,15})?${product.name.toLowerCase().split(' ')[0]}`, 'i'),
        new RegExp(`${product.name.toLowerCase().split(' ')[0]}[\\s\\w]{0,10}?(\\d+(?:\\.\\d+)?)`, 'i'),
        new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:kg|kilo|crate|sack|pieces|pcs)?\\s+${keywords[keywords.length - 1]}`, 'i'),
      ];

      let qty = 1; // fallback default
      for (const rx of regexes) {
        const m = text.match(rx);
        if (m && m[1]) {
          const parsed = parseFloat(m[1]);
          if (!isNaN(parsed) && parsed > 0) {
            qty = parsed;
            break;
          }
        }
      }

      // Avoid duplicates
      if (!detectedItems.some((it) => it.productId === product.id)) {
        detectedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unit: product.unit,
          unitPrice: product.price,
        });
      }
    }
  }

  return {
    customerName: customerName || 'SMS Customer',
    customerPhone: customerPhone || '+63 9XX XXX XXXX',
    detectedItems,
  };
}
