import env from "dotenv";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { creteSummaryEmbed } from "../utils/embed";

env.config();

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction: CommandInteraction) {
  try {
    const title = "Chat Summary";
    const description =
      "Alyssa had trouble logging into a system but managed to resolve it with Shubham's help. Shubham suggested Alyssa get Okta credentials from Michael and create a local SQL database. Alyssa then asked if she needed to update OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, OKTA_DOMAIN values according to her account, to which Shubham confirmed that she could use Michael's account credentials for now. Shubham also suggested Alyssa contact Mabroor for more tasks, as they need to log more time on UTA. Alyssa encountered an issue with a page asking for her NAF login, which they tried to resolve in a 15-minute call.";
    const fileUrl =
      "https://aiviqgmquscxzcrskmyl.supabase.co/storage/v1/object/public/discord-bot-audio/audioFromAssistant/summary_1711703909116.mp3";

    const summaryEmbed = creteSummaryEmbed({ title, description, fileUrl });

    return interaction.reply({
      embeds: [summaryEmbed],
      files: [
        {
          attachment: fileUrl,
          name: "chat_summary.mp3",
        },
      ],
    });
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
