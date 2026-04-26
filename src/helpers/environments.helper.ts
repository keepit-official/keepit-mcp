export const ENVIRONMENTS = {
    'ws': 'Denmark',
    'ws-test': 'Denmark (test)',
    'au-sy': 'Australia',
    'ca-tr': 'Canada',
    'dk-co': 'Denmark',
    'de-fr': 'Germany',
    'uk-ld': 'GB',
    'us-dc': 'USA',
    'ch-zh': 'Zurich',
    unknown: 'unknown'
};

export type TEnvType = keyof typeof ENVIRONMENTS;
