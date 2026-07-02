'use strict';
/**
 * PostToolUse (Write|Edit on *.tsx / *.jsx / *.css): WARN-ONLY style guard.
 *
 * Flags: raw hex colours (legal only in packages/design-tokens/),
 * inline style objects, framer-motion imports (use "motion" package).
 * Never blocks — emits additionalContext so the agent self-corrects.
 * This file is excluded from the manifest framer-motion scan: detecting
 * that string is its job.
 */
const { readStdinJson, safeRun, postToolContext, writeTexts, normPath } = require('./lib/common');

safeRun('post-edit-style-guard', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const filePath = normPath(input.tool_input && input.tool_input.file_path);
  if (!/\.(tsx|jsx|css)$/.test(filePath)) return;
  if (filePath.includes('packages/design-tokens/')) return; // hex is legal there
  if (filePath.includes('.claude/hooks/tests/fixtures/')) return;

  const findings = new Set();
  const isComponent = /\.(tsx|jsx)$/.test(filePath);
  for (const text of writeTexts(input.tool_input)) {
    if (/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(text)) {
      findings.add('ham hex renk (yalnız packages/design-tokens/tokens.css içinde yasal — token kullan)');
    }
    if (isComponent && /\bstyle=\{\{/.test(text)) {
      findings.add('inline style (yasak — Tailwind sınıfı / design token kullan)');
    }
    if (/from\s+['"]framer-motion['"]|require\(\s*['"]framer-motion['"]\s*\)/.test(text)) {
      findings.add('framer-motion importu (yasak — "motion" paketi: import { motion } from "motion/react")');
    }
  }

  if (findings.size > 0) {
    postToolContext(
      `[post-edit-style-guard] ${filePath} içinde stil ihlali uyarısı:\n- ` +
        [...findings].join('\n- ') +
        '\nBu bir uyarıdır (blok değil); commit öncesi düzelt, ayrıntı: .claude/skills/frontend-style-audit.'
    );
  }
});
