/**
 * config/watson.js
 * -----------------------------------------------------------------------
 * Configures the IBM Watson Assistant V2 SDK client.
 * -----------------------------------------------------------------------
 */
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');
const logger = require('../utils/logger');

let assistant = null;

function getWatsonAssistant() {
  if (assistant) return assistant;

  const apiKey = process.env.WATSON_ASSISTANT_API_KEY;
  const serviceUrl = process.env.WATSON_ASSISTANT_URL;
  const version = process.env.WATSON_ASSISTANT_VERSION || '2021-11-27';

  if (!apiKey || !serviceUrl) {
    logger.warn(
      'Watson Assistant credentials are not fully configured. ' +
        'Chat routes will return an error until WATSON_* env vars are set.'
    );
  }

  assistant = new AssistantV2({
    version,
    authenticator: new IamAuthenticator({ apikey: apiKey || 'placeholder' }),
    serviceUrl: serviceUrl || 'https://api.us-south.assistant.watson.cloud.ibm.com',
  });

  return assistant;
}

module.exports = { getWatsonAssistant };
