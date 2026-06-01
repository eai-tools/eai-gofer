import path from 'node:path';

function normalize(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function slugifyTitle(title) {
  const slug = normalize(title)
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || 'issue';
}

export function normalizeIssueLabels(labels = []) {
  return labels
    .map((label) => {
      if (typeof label === 'string') {
        return label;
      }

      if (label && typeof label.name === 'string') {
        return label.name;
      }

      return '';
    })
    .map((label) => label.trim())
    .filter(Boolean);
}

export function parseIssueSections(body) {
  const text = normalize(body);
  const sections = {};

  if (!text) {
    return sections;
  }

  const headingRegex = /^###\s+(.+)\s*$/gm;
  const matches = [...text.matchAll(headingRegex)];

  if (matches.length === 0) {
    sections.__body = text;
    return sections;
  }

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const title = current[1].trim();
    const start = current.index + current[0].length;
    const end = next ? next.index : text.length;
    const value = text.slice(start, end).trim();
    sections[title] = value;
  }

  return sections;
}

function getFirstSectionValue(sections, names) {
  for (const name of names) {
    const value = normalize(sections[name]);
    if (value) {
      return value;
    }
  }

  return '';
}

function findAreaByTitle(policy, value) {
  const target = normalize(value).toLowerCase();
  if (!target || target === 'not sure') {
    return null;
  }

  return (
    policy.areas.find((area) => {
      return area.id === target || area.title.toLowerCase() === target || area.label === target;
    }) ?? null
  );
}

function collectSearchText(issue, sections) {
  return [
    issue.title,
    issue.body,
    ...Object.entries(sections).flatMap(([key, value]) => [key, value]),
  ]
    .map((entry) => normalize(entry).toLowerCase())
    .filter(Boolean)
    .join('\n');
}

function detectSurface(issue, sections, policy) {
  const explicit = getFirstSectionValue(sections, ['Surface', 'Most affected surface']);
  if (explicit) {
    return explicit;
  }

  const haystack = collectSearchText(issue, sections);
  const knownSurfaces = new Set(policy.areas.flatMap((area) => area.surfaces ?? []));
  for (const surface of knownSurfaces) {
    if (haystack.includes(surface.toLowerCase())) {
      return surface;
    }
  }

  return '';
}

function detectArea(issue, sections, policy, surface) {
  const explicit = getFirstSectionValue(sections, ['Roadmap area', 'Workstream / roadmap area']);
  const explicitArea = findAreaByTitle(policy, explicit);
  if (explicitArea) {
    return {
      area: explicitArea,
      score: 100,
      reason: `Matched explicit roadmap area "${explicitArea.title}"`,
    };
  }

  const haystack = collectSearchText(issue, sections);
  const labels = normalizeIssueLabels(issue.labels).map((label) => label.toLowerCase());
  let best = null;

  for (const area of policy.areas) {
    let score = 0;
    const reasons = [];

    if (surface && (area.surfaces ?? []).includes(surface)) {
      score += 4;
      reasons.push(`surface ${surface}`);
    }

    if (labels.includes(area.label.toLowerCase())) {
      score += 8;
      reasons.push(`existing label ${area.label}`);
    }

    for (const keyword of area.keywords ?? []) {
      if (haystack.includes(keyword.toLowerCase())) {
        score += 2;
        reasons.push(`keyword ${keyword}`);
      }
    }

    if (!best || score > best.score) {
      best = {
        area,
        score,
        reason: reasons.slice(0, 4).join(', '),
      };
    }
  }

  return best && best.score > 0 ? best : { area: null, score: 0, reason: 'No roadmap-area match' };
}

function detectSupportOrSecurity(issue, labels, text) {
  const loweredLabels = labels.map((label) => label.toLowerCase());
  const loweredTitle = normalize(issue.title).toLowerCase();

  if (loweredLabels.includes('security') || loweredTitle.includes('security')) {
    return {
      status: 'security-private',
      reason: 'Security issues should stay on the private reporting path.',
    };
  }

  if (
    loweredLabels.includes('question') ||
    loweredLabels.includes('support') ||
    loweredTitle.startsWith('[question]') ||
    text.includes('how do i ') ||
    text.includes('how can i ')
  ) {
    return {
      status: 'support-only',
      reason: 'Questions and general support requests should be routed to Discussions first.',
    };
  }

  return null;
}

function hasEnoughDetail(issue, sections) {
  const fields = [
    getFirstSectionValue(sections, ['Problem to solve']),
    getFirstSectionValue(sections, ['Proposed change']),
    getFirstSectionValue(sections, ['Reproduction steps']),
    getFirstSectionValue(sections, ['Expected behavior']),
    getFirstSectionValue(sections, ['Actual behavior']),
    normalize(issue.body),
  ].filter(Boolean);

  const totalLength = fields.join('\n').trim().length;
  return totalLength >= 80;
}

