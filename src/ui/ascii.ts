import { colors } from './theme';

export async function getAsciiLogo(): Promise<string> {
  // Clean, high-fidelity block spelling
  const logoText = [
    `${colors.primary(' ┏━┓ ┏━┓ ┏━┓ ┏━┓ ┏━┓   ┏━┓ ┏┳┓ ┏━┓ ┏┳┓ ┏┳┓ ┏━┓ ┏┓┓')}`,
    `${colors.info(' ┗━┓ ┃━┛ ┣━┫ ┃   ┣━    ┗━┓  ┃  ┣━┫  ┃   ┃  ┃ ┃ ┃┃┃')}`,
    `${colors.error(' ┗━┛ ┻   ┻ ┻ ┗━┛ ┗━┛   ┗━┛  ┻  ┻ ┻  ┻   ┻  ┗━┛ ┛┗┛')}`,
    '' // Empty line as requested
  ].join('\n');

  return logoText;
}
