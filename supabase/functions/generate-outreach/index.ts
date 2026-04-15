import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get leads for this campaign
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id);

    if (leadsError) throw leadsError;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ error: 'No leads found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError) throw campaignError;

    // Generate placeholder outreach for each lead
    const outreachRows = leads.map((lead) => ({
      lead_id: lead.id,
      user_id: user.id,
      subject_line: `${lead.full_name} — ${campaign.offer || 'a quick idea'}`,
      opener: `Hi ${lead.full_name}, I noticed ${lead.company} and thought this might be relevant.`,
      cold_email: `Hi ${lead.full_name},\n\nI came across ${lead.company} and was impressed by what you're building${lead.role ? ` as ${lead.role}` : ''}.\n\n${campaign.product ? `We help teams like yours with ${campaign.product}.` : ''} ${campaign.offer ? `I'd love to offer you ${campaign.offer}.` : ''}\n\nWould it make sense to connect?\n\nBest,\nYour team`,
      follow_up_1: `Hi ${lead.full_name},\n\nJust following up on my last note. I know you're busy — that's exactly why this might be worth a few minutes.\n\nHappy to share more details whenever works for you.\n\nBest`,
      follow_up_2: `Hi ${lead.full_name},\n\nLast note from me! If the timing isn't right, totally understand.\n\nWishing ${lead.company} continued success.\n\nCheers`,
      status: 'pending',
    }));

    // Delete existing outreach for these leads
    const leadIds = leads.map((l) => l.id);
    await supabase
      .from('generated_outreach')
      .delete()
      .in('lead_id', leadIds)
      .eq('user_id', user.id);

    // Insert new outreach
    const { error: insertError } = await supabase
      .from('generated_outreach')
      .insert(outreachRows);

    if (insertError) throw insertError;

    // Track usage for each lead
    const usageRows = leads.map(() => ({
      user_id: user.id,
      action: 'outreach_generated',
    }));
    await supabase.from('usage_tracking').insert(usageRows);

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'generated' })
      .eq('id', campaign_id)
      .eq('user_id', user.id);

    return new Response(JSON.stringify({ success: true, count: leads.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
