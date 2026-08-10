export const PLATFORM_COMMISSION_RATE = 0.2;
export const PLATFORM_COMMISSION_PERCENT = PLATFORM_COMMISSION_RATE * 100;

export const APPROVED_PUBLIC_CONTACT = {
  email: "Info@chefachef.co.uk",
  phone: "+447942641878",
  phoneDisplay: "+44 07942 641878",
  whatsappUrl: "https://wa.me/447942641878",
  facebookUrl: "https://www.facebook.com/chefachefUK",
  instagramUrl: "",
  xUrl: "",
  youtubeUrl: "",
} as const;

export const COUNTRY_TAX_POLICIES = {
  GB: {
    countryName: "United Kingdom",
    rate: 0.2,
    label: "UK VAT guidance",
    responsibility:
      "UK VAT is referenced at 20%. Chefs operate as independent contractors and remain responsible for their own tax returns and formal tax invoices.",
  },
  US: {
    countryName: "United States",
    rate: null,
    label: "US tax guidance pending",
    responsibility:
      "No US sales-tax rate was supplied. Chefs remain responsible for applicable tax reporting and client-issued formal invoices where required.",
  },
  IT: {
    countryName: "Italy",
    rate: 0.22,
    label: "Italy VAT guidance",
    responsibility:
      "Italy VAT is referenced at 22%. Chefs operate as independent contractors and remain responsible for their own tax returns and formal tax invoices.",
  },
  KE: {
    countryName: "Kenya",
    rate: 0.16,
    label: "Kenya VAT guidance",
    responsibility:
      "Kenya VAT is referenced at 16%. Chefs operate as independent contractors and remain responsible for their own tax returns and formal tax invoices.",
  },
} as const;

export type CountryTaxCode = keyof typeof COUNTRY_TAX_POLICIES;

export function getTaxPolicy(countryCode?: string | null) {
  return COUNTRY_TAX_POLICIES[(countryCode || "GB") as CountryTaxCode] ?? COUNTRY_TAX_POLICIES.GB;
}

export function calculatePlatformCommission(totalAmount: number) {
  return Number((totalAmount * PLATFORM_COMMISSION_RATE).toFixed(2));
}

export function calculateChefPayout(totalAmount: number) {
  return Number((totalAmount - calculatePlatformCommission(totalAmount)).toFixed(2));
}

export const MARKETPLACE_PAYMENT_RULES = {
  serviceInclusiveness:
    "Quoted customer fees cover the agreed scope of work, including grocery shopping where included, ingredient handling, cooking on-site, and cleanup of the cooking site such as ovens, BBQ equipment, and workstations.",
  escrow:
    "Client funds are held through the platform payment flow and released to the chef after the event is completed and the payment record is eligible for payout.",
  chefPayout:
    "Chefs receive the booking amount minus the 20% ChefaChef marketplace commission after completion and payout processing.",
  chefInvoiceResponsibility:
    "Chefs are independent contractors. ChefaChef provides payment summaries and transfer breakdowns, but formal tax invoices must be issued by chefs when clients require them.",
} as const;

export const COUNTRY_BOOKING_RULES = {
  US: {
    minimumSpend: "$500 or $75 per person",
    pricing:
      "Per-person event rates usually start around $57 to $99+ per head. General cooking and prep assistance is $40-$60/hour. Multi-day or daily rates range from $300 to $3,000 per day depending on holiday, scale, and chef scope.",
    cancellation:
      "Chefs can cancel without penalty up to 7 days before the event. If a client cancels within 7 days of the scheduled date, the chef is fully compensated for time and preparation investment.",
    deposit: "Full checkout is supported; no separate US deposit percentage was supplied.",
  },
  IT: {
    minimumSpend: "Not supplied by client",
    pricing:
      "Event-based private chef bookings average around EUR 770 for 10 guests. Italian menus start around EUR 48 per person, Middle Eastern around EUR 38 per person, and Fine Dining or Pan-Asian range from EUR 65 to EUR 100+ per person. Occasional cooking ranges from EUR 18-EUR 40/hour and multi-day helper rates range from EUR 200-EUR 1,500/day.",
    cancellation:
      "If a booked chef cancels, the platform assists in finding a replacement or issues a full refund if unsuccessful.",
    deposit:
      "For bookings made over 6 weeks in advance, clients can opt for a 20% upfront deposit with the remaining 80% charged automatically 1 month before the event, subject to payment-provider support.",
  },
  KE: {
    minimumSpend: "KES 10,000-KES 15,000 for intimate home dining; KES 20,000+ for house parties and small events",
    pricing:
      "Intimate home dining for 2-8 guests is KES 10,000-KES 15,000 flat or KES 2,500-KES 4,000 per person. House parties and small events for 9-15 guests start at KES 20,000+. On-demand chef time is KES 2,000/hour with a typical 3-4 hour minimum. Weekly meal prep starts at KES 15,000+.",
    cancellation:
      "Cancellations made less than 48-72 hours before the event usually forfeit the deposit to cover pre-purchased specialty ingredients and blocked scheduling.",
    deposit:
      "A 50% down payment is standard to lock in the date, with the remaining balance due immediately after service or before the event date.",
  },
} as const;
