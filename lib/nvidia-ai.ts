import axios from 'axios';

const getNvidiaApiKey = () => process.env.NVIDIA_API_KEY;
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Chat provider for Nexi (both endpoints speak the OpenAI chat-completions
 * dialect). Groq is preferred when configured, NVIDIA NIM is the fallback.
 */
export interface ChatProvider {
  name: 'groq' | 'nvidia';
  url: string;
  apiKey: string;
  model: string;
}

export const getHrChatProvider = (): ChatProvider | null => {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    return {
      name: 'groq',
      url: GROQ_API_URL,
      apiKey: groqKey,
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    };
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
  if (nvidiaKey) {
    return {
      name: 'nvidia',
      url: API_URL,
      apiKey: nvidiaKey,
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
    };
  }

  return null;
};

export interface PerformanceInput {
  employeeName: string;
  designation: string;
  lateMinutes: number;
  workingHours: number;
  overtimeHours: number;
  status: string;
}

export interface AnalysisResult {
  rating: number;
  summary: string;
  merits: string[];
  demerits: string[];
  suggestions: string[];
}

export const callNvidiaAI = async (prompt: string, options: any = {}): Promise<string> => {
  const apiKey = getNvidiaApiKey();
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not set');
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        model: options.model || 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.2,
        top_p: options.top_p || 0.7,
        max_tokens: options.max_tokens || 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('NVIDIA AI General Error:', error.response?.data || error.message);
    throw error;
  }
};

export const analyzePerformance = async (data: PerformanceInput): Promise<AnalysisResult> => {
  const apiKey = getNvidiaApiKey();
  if (!apiKey) {
    console.warn('NVIDIA_API_KEY is not set. Returning mock analysis.');
    return generateMockAnalysis(data);
  }

  const prompt = `
    You are an expert HR Performance Analyst. Analyze the following daily attendance data for an employee:
    - Name: ${data.employeeName}
    - Designation: ${data.designation}
    - Late Arrival: ${data.lateMinutes} minutes
    - Actual Working Hours: ${data.workingHours}h
    - Overtime: ${data.overtimeHours}h
    - Status: ${data.status}

    Provide a JSON response with:
    1. rating: A score from 1 to 10.
    2. summary: A 1-sentence executive summary.
    3. merits: Array of 1-2 positive points.
    4. demerits: Array of 1-2 areas for improvement.
    5. suggestions: Array of 2 actionable advice for tomorrow.

    Output ONLY valid JSON.
  `;

  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content.replace(/```json|```/g, ''));
  } catch (error: any) {
    console.error('NVIDIA AI Error:', error.response?.data || error.message);
    return generateMockAnalysis(data);
  }
};

const generateMockAnalysis = (data: PerformanceInput): AnalysisResult => {
  const isGood = data.lateMinutes === 0 && data.workingHours >= 8;
  return {
    rating: isGood ? 9 : 5,
    summary: `${data.employeeName} demonstrated ${isGood ? 'excellent' : 'inconsistent'} punctuality today.`,
    merits: isGood ? ['Perfect on-time arrival', 'Full shift completion'] : ['Completed work sessions'],
    demerits: isGood ? [] : [data.lateMinutes > 0 ? `Arrived ${data.lateMinutes}m late` : 'Short working hours'],
    suggestions: [
      'Maintain the current momentum.',
      'Consider preparing 15 minutes earlier to avoid late arrival.'
    ]
  };
};

// HR Knowledge Base Query Interfaces
export interface KnowledgeArticle {
  _id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  priority: number;
}

export interface HRQueryResult {
  response: string;
  sources: {
    articleId: string;
    title: string;
    relevance: number;
  }[];
  category: string;
  /** How the answer was produced — useful for debugging the chat UI/server logs. */
  mode?: 'llm+tools' | 'llm' | 'mock';
}

export interface HrBotToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface HrBotToolResult {
  text: string;
  isError?: boolean;
}

/**
 * Live-data bridge (MCP tools backed by MongoDB). The HR chat route supplies an
 * implementation so this module stays free of MCP/DB imports.
 */
export interface HrBotToolkit {
  definitions: HrBotToolDefinition[];
  call: (name: string, args: Record<string, unknown>) => Promise<HrBotToolResult>;
  close?: () => Promise<void>;
}

export interface HRQueryInput {
  question: string;
  companyId: string;
  userId?: string;
  userName?: string;
  history?: Array<{ role: string; content: string }>;
  toolkit?: HrBotToolkit;
}

