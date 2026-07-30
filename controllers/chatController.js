/**
 * controllers/chatController.js
 * -----------------------------------------------------------------------
 * REST API for the AI chatbot panel: session start, message exchange
 * (proxied to IBM Watson Assistant), and chat history retrieval.
 * -----------------------------------------------------------------------
 */
const { v4: uuidv4 } = (() => {
  try {
    return require('uuid');
  } catch {
    // Fallback UUID generator if the `uuid` package isn't installed,
    // so the app still runs without an extra dependency.
    return {
      v4: () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }),
    };
  }
})();

const ChatHistory = require('../models/ChatHistory');
const ActivityLog = require('../models/ActivityLog');
const College = require('../models/College');
const { createWatsonSession, sendMessageToWatson } = require('../services/watsonService');
const { detectCollegeAnswer } = require('../services/collegeAnswerService');
const { success, failure } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Starts (or resumes) a chat session. The Watson session id is kept in
 * the browser session so context is maintained across chat turns
 * during the current login session.
 */
const startSession = async (req, res, next) => {
  try {
    let watsonSessionId = req.session.watsonSessionId;
    if (!watsonSessionId) {
      watsonSessionId = await createWatsonSession();
      req.session.watsonSessionId = watsonSessionId;
      req.session.chatSessionId = uuidv4();
    }
    return success(res, 200, 'Chat session ready', {
      sessionId: req.session.chatSessionId,
    });
  } catch (err) {
    logger.error(`Watson session creation failed: ${err.message}`);
    return failure(res, 503, 'The AI assistant is temporarily unavailable. Please try again shortly.');
  }
};

/**
 * Sends a user message and stores the exchange. If the student has
 * selected a college (see /colleges) and the message matches a topic
 * we can answer directly from that college's own data (fees,
 * admissions, placements, etc.), that real data is used as the reply
 * -- Watson Assistant is only used as a fallback for anything that
 * doesn't map to college-specific data. This is what lets the chatbot
 * scale to any number of colleges without per-college Watson content.
 */
const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    let college = null;
    if (req.currentUser.selectedCollege) {
      college = await College.findById(req.currentUser.selectedCollege).lean();
    }

    const collegeAnswer = college ? detectCollegeAnswer(message, college) : null;

    let reply;
    let intent;
    let confidence;

    if (collegeAnswer) {
      // Answered directly from the college's own data -- no Watson call needed.
      reply = collegeAnswer.text;
      intent = collegeAnswer.topic;
      confidence = 1;
      // Still ensure a Watson session exists so free-form follow-up
      // questions later in the conversation continue to work.
      if (!req.session.watsonSessionId) {
        req.session.watsonSessionId = await createWatsonSession();
        req.session.chatSessionId = req.session.chatSessionId || uuidv4();
      }
    } else {
      if (!req.session.watsonSessionId) {
        req.session.watsonSessionId = await createWatsonSession();
        req.session.chatSessionId = req.session.chatSessionId || uuidv4();
      }
      const watsonResult = await sendMessageToWatson(req.session.watsonSessionId, message);
      reply = watsonResult.reply;
      intent = watsonResult.intent;
      confidence = watsonResult.confidence;
    }

    const record = await ChatHistory.create({
      user: req.currentUser._id,
      college: college ? college._id : null,
      sessionId: req.session.chatSessionId,
      watsonSessionId: req.session.watsonSessionId,
      userMessage: message,
      botReply: reply,
      intent,
      confidence,
    });

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'CHAT_MESSAGE',
      details: `Intent: ${intent || 'unknown'}${college ? ` (college: ${college.name})` : ''}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'Message processed', {
      reply,
      intent,
      confidence,
      chatId: record._id,
      timestamp: record.createdAt,
    });
  } catch (err) {
    logger.error(`Chat message handling failed: ${err.message}`);
    return failure(
      res,
      503,
      'The AI assistant could not process your message right now. Please try again shortly.'
    );
  }
};

/** Returns the current user's chat history (paginated). */
const getHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [items, total] = await Promise.all([
      ChatHistory.find({ user: req.currentUser._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ChatHistory.countDocuments({ user: req.currentUser._id }),
    ]);

    return success(res, 200, 'Chat history retrieved', {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { startSession, sendMessage, getHistory };
