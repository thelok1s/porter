# [RU] Porter
![GitHub top language](https://img.shields.io/github/languages/top/thelok1s/porter)
![GitHub package.json version](https://img.shields.io/github/package-json/v/thelok1s/porter)
![GitHub last commit](https://img.shields.io/github/last-commit/thelok1s/porter)
```
    ____  ____  _____/ /____  _____
   / __ \/ __ \/ ___/ __/ _ \/ ___/
  / /_/ / /_/ / /  / /_/  __/ /
 / .___/\____/_/   \__/\___/_/
/_/
```
## Описание
Многофункциональный инструмент для синхронизации публикаций и комментариев между ВКонтакте и Telegram.
Написан на Typescript для работы в Node.

> [!CAUTION]
> Проект в стадии разработки, возможно неожиданное поведение, используйте в важных каналах/группах на свой страх и риск.
> Issues приветствуются.

## Установка и запуск
### Требования
* Node.js, Bun или Deno (любой из них)
* Стабильное подключение к интернету (на этапе запуска)
* Для SQLite установите npm-пакет sqlite3 (Sequelize требует его для диалекта sqlite)
### Конфигурация
Создайте файл переменных окружения `.env` и заполните его переменными
```dotenv
VK_TOKEN='vk1.your_vk_group_token' # Токен Callback API для сообществ
TELEGRAM_TOKEN='your_telegram_bot_token'
TELEGRAM_CHANNEL_ID='your_telegram_channel_id'
TELEGRAM_CHANNEL_PUBLIC_LINK='@your_telegram_channel_public_link'
TELEGRAM_CHAT_ID='-your_disscussion_group_id'
```

### Запуск
- Node: `npm ci && npm run start`
- Bun: `bun install && bun run start`
- Deno: `deno task start` (задачи определены в deno.json)

### Скрипты
- prune: `npm run prune` / `bun run prune` / `deno task prune`
- init: `npm run init` / `bun run init` / `deno task init`
- flushlogs: `npm run flushlogs` / `bun run flushlogs` / `deno task flushlogs` (-h для инструкций)

## Прогресс разработки
### Кросспостинг
Поддержка постов из ВКонтакте (частично)
* ~~Текст~~
* ~~Фото~~
* Видео
* Музыка
* ~~Опросы~~
* ~~Файлы~~ (возможно неожиданное поведение)
* Ссылки, альбомы и т.д. (страдает форматирование)

Поддержка сообщений из Telegram
* Текст
* Фото
* Видео
* Опросы
* Файлы

Синхронизация
* Синхронное удаление
* Синхронное редактирование

### Кросскомментирование
Поддержка комментариев в ВКонтакте
* ~~Текст~~
* Ответы
* ~~Фото~~
* ~~Несколько фото~~
* ~~Файлы~~ (возможно неожиданное поведение)

Поддержка комментариев в Telegram
* Текст
* Ответы
* Фото
* Несколько фото
* Файлы

Синхронизация
* Синхронное удаление (частично)
* Синхронное редактирование (частично)

Прочее
* Кросскомментирование по определенным правилам

### Работоспособность
* Нормальные логи
* Обработка ошибок получше
* Совместимость с nodejs/deno
* Расширение файла конфигурации
* Оптимизация
