# slack-github-runner

## Overview

**slack-github-runner** is a JavaScript solution connecting GitHub Actions workflows to Slack, allowing teams and individuals to trigger builds, tests, and deployments from Slack—and receive detailed status notifications.

## Features

- **Slack Slash Commands:** Start any GitHub workflow by typing commands in Slack.
- **Workflow Monitoring:** Automatic Slack messages for workflow status (queued, running, completed, failed).
- **Custom Alerts:** Notify specific channels/DMs about build results.
- **Multiple Repository Support:** Configure runners for all your GitHub projects from a single Slack workspace.
- **Secure Authentication:** Use GitHub PATs and Slack app tokens for secure operations.
- **Interactive Controls:** Cancel or retry workflows straight from Slack.

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/m4x95pt/slack-github-runner
   cd slack-github-runner
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup Slack App**
   - Create a Slack app ([Slack API documentation](https://api.slack.com/apps)).
   - Add `/github-run`, `/github-status` commands.
   - Set up bot permissions for channels and user DMs.

4. **Configure GitHub**
   - Create a Personal Access Token (PAT) for API calls.
   - Grant permission to trigger workflows and read status.

5. **Configuration**
   - Edit `config.js` or use `.env` for:
     - Slack bot token
     - Slack signing secret
     - GitHub PAT
     - Repositories and allowed workflows

6. **Running the App**
   - Start the server (Express.js or similar):
     ```bash
     npm start
     ```
   - Deploy to cloud (Heroku, AWS, Vercel, etc) or run locally.

## Usage

- In Slack, type:
  ```
  /github-run [repo] [workflow]
  ```
  To trigger the workflow in GitHub.
- Receive live status updates:
  ```
  /github-status [repo] [run_id]
  ```
  To check build/test status.

## Project Structure

```
slack-github-runner/
├── index.js          # Express server entry point
├── slack.js          # Slack command handlers
├── github.js         # GitHub workflow API integration
├── config.js         # Configuration file/environment
├── package.json      # Dependencies
├── README.md
```

## Advanced

- Customize notification templates in Slack.
- Whitelist/blacklist certain workflows or allow only admins to trigger.
- Integrate with other CI/CD tools for expanded Slack DevOps functionality.

## License

MIT License

**Author:** [@m4x95pt](https://github.com/m4x95pt)
