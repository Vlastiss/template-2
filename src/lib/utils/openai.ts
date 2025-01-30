export async function enhanceJobDescription(description: string) {
  try {
    console.log('Sending description to OpenAI:', description);

    const response = await fetch('/api/openai/enhance-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: description
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData?.error || 'Failed to enhance job description');
    }

    const data = await response.json();
    console.log('OpenAI response data:', data);
    
    if (!data.result) {
      throw new Error('Invalid response format from OpenAI');
    }

    try {
      const parsedResult = data.result;
      
      // Create the enhanced description with proper formatting
      const enhancedDescription = [
        `# ${parsedResult.jobTitle}`,
        '',
        '## Client Details',
        `- **Name:** ${parsedResult.clientName}`,
        `- **Contact:** ${parsedResult.clientPhone}`,
        `- **Email:** ${parsedResult.clientEmail}`,
        `- **Address:** ${parsedResult.clientAddress}`,
        '',
        '## Job Description',
        parsedResult.jobDescription,
        '',
        '## Timeline',
        `- **Start Date:** ${parsedResult.timeline.startDate || 'As soon as possible'}`,
        `- **Estimated Duration:** ${parsedResult.timeline.estimatedDuration} days`,
        `- **Expected Completion:** ${parsedResult.timeline.completionDate || 'To be determined'}`,
        '',
        '## Required Tools & Materials',
        ...parsedResult.requiredTools.map((tool: string) => `- ${tool}`),
        '',
        '## Step-by-Step Instructions',
        ...parsedResult.instructions.map((instruction: string, index: number) => 
          `${index + 1}. ${instruction}`
        )
      ].join('\n');

      return enhancedDescription;
    } catch (error) {
      console.error('Error formatting job description:', error);
      console.error('Raw result:', data.result);
      throw new Error(`Failed to format job description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in enhanceJobDescription:', error);
    throw error;
  }
} 