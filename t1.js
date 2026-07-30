const ejs = require('ejs');
const path = require('path');

const recentChats = [
  { userMessage: "btech fee", botReply: "B.Tech fee structure: Tuition is ₹85,000/year...", createdAt: new Date() },
  { userMessage: "hello", botReply: "Hi there!", createdAt: new Date() },
];

const data = {
  title: 'Dashboard',
  currentUser: { name: 'Mayank', email: 'test@example.com', role: 'student', createdAt: new Date() },
  recentChats,
  faqs: [],
  csrfToken: 'testtoken',
};

ejs.renderFile(path.join(__dirname, 'views/dashboard.ejs'), data, (err, str) => {
  if (err) {
    console.log("RENDER ERROR:", err.message);
    process.exit(1);
  }
  const match = str.match(/<script id="recentChatsData"[^>]*>([\s\S]*?)<\/script>/);
  console.log("RENDER OK. Extracted script tag content:");
  console.log(match ? match[1].trim() : "NOT FOUND");
});
