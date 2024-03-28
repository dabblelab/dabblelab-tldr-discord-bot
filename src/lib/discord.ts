// // Require the necessary discord.js classes
// import fs from "fs";
// import path from "path";

// import { Client, Events, GatewayIntentBits, Collection } from "discord.js";

// import env from "dotenv";

// env.config();

// const token = process.env.DISCORD_TOKEN;

// // Create a new client instance
// const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// // When the client is ready, run this code (only once).
// // The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// // It makes some properties non-nullable.
// client.once(Events.ClientReady, (readyClient) => {
//   console.log(`Ready! Logged in as ${readyClient.user.tag}`);
// });

// // Log in to Discord with your client's token
// client.login(token);

// client.commands = new Collection();

// const foldersPath = path.join(__dirname, "commands");
// const commandFolders = fs.readdirSync(foldersPath);

// for (const folder of commandFolders) {
//   const commandsPath = path.join(foldersPath, folder);
//   const commandFiles = fs
//     .readdirSync(commandsPath)
//     .filter((file) => file.endsWith(".js"));
//   for (const file of commandFiles) {
//     const filePath = path.join(commandsPath, file);
//     // const command = require(filePath);
//       import command from filePath;
//     // Set a new item in the Collection with the key as the command name and the value as the exported module
//     if ("data" in command && "execute" in command) {
//       client.commands.set(command.data.name, command);
//     } else {
//       console.log(
//         `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
//       );
//     }
//   }
// }

// console.log("Hello, world!");
