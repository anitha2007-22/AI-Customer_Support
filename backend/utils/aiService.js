/**
 * AI Service — Google Gemini integration
 * Handles: categorization, priority detection, sentiment analysis,
 *          response suggestions, and ticket routing
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

const getAI = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Full ticket analysis: category, priority, sentiment, routing, and suggested reply
 */
const analyzeTicket = async (title, description) => {
  const ai = getAI();

  // Return sensible defaults if no API key is configured
  if (!ai) {
    return getDefaultAnalysis(title, description);
  }

  const prompt = `
You are an expert customer support AI. Analyze this support ticket and respond ONLY with valid JSON.

Ticket Title: "${title}"
Ticket Description: "${description}"

Respond with this exact JSON structure:
{
  "category": "Technical Issue" | "Billing Issue" | "Account Issue" | "General Inquiry",
  "priority": "Low" | "Medium" | "High" | "Critical",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "routingRecommendation": "brief routing suggestion (max 100 chars)",
  "suggestedResponse": "a professional, empathetic suggested reply for the agent (2-3 sentences)",
  "confidence": 0.0-1.0
}

Rules:
- Critical: system outages, data loss, security breaches, payment failures
- High: major feature broken, billing errors, account locked
- Medium: minor bugs, billing questions, account settings
- Low: general questions, feature requests, documentation
`;

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      suggestedCategory: parsed.category || 'General Inquiry',
      suggestedPriority: parsed.priority || 'Medium',
      sentiment: parsed.sentiment || 'Neutral',
      routingRecommendation: parsed.routingRecommendation || 'General Support',
      suggestedResponse: parsed.suggestedResponse || '',
      confidence: parsed.confidence || 0.8,
    };
  } catch (err) {
    console.error('Gemini AI error:', err.message);
    return getDefaultAnalysis(title, description);
  }
};

/**
 * Generate a contextual response suggestion for an agent
 */
const generateResponseSuggestion = async (ticket, conversationHistory = []) => {
  const ai = getAI();
  if (!ai) return 'Thank you for contacting us. We are reviewing your ticket and will respond shortly.';

  const history = conversationHistory.slice(-4).map(m => `${m.senderRole}: ${m.content}`).join('\n');

  const prompt = `
You are a professional customer support agent. Write a helpful, empathetic response to this customer ticket.

Category: ${ticket.category}
Priority: ${ticket.priority}
Title: ${ticket.title}
Description: ${ticket.description}
${history ? `\nRecent conversation:\n${history}` : ''}

Write a professional response in 2-3 sentences. Be specific, helpful, and empathetic. Do not use generic placeholders.
`;

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini response suggestion error:', err.message);
    return 'Thank you for reaching out. I have reviewed your ticket and will assist you promptly.';
  }
};

/**
 * Rule-based fallback when no API key is configured
 */
const getDefaultAnalysis = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();

  let category = 'General Inquiry';
  if (/error|bug|crash|fail|broken|not working|issue|problem/.test(text)) category = 'Technical Issue';
  else if (/bill|payment|charge|invoice|refund|price|subscription/.test(text)) category = 'Billing Issue';
  else if (/account|login|password|access|locked|username/.test(text)) category = 'Account Issue';

  let priority = 'Medium';
  if (/urgent|critical|emergency|asap|immediately|data loss|security breach/.test(text)) priority = 'Critical';
  else if (/important|high|major|severe|broken|not working/.test(text)) priority = 'High';
  else if (/question|inquiry|curious|wondering|when|how/.test(text)) priority = 'Low';

  let sentiment = 'Neutral';
  if (/frustrated|angry|terrible|worst|unacceptable|ridiculous|awful/.test(text)) sentiment = 'Negative';
  else if (/thank|great|happy|appreciate|love|excellent/.test(text)) sentiment = 'Positive';

  return {
    suggestedCategory: category,
    suggestedPriority: priority,
    sentiment,
    routingRecommendation: `${category} Team`,
    suggestedResponse: `Thank you for contacting us regarding your ${category.toLowerCase()}. We have received your ticket and will review it shortly. Our team will reach out to you with an update as soon as possible.`,
    confidence: 0.65,
  };
};

module.exports = { analyzeTicket, generateResponseSuggestion };