import { PublicContentPage } from "@/components/public/public-content-page";
import { FaqList } from "@/components/public/faq-list";
import { PublicJsonLd } from "@/components/public/structured-data";
import { APPROVED_PUBLIC_CONTACT, COUNTRY_BOOKING_RULES, MARKETPLACE_PAYMENT_RULES, PLATFORM_COMMISSION_PERCENT } from "@/lib/marketplace-rules";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "FAQ | ChefaChef",
  description: "Answers to common questions about private chef pricing, equipment, ingredients, payments, cancellation, insurance, and chef payouts.",
  path: "/faq",
});

const faqItems = [
  {
    category: "Pricing",
    question: "How much is a private chef in the UK?",
    answer: "UK pricing depends on the service type, guest count, menu style, ingredients, staffing, location, and date. ChefaChef uses service-specific pricing guidance in the booking flow, including a UK minimum spend from GBP 300 where applicable.",
  },
  {
    category: "Pricing",
    question: "How much is a private chef in the USA?",
    answer: `${COUNTRY_BOOKING_RULES.US.pricing} The client-confirmed minimum guidance is ${COUNTRY_BOOKING_RULES.US.minimumSpend}.`,
  },
  {
    category: "Pricing",
    question: "How much is a private chef in Italy?",
    answer: `${COUNTRY_BOOKING_RULES.IT.pricing} The client has not supplied a fixed Italy minimum spend, so the platform shows guidance without inventing one.`,
  },
  {
    category: "Pricing",
    question: "How much is a private chef in Kenya?",
    answer: `${COUNTRY_BOOKING_RULES.KE.pricing} Kenya bookings also need clear ingredient, grocery-float, and deposit expectations before confirmation.`,
  },
  {
    category: "Booking",
    question: "What is included in the cost of a private chef?",
    answer: MARKETPLACE_PAYMENT_RULES.serviceInclusiveness,
  },
  {
    category: "Booking",
    question: "What equipment do I need to provide for the private chef?",
    answer: "The booking flow asks for venue, access, setup, and service-specific equipment details where they matter. For BBQ, for example, clients must confirm whether the chef should bring equipment, the venue has grill equipment, or the setup is not yet clear.",
  },
  {
    category: "Booking",
    question: "Do I need to provide ingredients, or will the private chef get them?",
    answer: "The chef proposal should state exactly what is included. For Kenya, the client confirmed that raw ingredients are usually handled through a separate grocery float or reimbursement against receipts unless a chef quote states otherwise.",
  },
  {
    category: "Booking",
    question: "Does the private chef bring waitstaff?",
    answer: "Staffing depends on the chosen service, guest count, and proposal. The platform asks service-specific questions where staffing or setup support is likely to affect the quote.",
  },
  {
    category: "Pricing",
    question: "What is the minimum spend?",
    answer: "Minimum spend is country and service specific. Current confirmed guidance includes UK service minimums, USA at $500 or $75 per person, and Kenya minimums such as KES 10,000-KES 15,000 for intimate dining or KES 20,000+ for small events. Italy has no fixed client-supplied minimum yet.",
  },
  {
    category: "Trust and compliance",
    question: "Are the chefs insured?",
    answer: "ChefaChef maintains platform-level public liability coverage up to GBP 5 million for qualifying official ChefaChef bookings processed through the platform. This protection applies to incidents connected to the booked event or service; private or off-platform work is not covered by the platform booking policy. Chefs may also hold their own insurance.",
  },
  {
    category: "Booking",
    question: "Do ChefaChef private chefs clean up after cooking?",
    answer: "Yes, the approved service scope includes cleanup of the cooking site, such as ovens, BBQ equipment, and workstations, when that cleanup is part of the confirmed booking scope.",
  },
  {
    category: "Payments and cancellation",
    question: "What is the cancellation policy?",
    answer: "The general cancellation reference is full refund when a client cancels more than 7 days before the event. Peak dates such as Christmas Day and New Year's Eve can carry stricter terms. Country-specific rules include USA chef protection inside 7 days, Italy replacement-or-refund support if a chef cancels, and Kenya deposit forfeiture for late cancellation within 48-72 hours.",
  },
  {
    category: "Payments and cancellation",
    question: "What payment options are available to book a private chef?",
    answer: "The application is Stripe-ready and supports checkout once valid Stripe credentials are configured. Bookings more than 5 weeks / 35 days before the earliest service date can use the approved 20% deposit and 80% later-payment policy where the configured payment provider supports that schedule. Bookings 5 weeks / 35 days or fewer away require full payment.",
  },
  {
    category: "Chef payouts",
    question: "How does ChefaChef pay chefs?",
    answer: `ChefaChef deducts a ${PLATFORM_COMMISSION_PERCENT}% marketplace commission. Chef payout summaries show the customer payment, platform commission, and final payout by currency. ${MARKETPLACE_PAYMENT_RULES.chefInvoiceResponsibility}`,
  },
  {
    category: "Support",
    question: "How do I contact ChefaChef?",
    answer: `Email ${APPROVED_PUBLIC_CONTACT.email} or call ${APPROVED_PUBLIC_CONTACT.phoneDisplay}. WhatsApp is not presented as an active support channel until ChefaChef enables it.`,
  },
];

export default function FAQPage() {
  return (
    <>
      <PublicJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />
      <PublicContentPage
        eyebrow="FAQ"
        title="Private chef questions, answered."
        description="Clear guidance for pricing, ingredients, equipment, payments, cancellation, and chef payouts."
        primaryCta={{ label: "Find local chef", href: "/find-local-chef" }}
        secondaryCta={{ label: "Chef portal", href: "/login?role=CHEF" }}
        image="/images/marketplace/cuisine-mediterranean.png"
        imageAlt="Mediterranean private dining dish on a refined table"
      >
        <FaqList items={faqItems} />
      </PublicContentPage>
    </>
  );
}
