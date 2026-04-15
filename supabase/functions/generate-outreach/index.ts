import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SYSTEM_PROMPT = `You are an expert B2B cold email copywriter. You write short, personalized cold outreach that gets replies.

Rules:
- Subject lines: under 60 characters, curiosity-driven, specific to the lead. Never use "Quick question" or generic hooks.
- Opener: 1 sentence referencing something specific about the lead's company or role. No fake compliments.
- Cold email: under 120 words total. Clear value prop, one CTA, no spammy language, no fake claims.
- Follow-up 1: under 80 words. Add new angle or value, reference the first email naturally.
- Follow-up 2: under 60 words. Final friendly nudge, graceful close.
- Tone should match the campaign tone setting.
- Never use phrases like "I hope this email finds you well", "synergy", "leverage", "circle back".
- Write like a real human, not a marketer.`

async function generateForLead(
  lead: any,
  campaign: any,
  apiKey: string
): Promise<any> {
  const prompt = `Generate a cold email sequence for this lead:

Lead:
- Name: ${lead.full_name}
- Company: ${lead.company}
- Role: ${lead.role || 'unknown'}
- Website: ${lead.website || 'none'}
- LinkedIn: ${lead.linkedin_url || 'none'}
- Notes: ${lead.notes || 'none'}

Campaign context:
- Target audience: ${campaign.target_audience || 'general'}
- Product: ${campaign.product || 'our product'}
- Offer: ${campaign.offer || 'a conversation'}
- Tone: ${campaign.tone || 'professional'}

Generate the full email sequence using the generate_email_sequence tool.`

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_email_sequence',
            description: 'Generate a complete cold email sequence for a lead.',
            parameters: {
              type: 'object',
              properties: {
                subject_line: { type: 'string', description: 'Short, curiosity-driven subject line under 60 chars' },
                opener: { type: 'string', description: 'One sentence opener referencing the lead specifically' },
                cold_email: { type: 'string', description: 'Full cold email body under 120 words' },
                follow_up_1: { type: 'string', description: 'First follow-up email under 80 words' },
                follow_up_2: { type: 'string', description: 'Final follow-up under 60 words' },
              },
              required: ['subject_line', 'opener', 'cold_email', 'follow_up_1', 'follow_up_2'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'generate_email_sequence' } },
    }),
  })

  if (!response.ok) {
    const status = response.status
    const text = await response.text()
    if (status === 429) throw new Error('Rate limit exceeded. Please try again in a moment.')
    if (status === 402) throw new Error('AI credits exhausted. Please add funds in Settings > Workspace > Usage.')
    throw new Error(`AI gateway error (${status}): ${text}`)
  }

  const result = await response.json()
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall?.function?.arguments) {
    throw new Error('AI did not return structured output')
  }

  return JSON.parse(toolCall.function.arguments)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { campaign_id, lead_id } = await req.json()
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignError) throw campaignError

    // Get leads — either a single lead or all leads for the campaign
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id)

    if (lead_id) {
      leadsQuery = leadsQuery.eq('id', lead_id)
    }

    const { data: leads, error: leadsError } = await leadsQuery
    if (leadsError) throw leadsError
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ error: 'No leads found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate AI outreach for each lead
    const outreachRows = []
    for (const lead of leads) {
      try {
        const generated = await generateForLead(lead, campaign, apiKey)
        outreachRows.push({
          lead_id: lead.id,
          user_id: user.id,
          subject_line: generated.subject_line,
          opener: generated.opener,
          cold_email: generated.cold_email,
          follow_up_1: generated.follow_up_1,
          follow_up_2: generated.follow_up_2,
          status: 'pending',
        })
      } catch (err) {
        console.error(`Failed to generate for lead ${lead.id}:`, err.message)
        // Return partial error if AI fails for a specific lead
        if (err.message.includes('Rate limit') || err.message.includes('credits exhausted')) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: err.message.includes('Rate limit') ? 429 : 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        // Fallback for individual lead failure
        outreachRows.push({
          lead_id: lead.id,
          user_id: user.id,
          subject_line: `${lead.full_name} — ${campaign.offer || 'a quick idea'}`,
          opener: `Hi ${lead.full_name}, I noticed ${lead.company} and thought this might be relevant.`,
          cold_email: `Hi ${lead.full_name},\n\nI came across ${lead.company} and was impressed by what you're building${lead.role ? ` as ${lead.role}` : ''}.\n\n${campaign.product ? `We help teams like yours with ${campaign.product}.` : ''} ${campaign.offer ? `I'd love to offer you ${campaign.offer}.` : ''}\n\nWould it make sense to connect?\n\nBest`,
          follow_up_1: `Hi ${lead.full_name},\n\nJust following up on my last note. Happy to share more details whenever works for you.\n\nBest`,
          follow_up_2: `Hi ${lead.full_name},\n\nLast note from me! Wishing ${lead.company} continued success.\n\nCheers`,
          status: 'pending',
        })
      }
    }

    // Delete existing outreach for these leads
    const leadIds = leads.map((l: any) => l.id)
    await supabase
      .from('generated_outreach')
      .delete()
      .in('lead_id', leadIds)
      .eq('user_id', user.id)

    // Insert new outreach
    const { error: insertError } = await supabase
      .from('generated_outreach')
      .insert(outreachRows)

    if (insertError) throw insertError

    // Track usage only for full generation, not single-lead regeneration
    if (!lead_id) {
      const usageRows = leads.map(() => ({
        user_id: user.id,
        action: 'outreach_generated',
      }))
      await supabase.from('usage_tracking').insert(usageRows)
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'generated' })
      .eq('id', campaign_id)
      .eq('user_id', user.id)

    return new Response(JSON.stringify({ success: true, count: leads.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-outreach error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
