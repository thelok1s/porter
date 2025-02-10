# [RU] Porter
```
    ____  ____  _____/ /____  _____
   / __ \/ __ \/ ___/ __/ _ \/ ___/
  / /_/ / /_/ / /  / /_/  __/ /    
 / .___/\____/_/   \__/\___/_/     
/_/
```
## Описание
Многофункциональный инструмент для синхронизации публикаций и комментариев между ВКонтакте и Telegram. Написан на typescript и поддерживает работу в node и bun.
## Установка и запуск
### Требования
Стабильное подключение к интернету (на этапе запуска)
* ~~Node.js~~ / Bun
### Конфигурация
Создайте файл переменных окружения `.env` и заполните его переменными
```dotenv
VK_TOKEN='your_vk_group_token' # Токен Callback API для сообществ
TELEGRAM_TOKEN='your_telegram_bot_token'
TELEGRAM_CHANNEL_ID='your_telegram_channel_id'
TELEGRAM_CHANNEL_PUBLIC_LINK='@your_telegram_channel_public_link'
TELEGRAM_CHAT_ID='your_disscussion_group_id'
```

### ~~npm~~
~~`git clone thelok1s/porter && cd porter`  
`npm install`  
`npm run src/main.ts`~~
### bun
`git clone thelok1s/porter && cd porter`  
`bun install`  
`bun run src/main.ts`

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
* Солянка из вложений

Поддержка сообщений из Telegram  
* Текст
* Фото
* Видео
* Опросы
* Файлы
* Солянка из вложений

Синхронизация 
* Синхронное удаление
* Синхронное редактирование

### Кросскомметинг
Поддержка комментариев в ВКонтакте  
* Текст
* Реплаи
* Фото
* Файлы
* Солянка из вложений

Поддержка комментариев в Telegram  
* Текст
* Реплаи 
* Фото
* Файлы
* Солянка из вложений

Синхронизация
* Синхронное удаление
* Синхронное редактирование

Прочее
* Кросскомментинг по определенным правилам

### Работоспособность
* Поддержка работы в node
* Работа с файлом конфигурации
* Обработка ошибок
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
