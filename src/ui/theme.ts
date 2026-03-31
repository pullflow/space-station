import pc from 'picocolors';
import gradient from 'gradient-string';

export const planetHexColors: Record<string, string> = {
  mercury: '#e5e5e5',
  venus: '#e3bb76',
  earth: '#2271b3',
  mars: '#e27b58',
  jupiter: '#c99039',
  saturn: '#c5ab6e',
  uranus: '#bbe1e4',
  neptune: '#6081ff',
  unknown: '#a855f7',
};

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
  mercury: '\udb80\udeb7 ',
  venus: '\udb80\udeb7 ',
  earth: '\udb80\udeb7 ',
  mars: '\udb80\udeb7 ',
  jupiter: '\udb80\udeb7 ',
  saturn: '\udb80\udeb7 ',
  uranus: '\udb80\udeb7 ',
  neptune: '\udb80\udeb7 ',
  unknown: '\udb80\udeb7 ',
  success: '\uf00c ',
  error: '\uf00d ',
  warning: '\uf071 ',
  info: '\uf129 ',
  loading: '\uf110 ',
  rocket: '\uf135 ',
  pr: '\uf126 ',
  issue: '\uf0cb ',
  agent: '\uf085 ',
  status: '\uf080 ',
  exit: '\uf08b ',
  console: '\uf120 ',
};
