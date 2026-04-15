import { Campaign, GeneratedEmail, Lead } from "@/types";

export const sampleLeads: Lead[] = [
  {
    id: "1",
    fullName: "Sarah Chen",
    company: "TechFlow",
    role: "VP of Sales",
    website: "techflow.io",
    linkedinUrl: "linkedin.com/in/sarachen",
    notes: "Series B, scaling outbound team",
  },
  {
    id: "2",
    fullName: "Marcus Johnson",
    company: "DataPulse",
    role: "Head of Growth",
    website: "datapulse.com",
    linkedinUrl: "linkedin.com/in/marcusj",
    notes: "Recently hired, building pipeline",
  },
  {
    id: "3",
    fullName: "Emily Rodriguez",
    company: "CloudBase",
    role: "CEO",
    website: "cloudbase.dev",
    linkedinUrl: "linkedin.com/in/emilyrodriguez",
    notes: "Bootstrapped, 50 employees",
  },
];

export const sampleCampaigns: Campaign[] = [
  {
    id: "1",
    name: "SaaS Founders Q2 Outreach",
    targetAudience: "B2B SaaS founders, Series A-B, 20-200 employees",
    product: "AI-powered cold email tool",
    offer: "14-day free trial + dedicated onboarding",
    tone: "Professional but friendly",
    leads: sampleLeads,
    createdAt: "2026-04-10",
    status: "generated",
  },
  {
    id: "2",
    name: "Agency Partnership Campaign",
    targetAudience: "Digital marketing agency owners",
    product: "White-label email automation",
    offer: "Revenue share partnership",
    tone: "Direct and value-focused",
    leads: [sampleLeads[0]],
    createdAt: "2026-04-12",
    status: "draft",
  },
];

export const sampleEmails: Record<string, GeneratedEmail> = {
  "1": {
    leadId: "1",
    subjectLine: "Sarah — scaling outbound without scaling headcount?",
    opener: "Saw TechFlow just closed your Series B — congrats. Scaling outbound is probably top of mind right now.",
    coldEmail: `Hi Sarah,\n\nSaw TechFlow just closed your Series B — congrats. Scaling outbound is probably top of mind right now.\n\nWe help sales teams like yours generate hyper-personalized cold emails in seconds, not hours. Our customers typically see 3x reply rates compared to templated outreach.\n\nWould it make sense to try a 14-day free trial with dedicated onboarding? I'd love to set you up personally.\n\nBest,\nAlex`,
    followUp1: `Hi Sarah,\n\nJust following up on my last note. I know you're busy scaling — that's exactly why this might be worth 15 minutes.\n\nOne of our customers (similar stage, B2B SaaS) went from 2% to 8% reply rates in their first month. Happy to share the playbook.\n\nWorth a quick chat?\n\nBest,\nAlex`,
    followUp2: `Hi Sarah,\n\nLast note from me — I don't want to be that person who doesn't take a hint 😄\n\nIf personalized outbound is a priority for Q2, I'd love to help. If not, no worries at all.\n\nEither way, wishing TechFlow continued momentum.\n\nCheers,\nAlex`,
  },
  "2": {
    leadId: "2",
    subjectLine: "Marcus — your new growth role + a quick idea",
    opener: "Congrats on the new Head of Growth role at DataPulse. Building pipeline from scratch is exciting (and exhausting).",
    coldEmail: `Hi Marcus,\n\nCongrats on the new Head of Growth role at DataPulse. Building pipeline from scratch is exciting (and exhausting).\n\nWhat if your team could generate personalized outreach for every lead in minutes instead of hours? That's what we do.\n\nHappy to offer a 14-day free trial with hands-on onboarding to help you hit the ground running.\n\nInterested?\n\nBest,\nAlex`,
    followUp1: `Hi Marcus,\n\nQuick follow-up — I know the first 90 days in a new role are intense.\n\nIf outbound is on your roadmap, we could help you show results fast. Our quickest win: one customer generated 47 qualified replies in their first week.\n\nWorth exploring?\n\nBest,\nAlex`,
    followUp2: `Hi Marcus,\n\nFinal ping! If the timing isn't right, totally get it.\n\nWhenever you're ready to scale outbound, we're here. Wishing you a strong Q2 at DataPulse.\n\nCheers,\nAlex`,
  },
  "3": {
    leadId: "3",
    subjectLine: "Emily — a bootstrapper's edge in cold outreach",
    opener: "Really impressive what you've built at CloudBase — 50 people, bootstrapped. That's rare.",
    coldEmail: `Hi Emily,\n\nReally impressive what you've built at CloudBase — 50 people, bootstrapped. That's rare.\n\nAs a fellow builder, I know every hour counts. Our tool helps lean teams send personalized cold emails at scale without hiring more SDRs.\n\nWould a 14-day trial make sense? I'll personally make sure your team gets value from day one.\n\nBest,\nAlex`,
    followUp1: `Hi Emily,\n\nJust circling back. I know bootstrapped founders are selective with their time (as you should be).\n\nQuick proof point: a bootstrapped SaaS similar to CloudBase used us to book 23 demos in their first month. Zero new hires.\n\nWorth a look?\n\nBest,\nAlex`,
    followUp2: `Hi Emily,\n\nLast note — if cold outreach isn't a priority right now, I completely understand.\n\nEither way, keep building something amazing at CloudBase. Happy to chat whenever the timing is right.\n\nCheers,\nAlex`,
  },
};
