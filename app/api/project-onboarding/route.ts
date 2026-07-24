import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectOnboarding from '@/models/ProjectOnboarding';

// GET - Fetch onboarding guide for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    let onboarding = await ProjectOnboarding.findOne({ projectId });
    
    // If no onboarding exists, return a default structure
    if (!onboarding) {
      onboarding = {
        projectId,
        projectOverview: {
          businessPurpose: '',
          architectureOverview: '',
          techStack: []
        },
        development: {
          folderStructure: '',
          developmentWorkflow: '',
          localSetupGuide: '',
          installationSteps: [],
          requiredTools: [],
          codingStandards: ''
        },
        git: {
          branchStrategy: '',
          pullRequestProcess: ''
        },
        deployment: {
          deploymentProcess: '',
          testingProcess: '',
          releaseProcess: ''
        },
        team: {
          importantContacts: '',
          teamMembers: []
        },
        documentation: {
          faqs: [],
          knownIssues: [],
          troubleshootingGuide: ''
        }
      };
    }

    return NextResponse.json({ onboarding }, { status: 200 });
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    return NextResponse.json({ message: 'Failed to fetch onboarding' }, { status: 500 });
  }
}

// POST - Create or update onboarding guide
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { 
      projectId, projectOverview, development, git, deployment, team, documentation,
      userId, userName, userEmail 
    } = body;

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    let onboarding = await ProjectOnboarding.findOne({ projectId });
    
    if (onboarding) {
      // Update existing
      const newVersion = onboarding.version + 1;
      onboarding.versions.push({
        version: newVersion,
        changes: 'Updated onboarding guide',
        updatedBy: { _id: userId, name: userName, email: userEmail },
        updatedAt: new Date()
      });
      
      if (projectOverview) onboarding.projectOverview = projectOverview;
      if (development) onboarding.development = development;
      if (git) onboarding.git = git;
      if (deployment) onboarding.deployment = deployment;
      if (team) onboarding.team = team;
      if (documentation) onboarding.documentation = documentation;
      onboarding.lastUpdatedBy = { _id: userId, name: userName, email: userEmail };
      onboarding.version = newVersion;
      onboarding.updatedAt = new Date();
      
      await onboarding.save();
    } else {
      // Create new
      onboarding = await ProjectOnboarding.create({
        projectId,
        projectOverview: projectOverview || {},
        development: development || {},
        git: git || {},
        deployment: deployment || {},
        team: team || {},
        documentation: documentation || {},
        createdBy: { _id: userId, name: userName, email: userEmail },
        lastUpdatedBy: { _id: userId, name: userName, email: userEmail },
        version: 1,
        versions: [{
          version: 1,
          changes: 'Initial onboarding guide',
          updatedBy: { _id: userId, name: userName, email: userEmail },
          updatedAt: new Date()
        }]
      });
    }

    return NextResponse.json({ onboarding }, { status: 201 });
  } catch (error) {
    console.error('Error saving onboarding:', error);
    return NextResponse.json({ message: 'Failed to save onboarding' }, { status: 500 });
  }
}
