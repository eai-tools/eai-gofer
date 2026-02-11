#!/usr/bin/env python3
"""
Clean up { data: [value] } patterns in logger calls to use template literals instead.

Patterns to fix:
  this.logger.debug('Message:', { data: [value] });
    → this.logger.debug(`Message: ${value}`);

  this.logger.info('Message', x, 'suffix');
    → this.logger.info(`Message ${x} suffix`);   (handled separately)
"""

import re
import sys

filepath = sys.argv[1]

with open(filepath, 'r') as f:
    content = f.read()

# Pattern 1: this.logger.LEVEL('Message:', { data: [singleValue] });
# Convert to: this.logger.LEVEL(`Message: ${singleValue}`);
def fix_data_pattern(match):
    indent = match.group(1)
    level = match.group(2)
    msg = match.group(3)
    value = match.group(4).strip()

    # Remove trailing colon from message if present
    msg_clean = msg.rstrip(':').rstrip()

    # If original message ended with ':' or similar, use ': ${value}' format
    if msg.rstrip().endswith(':'):
        return f"{indent}this.logger.{level}(`{msg_clean}: ${'{'}{value}{'}'}`);"
    else:
        return f"{indent}this.logger.{level}(`{msg_clean}: ${'{'}{value}{'}'}`);"

content = re.sub(
    r"^(\s*)this\.logger\.(debug|info|warn|error)\('([^']+)',\s*\{\s*data:\s*\[([^\]]+)\]\s*\}\);",
    fix_data_pattern,
    content,
    flags=re.MULTILINE
)

# Pattern 2: this.logger.LEVEL('Message', count, 'suffix');
# Convert to: this.logger.LEVEL(`Message ${count} suffix`);
def fix_multi_arg(match):
    indent = match.group(1)
    level = match.group(2)
    msg = match.group(3)
    middle = match.group(4).strip()
    suffix = match.group(5)

    return f"{indent}this.logger.{level}(`{msg} ${'{'}{middle}{'}'} {suffix}`);"

content = re.sub(
    r"^(\s*)this\.logger\.(debug|info|warn|error)\('([^']+)',\s*([^,]+),\s*'([^']+)'\);",
    fix_multi_arg,
    content,
    flags=re.MULTILINE
)

# Pattern 3: this.logger.debug('Message:', { error: readErr });
# Leave these as-is, they're structured error data

with open(filepath, 'w') as f:
    f.write(content)

# Count remaining data patterns
remaining = content.count('{ data:')
print(f"Remaining {{ data: }} patterns: {remaining}")
print("Done!")
