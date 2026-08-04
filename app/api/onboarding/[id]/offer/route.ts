import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Onboarding from '@/models/Onboarding';
import Company from '@/models/Company';
import EmailConfig from '@/models/EmailConfig';
import { headers } from 'next/headers';
import { generateOfferLetterHTML, deriveOnboardingStatus } from '@/lib/onboardingTemplates';
import { sendEmail, buildOfferEmail, buildOfferResponseNotification, getEmailTemplateOverrides } from '@/lib/emailSender';

const STAFF_ROLES = ['super_admin', 'admin', 'hr'];

function getOrigin(req: Request): string {
  const host = req.headers.get('host') || 'localhost:3000';
  const origin = req.headers.get('origin') || `http://${host}`;
  return origin === 'null' ? `http://${host}` : origin;
}

// GET - Fetch offer letter (markdown-safe text only)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    if (userRole === 'employee') {
      const isOwner = record.employeeId && record.employeeId.toString() === userId;
      if (!isOwner) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ offerLetter: record.offerLetter });
  } catch (error: any) {
    console.error('Error fetching offer letter:', error);
    return NextResponse.json({ message: 'Error fetching offer letter', error: error.message }, { status: 500 });
  }
}

// POST - Generate offer letter from candidate data
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userEmail = headersList.get('x-user-email') || '';
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });

    const body = await req.json();
    const { ctc, probationMonths } = body;

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    if (ctc !== undefined) record.offerLetter.ctc = ctc;
    if (probationMonths !== undefined) record.offerLetter.probationMonths = Number(probationMonths) || 3;

    const company = await Company.findById(record.companyId);
    record.offerLetter.content = generateOfferLetterHTML(record.candidate, record.offerLetter, company);
    record.offerLetter.generatedBy = { _id: userId, name: userName, email: userEmail || '' };
    record.offerLetter.generatedAt = new Date();

    record.lastUpdatedBy = { _id: userId, name: userName, email: userEmail || '' };
    record.activity.push({ userId, userName, action: 'offer_generated', details: 'Offer letter generated' });

    const derived = deriveOnboardingStatus(record);
    record.status = derived.status;
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Offer letter generated', onboarding: record });
  } catch (error: any) {
    console.error('Error generating offer letter:', error);
    return NextResponse.json({ message: 'Error generating offer letter', error: error.message }, { status: 500 });
  }
}

// PATCH - Send offer (staff), or accept/decline (employee)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, responseNotes } = body;

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    if (action === 'send') {
      if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      if (!record.offerLetter.content) {
        return NextResponse.json({ message: 'Generate the offer letter before sending' }, { status: 400 });
      }
      record.offerLetter.status = 'sent';
      record.offerLetter.sentAt = new Date();
      record.activity.push({ userId, userName, action: 'offer_sent', details: 'Offer letter sent to candidate' });

      // Email the offer letter to the candidate (best-effort)
      try {
        const company = await Company.findById(record.companyId);
        const overrides = await getEmailTemplateOverrides(record.companyId, 'offer_letter');
        const mail = buildOfferEmail({
          name: (record.candidate.fullName || 'Candidate').split(' ')[0],
          companyName: company?.name || 'the Company',
          position: record.candidate.position || '',
          offerHtml: record.offerLetter.content,
        }, overrides);
        await sendEmail({
          companyId: record.companyId,
          to: record.candidate.email,
          toName: record.candidate.fullName,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      } catch (error: any) {
        console.error('Offer email failed:', error);
      }
    } else if (action === 'accept' || action === 'decline') {
      if (userRole === 'employee') {
        const isOwner = record.employeeId && record.employeeId.toString() === userId;
        if (!isOwner) return NextResponse.json({ message: 'You can only respond to your own offer' }, { status: 403 });
      } else if (!STAFF_ROLES.includes(userRole)) {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      record.offerLetter.status = action === 'accept' ? 'accepted' : 'declined';
      record.offerLetter.respondedAt = new Date();
      record.offerLetter.responseNotes = responseNotes || '';
      record.activity.push({ userId, userName, action: action === 'accept' ? 'offer_accepted' : 'offer_declined', details: `Offer ${action === 'accept' ? 'accepted' : 'declined'}${responseNotes ? `: ${responseNotes}` : ''}` });

      // Notify HR on the candidate's response (best-effort)
      try {
        const company = await Company.findById(record.companyId);
        const emailConfig = await EmailConfig.findOne({ companyId: record.companyId }).lean();
        const hrEmail = emailConfig?.careerEmail || company?.email;
        if (hrEmail) {
          const origin = getOrigin(req);
          const loginUrl = `${origin.replace(/\/$/, '')}/onboarding/${record._id}`;
          const overrides = await getEmailTemplateOverrides(record.companyId, 'offer_response');
          const mail = buildOfferResponseNotification({
            candidateName: record.candidate.fullName,
            companyName: company?.name || 'the Company',
            position: record.candidate.position || '',
            accepted: action === 'accept',
            responseNotes: responseNotes || '',
            loginUrl,
          }, overrides);
          await sendEmail({
            companyId: record.companyId,
            to: hrEmail,
            toName: 'HR Team',
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          });
        }
      } catch (error: any) {
        console.error('Offer response notification email failed:', error);
      }
    } else {
      return NextResponse.json({ message: 'Invalid action. Use send, accept or decline.' }, { status: 400 });
    }

    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };

    const derived = deriveOnboardingStatus(record);
    record.status = derived.status;
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Offer letter updated', onboarding: record });
  } catch (error: any) {
    console.error('Error updating offer letter:', error);
    return NextResponse.json({ message: 'Error updating offer letter', error: error.message }, { status: 500 });
  }
}
