import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient, getUser, onAuthStateChange, signOut, signUpWithEmail } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import ResultSection from './components/ResultSection.jsx';
import TestSection from './components/TestSection.jsx';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }

  return import.meta.env.VITE_API_BASE_URL || 'https://versant-learning-app.loca.lt';
};

const API_BASE_URL = getApiBaseUrl();

const sectionOrder = [
  'typing',
  'sentenceCompletion',
  'listening',
  'speaking',
  'dictation',
  'passageReconstruction',
  'emailWriting',
];

const sectionNames = {
  typing: 'Typing',
  sentenceCompletion: 'Sentence Completion',
  listening: 'Listening Comprehension',
  speaking: 'Speaking Assessment',
  dictation: 'Dictation',
  passageReconstruction: 'Passage Reconstruction',
  emailWriting: 'Email Writing',
};

const sectionIcons = {
  typing: '⌨️',
  sentenceCompletion: '📝',
  listening: '🎧',
  speaking: '🎤',
  dictation: '📝',
  passageReconstruction: '🧩',
  emailWriting: '✉️',
};

const QUESTIONS_PER_SECTION = 6;

const fallbackBank = {
  typing: [
    'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and is commonly used for typing practice.',
    'Customer service excellence requires patience, active listening, and the ability to resolve issues efficiently and professionally.',
    'In today’s digital workplace, remote collaboration tools have become essential for team productivity and seamless communication.',
  ],
  sentenceCompletion: [
    {
      sentence: 'Effective communication is ______ for team success.',
      answer: 'essential',
      options: ['essential', 'optional', 'unnecessary', 'rare'],
    },
    {
      sentence: 'The manager will ______ the meeting at 3 PM.',
      answer: 'schedule',
      options: ['schedule', 'cancel', 'postpone', 'ignore'],
    },
    {
      sentence: 'The new software update will ______ significant improvements.',
      answer: 'bring',
      options: ['bring', 'remove', 'delay', 'cancel'],
    },
  ],
  listening: [
    'The company announced a new remote work policy starting next month. Employees can choose to work from home or the office. The policy aims to improve work-life balance.',
    'The quarterly earnings report shows a 15% increase in revenue compared to last year. The growth is driven by strong sales in the Asia-Pacific region.',
    'The company is launching a new sustainability initiative to reduce carbon emissions by 30% over the next five years.',
  ],
  speaking: [
    'Describe your ideal workplace environment and explain why it would be productive.',
    'Discuss the importance of teamwork in achieving business goals.',
    'Explain how technology has changed the way we work in the last 10 years.',
  ],
  dictation: [
    'The team achieved all their quarterly targets ahead of schedule.',
    'Customer feedback is essential for improving product quality and service delivery.',
    'The new training program will help employees develop their professional skills.',
  ],
  passageReconstruction: [
    {
      sentences: [
        'First, the team defined the project scope.',
        'Then, they assigned tasks to each member.',
        'After that, they began the implementation phase.',
        'Finally, the project was completed successfully.',
      ],
      correctOrder: [0, 1, 2, 3],
    },
    {
      sentences: [
        'Initially, they conducted market research.',
        'Next, they developed a new product line.',
        'Finally, they launched a marketing campaign.',
        'Eventually, the company achieved record profits.',
      ],
      correctOrder: [0, 1, 2, 3],
    },
  ],
  emailWriting: [
    {
      prompt: 'Write a professional email to your team about meeting an important deadline.',
      keywords: ['deadline', 'teamwork', 'quality', 'timeline'],
    },
    {
      prompt: 'Write an email to a client apologizing for a delayed delivery and offering a solution.',
      keywords: ['apology', 'delay', 'solution', 'timeline'],
    },
  ],
};

