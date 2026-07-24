import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailConfig from '@/models/EmailConfig';
import JobApplication from '@/models/JobApplication';
import JobPosition from '@/models/JobPosition';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to download attachment from Gmail and upload to Cloudinary
async function processAttachment(
  messageId: string,
  attachmentId: string,
  filename: string,
  mimeType: string,
  accessToken: string
): Promise<string | null> {
  try {
    // Download attachment from Gmail API
    const attachmentResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!attachmentResponse.ok) {
      console.error('Failed to download attachment:', filename);
      return null;
    }

    const attachmentData = await attachmentResponse.json();
    
    // Gmail returns base64url encoded data - convert to regular base64
    const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64Data}`,
      {
        folder: 'hrm/resumes',
        public_id: `resume_${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
        resource_type: 'auto',
        format: filename.split('.').pop() || 'pdf',
      }
    );

    console.log('Attachment uploaded to Cloudinary:', uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Error processing attachment:', error);
    return null;
  }
}

// Helper to download attachment from Outlook and upload to Cloudinary
async function processOutlookAttachment(
  downloadUrl: string,
  filename: string,
  mimeType: string
): Promise<string | null> {
  try {
    // Download attachment from Microsoft Graph API
    const attachmentResponse = await fetch(downloadUrl);

    if (!attachmentResponse.ok) {
      console.error('Failed to download attachment:', filename);
      return null;
    }

    const arrayBuffer = await attachmentResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    
    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64Data}`,
      {
        folder: 'hrm/resumes',
        public_id: `resume_${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
        resource_type: 'auto',
        format: filename.split('.').pop() || 'pdf',
      }
    );

    console.log('Attachment uploaded to Cloudinary:', uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Error processing Outlook attachment:', error);
    return null;
  }
}

