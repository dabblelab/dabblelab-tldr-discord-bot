import env from "dotenv";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";

env.config();

export const data = new SlashCommandBuilder()
  .setName("tldr-50")
  .setDescription("Summarise last 50 messages.");

export async function execute(interaction: CommandInteraction) {
  try {
    const messages = await interaction.channel.messages.fetch({
      limit: 50,
    });

    const output = Array.from(messages.values())
      .reverse()
      .map(
        (m) =>
          `${m.author.displayName}: ${
            m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content
          }`,
      )
      .join("\n");

    console.log(output);
    console.log(output.length);
    return interaction.reply("Test command executed.");
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
