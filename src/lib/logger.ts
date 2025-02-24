import pino from "pino";
import { Config } from "@/interfaces/Config";
import PorterConfig from "../../porter.config";
const config = PorterConfig;

const logger = pino(
  {
    level: config.loggingLevel,
  },
  pino.multistream([
    {
      stream: pino.destination("./logs/app.log"),
    },
    {
      stream: pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          colorizeObjects: true,
          include: "time,level",
          translateTime: "dd.mm-HH:MM:ss",
        },
      }),
      level: config.loggingLevel,
    },
  ]),
);

export default logger;
