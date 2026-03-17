# slack-github-runner

Cloudflare Worker que recebe slash commands do Slack e faz trigger de GitHub Actions workflows via API. Sem servidor, sem custos — corre no plano gratuito do Cloudflare.

## Comandos disponíveis

| Comando | Workflow | Repo |
|---------|----------|------|
| `/run jobs` | job-scanner.yml | work-search |
| `/run strava` | sync.yml | Sync-Strava |
| `/run infostu` | sync-gmail-notion.yml | Infoestudante-Sync |
| `/run daily` | slack-notify.yml (daily) | Infoestudante-Sync |
| `/run weekly` | slack-notify.yml (weekly) | Infoestudante-Sync |
| `/run deadline` | slack-notify.yml (deadline) | Infoestudante-Sync |
| `/run help` | — | lista de comandos |

## Como funciona

1. Escreves `/run jobs` no Slack
2. O Slack envia um POST para o Cloudflare Worker
3. O Worker valida a assinatura HMAC-SHA256 do Slack
4. O Worker chama a GitHub API para fazer trigger do workflow
5. Recebes `⏳ A iniciar...` imediatamente no Slack
6. Quando o workflow termina, o resultado chega ao canal via webhook

## Setup

### 1. Instalar Node.js e Wrangler

Vai a [nodejs.org](https://nodejs.org) e instala a versão **LTS**. Depois:

```bash
npm install -g wrangler
wrangler login
```

### 2. Deploy

```bash
git clone https://github.com/m4x95pt/slack-github-runner
cd slack-github-runner
wrangler deploy
```

Guarda o URL que aparece no final:
```
https://slack-github-runner.m4x95pt.workers.dev
```

### 3. Adicionar os secrets

> ⚠️ Usa sempre `wrangler secret put` — secrets adicionados pelo dashboard do Cloudflare são apagados a cada deploy.

```bash
wrangler secret put GITHUB_USERNAME
# valor: m4x95pt

wrangler secret put GITHUB_TOKEN
# Fine-grained PAT com Actions: Read and Write em todos os repos

wrangler secret put SLACK_SIGNING_SECRET
# Basic Information do teu Slack App
```

**Para criar o GitHub Token:**
1. Vai a [github.com/settings/tokens](https://github.com/settings/tokens) → **Fine-grained tokens** → **Generate new token**
2. **Repository access** → All repositories
3. **Permissions** → **Actions** → **Read and Write**

### 4. Criar o Slack App

1. Vai a [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **Basic Information** → copia o **Signing Secret** (para o `wrangler secret put SLACK_SIGNING_SECRET`)
3. **Slash Commands** → **Create New Command**:
   - Command: `/run`
   - Request URL: `https://slack-github-runner.m4x95pt.workers.dev`
   - Usage hint: `jobs | strava | infostu | daily | weekly | deadline | help`
4. **Install App** → **Install to Workspace** → **Allow**

## Adicionar novos comandos

Edita o objeto `WORKFLOWS` no `worker.js`:

```javascript
meucomando: {
  repo: "nome-do-repo",
  workflow: "ficheiro.yml",
  description: "Descrição para o Slack",
  inputs: { chave: "valor" }, // opcional
},
```

Depois faz deploy novamente:

```bash
wrangler deploy
```

## Secrets necessários

| Secret | Descrição |
|--------|-----------|
| `GITHUB_USERNAME` | Username do GitHub (ex: `m4x95pt`) |
| `GITHUB_TOKEN` | Fine-grained PAT com Actions: Read and Write |
| `SLACK_SIGNING_SECRET` | Signing Secret do Slack App |
