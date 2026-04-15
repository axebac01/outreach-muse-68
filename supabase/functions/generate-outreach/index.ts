import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SYSTEM_PROMPT = `You are a cold email ghostwriter for B2B founders. You write like a busy founder texting a peer — short, direct, zero fluff.

## Voice
- Conversational, confident, specific. Never salesy.
- Write like you personally looked at their company for 2 minutes and had one sharp thought.
- Every email should feel like it was written by a human who gives a damn, not a sequence tool.

## Hard Rules
- Open with an observation about THEIR business, never about yourself.
- Connect your product to a specific pain point the lead likely has based on their role or company.
- One CTA per email. Low-friction CTAs only: "Worth a look?" / "Want me to send details?" / "Open to a 10-min chat this week?" — NEVER "jump on a call" or "schedule a demo".
- Each follow-up must introduce a NEW angle, insight, or proof point. Never rehash the first email.
- Mention the lead's first name at most once per email (in the greeting). Never repeat it mid-body.
- Match the campaign tone setting strictly.

## Banned Phrases (never use these or variations)
- "I hope this email finds you well"
- "reaching out"
- "I wanted to"
- "I'd love to"
- "just following up"
- "checking in"
- "touch base"
- "circle back"
- "synergy" / "leverage"
- "quick question"
- "I came across your company"
- "I was impressed by"
- "I noticed that you"

## Bad vs Good Examples
BAD opener: "I came across your company and was impressed by what you're building."
GOOD opener: "Saw that Acme just launched a second product line — scaling outbound with a team of 3 is brutal."

BAD CTA: "I'd love to jump on a quick call to discuss how we can help."
GOOD CTA: "Want me to send a 2-min walkthrough?"

BAD follow-up: "Just following up on my last email. Would love to connect."
GOOD follow-up: "One thing I forgot to mention — [Company X] cut their outbound time by 60% doing exactly this. Figured it might click for you too."`

function buildUserPrompt(lead: any, campaign: any): string {
  const parts: string[] = []

  parts.push(`Generate a cold email sequence for this lead.`)
  parts.push(``)
  parts.push(`## Lead`)
  parts.push(`- Name: ${lead.full_name}`)
  parts.push(`- Company: ${lead.company}`)

  if (lead.role) {
    parts.push(`- Role: ${lead.role}`)
    parts.push(`  → Frame the value prop around pain points specific to someone in a "${lead.role}" role.`)
  }

  if (lead.website) {
    parts.push(`- Website: ${lead.website}`)
    parts.push(`  → Reference what this company likely does based on their URL. Use it to make the opener specific.`)
  }

  if (lead.linkedin_url) {
    parts.push(`- LinkedIn: ${lead.linkedin_url}`)
  }

  if (lead.notes) {
    parts.push(`- Notes: ${lead.notes}`)
    parts.push(`  → THIS IS YOUR PRIMARY PERSONALIZATION HOOK. Use these notes as the basis for the opener and value prop. These are hand-written by the sender and contain the most specific info about the lead.`)
  }

  parts.push(``)
  parts.push(`## Campaign Context`)
  parts.push(`- Target audience: ${campaign.target_audience || 'B2B professionals'}`)
  parts.push(`- Product: ${campaign.product || 'our product'}`)
  parts.push(`- Offer: ${campaign.offer || 'a conversation'}`)
  parts.push(`- Tone: ${campaign.tone || 'professional'}`)

  parts.push(``)
  parts.push(`## Important`)
  parts.push(`- The cold email should make the reader think "this person actually looked at my company."`)
  parts.push(`- Do NOT mention ${lead.full_name.split(' ')[0]}'s name more than once per email.`)
  parts.push(`- Do NOT start any email with a self-introduction.`)
  parts.push(`- Every follow-up must add a new angle — never repeat the first email's pitch.`)
  parts.push(``)
  parts.push(`Generate the sequence using the generate_email_sequence tool.`)

  return parts.join('\n')
}

async function generateForLead(
  lead: any,
  campaign: any,
  apiKey: string
): Promise<any> {
  const prompt = buildUserPrompt(lead, campaign)

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
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
                subject_line: { type: 'string', description: 'Specific to the lead\'s company or role. No generic hooks. Under 50 chars.' },
                opener: { type: 'string', description: 'One sentence that proves you researched this person. Reference their company, role, or a specific detail from notes.' },
                cold_email: { type: 'string', description: 'Under 100 words. Lead with an observation about their business, connect to a specific problem your product solves, end with a low-friction CTA (not "jump on a call").' },
                follow_up_1: { type: 'string', description: 'Under 70 words. New angle — share a relevant result, stat, or case study. Don\'t repeat the first email.' },
                follow_up_2: { type: 'string', description: 'Under 50 words. Breakup email. Friendly, zero pressure, leave the door open.' },
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
          subject_line: `${lead.company} — ${campaign.offer || 'a quick idea'}`,
          opener: `Saw ${lead.company}${lead.role ? ` and your work as ${lead.role}` : ''} — had a thought.`,
          cold_email: `Hi ${lead.full_name.split(' ')[0]},\n\n${lead.company} caught my eye${lead.notes ? ` — ${lead.notes.substring(0, 80)}` : ''}.\n\n${campaign.product ? `We help teams like yours with ${campaign.product}.` : ''} ${campaign.offer ? campaign.offer : 'Happy to share more if useful.'}\n\nWorth a quick look?`,
          follow_up_1: `Hi ${lead.full_name.split(' ')[0]},\n\nOne more thought — teams in your space are seeing real results with this approach. Happy to share specifics if helpful.`,
          follow_up_2: `Hi ${lead.full_name.split(' ')[0]},\n\nLast note from me. Wishing ${lead.company} the best — door's open if timing works later.`,
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
