/**
 * app.js
 * -----------------------------------------------------------------------
 * Secure AI Student Support Portal - Application Entry Point
 *
 * Wires together: Express, MongoDB (Mongoose), sessions, IBM App ID
 * (Passport WebAppStrategy), security middleware (Helmet, CORS, CSRF,
 * rate limiting, sanitization), EJS views, and all REST API routers.
 * -----------------------------------------------------------------------
 */
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoSanitize = require('express-mongo-sanitize');
const passport = require('passport');

const connectDB = require('./config/db');
const { configureAppId } = require('./config/appId');
const logger = require('./utils/logger');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorMiddleware');
const { attachCurrentUser } = require('./middleware/authMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { attachCsrfToken, doubleCsrfProtection } = require('./middleware/csrfMiddleware');

const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.set('trust proxy', 1);

// -------------------------------------------------------------------------
// 1. Database
// -------------------------------------------------------------------------
connectDB();

// -------------------------------------------------------------------------
// 2. View engine (server-rendered EJS pages)
// -------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// -------------------------------------------------------------------------
// 3. Core security middleware
// -------------------------------------------------------------------------
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // Bootstrap/Bootstrap Icons + our own static assets
                styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
                scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            },
        },
    })
);
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || true,
        credentials: true,
    })
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// -------------------------------------------------------------------------
// 4. Body/cookie parsing + sanitization (XSS / NoSQL injection protection)
// -------------------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips keys starting with "$" or containing "."

// -------------------------------------------------------------------------
// 5. Sessions (backed by MongoDB so they survive restarts / scale out)
//    IBM App ID's WebAppStrategy stores auth context on req.session.
// -------------------------------------------------------------------------
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
        resave: false,
        saveUninitialized: false,
        proxy: true,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions',
            ttl: 60 * 60 * 2,
        }),
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 2,
        },
        name: 'connect.sid',
    })
);

// -------------------------------------------------------------------------
// 6. IBM App ID / Passport initialization
//    (The /auth/callback route itself is defined in routes/authRoutes.js,
//    mounted below at app.use('/auth', authRoutes) -- keeping all App ID
//    route logic in one file.)
// -------------------------------------------------------------------------
configureAppId();
app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------------------------------------------
// 7. Static assets
// -------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------------------
// 8. Attach local user profile (if any) + general API rate limiting
// -------------------------------------------------------------------------
app.use(attachCurrentUser);
app.use('/api', apiLimiter);

// -------------------------------------------------------------------------
// 9. CSRF protection
//    Token is issued on every request (readable via a JS-accessible
//    meta tag / res.locals.csrfToken) and validated on every
//    state-changing (non-GET) API request via the x-csrf-token header.
// -------------------------------------------------------------------------
app.use(attachCsrfToken);
app.use('/api', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }
    return doubleCsrfProtection(req, res, next);
});

// -------------------------------------------------------------------------
// 10. Routes
// -------------------------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', pageRoutes);

// -------------------------------------------------------------------------
// 11. 404 + global error handling (must be registered last)
// -------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

// -------------------------------------------------------------------------
// 12. Start server
// -------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Secure AI Student Support Portal running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;