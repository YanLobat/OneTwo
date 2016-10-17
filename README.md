# OneTwoTrip test task

#install
`npm install`

#get started
You can start app normally with `npm start`(`node server`). This way app will store connections as a list, `last_seen` key for detecting shutdown of app-generator, `messages`for existing messages, `treated` for read messages, `errored` for errored messages.
Otherwise you can start app in getErrors-mode with `npm run getErrors`(`node server --getErrors`).
