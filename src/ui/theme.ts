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
  },
  bgPlanet: {
    mercury: (text: string) => pc.bgWhite(text),
    venus: (text: string) => pc.bgYellow(text),
    earth: (text: string) => pc.bgBlue(text),
    mars: (text: string) => pc.bgRed(text),
    jupiter: (text: string) => pc.bgMagenta(text),
    saturn: (text: string) => pc.bgYellow(text),
    uranus: (text: string) => pc.bgCyan(text),
    neptune: (text: string) => pc.bgBlue(text),
    unknown: (text: string) => pc.bgMagenta(text),
  },
  pill: (text: string, colorFn: (s: string) => string, bgFn: (s: string) => string) => {
    return colorFn('\ue0b6') + bgFn(pc.black(text)) + colorFn('\ue0b4');
  },
  multiPill: (left: string, right: string, colorLeft: (s: string) => string, bgLeft: (s: string) => string, colorRight: (s: string) => string, bgRight: (s: string) => string) => {
    return colorLeft('\ue0b6') + bgLeft(pc.black(left)) + bgRight(colorLeft('\ue0b4')) + bgRight(pc.white(right)) + colorRight('\ue0b4');
  },
  getPillColors: (text: string) => {
    const label = text.trim().toLowerCase();
    // Simple checksum to pick a color
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors_list = [
      { name: 'blue', color: pc.blue, bg: pc.bgBlue },
      { name: 'magenta', color: pc.magenta, bg: pc.bgMagenta },
      { name: 'cyan', color: pc.cyan, bg: pc.bgCyan },
      { name: 'green', color: pc.green, bg: pc.bgGreen },
      { name: 'yellow', color: pc.yellow, bg: pc.bgYellow },
      { name: 'red', color: pc.red, bg: pc.bgRed },
    ];
    
    const index = Math.abs(hash) % colors_list.length;
    return colors_list[index];
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
