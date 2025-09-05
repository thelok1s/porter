import figlet from "figlet";

export function appFiglet() {
  console.log(
    "\x1b[38;5;141m" +
      figlet.textSync("porter", {
        font: "Slant",
      }) +
      "\x1b[0m",
  );
}
