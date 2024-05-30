import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { syncPodcastOptions } from "../lib/podcast";

export const data = new SlashCommandBuilder()
  .setName("podcast")
  .setDescription("Setup podcast to publish summary as an episode.")
  .addStringOption((option) =>
    option
      .setName("license_key")
      .setDescription("License key for running the bot"),
  )
  .addStringOption((option) =>
    option.setName("title").setDescription("Title of the podcast"),
  )
  .addStringOption((option) =>
    option.setName("description").setDescription("Podcast description"),
  )
  .addStringOption((option) =>
    option.setName("author").setDescription("Name of the podcast author"),
  )
  .addStringOption((option) =>
    option
      .setName("image_url")
      .setDescription("Valid URL of square image 1400px to 3000px"),
  );

export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const missingOptions = await syncPodcastOptions(interaction);
    await interaction.editReply(missingOptions);
  } catch (err) {
    console.error(err);
    return interaction.editReply(
      "Error processing request." + err.message || err,
    );
  }
}
