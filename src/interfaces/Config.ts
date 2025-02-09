export interface Config {
  crossposting: {
    enabled: boolean,
    useOrigin: {
      vk: boolean,
      tg: boolean,
    },
    parameters: {
      ignoreReposts: boolean,
    },
  },
  crosscommenting: {
    enabled: boolean,
    useOrigin: {
      vk: boolean,
      tg: boolean,
    },
    parameters: {
      match: string[],
    },
  },
};

