const API_URL = '/api/job-applications';

export interface JobApplication {
  _id: string;
  companyId: string;
  emailMessageId: string;
  threadId?: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  bodyText: string;
  receivedAt: string;
  candidateName: string;
  candidatePhone: string;
  appliedPosition: string;
  // New candidate details
  experience: string;
  currentDesignation: string;
  expectedSalary: string;
  noticePeriod: string;
  skills: string[];
  jobPositionId?: string;
  jobId?: string; // Job ID for tracking (e.g., JB0001)
  hasAttachments: boolean;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    fileUrl: string;
  }>;
  status: 'new' | 'under_review' | 'considered' | 'rejected' | 'shortlisted' | 'interview' | 'hired' | 'spam';
  rejectionReason?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  rating?: number | null;
  hrNotes: string;
  labels: string[];
  replies: Array<{
    from: 'hr' | 'candidate';
    message: string;
    sentAt: string;
    sentBy?: string;
  }>;
  isRead: boolean;
  isStarred: boolean;
  autoReplySent: boolean;
  source: 'email' | 'website' | 'referral' | 'job_board';
  interviewRounds?: Array<{
    _id: string;
    name?: string;
    type?: string;
    scheduledDate?: string;
    status?: string;
    result?: string;
    feedback?: string;
    decidedAt?: string;
    decidedBy?: { _id?: string; name?: string };
  }>;
  onboardingId?: string;
  portalAccessSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStats {
  total: number;
  new: number;
  unread: number;
  starred: number;
  shortlisted: number;
}

export interface ApplicationsResponse {
  applications: JobApplication[];
  total: number;
  offset: number;
  limit: number;
  stats: ApplicationStats;
}

// Get applications with filters
export const getJobApplications = async (params: {
  companyId: string;
  status?: string;
  isRead?: boolean;
  isStarred?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApplicationsResponse> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', params.companyId);
  if (params.status) url.searchParams.append('status', params.status);
  if (params.isRead !== undefined) url.searchParams.append('isRead', params.isRead.toString());
  if (params.isStarred !== undefined) url.searchParams.append('isStarred', params.isStarred.toString());
  if (params.limit) url.searchParams.append('limit', params.limit.toString());
  if (params.offset) url.searchParams.append('offset', params.offset.toString());

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch applications');
  return response.json();
};

// Get single application
export const getJobApplication = async (id: string): Promise<JobApplication> => {
  const response = await fetch(`${API_URL}?id=${id}`);
  if (!response.ok) throw new Error('Failed to fetch application');
  return response.json();
};

// Create application
export const createJobApplication = async (data: Partial<JobApplication>): Promise<JobApplication> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create application');
  return response.json();
};

// Update application
export const updateJobApplication = async (id: string, data: Partial<JobApplication>): Promise<JobApplication> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update application');
  return response.json();
};

// Delete application
export const deleteJobApplication = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete application');
};

// Mark as read
export const markAsRead = async (id: string): Promise<JobApplication> => {
  return updateJobApplication(id, { isRead: true });
};

// Toggle starred
export const toggleStarred = async (id: string, isStarred: boolean): Promise<JobApplication> => {
  return updateJobApplication(id, { isStarred });
};

// Update status
export const updateApplicationStatus = async (id: string, status: JobApplication['status']): Promise<JobApplication> => {
  return updateJobApplication(id, { status });
};

// Add HR reply
export const addReply = async (id: string, message: string, sentBy: string): Promise<JobApplication> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      $push: {
        replies: {
          from: 'hr',
          message,
          sentAt: new Date().toISOString(),
          sentBy,
        }
      }
    }),
  });
  if (!response.ok) throw new Error('Failed to add reply');
  return response.json();
};

// Assign to HR
export const assignApplication = async (id: string, assignedTo: string): Promise<JobApplication> => {
  return updateJobApplication(id, { assignedTo: assignedTo as any });
};

// Add rating and notes
export const rateApplication = async (id: string, rating: number, hrNotes?: string): Promise<JobApplication> => {
  const update: Partial<JobApplication> = { rating };
  if (hrNotes) update.hrNotes = hrNotes;
  return updateJobApplication(id, update);
};

// Status badge colors
export const getStatusColor = (status: JobApplication['status']): string => {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    considered: 'bg-indigo-100 text-indigo-700',
    rejected: 'bg-red-100 text-red-700',
    shortlisted: 'bg-green-100 text-green-700',
    interview: 'bg-purple-100 text-purple-700',
    hired: 'bg-emerald-100 text-emerald-700',
    spam: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

// Status labels
export const getStatusLabel = (status: JobApplication['status']): string => {
  const labels: Record<string, string> = {
    new: 'New',
    under_review: 'Under Review',
    considered: 'Considered',
    rejected: 'Rejected',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    hired: 'Hired',
    spam: 'Spam',
  };
  return labels[status] || status;
};

// Consider candidate
export const considerCandidate = async (id: string): Promise<JobApplication> => {
  return updateJobApplication(id, { status: 'considered' });
};

// Reject candidate
export const rejectCandidate = async (id: string, reason?: string): Promise<JobApplication> => {
  const update: any = { status: 'rejected' };
  if (reason) update.rejectionReason = reason;
  return updateJobApplication(id, update);
};
