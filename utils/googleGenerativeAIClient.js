const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize with your API key (store this in environment variables!)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY); 

async function generateMessageSuggestionsGoogle(campaignObjective, segmentDescription) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.0-pro",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256,
        candidateCount: 3
      }
    });

    const prompt = `Generate 3 marketing message suggestions for:
    - Campaign Objective: "${campaignObjective}"
    - Target Audience: "${segmentDescription}"
    
    Format each suggestion clearly with a number. Example:
    1. "First suggestion..."
    2. "Second suggestion..."`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Extract text from response
    const text = response.text();
    
    // Split into individual suggestions (assuming numbered list)
    const suggestions = text.split('\n')
      .filter(line => line.match(/^\d+\./)) // Filter only numbered lines
      .map(line => line.replace(/^\d+\.\s*/, '').trim()); // Remove numbering

    return suggestions.slice(0, 3); // Ensure max 3 suggestions
  } catch (error) {
    console.error('Google AI API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw new Error(`Failed to generate messages: ${error.message}`);
  }
}

module.exports = {
  generateMessageSuggestionsGoogle
};