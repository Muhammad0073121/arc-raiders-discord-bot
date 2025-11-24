import { Client, TextChannel, EmbedBuilder, Message } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { MessageDataStore } from '../types';
import { logger } from './logger';
import { 
  getCurrentRotation, 
  getNextRotation, 
  getNextRotationTimestamp,
  formatCondition,
  CONDITION_COLORS
} from '../config/mapRotation';

const DATA_FILE = path.join(__dirname, '../data/messageIds.json');

/**
 * Read message data from file
 */
export function readMessageData(): MessageDataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error reading message data');
  }
  return {};
}

/**
 * Save message data to file
 */
export function saveMessageData(data: MessageDataStore): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error({ err: error }, 'Error saving message data');
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
  const primaryColor = CONDITION_COLORS[current.damMajor] || CONDITION_COLORS[current.damMinor] || 0x5865F2;
  
  const embed = new EmbedBuilder()
    .setTitle('🗺️ Arc Raiders - Map Rotation Status')
    .setDescription(`**Current Conditions** (UTC Hour: ${current.hour}:00)\nNext rotation: <t:${nextTimestamp}:R>`)
    .setColor(primaryColor)
    .addFields(
      // Current Conditions Section
      {
        name: '━━━━━━ 📍 CURRENT CONDITIONS ━━━━━━',
        value: '\u200B', // Invisible character for spacing
        inline: false
      },
      {
        name: '🏔️ Dam',
        value: `Minor: ${formatCondition(current.damMinor)}\nMajor: ${formatCondition(current.damMajor)}`,
        inline: true
      },
      {
        name: '🏛️ Buried City',
        value: `Minor: ${formatCondition(current.buriedCityMinor)}\nMajor: ${formatCondition(current.buriedCityMajor)}`,
        inline: true
      },
      {
        name: '🚀 Spaceport',
        value: `Minor: ${formatCondition(current.spaceportMinor)}\nMajor: ${formatCondition(current.spaceportMajor)}`,
        inline: true
      },
      {
        name: '🌉 Blue Gate',
        value: `Minor: ${formatCondition(current.blueGateMinor)}\nMajor: ${formatCondition(current.blueGateMajor)}`,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      },
      // Next Rotation Section
      {
        name: '━━━━━━ ⏭️ NEXT ROTATION ━━━━━━',
        value: '\u200B',
        inline: false
      },
      {
        name: '🏔️ Dam',
        value: `Minor: ${formatCondition(next.damMinor)}\nMajor: ${formatCondition(next.damMajor)}`,
        inline: true
      },
      {
        name: '🏛️ Buried City',
        value: `Minor: ${formatCondition(next.buriedCityMinor)}\nMajor: ${formatCondition(next.buriedCityMajor)}`,
        inline: true
      },
      {
        name: '🚀 Spaceport',
        value: `Minor: ${formatCondition(next.spaceportMinor)}\nMajor: ${formatCondition(next.spaceportMajor)}`,
        inline: true
      },
      {
        name: '🌉 Blue Gate',
        value: `Minor: ${formatCondition(next.blueGateMinor)}\nMajor: ${formatCondition(next.blueGateMajor)}`,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Arc Raiders Bot • Updates every hour' });
  
  return embed;
}

/**
 * Post or update the map rotation message
 */
export async function postOrUpdateMapMessage(client: Client): Promise<void> {
  const channelId = process.env.CHANNEL_ID;
  
  if (!channelId) {
    logger.error('CHANNEL_ID not set in environment variables');
    return;
  }
  
  try {
    const channel = await client.channels.fetch(channelId) as TextChannel;
    
    if (!channel || !channel.isTextBased()) {
      logger.error('Invalid channel or channel is not text-based');
      return;
    }
    
    const embed = createMapRotationEmbed();
    const messageData = readMessageData();
    const storedData = messageData[channelId];
    
    let message: Message;
    
    // Try to update existing message
    if (storedData?.messageId) {
      try {
        message = await channel.messages.fetch(storedData.messageId);
        await message.edit({ embeds: [embed] });
        logger.info('✅ Updated existing map rotation message');
      } catch (error) {
        // Message doesn't exist, create new one
        logger.info('Previous message not found, creating new one...');
        message = await channel.send({ embeds: [embed] });
        await message.pin();
        logger.info('✅ Created and pinned new map rotation message');
      }
    } else {
      // No stored message, create new one
      message = await channel.send({ embeds: [embed] });
      await message.pin();
      logger.info('✅ Created and pinned new map rotation message');
    }
    
    // Save message data
    messageData[channelId] = {
      channelId: channelId,
      messageId: message.id,
      lastUpdated: new Date().toISOString()
    };
    
    saveMessageData(messageData);
    
  } catch (error) {
    logger.error({ err: error }, 'Error posting/updating map message');
  }
}
