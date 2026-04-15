import Layout from "@/components/Layout";
import { useParams } from "react-router-dom";
import { sampleCampaigns, sampleEmails, sampleLeads } from "@/data/sampleData";
import EmailCard from "@/components/EmailCard";
import { useState } from "react";

const Outreach = () => {
  const { id } = useParams();
  const campaign = sampleCampaigns.find((c) => c.id === id) || sampleCampaigns[0];
  const [selectedLeadId, setSelectedLeadId] = useState<string>(campaign.leads[0]?.id || "1");
  const emails = sampleEmails[selectedLeadId];

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">Generated outreach for {campaign.leads.length} leads</p>
        </div>

        <div className="flex gap-6">
          {/* Lead sidebar */}
          <div className="w-56 flex-shrink-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Leads</p>
            {campaign.leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedLeadId === lead.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="font-medium text-foreground">{lead.fullName}</div>
                <div className="text-xs">{lead.company}</div>
              </button>
            ))}
          </div>

          {/* Email content */}
          <div className="flex-1 space-y-4">
            {emails ? (
              <>
                <EmailCard title="Cold Email" content={emails.coldEmail} subjectLine={emails.subjectLine} />
                <EmailCard title="Follow-up #1" content={emails.followUp1} />
                <EmailCard title="Follow-up #2" content={emails.followUp2} />
              </>
            ) : (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                No emails generated for this lead yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Outreach;
