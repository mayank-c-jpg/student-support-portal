/**
 * models/ChatHistory.js
 * -----------------------------------------------------------------------
 * Stores each chat exchange (user message + Watson Assistant reply) so
 * conversation context and history can be shown to the user and
 * reviewed by administrators.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    watsonSessionId: {
      type: String,
      default: null,
    },
    userMessage: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    botReply: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    intent: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      default: null,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

chatHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
