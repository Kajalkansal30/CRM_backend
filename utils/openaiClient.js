const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. OpenAI API calls will fail.');
}

/**
 * Generate message suggestions using OpenAI GPT-3.5 Turbo chat completion.
 * @param {string} prompt - The prompt to send to OpenAI.
 * @param {number} n - Number of message variants to generate.
 * @returns {Promise<string[]>} - Array of generated message strings.
 */
async function generateMessageSuggestions(prompt, n = 3) {
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful marketing assistant that generates campaign message variants.' },
      { role: 'user', content: prompt }
    ];

    const response = await axios.post(OPENAI_API_URL, {
      model: 'gpt-3.5-turbo',
      messages,
      n,
      max_tokens: 300,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (response.data && response.data.choices) {
      return response.data.choices.map(choice => choice.message.content.trim());
    } else {
      throw new Error('Invalid response from OpenAI API');
    }
  } catch (error) {
    console.error('Error generating message suggestions:', error.response?.status, error.response?.data || error.message || error);
    throw error;
  }
}

module.exports = {
  generateMessageSuggestions,
};
