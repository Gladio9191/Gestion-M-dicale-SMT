import readline from 'node:readline';
import { stdin, stdout } from 'node:process';
import { createPasswordHash } from '../artifacts/api-server/src/security/owner-core.ts';

// Run on your own computer. No password or generated hash enters git.
if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
  console.error('Run this command interactively in your local terminal.');
  process.exit(1);
}
readline.emitKeypressEvents(stdin);
stdin.setRawMode(true);
stdin.resume();
let password = '';
stdout.write('Choose private SMT password (hidden input, min 12 chars): ');
stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') { stdin.setRawMode(false); process.exit(130); }
  if (key.name === 'return' || key.name === 'enter') {
    stdin.setRawMode(false);
    stdin.pause();
    stdout.write('\n');
    try {
      stdout.write('SMT_OWNER_PASSWORD_HASH=' + createPasswordHash(password) + '\n');
      stdout.write('Store only this hash in your private runtime environment.\n');
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Invalid password');
      process.exitCode = 1;
    }
    password = '';
    return;
  }
  if (key.name === 'backspace') { password = password.slice(0, -1); return; }
  if (str && !key.ctrl && str.length === 1 && password.length < 256) password += str;
});
