/**
 * controllers/pageController.js
 * -----------------------------------------------------------------------
 * Renders server-side EJS pages. Business/data logic for JSON APIs
 * lives in the other controllers; these handlers focus on assembling
 * the initial data needed for a page render (chat history preview,
 * FAQ list, admin stats, etc).
 * -----------------------------------------------------------------------
 */
const ChatHistory = require('../models/ChatHistory');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const College = require('../models/College');

const landing = (req, res) => {
  res.render('landing', { title: 'Welcome', currentUser: req.currentUser });
};

const loginPage = (req, res) => {
  if (req.currentUser) return res.redirect('/dashboard');
  res.render('login', {
    title: 'Login',
    currentUser: null,
    expired: req.query.expired === '1',
  });
};

const registerPage = (req, res) => {
  if (req.currentUser) return res.redirect('/dashboard');
  res.render('register', { title: 'Create Account', currentUser: null });
};

const dashboard = async (req, res, next) => {
  try {
    const [recentChats, faqs, userWithCollege] = await Promise.all([
      ChatHistory.find({ user: req.currentUser._id }).sort({ createdAt: -1 }).limit(10).lean(),
      FAQ.find({ isPublished: true }).sort({ category: 1 }).limit(12).lean(),
      User.findById(req.currentUser._id).populate('selectedCollege', 'name location').lean(),
    ]);

    res.render('dashboard', {
      title: 'Dashboard',
      currentUser: req.currentUser,
      recentChats,
      faqs,
      selectedCollege: (userWithCollege && userWithCollege.selectedCollege) || null,
    });
  } catch (err) {
    next(err);
  }
};

const profilePage = (req, res) => {
  res.render('profile', { title: 'My Profile', currentUser: req.currentUser });
};

/** GET /colleges -- public "Browse Colleges" page (any logged-in student). */
const collegesPage = async (req, res, next) => {
  try {
    const colleges = await College.find({ isPublished: true }).sort({ name: 1 }).lean();
    const userWithCollege = await User.findById(req.currentUser._id).select('selectedCollege').lean();

    res.render('colleges', {
      title: 'Browse Colleges',
      currentUser: req.currentUser,
      colleges,
      selectedCollegeId: userWithCollege && userWithCollege.selectedCollege
        ? String(userWithCollege.selectedCollege)
        : null,
    });
  } catch (err) {
    next(err);
  }
};

const adminDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalChats, flaggedChats, recentLogs, users] = await Promise.all([
      User.countDocuments(),
      ChatHistory.countDocuments(),
      ChatHistory.countDocuments({ flagged: true }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(20).populate('user', 'name email').lean(),
      User.find().sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      currentUser: req.currentUser,
      stats: { totalUsers, totalChats, flaggedChats },
      recentLogs,
      users,
    });
  } catch (err) {
    next(err);
  }
};

const custom404 = (req, res) => {
  res.status(404).render('404', { title: 'Page Not Found', currentUser: req.currentUser || null });
};

module.exports = {
  landing,
  loginPage,
  registerPage,
  dashboard,
  profilePage,
  collegesPage,
  adminDashboard,
  custom404,
};
