import fs from 'fs';
import path from 'path';

const loadDotEnv = () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const contents = fs.readFileSync(envPath, 'utf8');
    return Object.fromEntries(
      contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const [key, ...rest] = line.split('=');
          return [key.trim(), rest.join('=').trim()];
        })
    );
  } catch {
    return {};
  }
};

const env = loadDotEnv();
const getEnvValue = (...names) => {
  for (const name of names) {
    const value = process.env[name] || env[name];
    if (value) return value;
  }
  return '';
};

const POLLINATIONS_API_KEY = getEnvValue('POLLINATIONS_API_KEY', 'VITE_POLLINATIONS_API_KEY');
const SUPABASE_URL = getEnvValue('SUPABASE_URL', 'VITE_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = getEnvValue('OPENAI_API_KEY');

const textGenerationTemplates = {
  typing: [
    'The morning sun cast long shadows across the quiet street. Birds sang their daily songs while people began their daily routines. It was a perfect day to start something new.',
    'Technology has transformed how we communicate and work in the modern world. From smartphones to artificial intelligence, innovations continue to shape our daily lives.',
    'Learning a new language opens doors to understanding different cultures and perspectives. Practice and dedication are key to achieving fluency and confidence.',
  ],
  sentence: [
    'Despite the challenging circumstances, the team managed to achieve their goals with determination and teamwork.',
    'Although she had never traveled abroad before, she felt completely comfortable and confident in the new city.',
    'The success of the project depended not only on planning but also on the cooperation of all team members.',
  ],
  listening: [
    'Welcome to the English listening practice. Today we will focus on common phrases and vocabulary used in everyday conversations. Please listen carefully and try to understand the main points.',
    'In this exercise, you will hear a conversation between two people at a coffee shop. Listen for the order they place and the total cost of their purchase.',
    'The audio file will play a short speech about environmental conservation. Try to identify the main topics discussed and key statistics mentioned.',
  ],
  speaking: [
    'Tell me about your favorite hobby and why you enjoy doing it. Try to speak for at least 60 seconds using complete sentences.',
    'Describe your ideal vacation destination. Include details about the climate, attractions, and why you would like to visit this place.',
    'Explain a skill you recently learned. How did you learn it, and what challenges did you face during the learning process?',
  ],
  dictation: [
    'The ability to communicate effectively is one of the most important skills in today\'s professional world. Success depends on listening carefully and expressing ideas clearly.',
    'Education is a lifelong journey that shapes our understanding of the world. Whether through formal schooling or personal experience, we continue to grow and learn.',
    'Environmental protection requires commitment from individuals, communities, and governments working together toward sustainable solutions.',
  ],
  passage: [
    'Technology has transformed how we learn and work in the twenty-first century. From online education to remote collaboration, digital tools have become essential parts of our lives. However, we must also consider the impact on personal interactions and mental health.',
    'The history of human civilization is a story of adaptation and innovation. From the discovery of fire to the development of artificial intelligence, humans have continuously found ways to solve problems and improve their living conditions.',
    'Climate change represents one of the greatest challenges facing humanity. Rising temperatures, changing weather patterns, and environmental degradation require immediate and coordinated global action.',
  ],
  email: [
    'Subject: Project Update\n\nDear Team,\n\nI hope this email finds you well. I wanted to provide a brief update on our current project status and next steps. Please let me know if you have any questions.\n\nBest regards,\nAlex',
    'Subject: Meeting Request\n\nHi Sarah,\n\nWould you be available for a meeting next Tuesday at 2 PM to discuss the quarterly results? We can meet in the conference room or via Zoom.\n\nThank you,\nMichael',
    'Subject: Feedback on Proposal\n\nDear Colleagues,\n\nThank you for submitting your proposal. I have reviewed it carefully and have some suggestions for improvement. Let\'s schedule a call to discuss these points in detail.\n\nBest,\nJennifer',
  ],
};

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const sendJson = (res, statusCode, payload) => {
  res.status(statusCode).json(payload);
};

const readRequestBody = async (req) => {
  if (req.body !== undefined) {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) return '';

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

const readTextBody = async (req) => {
  const body = await readRequestBody(req);
  return typeof body === 'string' ? body : JSON.stringify(body || {});
};

const generateWithOpenAI = async (prompt) => {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful English assessment question generator. Return only the requested content, no markdown, and no extra commentary.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('OpenAI request failed:', data?.error?.message || response.statusText);
      return null;
    }

    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.warn('OpenAI request error:', error.message);
    return null;
  }
};

const pickFallbackText = (prompt) => {
  const lower = (prompt || '').toLowerCase();
  if (lower.includes('listening')) return textGenerationTemplates.listening[0];
  if (lower.includes('speaking')) return textGenerationTemplates.speaking[0];
  if (lower.includes('dictation')) return textGenerationTemplates.dictation[0];
  if (lower.includes('email')) return textGenerationTemplates.email[0];
  if (lower.includes('passage')) return textGenerationTemplates.passage[0];
  if (lower.includes('sentence')) return textGenerationTemplates.sentence[0];
  if (lower.includes('typing')) return textGenerationTemplates.typing[0];
  return textGenerationTemplates.typing[0];
};

