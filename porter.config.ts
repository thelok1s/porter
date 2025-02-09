import { Config } from "@/interfaces/Config";

const PorterConfig: Config = {
  crossposting: {
    enabled: true,
    useOrigin: {
      vk: true,
      tg: false,
    },
    parameters: {
      ignoreReposts: true,
    },
  },
  crosscommenting: {
    enabled: true,
    useOrigin: {
      vk: true,
      tg: true,
    },
    parameters: {
      match: [],
    },
  },
};

export default PorterConfig;
