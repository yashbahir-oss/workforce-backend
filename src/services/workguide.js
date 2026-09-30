import Category from '../models/Category.js';
import Skill from '../models/Skill.js';
import WorkerProfile from '../models/WorkerProfile.js';
import Job from '../models/Job.js';

const normalize = (value = '') => String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function wantsWorkers(message, role) {
  const text = normalize(message);
  if (role === 'customer') return /worker|कामगार|मजूर|labou?r|helper|person|people|find|search|hire|कामगार/.test(text);
  return /worker|कामगार|customer|job|work|काम|नोकरी|find|search/.test(text) && !/profile|verification|booking status/.test(text);
}

function wantsJobs(message, role) {
  const text = normalize(message);
  if (role === 'worker') return /job|work|काम|नोकरी|opportunit|find|search/.test(text);
  return /job|work|काम|requirement|hire|booking/.test(text) && !/worker|कामगार/.test(text);
}

/**
 * Score database records against the user's natural-language WorkGuide request.
 * This keeps matching deterministic and prevents the AI model from inventing people.
 */
function scoreWorker(profile, query, catalogTerms) {
  const q = normalize(query);
  const haystack = normalize([
    profile.user?.name,
    profile.headline,
    profile.bio,
    ...(profile.skillNames || []),
    profile.district,
    profile.taluka,
    profile.city,
    profile.area,
    profile.locality,
    ...(profile.languages || []),
    ...(catalogTerms.get(String(profile.user?._id)) || []),
  ].join(' '));
  let score = 0;
  for (const term of q.split(' ').filter((x) => x.length > 1)) {
    if (haystack.includes(term)) score += 2;
  }
  for (const skill of profile.skillNames || []) if (q.includes(normalize(skill))) score += 7;
  for (const location of [profile.district, profile.taluka, profile.city, profile.area, profile.locality]) {
    if (location && q.includes(normalize(location))) score += 5;
  }
  return score;
}

function scoreJob(job, query) {
  const q = normalize(query);
  const haystack = normalize([job.title, job.description, job.categoryName, ...(job.skillNames || []), job.district, job.taluka, job.locality, job.address].join(' '));
  let score = 0;
  for (const term of q.split(' ').filter((x) => x.length > 1)) if (haystack.includes(term)) score += 2;
  for (const skill of job.skillNames || []) if (q.includes(normalize(skill))) score += 7;
  for (const location of [job.district, job.taluka, job.locality]) if (location && q.includes(normalize(location))) score += 5;
  return score;
}

function dbContextFor(workers, jobs) {
  return `Verified workers: ${JSON.stringify(workers.map((w) => ({ id:w.user?._id, name:w.user?.name, skills:w.skillNames, district:w.district, taluka:w.taluka, experienceYears:w.experienceYears, rating:w.ratingAverage })))}\nOpen jobs: ${JSON.stringify(jobs.map((j) => ({ id:j._id, title:j.title, category:j.categoryName, skills:j.skillNames, district:j.district, taluka:j.taluka, date:j.date })))}`;
}

function localAnswer(message, workers = [], jobs = [], role = 'customer') {
  if (role === 'worker' && jobs.length) return `I found ${jobs.length} open work opportunit${jobs.length > 1 ? 'ies' : 'y'} matching your request.`;
  if (workers.length) return `I found ${workers.length} verified worker${workers.length > 1 ? 's' : ''} matching your request.`;
  if (jobs.length) return `I found ${jobs.length} open work opportunit${jobs.length > 1 ? 'ies' : 'y'} matching your request.`;
  return role === 'worker'
    ? 'Tell me your skill, district or preferred work date and I can search open work requirements.'
    : 'Tell me the worker skill and location you need and I can search verified workers.';
}

