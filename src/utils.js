// @flow
import chalk from 'chalk';
import fs from 'fs';

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
  const clean = () => {
    msgCache = '';
  };
  const write = (filePath: string) => {
    if (!filePath) {
      // eslint-disable-next-line no-console
      console.log(msgCache);
    } else {
      fs.writeFileSync(filePath, msgCache);
    }
    clean();
  };
  const get = () => msgCache;
  return {
    write,
    clean,
    get,
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

/**
 * Process commented tags in HTML or JS string
 * @param {string} tagName
 * @param {string} content
 * @param {Object} args
 */
export function processTags(tagName: string, content: string, args: Object): string {
  if (!content) {
    return '';
  }
  /**
   * Support in HTML:
   *  <!-- eject:args.title -->
   *  <title>My title</title>
   *  <!-- /eject:args.title -->
   * Support in JS:
   *  // <!-- eject:args.title -->
   *  pageTitle = 'My title';
   *  // <!-- /eject:args.title -->
   */
  // eslint-disable-next-line max-len
  const testString = `[ \t]*(// |{/\\* |)<!-- ${tagName}:(((?!-->).)*) -->(((?![ \t]*(// |)<!-- /${tagName}:).)*)[ \t]*(// |)<!-- /${tagName}:(((?!-->).)*) -->( \\*/}|)`;
  const tagTest = new RegExp(testString, 'g');
  return content
    .replace(/\r\n|\r|\n/g, '<newline />')
    .replace(tagTest, (matchString) => {
      const match = new RegExp(testString).exec(matchString);
      const openTag = match[2];
      const tagContent = match[4];
      const closeTag = match[8];
      if (!openTag || !tagContent || !closeTag || (openTag !== closeTag && !openTag.startsWith(`${closeTag} `))) {
        throw new Error(`There are invalid eject tags in your document!
        Please check if you missed content, spaces between "<!--" or "-->" and tag name,
          missed or added wrong closing tags.`);
      }
      const propMatch = new RegExp(`^${closeTag} ((( *)(([a-z-]+)='([^']+)'))*)`, 'g');
      let propsString = '';
      if (propMatch.test(openTag)) {
        propsString = openTag.replace(`${closeTag} `, '');
      }
      const props = {};
      // determine if there is any prop in eject tag
      const argExtraction = /([^a-zA-Z_]|^)args\.([a-zA-Z_]([a-zA-Z0-9_]*))/g;
      const propTest = /( *)(([a-z-]+)='([^']+)')/g;
      if (propsString) {
        const matches = propsString.match(propTest);
        if (matches) {
          // parse key='value' pairs
          matches.forEach((propString) => {
            // eslint-disable-next-line max-len
            // reset interator, check https://stackoverflow.com/questions/11477415/why-does-javascripts-regex-exec-not-always-return-the-same-value
            propTest.lastIndex = 0;
            const propParse = propTest.exec(propString);
            const propKey = propParse[3];
            let propValue = propParse[4];
            if (propKey !== 'if') {
              props[propKey] = propValue;
              return;
            }
            // process if prop
            propValue = propValue.replace(argExtraction, (valueMatch) => {
              const propValueMatch = argExtraction.exec(valueMatch);
              if (!propValueMatch || !propValueMatch[2]) {
                throw new Error(`Value in "if" property of "${closeTag}" tag is invalid!`);
              }
              const argKey = propValueMatch[2];
              return valueMatch.replace(`args.${argKey}`, args[argKey].toString());
            });
            // evaluate condition
            // eslint-disable-next-line no-eval
            props[propKey] = eval(propValue);
          });
        }
      }
      // prevent ejection if "if condition" is false
      if (typeof props.if !== 'undefined' && !props.if) {
        if (closeTag !== 'replace') {
          return tagContent;
        }
        if (!props.else) {
          return tagContent;
        }
        return props.else;
      }

      switch (closeTag) {
        case 'args.title': {
          return `<title>${args.name}</title>`;
        }
        case 'remove': {
          return '';
        }
        case 'replace': {
          if (!props.with) {
            throw new Error("eject:replace tag must has 'with' property");
          }
          return props.with;
        }
        default: {
          return tagContent;
        }
      }
    })
    .replace(/\$\{&#(\d+);\}/g, (match, dec) => String.fromCharCode(dec))
    .replace(/<newline \/>/g, '\n');
}
