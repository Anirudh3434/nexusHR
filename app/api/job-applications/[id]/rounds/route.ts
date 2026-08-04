import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import Company from '@/models/Company';
import { canEditApi } from '@/lib/api-guard';
import {
  sendEmail,
  buildRoundScheduledEmail,
  buildRoundResultEmail,
  getEmailTemplateOverrides,
} from '@/lib/emailSender';

// Forward-only pipeline order (used to auto-advance status as rounds progress)
const PIPELINE = ['new', 'under_review', 'considered', 'shortlisted', 'interview', 'hired'];

function advanceTo(current: string, target: string): string {
  const ci = PIPELINE.indexOf(current);
  const ti = PIPELINE.indexOf(target);
  if (ci < 0 || ti < 0) return current;
  return ti > ci ? target : current;
}

function buildLoginUrl(origin: string, _companyCode: string): string {
  return `${origin.replace(/\/$/, '')}/candidate-login`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Best-effort notification to the candidate (does not require prior portal access)
async function notifyCandidate(opts: {
  application: any;
  companyId: string;
  origin: string;
  kind: 'scheduled' | 'result';
  round: any;
  result?: 'cleared' | 'failed';
}) {
  const { application } = opts;
  if (!application.fromEmail) return;
  try {
    const company = await Company.findById(opts.companyId);
    const loginUrl = buildLoginUrl(opts.origin, company?.code || '');
    const name = (application.candidateName || application.fromName || 'Candidate').split(' ')[0];
    const position = application.appliedPosition || '';
    const roundName = opts.round.name || opts.round.type || 'Interview round';

    if (opts.kind === 'scheduled') {
      const overrides = await getEmailTemplateOverrides(opts.companyId, 'round_scheduled');
      const mail = buildRoundScheduledEmail({
        name,
        companyName: company?.name || 'our Company',
        position,
        roundName,
        roundType: opts.round.type || '',
        scheduledDate: opts.round.scheduledDate ? formatDate(opts.round.scheduledDate) : '',
        scheduledTime: opts.round.scheduledTime || '',
        duration: opts.round.duration || '',
        interviewer: opts.round.interviewer || '',
        location: opts.round.location || '',
        meetingLink: opts.round.meetingLink || '',
        loginUrl,
      }, overrides);
      await sendEmail({
        companyId: opts.companyId,
        to: application.fromEmail,
        toName: application.candidateName || application.fromName,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
    } else if (opts.kind === 'result' && opts.result) {
      const overrides = await getEmailTemplateOverrides(opts.companyId, 'round_result');
      const mail = buildRoundResultEmail({
        name,
        companyName: company?.name || 'our Company',
        position,
        roundName,
        result: opts.result,
        loginUrl,
      }, overrides);
      await sendEmail({
        companyId: opts.companyId,
        to: application.fromEmail,
        toName: application.candidateName || application.fromName,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
    }
  } catch (error) {
    console.error('Round notification email failed:', error);
  }
}

// POST /api/job-applications/[id]/rounds - add an interview round
// body: { name, type, scheduledDate }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = canEditApi(req, 'recruitment');
  if (!guard.authorized) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const application = await JobApplication.findOne({
      _id: id,
      companyId: guard.user.companyId,
    });
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    const round = {
      name: body.name || `Round ${(application.interviewRounds?.length || 0) + 1}`,
      type: body.type || 'technical',
      scheduledDate: body.scheduledDate || null,
      scheduledTime: body.scheduledTime || '',
      duration: body.duration || '',
      interviewer: body.interviewer || '',
      location: body.location || '',
      meetingLink: body.meetingLink || '',
      status: 'scheduled',
      result: 'pending',
      feedback: '',
    };

    application.interviewRounds.push(round);

    // Auto-advance: starting interviews moves the applicant into the interview stage
    application.status = advanceTo(application.status, 'interview');
    await application.save();

    const savedRound = application.interviewRounds[application.interviewRounds.length - 1];

    // Notify the candidate (best-effort, never fails the request)
    await notifyCandidate({
      application,
      companyId: guard.user.companyId,
      origin: req.url ? new URL(req.url).origin : '',
      kind: 'scheduled',
      round: savedRound,
    });

    return NextResponse.json({ round: savedRound, status: application.status }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error adding round', error: error.message }, { status: 500 });
  }
}

// PATCH /api/job-applications/[id]/rounds - update a round (result/status/feedback/date)
// body: { roundId, status?, result?, feedback?, scheduledDate?, name? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = canEditApi(req, 'recruitment');
  if (!guard.authorized) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const application = await JobApplication.findOne({
      _id: id,
      companyId: guard.user.companyId,
    });
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    const round = (application.interviewRounds || []).find(
      (r: any) => r._id.toString() === body.roundId
    );
    if (!round) {
      return NextResponse.json({ message: 'Round not found' }, { status: 404 });
    }

    if (body.name !== undefined) round.name = body.name;
    if (body.type !== undefined) round.type = body.type;
    if (body.status !== undefined) round.status = body.status;
    if (body.scheduledDate !== undefined) round.scheduledDate = body.scheduledDate || null;
    if (body.scheduledTime !== undefined) round.scheduledTime = body.scheduledTime;
    if (body.duration !== undefined) round.duration = body.duration;
    if (body.interviewer !== undefined) round.interviewer = body.interviewer;
    if (body.location !== undefined) round.location = body.location;
    if (body.meetingLink !== undefined) round.meetingLink = body.meetingLink;
    if (body.feedback !== undefined) round.feedback = body.feedback;

    let resultChanged: 'cleared' | 'failed' | null = null;
    // Recording a decision on the round (cleared/failed) stamps when it was decided
    if (body.result !== undefined) {
      round.result = body.result;
      if (body.result === 'cleared' || body.result === 'failed') {
        round.decidedAt = new Date();
        round.decidedBy = { _id: guard.user.id, name: guard.user.name || 'HR' };
        resultChanged = body.result;
      } else {
        round.decidedAt = null;
        round.decidedBy = undefined;
      }
      if (body.result === 'cleared' || body.result === 'failed') {
        round.status = 'completed';
      }
    }

    // Auto-advance: clearing a round moves the applicant into the shortlist stage
    if (resultChanged === 'cleared') {
      application.status = advanceTo(application.status, 'shortlisted');
    }
    await application.save();

    // Notify the candidate about a decided result (best-effort)
    if (resultChanged) {
      await notifyCandidate({
        application,
        companyId: guard.user.companyId,
        origin: req.url ? new URL(req.url).origin : '',
        kind: 'result',
        round,
        result: resultChanged,
      });
    }

    return NextResponse.json({ round, status: application.status });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating round', error: error.message }, { status: 500 });
  }
}

// DELETE /api/job-applications/[id]/rounds?roundId=xxx - remove a round
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = canEditApi(req, 'recruitment');
  if (!guard.authorized) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const roundId = new URL(req.url).searchParams.get('roundId');

    const application = await JobApplication.findOneAndUpdate(
      { _id: id, companyId: guard.user.companyId },
      { $pull: { interviewRounds: { _id: roundId } } },
      { new: true }
    );
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Round removed', application });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error removing round', error: error.message }, { status: 500 });
  }
}
