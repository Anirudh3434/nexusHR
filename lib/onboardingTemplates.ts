// Default templates used when creating an employee onboarding record.
// Kept as pure functions so they can be used from both API routes and tests.

export interface ChecklistTemplateItem {
  title: string;
  description?: string;
  category: 'HR' | 'IT' | 'Admin' | 'Manager' | 'Employee';
  assigneeRole: 'hr' | 'it' | 'admin' | 'manager' | 'employee';
  dueDays?: number; // days after joining date
}

export interface DocumentTemplateItem {
  title: string;
  category: 'identity' | 'bank' | 'education' | 'employment' | 'photo' | 'other';
  isRequired?: boolean;
}

// Default cross-department checklist generated for every new hire.
export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // HR
  { title: 'Create employee profile in HR system', description: 'Enter personal and job details into the HRM record.', category: 'HR', assigneeRole: 'hr', dueDays: 0 },
  { title: 'Verify submitted documents', description: 'Validate PAN, Aadhaar and bank proof against originals.', category: 'HR', assigneeRole: 'hr', dueDays: 3 },
  { title: 'Add bank details to payroll', description: 'Record salary account for payroll disbursement.', category: 'HR', assigneeRole: 'hr', dueDays: 3 },
  { title: 'Policy briefing & handbook', description: 'Share employee handbook, policies and code of conduct.', category: 'HR', assigneeRole: 'hr', dueDays: 0 },
  { title: 'Schedule orientation & team introduction', description: 'Arrange day-1 orientation and introduce to team.', category: 'HR', assigneeRole: 'hr', dueDays: 0 },
  { title: 'Enroll in attendance & leave systems', description: 'Assign shift and configure leave entitlements.', category: 'HR', assigneeRole: 'hr', dueDays: -1 },
  // IT
  { title: 'Create company email account', description: 'Provision email ID and mailbox.', category: 'IT', assigneeRole: 'it', dueDays: -1 },
  { title: 'Provide laptop / system with setup', description: 'Image device, install OS and connect to network.', category: 'IT', assigneeRole: 'it', dueDays: 0 },
  { title: 'Install required software & tools', description: 'Install dev tools, chat apps, and role-specific software.', category: 'IT', assigneeRole: 'it', dueDays: 1 },
  { title: 'Create accounts (GitHub, Jira, etc.)', description: 'Provision access to internal platforms.', category: 'IT', assigneeRole: 'it', dueDays: 1 },
  { title: 'Grant network & VPN access', description: 'Set up Wi-Fi, VPN and shared drives.', category: 'IT', assigneeRole: 'it', dueDays: 1 },
  // Admin
  { title: 'Allocate desk & seat', description: 'Assign seating location.', category: 'Admin', assigneeRole: 'admin', dueDays: -1 },
  { title: 'Stationery kit & access card', description: 'Prepare welcome kit and issue ID/access card.', category: 'Admin', assigneeRole: 'admin', dueDays: 0 },
  { title: 'Office tour & facilities briefing', description: 'Walk through office, safety and facilities.', category: 'Admin', assigneeRole: 'admin', dueDays: 0 },
  // Manager
  { title: 'Plan 30-60-90 day goals', description: 'Define first quarter expectations with the manager.', category: 'Manager', assigneeRole: 'manager', dueDays: 0 },
  { title: 'Introduce to project & team', description: 'Share project context and introduce to stakeholders.', category: 'Manager', assigneeRole: 'manager', dueDays: 1 },
  // Employee
  { title: 'Complete personal profile', description: 'Fill in personal details and emergency contacts.', category: 'Employee', assigneeRole: 'employee', dueDays: 1 },
  { title: 'Upload all required documents', description: 'Submit PAN, Aadhaar and bank proof online.', category: 'Employee', assigneeRole: 'employee', dueDays: 2 },
  { title: 'Read & acknowledge policies', description: 'Acknowledge handbook and policies.', category: 'Employee', assigneeRole: 'employee', dueDays: 3 },
];

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateItem[] = [
  { title: 'PAN Card', category: 'identity', isRequired: true },
  { title: 'Aadhaar Card', category: 'identity', isRequired: true },
  { title: 'Bank Account Proof (cancelled cheque / passbook)', category: 'bank', isRequired: true },
  { title: 'Passport Size Photograph', category: 'photo', isRequired: true },
  { title: 'Educational Certificates (highest degree)', category: 'education', isRequired: false },
  { title: 'Previous Employment - Experience Letter', category: 'employment', isRequired: false },
  { title: 'Previous Employment - Last Payslip', category: 'employment', isRequired: false },
  { title: 'Address Proof (utility bill / rental agreement)', category: 'identity', isRequired: false },
];

export function buildChecklistFromTemplate(joiningDate?: Date | string | null): any[] {
  const join = joiningDate ? new Date(joiningDate) : null;
  const validJoin = join && !isNaN(join.getTime()) ? join : null;
  return DEFAULT_CHECKLIST_TEMPLATE.map((item) => ({
    title: item.title,
    description: item.description || '',
    category: item.category,
    assigneeRole: item.assigneeRole,
    dueDate: validJoin && item.dueDays !== undefined ? new Date(validJoin.getTime() + item.dueDays * 24 * 60 * 60 * 1000) : undefined,
    status: 'pending',
    autoTask: true,
  }));
}

