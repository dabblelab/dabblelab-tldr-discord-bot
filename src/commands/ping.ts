import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction: CommandInteraction) {
  try {
    return interaction.reply("Pong!");
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