const initialQuestions = {
  typing: [],
  sentenceCompletion: [],
  listening: [],
  speaking: [],
  dictation: [],
  passageReconstruction: [],
  emailWriting: [],
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const repeatItems = (items, count) => Array.from({ length: count }, (_, idx) => items[idx % items.length]);

const generateFallbackQuestionSet = () => {
  const typing = repeatItems(fallbackBank.typing, QUESTIONS_PER_SECTION).map((text, idx) => ({
    id: `typing_fallback_${idx + 1}`,
    text,
    timeLimit: 30,
  }));

  const sentenceCompletion = repeatItems(fallbackBank.sentenceCompletion, QUESTIONS_PER_SECTION).map((item, idx) => ({
    ...item,
    id: `sentenceCompletion_fallback_${idx + 1}`,
  }));

  const listening = repeatItems(fallbackBank.listening, QUESTIONS_PER_SECTION).map((audioText, idx) => ({
    id: `listening_fallback_${idx + 1}`,
    audioText,
    questions: [
      { id: `lq1_${idx + 1}`, question: 'What is the main topic of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correct: 0 },
      { id: `lq2_${idx + 1}`, question: 'What is the key message of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correct: 0 },
    ],
  }));

  const speaking = repeatItems(fallbackBank.speaking, QUESTIONS_PER_SECTION).map((prompt, idx) => ({
    id: `speaking_fallback_${idx + 1}`,
    prompt,
    preparationTime: 15,
    speakingTime: 30,
  }));

  const dictation = repeatItems(fallbackBank.dictation, QUESTIONS_PER_SECTION).map((text, idx) => ({
    id: `dictation_fallback_${idx + 1}`,
    text,
  }));

  const passageReconstruction = repeatItems(fallbackBank.passageReconstruction, QUESTIONS_PER_SECTION).map((item, idx) => ({
    ...item,
    id: `passageReconstruction_fallback_${idx + 1}`,
  }));

  const emailWriting = repeatItems(fallbackBank.emailWriting, QUESTIONS_PER_SECTION).map((item, idx) => ({
    ...item,
    id: `emailWriting_fallback_${idx + 1}`,
  }));

  return {
    typing,
    sentenceCompletion,
    listening,
    speaking,
    dictation,
    passageReconstruction,
    emailWriting,
  };
};

function App() {
  const [questions, setQuestions] = useState(initialQuestions);
  const [answers, setAnswers] = useState({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Preparing questions...');
  const [activeView, setActiveView] = useState('login');
  const [supabaseStatus, setSupabaseStatus] = useState('disconnected');
  const [supabaseError, setSupabaseError] = useState(null);
  const [user, setUser] = useState(undefined);
  const [userProfile, setUserProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [resultsList, setResultsList] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState(null);
  const [showRegistrationPage, setShowRegistrationPage] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const section = sectionOrder[currentSectionIndex];
  const currentQuestions = questions[section] || [];
  const currentQuestion = currentQuestions[currentQuestionIndex] || null;

  const progress = useMemo(() => {
    const total = sectionOrder.reduce((sum, key) => sum + (questions[key]?.length || 0), 0);
    const answered = Object.keys(answers).length;
    return total ? Math.round((answered / total) * 100) : 0;
  }, [answers, questions]);

  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    checkSupabaseConnection();

    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('test');
    const storedTestMode = typeof localStorage !== 'undefined' ? localStorage.getItem('testMode') === 'true' : false;
    const testModeEnabled = testParam === 'true' || (testParam === null && storedTestMode);

    if (testParam === 'false' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('testMode');
    }

    if (testModeEnabled) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('testMode', 'true');
      }
      setIsTestMode(true);
      setUser({ id: 'test-user', email: 'test@example.com', test_mode: true });
      setActiveView('dashboard');
      console.log('✅ Test mode enabled - AI API testing active');
    }
  }, []);

  useEffect(() => {
    // Skip auth setup if in test mode
    if (isTestMode) {
      return;
    }
    
    let sub = null;
    (async () => {
      try {
        const u = await getUser();
        setUser(u);
      } catch (e) {
        console.warn('getUser failed:', e);
      }
    })();

    sub = onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
    });

    return () => {
      try {
        sub?.data?.subscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, [isTestMode]);

  useEffect(() => {
    if (!user || isTestMode) {
      setUserProfile(null);
      return;
    }

    (async () => {
      const profile = await loadUserProfile(user.id);
      if (profile) {
        setUserProfile(profile);
      } else {
        setUserProfile({
          id: user.id,
          email: user.email,
          role: 'candidate',
        });
      }
    })();
  }, [user, isTestMode]);

  useEffect(() => {
    const isAdminUser = userProfile?.role === 'admin' || user?.email === 'admin@example.com';
    if (isAdminUser) {
      fetchCandidates();
      fetchResultsList();
    }
  }, [userProfile, user]);

  useEffect(() => {
    const isAdminUser = userProfile?.role === 'admin' || user?.email === 'admin@example.com';
    if (activeView === 'dashboard' && isAdminUser) {
      fetchCandidates();
      fetchResultsList();
    }
  }, [activeView, userProfile, user]);

  useEffect(() => {
    if (user === undefined && !isTestMode) return;
    if (isTestMode) {
      setActiveView('dashboard');
      return;
    }
    setActiveView(user ? 'dashboard' : 'login');
  }, [user, isTestMode]);

  // Auto-start test in test mode
  useEffect(() => {
    if (isTestMode && activeView === 'dashboard') {
      const timer = setTimeout(() => {
        handleStart();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTestMode, activeView]);

  useEffect(() => {
    if (activeView !== 'test' || !currentQuestion) {
      clearInterval(timerRef.current);
      return;
    }

    if (timer <= 0) {
      handleSkip();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [activeView, currentQuestion, timer]);

  const updateSupabaseStatus = (connected, errorMessage = null) => {
    setSupabaseStatus(connected ? 'connected' : 'disconnected');
    setSupabaseError(errorMessage);
  };

  const checkSupabaseConnection = async () => {
    if (!supabaseClient) {
      updateSupabaseStatus(false, 'Supabase client failed to initialize.');
      return false;
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('Supabase auth health check error:', error);
        updateSupabaseStatus(false, error.message || 'Supabase auth check failed.');
        return false;
      }

      // No active session is normal for an unauthenticated browser client.
      // If the auth endpoint responded successfully, the anon key is valid.
      updateSupabaseStatus(true, null);
      return true;
    } catch (err) {
      console.error('Supabase health check failed:', err);
      updateSupabaseStatus(false, err?.message || 'Unexpected Supabase error.');
      return false;
    }
  };

  const handleRetrySupabaseConnection = async () => {
    setSupabaseError(null);
    await checkSupabaseConnection();
  };

  const loadUserProfile = async (user, fallbackRole = 'candidate') => {
    if (!user || !user.id || !supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id,email,role')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        return {
          ...data,
          user_id_custom: user.user_metadata?.userId,
        };
      }

      if (error && error.code !== 'PGRST116') {
        console.warn('Failed to load user profile:', error.message || error);
      }
    } catch (err) {
      console.warn('Failed to load user profile:', err);
    }

    const metadataRole = user.user_metadata?.role || user.role || fallbackRole;
    return {
      id: user.id,
      email: user.email,
      role: metadataRole,
      user_id_custom: user.user_metadata?.userId,
    };
  };

  const fetchCandidates = async () => {
    setCandidateLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/candidates`);
      const payload = await response.json().catch(() => ({}));

      if (response.ok && Array.isArray(payload?.candidates)) {
        setCandidates(payload.candidates);
      } else {
        setCandidates([]);
        console.warn('Failed to load candidates:', payload?.error || response.statusText);
      }
    } catch (err) {
      console.warn('Failed to load candidates:', err);
      setCandidates([]);
    } finally {
      setCandidateLoading(false);
    }
  };

  const fetchResultsList = async () => {
    setResultsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/results`);
      const payload = await response.json().catch(() => ({}));

      if (response.ok && Array.isArray(payload?.results)) {
        setResultsList(payload.results);
      } else {
        setResultsList([]);
        console.warn('Failed to load results:', payload?.error || response.statusText);
      }
    } catch (err) {
      console.warn('Failed to load results:', err);
      setResultsList([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleRegisterCandidate = async (userId, email, password) => {
    if (!userId || !email || !password) {
      return { error: 'User ID, email, and password are required.' };
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch(`${API_BASE_URL}/admin/register-candidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId.trim(), email: normalizedEmail, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        return { error: payload?.error || 'Candidate registration failed.' };
      }

      const createdUserId = payload?.user?.id || payload?.userId || payload?.id;
      if (!createdUserId) {
        return { error: 'Candidate registration failed. No user ID returned.' };
      }

      await fetchCandidates();
      return { message: 'Candidate registered successfully and can sign in immediately.', userId: createdUserId };
    } catch (err) {
      return { error: err.message || String(err) };
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setUserProfile(null);
      setActiveView('login');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('testMode');
        window.location.reload();
      }
    } catch (err) {
      console.warn('Sign out failed:', err);
      setUser(null);
      setUserProfile(null);
      setActiveView('login');
    }
  };

  const queryAI = async (prompt) => {
    const randomSeed = Math.floor(Math.random() * 999999);
    const timestamp = Date.now();
    const enhancedPrompt = `${prompt}\n\nIMPORTANT: Generate DIFFERENT content each time. Use this unique seed: ${randomSeed}. Timestamp: ${timestamp}. Do NOT repeat previous content.`;

    const pollinationsApiKey = import.meta.env.VITE_POLLINATIONS_API_KEY || '';
    const pollinationsTextProxyBase = import.meta.env.VITE_POLLINATIONS_TEXT_PROXY_URL || `${API_BASE_URL}/api/pollinations`;
    const proxyUrl = `${pollinationsTextProxyBase}/${encodeURIComponent(enhancedPrompt)}?seed=${randomSeed}&t=${timestamp}`;
    
    const defaultHeaders = {
      'Accept': 'text/plain',
      'User-Agent': 'Learning-App/1.0'
    };

    // Try local API server FIRST (most reliable)
    try {
      const localResponse = await fetch(`${API_BASE_URL}/generate?seed=${randomSeed}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: enhancedPrompt,
        signal: AbortSignal.timeout(3000)
      });

      if (localResponse.ok) {
        const data = await localResponse.json();
        if (data.text && data.text.length > 10) {
          console.log('✅ Local API succeeded');
          return data.text;
        }
      } else {
        console.warn(`⚠️ Local API status: ${localResponse.status} ${localResponse.statusText}`);
      }
    } catch (localError) {
      console.warn('⚠️ Local API error:', localError.message);
    }

    // Try Pollinations via proxy with headers
    try {
      const headers = { ...defaultHeaders };
      if (pollinationsApiKey) {
        headers['Authorization'] = `Bearer ${pollinationsApiKey}`;
      }
      
      const proxyResponse = await fetch(proxyUrl, { 
        signal: AbortSignal.timeout(5000),
        headers
      });
      
      if (proxyResponse.ok) {
        const text = await proxyResponse.text();
        if (text && text.length > 10) {
          console.log('✅ Pollinations proxy API succeeded');
          return text;
        }
      } else {
        console.warn(`⚠️ Pollinations proxy status: ${proxyResponse.status} ${proxyResponse.statusText}`);
      }
    } catch (proxyError) {
      console.warn('⚠️ Pollinations proxy failed:', proxyError.message);
    }

    // Final fallback: mock content
    const mockResponses = {
      'Generate a short English passage': 'The morning sun cast long shadows across the quiet street. Birds sang their daily songs while people began their daily routines. It was a perfect day to start something new.',
      'Create a sentence completion exercise': 'Despite the challenging circumstances, the team managed to achieve their goals with determination and teamwork.',
      'Write a brief listening exercise': 'Welcome to the English listening practice. Today we will focus on common phrases and vocabulary used in everyday conversations.',
      'Create a speaking prompt': 'Tell me about your favorite hobby and why you enjoy doing it. Try to speak for at least 60 seconds.',
      'Write a dictation exercise': 'The ability to communicate effectively is one of the most important skills in today\'s professional world.',
      'Create a passage reconstruction exercise': 'Technology has transformed how we learn and work in the twenty-first century.',
      'Write a professional email exercise': 'Subject: Project Update\n\nDear Team,\n\nI hope this email finds you well. I wanted to provide a brief update on our current project status and next steps.'
    };
    
    for (const [key, value] of Object.entries(mockResponses)) {
      if (prompt.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(prompt.toLowerCase())) {
        console.log('📋 Using mock fallback for:', key);
        return value;
      }
    }
    
    console.log('📋 Using generic fallback');
    return 'Please read the following passage carefully and complete the exercise.';
  };

  const queryVoiceAudio = async (text) => {
    const randomSeed = Math.floor(Math.random() * 999999);
    const timestamp = Date.now();
    const payload = `${text}\n\nUse this unique seed: ${randomSeed}. Timestamp: ${timestamp}. Return an MP3 audio file or URL.`;

    const pollinationsAudioProxyBase = import.meta.env.VITE_POLLINATIONS_AUDIO_PROXY_URL || '';
    if (!pollinationsAudioProxyBase) {
      console.warn('Pollinations audio proxy is not configured; using browser TTS fallback.');
      return null;
    }

    const proxyUrl = `${pollinationsAudioProxyBase}/${encodeURIComponent(payload)}?seed=${randomSeed}&t=${timestamp}`;

    try {
      const proxyResponse = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (!proxyResponse.ok) {
        console.warn(`⚠️ Pollinations voice proxy status: ${proxyResponse.status} ${proxyResponse.statusText}`);
        return null;
      }

      const contentType = proxyResponse.headers.get('content-type') || '';
      if (!contentType.includes('audio') && !contentType.includes('mpeg') && !contentType.includes('mp3')) {
        const bodyText = await proxyResponse.text();
        console.warn('Pollinations voice proxy returned non-audio response:', contentType, bodyText.slice(0, 200));
        return null;
      }

      const blob = await proxyResponse.blob();
      if (blob.size > 100) {
        const audioUrl = URL.createObjectURL(blob);
        console.log('✅ Pollinations voice proxy succeeded');
        return audioUrl;
      }
    } catch (proxyError) {
      console.warn('Pollinations voice proxy failed:', proxyError.message);
    }

    return null;
  };

  const parseItems = (text) => {
    return text
      .split(/###|\n\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const parseSentenceCompletion = (text) => {
    return parseItems(text)
      .map((item) => {
        const parts = item.split('|').map((part) => part.trim());
        if (parts.length >= 5) {
          return {
            sentence: parts[0],
            answer: parts[1],
            options: parts.slice(2, 6),
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const parsePassageReconstruction = (text) => {
    return parseItems(text)
      .map((item) => {
        const parts = item.split('|').map((part) => part.trim());
        if (parts.length >= 4) {
          return {
            sentences: parts.slice(0, 4),
            correctOrder: [0, 1, 2, 3],
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const parseEmailPrompts = (text) => {
    return parseItems(text)
      .map((item) => {
        const parts = item.split('|').map((part) => part.trim());
        if (parts.length >= 5) {
          return {
            prompt: parts[0],
            keywords: parts.slice(1, 5),
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const buildQuestionSet = async () => {
    setIsLoading(true);
    setLoadingStep('Generating typing passages...');

    try {
      const typingResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE 30-40 word passages about business, technology, or workplace communication for typing practice. Return only the passages separated by ###.`
      );
      const typingTexts = parseItems(typingResponse || '').slice(0, QUESTIONS_PER_SECTION);
      const typingQuestions = typingTexts.length === QUESTIONS_PER_SECTION
        ? typingTexts.map((text, idx) => ({ id: `typing_${idx + 1}`, text, timeLimit: 30 }))
        : repeatItems(fallbackBank.typing, QUESTIONS_PER_SECTION).map((text, idx) => ({ id: `typing_fallback_${idx + 1}`, text, timeLimit: 30 }));

      setLoadingStep('Creating sentence completion questions...');
      const scResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE sentence completion questions. Return each as: sentence|answer|option1|option2|option3|option4 and separate each question with ###.`
      );
      const sentenceCompletion = parseSentenceCompletion(scResponse || '');
      const sentenceCompletionQuestions = sentenceCompletion.length === QUESTIONS_PER_SECTION
        ? sentenceCompletion.map((item, idx) => ({ ...item, id: `sentenceCompletion_${idx + 1}` }))
        : repeatItems(fallbackBank.sentenceCompletion, QUESTIONS_PER_SECTION).map((item, idx) => ({ ...item, id: `sentenceCompletion_fallback_${idx + 1}` }));

      setLoadingStep('Generating listening passages...');
      const listeningResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE 3-4 sentence paragraphs about business topics for listening comprehension. Return only the paragraphs separated by ###.`
      );
      const listeningTexts = parseItems(listeningResponse || '').slice(0, QUESTIONS_PER_SECTION);
      const listeningQuestions = listeningTexts.length === QUESTIONS_PER_SECTION
        ? listeningTexts.map((text, idx) => ({
            id: `listening_${idx + 1}`,
            audioText: text,
            questions: [
              { id: `lq1_${idx + 1}`, question: 'What is the main topic of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'] },
              { id: `lq2_${idx + 1}`, question: 'What is the key message of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'] },
            ],
          }))
        : repeatItems(fallbackBank.listening, QUESTIONS_PER_SECTION).map((text, idx) => ({
            id: `listening_fallback_${idx + 1}`,
            audioText: text,
            questions: [
              { id: `lq1_${idx + 1}`, question: 'What is the main topic of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'] },
              { id: `lq2_${idx + 1}`, question: 'What is the key message of the passage?', options: ['Option A', 'Option B', 'Option C', 'Option D'] },
            ],
          }));

      setLoadingStep('Creating speaking topics...');
      const speakingResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE speaking prompts for an English proficiency test. Return only the prompts separated by ###.`
      );
      const speakingPrompts = parseItems(speakingResponse || '').slice(0, QUESTIONS_PER_SECTION);
      const speakingQuestions = speakingPrompts.length === QUESTIONS_PER_SECTION
        ? speakingPrompts.map((prompt, idx) => ({ id: `speaking_${idx + 1}`, prompt, preparationTime: 15, speakingTime: 30 }))
        : repeatItems(fallbackBank.speaking, QUESTIONS_PER_SECTION).map((prompt, idx) => ({ id: `speaking_fallback_${idx + 1}`, prompt, preparationTime: 15, speakingTime: 30 }));

      setLoadingStep('Generating dictation prompts...');
      const dictationResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE 15-20 word sentences about workplace productivity for dictation practice. Return only the sentences separated by ###.`
      );
      const dictationTexts = parseItems(dictationResponse || '').slice(0, QUESTIONS_PER_SECTION);
      const dictationQuestions = dictationTexts.length === QUESTIONS_PER_SECTION
        ? dictationTexts.map((text, idx) => ({ id: `dictation_${idx + 1}`, text }))
        : repeatItems(fallbackBank.dictation, QUESTIONS_PER_SECTION).map((text, idx) => ({ id: `dictation_fallback_${idx + 1}`, text }));

      setLoadingStep('Creating passage reconstruction questions...');
      const passageResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE passage reconstruction sets. Return each set as sentence1|sentence2|sentence3|sentence4 and separate sets with ###.`
      );
      const passageSets = parsePassageReconstruction(passageResponse || '');
      const passageQuestions = passageSets.length === QUESTIONS_PER_SECTION
        ? passageSets.map((item, idx) => ({ ...item, id: `passageReconstruction_${idx + 1}` }))
        : repeatItems(fallbackBank.passageReconstruction, QUESTIONS_PER_SECTION).map((item, idx) => ({ ...item, id: `passageReconstruction_fallback_${idx + 1}` }));

      setLoadingStep('Generating email prompts...');
      const emailResponse = await queryAI(
        `Generate ${QUESTIONS_PER_SECTION} UNIQUE email writing prompts for professional scenarios. Return each as prompt|keyword1|keyword2|keyword3|keyword4 and separate prompts with ###.`
      );
      const emailPrompts = parseEmailPrompts(emailResponse || '');
      const emailQuestions = emailPrompts.length === QUESTIONS_PER_SECTION
        ? emailPrompts.map((item, idx) => ({ ...item, id: `emailWriting_${idx + 1}` }))
        : repeatItems(fallbackBank.emailWriting, QUESTIONS_PER_SECTION).map((item, idx) => ({ ...item, id: `emailWriting_fallback_${idx + 1}` }));

      const newQuestions = {
        typing: typingQuestions,
        sentenceCompletion: sentenceCompletionQuestions,
        listening: listeningQuestions,
        speaking: speakingQuestions,
        dictation: dictationQuestions,
        passageReconstruction: passageQuestions,
        emailWriting: emailQuestions,
      };

      setQuestions(newQuestions);
      setAnswers({});
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setActiveView('test');
      setTimer(30);
    } catch (err) {
      console.error('AI generation failed:', err);
      setQuestions(generateFallbackQuestionSet());
      setActiveView('test');
      setAnswers({});
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setTimer(30);
    } finally {
      setIsLoading(false);
      setLoadingStep('Ready');
    }
  };

  const handleStart = () => {
    buildQuestionSet();
  };

  const cleanupAudioUrl = () => {
    if (voiceAudioUrl) {
      URL.revokeObjectURL(voiceAudioUrl);
      setVoiceAudioUrl(null);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      if (audioRef.current instanceof HTMLAudioElement) {
        audioRef.current.pause();
        audioRef.current.src = '';
      } else {
        window.speechSynthesis.cancel();
      }
      audioRef.current = null;
    }
    cleanupAudioUrl();
    setAudioPlaying(false);
  };

  const playTextToSpeech = (text) => {
    if (!window.speechSynthesis) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onstart = () => {
      audioRef.current = utterance;
      setAudioPlaying(true);
    };
    utterance.onend = () => {
      setAudioPlaying(false);
      audioRef.current = null;
    };
    window.speechSynthesis.speak(utterance);
  };

  const playAudio = async (text) => {
    stopAudio();
    if (!text) return;

    const voiceUrl = await queryVoiceAudio(text);
    if (voiceUrl) {
      const audioElement = new Audio(voiceUrl);
      audioElement.onended = () => {
        setAudioPlaying(false);
        audioRef.current = null;
      };
      audioElement.onplay = () => {
        audioRef.current = audioElement;
        setAudioPlaying(true);
      };
      audioElement.onerror = () => {
        console.warn('Voice audio playback failed, falling back to TTS');
        setAudioPlaying(false);
        audioRef.current = null;
        cleanupAudioUrl();
        playTextToSpeech(text);
      };
      setVoiceAudioUrl(voiceUrl);
      await audioElement.play().catch((playError) => {
        console.warn('Audio play failed:', playError);
        setAudioPlaying(false);
        audioRef.current = null;
        cleanupAudioUrl();
        playTextToSpeech(text);
      });
      return;
    }

    playTextToSpeech(text);
  };

  const saveAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSkip = () => {
    stopAudio();
    setTimer(30);
    const sectionQuestions = questions[section] || [];
    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else if (currentSectionIndex < sectionOrder.length - 1) {
      setCurrentSectionIndex((idx) => idx + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  };

  const normalizeText = (text) => {
    if (typeof text !== 'string') return '';
    return text
      .trim()
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+/g, ' ');
  };

  const hasKeywordMatch = (text, keywords = []) => {
    if (!text || !keywords?.length) return false;
    const normalized = normalizeText(text);
    const found = keywords.reduce((count, keyword) => {
      if (!keyword) return count;
      const token = normalizeText(keyword);
      return normalized.includes(token) ? count + 1 : count;
    }, 0);
    return found >= Math.ceil((keywords.length || 1) / 2);
  };

  const handleSubmit = async () => {
    stopAudio();
    setActiveView('results');
    setTimer(0);

    const sectionResults = sectionOrder.map((key) => {
      const total = questions[key]?.length || 0;
      let completed = 0;

      for (let i = 0; i < total; i++) {
        const qKey = `${key}_${i}`;
        const answer = answers[qKey];
        const questionDef = (questions[key] || [])[i] || {};

        const isCompleted = (() => {
          if (key === 'typing' || key === 'dictation') {
            if (typeof answer !== 'string' || !answer.trim()) return false;
            const expected = questionDef?.text || '';
            return normalizeText(answer) === normalizeText(expected);
          }

          if (key === 'sentenceCompletion') {
            if (questionDef?.answer) {
              return answer === questionDef.answer;
            }
            return !!answer;
          }

          if (key === 'listening') {
            if (!answer || typeof answer !== 'object') return false;
            const parts = questionDef.questions || [];
            if (!parts.length) return false;
            for (let j = 0; j < parts.length; j++) {
              const selected = answer[j];
              if (selected == null) return false;
              const correct = parts[j].correct;
              if (correct !== undefined && correct !== null) {
                const correctOption = typeof correct === 'number' ? parts[j].options?.[correct] : correct;
                if (correctOption != null && selected !== correctOption) return false;
              }
            }
            return true;
          }

          if (key === 'passageReconstruction') {
            if (!Array.isArray(answer) || !answer.length || !Array.isArray(questionDef.correctOrder)) return false;
            return answer.length === questionDef.correctOrder.length && answer.every((value, idx) => value === questionDef.correctOrder[idx]);
          }

          if (key === 'speaking') {
            if (typeof answer !== 'string') return false;
            const text = answer.trim();
            const words = text.split(/\s+/).filter(Boolean).length;
            return text.length >= 20 && words >= 10;
          }

          if (key === 'emailWriting') {
            if (typeof answer !== 'string' || !answer.trim()) return false;
            return hasKeywordMatch(answer, questionDef.keywords || []);
          }

          if (Array.isArray(answer)) return answer.length > 0;
          if (typeof answer === 'object' && answer !== null) return Object.keys(answer).length > 0;
          return !!answer;
        })();

        if (isCompleted) completed += 1;
      }

      const percentage = total ? Math.round((completed / total) * 100) : 0;
      return {
        key,
        name: sectionNames[key],
        total,
        completed,
        percentage,
      };
    });

    const totalQuestions = sectionResults.reduce((sum, section) => sum + section.total, 0);
    const totalCompleted = sectionResults.reduce((sum, section) => sum + section.completed, 0);
    const overallPercentage = totalQuestions ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

    const result = {
      totalQuestions,
      total_score: totalCompleted,
      completed: totalCompleted,
      percentage: overallPercentage,
      sections: sectionResults,
      sectionResults,
      userId: userProfile?.user_id_custom || user?.id,
      authUserId: user?.id,
      userEmail: userProfile?.email || user?.email,
      userName: user?.email?.split('@')[0] || 'Candidate',
    };

    setResults(result);
    if (supabaseStatus === 'connected') {
      await saveResultsToSupabase(result);
    }
  };

  const saveResultsToSupabase = async (resultData) => {
    const payload = {
      created_at: new Date().toISOString(),
      total_score: resultData.total_score || resultData.completed || 0,
      max_score: resultData.totalQuestions,
      percentage: resultData.percentage,
      sections: resultData.sections,
      answers: {
        meta: {
          authUserId: resultData.authUserId || null,
          candidateUserId: resultData.userId || null,
          userEmail: resultData.userEmail || null,
          userName: resultData.userName || null,
        },
        answers,
      },
      questions,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/admin/save-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const payloadResponse = await response.json().catch(() => ({}));
      const saved = response.ok && !payloadResponse?.error;
      if (!saved) {
        console.error('Save result API error:', payloadResponse?.error || response.statusText);
        return false;
      }

      console.log('Result saved to DB via backend');

      const isAdminUser = userProfile?.role === 'admin' || user?.email === 'admin@example.com';
      if (isAdminUser) {
        fetchCandidates();
        fetchResultsList();
      }

      return true;
    } catch (err) {
      console.error('Result save failed:', err);
      return false;
    }
  };

  const handleRestart = () => {
    setActiveView('dashboard');
    setResults(null);
    setQuestions(initialQuestions);
    setAnswers({});
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setTimer(30);
  };

  return (
    <div id="app">
      <div className="header">
        <div className="header-top">
          <h1>🧠 AI-Powered Versant Practice <span className="ai-badge">🤖 AI</span></h1>
          <div className={`supabase-status ${supabaseStatus}`}>
            {supabaseStatus === 'connected' ? '🟢 Supabase connected' : '🔴 Supabase disconnected'}
          </div>
          {(user && !isTestMode) && (
            <div className="supabase-user">
              Signed in as <strong>{user.email || user.id}</strong>
              <button type="button" className="btn-link" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          )}
          {supabaseError && (
            <div className="supabase-error">
              <strong>Connection error:</strong> {supabaseError}
              <button type="button" onClick={handleRetrySupabaseConnection}>
                Retry
              </button>
            </div>
          )}
        </div>
        <p>Auto-advance timer • Audio auto-stops on skip</p>
        
      </div>

      {!user && !isTestMode && <Login onSuccess={(u) => { setUser(u); setActiveView('dashboard'); }} />}
      {(user || isTestMode) && activeView === 'dashboard' && (() => {
        const isAdminUser = userProfile?.role === 'admin' || user?.email === 'admin@example.com';
        return isAdminUser ? (
          <AdminDashboard
            onStart={handleStart}
            onRegisterCandidate={handleRegisterCandidate}
            candidates={candidates}
            candidateLoading={candidateLoading}
            results={resultsList}
            resultsLoading={resultsLoading}
            showRegistrationPage={showRegistrationPage}
            onOpenRegistration={() => setShowRegistrationPage(true)}
            onBackToDashboard={() => setShowRegistrationPage(false)}
          />
        ) : (
          <Dashboard onStart={handleStart} />
        );
      })()}
      {activeView === 'test' && currentQuestion && (
        <TestSection
          section={section}
          sectionName={sectionNames[section]}
          sectionIcon={sectionIcons[section]}
          question={currentQuestion}
          sectionIndex={currentSectionIndex}
          questionIndex={currentQuestionIndex}
          totalQuestions={currentQuestions.length}
          timer={timer}
          progress={progress}
          onAnswer={saveAnswer}
          onSkip={handleSkip}
          onSubmit={handleSubmit}
          onPlayAudio={playAudio}
          audioPlaying={audioPlaying}
          answers={answers}
        />
      )}
      {activeView === 'results' && <ResultSection results={results} onRestart={handleRestart} />}
      <LoadingOverlay isActive={isLoading} step={loadingStep} />
    </div>
  );
}

export default App;
