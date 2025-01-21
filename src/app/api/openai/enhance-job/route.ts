import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://oai.hconeai.com/v1',
});

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input?.trim()) {
      return NextResponse.json(
        { error: 'Please provide some text to format' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Format the job information into these sections:
- Job Title/Name
- Client Details (name, contact, address)
- Job Description
- Priority Level (if mentioned)
- Timeline/Deadline
- Required Tools/Materials
- Special Instructions (if any)`
        },
        {
          role: 'user',
          content: input
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const formattedText = completion.choices[0]?.message?.content;

    if (!formattedText) {
      return NextResponse.json(
        { error: 'Failed to format the text' },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: formattedText });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
} 