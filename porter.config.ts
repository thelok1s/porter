import { Config } from "@/types/Config.ts";

const PorterConfig: Config = {
  loggingLevel: "debug",
  crossposting: {
    enabled: true,
    origin: "vk",
    parameters: {
      ignoreReposts: true,
      ignorePolls: false,
    },
  },
  crosscommenting: {
    enabled: true,
    origin: "both",
  },
};

export { PorterConfig };