// Stop words to ignore during search matching
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by',
  'with', 'as', 'do', 'what', 'who', 'how', 'when', 'where', 'why', 'can', 'will', 'my',
  'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those', 'are', 'was',
  'were', 'been', 'being', 'have', 'has', 'had', 'having', 'take', 'took', 'get', 'got',
  'make', 'some', 'any', 'about', 'from', 'company'
]);

// Simple keyword-based search for knowledge base (Phase 1)
// Can be upgraded to vector embeddings in Phase 2
const searchKnowledgeBase = async (
  question: string,
  companyId: string,
  knowledgeArticles: KnowledgeArticle[]
): Promise<{ articles: KnowledgeArticle[]; scores: number[] }> => {
  const cleanQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const rawKeywords = cleanQuestion.split(/\s+/).filter(word => word.length >= 3);
  const keywords = rawKeywords.filter(w => !STOP_WORDS.has(w));
  
  // If all words were stop words, fall back to non-trivial words
  const searchTerms = keywords.length > 0 ? keywords : rawKeywords;

  const scoredArticles = knowledgeArticles.map(article => {
    let matchScore = 0;
    const content = article.content.toLowerCase();
    const title = article.title.toLowerCase();
    const articleKeywords = article.keywords.map(k => k.toLowerCase());
    
    // Keyword matching
    searchTerms.forEach(term => {
      if (title.includes(term)) matchScore += 5; // Title matches are worth more
      if (articleKeywords.some(k => k.includes(term) || term.includes(k))) matchScore += 4;
      if (content.includes(term)) matchScore += 1;
    });
    
    // Priority boost is ONLY applied if there is an actual keyword match
    const finalScore = matchScore > 0 ? matchScore + (article.priority || 0) * 0.5 : 0;
    
    return { article, score: finalScore };
  });
  
  // Sort by score and filter out zero-score articles
  const filtered = scoredArticles.filter(item => item.score > 0);
  filtered.sort((a, b) => b.score - a.score);
  
  // Return top 5 articles
  const topArticles = filtered.slice(0, 5);
  
  return {
    articles: topArticles.map(item => item.article),
    scores: topArticles.map(item => item.score)
  };
};

// Classify the question into HR categories
const classifyQuestion = (question: string): string => {
  const lowerQ = question.toLowerCase();
  
  const categoryKeywords = {
    pto: ['pto', 'leave', 'vacation', 'time off', 'holiday', 'sick', 'absence'],
    holidays: ['holiday', 'festival', 'break', 'closure'],
    benefits: ['benefit', 'insurance', 'health', 'medical', 'dental', 'vision', '401k', 'retirement'],
    handbook: ['handbook', 'policy', 'rule', 'guideline', 'conduct', 'code', 'security'],
    procedures: ['process', 'procedure', 'how to', 'how do i', 'request', 'submit', 'apply', 'repair', 'broken', 'damage', 'ticket', 'asset', 'hardware', 'laptop'],
    payroll: ['payroll', 'salary', 'paycheck', 'wage', 'payment', 'deduction', 'tax'],
    recruitment: ['hiring', 'recruit', 'job', 'position', 'interview', 'offer', 'onboard', 'referral'],
    performance: ['performance', 'review', 'evaluation', 'feedback', 'kpi', 'goal', 'appraisal'],
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerQ.includes(keyword))) {
      return category;
    }
  }
  
  return 'general';
};

