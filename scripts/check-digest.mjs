import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { summarize } from './digest.mjs';

test('reads final answer file rather than CLI logs, passes news via stdin and cleans up', () => {
  let dir;
  const summary = summarize('Summarize', 'News input', { run(command, args, options) {
    assert.equal(command, 'codex');
    assert.ok(args.includes('--ephemeral'));
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
    assert.equal(args.at(-1), '-');
    assert.match(options.input, /News input/);
    dir = options.cwd;
    writeFileSync(args[args.indexOf('--output-last-message') + 1], '  简报正文\n');
    return { status: 0, stdout: 'diagnostic text' };
  }});
  assert.equal(summary, '简报正文');
  assert.equal(existsSync(dir), false);
});

for (const mode of ['exit', 'timeout', 'missing', 'empty']) {
  test(`fails closed and removes temporary files: ${mode}`, () => {
    let dir;
    assert.throws(() => summarize('prompt', 'news', { run(command, args, options) {
      dir = options.cwd;
      if (mode === 'timeout') return { error: new Error('timeout') };
      if (mode === 'exit') return { status: 1, stderr: 'sensitive diagnostic' };
      if (mode === 'empty') writeFileSync(args[args.indexOf('--output-last-message') + 1], '  ');
      return { status: 0 };
    }}), /timeout|failed|summary|empty/);
    assert.equal(existsSync(dir), false);
  });
}

