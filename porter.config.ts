import { Config } from "@/interfaces/Config";

const PorterConfig: Config = {
  loggingLevel: "debug",
  crossposting: {
    enabled: true,
    useOrigin: {
      vk: true,
      tg: false,
    },
    parameters: {
      ignoreReposts: true,
      ignorePolls: false,
    },
  },
  crosscommenting: {
    enabled: true,
    useOrigin: {
      vk: true,
      tg: false,
    },
    parameters: {
      match: [],
    },
  },
};

export default PorterConfig;
