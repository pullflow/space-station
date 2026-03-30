import type { Config } from '../config';

export interface PortMap {
  [key: string]: number;
}

export function getPlanetPorts(config: Config, planetName: string): PortMap {
  const index = config.planets.indexOf(planetName.toLowerCase());
  const planetIndex = index === -1 ? 0 : index;
  
  const start = config.base_port + (planetIndex * config.port_step);

  // We provide a generic "Port Map" based on standard common offsets.
  // A project can ignore these and use math based on BASE_PORT in templates.
  return {
    PLANET_INDEX: planetIndex,
    BASE_PORT: start,
    CADDY_PORT: start + 800,
    SHELL_PORT: start + 801,
    POSTGRES_PORT: start + 432,
    NATS_PORT: start + 222,
    VALKEY_PORT: start + 379,
  };
}
