import { Client, TextChannel, EmbedBuilder, Message } from "discord.js";
import { getSheetData, updateSheetData } from "./googleSheets";
import { MessageDataStore } from "../types";
import { logger } from "./logger";
import {
  getCurrentRotation,
  getNextRotation,
  getNextRotationTimestamp,
  formatCondition,
  CONDITION_COLORS,
} from "../config/mapRotation";

const SHEET_RANGE = "MessageIds!A2:C"; // Assumes a sheet named MessageIds with columns: channelId, messageId, lastUpdated

/**
 * Read message data from Google Sheets
 */
export async function readMessageData(): Promise<MessageDataStore> {
  try {
    const rows = await getSheetData(SHEET_RANGE);
    if (!rows || rows.length === 0) return {};
    const store: MessageDataStore = {};
    for (const row of rows) {
      const [channelId, messageId, lastUpdated] = row;
      if (channelId && messageId) {
        store[channelId] = { channelId, messageId, lastUpdated };
      }
    }
    return store;
  } catch (error) {
    logger.error(
      { err: error },
      "Error reading message data from Google Sheets"
    );
    return {};
  }
}

/**
 * Save message data to Google Sheets
 */
export async function saveMessageData(data: MessageDataStore): Promise<void> {
  try {
    const values = Object.values(data).map((d) => [
      d.channelId,
      d.messageId,
      d.lastUpdated,
    ]);
    await updateSheetData(SHEET_RANGE, values);
  } catch (error) {
    logger.error({ err: error }, "Error saving message data to Google Sheets");
  }
}

/**
 * Create the map rotation embed
 */
export function createMapRotationEmbed(): EmbedBuilder {
  const current = getCurrentRotation();
  const next = getNextRotation();
  const nextTimestamp = getNextRotationTimestamp();

  // Determine embed color based on most severe current condition
  const primaryColor =
    CONDITION_COLORS[current.damMajor] ||
    CONDITION_COLORS[current.damMinor] ||
    0x5865f2;

  const embed = new EmbedBuilder()
    .setTitle("🗺️ Arc Raiders - Map Rotation Status")
    .setDescription(
      `**Current Conditions** (UTC Hour: ${current.hour}:00)\nNext rotation: <t:${nextTimestamp}:R>`
    )
    .setColor(primaryColor)
    .addFields(
      // Current Conditions Section
      {
        name: "━━━━━━ 📍 CURRENT CONDITIONS ━━━━━━",
        value: "\u200B", // Invisible character for spacing
        inline: false,
      },
      {
        name: "🏔️ Dam",
        value: `Minor: ${formatCondition(
          current.damMinor
        )}\nMajor: ${formatCondition(current.damMajor)}`,
        inline: true,
      },
      {
        name: "🏛️ Buried City",
        value: `Minor: ${formatCondition(
          current.buriedCityMinor
        )}\nMajor: ${formatCondition(current.buriedCityMajor)}`,
        inline: true,
      },
      {
        name: "🚀 Spaceport",
        value: `Minor: ${formatCondition(
          current.spaceportMinor
        )}\nMajor: ${formatCondition(current.spaceportMajor)}`,
        inline: true,
      },
      {
        name: "🌉 Blue Gate",
        value: `Minor: ${formatCondition(
          current.blueGateMinor
        )}\nMajor: ${formatCondition(current.blueGateMajor)}`,
        inline: true,
      },
      {
        name: ":hole: Stella Montis",
        value: `Minor: ${formatCondition(
          current.stellaMontisMinor
        )}\nMajor: ${formatCondition(current.stellaMontisMajor)}`,
        inline: true,
      },
      {
        name: "\u200B",
        value: "\u200B",
        inline: true,
      },
      // Next Rotation Section
      {
        name: "━━━━━━ ⏭️ NEXT ROTATION ━━━━━━",
        value: "\u200B",
        inline: false,
      },
      {
        name: "🏔️ Dam",
        value: `Minor: ${formatCondition(
          next.damMinor
        )}\nMajor: ${formatCondition(next.damMajor)}`,
        inline: true,
      },
      {
        name: "🏛️ Buried City",
        value: `Minor: ${formatCondition(
          next.buriedCityMinor
        )}\nMajor: ${formatCondition(next.buriedCityMajor)}`,
        inline: true,
      },
      {
        name: "🚀 Spaceport",
        value: `Minor: ${formatCondition(
          next.spaceportMinor
        )}\nMajor: ${formatCondition(next.spaceportMajor)}`,
        inline: true,
      },
      {
        name: "🌉 Blue Gate",
        value: `Minor: ${formatCondition(
          next.blueGateMinor
        )}\nMajor: ${formatCondition(next.blueGateMajor)}`,
        inline: true,
      },
      {
        name: ":hole: Stella Montis",
        value: `Minor: ${formatCondition(
          next.stellaMontisMinor
        )}\nMajor: ${formatCondition(next.stellaMontisMajor)}`,
        inline: true,
      },
      {
        name: "\u200B",
        value: "\u200B",
        inline: true,
      }
    )
    .setTimestamp()
    .setFooter({ text: "Arc Raiders Bot • Updates every hour" });

  return embed;
}

import { getServerConfigs } from "./serverConfig";

/**
 * Post or update the map rotation message in a specific channel.
 * @param {Client} client The Discord client.
 * @param {string} channelId The ID of the channel to post in.
 */
export async function postOrUpdateInChannel(
  client: Client,
  channelId: string
): Promise<void> {
  try {
    const channel = (await client.channels.fetch(channelId)) as TextChannel;

    if (!channel || !channel.isTextBased()) {
      logger.warn(`Invalid or non-text channel: ${channelId}`);
      return;
    }

    const embed = createMapRotationEmbed();
    const messageData = await readMessageData();
    const storedData = messageData[channelId];

    let message: Message;

    if (storedData?.messageId) {
      try {
        message = await channel.messages.fetch(storedData.messageId);
        await message.edit({ embeds: [embed] });
        logger.info(`✅ Updated message in channel ${channelId}`);
      } catch (error) {
        logger.warn(`Message not found in ${channelId}, creating a new one.`);
        message = await channel.send({ embeds: [embed] });
        await message.pin();
        logger.info(`✅ Created and pinned a new message in ${channelId}`);
      }
    } else {
      message = await channel.send({ embeds: [embed] });
      await message.pin();
      logger.info(`✅ Created and pinned a new message in ${channelId}`);
    }

    messageData[channelId] = {
      channelId: channelId,
      messageId: message.id,
      lastUpdated: new Date().toISOString(),
    };
    await saveMessageData(messageData);
  } catch (error) {
    logger.error({ err: error }, `Error processing channel ${channelId}`);
  }
}

/**
 * Iterates through all configured servers and updates their map rotation messages.
 * @param {Client} client The Discord client.
 */
export async function postOrUpdateMapMessages(client: Client): Promise<void> {
  const serverConfigs = getServerConfigs();
  const channelIds = Object.values(serverConfigs).map(
    (config) => config.channelId
  );

  if (channelIds.length === 0) {
    logger.info("No servers configured for updates.");
    return;
  }

  for (const channelId of channelIds) {
    await postOrUpdateInChannel(client, channelId);
  }
}
