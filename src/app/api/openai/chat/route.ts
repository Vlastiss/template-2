import { OpenAIStream, StreamingTextResponse } from 'ai';

export const runtime = 'edge';

// Simple in-memory request tracking (note: this won't work with multiple instances)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    console.log('Received messages:', JSON.stringify(messages, null, 2));

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
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
            content: 'You are a job description formatter. You must return a valid JSON object with the exact structure provided. Do not include any explanatory text or additional content.'
          },
          ...messages
        ],
        temperature: 0.3,
        max_tokens: 2000,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
    });

    const responseData = await response.text();
    console.log('Raw OpenAI response:', responseData);

    if (!response.ok) {
      console.error('OpenAI API error status:', response.status);
      console.error('OpenAI API error response:', responseData);
      
      let errorMessage = 'Failed to fetch from OpenAI';
      try {
        const errorJson = JSON.parse(responseData);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseData
        }), 
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      const data = JSON.parse(responseData);
      console.log('Parsed OpenAI response:', JSON.stringify(data, null, 2));

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI');
      }

      // Try to parse the response content as JSON
      try {
        const jsonResponse = JSON.parse(data.choices[0].message.content.trim());
        return new Response(
          JSON.stringify({ content: JSON.stringify(jsonResponse) }), 
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error('Response is not valid JSON');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse OpenAI response',
          details: responseData
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error in OpenAI route:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
