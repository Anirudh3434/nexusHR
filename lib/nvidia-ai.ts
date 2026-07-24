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
