/**
 * Cloudflare Worker — /run slash command
 *
 * Recebe slash commands do Slack e faz trigger de GitHub Actions workflows.
 *
 * Comandos:
 *   /run jobs          → job-scanner-coimbra (scraper.js)
 *   /run strava        → Sync-Strava
 *   /run infostu       → Infoestudante-Sync (sync-gmail-notion)
 *   /run daily         → notion-updater (slack-notify daily)
 *   /run weekly        → notion-updater (slack-notify weekly)
 *   /run deadline      → notion-updater (slack-notify deadline)
 *   /run help          → lista de comandos
 */

// ─── Mapeamento comando → workflow ────────────────────────────────────────────
const WORKFLOWS = {
  jobs: {
    repo: "work-search",
    workflow: "job-scanner.yml",
    description: "📦 Job Scanner — Coimbra",
  },
  strava: {
    repo: "Sync-Strava",
    workflow: "sync.yml",
    description: "🏃 Sync Strava → Notion",
  },
  infostu: {
    repo: "Infoestudante-Sync",
    workflow: "sync-gmail-notion.yml",
    description: "📧 Sync Gmail (NONIO) → Notion",
  },
  daily: {
    repo: "Infoestudante-Sync",
    workflow: "slack-notify.yml",
    description: "☀️ Slack Notify — Daily Digest",
    inputs: { mode: "daily" },
  },
  weekly: {
    repo: "Infoestudante-Sync",
    workflow: "slack-notify.yml",
    description: "📊 Slack Notify — Resumo Semanal",
    inputs: { mode: "weekly" },
  },
  deadline: {
    repo: "Infoestudante-Sync",
    workflow: "slack-notify.yml",
    description: "⚠️ Slack Notify — Alertas de Deadline",
    inputs: { mode: "deadline" },
  },
};

// ─── Verificação da assinatura Slack ─────────────────────────────────────────
async function verifySlackSignature(request, body, signingSecret) {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const slackSignature = request.headers.get("x-slack-signature");

  if (!timestamp || !slackSignature) return false;

  // Rejeitar requests com mais de 5 minutos (replay attack)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sigBasestring)
  );
  const hex = "v0=" + Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === slackSignature;
}

// ─── Trigger GitHub Actions workflow ─────────────────────────────────────────
async function triggerWorkflow(repo, workflow, inputs, env) {
  const url = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${repo}/actions/workflows/${workflow}/dispatches`;

  const body = { ref: "main" };
  if (inputs && Object.keys(inputs).length > 0) {
    body.inputs = inputs;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "slack-github-worker",
    },
    body: JSON.stringify(body),
  });

  return response.status; // 204 = sucesso
}

// ─── Formatar mensagem de ajuda ───────────────────────────────────────────────
function helpMessage() {
  const lines = ["*Comandos disponíveis:*", ""];
  for (const [cmd, info] of Object.entries(WORKFLOWS)) {
    lines.push(`• \`/run ${cmd}\` — ${info.description}`);
  }
  return lines.join("\n");
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const rawBody = await request.text();

    // Verificar assinatura Slack
    const valid = await verifySlackSignature(request, rawBody, env.SLACK_SIGNING_SECRET);
    if (!valid) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parsear o body (application/x-www-form-urlencoded)
    const params = new URLSearchParams(rawBody);
    const text = (params.get("text") || "").trim().toLowerCase();
    const responseUrl = params.get("response_url");

    // Comando: /run help
    if (!text || text === "help") {
      return Response.json({ response_type: "ephemeral", text: helpMessage() });
    }

    // Encontrar workflow
    const workflow = WORKFLOWS[text];
    if (!workflow) {
      return Response.json({
        response_type: "ephemeral",
        text: `❌ Comando desconhecido: \`${text}\`\n\n${helpMessage()}`,
      });
    }

    // ctx.waitUntil garante que o Worker não termina antes de enviar o resultado ao Slack
    ctx.waitUntil(
      triggerWorkflow(workflow.repo, workflow.workflow, workflow.inputs || {}, env)
        .then(async (status) => {
          const msg =
            status === 204
              ? `✅ *${workflow.description}* iniciado com sucesso!\n_Verifica o canal em breve para o resultado._`
              : `❌ Erro ao iniciar *${workflow.description}* (HTTP ${status})\n_Verifica o GitHub Actions._`;

          if (responseUrl) {
            await fetch(responseUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ response_type: "in_channel", text: msg }),
            });
          }
        })
        .catch(async (err) => {
          if (responseUrl) {
            await fetch(responseUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                response_type: "ephemeral",
                text: `❌ Erro inesperado: ${err.message}`,
              }),
            });
          }
        })
    );

    // Resposta imediata ao Slack (obrigatório < 3s)
    return Response.json({
      response_type: "ephemeral",
      text: `⏳ A iniciar *${workflow.description}*...`,
    });
  },
};
