/**
 * services/watsonService.js
 * -----------------------------------------------------------------------
 * Wraps the IBM Watson Assistant V2 API: session creation and message
 * exchange, with graceful error handling so the rest of the app
 * doesn't crash if Watson credentials are missing/invalid.
 * -----------------------------------------------------------------------
 */
const { getWatsonAssistant } = require('../config/watson');
const logger = require('../utils/logger');

const assistantId = () => process.env.WATSON_ASSISTANT_ID;

/**
 * Creates a new Watson Assistant session and returns its sessionId.
 * A Watson session preserves conversational context (slots, prior
 * intents, etc.) across multiple turns for a given user session.
 */
async function createWatsonSession() {
  const assistant = getWatsonAssistant();
  const response = await assistant.createSession({ assistantId: assistantId() });
  return response.result.session_id;
}

/**
 * Sends a single user message to Watson Assistant within an existing
 * session and returns the assistant's reply text plus detected intent.
 */
async function sendMessageToWatson(watsonSessionId, text) {
  const assistant = getWatsonAssistant();

  const response = await assistant.message({
    assistantId: assistantId(),
    sessionId: watsonSessionId,
    input: {
      message_type: 'text',
      text,
      options: { return_context: true },
    },
  });

  const result = response.result;
  const generic = (result.output && result.output.generic) || [];

  const replyText = generic
    .filter((item) => item.response_type === 'text' && item.text)
    .map((item) => item.text)
    .join('\n')
    .trim();

  const intents = (result.output && result.output.intents) || [];
  const topIntent = intents[0] || null;

  return {
    reply: replyText || "I'm sorry, I didn't quite understand that. Could you rephrase your question?",
    intent: topIntent ? topIntent.intent : null,
    confidence: topIntent ? topIntent.confidence : null,
  };
}

/**
 * Deletes a Watson session when a chat session ends (best-effort).
 */
async function deleteWatsonSession(watsonSessionId) {
  try {
    const assistant = getWatsonAssistant();
    await assistant.deleteSession({ assistantId: assistantId(), sessionId: watsonSessionId });
  } catch (err) {
    logger.warn(`Failed to cleanly delete Watson session: ${err.message}`);
  }
}

module.exports = { createWatsonSession, sendMessageToWatson, deleteWatsonSession };
