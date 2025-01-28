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
          content: `You are a job processing assistant. Your task is to analyze the input text and return a structured JSON object containing all the relevant job information.

Return the data in this exact format:
{
  "jobTitle": "A clear, descriptive title summarizing the main task",
  "clientName": "Full name of the client",
  "clientEmail": "Client's email address",
  "clientPhone": "Client's phone number",
  "clientAddress": "Complete address",
  "jobDescription": "A clear description of the main tasks",
  "fullDescription": "The complete formatted job description in markdown",
  "timeline": {
    "startDate": "Proposed start date or null",
    "completionDate": "Expected completion date or null",
    "estimatedDuration": "Estimated duration in days"
  },
  "requiredTools": [
    "List of required tools and materials"
  ],
  "instructions": [
    "Step by step instructions for completing the job"
  ]
}

Make sure to:
1. Create a descriptive and professional job title based on the main tasks
2. Extract or infer client details from the input
3. Structure the job description clearly
4. Propose reasonable timeline/deadline if not specified
5. List all necessary tools and materials based on the tasks
6. Break down the job into clear step-by-step instructions
7. Return ONLY valid JSON that matches the exact format above`
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