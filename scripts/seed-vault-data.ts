import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import Project from '../models/Project';
import ProjectDocument from '../models/ProjectDocument';
import ProjectNote from '../models/ProjectNote';
import ProjectCredential from '../models/ProjectCredential';
import ProjectResource from '../models/ProjectResource';
import ProjectQuickAccess from '../models/ProjectQuickAccess';
import User from '../models/User';
import { encrypt } from '../lib/security/encryption';

async function seedVault() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const projects = await Project.find({});
  if (projects.length === 0) {
    console.error('No projects found in database to seed vault data.');
    process.exit(1);
  }

  const user =
    (await User.findOne({ role: { $in: ['admin', 'super_admin', 'manager'] } })) ||
    (await User.findOne({}));

  const authorInfo = {
    _id: user?._id?.toString() || '000000000000000000000001',
    name: user?.name || 'Anirudh Bhardwaj',
    email: user?.email || 'anirudh@abacasys.com',
  };

  console.log(`Found ${projects.length} project(s). Seeding vault data...`);

  for (const project of projects) {
    const projectId = project._id;
    console.log(`\nSeeding Vault for: "${project.name}" (${projectId.toString()})`);

    // 1. Documents
    const existingDocs = await ProjectDocument.countDocuments({ projectId });
    if (existingDocs === 0) {
      await ProjectDocument.insertMany([
        {
          projectId,
          title: 'Cloud Architecture & Topology Specification v2.4',
          description: 'High-level cloud topology, microservice communication patterns, and caching layers.',
          notes: 'Approved by Architecture Review Board on Q3 2026.',
          tags: ['architecture', 'microservices', 'cloud', 'spec'],
          category: 'Architecture',
          fileUrl: '/uploads/sample-architecture-spec.pdf',
          fileName: 'Architecture_Specification_v2.4.pdf',
          fileSize: 2450000,
          fileType: 'application/pdf',
          version: 1,
          versions: [
            {
              version: 1,
              fileUrl: '/uploads/sample-architecture-spec.pdf',
              fileName: 'Architecture_Specification_v2.4.pdf',
              fileSize: 2450000,
              uploadedBy: authorInfo,
              uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              changeNotes: 'Initial RFC specification approved by team',
            },
          ],
          uploadedBy: authorInfo,
          isFavorite: true,
          isDeleted: false,
          comments: [],
        },
        {
          projectId,
          title: 'Security Compliance & SOC2 Type II Audit Manual',
          description: 'Third-party pentest summary, role-based access control matrix, and encryption standards.',
          notes: 'Annual audit pass certificate attached.',
          tags: ['security', 'compliance', 'soc2', 'audit'],
          category: 'SOP',
          fileUrl: '/uploads/security-soc2-audit.pdf',
          fileName: 'Security_Compliance_Report_2026.pdf',
          fileSize: 1850000,
          fileType: 'application/pdf',
          version: 1,
          versions: [],
          uploadedBy: authorInfo,
          isFavorite: true,
          isDeleted: false,
          comments: [],
        },
        {
          projectId,
          title: 'REST API & OpenAPI 3.1 Swagger Specification',
          description: 'Full contract specification for external client integration and webhooks.',
          notes: 'Includes authentication headers and error code taxonomy.',
          tags: ['api', 'openapi', 'swagger', 'contract'],
          category: 'API',
          fileUrl: '/uploads/openapi-spec.json',
          fileName: 'API_Gateway_OpenAPI_Schema.json',
          fileSize: 420000,
          fileType: 'application/json',
          version: 1,
          versions: [],
          uploadedBy: authorInfo,
          isFavorite: false,
          isDeleted: false,
          comments: [],
        },
        {
          projectId,
          title: 'NexusHR Brand Identity & Design Tokens',
          description: 'Exported Figma color palettes, typography scale, component tokens, and SVG icons.',
          notes: 'For frontend developers implementing theme overrides.',
          tags: ['design', 'tokens', 'figma', 'assets'],
          category: 'Design',
          fileUrl: '/uploads/brand-design-tokens.zip',
          fileName: 'Brand_Assets_and_Design_Tokens.zip',
          fileSize: 12400000,
          fileType: 'application/zip',
          version: 1,
          versions: [],
          uploadedBy: authorInfo,
          isFavorite: false,
          isDeleted: false,
          comments: [],
        },
        {
          projectId,
          title: 'Sprint Planning & Release Roadmap 2026',
          description: 'Quarterly milestone tracking, capacity estimations, and dependency graphs.',
          notes: 'Synced with product management board.',
          tags: ['roadmap', 'sprint', 'planning'],
          category: 'Plan',
          fileUrl: '/uploads/sprint-roadmap.xlsx',
          fileName: 'Sprint_Planning_and_Product_Roadmap.xlsx',
          fileSize: 850000,
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          version: 1,
          versions: [],
          uploadedBy: authorInfo,
          isFavorite: false,
          isDeleted: false,
          comments: [],
        },
      ]);
      console.log('  + Inserted 5 Project Documents.');
    } else {
      console.log(`  - Project already has ${existingDocs} Documents.`);
    }

    // 2. Notes
    const existingNotes = await ProjectNote.countDocuments({ projectId });
    if (existingNotes === 0) {
      await ProjectNote.insertMany([
        {
          projectId,
          title: 'ADR-014: Subdomain-Driven PMS Studio Architecture',
          content: `### Architecture Decision Record (ADR-014)\n\n**Status**: Accepted\n**Context**:\nThe Project Management System (PMS) requires an uninterrupted, distraction-free workspace capable of hosting multi-tier Kanban boards, interactive sprint planning, and deep team collaboration tools without standard dashboard layout constraints.\n\n**Decision**:\nWe adopted a dedicated subdomain routing model:\n1. Main suite operates on \`localhost:3000\` / \`domain.com\`.\n2. PMS Studio runs exclusively on \`pms.localhost:3000\` / \`pms.domain.com\`.\n3. Middleware seamlessly verifies cookies across subdomains with cross-domain session token exchange.\n4. All deprecated \`?fullscreen=true\` URL queries are cleaned and redirected automatically.\n\n**Consequences**:\n- Complete clean viewport for Kanban and Sprint charts.\n- Zero URL clutter and clean browser tabs.\n- Full security isolation with edge JWT verification.`,
          tags: ['architecture', 'adr', 'routing', 'pms'],
          category: 'Decisions',
          isPinned: true,
          isFavorite: true,
          versions: [],
          createdBy: authorInfo,
          lastEditedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'Weekly Engineering Sync & Milestone Delivery Review',
          content: `### Sprint Progress & Highlights\n- **Subdomain Routing & Session Bridge**: Complete and verified across browsers.\n- **Kanban Board Drag-and-Drop**: Fluid response times reduced to under 16ms using optimistic state updates.\n- **Vault & Asset Manager**: Enhanced UI/UX with rich action cards, quick links, and live tab badges.\n\n**Action Items**:\n- [x] Configure cross-subdomain cookie attributes in production environment.\n- [ ] Implement automated weekly credential rotation reminders via Slack/Discord webhooks.\n- [ ] Connect Figma webhook to auto-sync design token updates into repository.`,
          tags: ['meeting', 'weekly', 'sprint', 'review'],
          category: 'Meeting',
          isPinned: true,
          isFavorite: false,
          versions: [],
          createdBy: authorInfo,
          lastEditedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'Incident Retrospective: Redis Cache Eviction & Cold-Start Latency',
          content: `### Postmortem Summary\n- **Incident**: Temporary latency spike during concurrent payroll export.\n- **Root Cause**: Redis memory threshold exceeded during heavy analytical queries without TTL.\n- **Resolution**: Configured all session and transient caches with strict 24-hour TTL and LRU eviction policy.\n- **Prevention**: Added Datadog alerts at 75% memory utilization.`,
          tags: ['incident', 'postmortem', 'redis', 'performance'],
          category: 'Issues',
          isPinned: false,
          isFavorite: false,
          versions: [],
          createdBy: authorInfo,
          lastEditedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'Security Guidelines: API Token Scope & Rotation Policy',
          content: `All team members must follow strict credential guidelines:\n1. Never commit raw API keys or passwords to version control.\n2. Use the **Vault Credentials** section with automatic AES-256 encryption.\n3. Every external API token must have an assigned expiry date not exceeding 90 days.\n4. Secrets expiring within 30 days trigger automated warning banners in the Vault Dashboard.`,
          tags: ['security', 'tokens', 'policy', 'best-practices'],
          category: 'Guidelines',
          isPinned: false,
          isFavorite: true,
          versions: [],
          createdBy: authorInfo,
          lastEditedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
      ]);
      console.log('  + Inserted 4 Project Notes.');
    } else {
      console.log(`  - Project already has ${existingNotes} Notes.`);
    }

    // 3. Credentials
    const existingCreds = await ProjectCredential.countDocuments({ projectId });
    if (existingCreds === 0) {
      await ProjectCredential.insertMany([
        {
          projectId,
          service: 'AWS Cloud Production',
          environment: 'Production',
          category: 'Cloud',
          loginUrl: 'https://console.aws.amazon.com',
          username: 'nexushr-prod-admin',
          email: 'cloud-infra@abacasys.com',
          encryptedPassword: encrypt('SecureAWS#Prod2026!Vault'),
          encryptedApiKey: encrypt('AKIAIOSFODNN7EXAMPLE'),
          encryptedSecretKey: encrypt('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
          encryptedNotes: encrypt('Primary AWS production account hosting ECS microservices and S3 assets.'),
          tags: ['aws', 'prod', 'cloud', 'iam'],
          isFavorite: true,
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          usageHistory: [],
        },
        {
          projectId,
          service: 'GitHub Actions CI/CD Runner',
          environment: 'Development',
          category: 'Infrastructure',
          loginUrl: 'https://github.com/organizations/nexushr/settings',
          username: 'nexushr-deploy-bot',
          email: 'ci-bot@abacasys.com',
          encryptedAccessToken: encrypt('ghp_984729482749284729482749284729482749'),
          encryptedNotes: encrypt('Scoped personal access token with repo and packages write permissions.'),
          tags: ['github', 'ci', 'token', 'actions'],
          isFavorite: true,
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          usageHistory: [],
        },
        {
          projectId,
          service: 'MongoDB Atlas Dedicated Cluster',
          environment: 'Production',
          category: 'Database',
          loginUrl: 'https://cloud.mongodb.com',
          username: 'db_admin_prod',
          email: 'dba@abacasys.com',
          encryptedPassword: encrypt('MongoAtlas#ClusterM30_Secure!'),
          encryptedNotes: encrypt('MongoDB Atlas M30 replica set connection string and network whitelist access.'),
          tags: ['mongodb', 'database', 'prod', 'cluster'],
          isFavorite: false,
          expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          usageHistory: [],
        },
        {
          projectId,
          service: 'Stripe Payment Gateway API Keys',
          environment: 'Staging',
          category: 'API',
          loginUrl: 'https://dashboard.stripe.com',
          username: 'billing_service_staging',
          email: 'finance-tech@abacasys.com',
          encryptedApiKey: encrypt('pk_test_51Mz94827492847294827492847'),
          encryptedSecretKey: encrypt('sk_test_51Mz94827492847294827492847SECRET'),
          encryptedNotes: encrypt('Staging keys for subscription billing testing and checkout simulations.'),
          tags: ['stripe', 'payments', 'api', 'billing'],
          isFavorite: false,
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          usageHistory: [],
        },
        {
          projectId,
          service: 'Auth0 Enterprise SSO Client Secrets',
          environment: 'Development',
          category: 'Login',
          loginUrl: 'https://manage.auth0.com',
          username: 'auth0-client-app',
          email: 'identity@abacasys.com',
          encryptedApiKey: encrypt('auth0_client_id_89472984729'),
          encryptedSecretKey: encrypt('auth0_secret_98472984729482749284729'),
          encryptedNotes: encrypt('OAuth 2.0 / SAML identity provider client credential for enterprise single sign-on.'),
          tags: ['auth0', 'sso', 'oauth', 'identity'],
          isFavorite: false,
          expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days -> Triggers "Expiring Soon" alert
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          usageHistory: [],
        },
      ]);
      console.log('  + Inserted 5 Project Credentials.');
    } else {
      console.log(`  - Project already has ${existingCreds} Credentials.`);
    }

    // 4. Resources
    const existingResources = await ProjectResource.countDocuments({ projectId });
    if (existingResources === 0) {
      await ProjectResource.insertMany([
        {
          projectId,
          title: 'GitHub Core Monorepo',
          url: 'https://github.com/abacasys/nexushr',
          description: 'Official Git repository containing Next.js frontend, microservices, and Docker manifests.',
          category: 'Git',
          tags: ['github', 'repository', 'code', 'monorepo'],
          isFavorite: true,
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'Figma Design System & UI Components',
          url: 'https://figma.com/@nexushr/design-system',
          description: 'Complete visual guidelines, UI components, iconography, and responsive grid layouts.',
          category: 'Design',
          tags: ['figma', 'design', 'ui-kit', 'tokens'],
          isFavorite: true,
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'NexusHR Swagger & OpenAPI Documentation',
          url: 'https://api.nexushr.com/docs',
          description: 'Interactive API explorer for testing endpoints, viewing payload schemas, and headers.',
          category: 'API',
          tags: ['api', 'openapi', 'swagger', 'endpoints'],
          isFavorite: true,
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'Datadog Real-Time APM & Telemetry',
          url: 'https://app.datadoghq.com',
          description: 'Serverless runtime performance tracing, memory profiles, error monitoring, and traffic health.',
          category: 'Monitoring',
          tags: ['datadog', 'apm', 'telemetry', 'metrics'],
          isFavorite: false,
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
        {
          projectId,
          title: 'Vercel Edge Cloud Deployment Console',
          url: 'https://vercel.com/nexushr/dashboard',
          description: 'Live production deployments, edge middleware logs, routing redirects, and DNS configuration.',
          category: 'Hosting',
          tags: ['vercel', 'hosting', 'production', 'edge'],
          isFavorite: false,
          createdBy: authorInfo,
          lastUpdatedBy: authorInfo,
          comments: [],
          viewHistory: [],
        },
      ]);
      console.log('  + Inserted 5 Project Resources.');
    } else {
      console.log(`  - Project already has ${existingResources} Resources.`);
    }

    // 5. Quick Access Links
    const existingQuickAccess = await ProjectQuickAccess.countDocuments({ projectId });
    if (existingQuickAccess === 0) {
      await ProjectQuickAccess.insertMany([
        {
          projectId,
          title: 'NexusHR GitHub Monorepo',
          url: 'https://github.com/abacasys/nexushr',
        },
        {
          projectId,
          title: 'Figma UI Library & Design Tokens',
          url: 'https://figma.com/@nexushr/design-system',
        },
        {
          projectId,
          title: 'Linear Team Sprint Board',
          url: 'https://linear.app/nexushr/team',
        },
        {
          projectId,
          title: 'Datadog Performance & APM',
          url: 'https://app.datadoghq.com',
        },
        {
          projectId,
          title: 'Google Drive Shared Project Assets',
          url: 'https://drive.google.com/drive/folders/nexushr-assets',
        },
      ]);
      console.log('  + Inserted 5 Quick Access Links.');
    } else {
      console.log(`  - Project already has ${existingQuickAccess} Quick Access Links.`);
    }
  }

  console.log('\nVault seeding completed successfully for all projects!');
  await mongoose.disconnect();
  process.exit(0);
}

seedVault().catch((err) => {
  console.error('Vault seed failed:', err);
  process.exit(1);
});
