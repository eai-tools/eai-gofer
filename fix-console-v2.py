#!/usr/bin/env python3
"""
Safely replace console.log/warn/error with this.logger calls.
Only modifies lines that START with console.log/warn/error (after whitespace).
Does NOT touch path.join, path.resolve, or any other code.
"""

import re
import sys

filepath = sys.argv[1]

with open(filepath, 'r') as f:
    lines = f.readlines()

INFO_KEYWORDS = [
    'starting', 'complete', 'successfully', 'installed', 'installation',
    'cancelled', 'checking for', 'all critical', 'syncing', 'initializ',
    'creating', 'setting up', 'configuring', 'ensuring', 'updating',
    'fixing', 'copying', 'cleaned up', 'user cancelled',
]

def is_info_level(msg):
    msg_lower = msg.lower()
    for kw in INFO_KEYWORDS:
        if kw in msg_lower:
            return True
    # Version-tagged messages
    if '[gofer' in msg_lower:
        return True
    return False

def strip_bracket_prefix(msg):
    """Remove [FunctionName] prefix."""
    return re.sub(r'^\[[\w\s\-\.v]+\]\s*', '', msg)

new_lines = []
changes = 0
i = 0

while i < len(lines):
    line = lines[i]
    stripped = line.lstrip()
    indent = line[:len(line) - len(stripped)]

    # Skip non-console lines
    if not (stripped.startswith('console.log(') or
            stripped.startswith('console.warn(') or
            stripped.startswith('console.error(')):
        new_lines.append(line)
        i += 1
        continue

    # Collect full statement (may span multiple lines)
    full_stmt = stripped.rstrip('\n')
    end_line = i
    while not full_stmt.rstrip().endswith(';'):
        end_line += 1
        if end_line >= len(lines):
            break
        full_stmt += ' ' + lines[end_line].strip().rstrip('\n')

    # Parse the call
    # Determine method: log, warn, error
    if full_stmt.startswith('console.error('):
        method = 'error'
        args_str = full_stmt[len('console.error('):]
    elif full_stmt.startswith('console.warn('):
        method = 'warn'
        args_str = full_stmt[len('console.warn('):]
    else:
        method = None  # will be determined by content
        args_str = full_stmt[len('console.log('):]

    # Remove trailing );
    args_str = args_str.rstrip()
    if args_str.endswith(');'):
        args_str = args_str[:-2]

    # Try to handle different patterns

    # Pattern A: Single string literal 'message'
    m = re.match(r"^'(\[[\w\s\-\.v]+\]\s*[^']*)'$", args_str)
    if m:
        msg = strip_bracket_prefix(m.group(1))
        if method is None:
            method = 'info' if is_info_level(m.group(1)) else 'debug'
        new_lines.append(f"{indent}this.logger.{method}('{msg}');\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern B: Template literal `message`
    m = re.match(r'^`(\[[\w\s\-\.v]+\]\s*[^`]*)`$', args_str)
    if m:
        msg = strip_bracket_prefix(m.group(1))
        if method is None:
            method = 'info' if is_info_level(m.group(1)) else 'debug'
        new_lines.append(f"{indent}this.logger.{method}(`{msg}`);\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern C: String + error variable: 'message', error
    m = re.match(r"^'(\[[\w\s\-\.v]+\]\s*[^']*)',\s*(.+)$", args_str)
    if m:
        msg = strip_bracket_prefix(m.group(1))
        extra = m.group(2).strip()
        if method is None:
            method = 'info' if is_info_level(m.group(1)) else 'debug'
        if method == 'error':
            new_lines.append(f"{indent}this.logger.error('{msg}', {extra} as Error);\n")
        else:
            # For non-error, extra args are data
            # Check if it looks like string concatenation args: value, 'string'
            # e.g. copiedCount, 'command files'
            parts = []
            # Simple heuristic: split by comma and reconstruct as template literal
            # Only if simple patterns
            sub_args = re.split(r",\s*", extra)
            if len(sub_args) <= 3 and all(
                re.match(r"^('[^']*'|[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_]+)*)$", a.strip())
                for a in sub_args
            ):
                # Build template literal
                tmpl_parts = [msg]
                for a in sub_args:
                    a = a.strip()
                    if a.startswith("'") and a.endswith("'"):
                        tmpl_parts.append(a[1:-1])
                    else:
                        tmpl_parts.append('${' + a + '}')
                new_lines.append(f"{indent}this.logger.{method}(`{' '.join(tmpl_parts)}`);\n")
            else:
                new_lines.append(f"{indent}this.logger.{method}('{msg}', {extra});\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern D: Template literal + error: `message`, error
    m = re.match(r'^`(\[[\w\s\-\.v]+\]\s*[^`]*)`,\s*(.+)$', args_str)
    if m:
        msg = strip_bracket_prefix(m.group(1))
        extra = m.group(2).strip()
        if method is None:
            method = 'info' if is_info_level(m.group(1)) else 'debug'
        if method == 'error':
            new_lines.append(f"{indent}this.logger.error(`{msg}`, {extra} as Error);\n")
        else:
            new_lines.append(f"{indent}this.logger.{method}(`{msg}`, {extra});\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern E: No bracket prefix - simple string
    m = re.match(r"^'([^']*)'$", args_str)
    if m:
        msg = m.group(1)
        if method is None:
            method = 'info' if is_info_level(msg) else 'debug'
        new_lines.append(f"{indent}this.logger.{method}('{msg}');\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern F: No bracket prefix - string + args
    m = re.match(r"^'([^']*)',\s*(.+)$", args_str)
    if m:
        msg = m.group(1)
        extra = m.group(2).strip()
        if method is None:
            method = 'info' if is_info_level(msg) else 'debug'
        if method == 'error':
            new_lines.append(f"{indent}this.logger.error('{msg}', {extra} as Error);\n")
        else:
            new_lines.append(f"{indent}this.logger.{method}('{msg}', {extra});\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern G: Template literal without prefix
    m = re.match(r'^`([^`]*)`$', args_str)
    if m:
        msg = m.group(1)
        if method is None:
            method = 'info' if is_info_level(msg) else 'debug'
        new_lines.append(f"{indent}this.logger.{method}(`{msg}`);\n")
        changes += 1
        i = end_line + 1
        continue

    # Pattern H: Template literal without prefix + args
    m = re.match(r'^`([^`]*)`,\s*(.+)$', args_str)
    if m:
        msg = m.group(1)
        extra = m.group(2).strip()
        if method is None:
            method = 'info' if is_info_level(msg) else 'debug'
        if method == 'error':
            new_lines.append(f"{indent}this.logger.error(`{msg}`, {extra} as Error);\n")
        else:
            new_lines.append(f"{indent}this.logger.{method}(`{msg}`, {extra});\n")
        changes += 1
        i = end_line + 1
        continue

    # Fallback: couldn't parse, keep original
    print(f"  SKIPPED L{i+1}: {full_stmt[:80]}...")
    for j in range(i, end_line + 1):
        new_lines.append(lines[j])
    i = end_line + 1

with open(filepath, 'w') as f:
    f.writelines(new_lines)

print(f"Total changes: {changes}")
