import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Survey from '@/models/Survey';
import SurveyResponse from '@/models/SurveyResponse';
import { headers } from 'next/headers';

// GET - Fetch survey analytics
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // In Next.js App Router, params is a Promise and must be awaited
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/HR/manager can view analytics
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const survey = await Survey.findById(id);
    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 });
    }

    // Fetch all responses for this survey
    const responses = await SurveyResponse.find({ surveyId: id });

    // Self-heal: if totalSent was never set (old data), fix it now
    if (survey.totalSent < responses.length) {
      survey.totalSent = responses.length;
      survey.totalResponses = responses.length;
      survey.responseRate = responses.length > 0 ? 100 : 0;
      await survey.save();
    }

    // Calculate analytics
    const analytics = {
      totalResponses: responses.length,
      totalSent: survey.totalSent,
      responseRate: survey.responseRate,
      questionAnalytics: survey.questions.map((question: any) => {
        const questionResponses = responses
          .map(r => r.answers.find((a: any) => a.questionId === question.id))
          .filter((a: any) => a !== undefined);

        const answeredCount = questionResponses.length;

        let analysis: any = {
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          answeredCount,
          skipCount: responses.length - answeredCount,
        };

        // Type-specific analysis
        if (question.type === 'rating') {
          const ratings = questionResponses
            .map(a => a.answer as number)
            .filter(r => typeof r === 'number');

          if (ratings.length > 0) {
            const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
            const distribution = [1, 2, 3, 4, 5].map(star => ({
              star,
              count: ratings.filter(r => r === star).length,
              percentage: (ratings.filter(r => r === star).length / ratings.length) * 100,
            }));

            analysis = {
              ...analysis,
              averageRating: average.toFixed(2),
              distribution,
            };
          }
        }

        if (['multiple_choice', 'dropdown'].includes(question.type)) {
          const options = question.options || [];
          const optionCounts = options.map((option: any) => ({
            option,
            count: questionResponses.filter((a: any) => a.answer === option).length,
            percentage: questionResponses.length > 0
              ? (questionResponses.filter((a: any) => a.answer === option).length / questionResponses.length) * 100
              : 0,
          }));

          analysis = {
            ...analysis,
            optionCounts,
          };
        }

        if (question.type === 'checkbox') {
          const options = question.options || [];
          const optionCounts = options.map((option: any) => ({
            option,
            count: questionResponses.filter((a: any) =>
              Array.isArray(a.answer) && a.answer.includes(option)
            ).length,
            percentage: questionResponses.length > 0
              ? (questionResponses.filter((a: any) => Array.isArray(a.answer) && a.answer.includes(option)).length / questionResponses.length) * 100
              : 0,
          }));

          analysis = {
            ...analysis,
            optionCounts,
          };
        }

        if (question.type === 'yes_no') {
          const yesCount = questionResponses.filter(a => a.answer === 'yes').length;
          const noCount = questionResponses.filter(a => a.answer === 'no').length;

          analysis = {
            ...analysis,
            yesCount,
            noCount,
            yesPercentage: questionResponses.length > 0 ? (yesCount / questionResponses.length) * 100 : 0,
            noPercentage: questionResponses.length > 0 ? (noCount / questionResponses.length) * 100 : 0,
          };
        }

        if (question.type === 'text') {
          const textAnswers = questionResponses
            .map(a => a.answer as string)
            .filter(a => typeof a === 'string' && a.trim().length > 0);

          analysis = {
            ...analysis,
            sampleResponses: textAnswers.slice(0, 10), // Show first 10 responses
            totalTextResponses: textAnswers.length,
          };
        }

        return analysis;
      }),

      // Response timeline
      responseTimeline: responses.reduce((acc: any[], response) => {
        const date = new Date(response.submittedAt).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ date, count: 1 });
        }
        return acc;
      }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),

      // Department breakdown (if not anonymous)
      departmentBreakdown: survey.isAnonymous ? null : responses.reduce((acc: any, response) => {
        const dept = response.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching survey analytics:', error);
    return NextResponse.json({ message: 'Error fetching survey analytics', error: error.message }, { status: 500 });
  }
}
