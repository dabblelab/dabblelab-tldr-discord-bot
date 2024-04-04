import { Client } from "discord.js";
import { commands } from "../commands";
import { deployCommands } from "../utils/deploy-commands";
import { config } from "../utils/config";

export async function initializeDiscordBot() {
  const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
  });

  client.once("ready", () => {
    console.log("Discord bot is ready! 🤖");
  });

  client.on("guildCreate", async (guild) => {
    console.log(`Joined a new guild: ${guild.name}`);
    await deployCommands({ guildId: guild.id });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) {
      console.log("Not a command interaction");
      return;
    }
    const { commandName } = interaction;
    if (commands[commandName as keyof typeof commands]) {
      commands[commandName as keyof typeof commands].execute(interaction);
    }
  });

  client.login(config.DISCORD_TOKEN);
}
