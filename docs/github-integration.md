# GitHub Integration Documentation

## Overview

The HRM system includes a GitHub integration that automatically updates task statuses based on branch creation events. When a developer creates a branch with a ticket number in its name, the corresponding task automatically moves to "in progress" status.

## Features

- **OAuth Authentication**: Secure GitHub OAuth flow for user authentication
- **Repository Connection**: Connect any GitHub repository to a project
- **Automatic Webhook Setup**: Automatically configures webhooks when connecting a repository
- **Branch Name Parsing**: Extracts ticket numbers from branch names using multiple patterns
- **Automatic Status Updates**: Moves tasks to "in progress" when matching branches are created
- **Activity Logging**: Adds comments to tasks when status changes via GitHub integration

## Setup Instructions

### 1. GitHub OAuth App Configuration

1. Go to GitHub Developer Settings: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the required fields:
   - **Application name**: HRM System (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (development) or your production URL
   - **Authorization callback URL**: `http://localhost:3000/api/github/callback` (development) or `https://yourdomain.com/api/github/callback` (production)
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Environment Configuration

Add the following variables to your `.env.local` file:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback

# GitHub Webhook Secret (generate a random string)
GITHUB_WEBHOOK_SECRET=your_random_webhook_secret_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Webhook Configuration

The system automatically creates webhooks when you connect a repository. However, if you need to configure webhooks manually:

1. Go to your repository settings on GitHub
2. Navigate to "Webhooks" → "Add webhook"
3. Set:
   - **Payload URL**: `http://localhost:3000/api/github/webhook` (or your production URL)
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET` value
   - **Events**: Select "Create" events (specifically branch creation)

## Usage

### Connecting a Repository to a Project

1. Navigate to a project's settings page
2. Find the "GitHub Integration" section
3. Click "Authenticate with GitHub"
4. Authorize the application on GitHub
5. Click "Select Repository" to view your available repositories
6. Select a repository and click "Connect Repository"
7. The system will automatically configure webhooks

### Branch Naming Conventions

The system supports multiple ticket number patterns in branch names:

- **Standard format**: `TASK-123`, `PROJ-456`, `BUG-789`
- **Hash format**: `#123`, `#456`
- **Numeric format**: `123`, `456` (at least 3 digits)

Examples of valid branch names:
- `feature/TASK-123-user-authentication`
- `bugfix/PROJ-456-fix-login-issue`
- `hotfix/#123-security-patch`
- `feature/456-add-dashboard`

### Automatic Status Updates

When a branch is created:

1. GitHub sends a webhook event to the system
2. The system verifies the webhook signature for security
3. The branch name is parsed for a ticket number
4. The system finds the corresponding task in the connected project
5. If found, the task status is updated to "in progress"
6. A comment is added to the task documenting the change

Example comment:
```
Branch "feature/TASK-123-user-authentication" created by johndoe. 
Task status automatically moved to in progress.
```

## API Endpoints

### GitHub Authentication

#### GET `/api/github/auth`
Initiates the GitHub OAuth flow.

**Response:**
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?..."
}
```

#### GET `/api/github/callback`
Handles the OAuth callback from GitHub.

**Query Parameters:**
- `code`: Authorization code from GitHub
- `state`: State parameter for CSRF protection

### Repository Management

#### GET `/api/github/repos`
Fetches user's GitHub repositories.

**Query Parameters:**
- `accessToken`: GitHub access token
- `org` (optional): Organization name to fetch org repos

**Response:**
```json
{
  "repos": [
    {
      "id": 123456,
      "name": "my-repo",
      "full_name": "username/my-repo",
      "owner": { "login": "username" },
      "html_url": "https://github.com/username/my-repo",
      "private": false
    }
  ]
}
```

#### POST `/api/github/connect`
Connects a GitHub repository to a project.

**Request Body:**
```json
{
  "projectId": "project_id",
  "repoFullName": "username/my-repo",
  "accessToken": "github_access_token"
}
```

#### DELETE `/api/github/connect?projectId=project_id`
Disconnects a GitHub repository from a project.

### Webhook Handler

#### POST `/api/github/webhook`
Handles GitHub webhook events.

**Headers:**
- `x-hub-signature-256`: Webhook signature for verification
- `x-github-event`: Event type (e.g., "create")

**Events Handled:**
- `create` (branch creation)

### Branch Information

#### GET `/api/github/branches`
Fetches branches from a repository with ticket number parsing.

**Query Parameters:**
- `accessToken`: GitHub access token
- `owner`: Repository owner
- `repo`: Repository name

**Response:**
```json
{
  "branches": [
    {
      "name": "feature/TASK-123",
      "commit": { "sha": "...", "url": "..." },
      "ticketNumber": "TASK-123"
    }
  ]
}
```

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using HMAC-SHA256 signatures
2. **Token Storage**: Access tokens are stored temporarily in session state
3. **Permission Checks**: Only admin/HR/manager roles can connect repositories
4. **Scope Limitation**: OAuth app requests minimal necessary scopes (`repo`, `read:org`, `admin:repo_hook`)

## Troubleshooting

### Webhook Not Triggering

1. Check that the webhook is properly configured in GitHub repository settings
2. Verify the `GITHUB_WEBHOOK_SECRET` matches between your `.env` and GitHub webhook settings
3. Ensure your server is publicly accessible (use ngrok for local development)
4. Check server logs for webhook processing errors

### Task Not Updating

1. Verify the branch name contains a recognizable ticket number
2. Ensure the task exists in the connected project
3. Check that the task number matches exactly (case-insensitive)
4. Review server logs for parsing errors

### OAuth Issues

1. Verify the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
2. Ensure the callback URL matches exactly what's configured in GitHub OAuth app
3. Check that the redirect URI is properly URL-encoded

### Repository Connection Issues

1. Verify the user has admin access to the repository
2. Ensure the OAuth token has the necessary scopes
3. Check that the repository is not already connected to another project

## Development Notes

### Local Development with ngrok

For local development, use ngrok to expose your local server to GitHub webhooks:

```bash
ngrok http 3000
```

Then update your environment variables:
```env
GITHUB_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/github/callback
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

### Testing Webhooks Locally

You can test webhooks using GitHub's webhook delivery feature or by creating branches manually.

## Future Enhancements

Potential improvements for the integration:

- Pull request status updates (merge → completed)
- Commit message parsing for status updates
- Multiple repository connections per project
- Custom branch naming patterns
- Task creation from GitHub issues
- Two-way sync (task status → GitHub labels)
