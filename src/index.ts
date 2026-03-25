import * as core from '@actions/core';
import * as https from 'https';

const WEBHOOK_URL = 'https://hook.notilens.com/webhook/%s/send';
const VERSION     = '1.0.0';

const SUCCESS_EVENTS = new Set([
  'task.completed', 'ai.response.generated', 'input.approved',
]);

const URGENT_EVENTS = new Set([
  'task.failed', 'task.timeout', 'task.error', 'task.terminated', 'ai.response.failed',
]);

const WARNING_EVENTS = new Set([
  'task.retrying', 'task.cancelled', 'input.required', 'input.rejected',
]);

const ACTIONABLE_EVENTS = new Set([
  'task.error', 'task.failed', 'task.timeout', 'task.retrying', 'task.loop',
  'ai.response.failed', 'input.required', 'input.rejected',
]);

function getEventType(event: string): string {
  if (SUCCESS_EVENTS.has(event)) return 'success';
  if (URGENT_EVENTS.has(event))  return 'urgent';
  if (WARNING_EVENTS.has(event)) return 'warning';
  return 'info';
}

async function send(token: string, secret: string, payload: object): Promise<void> {
  const body     = JSON.stringify(payload);
  const endpoint = WEBHOOK_URL.replace('%s', token);
  const url      = new URL(endpoint);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port:     443,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'X-NOTILENS-KEY': secret,
        'User-Agent':     `NotiLens-Action/${VERSION}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      res.resume();
      resolve();
    });

    const timer = setTimeout(() => req.destroy(new Error('timeout')), 10_000);
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.on('close', () => clearTimeout(timer));
    req.write(body);
    req.end();
  });
}

async function run(): Promise<void> {
  const token   = core.getInput('token',   { required: true });
  const secret  = core.getInput('secret',  { required: true });
  const agent   = core.getInput('agent',   { required: true });
  const event   = core.getInput('event',   { required: true });
  const message = core.getInput('message') || `${event}`;
  const taskId  = core.getInput('task_id') || `run_${process.env.GITHUB_RUN_ID ?? Date.now()}`;
  const typeOverride = core.getInput('type');
  const tags    = core.getInput('tags');
  const openUrl = core.getInput('open_url')  ||
    (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '');

  const validTypes = ['info', 'success', 'warning', 'urgent'];
  const ntype = (typeOverride && validTypes.includes(typeOverride))
    ? typeOverride
    : getEventType(event);

  const title = `${agent} | ${taskId} | ${event}`;

  const meta: Record<string, string> = {};
  if (process.env.GITHUB_WORKFLOW)    meta.workflow    = process.env.GITHUB_WORKFLOW;
  if (process.env.GITHUB_REPOSITORY)  meta.repository  = process.env.GITHUB_REPOSITORY;
  if (process.env.GITHUB_REF_NAME)    meta.branch      = process.env.GITHUB_REF_NAME;
  if (process.env.GITHUB_SHA)         meta.commit      = process.env.GITHUB_SHA.slice(0, 7);
  if (process.env.GITHUB_ACTOR)       meta.actor       = process.env.GITHUB_ACTOR;
  if (process.env.GITHUB_EVENT_NAME)  meta.trigger     = process.env.GITHUB_EVENT_NAME;

  const payload = {
    event,
    title,
    message,
    type:          ntype,
    agent,
    task_id:       taskId,
    is_actionable: ACTIONABLE_EVENTS.has(event),
    image_url:     core.getInput('image_url'),
    open_url:      openUrl,
    download_url:  core.getInput('download_url'),
    tags,
    ts:            Date.now() / 1000,
    meta,
  };

  try {
    await send(token, secret, payload);
    core.info(`NotiLens: sent ${event} for agent '${agent}'`);
  } catch (err) {
    // Don't fail the workflow — notification is non-critical
    core.warning(`NotiLens: failed to send notification — ${(err as Error).message}`);
  }
}

run();
