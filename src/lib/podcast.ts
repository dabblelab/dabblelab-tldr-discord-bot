import { type Prisma, type Podcast } from "@prisma/client";
import { prisma } from "./db";
import { CommandInteraction } from "discord.js";
import { uploadImage, uploadXmlFile } from "./supabase";
import { isValidImage } from "./utils";
import { Podcast as PodcastXml } from "podcast";

type PodcastCreateBody = Prisma.PodcastUncheckedCreateInput;

// export async function syncPodcastOptions(interaction: CommandInteraction) {
//   const channelName = interaction.channel.name;
//   const channelPath = `${interaction.guildId}/${interaction.channelId}`;
//   const siteUrl = `${process.env.SUPABASE_BUCKET_FOLDER_LOCATION}/${channelPath}`;
//   const feedUrl = `${siteUrl}/feed.xml`;

//   const channelId = interaction.channelId;
//   const guildId = interaction.guildId;
//   // const messageId = interaction.id;

//   const licenseKey = interaction.options.get("license_key")?.value || null;
//   const title = interaction.options.get("title")?.value || null;
//   const description = interaction.options.get("description")?.value || null;
//   const imageUrl = interaction.options.get("image_url")?.value || null;
//   const author = interaction.options.get("author")?.value || null;

//   // Verify License Key
//   if (!licenseKey) {
//     return "Please provide a valid license key to continue.";
//   }
//   const license = await prisma.license.findFirst({
//     where: {
//       licenseKey: licenseKey as string,
//       guildId,
//       channelId,
//     },
//   });
//   if (!license) {
//     return "Invalid license key. Please provide a valid license key to continue.";
//   }

//   const defaultData: PodcastCreateBody = {
//     userId,
//     channel: channelName,
//     licenseId: license.id as string,
//     channelId,
//     guildId,
//     feedUrl,
//     siteUrl,
//   };
//   console.log({ defaultData });

//   const dataToSave: Partial<PodcastCreateBody> = {};
//   const variables = { title, description, imageUrl, author };
//   Object.keys(variables).forEach((key) => {
//     if (variables[key]) {
//       dataToSave[key] = variables[key];
//     }
//   });

//   // Process Image URL
//   let errorMessage = "";
//   if (dataToSave?.imageUrl) {
//     const imageUrl = dataToSave?.imageUrl;
//     const isImageValid = await isValidImage(imageUrl);
//     // FIXME: double check the error possiblity
//     if (!isImageValid) {
//       errorMessage += "\nInvalid image URL. Please provide a valid image URL.";
//       delete dataToSave["imageUrl"];
//     } else {
//       const uploadedImage = await uploadImage(
//         imageUrl,
//         channelPath,
//         "artwork",
//         process.env.SUPABASE_BUCKET_NAME,
//       );
//       if (uploadedImage) {
//         dataToSave["imageUrl"] = uploadedImage;
//       } else {
//         delete dataToSave["imageUrl"];
//       }
//     }
//   }

//   const createData: PodcastCreateBody = { ...defaultData, ...dataToSave };
//   const existing = await prisma.podcast.findFirst({ where: { channelId } });
//   const podcast = existing?.id
//     ? await prisma.podcast.update({ data: dataToSave, where: { channelId } })
//     : await prisma.podcast.create({ data: createData });

//   let missingOptions = "";
//   let setOptions = "";
//   Object.keys(variables).forEach((key) => {
//     if (!podcast[key]) {
//       missingOptions += `\nMissing required field: ${key}`;
//     } else {
//       setOptions += `\n${key}: ${podcast[key]}`;
//     }
//   });
//   setOptions += `\nfeed: ${podcast.feedUrl}`;

//   const replyMessage =
//     (setOptions ? `${setOptions}\n` : "") + missingOptions + errorMessage;

//   return replyMessage;
// }

