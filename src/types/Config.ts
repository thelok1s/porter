export interface Config {
  loggingLevel: "debug" | "info" | "warn" | "error";
  crossposting: {
    enabled: boolean;
    origin: "vk" | "tg" | "both";
    parameters: {
      ignoreReposts: boolean;
      ignorePolls: boolean;
    };
  };
  crosscommenting:
    | {
        enabled: true;
        origin: "vk" | "tg" | "both";
        mode: "direct";
      }
    | {
        enabled: true;
        origin: "both";
        mode: "summary";
      }
    | {
        enabled: false;
      };
  notifications: {
    enabled: boolean;
  };
}
