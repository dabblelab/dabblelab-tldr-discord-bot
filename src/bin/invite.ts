#!/usr/bin/env node

import { Command } from "commander";
import { PrismaClient, Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { publishPodcasts } from "../lib/publisher";
import { uploadImage } from "../lib/supabase";
import { isValidImage, sleep } from "../lib/utils";
import { Client, Events } from "discord.js";

const program = new Command();
const prisma = new PrismaClient();
const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
});
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});
client.login(process.env.DISCORD_TOKEN);

interface InviteOptions {
  guildId: string;
  channelId: string;
  title: string;
  description: string;
  notes: string;
  author: string;
  imageUrl: string;
}
async function createInvite(options: InviteOptions) {
  try {
    while (!client.isReady()) {
      console.log("Discord server getting ready...");
      await sleep(1000);
    }
    const licenseKey = uuidv4();
    const data: Prisma.LicenseCreateInput = {
      guildId: options.guildId,
      channelId: options.channelId,
      description: options.notes,
      licenseKey,
    };
    const license = await prisma.license.create({ data });

    if (!license) {
      throw new Error("Failed to create license. Check if already exist.");
    }
    console.log("License Key: ", license.licenseKey);

    const channelPath = `${options.guildId}/${options.channelId}`;
    const siteUrl = `${process.env.SUPABASE_BUCKET_FOLDER_LOCATION}/${channelPath}`;
    const feedUrl = `${siteUrl}/feed.xml`;

    // Upload Image
    let uploadedImage: string = "";
    if (options?.imageUrl) {
      const imageUrl = options?.imageUrl;
      const isImageValid = await isValidImage(imageUrl);
      if (!isImageValid) {
        throw new Error("Invalid image URL");
      } else {
        uploadedImage = await uploadImage(
          imageUrl,
          channelPath,
          "artwork",
          process.env.SUPABASE_BUCKET_NAME as string,
        );
        if (!imageUrl) {
          throw new Error("Failed to upload image");
        }
      }
    }

    const podcastData: Prisma.PodcastUncheckedCreateInput = {
      licenseId: license.id,
      guildId: options.guildId,
      channelId: options.channelId,
      title: options.title,
      description: options.description,
      author: options.author,
      feedUrl: feedUrl,
      siteUrl: `https://discord.com/channels/${channelPath}`,
      imageUrl: uploadedImage,
    };
    const podcast = await prisma.podcast.create({ data: podcastData });
    console.log("Podcast Feed URL:", podcast.feedUrl);

    console.log("Publishing podcast for channel", options.channelId);
    await publishPodcasts(client, options.channelId);
  } catch (error) {
    console.error("\nError creating invite.", String(error)?.split("\n")?.[0]);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

async function deleteInvite(options) {
  const channelId = options?.channelId;
  if (!channelId) {
    console.error("Channel ID is required to delete invite.");
    return;
  }

  try {
    // get podcast id associated with channelId
    const podcast = await prisma.podcast.findFirst({
      where: { channelId },
      select: { id: true },
    });
    if (!podcast) {
      throw new Error("Podcast not found for channel ID");
    }
    const deletedEpisodes = await prisma.episode.deleteMany({
      where: { podcastId: podcast.id },
    });
    console.log("Deleted Episodes: ", deletedEpisodes.count);
    const deletedPodcasts = await prisma.podcast.deleteMany({
      where: { channelId },
    });
    console.log("Deleted Podcasts: ", deletedPodcasts.count);
    const deletedLicenses = await prisma.license.deleteMany({
      where: { channelId },
    });
    console.log("Deleted Licenses: ", deletedLicenses.count);
  } catch (error) {
    console.error("\nError deleting invite.", String(error)?.split("\n")?.[0]);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

program
  .command("create")
  .description("Create a new podcast invitation")
  .requiredOption(
    "-g, --guildId <guildId>",
    "Guild ID or Server ID of Discord Server",
  )
  .requiredOption(
    "-c, --channelId <channelId>",
    "Channel ID of Discord channel",
  )
  .requiredOption("-t, --title <title>", "Podcast Title")
  .requiredOption("-d, --description <description>", "Podcast Description")
  .requiredOption("-a, --author <author>", "Author Name for podcast")
  .requiredOption("-i, --imageUrl <imageUrl>", "Optional image url")
  .requiredOption("-n, --notes <notes>", "Description for Licence key")
  .action(createInvite)
  .on("--help", () => {
    console.log("");
    console.log("Example:");
    console.log(
      "  $ program create -g <guildId> -c <channelId> -t <title> -d <description> -a <author> -i <imageUrl> -n <notes>",
    );
  });

program
  .command("delete")
  .description("Deletes entries for channel and guild")
  .requiredOption(
    "-c, --channelId <channelId>",
    "Channel ID of Discord channel",
  )
  .action(deleteInvite);

program.parse();
