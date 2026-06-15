import { PublicContentPage } from "@/components/public/public-content-page";
import { PublicJsonLd } from "@/components/public/structured-data";
import { buildPublicMetadata } from "@/lib/public-site";

export const metadata = buildPublicMetadata({
  title: "FAQ | Chef Marketplace",
  description: "Answers to common questions about private chef discovery, reviews, enquiries, and booking.",
  path: "/faq",
});

const faqItems = [
  {
    question: "Do I book directly from the public site?",
    answer: "You can discover chefs and experiences publicly, then enquire or book when you are ready to plan the occasion.",
  },
  {
    question: "Are reviews real?",
    answer: "Yes. Public review snippets come from completed client feedback attached to chef profiles.",
  },
  {
    question: "How do chefs join?",
    answer: "Chefs apply, create their profile, and complete the professional checks needed before serving clients.",
  },
  {
    question: "When is payment handled?",
    answer: "Payment is handled after the dining details are clear, so you can explore first and commit when the plan feels right.",
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
        title="Common questions about private chef dining."
        description="A simple guide to finding a chef, comparing reviews, and planning a private dining occasion with confidence."
        primaryCta={{ label: "Find local chef", href: "/find-local-chef" }}
        secondaryCta={{ label: "Customer signup", href: "/register?role=CLIENT" }}
        image="/images/marketplace/cuisine-mediterranean.png"
        imageAlt="Mediterranean private dining dish on a refined table"
      >
        <div className="space-y-4 text-sm leading-6 text-muted-foreground">
          {faqItems.slice(0, 2).map((item) => (
            <div key={item.question}>
              <h2 className="text-xl font-semibold text-foreground">{item.question}</h2>
              <p className="mt-2">{item.answer}</p>
            </div>
          ))}
        </div>
        <div className="space-y-4 text-sm leading-6 text-muted-foreground">
          {faqItems.slice(2).map((item) => (
            <div key={item.question}>
              <h2 className="text-xl font-semibold text-foreground">{item.question}</h2>
              <p className="mt-2">{item.answer}</p>
            </div>
          ))}
        </div>
      </PublicContentPage>
    </>
  );
}
