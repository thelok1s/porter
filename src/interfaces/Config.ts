export interface Config {
  loggingLevel: "debug" | "info" | "warn" | "error",
  crossposting: {
    enabled: boolean,
    useOrigin: {
      vk: boolean,
      tg: boolean,
    },
    parameters: {
      ignoreReposts: boolean,
      ignorePolls: boolean,
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