export function analyzeIssue(issue, policy) {
  const sections = parseIssueSections(issue.body);
  const labels = normalizeIssueLabels(issue.labels);
  const text = collectSearchText(issue, sections);
  const surface = detectSurface(issue, sections, policy);
  const areaMatch = detectArea(issue, sections, policy, surface);
  const supportOrSecurity = detectSupportOrSecurity(issue, labels, text);
  const statusLabels = policy.statusLabels;
  const areaLabels = policy.areas.map((area) => area.label);
  const labelsToRemove = [
    statusLabels.roadmapFit,
    statusLabels.needsHumanTriage,
    statusLabels.outOfRoadmap,
    statusLabels.prepPr,
    ...areaLabels,
  ].filter((label) => labels.includes(label));
  const labelsToAdd = [statusLabels.triage];

  let status;
  let summary;
  let reason;
  let area = areaMatch.area;
  let shouldPreparePr = false;

  if (supportOrSecurity) {
    status = supportOrSecurity.status;
    reason = supportOrSecurity.reason;
    summary =
      supportOrSecurity.status === 'security-private' ? 'Route privately' : 'Route to support';
    labelsToAdd.push(statusLabels.needsHumanTriage);
  } else if (!hasEnoughDetail(issue, sections)) {
    status = 'needs-human-triage';
    summary = 'Needs more detail';
    reason = 'The issue does not include enough detail for automated prep work yet.';
    labelsToAdd.push(statusLabels.needsHumanTriage);
  } else if (area) {
    status = 'roadmap-fit';
    summary = `Roadmap fit: ${area.title}`;
    reason = areaMatch.reason || `Aligned with ${area.title}`;
    shouldPreparePr = true;
    labelsToAdd.push(statusLabels.roadmapFit, statusLabels.prepPr, area.label);
  } else {
    status = 'out-of-roadmap';
    summary = 'Out of current roadmap';
    reason =
      'The issue does not match the current public Gofer direction strongly enough for automated prep.';
    labelsToAdd.push(statusLabels.outOfRoadmap);
  }

  const branchSlug = slugifyTitle(issue.title);
  const branchName = `issue-prep/${issue.number}-${branchSlug}`;
  const prepFilePath = path.posix.join('.github', 'issue-prep', `issue-${issue.number}.md`);
  const issueUrl = issue.html_url || issue.url || '';
  const roadmapTitle = area?.title ?? 'Unmapped';
  const prTitle = `chore(issue-prep): prepare #${issue.number} ${slugifyTitle(issue.title).replace(/-/g, ' ')}`;
  const sectionsSummary = {
    problem: getFirstSectionValue(sections, ['Problem to solve']),
    proposal: getFirstSectionValue(sections, ['Proposed change']),
    repro: getFirstSectionValue(sections, ['Reproduction steps']),
    expected: getFirstSectionValue(sections, ['Expected behavior']),
    actual: getFirstSectionValue(sections, ['Actual behavior']),
    alternatives: getFirstSectionValue(sections, ['Alternatives considered']),
    logs: getFirstSectionValue(sections, ['Logs or screenshots']),
  };

  return {
    issueNumber: issue.number,
    title: normalize(issue.title),
    url: issueUrl,
    status,
    summary,
    reason,
    surface: surface || 'Not specified',
    areaId: area?.id ?? '',
    areaTitle: roadmapTitle,
    areaLabel: area?.label ?? '',
    labelsToAdd: [...new Set(labelsToAdd)],
    labelsToRemove,
    shouldPreparePr,
    branchName,
    prepFilePath,
    prTitle,
    sections: sectionsSummary,
    roadmapArea: area ?? null,
  };
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

export function renderPrepBrief(issue, analysis) {
  const area = analysis.roadmapArea;
  const sections = analysis.sections;

  return `# Issue Prep: #${issue.number} ${issue.title}

- Source issue: ${issue.url}
- Triage status: ${analysis.status}
- Roadmap area: ${analysis.areaTitle}
- Surface: ${analysis.surface}
- Prepared by: GitHub Actions issue intake

## Why This Was Routed

${analysis.reason}

## Problem Summary

${sections.problem || sections.actual || 'No structured problem statement supplied.'}

## Requested Change

${sections.proposal || sections.expected || 'No explicit requested change was supplied.'}

## Reproduction / Evidence

${sections.repro || sections.logs || 'No reproduction steps or supporting evidence were supplied.'}

## Suggested Scope For Human Review

${area ? bulletList(area.likelyPaths.map((entry) => `Check ${entry}`)) : '- Confirm whether this issue belongs on the current roadmap first.'}

## Acceptance Signals

${area ? bulletList(area.acceptanceSignals) : '- Define acceptance signals before implementation starts.'}

## Human Review Questions

${area ? bulletList(area.reviewQuestions) : '- Decide whether this should stay in the public roadmap.'}

## Notes

- Related issue: #${issue.number}
- Draft PR branch: \`${analysis.branchName}\`
- This prep PR is intended to help a human reviewer scope and approve the work before implementation.
`;
}

export function renderTriageComment(analysis, prepPrUrl = '') {
  const lines = [
    '<!-- gofer-issue-intake -->',
    '## Gofer issue intake',
    '',
    `- Decision: **${analysis.summary}**`,
    `- Surface: **${analysis.surface}**`,
  ];

  if (analysis.areaLabel) {
    lines.push(`- Area: **${analysis.areaTitle}**`);
  }

  lines.push(`- Reason: ${analysis.reason}`);

  if (prepPrUrl) {
    lines.push(`- Draft prep PR: ${prepPrUrl}`);
  } else if (analysis.shouldPreparePr) {
    lines.push('- Draft prep PR: will be created or updated by automation');
  } else {
    lines.push('- Draft prep PR: not created for this issue');
  }

  lines.push(
    '',
    'Next step: a human reviewer should confirm roadmap fit, scope, and whether this should proceed to implementation.'
  );

  return `${lines.join('\n')}\n`;
}