const getPathSegments = (req) => {
  const rawPath = req.query?.path;
  if (Array.isArray(rawPath)) return rawPath.filter(Boolean);
  if (typeof rawPath === 'string') return rawPath.split('/').filter(Boolean);

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  return url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
};

const handleGenerate = async (req, res) => {
  const prompt = await readTextBody(req);
  const randomSeed = Math.floor(Math.random() * 999999);
  const timestamp = Date.now();
  const enhancedPrompt = `${prompt}\n\nIMPORTANT: Generate DIFFERENT content each time. Use this unique seed: ${randomSeed}. Timestamp: ${timestamp}. Do NOT repeat previous content.`;

  const openAiText = await generateWithOpenAI(enhancedPrompt);
  if (openAiText) {
    return sendJson(res, 200, { text: openAiText, source: 'openai' });
  }

  return sendJson(res, 200, { text: pickFallbackText(enhancedPrompt), source: 'fallback' });
};

const handleAdminCandidates = async (res) => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: 'Supabase service role key is not configured.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,role,created_at&role=eq.candidate&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const data = await response.json().catch(() => []);
    return sendJson(res, response.ok ? 200 : 500, { candidates: Array.isArray(data) ? data : [] });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Failed to fetch candidates.' });
  }
};

const handleAdminResults = async (res) => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: 'Supabase service role key is not configured.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/test_results?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const data = await response.json().catch(() => []);
    const results = Array.isArray(data)
      ? data.map((item) => ({
          ...item,
          answers: item.answers || {},
          questions: item.questions || [],
        }))
      : [];
    return sendJson(res, response.ok ? 200 : 500, { results });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Failed to fetch results.' });
  }
};

const handleRegisterCandidate = async (req, res) => {
  const body = await readRequestBody(req);
  const { userId, email, password } = body || {};

  if (!userId || !email || !password) {
    return sendJson(res, 400, { error: 'User ID, email, and password are required.' });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: 'Supabase service role key is not configured.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email: String(email).trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { role: 'candidate', userId: String(userId).trim() },
      }),
    });

    const responseText = await response.text();
    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText };
    }

    if (!response.ok) {
      const message = data?.message || data?.error || responseText || 'Candidate registration failed.';
      return sendJson(res, response.status, { error: message });
    }

    return sendJson(res, 200, { user: data });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Candidate registration failed.' });
  }
};

const handleSaveResult = async (req, res) => {
  const payload = await readRequestBody(req);
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: 'Supabase service role key is not configured.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/test_results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText).catch(() => responseText) : {};
    return sendJson(res, response.ok ? 200 : 500, response.ok ? { success: true, data } : { error: data?.message || 'Failed to save result.' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Failed to save result.' });
  }
};

const handlePollinations = async (req, res, segments) => {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const base = segments[1] === 'audio' ? 'https://audio.pollinations.ai' : 'https://text.pollinations.ai';
  const prompt = decodeURIComponent(segments.slice(segments[1] === 'audio' ? 2 : 1).join('/'));
  const targetUrl = new URL(base);

  if (segments[1] === 'audio') {
    targetUrl.pathname = '/audio';
  } else {
    targetUrl.pathname = `/${prompt || ''}`;
  }

  targetUrl.search = url.search;
  targetUrl.searchParams.set('seed', targetUrl.searchParams.get('seed') || '1');

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'Learning-App/1.0',
        ...(POLLINATIONS_API_KEY ? { Authorization: `Bearer ${POLLINATIONS_API_KEY}` } : {}),
      },
    });

    const text = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain');
    res.status(response.ok ? 200 : response.status).send(text);
    return;
  } catch (error) {
    return sendJson(res, 502, { error: error.message || 'Pollinations proxy failed.' });
  }
};

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const segments = getPathSegments(req);

  if (!segments.length || segments[0] === 'health') {
    return sendJson(res, 200, { status: 'OK', service: 'Text Generation API', timestamp: new Date().toISOString() });
  }

  if (segments[0] === 'generate') {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    return handleGenerate(req, res);
  }

  if (segments[0] === 'admin') {
    if (segments[1] === 'register-candidate') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
      return handleRegisterCandidate(req, res);
    }

    if (segments[1] === 'candidates') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
      return handleAdminCandidates(res);
    }

    if (segments[1] === 'results') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
      return handleAdminResults(res);
    }

    if (segments[1] === 'save-result') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
      return handleSaveResult(req, res);
    }
  }

  if (segments[0] === 'pollinations') {
    return handlePollinations(req, res, segments);
  }

  return sendJson(res, 404, { error: 'Not found' });
}
