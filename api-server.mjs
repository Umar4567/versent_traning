import fs from 'fs';
import http from 'http';
import path from 'path';
import url from 'url';

const PORT = Number(process.env.PORT || 3001);
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

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
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || process.env.VITE_POLLINATIONS_API_KEY || env.VITE_POLLINATIONS_API_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://ruddxvktislvvulpqpvz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || '';

// Mock text generation data
const textGenerationTemplates = {
  'typing': [
    'The morning sun cast long shadows across the quiet street. Birds sang their daily songs while people began their daily routines. It was a perfect day to start something new.',
    'Technology has transformed how we communicate and work in the modern world. From smartphones to artificial intelligence, innovations continue to shape our daily lives.',
    'Learning a new language opens doors to understanding different cultures and perspectives. Practice and dedication are key to achieving fluency and confidence.',
  ],
  'sentence': [
    'Despite the challenging circumstances, the team managed to achieve their goals with determination and teamwork.',
    'Although she had never traveled abroad before, she felt completely comfortable and confident in the new city.',
    'The success of the project depended not only on planning but also on the cooperation of all team members.',
  ],
  'listening': [
    'Welcome to the English listening practice. Today we will focus on common phrases and vocabulary used in everyday conversations. Please listen carefully and try to understand the main points.',
    'In this exercise, you will hear a conversation between two people at a coffee shop. Listen for the order they place and the total cost of their purchase.',
    'The audio file will play a short speech about environmental conservation. Try to identify the main topics discussed and key statistics mentioned.',
  ],
  'speaking': [
    'Tell me about your favorite hobby and why you enjoy doing it. Try to speak for at least 60 seconds using complete sentences.',
    'Describe your ideal vacation destination. Include details about the climate, attractions, and why you would like to visit this place.',
    'Explain a skill you recently learned. How did you learn it, and what challenges did you face during the learning process?',
  ],
  'dictation': [
    'The ability to communicate effectively is one of the most important skills in today\'s professional world. Success depends on listening carefully and expressing ideas clearly.',
    'Education is a lifelong journey that shapes our understanding of the world. Whether through formal schooling or personal experience, we continue to grow and learn.',
    'Environmental protection requires commitment from individuals, communities, and governments working together toward sustainable solutions.',
  ],
  'passage': [
    'Technology has transformed how we learn and work in the twenty-first century. From online education to remote collaboration, digital tools have become essential parts of our lives. However, we must also consider the impact on personal interactions and mental health.',
    'The history of human civilization is a story of adaptation and innovation. From the discovery of fire to the development of artificial intelligence, humans have continuously found ways to solve problems and improve their living conditions.',
    'Climate change represents one of the greatest challenges facing humanity. Rising temperatures, changing weather patterns, and environmental degradation require immediate and coordinated global action.',
  ],
  'email': [
    'Subject: Project Update\n\nDear Team,\n\nI hope this email finds you well. I wanted to provide a brief update on our current project status and next steps. Please let me know if you have any questions.\n\nBest regards,\nAlex',
    'Subject: Meeting Request\n\nHi Sarah,\n\nWould you be available for a meeting next Tuesday at 2 PM to discuss the quarterly results? We can meet in the conference room or via Zoom.\n\nThank you,\nMichael',
    'Subject: Feedback on Proposal\n\nDear Colleagues,\n\nThank you for submitting your proposal. I have reviewed it carefully and have some suggestions for improvement. Let\'s schedule a call to discuss these points in detail.\n\nBest,\nJennifer',
  ],
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
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful English assessment question generator. Return only the requested content, no markdown, and no extra commentary.',
          },
          {
            role: 'user',
            content: prompt,
          },
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

    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    console.warn('OpenAI request error:', error.message);
    return null;
  }
};

const sendStaticFile = (res, filePath) => {
  if (!filePath.startsWith(DIST_DIR)) {
    return false;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';
  const fileContents = fs.readFileSync(filePath);
  const isHtml = extension === '.html';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': isHtml ? 'no-store' : 'public, max-age=31536000, immutable',
  });
  res.end(fileContents);
  return true;
};

