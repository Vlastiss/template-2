'use client';

import { useState, useCallback } from 'react';
import { useCompletion } from 'ai/react';

// Rate limiting settings
const RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;

export default function TextFormatter() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const { complete, completion, isLoading } = useCompletion({
    api: '/api/openai/chat',
    onError: (error) => {
      console.error('Completion error:', error);
      if (error?.message?.includes('429')) {
        setError(`Rate limit exceeded. Retrying in ${RETRY_DELAY/1000} seconds...`);
        handleRateLimit();
      } else if (error?.message?.includes('insufficient_quota')) {
        setError('OpenAI API quota exceeded. Please try again later or contact support.');
      } else {
        setError('An error occurred while formatting the text. Please try again.');
      }
    },
    onFinish: () => {
      // Reset retry count on successful completion
      setRetryCount(0);
      setIsRetrying(false);
    },
  });

  const handleRateLimit = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      setError('Maximum retry attempts reached. Please try again later.');
      setRetryCount(0);
      setIsRetrying(false);
      return;
    }

    setIsRetrying(true);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    setRetryCount(prev => prev + 1);
    formatText();
  }, [retryCount]);

  const formatText = async () => {
    if (!text.trim() || isRetrying) return;
    
    setError('');
    try {
      await complete(text);
    } catch (err) {
      console.error('Error formatting text:', err);
      if (!isRetrying) {
        setError('Failed to connect to the server. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="input" className="block text-sm font-medium text-gray-700">
          Job Description Text
        </label>
        <textarea
          id="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 p-3 border border-gray-300 text-black rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Paste the job description text here..."
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            {error}
            {retryCount > 0 && ` (Attempt ${retryCount}/${MAX_RETRIES})`}
          </p>
        </div>
      )}

      <button
        onClick={formatText}
        disabled={isLoading || !text.trim() || isRetrying}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating Job Card...' : 
         isRetrying ? `Retrying (${retryCount}/${MAX_RETRIES})...` : 
         'Convert to Job Card'}
      </button>

      {completion && (
        <div className="space-y-2">
          <label htmlFor="output" className="block text-sm font-medium text-gray-700">
            Formatted Job Card
          </label>
          <textarea
            id="output"
            value={completion}
            readOnly
            className="w-full min-h-[1200px] p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          />
        </div>
      )}
    </div>
  );
} 