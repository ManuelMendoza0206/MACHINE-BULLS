/**
 * Conventional Commits, aligned with how the team already writes them:
 *   feat(tarea1): ... | chore(sprint-0): ... | docs(sprint-1): ... | fix: ...
 * CI is the real gate; this hook just keeps history readable.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0], // long explanatory bodies are fine
    'footer-max-line-length': [0], // Co-Authored-By / AI-usage lines
    'header-max-length': [2, 'always', 100],
    'subject-case': [0], // allow "cn()" etc. in the subject
  },
};
