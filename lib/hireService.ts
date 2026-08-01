import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import JobApplication from '../models/JobApplication';
import JobPosition from '../models/JobPosition';
import User from '../models/User';
import Company from '../models/Company';
import Onboarding from '../models/Onboarding';
import {
  buildChecklistFromTemplate,
  buildDocumentsFromTemplate,
  generateOfferLetterHTML,
} from './onboardingTemplates';
import {
  buildPortalAccessEmail,
  buildHiredEmail,
  buildPasswordResetEmail,
  sendEmail,
  SendEmailResult,
} from './emailSender';

export interface Actor {
  _id: string;
  name: string;
  email: string;
}

export function generateTemporaryPassword(): string {
  return `${crypto.randomBytes(3).toString('hex')}@${Math.floor(1000 + Math.random() * 9000)}`;
}

// Build the candidate portal login URL e.g. https://host/candidate-login
function buildLoginUrl(origin: string, _companyCode: string): string {
  return `${origin.replace(/\/$/, '')}/candidate-login`;
}

async function getApplication(applicationId: string, companyId: string) {
  const application = await JobApplication.findOne({
    _id: applicationId,
    companyId,
  });
  if (!application) throw new Error('Application not found');
  return application;
}

/**
 * Grants a candidate portal access the moment they are considered/shortlisted.
 * Creates their temporary employee account (if it does not exist yet) and
 * emails the login credentials once.
 */
