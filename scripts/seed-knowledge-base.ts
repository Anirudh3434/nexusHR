import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment');
  process.exit(1);
}

const sampleArticles = [
  // 1. PTO
  {
    category: 'pto',
    title: 'Paid Time Off (PTO) & Annual Vacation Policy',
    content: `All full-time employees are entitled to 24 days of Paid Time Off (PTO) per calendar year, accrued at a rate of 2 days per month. 
- Advance Notice: For planned leaves longer than 3 days, employees must submit a request via the HR portal at least 7 business days in advance.
- Rollover: Up to 5 unused PTO days can be rolled over to the next calendar year, expiring on March 31st.
- Approval: PTO requests must be approved by your direct reporting manager.`,
    keywords: ['pto', 'vacation', 'leave', 'paid time off', 'annual leave', 'time off', 'holiday leave', 'accrual', 'rollover'],
    priority: 10,
  },
  {
    category: 'pto',
    title: 'Sick Leave and Emergency Medical Absence',
    content: `Employees receive 10 paid Sick Leave days per year allocated on January 1st (or prorated upon joining).
- Documentation: A certified medical practitioner's note is required for consecutive sick leaves exceeding 2 consecutive working days.
- Reporting: Please inform your team lead or manager before 9:30 AM on the day of unplanned absence via Slack/Email or the HR portal.
- Unused sick leaves do not encash or roll over into subsequent years.`,
    keywords: ['sick leave', 'medical leave', 'doctor note', 'illness', 'emergency leave', 'hospitalization', 'health absence'],
    priority: 8,
  },
  {
    category: 'pto',
    title: 'Parental Leave Policy (Maternity & Paternity)',
    content: `We support new parents with comprehensive parental leave:
- Maternity Leave: 26 weeks of fully paid leave for birth mothers, applicable up to 8 weeks prior to expected delivery date.
- Paternity Leave: 4 weeks of fully paid leave for biological or adoptive secondary parents, to be taken within the first 6 months of the child's birth/adoption.
- Adoption / Surrogacy Leave: 12 weeks of paid leave for primary caregivers adopting a child under the age of 1 year.`,
    keywords: ['maternity', 'paternity', 'parental leave', 'childcare', 'pregnancy', 'adoption', 'baby', 'mother', 'father'],
    priority: 7,
  },

  // 2. Holidays
  {
    category: 'holidays',
    title: 'Official Company Holidays & Observances 2026',
    content: `The company observes 12 mandatory public holidays and provides 2 floating / optional holidays per year:
- New Year's Day (Jan 1)
- Republic Day (Jan 26)
- Holi (Mar 14)
- Good Friday (Apr 3)
- Eid ul-Fitr (Apr 1)
- Independence Day (Aug 15)
- Mahatma Gandhi Jayanti (Oct 2)
- Dussehra (Oct 20)
- Diwali / Deepavali (Nov 8 - Nov 9)
- Christmas Day (Dec 25)
Floating holidays can be selected from the optional holiday list in the HR portal with 3 days prior notice.`,
    keywords: ['holidays', 'calendar', 'public holidays', 'festival', 'national holiday', 'floating holiday', 'off days', 'closure'],
    priority: 9,
  },

  // 3. Benefits
  {
    category: 'benefits',
    title: 'Health, Medical & Dental Insurance Coverage',
    content: `All full-time employees and their immediate dependants (spouse + up to 2 children + parents) are covered under the Group Medical Health Insurance scheme:
- Coverage Sum: INR 5,00,000 per family unit per policy year.
- Cashless Hospitalization: Available at over 6,500+ network hospitals via the TPA card issued upon onboarding.
- OPD & Dental Allowance: Annual reimbursement of up to INR 15,000 for outpatient consultations, diagnostics, dental cleaning, and prescription eye-wear.
- Policy Card & Claims: Access e-cards and file reimbursement claims via the MediBuddy / Insurance portal linked in NexusHR.`,
    keywords: ['insurance', 'health insurance', 'medical', 'dental', 'mediclaim', 'hospitalization', 'dependents', 'coverage', 'opd', 'claims'],
    priority: 10,
  },
  {
    category: 'benefits',
    title: 'Wellness, Gym & Fitness Stipend',
    content: `To encourage physical health and well-being, the company offers a monthly wellness allowance:
- Monthly Reimbursement: Up to INR 2,500 / $35 per month for gym memberships, yoga classes, sports club subscriptions, or mental wellness / meditation apps.
- How to Claim: Submit paid receipts under "Reimbursements -> Wellness" before the 25th of each month.`,
    keywords: ['gym', 'fitness', 'wellness', 'stipend', 'mental health', 'sports', 'allowance', 'reimbursement'],
    priority: 6,
  },
  {
    category: 'benefits',
    title: 'Learning & Professional Development Allowance',
    content: `We invest in continuous employee learning:
- Annual Budget: Each employee has an annual learning budget of INR 40,000 / $500 for certifications, technical books, workshops, and conference tickets.
- Approval: Submit course details to your manager for approval prior to purchase.
- Reimbursement: Provide certificate of completion along with invoice to HR.`,
    keywords: ['learning', 'education', 'books', 'certification', 'training', 'courses', 'conference', 'upskilling', 'tuition'],
    priority: 7,
  },

  // 4. Handbook & Policies
  {
    category: 'handbook',
    title: 'Code of Conduct, Anti-Harassment & POSH Policy',
    content: `The company maintains zero tolerance for any form of harassment, discrimination, or unethical conduct.
- Equal Opportunity: We foster an inclusive environment irrespective of race, gender, sexual orientation, religion, disability, or age.
- POSH (Prevention of Sexual Harassment): Any grievance can be submitted confidentially to the Internal Committee (IC) via posh@company.com or directly to the HR Director.
- Confidentiality: Whistleblower identity and reports are strictly protected with zero retaliation guarantees.`,
    keywords: ['code of conduct', 'harassment', 'posh', 'ethics', 'discrimination', 'grievance', 'whistleblower', 'internal committee'],
    priority: 10,
  },
  {
    category: 'handbook',
    title: 'Remote, Hybrid & Working Hours Policy',
    content: `Our default work model is hybrid:
- Core Hours: Core collaboration hours are 10:00 AM to 5:00 PM local time. Flexible start between 8:30 AM and 10:00 AM.
- In-office Expectation: 2 to 3 days per week in office for hybrid teams; 100% remote employees are expected to maintain active presence on Slack during core hours.
- Work from Anywhere: Employees can work remotely from any location for up to 30 calendar days per year with manager pre-approval.`,
    keywords: ['remote', 'hybrid', 'work from home', 'wfh', 'working hours', 'timing', 'flexibility', 'core hours', 'attendance'],
    priority: 8,
  },
  {
    category: 'handbook',
    title: 'IT Asset, Data Privacy & Security Policy',
    content: `Guidelines for company laptops, credentials, and customer data:
- Device Security: Full disk encryption (BitLocker / FileVault) and endpoint antivirus must remain active at all times.
- Password & 2FA: Mandatory 2-Factor Authentication (2FA) on Google Workspace, GitHub, and NexusHR accounts.
- Clean Desk & Screen Lock: Lock screens when stepping away. Never store unencrypted customer or company confidential data on personal drives or external USBs.`,
    keywords: ['security', 'laptop', 'latop', 'data privacy', 'password', '2fa', 'it asset', 'device security', 'encryption', 'gdpr'],
    priority: 7,
  },
  {
    category: 'procedures',
    title: 'Company Laptop Damage, Loss & Hardware Repair Policy',
    content: `What to do if your company laptop or equipment is broken, damaged, or malfunctioning:
1. Immediate Action: Report the incident immediately to the IT Helpdesk by creating a ticket under "IT Support" in NexusHR or emailing support@company.com and notifying your reporting manager.
2. Accidental Damage Coverage: Accidental drops, screen cracks, keyboard spills, and hardware failures are covered under company device insurance and enterprise warranty. Employees are NOT penalized or charged for genuine accidental damage.
3. Temporary Loaner Laptop: IT will ship or hand over a temporary loaner laptop within 24-48 business hours so your work is not disrupted.
4. Repairs & Replacement: Do NOT attempt third-party repairs. IT will coordinate authorized OEM repairs or issue a new replacement machine.
5. Lost or Stolen Devices: If a device is stolen, immediately notify IT for remote data wipe (MDM) and file an official police report (FIR/police complaint) within 24 hours.`,
    keywords: ['laptop', 'latop', 'broke', 'broken', 'damage', 'damaged', 'broken laptop', 'crack', 'screen', 'spill', 'repair', 'hardware damage', 'lost laptop', 'stolen', 'company action', 'replace laptop', 'it support', 'loaner'],
    priority: 10,
  },

  // 5. Procedures
  {
    category: 'procedures',
    title: 'Expense Reimbursement & Travel Expense Submission',
    content: `How to submit business expenses and travel claims:
1. Collect itemized GST/VAT tax invoices clearly displaying vendor name and date.
2. Navigate to Finance / Reimbursements in NexusHR.
3. Select expense type (Client Dinner, Travel, Software Tools, Internet/Phone, Wellness).
4. Upload receipt and enter amount.
5. Approvals: Manager approves by the 24th; Finance processes payouts in the month-end payroll cycle.`,
    keywords: ['expense', 'reimbursement', 'travel', 'receipt', 'claim', 'refund', 'bills', 'finance claim', 'how to submit'],
    priority: 8,
  },
  {
    category: 'procedures',
    title: 'Hardware Procurement & IT Support Requests',
    content: `How to request new equipment, upgrades, or IT troubleshooting:
- Standard Equipment: MacBook Pro / Dell XPS + External 27" Monitor + Ergonomic keyboard/mouse provided at joining.
- Replacements / Upgrades: Eligible after 3 years of service or upon hardware malfunction.
- Ticketing: Raise a ticket under the IT Helpdesk tab or email support@company.com with device serial number and issue description.`,
    keywords: ['it support', 'laptop', 'hardware', 'equipment', 'monitor', 'mouse', 'keyboard', 'replace laptop', 'helpdesk'],
    priority: 7,
  },

  // 6. Payroll
  {
    category: 'payroll',
    title: 'Salary Disbursal Schedule, Payslips & Direct Deposit',
    content: `Details regarding monthly payroll, payslip generation, and bank accounts:
- Pay Date: Salaries are credited to employee designated bank accounts on the last working day of each calendar month.
- Payslips: Downloadable monthly payslips are generated on the 1st of the following month under "Profile -> Payroll -> Payslips" in NexusHR.
- Updating Bank Info: To update your salary bank account, submit cancelled cheque or bank verification letter before the 18th of the month.`,
    keywords: ['salary', 'paycheck', 'payroll', 'payslip', 'pay date', 'bank account', 'direct deposit', 'salary slip', 'wage'],
    priority: 9,
  },
  {
    category: 'payroll',
    title: 'Income Tax Declarations, TDS & Form 16 / W-2',
    content: `Information regarding tax deductions and investment declarations:
- Tax Regime Selection: Choose between New and Old Tax Regimes in the HR portal before April 30th (or upon joining).
- Proof Submission: Submit investment proofs (80C, 80D, HRA rent receipts, Home Loan Interest) during the annual verification window (Jan 1 - Jan 25).
- Form 16 / Tax Forms: Form 16 Part A & B will be published and available for download by June 15th annually.`,
    keywords: ['tax', 'tds', 'form 16', 'income tax', 'regime', 'hra', '80c', 'investment proof', 'tax deduction', 'w2'],
    priority: 8,
  },

  // 7. Recruitment & Referral
  {
    category: 'recruitment',
    title: 'Employee Referral Bonus Program',
    content: `Help us build our team and earn cash rewards:
- Referral Bonus Amounts:
  * Junior to Mid-level Roles: INR 30,000 / $400
  * Senior & Lead Roles: INR 60,000 / $800
  * Principal / Director / Specialized AI Roles: INR 1,00,000 / $1,300
- Payout Schedule: 50% paid upon candidate joining, 50% paid after the candidate successfully completes their 90-day probation period.
- Submission: Submit candidate resumes through the Careers / Referrals portal before candidate applies directly.`,
    keywords: ['referral', 'referral bonus', 'hiring reward', 'refer a friend', 'recruitment', 'job opening', 'cash reward'],
    priority: 7,
  },

  // 8. Performance
  {
    category: 'performance',
    title: 'Performance Review Cycles, OKRs & Promotions',
    content: `Our performance management framework runs on bi-annual review cycles:
- Cycle Schedule: Mid-year review (July) and Year-end evaluation & appraisal (January/February).
- 360 Feedback: Evaluation includes self-appraisal, manager review, and peer feedback across 3 core pillars: Delivery against OKRs, Technical Excellence, and Values & Collaboration.
- Compensation & Promotion: Merit salary increments and promotional title changes take effect on April 1st following year-end reviews.`,
    keywords: ['performance', 'okr', 'appraisal', 'review', 'promotion', 'rating', 'hike', 'salary increase', 'evaluation', 'feedback'],
    priority: 9,
  },
];