const serveFrontend = (res, pathname) => {
  const trimmedPath = pathname === '/' ? '/index.html' : pathname;
  const relativePath = trimmedPath.startsWith('/') ? trimmedPath.slice(1) : trimmedPath;
  const requestedPath = decodeURIComponent(relativePath);
  const filePath = path.join(DIST_DIR, requestedPath);

  if (sendStaticFile(res, filePath)) {
    return true;
  }

  if (pathname !== '/' && !pathname.includes('.')) {
    return sendStaticFile(res, path.join(DIST_DIR, 'index.html'));
  }

  return sendStaticFile(res, path.join(DIST_DIR, 'index.html'));
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';
  const query = parsedUrl.query;
  const method = req.method || 'GET';

  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  };

  setCors();

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', service: 'Text Generation API', timestamp: new Date().toISOString() }));
    return;
  }

  if (pathname === '/admin/register-candidate') {
    if (method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { userId, email, password } = JSON.parse(body || '{}');

        if (!userId || !email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'User ID, email, and password are required.' }));
          return;
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Supabase service role key is not configured.' }));
          return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const customUserId = userId.trim();
        const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: { role: 'candidate', userId: customUserId },
          }),
        });

        const responseText = await response.text();
        let data = {};
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = { message: responseText };
        }

        let supabaseUserId = data?.id || null;
        if (!response.ok && supabaseUserId === null) {
          const message = data?.message || data?.error || responseText || 'Failed to create candidate account.';
          const isDuplicateUser = /already|exists|registered/i.test(message);

          if (isDuplicateUser) {
            const lookupResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}&per_page=1`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
              },
            });

            if (lookupResponse.ok) {
              const lookupText = await lookupResponse.text();
              let lookupData = {};
              try {
                lookupData = lookupText ? JSON.parse(lookupText) : {};
              } catch {
                lookupData = { message: lookupText };
              }

              const existingUser = Array.isArray(lookupData?.users) ? lookupData.users[0] : null;
              if (existingUser?.id) {
                supabaseUserId = existingUser.id;
              }
            }
          }
        }

        if (!response.ok && !supabaseUserId) {
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: data?.message || data?.error || 'Failed to create candidate account.' }));
          return;
        }
        if (supabaseUserId) {
          const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              id: supabaseUserId,
              email: normalizedEmail,
              role: 'candidate',
            }),
          });

          if (!profileResponse.ok) {
            const profileText = await profileResponse.text();
            res.writeHead(profileResponse.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Profile creation failed: ${profileText}` }));
            return;
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: data || null, userId: supabaseUserId }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Candidate registration failed.' }));
      }
    });
    return;
  }

  if (pathname === '/admin/candidates') {
    if (method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      if (!SUPABASE_SERVICE_ROLE_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Supabase service role key is not configured.' }));
        return;
      }

      const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const usersText = await usersResponse.text();
      let usersPayload = { users: [] };
      try {
        usersPayload = usersText ? JSON.parse(usersText) : { users: [] };
      } catch {
        usersPayload = { users: [] };
      }

      const testResultsResponse = await fetch(`${SUPABASE_URL}/rest/v1/test_results?select=created_at,total_score,max_score,percentage,answers&order=created_at.desc&limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const testResultsText = await testResultsResponse.text();
      let testResultsPayload = [];
      try {
        testResultsPayload = testResultsText ? JSON.parse(testResultsText) : [];
      } catch {
        testResultsPayload = [];
      }

      const latestResultsByAuthId = {};
      const latestResultsByCandidateId = {};
      const latestResultsByEmail = {};
      const latestResultsByUserName = {};

      const keepLatestResult = (map, key, resultEntry) => {
        if (!key) return;
        const existing = map[key];
        if (!existing) {
          map[key] = resultEntry;
          return;
        }
        const existingAt = new Date(existing.created_at || 0).getTime();
        const incomingAt = new Date(resultEntry.created_at || 0).getTime();
        if (incomingAt >= existingAt) {
          map[key] = resultEntry;
        }
      };

      (Array.isArray(testResultsPayload) ? testResultsPayload : []).forEach((row) => {
        try {
          const answersData = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
          const meta = answersData?.meta || {};
          const normalizedMetaEmail = typeof meta.userEmail === 'string' ? meta.userEmail.trim().toLowerCase() : null;
          const normalizedMetaName = typeof meta.userName === 'string' ? meta.userName.trim().toLowerCase() : null;
          const totalScore = typeof row.total_score === 'number' ? row.total_score : null;
          const maxScore = typeof row.max_score === 'number' ? row.max_score : null;
          const resultScore = typeof row.percentage === 'number' ? `${row.percentage}%` : null;
          const scoreDisplay = (totalScore !== null && maxScore !== null)
            ? `${totalScore}/${maxScore}`
            : resultScore;

          const resultEntry = {
            percentage: row.percentage ?? null,
            total_score: totalScore,
            max_score: maxScore,
            scoreDisplay,
            created_at: row.created_at || null,
          };

          keepLatestResult(latestResultsByAuthId, meta.authUserId, resultEntry);
          keepLatestResult(latestResultsByCandidateId, meta.candidateUserId, resultEntry);
          keepLatestResult(latestResultsByEmail, normalizedMetaEmail, resultEntry);
          keepLatestResult(latestResultsByUserName, normalizedMetaName, resultEntry);
        } catch (e) {
          // ignore malformed result rows
        }
      });

      const candidates = (Array.isArray(usersPayload?.users) ? usersPayload.users : [])
        .filter((user) => (user?.user_metadata?.role || 'candidate') === 'candidate')
        .map((user) => {
          const authId = user.id;
          const candidateId = user?.user_metadata?.userId || null;
          const emailKey = user.email?.trim().toLowerCase() || null;
          const userNameKey = user.user_metadata?.name ? user.user_metadata.name.trim().toLowerCase() : null;
          const resultByCandidate = candidateId ? latestResultsByCandidateId[candidateId] : null;
          const resultByAuth = latestResultsByAuthId[authId];
          const resultByEmail = emailKey ? latestResultsByEmail[emailKey] : null;
          const resultByUserName = userNameKey ? latestResultsByUserName[userNameKey] : null;

          const possibleMatches = [resultByCandidate, resultByAuth, resultByEmail, resultByUserName].filter(Boolean);
          const latestMatch = possibleMatches.reduce((best, current) => {
            if (!best) return current;
            const bestTime = new Date(best.created_at || 0).getTime();
            const currentTime = new Date(current.created_at || 0).getTime();
            return currentTime >= bestTime ? current : best;
          }, null);

          return {
            id: authId,
            email: user.email,
            role: user?.user_metadata?.role || 'candidate',
            user_id_custom: candidateId,
            latestResult: latestMatch?.scoreDisplay || null,
          };
        });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, candidates }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Failed to load candidates.' }));
    }
    return;
  }

  if (pathname === '/admin/results') {
    if (method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      if (!SUPABASE_SERVICE_ROLE_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Supabase service role key is not configured.' }));
        return;
      }

      const resultsResponse = await fetch(`${SUPABASE_URL}/rest/v1/test_results?select=id,created_at,total_score,max_score,percentage,answers,questions&order=created_at.desc&limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const resultsText = await resultsResponse.text();
      let resultsPayload = [];
      try {
        resultsPayload = resultsText ? JSON.parse(resultsText) : [];
      } catch {
        resultsPayload = [];
      }

      const results = (Array.isArray(resultsPayload) ? resultsPayload : []).map((row) => {
        const answersData = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
        const questionsData = typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions;
        const fallbackQuestions = answersData?.questions || null;
        const meta = answersData?.meta || {};
        return {
          id: row.id,
          created_at: row.created_at || null,
          total_score: row.total_score ?? null,
          max_score: row.max_score ?? null,
          percentage: row.percentage ?? null,
          authUserId: meta.authUserId || null,
          candidateUserId: meta.candidateUserId || null,
          userEmail: meta.userEmail || null,
          userName: meta.userName || null,
          rawAnswers: answersData?.answers ?? null,
          questions: questionsData ?? fallbackQuestions ?? null,
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, results }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Failed to load results.' }));
    }
    return;
  }

  if (pathname === '/admin/save-result') {
    if (method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Supabase service role key is not configured.' }));
          return;
        }

        const payload = JSON.parse(body || '{}');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/test_results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify([payload]),
        });

        const responseText = await response.text();
        let data = {};
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = { message: responseText };
        }

        if (!response.ok) {
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: data?.message || 'Failed to save result.' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, saved: data }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Unable to save result.' }));
      }
    });
    return;
  }

  if (pathname === '/generate') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const prompt = body || '';
      const seed = parseInt(query.seed, 10) || 0;
      const countMatch = prompt.match(/generate\s+(\d+)\s+unique/i);
      const count = countMatch ? Math.max(1, Math.min(12, parseInt(countMatch[1], 10))) : 1;

      const openAiText = await generateWithOpenAI(prompt);
      if (openAiText && openAiText.length > 20) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          text: openAiText,
          source: 'openai',
          generated_at: new Date().toISOString(),
        }));
        return;
      }

      let type = 'typing';
      if (prompt.toLowerCase().includes('sentence completion') || prompt.toLowerCase().includes('sentence|answer')) {
        type = 'sentence';
      } else if (prompt.toLowerCase().includes('listening')) {
        type = 'listening';
      } else if (prompt.toLowerCase().includes('speaking')) {
        type = 'speaking';
      } else if (prompt.toLowerCase().includes('dictation')) {
        type = 'dictation';
      } else if (prompt.toLowerCase().includes('passage reconstruction')) {
        type = 'passage';
      } else if (prompt.toLowerCase().includes('email writing') || prompt.toLowerCase().includes('email prompt')) {
        type = 'email';
      }

      const templates = textGenerationTemplates[type] || textGenerationTemplates.typing;
      const items = [];

      for (let i = 0; i < count; i++) {
        const index = Math.abs(seed + i) % templates.length;
        const template = templates[index];

        if (type === 'sentence') {
          const optionSets = [
            ['essential', 'optional', 'unnecessary', 'rare'],
            ['schedule', 'cancel', 'postpone', 'ignore'],
            ['bring', 'remove', 'delay', 'cancel'],
          ];
          const options = optionSets[i % optionSets.length];
          const sentence = template.replace(/\b(essential|schedule|bring)\b/i, '______');
          const answer = options[0];
          items.push(`${sentence}|${answer}|${options.join('|')}`);
        } else if (type === 'passage') {
          const sentences = template.split('.').map(s => s.trim()).filter(Boolean).slice(0, 4);
          const padded = [...sentences];
          while (padded.length < 4) padded.push('Continue the paragraph with a related sentence.');
          items.push(padded.join('|'));
        } else if (type === 'email') {
          const keywords = ['deadline', 'teamwork', 'quality', 'timeline'];
          items.push(`${template}|${keywords.join('|')}`);
        } else {
          items.push(template);
        }
      }

      const text = count > 1 ? items.join('###') : items[0];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        text,
        type,
        generated_at: new Date().toISOString(),
      }));
    });
    return;
  }

  const proxyToPollinations = async (targetBase, stripPrefix) => {
    const targetPath = req.url?.replace(stripPrefix, '') || '';
    const remoteUrl = `${targetBase}${targetPath}`;

    try {
      const headers = {
        'Accept': 'text/plain,*/*',
        'User-Agent': 'Learning-App/1.0',
      };
      if (POLLINATIONS_API_KEY) {
        headers.Authorization = `Bearer ${POLLINATIONS_API_KEY}`;
      }

      const proxyResponse = await fetch(remoteUrl, {
        method: 'GET',
        headers,
      });

      if (!proxyResponse.ok) {
        const text = await proxyResponse.text();
        res.writeHead(proxyResponse.status, { 'Content-Type': 'text/plain' });
        res.end(text || `Pollinations proxy returned ${proxyResponse.status}`);
        return;
      }

      const contentType = proxyResponse.headers.get('content-type') || 'application/octet-stream';
      const contentLength = proxyResponse.headers.get('content-length');
      const bodyBuffer = Buffer.from(await proxyResponse.arrayBuffer());

      const responseHeaders = {
        'Content-Type': contentType,
      };

      if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
      } else {
        responseHeaders['Content-Length'] = bodyBuffer.length;
      }

      res.writeHead(200, responseHeaders);
      res.end(bodyBuffer);
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Pollinations proxy error: ${error.message}`);
    }
  };

  if (pathname.startsWith('/api/pollinations/audio')) {
    await proxyToPollinations('https://audio.pollinations.ai', /^\/api\/pollinations\/audio/);
    return;
  }

  if (pathname.startsWith('/pollinations/audio')) {
    await proxyToPollinations('https://audio.pollinations.ai', /^\/pollinations\/audio/);
    return;
  }

  if (pathname.startsWith('/api/pollinations')) {
    await proxyToPollinations('https://text.pollinations.ai', /^\/api\/pollinations/);
    return;
  }

  if (pathname.startsWith('/pollinations')) {
    await proxyToPollinations('https://text.pollinations.ai', /^\/pollinations/);
    return;
  }

  if (serveFrontend(res, pathname)) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Text Generation API running on port ${PORT}`);
  console.log(`   POST /generate - Send text prompt to generate content`);
  console.log(`   GET /health - Check API status`);
});
