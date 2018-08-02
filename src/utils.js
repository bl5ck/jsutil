// @flow
import chalk from 'chalk';

export function sleeper(ms: number): () => Promise<any> {
  return (x) => new Promise((resolve) => setTimeout(() => resolve(x), ms));
}
let msgCache = '';
export function log(msg: string = ''): { write: () => any } {
  if (msg) {
    msgCache = msgCache.concat(
      chalk.gray(`[${new Date().toString()}]`),
      msg.replace(/<([^ ]+) (((?!(\/>)).)*)\/>/g, (...args) => {
        if (!args[1] || !args[2] || typeof (chalk: any)[args[1]] !== 'function') {
          return args[0];
        }
        return (chalk: any)[args[1]](args[2]);
      }),
      '\n',
    );
  }
  return {
    write: () => {
      // eslint-disable-next-line no-console
      console.log(msgCache);
      msgCache = '';
    },
  };
}

export function random(start: number, end: number, uniqIn?: Array<number>): number {
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

export function gUuidV4(): string {
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}
