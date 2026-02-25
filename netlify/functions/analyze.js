// Proxy to Anthropic API — avoids CORS restriction in browser
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { transcript, model, apiKey } = body;

  if (!transcript || !transcript.trim()) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'transcript is required' }) };
  }
  if (!apiKey) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'apiKey is required' }) };
  }

  const systemPrompt = `You are a professional meeting assistant. Analyze meeting transcripts and return structured JSON only — no markdown, no explanation, just raw JSON.`;

  const userPrompt = `Analyze this meeting transcript and return a JSON object with the following structure exactly:

{
  "title": "A brief descriptive title for the meeting",
  "participants": ["name1", "name2"],
  "summary": "2–3 paragraph executive summary of what was discussed and decided",
  "actionItems": [
    {
      "task": "what needs to be done",
      "owner": "person responsible, or 'Unassigned'",
      "deadline": "deadline if mentioned, otherwise 'Not specified'",
      "priority": "high | medium | low"
    }
  ],
  "keyDecisions": ["decision 1", "decision 2"],
  "followUpItems": ["open question or follow-up 1", "open question or follow-up 2"]
}

Transcript:
${transcript.trim()}`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await upstream.json();

    return {
      statusCode: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