async function callOpenRouter(message, dbContext) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const response = await fetch(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions', {
    method:'POST',
    headers:{ Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type':'application/json', 'HTTP-Referer':process.env.CLIENT_URL||'http://localhost:5173', 'X-Title':'WORKFORCE WorkGuide' },
    body:JSON.stringify({ model:process.env.OPENROUTER_MODEL||'openrouter/free', messages:[{role:'system',content:`You are WorkGuide for WORKFORCE. Use only the database context below for worker/job factual claims. Never invent workers, jobs, rates, reviews or availability. Keep the answer concise.\n${dbContext}`},{role:'user',content:message}], temperature:0.2 })
  });
  if (!response.ok) return null;
  const data=await response.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callOpenAI(message, dbContext) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
    body:JSON.stringify({ model:process.env.OPENAI_MODEL||'gpt-5-mini', messages:[{role:'system',content:`You are WorkGuide for WORKFORCE. Use only the database context below for worker/job factual claims. Never invent workers, jobs, rates, reviews or availability. Keep the answer concise.\n${dbContext}`},{role:'user',content:message}], temperature:0.2 })
  });
  if (!response.ok) return null;
  const data=await response.json();
  return data.choices?.[0]?.message?.content || null;
}

export async function answerWorkGuide(message, context = {}) {
  const role = context.role === 'worker' ? 'worker' : 'customer';
  const text = String(message || '').trim();
  const [categories, skills, allWorkers, allJobs] = await Promise.all([
    Category.find({ active: { $ne: false } }).select('name slug').lean(),
    Skill.find({ active: { $ne: false } }).select('name slug category').lean(),
    WorkerProfile.find({ verificationStatus:'approved', availability:{ $ne:'unavailable' } }).limit(100).populate('user','name profileImage').lean(),
    Job.find({ status:'open' }).sort({ date:1, createdAt:-1 }).limit(100).populate('customer','name profileImage').lean(),
  ]);

  // Build category -> skill vocabulary from MongoDB so a request such as
  // "find electrician" also matches workers whose stored skills are "wiring",
  // "installation", etc. No worker/category data is hard-coded.
  const categoryVocabulary = categories.map((category) => {
    const categorySkills = skills.filter((skill) => String(skill.category) === String(category._id));
    return {
      category,
      terms: [category.name, category.slug, ...categorySkills.map((skill) => skill.name), ...categorySkills.map((skill) => skill.slug)].filter(Boolean).map(normalize),
      skillNames: categorySkills.map((skill) => normalize(skill.name)),
    };
  });
  const requestedCategories = categoryVocabulary.filter((entry) => entry.terms.some((term) => term && normalize(text).split(' ').some((word) => word.length > 1 && (term.includes(word) || word.includes(term)))));
  const catalogTerms = new Map();
  for (const worker of allWorkers) {
    const matchedCategoryNames = categoryVocabulary.filter((entry) => entry.skillNames.some((skill) => (worker.skillNames || []).some((workerSkill) => normalize(workerSkill) === skill))).map((entry) => entry.category.name);
    catalogTerms.set(String(worker.user?._id), matchedCategoryNames);
  }

  const workerRanked = allWorkers
    .map((worker) => {
      let score = scoreWorker(worker, text, catalogTerms);
      if (requestedCategories.length) {
        const workerSkillSet = new Set((worker.skillNames || []).map(normalize));
        const categoryHit = requestedCategories.some((entry) => entry.skillNames.some((skill) => workerSkillSet.has(skill)) || entry.category.name && normalize(text).includes(normalize(entry.category.name)));
        if (categoryHit) score += 30;
        else score = -1;
      }
      return { worker, score };
    })
    .sort((a,b) => b.score - a.score);
  const jobRanked = allJobs
    .map((job) => ({ job, score: scoreJob(job, text) }))
    .sort((a,b) => b.score - a.score);
  const workerMatches = workerRanked.filter((row) => row.score > 0).slice(0, 8).map((row) => row.worker);
  const jobMatches = jobRanked.filter((row) => row.score > 0).slice(0, 8).map((row) => row.job);
  // For a broad request such as "find workers", show real verified records even when no filter term was supplied.
  const workersForResponse = wantsWorkers(text, role) ? (workerMatches.length ? workerMatches : allWorkers.slice(0, 8)) : [];
  const jobsForResponse = wantsJobs(text, role) ? (jobMatches.length ? jobMatches : allJobs.slice(0, 8)) : [];

  const dbContext = dbContextFor(workersForResponse, jobsForResponse);

  let answer = null;
  try { answer = await callOpenRouter(text, dbContext); } catch {}
  if (!answer) { try { answer = await callOpenAI(text, dbContext); } catch {} }
  return { answer: answer || localAnswer(text, workersForResponse, jobsForResponse, role), workers: workersForResponse, jobs: jobsForResponse };
}