export async function grantPortalAccess(input: {
  companyId: string;
  actor: Actor;
  applicationId: string;
  origin: string;
}): Promise<{
  user: any;
  password: string | null;
  email: SendEmailResult | null;
  accountCreated: boolean;
  alreadyHasAccess: boolean;
  application: any;
}> {
  await connectDB();

  const application = await getApplication(input.applicationId, input.companyId);
  const email = (application.fromEmail || '').toLowerCase();
  if (!email) throw new Error('Candidate email is missing on the application');

  if (application.portalAccessSentAt) {
    return {
      user: null,
      password: null,
      email: null,
      accountCreated: false,
      alreadyHasAccess: true,
      application,
    };
  }

  const fullName = application.candidateName || application.fromName || 'Candidate';
  const job = application.jobPositionId ? await JobPosition.findById(application.jobPositionId) : null;

  let user = await User.findOne({ email });
  let accountCreated = false;
  let password: string | null = null;

  if (!user) {
    password = generateTemporaryPassword();
    const hashed = await bcrypt.hash(password, 10);
    user = await User.create({
      name: fullName,
      email,
      password: hashed,
      role: 'employee',
      companyId: input.companyId,
      department: job?.department || undefined,
      designation: application.appliedPosition || job?.title || undefined,
      isActive: true,
      mustChangePassword: true,
      isCandidate: true,
    });
    accountCreated = true;
  } else if (!user.isCandidate) {
    // An account already exists for this email but is not yet a candidate-portal
    // account (e.g. an employee, or a leftover account from a previous flow).
    // Issue fresh temporary credentials so the candidate can actually log in.
    password = generateTemporaryPassword();
    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.mustChangePassword = true;
    user.isCandidate = true;
    await user.save();
  }

  application.portalAccessSentAt = new Date();
  await application.save();

  // Only email credentials when we actually created/reset the account
  if (password) {
    const company = await Company.findById(input.companyId);
    const loginUrl = buildLoginUrl(input.origin, company?.code || '');
    const mail = buildPortalAccessEmail({
      name: fullName.split(' ')[0],
      companyName: company?.name || 'our Company',
      position: application.appliedPosition || job?.title || '',
      loginUrl,
      password,
    });
    const emailResult = await sendEmail({
      companyId: input.companyId,
      to: email,
      toName: fullName,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return { user, password, email: emailResult, accountCreated, alreadyHasAccess: false, application };
  }

  return { user, password: null, email: null, accountCreated: false, alreadyHasAccess: false, application };
}

export interface HireInput {
  companyId: string;
  actor: Actor;
  applicationId: string;
  joiningDate?: string | Date | null;
  ctc?: string;
  position?: string;
  department?: string;
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  origin: string;
}

export interface HireResult {
  application: any;
  onboarding: any;
  user: any;
  password: string | null;
  email: SendEmailResult | null;
  alreadyHired: boolean;
  accountCreated: boolean;
}

/**
 * Marks an applicant as hired, creates their temporary portal account (if not
 * already created at consider-time), creates the onboarding record + draft offer
 * and emails them.
 */
export async function hireCandidate(input: HireInput): Promise<HireResult> {
  await connectDB();

  const application = await getApplication(input.applicationId, input.companyId);
  const alreadyHired = application.status === 'hired';

  const company = await Company.findById(input.companyId);
  const job = application.jobPositionId ? await JobPosition.findById(application.jobPositionId) : null;

  const fullName = application.candidateName || application.fromName || 'Candidate';
  const email = (application.fromEmail || '').toLowerCase();
  if (!email) throw new Error('Candidate email is missing on the application');

  const position = input.position || application.appliedPosition || job?.title || '';
  const department = input.department || job?.department || '';
  const employmentType = input.employmentType || job?.employmentType || 'Full-time';
  const ctc = input.ctc || job?.salaryRange || '';
  const joiningDate = input.joiningDate ? new Date(input.joiningDate) : null;

  // 1. Ensure a portal account exists (it is usually created at consider-time)
  let user = await User.findOne({ email });
  let accountCreated = false;
  let password: string | null = null;
  if (!user) {
    password = generateTemporaryPassword();
    const hashed = await bcrypt.hash(password, 10);
    user = await User.create({
      name: fullName,
      email,
      password: hashed,
      role: 'employee',
      companyId: input.companyId,
      department: department || undefined,
      designation: position || undefined,
      joiningDate: joiningDate || undefined,
      isActive: true,
      mustChangePassword: true,
      isCandidate: true,
    });
    accountCreated = true;
  }

  // 2. Create / reuse the onboarding record
  let onboarding = application.onboardingId
    ? await Onboarding.findById(application.onboardingId)
    : null;

  if (!onboarding) {
    const createdBy = input.actor;
    const checklist = buildChecklistFromTemplate(joiningDate);
    const documents = buildDocumentsFromTemplate();
    onboarding = await Onboarding.create({
      companyId: input.companyId,
      employeeId: user._id,
      candidate: {
        fullName,
        email,
        phone: application.candidatePhone || '',
        position,
        department,
        employmentType,
        joiningDate: joiningDate || undefined,
        workLocation: job?.location || '',
        source: 'job_application',
      },
      offerLetter: {
        status: 'draft',
        ctc,
        probationMonths: 3,
      },
      documents,
      checklist,
      createdBy,
      lastUpdatedBy: createdBy,
      activity: [{
        userId: input.actor._id,
        userName: input.actor.name,
        action: 'created',
        details: 'Onboarding record created from job application',
      }],
    });

    const offerHtml = generateOfferLetterHTML(onboarding.candidate, onboarding.offerLetter, company);
    onboarding.offerLetter.content = offerHtml;
    onboarding.offerLetter.generatedBy = createdBy;
    onboarding.offerLetter.generatedAt = new Date();
    await onboarding.save();
  }

  // 3. Update the application
  application.status = 'hired';
  application.onboardingId = onboarding._id;
  if (!application.portalAccessSentAt) {
    application.portalAccessSentAt = new Date();
  }
  await application.save();

  // 4. Email: credentials if the account was just created, otherwise a hired notice
  const loginUrl = buildLoginUrl(input.origin, company?.code || '');
  let emailResult: SendEmailResult | null = null;
  if (password) {
    const mail = buildPortalAccessEmail({
      name: fullName.split(' ')[0],
      companyName: company?.name || 'our Company',
      position,
      loginUrl,
      password,
    });
    emailResult = await sendEmail({
      companyId: input.companyId,
      to: email,
      toName: fullName,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } else {
    const mail = buildHiredEmail({
      name: fullName.split(' ')[0],
      companyName: company?.name || 'our Company',
      position,
      loginUrl,
    });
    emailResult = await sendEmail({
      companyId: input.companyId,
      to: email,
      toName: fullName,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  return {
    application,
    onboarding,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    password,
    email: emailResult,
    alreadyHired,
    accountCreated,
  };
}

/**
 * Resets the applicant's temporary password and emails them the new one.
 */
export async function resetPortalPassword(input: {
  companyId: string;
  actor: Actor;
  applicationId: string;
  origin: string;
}): Promise<{ user: any; password: string; email: SendEmailResult; application: any }> {
  await connectDB();

  const application = await getApplication(input.applicationId, input.companyId);
  const email = (application.fromEmail || '').toLowerCase();
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Portal account does not exist yet. Consider the candidate first.');
  }

  const password = generateTemporaryPassword();
  user.password = await bcrypt.hash(password, 10);
  user.mustChangePassword = true;
  await user.save();

  const company = await Company.findById(input.companyId);
  const loginUrl = buildLoginUrl(input.origin, company?.code || '');
  const mail = buildPasswordResetEmail({
    name: (application.candidateName || application.fromName || 'Candidate').split(' ')[0],
    companyName: company?.name || 'our Company',
    loginUrl,
    password,
  });
  const emailResult = await sendEmail({
    companyId: input.companyId,
    to: email,
    toName: application.candidateName || application.fromName,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  application.portalAccessSentAt = new Date();
  await application.save();

  return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, password, email: emailResult, application };
}
