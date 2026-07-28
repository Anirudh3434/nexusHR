import axios from 'axios';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
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
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not set');
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        model: options.model || 'nvidia/llama-3.1-405b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.2,
        top_p: options.top_p || 0.7,
        max_tokens: options.max_tokens || 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
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
  if (!NVIDIA_API_KEY) {
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
        model: 'nvidia/llama-3.1-405b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
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

// Simple keyword-based search for knowledge base (Phase 1)
// Can be upgraded to vector embeddings in Phase 2
const searchKnowledgeBase = async (
  question: string,
  companyId: string,
  knowledgeArticles: KnowledgeArticle[]
): Promise<{ articles: KnowledgeArticle[]; scores: number[] }> => {
  const keywords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  const scoredArticles = knowledgeArticles.map(article => {
    let score = 0;
    const content = article.content.toLowerCase();
    const title = article.title.toLowerCase();
    const articleKeywords = article.keywords.map(k => k.toLowerCase());
    
    // Keyword matching
    keywords.forEach(keyword => {
      if (title.includes(keyword)) score += 3; // Title matches are worth more
      if (content.includes(keyword)) score += 1;
      if (articleKeywords.some(k => k.includes(keyword))) score += 2;
    });
    
    // Priority boost
    score += article.priority * 0.5;
    
    return { article, score };
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
    handbook: ['handbook', 'policy', 'rule', 'guideline', 'conduct', 'code'],
    procedures: ['process', 'procedure', 'how to', 'how do i', 'request', 'submit', 'apply'],
    payroll: ['payroll', 'salary', 'paycheck', 'wage', 'payment', 'deduction', 'tax'],
    recruitment: ['hiring', 'recruit', 'job', 'position', 'interview', 'offer', 'onboard'],
    performance: ['performance', 'review', 'evaluation', 'feedback', 'kpi', 'goal'],
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
  if (!NVIDIA_API_KEY) {
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
  const systemPrompt = `You are an expert HR Assistant for a company. Your role is to answer employee questions about HR policies, procedures, benefits, and general HR-related topics using the provided knowledge base articles.

Guidelines:
- Answer questions clearly and concisely
- Use the provided knowledge base articles as your primary source of information
- If the answer is not in the articles, say so politely and suggest contacting HR directly
- Be friendly and professional in your tone
- When referencing specific policies, mention the article title
- For complex procedures, break them down into numbered steps
- If multiple articles are relevant, synthesize the information

Context from Knowledge Base:
${context || 'No relevant articles found in the knowledge base.'}

Current User Question: ${input.question}

Provide a helpful, accurate response based on the knowledge base. If you use information from specific articles, mention them by title.`;

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(input.history || []),
      { role: 'user', content: input.question }
    ];

    const response = await axios.post(
      API_URL,
      {
        model: 'nvidia/llama-3.1-405b-instruct',
        messages,
        temperature: 0.3,
        top_p: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
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
    response = `Based on our HR policies, here's what I found regarding your question:\n\n${topArticle.content}\n\nFor more details, please refer to the full policy document or contact HR directly.`;
  } else {
    response = `I couldn't find specific information about your question in our knowledge base. For detailed assistance with "${input.question}", please contact your HR representative directly.`;
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
