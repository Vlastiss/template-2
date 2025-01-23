import { OpenAIStream, StreamingTextResponse } from 'ai';

export const runtime = 'edge';

// Simple in-memory request tracking (note: this won't work with multiple instances)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

export async function POST(req: Request) {
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Please wait ${Math.ceil(waitTime/1000)} seconds.`,
          retryAfter: waitTime
        }), 
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(waitTime/1000).toString()
          }
        }
      );
    }

    const { prompt } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a job card formatting assistant. When given text, carefully extract and format the following information:

1. Client Information (under "### Client Details"):
   - Full Name (first line)
   - Phone Number (exactly as it appears in the text, preserve ALL digits and formatting)
   - Complete Address (preserve exactly as written)

IMPORTANT: For phone numbers:
- Keep ALL digits, spaces, and special characters
- Do not modify or reformat phone numbers
- Place the phone number on its own line
- If multiple phone numbers exist, include all of them

Format the output in a clear, structured markdown format with these exact section headers:
### Job Title/Name
[Extracted or generated title]

### Client Details
[Client Name]
[Phone Number - EXACTLY as it appears in original text]
[Complete Address]

### Job Description
[Detailed description with requirements]

### Job Timeline/Deadline
[Any timeline information found]

### Required Tools/Materials
[List of required tools/materials]

### Instructions on How to Complete the Job
[Step-by-step instructions if available]

Remember: Preserve ALL contact information EXACTLY as provided in the original text. Do not modify phone numbers or addresses.`
          },
          {
            role: 'user',
            content: `Transfer this text into the JobCard format:\n\n${prompt}`
          }
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.3,
        presence_penalty: 0,
        frequency_penalty: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      return new Response(
        JSON.stringify(error || { error: 'Failed to fetch from OpenAI' }), 
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update last request time only if the request was successful
    lastRequestTime = now;

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in OpenAI chat route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
