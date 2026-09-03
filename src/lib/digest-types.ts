// Contracts for the JSON `payload` the daily agent POSTs to /api/ingest.
// These are documented (not enforced by Prisma, since payload is stored as Json),
// so keep them in sync with SETUP.md's ingest section.

export type EmailDigestPayload = {
  items: {
    from: string;
    subject: string;
    snippet: string;
    link?: string;
    priority?: "high" | "normal";
  }[];
};

export type NewsDigestPayload = {
  items: {
    title: string;
    source: string;
    url: string;
    summary: string;
  }[];
};

export type PortfolioDigestPayload = {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: {
    ticker: string;
    shares: number;
    price: number;
    value: number;
    dayChangePercent: number;
  }[];
};
