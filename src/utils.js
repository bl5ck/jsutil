// @flow
import chalk from 'chalk';

function sleeper(ms): Promise {
  return (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms));
}
let msgCache = '';
function log(msg = ''): { write: () => undefined } {
  if (msg) {
    msgCache = msgCache.concat(
      chalk.gray(`[${new Date().toString()}]`),
      msg.replace(/<([^ ]+) (((?!(\/>)).)*)\/>/g, (...args) => {
        if (!args[1] || !args[2] || typeof chalk[args[1]] !== 'function') {
          return args[0];
        }
        return chalk[args[1]](args[2]);
      }),
      '\n',
    );
  }
  return {
    write: () => {
      console.log(msgCache);
      msgCache = '';
    },
  };
}

function random(start: number, end: number, uniqIn): number {
  let result = Math.floor(Math.random() * (end - start) + start);
  if (!Array.isArray(uniqIn)) {
    return result;
  }
  while (uniqIn.indexOf(result) !== -1) {
    result = random(start, end);
  }
  return result;
}

function s4(): string {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function gUuidV4(): string {
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

module.exports = {
  log,
  random,
  sleeper,
  gUuidV4,
};
