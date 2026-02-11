#!/usr/bin/env python3
"""
Replace console.log/warn/error with this.logger calls in goferMigrator.ts

Rules:
- console.log with 'Starting...' or entry patterns → this.logger.info
- console.log with 'Successfully', 'complete', 'Installed', 'Updated' → this.logger.info
- console.log with path details, counts, per-item copies → this.logger.debug
- console.error → this.logger.error
- console.warn → this.logger.warn

Strip the [FunctionName] prefix from messages since Logger.for() already tags the component.
"""

import re
import sys

filepath = sys.argv[1]

with open(filepath, 'r') as f:
    content = f.read()

lines = content.split('\n')
changes = []

# Info-level keywords (function entry/completion)
INFO_PATTERNS = [
    'Starting...', 'Starting', 'complete', 'Complete', 'Complete!',
    'Successfully', 'Installed', 'Installation complete',
    'Sync complete', 'Update complete', 'Manual setup complete',
    'initialization', 'Starting initialization',
    'Installing bundled', 'Syncing missing',
    'cancelled', 'User cancelled',
    'Checking for', 'All critical resources present',
]

def is_info_level(msg):
    """Determine if a log message should be info vs debug level."""
    for pattern in INFO_PATTERNS:
        if pattern.lower() in msg.lower():
            return True
    # Function-level step messages like '[Gofer] Installing bundled resources...'
    if msg.strip().startswith('[Gofer'):
        return True
    return False

def strip_prefix(msg):
    """Remove [FunctionName] prefix from log messages."""
    # Match patterns like '[copyBundledTemplates] ' or '[Gofer Update] ' or '[Fix Paths] '
    stripped = re.sub(r'^\[[\w\s\-\.v]+\]\s*', '', msg)
    return stripped if stripped else msg

def process_line(line, line_num):
    """Process a single line, returning (new_line, changed, description)."""
    stripped = line.lstrip()
    indent = line[:len(line) - len(stripped)]

    # Skip lines that are already using logger
    if 'this.logger.' in line:
        return line, False, None

    # Handle console.error with error object
    # console.error('[prefix] message:', error)
    m = re.match(r"console\.error\('(\[[\w\s\-\.v]+\]\s*.*?)'(?:,\s*(.+))?\);", stripped)
    if m:
        msg = strip_prefix(m.group(1))
        extra = m.group(2)
        if extra:
            new_line = f"{indent}this.logger.error('{msg}', {extra} as Error);"
        else:
            new_line = f"{indent}this.logger.error('{msg}');"
        return new_line, True, f"L{line_num}: console.error → logger.error"

    # Handle console.error with template literal
    m = re.match(r"console\.error\(`(\[[\w\s\-\.v]+\]\s*.*?)`(?:,\s*(.+))?\);", stripped)
    if m:
        msg = strip_prefix(m.group(1))
        extra = m.group(2)
        if extra:
            new_line = f"{indent}this.logger.error(`{msg}`, {extra} as Error);"
        else:
            new_line = f"{indent}this.logger.error(`{msg}`);"
        return new_line, True, f"L{line_num}: console.error → logger.error"

    # Handle console.warn with string literal
    m = re.match(r"console\.warn\('(\[[\w\s\-\.v]+\]\s*.*?)'\);", stripped)
    if m:
        msg = strip_prefix(m.group(1))
        new_line = f"{indent}this.logger.warn('{msg}');"
        return new_line, True, f"L{line_num}: console.warn → logger.warn"

    # Handle console.warn with template literal
    m = re.match(r"console\.warn\(`(\[[\w\s\-\.v]+\]\s*.*?)`\);", stripped)
    if m:
        msg = strip_prefix(m.group(1))
        new_line = f"{indent}this.logger.warn(`{msg}`);"
        return new_line, True, f"L{line_num}: console.warn → logger.warn"

    # Handle simple console.log with single string
    # console.log('[prefix] message');
    m = re.match(r"console\.log\('(\[[\w\s\-\.v]+\]\s*.*?)'\);", stripped)
    if m:
        full_msg = m.group(1)
        msg = strip_prefix(full_msg)
        level = 'info' if is_info_level(full_msg) else 'debug'
        new_line = f"{indent}this.logger.{level}('{msg}');"
        return new_line, True, f"L{line_num}: console.log → logger.{level}"

    # Handle console.log with template literal
    # console.log(`[prefix] message ${var}`);
    m = re.match(r"console\.log\(`(\[[\w\s\-\.v]+\]\s*.*?)`\);", stripped)
    if m:
        full_msg = m.group(1)
        msg = strip_prefix(full_msg)
        level = 'info' if is_info_level(full_msg) else 'debug'
        new_line = f"{indent}this.logger.{level}(`{msg}`);"
        return new_line, True, f"L{line_num}: console.log → logger.{level}"

    # Handle console.log with string + extra args
    # console.log('[prefix] message', var);
    # console.log('[prefix] message', count, 'items');
    m = re.match(r"console\.log\('(\[[\w\s\-\.v]+\]\s*.*?)'(?:,\s*(.+))?\);", stripped)
    if m:
        full_msg = m.group(1)
        msg = strip_prefix(full_msg)
        extra = m.group(2)
        level = 'info' if is_info_level(full_msg) else 'debug'
        if extra:
            # Convert to template literal or structured data
            new_line = f"{indent}this.logger.{level}('{msg}', {{ data: [{extra}] }});"
        else:
            new_line = f"{indent}this.logger.{level}('{msg}');"
        return new_line, True, f"L{line_num}: console.log → logger.{level}"

    return line, False, None

new_lines = []
total_changes = 0
change_log = []

# Track multi-line console.log calls
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.lstrip()
    indent = line[:len(line) - len(stripped)]

    # Handle multi-line console.log (spans 2-4 lines)
    if ('console.log(' in stripped or 'console.error(' in stripped or 'console.warn(' in stripped) and not stripped.rstrip().endswith(';'):
        # Collect the full statement
        full_stmt = stripped
        j = i + 1
        while j < len(lines) and ';' not in full_stmt:
            full_stmt += ' ' + lines[j].strip()
            j += 1

        # Now process the full statement as a single line
        new_line, changed, desc = process_line(indent + full_stmt, i + 1)
        if changed:
            new_lines.append(new_line)
            total_changes += 1
            change_log.append(desc)
            i = j  # Skip the consumed lines
            continue
        else:
            # Couldn't process multi-line - keep original lines
            for k in range(i, j):
                new_lines.append(lines[k])
            i = j
            continue

    new_line, changed, desc = process_line(line, i + 1)
    new_lines.append(new_line)
    if changed:
        total_changes += 1
        change_log.append(desc)
    i += 1

with open(filepath, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"Total changes: {total_changes}")
for entry in change_log:
    print(f"  {entry}")