export const queryHRKnowledge = async (
  input: HRQueryInput,
  knowledgeArticles: KnowledgeArticle[]
): Promise<HRQueryResult> => {
  const provider = getHrChatProvider();
  if (!provider) {
    console.error(
      '[Nexi] No AI key configured (GROQ_API_KEY or NVIDIA_API_KEY) — falling back to ' +
        'knowledge-base answers only (no AI reasoning, no live MCP/MongoDB data). ' +
        'Set one in .env.local or the deployment env.'
    );
    return generateMockHRResponse(input, knowledgeArticles);
  }

  // Search for relevant articles
  const { articles, scores } = await searchKnowledgeBase(input.question, input.companyId, knowledgeArticles);
  
  // Classify the question
  const category = classifyQuestion(input.question);
  
  // Build context from relevant articles
  const context = articles.map((article, index) => 
    `Article ${index + 1} (Title: ${article.title}):\n${article.content}\n`
  ).join('\n');
  
  // Build system prompt
  const hasTools = Boolean(input.toolkit && input.toolkit.definitions.length > 0);

  const toolGuidance = hasTools
    ? `
Live Data Tools (MongoDB via NexusHR MCP):
- You can call NexusHR tools to read the current employee's live data: profile, leave requests, attendance records, tasks, colleague directory, and company notices.
- ALWAYS call the relevant tool before answering anything about the user's own records ("my leaves", "how many PTO days do I have", "did I clock in", "my tasks", "my attendance"). Never guess or invent these values.
- Tool results are authoritative. Summarize them in natural language; do not dump raw JSON.
- If a tool reports a permission error, say plainly that you cannot access that data for their role and point them to HR.
- Only the tools provided to you exist. Do not claim to have updated, approved, or deleted anything from chat.
`
    : '';

  const systemPrompt = `You are Nexi, the AI HR and Workplace Assistant built into NexusHR. You help employees with HR policies, IT asset guidelines, procedures, benefits, and general workplace topics.

Identity:
- Your name is Nexi. Always introduce yourself as Nexi if asked who you are or if this is the first message.
- You are a friendly, expert HR companion — not a generic chatbot, and never an AI that pretends to be human. If asked whether you are an AI, say so honestly.
- The platform you live in is called NexusHR. Do not invent other product names, companies, or brands.

Guidelines:
- Answer questions clearly, accurately, and empathetically, using plain language.
- If relevant knowledge base articles are provided below, synthesize and cite the information by article title.
- If the knowledge base does not directly answer the question or only partially covers it, provide helpful and standard workplace guidance while advising the employee to report the matter to HR or IT Support (e.g. support@company.com).
- For accident/damage incidents (e.g., damaged or broken laptop/equipment): reassure the employee, advise them to immediately report to the IT Helpdesk, explain standard protocols (accidental damage vs negligence assessment, temporary loaner device issuance), and provide clear step-by-step guidance.
- Never invent policy numbers, deadlines, or entitlements that are not in the context. If unsure, say so and point the employee to the right human contact.
- Use short paragraphs and bullet points for readability. Keep answers focused and under ~200 words unless the question needs more detail.
- Maintain a friendly, supportive, and professional tone. Do not use phrases like "As an AI language model".
${toolGuidance}
Current User: ${input.userName ? `${input.userName} (address them by their first name when it feels natural)` : 'an employee'}

Context from Knowledge Base:
${context || 'No specific knowledge base articles found for this query.'}`;

  try {
    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPrompt },
      ...(input.history || []),
      { role: 'user', content: input.question }
    ];

    let aiResponse: string;
    let mode: HRQueryResult['mode'] = 'llm';
    if (hasTools) {
      try {
        aiResponse = await runToolLoop(provider, messages, input.toolkit!);
        mode = 'llm+tools';
      } catch (toolError: any) {
        // Model/provider may reject tool calling — degrade to a plain answer.
        console.warn(
          'Nexi tool-calling unavailable, answering without live data:',
          toolError.response?.data || toolError.message
        );
        aiResponse = await completeChat(provider, messages);
      }
    } else {
      aiResponse = await completeChat(provider, messages);
    }
    
    // Calculate relevance scores (normalize to 0-1)
    const maxScore = Math.max(...scores, 1);
    const sources = articles.map((article, index) => ({
      articleId: article._id,
      title: article.title,
      relevance: scores[index] / maxScore
    }));

    return {
      response: aiResponse,
      sources,
      category,
      mode
    };
  } catch (error: any) {
    console.error('NVIDIA AI HR Query Error:', error.response?.data || error.message);
    return await generateMockHRResponse(input, knowledgeArticles);
  }
};

const MAX_TOOL_ROUNDS = 4;

const chatHeaders = (apiKey: string) => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

/** Single completion without tools (also the fallback path). */
const completeChat = async (
  provider: ChatProvider,
  messages: Array<Record<string, unknown>>
): Promise<string> => {
  const response = await axios.post(
    provider.url,
    {
      model: provider.model,
      messages,
      temperature: 0.3,
      top_p: 0.7,
      max_tokens: 1024,
    },
    { headers: chatHeaders(provider.apiKey), timeout: 15000 }
  );

  return response.data.choices?.[0]?.message?.content || '';
};

/**
 * Agentic loop: ask the model, execute any MCP tool calls it requests against
 * MongoDB, feed the results back, and repeat until it produces a final answer.
 */
