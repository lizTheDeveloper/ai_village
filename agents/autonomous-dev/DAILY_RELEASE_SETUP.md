# Daily Release Setup Guide

This guide explains how to set up the automated daily release system.

## Overview

The daily release system runs automatically once per day to:
1. **Update wiki documentation** - Keeps docs current with code changes
2. **Validate the build** - Ensures everything compiles and tests pass
3. **Extended playtest** - 15+ minute automated UI testing
4. **Create releases** - Only if everything passes validation

## Components

### 1. Wiki Agent (`prompts/wiki-agent.md`)
- Scans codebase for all game systems
- Generates Minecraft-wiki style documentation
- Updates docs/wiki/ directory
- Documents stats, mechanics, and features

### 2. Release Agent (`prompts/release-agent.md`)
- Validates build and tests
- Runs 15-minute playtest with stability checks
- Generates comprehensive release notes
- Creates git tags and GitHub releases
- **Only releases if playtest passes**

### 3. Daily Release Script (`scripts/daily-release.sh`)
- Orchestrates both agents
- Runs on a schedule (cron)
- Logs everything to `logs/daily-release-YYYYMMDD.log`
- Files bugs if playtest fails

## Schedule Setup

### Option 1: Cron Job (macOS/Linux)

Run releases at 2 AM daily:

```bash
# Edit your crontab
crontab -e

# Add this line (adjust path to your installation):
0 2 * * * /Users/annhoward/src/ai_village/agents/autonomous-dev/scripts/daily-release.sh

# Save and exit
```

**Cron schedule explained:**
- `0` - Minute (0 = top of hour)
- `2` - Hour (2 AM)
- `*` - Day of month (every day)
- `*` - Month (every month)
- `*` - Day of week (every day)

**Other useful schedules:**
```bash
# Every day at 2 AM
0 2 * * * /path/to/daily-release.sh

# Weekdays at 9 AM
0 9 * * 1-5 /path/to/daily-release.sh

# Every 6 hours
0 */6 * * * /path/to/daily-release.sh

# Twice daily: 2 AM and 2 PM
0 2,14 * * * /path/to/daily-release.sh
```

### Option 2: macOS launchd (Recommended for Mac)

Create a plist file: `~/Library/LaunchAgents/com.aivillage.daily-release.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aivillage.daily-release</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Users/annhoward/src/ai_village/agents/autonomous-dev/scripts/daily-release.sh</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/annhoward/src/ai_village/logs/daily-release-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/annhoward/src/ai_village/logs/daily-release-stderr.log</string>

    <key>WorkingDirectory</key>
    <string>/Users/annhoward/src/ai_village/custom_game_engine</string>
</dict>
</plist>
```

Load the job:
```bash
launchctl load ~/Library/LaunchAgents/com.aivillage.daily-release.plist
```

Check status:
```bash
launchctl list | grep aivillage
```

### Option 3: Manual Run (Testing)

Run manually anytime:
```bash
cd /Users/annhoward/src/ai_village/agents/autonomous-dev/scripts
./daily-release.sh
```

## What Happens During Release

### Phase 1: Wiki Update (5-10 min)
1. Agent scans recent commits (last 24 hours)
2. Reads codebase to understand systems
3. Updates/creates wiki pages in `docs/wiki/`
4. Commits wiki changes

### Phase 2: Release Validation (30+ min)
1. **Build Check** (5 min)
   - Clean build: `npm run clean && npm run build`
   - All packages must compile
   - No TypeScript errors

2. **Test Suite** (5 min)
   - Run all tests: `npm test`
   - All tests must pass
   - Check coverage

3. **Extended Playtest** (15+ min)
   - Start game: `npm run dev`
   - **Stability test** (5 min): Monitor for crashes
   - **Feature test** (5 min): Validate core features work
   - **Stress test** (5 min): Run at 8x speed, check memory
   - Uses Playwright MCP for browser automation
   - Checks console every 30 seconds
   - Takes screenshots of any errors

4. **Release Creation** (5 min)
   - Generate comprehensive release notes
   - Categorize commits (features, fixes, etc.)
   - Update RELEASE_NOTES.md
   - Bump version in package.json
   - Create git tag (v1.2.3)
   - Create GitHub release (if gh CLI installed)

### If Playtest Fails

The agent will:
1. **Take screenshots** of the error
2. **Capture console logs**
3. **File a detailed bug report** using template
4. **Save to** `bugs/release-playtest-YYYYMMDD.md`
5. **Abort release** - No release is created
6. **Log everything** for debugging

## Monitoring Releases

### Check Logs
```bash
# View today's release log
tail -f logs/daily-release-$(date +%Y%m%d).log

# View recent logs
ls -lt logs/daily-release-*.log | head -5
```

### Check Release Status
```bash
# See latest release
git describe --tags

# See all releases
git tag -l

# See release notes
cat RELEASE_NOTES.md
```

### Check for Filed Bugs
```bash
# List recent bug reports
ls -lt bugs/release-playtest-*.md
```

## Notifications (Optional)

### Email Notifications

Add to the script (requires `mail` command):
```bash
if [[ $? -eq 0 ]]; then
    echo "Daily release succeeded" | mail -s "AI Village Release OK" you@example.com
else
    echo "Daily release failed. See logs." | mail -s "AI Village Release FAILED" you@example.com
fi
```

### Slack/Discord Webhooks

Add to script:
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Daily release completed successfully!"}' \
  YOUR_WEBHOOK_URL
```

## Troubleshooting

### Cron job not running
```bash
# Check cron is running
sudo launchctl list | grep cron

# Check cron logs (macOS)
log show --predicate 'process == "cron"' --last 1h

# Test script manually first
./scripts/daily-release.sh
```

### Playtest keeps failing
- Check browser compatibility (Chrome recommended)
- Verify Playwright is installed
- Run manual playtest to identify issue
- Check `logs/` for detailed errors

### Wiki not updating
- Verify agent has read access to codebase
- Check recent commits exist
- Run wiki agent manually for debugging

## Best Practices

1. **Review logs daily** - Catch issues early
2. **Monitor release notes** - Verify they're accurate
3. **File issues when playtest fails** - Don't ignore failures
4. **Update wiki templates** - As game grows
5. **Version releases properly** - Major/minor/patch

## FAQ

**Q: What if I want to skip a release?**
A: The system automatically skips if no commits exist. Or disable cron temporarily.

**Q: Can I run it more frequently?**
A: Yes, but 15-min playtests take time. Recommend max 2x/day.

**Q: What if wiki and release both fail?**
A: Check logs, both are independent. Wiki failure doesn't block release.

**Q: How do I manually trigger a release?**
A: Run `./scripts/daily-release.sh` anytime.

## Security Notes

- Script requires git write access (creates tags)
- Script requires npm permissions (runs build/tests)
- Consider running in isolated environment for production
- Review all automated commits before pushing to main

## Support

For issues:
1. Check `logs/daily-release-*.log`
2. Review `bugs/` for filed issues
3. Run manually with verbose logging
4. File bug using `bugs/BUG_TEMPLATE.md`
