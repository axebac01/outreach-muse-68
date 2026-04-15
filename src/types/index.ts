export interface Lead {
  id: string;
  fullName: string;
  company: string;
  role: string;
  website: string;
  linkedinUrl: string;
  notes: string;
}

export interface Campaign {
  id: string;
  name: string;
  targetAudience: string;
  product: string;
  offer: string;
  tone: string;
  leads: Lead[];
  createdAt: string;
  status: "draft" | "generated";
}

export interface GeneratedEmail {
  leadId: string;
  subjectLine: string;
  opener: string;
  coldEmail: string;
  followUp1: string;
  followUp2: string;
}