const runToolLoop = async (
  provider: ChatProvider,
  messages: Array<Record<string, unknown>>,
  toolkit: HrBotToolkit
): Promise<string> => {
  const tools = toolkit.definitions.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const convo: Array<Record<string, unknown>> = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await axios.post(
      provider.url,
      {
        model: provider.model,
        messages: convo,
        tools,
        tool_choice: 'auto',
        temperature: 0.3,
        top_p: 0.7,
        max_tokens: 1024,
      },
      { headers: chatHeaders(provider.apiKey), timeout: 25000 }
    );

    const message = response.data.choices?.[0]?.message;
    const toolCalls: Array<{
      id: string;
      function?: { name?: string; arguments?: string };
    }> = message?.tool_calls || [];

    if (toolCalls.length === 0) {
      return message?.content || '';
    }

    convo.push({
      role: 'assistant',
      content: message?.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const name = call.function?.name || '';
      let args: Record<string, unknown> = {};
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        /* Model produced malformed JSON — let the tool report the problem. */
      }

      const result = await toolkit.call(name, args);

      convo.push({
        role: 'tool',
        tool_call_id: call.id,
        name,
        content: result.isError ? `Error: ${result.text}` : result.text,
      });
    }
  }

  // Budget exhausted — force a final answer from what we have.
  const finalResponse = await axios.post(
    provider.url,
    {
      model: provider.model,
      messages: [
        ...convo,
        {
          role: 'user',
          content: 'Using the tool results above, give the employee your final answer now.',
        },
      ],
      temperature: 0.3,
      top_p: 0.7,
      max_tokens: 1024,
    },
    { headers: chatHeaders(provider.apiKey), timeout: 20000 }
  );

  return finalResponse.data.choices?.[0]?.message?.content || '';
};

/**
 * Questions that can only be answered from live records (MongoDB), not from a
 * policy article. Used to keep the offline fallback honest.
 */
const LIVE_DATA_PATTERNS: RegExp[] = [
  /\bhow many\b/i,
  /\bhow much (leave|pto|balance)\b/i,
  /\bwho('s| is| are)\b/i,
  /\bmy (leave|leaves|attendance|pto|task|tasks|balance|profile)\b/i,
  /\bclock(ed)? ?(in|out)\b/i,
  /\b(check|arrive|arrived|late)\w*\b.*\b(today|yesterday)\b/i,
  /\b(today|yesterday)\b.*\b(late|absent|attendance)\b/i,
];

/** Minimum keyword score before a policy article is considered a real match. */
const MIN_RELIABLE_SCORE = 8;

const generateMockHRResponse = async (input: HRQueryInput, knowledgeArticles: KnowledgeArticle[]): Promise<HRQueryResult> => {
  const category = classifyQuestion(input.question);
  const { articles, scores } = await searchKnowledgeBase(input.question, input.companyId, knowledgeArticles);

  const bestScore = scores[0] || 0;
  const topArticle = articles[0];
  const isReliable = Boolean(topArticle) && bestScore >= MIN_RELIABLE_SCORE;
  const looksLikeLiveData = LIVE_DATA_PATTERNS.some((pattern) => pattern.test(input.question));

  let response: string;
  if (looksLikeLiveData) {
    // Never dress up a policy article as an answer to a records question.
    response = `Hi, I'm Nexi 👋 — my live-data connection is unavailable right now, so I can't look up real records (attendance, late arrivals, leave balances or task status) for "${input.question}".\n\nYou can see the latest numbers under Attendance / Leaves in NexusHR, or ask HR or IT Support (support@company.com).`;
  } else if (isReliable) {
    response = `Hi, I'm Nexi 👋 — based on our company policies (${topArticle.title}):\n\n${topArticle.content}\n\nFor additional support or specific inquiries, please reach out to HR or IT Support directly.`;
  } else {
    response = `Hi, I'm Nexi 👋 — I couldn't find a specific policy article directly matching your inquiry in the knowledge base. Please reach out to your HR representative or IT Helpdesk (support@company.com) for prompt assistance with "${input.question}".`;
  }

  const maxScore = Math.max(...scores, 1);
  const sources = (isReliable ? articles : []).map((article: KnowledgeArticle, index: number) => ({
    articleId: article._id,
    title: article.title,
    relevance: scores[index] / maxScore
  }));

  return {
    response,
    sources,
    category,
    mode: 'mock'
  };
};
