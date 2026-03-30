import figlet from 'figlet';
import { colors } from './theme';

export async function getAsciiLogo(): Promise<string> {
  return new Promise((resolve) => {
    figlet('Space Station', { font: 'Slant' }, (err, data) => {
      if (err) {
        resolve(colors.primary('SPACE STATION'));
        return;
      }
      resolve(colors.primary(data || 'SPACE STATION'));
    });
  });
}
