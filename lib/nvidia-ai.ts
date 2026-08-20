import axios from 'axios';

const getNvidiaApiKey = () => process.env.NVIDIA_API_KEY;
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

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
}

export interface HRQueryInput {
  question: string;
  companyId: string;
  userId?: string;
  history?: Array<{ role: string; content: string }>;
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
  const apiKey = getNvidiaApiKey();
  if (!apiKey) {
    console.warn('NVIDIA_API_KEY is not set. Returning mock response.');
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
  const systemPrompt = `You are an expert HR and Workplace Assistant for a company. Your role is to answer employee questions about HR policies, IT asset guidelines, procedures, benefits, and general workplace topics.

Guidelines:
- Answer questions clearly, accurately, and empathetically.
- If relevant knowledge base articles are provided below, synthesize and cite the information by article title.
- If the knowledge base does not directly answer the question or only partially covers it, provide helpful and standard workplace guidance while advising the employee to report the matter to HR or IT Support (e.g. support@company.com).
- For accident/damage incidents (e.g., damaged or broken laptop/equipment): reassure the employee, advise them to immediately report to the IT Helpdesk, explain standard protocols (accidental damage vs negligence assessment, temporary loaner device issuance), and provide clear step-by-step guidance.
- Maintain a friendly, supportive, and professional tone.

Context from Knowledge Base:
${context || 'No specific knowledge base articles found for this query.'}

Current User Question: ${input.question}`;

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(input.history || []),
      { role: 'user', content: input.question }
    ];

    const response = await axios.post(
      API_URL,
      {
        model: 'meta/llama-3.1-70b-instruct',
        messages,
        temperature: 0.3,
        top_p: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 7000,
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
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
      category
    };
  } catch (error: any) {
    console.error('NVIDIA AI HR Query Error:', error.response?.data || error.message);
    return await generateMockHRResponse(input, knowledgeArticles);
  }
};

const generateMockHRResponse = async (input: HRQueryInput, knowledgeArticles: KnowledgeArticle[]): Promise<HRQueryResult> => {
  const category = classifyQuestion(input.question);
  const { articles, scores } = await searchKnowledgeBase(input.question, input.companyId, knowledgeArticles);
  
  let response = '';
  
  if (articles.length > 0) {
    const topArticle = articles[0];
    response = `Based on our company policies (${topArticle.title}):\n\n${topArticle.content}\n\nFor additional support or specific inquiries, please reach out to HR or IT Support directly.`;
  } else {
    response = `I couldn't find a specific policy article directly matching your inquiry in the knowledge base. Please reach out to your HR representative or IT Helpdesk (support@company.com) for prompt assistance with "${input.question}".`;
  }
  
  const maxScore = Math.max(...scores, 1);
  const sources = articles.map((article: KnowledgeArticle, index: number) => ({
    articleId: article._id,
    title: article.title,
    relevance: scores[index] / maxScore
  }));

  return {
    response,
    sources,
    category
  };
};
