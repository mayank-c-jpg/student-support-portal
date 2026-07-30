/**
 * services/collegeAnswerService.js
 * -----------------------------------------------------------------------
 * Detects whether a user's chat message is asking about a topic we can
 * answer directly from the STUDENT'S SELECTED COLLEGE data (fees,
 * admissions, placements, etc.), and if so, builds the exact answer
 * from that college's real MongoDB document instead of relying on
 * Watson Assistant's own (necessarily generic) canned text.
 *
 * This is what lets the chatbot scale to any number of colleges
 * without needing separate Watson content built for each one --
 * Watson's job becomes purely "does this look like a fees/admissions/
 * placements/... question", while the actual facts always come from
 * whichever college the student picked on /colleges.
 * -----------------------------------------------------------------------
 */

const inr = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

/** Normalizes a course name for loose matching (e.g. "B.Tech" ~ "btech"). */
function normalize(str) {
  return (str || '').toLowerCase().replace(/[.\s]/g, '');
}

function buildCourseFeeText(course, college) {
  return (
    `${course.name} fee structure at ${college.name}: ` +
    `Tuition is ${inr(course.tuitionFeePerYear)}/year, ` +
    `hostel fees are ${inr(course.hostelFeePerYear)}/year, ` +
    `and exam fees are ${inr(course.examFeePerSemester)}/semester.`
  );
}

function buildAllFeesText(college) {
  const lines = (college.courses || [])
    .map((c) => `• ${c.name}: ${inr(c.tuitionFeePerYear)}/year tuition + ${inr(c.hostelFeePerYear)}/year hostel`)
    .join('\n');
  return (
    `Here's the fee structure at ${college.name}:\n${lines}\n` +
    `Ask about a specific course (like "${college.courses[0]?.name || 'B.Tech'} fee") for exact exam fee details too.`
  );
}

function buildCourseListText(college) {
  const names = (college.courses || []).map((c) => c.name);
  if (names.length === 0) {
    return `${college.name} hasn't listed specific courses yet -- please contact the admissions office for current offerings.`;
  }
  return `${college.name} offers: ${names.join(', ')}.`;
}

const FEE_KEYWORDS = ['fee', 'fees', 'tuition', 'cost', 'charges'];
const COURSE_KEYWORDS = ['course', 'courses', 'program', 'programs', 'branch', 'branches', 'stream'];

const TEXT_FIELD_TOPICS = [
  { keywords: ['admission', 'apply', 'eligibility', 'enroll', 'enrolment', 'enrollment'], field: 'admissionProcess', label: 'Admissions' },
  { keywords: ['placement', 'placements', 'recruit', 'package', 'hire', 'hiring', 'job'], field: 'placementInfo', label: 'Placements' },
  { keywords: ['internship', 'internships', 'intern'], field: 'internshipInfo', label: 'Internships' },
  { keywords: ['exam', 'exams', 'examination', 'test schedule', 'date sheet', 'timetable'], field: 'examInfo', label: 'Examinations' },
  { keywords: ['scholarship', 'scholarships', 'financial aid', 'fee waiver'], field: 'scholarshipInfo', label: 'Scholarships' },
  { keywords: ['library'], field: 'libraryInfo', label: 'Library Services' },
  { keywords: ['campus', 'facility', 'facilities', 'hostel life', 'sports', 'gym', 'canteen'], field: 'campusFacilities', label: 'Campus Facilities' },
];

/**
 * Returns { topic, text } if the message maps to something we can
 * answer directly from the college's data, or null if it doesn't
 * (caller should fall back to Watson Assistant's own reply).
 */
function detectCollegeAnswer(message, college) {
  if (!message || !college) return null;
  const text = message.toLowerCase();
  const normalizedText = normalize(text);

  const mentionsFee = FEE_KEYWORDS.some((k) => text.includes(k));
  const mentionsCourseWord = COURSE_KEYWORDS.some((k) => text.includes(k));

  // 1. Course-specific fee question (e.g. "btech fee", "what is the fee for MCA")
  if (mentionsFee) {
    const matchedCourse = (college.courses || []).find((c) => normalizedText.includes(normalize(c.name)));
    if (matchedCourse) {
      return { topic: `${matchedCourse.name} Fee`, text: buildCourseFeeText(matchedCourse, college) };
    }
    // Generic fee question -> summarize all courses for this college
    return { topic: 'Fee Structure', text: buildAllFeesText(college) };
  }

  // 2. "What courses do you offer" (without a fee keyword)
  if (mentionsCourseWord) {
    return { topic: 'Courses', text: buildCourseListText(college) };
  }

  // 3. Other free-text topics stored directly on the college document
  for (const entry of TEXT_FIELD_TOPICS) {
    if (entry.keywords.some((k) => text.includes(k))) {
      const content = (college[entry.field] || '').trim();
      if (content) {
        return { topic: entry.label, text: `${entry.label} at ${college.name}: ${content}` };
      }
    }
  }

  return null;
}

module.exports = { detectCollegeAnswer };
