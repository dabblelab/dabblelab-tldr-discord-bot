import { Client } from "discord.js";
import { commands } from "../commands";
// import { deployCommands } from "../utils/deploy-commands";
import { config } from "../utils/config";
import { CronJob } from "cron";
import { publishPodcasts } from "./publisher";

export async function initializeDiscordBot() {
  const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
  });

  client.once("ready", () => {
    console.log("Discord bot is ready! 🤖");
  });

  client.on("guildCreate", async (guild) => {
    console.log(`Joined a new guild: ${guild.name}`);
    // await deployCommands({ guildId: guild.id });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) {
      console.log("Not a command interaction");
      return;
    }

    // const { commandName } = interaction;
    // if (commands[commandName as keyof typeof commands]) {
    //   commands[commandName as keyof typeof commands].execute(interaction);
    // }
  });

  // Set Cron Job
  const publishPodcastWithClient = publishPodcasts.bind(
    null,
    client,
    [],
    false,
  );
  const dailyMidnight = "0 0 * * *";
  // const everyMinute = "0 */1 * * * *";
  const scheduledMessageWednesday = new CronJob(
    dailyMidnight,
    publishPodcastWithClient,
  );
  scheduledMessageWednesday.start();

  client.login(config.DISCORD_TOKEN);
}