export function buildDocumentsFromTemplate(): any[] {
  return DEFAULT_DOCUMENT_TEMPLATE.map((doc) => ({
    title: doc.title,
    category: doc.category,
    isRequired: doc.isRequired !== false,
    status: 'pending',
  }));
}

function safeHtml(value: any): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(value: any): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Generate a printable offer letter as HTML. Used when HR generates the offer.
export function generateOfferLetterHTML(
  candidate: any,
  offer: any,
  company: any
): string {
  const companyName = safeHtml(company?.name || 'the Company');
  const address = safeHtml(company?.address || '');
  const name = safeHtml(candidate?.fullName || '');
  const position = safeHtml(candidate?.position || '');
  const department = safeHtml(candidate?.department || '');
  const joiningDate = formatDate(candidate?.joiningDate);
  const location = safeHtml(candidate?.workLocation || '');
  const reportingManager = safeHtml(candidate?.reportingManager || '');
  const employmentType = safeHtml(candidate?.employmentType || 'Full-time');
  const ctc = safeHtml(offer?.ctc || '');
  const probation = Number(offer?.probationMonths) || 3;
  const today = formatDate(new Date());

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 32px; background: #f3f4f6;">
  <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #2563eb; color: #ffffff; padding: 24px 32px;">
      <h1 style="margin: 0; font-size: 24px;">Offer of Employment</h1>
      <p style="margin: 4px 0 0; opacity: 0.9;">${companyName}</p>
    </div>
    <div style="padding: 32px;">
      <p>Date: ${today}</p>
      <p><strong>Dear ${name},</strong></p>
      <p>We are delighted to offer you the position of <strong>${position}</strong>${department ? ` in the <strong>${department}</strong> department` : ''} at ${companyName}. We were impressed with your background and are confident that you will be a valuable addition to our team.</p>

      <h3 style="margin: 24px 0 12px; color: #111827;">Offer Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #4b5563;">Position</td><td style="padding: 6px 0; font-weight: 600;">${position}</td></tr>
        ${department ? `<tr><td style="padding: 6px 0; color: #4b5563;">Department</td><td style="padding: 6px 0; font-weight: 600;">${department}</td></tr>` : ''}
        <tr><td style="padding: 6px 0; color: #4b5563;">Employment Type</td><td style="padding: 6px 0; font-weight: 600;">${employmentType}</td></tr>
        <tr><td style="padding: 6px 0; color: #4b5563;">Joining Date</td><td style="padding: 6px 0; font-weight: 600;">${joiningDate}</td></tr>
        ${location ? `<tr><td style="padding: 6px 0; color: #4b5563;">Work Location</td><td style="padding: 6px 0; font-weight: 600;">${location}</td></tr>` : ''}
        ${reportingManager ? `<tr><td style="padding: 6px 0; color: #4b5563;">Reporting Manager</td><td style="padding: 6px 0; font-weight: 600;">${reportingManager}</td></tr>` : ''}
        ${ctc ? `<tr><td style="padding: 6px 0; color: #4b5563;">Annual CTC</td><td style="padding: 6px 0; font-weight: 600;">${ctc}</td></tr>` : ''}
        <tr><td style="padding: 6px 0; color: #4b5563;">Probation Period</td><td style="padding: 6px 0; font-weight: 600;">${probation} month${probation === 1 ? '' : 's'}</td></tr>
      </table>

      <p style="margin-top: 24px;">Your compensation and benefits will be communicated separately in the compensation structure. This offer is subject to successful document verification and background checks.</p>

      <h3 style="margin: 24px 0 12px; color: #111827;">Acceptance</h3>
      <p>To accept this offer, please confirm your acceptance through the onboarding portal. Should you have any questions, feel free to reach out to the HR team.</p>

      <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <p style="margin: 0;">For ${companyName}</p>
        <p style="margin: 4px 0 0; color: #4b5563; font-size: 14px;">Human Resources Team</p>
        ${address ? `<p style="margin: 4px 0 0; color: #9ca3af; font-size: 13px;">${address}</p>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Derive overall onboarding status + progress from the current record state.
// Progress counts completed checklist tasks + verified required documents so a
// hire with documents still pending can never show 100%.
export function deriveOnboardingStatus(onboarding: any): { status: string; progress: number } {
  const offerStatus = onboarding.offerLetter?.status || 'draft';
  const checklist = onboarding.checklist || [];
  const documents = onboarding.documents || [];

  const taskTotal = checklist.length;
  const taskCompleted = checklist.filter((t: any) => t.status === 'completed').length;

  const requiredDocs = documents.filter((d: any) => d.isRequired !== false);
  const docTotal = requiredDocs.length;
  const docVerified = requiredDocs.filter((d: any) => d.status === 'verified').length;

  const total = taskTotal + docTotal;
  const completed = taskCompleted + docVerified;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const allTasksDone = taskTotal > 0 ? taskCompleted === taskTotal : true;
  const allDocsDone = docTotal > 0 ? docVerified === docTotal : true;

  let status = 'draft';
  if (offerStatus === 'declined') status = 'offer_declined';
  else if (offerStatus === 'draft') status = 'draft';
  else if (offerStatus === 'sent') status = 'offer_sent';
  else if (offerStatus === 'accepted') {
    if (allTasksDone && allDocsDone) status = 'completed';
    else if (taskCompleted > 0 || docVerified > 0) status = 'in_progress';
    else status = 'offer_accepted';
  }

  return { status, progress };
}
