# [RU] Porter
![GitHub top language](https://img.shields.io/github/languages/top/thelok1s/porter)
![GitHub package.json version](https://img.shields.io/github/package-json/v/thelok1s/porter)
```
    ____  ____  _____/ /____  _____
   / __ \/ __ \/ ___/ __/ _ \/ ___/
  / /_/ / /_/ / /  / /_/  __/ /    
 / .___/\____/_/   \__/\___/_/     
/_/
```
## Описание
Многофункциональный инструмент для синхронизации публикаций и комментариев между ВКонтакте и Telegram.  
Написан на Typescript для работы в Bun.

> [!CAUTION]
> Проект в стадии разработки, неожиданное поведение гарантированно, используйте в важных каналах/группах с КРАЙНЕЙ осторожностью на свой страх и риск.  
> Issues и PR более-менее приветствуются.

## Установка и запуск
### Требования
* Bun (рекомендуется v1.2+)
* Стабильное подключение к интернету (на этапе запуска)
### Конфигурация
Создайте файл переменных окружения `.env` и заполните его переменными
```dotenv
VK_TOKEN='vk1.your_vk_group_token' # Токен Callback API для сообществ
TELEGRAM_TOKEN='your_telegram_bot_token'
TELEGRAM_CHANNEL_ID='your_telegram_channel_id'
TELEGRAM_CHANNEL_PUBLIC_LINK='@your_telegram_channel_public_link'
TELEGRAM_CHAT_ID='-your_disscussion_group_id'
```

### Bun
`git clone thelok1s/porter && cd porter`  
`bun install`  
`bun run ./src/main.ts`

### Скрипты
`bun run prune-db` – drop table всех столов датабазы

## Прогресс разработки
### Кросспостинг
Поддержка постов из ВКонтакте (частично)
* ~~Текст~~
* ~~Фото~~
* Видео
* Музыка
* Опросы
* ~~Файлы~~ (возможно неожиданное поведение)
* Ссылки, альбомы и т.д. (частично)

Поддержка сообщений из Telegram  
* Текст
* Фото
* Видео
* Опросы
* Файлы

Синхронизация 
* Синхронное удаление (частично)
* Синхронное редактирование (частично)

### Кросскомментирование
Поддержка комментариев в ВКонтакте  
* ~~Текст~~
* Ответы
* Фото
* Несколько фото
* Файлы

Поддержка комментариев в Telegram  
* Текст
* Ответы 
* Фото
* Несколько фото
* Файлы

Синхронизация
* Синхронное удаление
* Синхронное редактирование

Прочее
* Кросскомментирование по определенным правилам

### Работоспособность
* Нормальные логи
* Обработка ошибок получше
* Совместимость с nodejs/deno
* Расширение файла конфигурации
* Оптимизация

# [EN] Porter
wip if it is even viable

⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣤⣤⣾⣿⣿⣿⣶⣿⣿⣄⡀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⡿⠿⠿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⠋⠀⠀⠀⠀⠀⠉⠻⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣤⣤⡀⠀⠀⠀⣠⣤⠴⢿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣷⣶⣖⡈⠀⠀⠀⢠⣲⣖⡶⠏⢻⣿⣿⣿⣿⣿⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣟⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⡇⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡿⣿⣿⣿⣿⣿⣿⠧⠀⡀⢀⠉⢙⠈⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢧⣿⣿⣿⣿⣿⣿⣇⠀⣿⠇⠀⠀⠀⠁⠁⠀⠀⣼⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⣰⣿⣿⣿⣿⣿⣿⣿⣏⠷⠀⠀⠈⠀⠀⠀⠔⢵⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⢿⣿⣿⣿⢿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠠⣿⣿⣿⣿⣿⣿⣿⡛⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣡⣽⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿⡷⣾⣶⠖⣰⠤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣾⣶⠌⡽⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀⠀⡄⠀⠀⠠⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⣳⣽⣯⣰⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠐⣹⣿⢿⣿⣿⣿⣿⣿⣿⣿⢿⣿⣿⡦⣤⠄⡠⡇⠀⠀⢡⣿⡹⣿⣿⣿⣿⣿⣟⢳⣿⣿⣿⣛⣭⡤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢐⠤⢈⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣄⣷⠍⣉⣋⣿⣣⣚⡷⣕⢧⠙⣿⣿⣿⣿⣿⣾⣿⣿⣿⣿⣟⣈⣥⠄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⢻⣽⣿⣤⣻⣿⣿⣿⣼⣿⣿⣿⡟⣿⣿⣿⣮⣞⢿⣿⣟⠻⠿⡏⠀⠀⢹⣿⣿⣿⠏⣿⣿⣿⣿⡟⠒⢦⡿⣷⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡦⣠⠞⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠙⣿⠿⣿⣷⣏⣿⣷⣦⣤⣂⣨⠴⢸⣿⣿⣿⣟⣿⣿⣿⣿⢧⢏⣅⣋⣼⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣝⣙⣯⣷⣿⣿⣿⣿⣿⣿⣿⣿⣟⠤⡀⠀⠉⠍⠏⢭⣿⣿⣿⣿⣿⡿⠁⣘⣿⣿⣿⣯⣿⣿⣿⣿⣿⡷⣟⣭⠹⡇⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢰⢟⢣⠻⣻⣿⣿⣿⣿⣿⣿⣿⡿⡉⢙⡢⡍⢈⡸⣶⣿⣿⣿⣿⣿⣿⡋⢀⣿⠟⣿⣿⣶⣿⣿⣿⣿⣿⢷⣿⣿⣰⣧⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣿⣟⣾⣤⣿⣿⣿⣿⣿⣿⣿⣿⡇⢐⢋⢱⣦⠃⣾⣿⣿⣿⣿⣿⣿⡿⠷⢰⣿⡞⣾⠕⣿⣿⣿⣿⣿⣿⣾⣿⣯⣺⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢼⣵⣻⣵⢟⣛⣿⣿⣿⢟⣿⣿⡕⠀⢐⣱⠿⣶⣿⣿⣿⣿⣿⣿⣿⣷⣭⣿⣿⢟⣿⣣⣻⣿⣿⣿⣿⣿⣟⣿⡾⢿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠪⣷⣿⣿⣿⣷⣿⣿⣧⣼⣿⣽⣷⣖⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⣻⣿⣿⣧⡏⢼⣿⣯⣿⣿⣿⣟⣟⣏⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣽⢽⣷⣿⣿⡿⣻⢿⣍⣿⣿⣿⣿⣮⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣗⣚⣿⣿⣭⣺⣿⣿⣿⣷⠟⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣷⣦⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⣾⣿⣿⣿⣽⣿⣿⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠸⣿⣽⣿⣶⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⡿⠀⠀⠀⠀⠀⠀⠀
