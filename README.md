# NotiLens Notify Action

Send notifications to [NotiLens](https://www.notilens.com) from your GitHub Actions workflows.

Get notified on your phone when a build completes, fails, or needs your input.

---

## Setup

1. Get your **token** and **secret** from the [NotiLens dashboard](https://www.notilens.com)
2. Add them as GitHub secrets: `NOTILENS_TOKEN` and `NOTILENS_SECRET`

---

## Usage

### Notify on build complete / fail

```yaml
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Notify start
        uses: notilens/notify-action@v1
        with:
          token:   ${{ secrets.NOTILENS_TOKEN }}
          secret:  ${{ secrets.NOTILENS_SECRET }}
          agent:   my-ci
          event:   task.started
          message: Build started

      - name: Run tests
        run: npm test

      - name: Notify success
        if: success()
        uses: notilens/notify-action@v1
        with:
          token:   ${{ secrets.NOTILENS_TOKEN }}
          secret:  ${{ secrets.NOTILENS_SECRET }}
          agent:   my-ci
          event:   task.completed
          message: Build passed ✓

      - name: Notify failure
        if: failure()
        uses: notilens/notify-action@v1
        with:
          token:   ${{ secrets.NOTILENS_TOKEN }}
          secret:  ${{ secrets.NOTILENS_SECRET }}
          agent:   my-ci
          event:   task.failed
          message: Build failed
```

### Notify on deployment

```yaml
- name: Notify deploy
  uses: notilens/notify-action@v1
  with:
    token:   ${{ secrets.NOTILENS_TOKEN }}
    secret:  ${{ secrets.NOTILENS_SECRET }}
    agent:   deploy
    event:   task.completed
    message: Deployed to production
    tags:    deploy,production
    open_url: https://myapp.com
```

### Custom event (e.g. scheduled job)

```yaml
- name: Notify
  uses: notilens/notify-action@v1
  with:
    token:   ${{ secrets.NOTILENS_TOKEN }}
    secret:  ${{ secrets.NOTILENS_SECRET }}
    agent:   cron-jobs
    event:   emit
    message: Nightly backup completed — 3.2GB
    task_id: backup_${{ github.run_id }}
```

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `token` | **yes** | NotiLens topic token |
| `secret` | **yes** | NotiLens topic secret |
| `agent` | **yes** | Agent name (identifies the sender) |
| `event` | **yes** | Event type (see below) |
| `message` | no | Notification message |
| `task_id` | no | Task ID — defaults to GitHub run ID |
| `type` | no | Override type: `info` `success` `warning` `urgent` |
| `tags` | no | Comma-separated tags |
| `open_url` | no | URL to open — defaults to workflow run URL |
| `image_url` | no | Image URL to attach |
| `download_url` | no | Download URL to attach |

---

## Event Types

| Event | Notification Type | When to use |
|-------|-------------------|-------------|
| `task.started` | info | Job/workflow started |
| `task.completed` | success | Job succeeded |
| `task.failed` | urgent | Job failed |
| `task.timeout` | urgent | Job timed out |
| `task.cancelled` | warning | Job cancelled |
| `task.error` | urgent | Non-fatal error |
| `input.required` | warning | Waiting for approval |
| `ai.response.generated` | success | AI step completed |
| `ai.response.failed` | urgent | AI step failed |
| `emit` | info | Any custom event |

---

## Auto-included Metadata

The action automatically adds GitHub context to every notification:

- `workflow` — workflow name
- `repository` — owner/repo
- `branch` — ref name
- `commit` — short SHA
- `actor` — who triggered it
- `trigger` — push, pull_request, schedule, etc.

---

## License

MIT — [notilens.com](https://www.notilens.com)