export async function createEpisode(
  interaction: CommandInteraction,
  title: string,
  summary: string,
  audioUrl: string,
) {
  const channelId = interaction.channelId;
  const podcast = await prisma.podcast.findFirst({ where: { channelId } });

  if (podcast?.id) {
    await prisma.episode.create({
      data: {
        title,
        summary,
        podcastId: podcast?.id,
        audioUrl,
      },
    });
    await updatePodcastXml(interaction);
  } else {
    console.log("Unable to create podcast episode as podcast is not present.");
  }
}

export async function updatePodcastXml(interaction: CommandInteraction) {
  const channelPath = `${interaction.guildId}/${interaction.channelId}`;
  const podcast = await prisma.podcast.findFirst({
    where: { channelId: interaction.channelId },
    include: { Episode: true },
  });
  const episodes = podcast?.Episode || [];

  const podcastOptions = {
    title: podcast?.title,
    description: podcast?.description,
    feedUrl: podcast?.feedUrl,
    siteUrl: podcast?.siteUrl,
    language: "en",
    imageUrl: podcast?.imageUrl,
    author: podcast?.author,
    // FIXME: Need real data
    itunesCategory: [
      {
        text: "Education",
      },
    ],
    ituneImage: podcast?.imageUrl,
    customelements: [
      // {
      //   "itunes:owner": {
      //     "itunes:name": "Dabble Lab",
      //     "itunes:email": "rakesh@dabblelab.com",
      //   },
      // },
      // {
      //   "itunes:author": "Dabble Lab",
      // },
      // {
      //   "itunes:summary": "Dabble Lab Podcast",
      // },
      // {
      //   "itunes:explicit": "no",
      // },
      // {
      //   "itunes:keywords": "Dabble Lab, Podcast, Courses",
      // },
      // {
      //   "itunes:type": "episodic",
      // },
      {
        "podcast:locked": "no",
      },
      {
        "podcast:guid": "some-guid",
      },
    ],
  };
  const feed = new PodcastXml(podcastOptions);
  episodes.forEach((file) => {
    feed.addItem({
      title: file.title,
      description: file.summary,
      url: file.audioUrl,
      // guid: file.id, // FIXME: requires string id
      date: new Date(file.createdAt),
      enclosure: {
        url: file.audioUrl,
        // size: file.metadata.size, // FIXME: it should be real data.
        type: "audio/mpeg",
      },
    });
  });

  const xml = feed.buildXml();
  await uploadXmlFile(
    xml,
    channelPath,
    "feed",
    process.env.SUPABASE_BUCKET_NAME,
  );

  return podcast;
}

export async function getSubscribedChannels() {
  try {
    const channels = await prisma.license.findMany({
      select: {
        channelId: true,
      },
    });
    return channels;
  } catch (error) {
    console.log("Unable to fetch channels.", error?.message);
    return [];
  }
}

export const getPodcastById = async (id: string): Promise<Podcast | null> => {
  return await prisma.podcast.findUnique({ where: { id } });
};

export async function getAllUserPodcasts(userId: string) {
  try {
    const podcasts = await prisma.podcast.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return podcasts;
  } catch {
    return [];
  }
}

// TODO: later upgrade to enabled/disabled
export async function getSubscribedPodcasts() {
  try {
    const podcasts = await prisma.podcast.findMany({
      orderBy: { createdAt: "desc" },
      // FIXME: Only for development purpose
      // where: {userId: "clwkl6u7y0000ofp2pboxeqfg"}
    });

    return podcasts;
  } catch {
    return [];
  }
}

export async function createPodcastEpisode(
  podcastId: string,
  channelId: string,
  title: string,
  summary: string,
  audioUrl: string,
) {
  try {
    console.log("Creating episode for podcast", channelId);
    await prisma.episode.create({
      data: {
        title,
        summary,
        podcastId,
        audioUrl,
      },
    });
  } catch {
    console.error("Unable to create a podcast episode");
  }
}
