import { promises as fs } from "fs";
import path from "path";

type Target = "app" | "error" | "debug";

const LOGS_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILES: Record<Target, string> = {
  app: "app.log",
  error: "error.log",
  debug: "debug.log",
};

function printUsage(): void {
  console.log(
    [
      "Очищает логи в папке logs.",
      "",
      "Использование:",
      " bun src/scripts/flushlogs.ts [опции]",
      "",
      "Опции:",
      " -t, --target <app|error|debug> Очистить указанный файл логов",
      " По умолчанию очищаются все файлы логов",
      " -h, --help Показать это сообщение",
      "",
      "Примеры использования:",
      " bun src/scripts/flushlogs.ts",
      " bun src/scripts/flushlogs.ts -t app",
      " bun src/scripts/flushlogs.ts --target=debug",
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): { target: Target | null } {
  let target: Target | null = null;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "-t" || arg === "--target") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        console.error("Ошибка: отсутствует значение для --target");
        printUsage();
        process.exit(1);
      }
      if (!isValidTarget(next)) {
        console.error(
          `Ошибка: Недопустимая цель «${next}». Используйте app|error|debug.`,
        );
        process.exit(1);
      }
      target = next as Target;
      i++;
      continue;
    }

    if (arg.startsWith("--target=")) {
      const value = arg.split("=", 2)[1];
      if (!isValidTarget(value)) {
        console.error(
          `Ошибка: Недопустимая цель «${value}». Используйте app|error|debug.`,
        );
        process.exit(1);
      }
      target = value as Target;
      continue;
    }
  }

  return { target };
}

function isValidTarget(v: string): v is Target {
  return v === "app" || v === "error" || v === "debug";
}

async function ensureLogsDir(): Promise<void> {
  await fs.mkdir(LOGS_DIR, { recursive: true });
}

async function truncateFile(filePath: string): Promise<void> {
  // Truncate by writing empty content; creates the file if it doesn't exist
  await fs.writeFile(filePath, "");
}

async function main(): Promise<void> {
  const { target } = parseArgs(process.argv);

  const targets: Target[] = target ? [target] : ["app", "error", "debug"];

  await ensureLogsDir();

  const results: Array<{
    target: Target;
    file: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const t of targets) {
    const file = path.join(LOGS_DIR, LOG_FILES[t]);
    try {
      await truncateFile(file);
      results.push({ target: t, file, ok: true });
    } catch (err) {
      results.push({
        target: t,
        file,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const r of results) {
    if (r.ok) {
      console.log(`Очищен ${r.target} файл логов: ${r.file}`);
    } else {
      console.error(
        `Не удалось очистить ${r.target} файл логов (${r.file}): ${r.error}`,
      );
    }
  }

  if (results.some((r) => !r.ok)) {
    process.exitCode = 1;
  }
}

void main();
