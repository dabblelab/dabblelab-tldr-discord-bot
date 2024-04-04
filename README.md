# Discord AI Bot

This is a Discord bot that uses AI to generate summaries of chat conversations in both text and audio format.

## Features

- Summarize chat conversations with the `/tldr` command.
- Test the bot with the `/test` command.

## Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create a `.env` file in the root directory and add your environment variables specified in `.env.example` file.
4. Build the project with `npm run build`.
5. Start the bot with `npm start`.

## Commands

- `/tldr`: Generates a summary of the chat conversation in both text as well as audio format.
- `/test`: For testing purpose only.

## Services

- `getAIResponseV2`: Generates a summary of a chat conversation.
- `getAudioUrlFromText`: Converts text to speech and returns the audio URL.
- `fileUpload`: Uploads a file to Supabase.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

ISC
