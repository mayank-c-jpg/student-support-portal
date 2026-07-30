/**
 * controllers/adminController.js
 * -----------------------------------------------------------------------
 * REST API used by the admin dashboard: registered users, chatbot usage
 * statistics, chat history moderation, and FAQ content management.
 * -----------------------------------------------------------------------
 */
const User = require('../models/User');
const ChatHistory = require('../models/ChatHistory');
const ActivityLog = require('../models/ActivityLog');
const FAQ = require('../models/FAQ');
const College = require('../models/College');
const { success, failure } = require('../utils/apiResponse');

/** GET /api/admin/users */
const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    return success(res, 200, 'Users retrieved', {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/admin/users/:id/status  { isActive: boolean } */
const setUserActiveStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive) },
      { new: true }
    ).lean();
    if (!user) return failure(res, 404, 'User not found');

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: `Set isActive=${isActive} for user ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'User status updated', { user });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/stats */
const usageStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalChats, flaggedChats, byIntent] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      ChatHistory.countDocuments(),
      ChatHistory.countDocuments({ flagged: true }),
      ChatHistory.aggregate([
        { $group: { _id: '$intent', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const last7Days = await ChatHistory.aggregate([
      {
        $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Per-college breakdown: how many students picked each college, and
    // how many chat messages have been about it. Left-joins against
    // College so every college shows up even with zero activity yet.
    const collegeBreakdown = await College.aggregate([
      { $match: { isPublished: true } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'selectedCollege',
          as: 'students',
        },
      },
      {
        $lookup: {
          from: 'chathistories',
          localField: '_id',
          foreignField: 'college',
          as: 'chats',
        },
      },
      {
        $project: {
          name: 1,
          studentsSelected: { $size: '$students' },
          chatCount: { $size: '$chats' },
        },
      },
      { $sort: { chatCount: -1 } },
    ]);

    return success(res, 200, 'Usage statistics retrieved', {
      totalUsers,
      activeUsers,
      totalChats,
      flaggedChats,
      topIntents: byIntent,
      chatsPerDay: last7Days,
      collegeBreakdown,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/chats */
const listChats = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const filter = {};
    if (req.query.flagged === 'true') filter.flagged = true;

    const [chats, total] = await Promise.all([
      ChatHistory.find(filter)
        .populate('user', 'name email')
        .populate('college', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ChatHistory.countDocuments(filter),
    ]);

    return success(res, 200, 'Chat history retrieved', {
      chats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/admin/chats/:id/flag  { flagged: boolean } */
const flagChat = async (req, res, next) => {
  try {
    const chat = await ChatHistory.findByIdAndUpdate(
      req.params.id,
      { flagged: Boolean(req.body.flagged) },
      { new: true }
    ).lean();
    if (!chat) return failure(res, 404, 'Chat entry not found');
    return success(res, 200, 'Chat entry updated', { chat });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/chats/:id */
const deleteChat = async (req, res, next) => {
  try {
    const chat = await ChatHistory.findByIdAndDelete(req.params.id).lean();
    if (!chat) return failure(res, 404, 'Chat entry not found');

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: `Deleted inappropriate chat entry ${chat._id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'Chat entry deleted');
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/faqs */
const listFaqs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 }).lean();
    return success(res, 200, 'FAQs retrieved', { faqs });
  } catch (err) {
    next(err);
  }
};

/** POST /api/admin/faqs */
const createFaq = async (req, res, next) => {
  try {
    const { question, answer, category } = req.body;
    const faq = await FAQ.create({
      question,
      answer,
      category,
      createdBy: req.currentUser._id,
    });
    return success(res, 201, 'FAQ created', { faq });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/faqs/:id */
const updateFaq = async (req, res, next) => {
  try {
    const { question, answer, category, isPublished } = req.body;
    const update = {};
    if (question !== undefined) update.question = question;
    if (answer !== undefined) update.answer = answer;
    if (category !== undefined) update.category = category;
    if (isPublished !== undefined) update.isPublished = Boolean(isPublished);

    const faq = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!faq) return failure(res, 404, 'FAQ not found');
    return success(res, 200, 'FAQ updated', { faq });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/faqs/:id */
const deleteFaq = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id).lean();
    if (!faq) return failure(res, 404, 'FAQ not found');
    return success(res, 200, 'FAQ deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  setUserActiveStatus,
  usageStats,
  listChats,
  flagChat,
  deleteChat,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
};
