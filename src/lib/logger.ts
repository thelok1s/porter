import pino from "pino";

const logger = pino(
  {
    level: "debug",
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
        },
      }),
      level: "debug",
    },
  ]),
);

export default logger;
