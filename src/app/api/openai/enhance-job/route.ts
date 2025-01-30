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
  "jobDescription": "A clear, bullet-pointed list of main tasks (use • for bullets)",
  "timeline": {
    "startDate": "Proposed start date or null",
    "completionDate": "Expected completion date or null",
    "estimatedDuration": "Estimated duration in days"
  },
  "requiredTools": [
    "List of required tools and materials for each task"
  ],
  "instructions": [
    "Detailed step-by-step instructions for completing each task"
  ]
}

Make sure to:
1. Create a descriptive and professional job title based on the main tasks
2. Extract all client details from the input
3. Format the job description as bullet points using • symbol
4. Propose reasonable timeline estimates based on the tasks
5. List ALL necessary tools and materials for EACH task
6. Break down EACH task into clear step-by-step instructions
7. Return ONLY valid JSON that matches the exact format above
8. DO NOT include any markdown formatting or headers in the response`
        },
        {
          role: 'user',
          content: input
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const formattedText = completion.choices[0]?.message?.content;

    if (!formattedText) {
      return NextResponse.json(
        { error: 'Failed to format the text' },
        { status: 500 }
      );
    }

    try {
      // Validate the JSON response
      const parsedResponse = JSON.parse(formattedText);
      
      // Ensure job description has bullet points
      if (!parsedResponse.jobDescription.includes('•')) {
        parsedResponse.jobDescription = parsedResponse.jobDescription
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((line: string) => line.startsWith('•') ? line : `• ${line}`)
          .join('\n');
      }

      return NextResponse.json({ result: parsedResponse });
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response:', formattedText);
      return NextResponse.json(
        { error: 'Failed to parse the formatted text' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
} 