// Helper function to refresh Gmail access token
async function refreshGmailToken(config: any) {
  try {
    if (!config.refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    console.log('Refreshing Gmail access token...');
    console.log('Client ID exists:', !!process.env.GMAIL_CLIENT_ID);
    console.log('Client Secret exists:', !!process.env.GMAIL_CLIENT_SECRET);
    
    // Google's token endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token refresh failed:', error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    
    // Calculate expiry time (usually 3600 seconds = 1 hour)
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    
    // Update the database with new token
    await EmailConfig.findOneAndUpdate(
      { companyId: config.companyId },
      {
        accessToken: tokenData.access_token,
        tokenExpiry: tokenExpiry,
      },
      { new: true }
    );
    
    console.log('Token refreshed successfully, expires at:', tokenExpiry);
    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Helper function to refresh Outlook access token
async function refreshOutlookToken(config: any) {
  try {
    if (!config.refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    console.log('Refreshing Outlook access token...');
    console.log('Client ID exists:', !!process.env.MICROSOFT_CLIENT_ID);
    console.log('Client Secret exists:', !!process.env.MICROSOFT_CLIENT_SECRET);
    
    // Microsoft's token endpoint
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token refresh failed:', error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    
    // Calculate expiry time (usually 3600 seconds = 1 hour)
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    
    // Update the database with new token
    await EmailConfig.findOneAndUpdate(
      { companyId: config.companyId },
      {
        accessToken: tokenData.access_token,
        tokenExpiry: tokenExpiry,
      },
      { new: true }
    );
    
    console.log('Token refreshed successfully, expires at:', tokenExpiry);
    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// POST sync emails from provider
export async function POST(req: Request) {
  try {
    await connectDB();
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    // Get config with tokens (need to explicitly select due to select: false)
    const config = await EmailConfig.findOne({ companyId, isActive: true })
      .select('+accessToken +refreshToken +tokenExpiry provider careerEmail lastSyncAt autoReplyEnabled');
    
    if (!config) {
      return NextResponse.json({ message: 'Email config not found' }, { status: 404 });
    }

    console.log('Email sync config:', {
      provider: config.provider,
      hasAccessToken: !!config.accessToken,
      careerEmail: config.careerEmail,
      lastSyncAt: config.lastSyncAt
    });

    // Check if tokens exist (OAuth providers need tokens)
    if (config.provider !== 'other' && !config.accessToken) {
      return NextResponse.json({ 
        message: 'Email account not connected. Please authenticate first.',
        provider: config.provider,
        hasToken: false 
      }, { status: 400 });
    }

    // Real Gmail API sync
    const newApplications = [];
    let tokenRefreshed = false;
    
    if (config.provider === 'outlook' && config.accessToken) {
      try {
        // Build query for Microsoft Graph API - search for job-related emails
        const jobKeywords = ['application', 'resume', 'cv', 'job', 'position', 'hiring', 'career'];
        const searchQuery = jobKeywords.join(' OR ');
        
        console.log('Fetching emails from Outlook with query:', searchQuery);
        
        // Track current access token (may be refreshed)
        let currentAccessToken = config.accessToken;
        
        // Helper function to make Microsoft Graph API call
        async function fetchOutlookMessages(accessToken: string) {
          return fetch(
            `https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(searchQuery)}"&$top=10`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        }
        
        // Call Microsoft Graph API to search for job application emails
        let outlookSearchResponse = await fetchOutlookMessages(currentAccessToken);
        
        // If token expired (401), try to refresh and retry
        if (outlookSearchResponse.status === 401) {
          console.log('Token expired, attempting automatic refresh...');
          const newAccessToken = await refreshOutlookToken(config);
          
          if (newAccessToken) {
            currentAccessToken = newAccessToken;
            tokenRefreshed = true;
            outlookSearchResponse = await fetchOutlookMessages(currentAccessToken);
            console.log('Retry with refreshed token successful');
          } else {
            return NextResponse.json({ 
              message: 'Outlook authentication expired and could not be refreshed. Please reconnect your account.',
              error: 'token_expired'
            }, { status: 401 });
          }
        }
        
        if (!outlookSearchResponse.ok) {
          const errorData = await outlookSearchResponse.json().catch(() => ({}));
          console.error('Microsoft Graph API error:', errorData);
          throw new Error(`Microsoft Graph API error: ${errorData.error?.message || outlookSearchResponse.statusText}`);
        }
        
        const { value: messages = [] } = await outlookSearchResponse.json();
        console.log(`Found ${messages.length} potential job application emails`);
        
        // Fetch full details for each email
        for (const message of messages.slice(0, 5)) {
          try {
            // Get full message details using current (potentially refreshed) token
            const messageResponse = await fetch(
              `https://graph.microsoft.com/v1.0/me/messages/${message.id}?$expand=attachments`,
              {
                headers: {
                  Authorization: `Bearer ${currentAccessToken}`,
                },
              }
            );
            
            if (!messageResponse.ok) continue;
            
            const msgData = await messageResponse.json();
            
            // Extract email data
            const subject = msgData.subject || 'No Subject';
            const from = msgData.from?.emailAddress || {};
            const fromName = from.name || 'Unknown';
            const fromEmail = from.address || '';
            const date = msgData.receivedDateTime || new Date().toISOString();
            
            // Extract email body
            const body = msgData.body?.content || '';
            const bodyText = msgData.body?.content?.replace(/<[^>]+>/g, '') || '';
            
            // Process attachments
            const attachments: any[] = [];
            if (msgData.attachments && msgData.attachments.length > 0) {
              for (const att of msgData.attachments) {
                if (att.isInline) continue; // Skip inline images
                
                // Upload attachment to Cloudinary
                if (att.oData?.['@microsoft.graph.downloadUrl']) {
                  console.log(`Processing attachment: ${att.name}...`);
                  const fileUrl = await processOutlookAttachment(
                    att.oData['@microsoft.graph.downloadUrl'],
                    att.name,
                    att.contentType
                  );
                  if (fileUrl) {
                    attachments.push({
                      filename: att.name,
                      mimeType: att.contentType,
                      size: att.size,
                      fileUrl: fileUrl,
                    });
                    console.log(`✅ Attachment uploaded: ${att.name}`);
                  }
                }
              }
            }
            
            // Check if already exists
            const exists = await JobApplication.findOne({ emailMessageId: message.id });
            if (exists) {
              console.log(`Email ${message.id} already exists, skipping...`);
              continue;
            }
            
            // Extract Job ID from subject
            const jobIdMatch = subject.match(/\b(JB\d{3,4})\b/i);
            const jobId = jobIdMatch ? jobIdMatch[1].toUpperCase() : null;
            
            if (!jobId) {
              console.log(`⚠️ Warning: No Job ID found in email from ${fromEmail}. Subject: ${subject}`);
            }
            
            // Check for duplicate
            if (jobId) {
              const existingApplication = await JobApplication.findOne({
                fromEmail: fromEmail.toLowerCase(),
                jobId: jobId,
                companyId
              });
              
              if (existingApplication) {
                console.log(`❌ Duplicate application rejected: ${fromEmail} already applied for ${jobId}`);
                continue;
              }
            }
            
            // Try to extract job position from subject
            const positionMatch = subject.match(/(?:for|re:|application).*?\s*(?:for\s+)?(.+?)(?:position|role|job|$)/i);
            const appliedPosition = positionMatch?.[1]?.trim() || 'Unknown Position';
            
            // Extract Experience using regex from body text
            let experience = '';
            const bodyLower = bodyText.toLowerCase();
            const expMatches = [
              bodyLower.match(/(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)?)/i),
              bodyLower.match(/experience[:\s]+(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?))/i),
              bodyLower.match(/(\d+)\s*(?:years?|yrs?)\s*(?:work|professional|industry)?\s*(?:experience|exp)/i),
              bodyLower.match(/(fresher|new graduate|recent graduate|entry level|0\s*years?)/i),
            ];
            
            for (const match of expMatches) {
              if (match && match[0]) {
                experience = match[0].replace(/\s+/g, ' ').trim();
                experience = experience.replace(/\b(?:of|the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
                experience = experience.replace(/years?/gi, 'years').replace(/yrs?/gi, 'years');
                break;
              }
            }
            
            // If Job ID found, lookup the job position
            let jobPositionId = null;
            if (jobId) {
              const jobPosition = await JobPosition.findOne({ jobId, companyId });
              if (jobPosition) {
                jobPositionId = jobPosition._id;
                console.log(`Linked email to Job ID: ${jobId}, Position: ${jobPosition.title}`);
              }
            }
            
            const application = await JobApplication.create({
              companyId,
              emailMessageId: message.id,
              fromEmail: fromEmail.toLowerCase(),
              fromName,
              subject,
              body,
              bodyText,
              receivedAt: new Date(date),
              candidateName: fromName,
              appliedPosition,
              experience,
              jobId,
              jobPositionId,
              hasAttachments: attachments.length > 0,
              attachments,
              status: 'new',
              isRead: false,
              isStarred: false,
              autoReplySent: false,
              source: 'email',
            });
            
            newApplications.push(application);
            console.log('✅ Created job application:', subject, jobId ? `(Job ID: ${jobId})` : '', experience ? `(Exp: ${experience})` : '');
          } catch (err: any) {
            if (err.code === 11000 && err.message.includes('unique_email_jobId')) {
              console.log(`❌ Duplicate application prevented by database constraint (email + jobId)`);
            } else {
              console.error('Error processing email:', err);
            }
          }
        }
      } catch (error: any) {
        console.error('Outlook sync error:', error);
        throw error;
      }
    } else if (config.provider === 'gmail' && config.accessToken) {
      try {
        // Build query for Gmail API - search for job-related emails
        // Look for keywords like "application", "resume", "CV", "job", "position"
        const jobKeywords = ['application', 'resume', 'cv', 'job', 'position', 'hiring', 'career'];
        const query = jobKeywords.join(' OR ');
        
        console.log('Fetching emails from Gmail with query:', query);
        
        // Track current access token (may be refreshed)
        let currentAccessToken = config.accessToken;
        
        // Helper function to make Gmail API call
        async function fetchGmailMessages(accessToken: string) {
          return fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        }
        
        // Call Gmail API to search for job application emails
        let gmailSearchResponse = await fetchGmailMessages(currentAccessToken);
        
        // If token expired (401), try to refresh and retry
        if (gmailSearchResponse.status === 401) {
          console.log('Token expired, attempting automatic refresh...');
          const newAccessToken = await refreshGmailToken(config);
          
          if (newAccessToken) {
            // Update current token for all subsequent calls
            currentAccessToken = newAccessToken;
            tokenRefreshed = true;
            // Retry with new token
            gmailSearchResponse = await fetchGmailMessages(currentAccessToken);
            console.log('Retry with refreshed token successful');
          } else {
            return NextResponse.json({ 
              message: 'Gmail authentication expired and could not be refreshed. Please reconnect your account.',
              error: 'token_expired'
            }, { status: 401 });
          }
        }
        
        if (!gmailSearchResponse.ok) {
          const errorData = await gmailSearchResponse.json().catch(() => ({}));
          console.error('Gmail API error:', errorData);
          throw new Error(`Gmail API error: ${errorData.error?.message || gmailSearchResponse.statusText}`);
        }
        
        const { messages = [] } = await gmailSearchResponse.json();
        console.log(`Found ${messages.length} potential job application emails`);
        
        // Fetch full details for each email
        for (const message of messages.slice(0, 5)) { // Limit to 5 for demo
          try {
            // Get full message details using current (potentially refreshed) token
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
              {
                headers: {
                  Authorization: `Bearer ${currentAccessToken}`,
                },
              }
            );
            
            if (!messageResponse.ok) continue;
            
            const msgData = await messageResponse.json();
            
            // Extract headers
            const headers = msgData.payload?.headers || [];
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name === 'From')?.value || '';
            const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
            
            // Parse sender info
            const fromMatch = from.match(/(?:"?([^"<]+)"?\s*)?<?([^>]+)>?/);
            const fromName = fromMatch?.[1]?.trim() || fromMatch?.[2]?.split('@')[0] || 'Unknown';
            const fromEmail = fromMatch?.[2] || from;
            
            // Extract email body
            let body = '';
            let bodyText = '';
            
            function extractBody(parts: any[]): void {
              for (const part of parts) {
                if (part.mimeType === 'text/html' && part.body?.data) {
                  body = Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.mimeType === 'text/plain' && part.body?.data) {
                  bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.parts) {
                  extractBody(part.parts);
                }
              }
            }
            
            if (msgData.payload?.parts) {
              extractBody(msgData.payload.parts);
            } else if (msgData.payload?.body?.data) {
              bodyText = Buffer.from(msgData.payload.body.data, 'base64').toString('utf-8');
            }
            
            // Check for attachments and process them
            const attachments: any[] = [];
            let hasAttachments = false;
            
            function findAttachments(parts: any[]): void {
              for (const part of parts) {
                if (part.filename && part.body?.attachmentId) {
                  hasAttachments = true;
                  attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId,
                  });
                }
                if (part.parts) {
                  findAttachments(part.parts);
                }
              }
            }
            
            if (msgData.payload?.parts) {
              findAttachments(msgData.payload.parts);
            }
            
            // Check if already exists BEFORE processing attachments
            const exists = await JobApplication.findOne({ emailMessageId: message.id });
            if (exists) {
              console.log(`Email ${message.id} already exists, skipping...`);
              continue; // Skip to next email
            }
            
            // Process attachments - download from Gmail and upload to Cloudinary
            const processedAttachments = [];
            for (const att of attachments) {
              console.log(`Processing attachment: ${att.filename}...`);
              const fileUrl = await processAttachment(
                message.id,
                att.attachmentId,
                att.filename,
                att.mimeType,
                currentAccessToken
              );
              if (fileUrl) {
                processedAttachments.push({
                  filename: att.filename,
                  mimeType: att.mimeType,
                  size: att.size,
                  fileUrl: fileUrl,
                });
                console.log(`✅ Attachment uploaded: ${att.filename}`);
              } else {
                console.log(`❌ Failed to process attachment: ${att.filename}`);
              }
            }
            
            // Extract Job ID from subject (pattern: JB0001, JB0002, etc.)
            const jobIdMatch = subject.match(/\b(JB\d{3,4})\b/i);
            const jobId = jobIdMatch ? jobIdMatch[1].toUpperCase() : null;
            
            // VALIDATION 1: Check if jobId is present (optional - log warning if missing)
            if (!jobId) {
              console.log(`⚠️ Warning: No Job ID found in email from ${fromEmail}. Subject: ${subject}`);
            }
            
            // VALIDATION 2: Check for duplicate - Same email + Same jobId = reject
            // Same email + Different jobId = allowed
            if (jobId) {
              const existingApplication = await JobApplication.findOne({
                fromEmail: fromEmail.toLowerCase(),
                jobId: jobId,
                companyId
              });
              
              if (existingApplication) {
                console.log(`❌ Duplicate application rejected: ${fromEmail} already applied for ${jobId}`);
                continue; // Skip this email
              }
            }
            
            // Try to extract job position from subject
            const positionMatch = subject.match(/(?:for|re:|application).*?\s*(?:for\s+)?(.+?)(?:position|role|job|$)/i);
            const appliedPosition = positionMatch?.[1]?.trim() || 'Unknown Position';
            
            // Extract Experience using regex from body text
            // Match patterns like: "5 years", "5+ years", "5-7 years", "5 yrs", "five years"
            let experience = '';
            const bodyLower = (bodyText || body || '').toLowerCase();
            const expMatches = [
              // "5 years of experience", "5+ years experience", "5-7 years of experience"
              bodyLower.match(/(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)?)/i),
              // "experience: 5 years"
              bodyLower.match(/experience[:\s]+(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?))/i),
              // "5 year experience"
              bodyLower.match(/(\d+)\s*(?:years?|yrs?)\s*(?:work|professional|industry)?\s*(?:experience|exp)/i),
              // Fresher patterns
              bodyLower.match(/(fresher|new graduate|recent graduate|entry level|0\s*years?)/i),
            ];
            
            for (const match of expMatches) {
              if (match && match[0]) {
                experience = match[0].replace(/\s+/g, ' ').trim();
                // Clean up the text
                experience = experience.replace(/\b(?:of|the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
                experience = experience.replace(/years?/gi, 'years').replace(/yrs?/gi, 'years');
                break;
              }
            }
            
            // If Job ID found, lookup the job position
            let jobPositionId = null;
            if (jobId) {
              const jobPosition = await JobPosition.findOne({ jobId, companyId });
              if (jobPosition) {
                jobPositionId = jobPosition._id;
                console.log(`Linked email to Job ID: ${jobId}, Position: ${jobPosition.title}`);
              }
            }
            
            const application = await JobApplication.create({
              companyId,
              emailMessageId: message.id,
              fromEmail: fromEmail.toLowerCase(),
              fromName,
              subject,
              body,
              bodyText: bodyText || body.replace(/<[^>]+>/g, ''),
              receivedAt: new Date(date),
              candidateName: fromName,
              appliedPosition,
              experience,
              jobId,
              jobPositionId,
              hasAttachments: processedAttachments.length > 0,
              attachments: processedAttachments,
              status: 'new',
              isRead: false,
              isStarred: false,
              autoReplySent: false,
              source: 'email',
            });
            
            newApplications.push(application);
            console.log('✅ Created job application:', subject, jobId ? `(Job ID: ${jobId})` : '', experience ? `(Exp: ${experience})` : '');
          } catch (err: any) {
            // Handle duplicate key error (race condition)
            if (err.code === 11000 && err.message.includes('unique_email_jobId')) {
              console.log(`❌ Duplicate application prevented by database constraint (email + jobId)`);
            } else {
              console.error('Error processing email:', err);
            }
          }
        }
      } catch (error: any) {
        console.error('Gmail sync error:', error);
        throw error;
      }
    } else {
      // Fallback to mock data for demo if not Gmail or no token
      console.log('Using demo mode - no Gmail token or not Gmail provider');
      
      const mockEmail = {
        messageId: `demo_${Date.now()}`,
        fromEmail: 'demo@example.com',
        fromName: 'Demo Candidate',
        subject: 'Demo: Software Engineer Application',
        body: '<p>This is a demo job application.</p>',
        bodyText: 'This is a demo job application.',
        receivedAt: new Date(),
      };
      
      const exists = await JobApplication.findOne({ emailMessageId: mockEmail.messageId });
      if (!exists) {
        const application = await JobApplication.create({
          companyId,
          emailMessageId: mockEmail.messageId,
          fromEmail: mockEmail.fromEmail,
          fromName: mockEmail.fromName,
          subject: mockEmail.subject,
          body: mockEmail.body,
          bodyText: mockEmail.bodyText,
          receivedAt: mockEmail.receivedAt,
          candidateName: mockEmail.fromName,
          appliedPosition: 'Software Engineer',
          hasAttachments: false,
          status: 'new',
          isRead: false,
          isStarred: false,
          autoReplySent: false,
          source: 'demo',
        });
        newApplications.push(application);
      }
    }

    // Update last sync timestamp using findOneAndUpdate to avoid validation issues
    await EmailConfig.findOneAndUpdate(
      { companyId },
      { 
        lastSyncAt: new Date(),
        lastSyncMessageId: newApplications[newApplications.length - 1]?.emailMessageId || config.lastSyncMessageId 
      }
    );

    return NextResponse.json({
      message: 'Sync completed',
      synced: newApplications.length,
      new: newApplications.length,
      applications: newApplications,
      tokenRefreshed,
    });

  } catch (error: any) {
    console.error('Email sync error:', error);
    return NextResponse.json({ message: 'Sync failed', error: error.message }, { status: 500 });
  }
}

// GET sync status
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const config = await EmailConfig.findOne({ companyId, isActive: true })
      .select('-accessToken -refreshToken');

    if (!config) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: !!config.accessToken || config.provider === 'other',
      provider: config.provider,
      careerEmail: config.careerEmail,
      lastSyncAt: config.lastSyncAt,
      autoReplyEnabled: config.autoReplyEnabled,
    });

  } catch (error: any) {
    return NextResponse.json({ message: 'Error', error: error.message }, { status: 500 });
  }
}
