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
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a job card formatting assistant. When given text, format it into a clear and structured job card format. Extract and organize key information such as job title, company, location, requirements, responsibilities, and any other relevant details. Make the output clean and easy to read.'
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
