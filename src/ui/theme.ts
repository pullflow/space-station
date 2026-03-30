import pc from 'picocolors';
import gradient from 'gradient-string';

export const colors = {
  primary: (text: string) => gradient(['#00c6ff', '#0072ff'])(text),
  secondary: (text: string) => gradient(['#f7971e', '#ffd200'])(text),
  success: (text: string) => pc.green(text),
  error: (text: string) => pc.red(text),
  warning: (text: string) => pc.yellow(text),
  info: (text: string) => pc.cyan(text),
  dim: (text: string) => pc.gray(text),
  agent: (text: string) => pc.magenta(text),
  planet: {
    mercury: (text: string) => pc.white(text),
    venus: (text: string) => pc.yellow(text),
    earth: (text: string) => pc.blue(text),
    mars: (text: string) => pc.red(text),
    jupiter: (text: string) => pc.magenta(text),
    saturn: (text: string) => pc.yellow(text),
    uranus: (text: string) => pc.cyan(text),
    neptune: (text: string) => pc.blue(text),
    unknown: (text: string) => pc.magenta(text),
  }
};

export const symbols = {
  mercury: '1️⃣',
  venus: '2️⃣',
  earth: '3️⃣',
  mars: '4️⃣',
  jupiter: '5️⃣',
  saturn: '6️⃣',
  uranus: '7️⃣',
  neptune: '8️⃣',
  unknown: '🔘',
  success: '✨',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '🛸',
  rocket: '🚀',
  pr: '🔀',
  issue: '📋',
  agent: '🤖',
};
