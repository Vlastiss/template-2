export async function enhanceJobDescription(input: string) {
  try {
    console.log('Sending request to enhance description:', { inputLength: input.length });
    
    const response = await fetch('/api/openai/enhance-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to enhance job description');
    }

    return data.result;
  } catch (error) {
    console.error('Error enhancing job description:', error);
    throw error;
  }
} 