async function seedKnowledgeBase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB successfully!');

    const db = mongoose.connection.db!;
    const companies = await db.collection('companies').find({}).toArray();
    console.log(`Found ${companies.length} companies:`, companies.map(c => c.name));

    const users = await db.collection('users').find({}).toArray();
    const adminUser = users.find(u => u.role === 'admin') || users[0];

    const kbCollection = db.collection('hrknowledgebases');

    // Remove existing test articles to avoid duplication
    const deleteResult = await kbCollection.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing knowledge base articles.`);

    const articlesToInsert: any[] = [];

    for (const company of companies) {
      const companyAdmin = users.find(u => u.companyId?.toString() === company._id.toString() && u.role === 'admin') || adminUser;

      for (const item of sampleArticles) {
        articlesToInsert.push({
          companyId: company._id,
          category: item.category,
          title: item.title,
          content: item.content,
          keywords: item.keywords,
          lastUpdated: new Date(),
          lastUpdatedBy: companyAdmin?._id,
          isActive: true,
          priority: item.priority,
          viewCount: 0,
          helpfulCount: 0,
          notHelpfulCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (articlesToInsert.length > 0) {
      const result = await kbCollection.insertMany(articlesToInsert);
      console.log(`Successfully seeded ${result.insertedCount} knowledge base articles across ${companies.length} companies!`);
    }

    await mongoose.disconnect();
    console.log('Database disconnected.');
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    process.exit(1);
  }
}

seedKnowledgeBase();
