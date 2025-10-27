# Troubleshooting Guide

## Common Issues

### WhatsApp QR Scan
- Run orchestrator, scan QR code within 60 seconds
- Session persists in `.specify/.whatsapp-session`

### Claude API Rate Limits
- Default: 60 req/min
- Cost tracking in logs
- Check `ANTHROPIC_API_KEY` environment variable

### File Conflicts
- Last-write-wins strategy
- Check WARNING logs for conflicts
- mtime tracking prevents data loss

### Task Failures
- Max 3 retries (10s, 30s, 2min intervals)
- Check `.specify/.orchestrator.log`
- Review constitution validation errors

## Log Analysis
```bash
# View orchestrator logs
tail -f .specify/.orchestrator.log | jq

# Check notification failures
cat .specify/.notifications.log | jq

# Monitor task execution
grep "task_" .specify/.orchestrator.log | jq
```

## Performance
- Startup: <2s for <50 specs
- File change detection: <300ms
- Task iteration: <30s average
