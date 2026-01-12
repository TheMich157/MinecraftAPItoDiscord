const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const { decrypt } = require('../api/crypto-utils');
const { config: envConfig, validateConfig } = require('./config');
const { initializeRCON, executeRCONCommand, watchLogFile, getLogFilePath } = require('./rcon-utils');
const { 
  readConfig, 
  getServerIP, 
  validateMinecraftUsername, 
  createErrorEmbed, 
  createSuccessEmbed, 
  createInfoEmbed,
  formatList,
  paginateArray,
  checkCooldown,
  logAction,
  truncateText
} = require('./utils');

process.env.RCON_HOST = envConfig.rcon.host;
process.env.RCON_PORT = envConfig.rcon.port.toString();
process.env.RCON_PASSWORD = envConfig.rcon.password;

const DATA_DIR = path.join(__dirname, '..', 'data');
const API_URL = envConfig.apiUrl;
const BOT_PORT = envConfig.botPort;

const adminCache = new Map();
const ADMIN_CACHE_TTL = 60000;

async function isAdmin(discordId, useCache = true) {
  const cacheKey = `admin:${discordId}`;
  
  if (useCache && adminCache.has(cacheKey)) {
    const cached = adminCache.get(cacheKey);
    if (Date.now() - cached.timestamp < ADMIN_CACHE_TTL) {
      return cached.isAdmin;
    }
  }
  
  const config = await readConfig(false);
  const envAdminIds = envConfig.access?.adminDiscordIds || [];
  const fileAdminIds = config?.adminDiscordIds || [];
  const adminIds = [...new Set([...envAdminIds, ...fileAdminIds])];
  const result = adminIds.length > 0 && adminIds.includes(discordId);
  
  if (useCache) {
    adminCache.set(cacheKey, {
      isAdmin: result,
      timestamp: Date.now()
    });
  }
  
  return result;
}

let consoleMirrorWatcher = null;
let consoleChannelId = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const app = express();
app.use(express.json());

async function sendNotification(payload) {
  const { type, userId, message, minecraftUsername, discordUsername } = payload || {};

  const config = await readConfig();

  if (type === 'approval') {
    if (userId) {
      try {
        const user = await client.users.fetch(userId);
        if (user) {
          const notificationEmbed = new EmbedBuilder()
            .setTitle('Whitelist Request Approved!')
            .setDescription(message || `Your whitelist request has been approved!`)
            .addFields(
              { name: 'Minecraft Username', value: minecraftUsername || 'Not provided', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

          await user.send({ embeds: [notificationEmbed] });
        }
      } catch (error) {
        console.log('Could not DM user');
      }
    }

    if (config && config.notificationChannelId) {
      try {
        const channel = await client.channels.fetch(config.notificationChannelId);
        if (channel) {
          const channelEmbed = new EmbedBuilder()
            .setTitle('Whitelist Request Approved')
            .setDescription(`A whitelist request has been approved`)
            .addFields(
              { name: 'Discord User', value: discordUsername ? `<@${userId}> (${discordUsername})` : `<@${userId}>`, inline: true },
              { name: 'Minecraft Username', value: minecraftUsername || 'Not provided', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

          await channel.send({ embeds: [channelEmbed] });
        }
      } catch (error) {
        console.error('Error sending to channel:', error);
      }
    }

    return true;
  }

  if (type === 'channel') {
    if (config && config.notificationChannelId) {
      const channel = await client.channels.fetch(config.notificationChannelId);
      if (channel) {
        await channel.send({ content: message });
      }
    }
    return true;
  }

  return false;
}

function verifyNotifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.NOTIFY_SECRET || 'change-this-secret'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/notify', verifyNotifyAuth, async (req, res) => {
  try {
    await sendNotification(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

if (validateConfig()) {
  console.log('Bot configuration validated successfully');
}

function startNotifyServer(portOverride) {
  const listenPort = portOverride || BOT_PORT || 3002;
  return app.listen(listenPort, () => {
    console.log(`Bot notification server running on port ${listenPort}`);
    console.log(`API URL: ${API_URL}`);
  });
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('requestwhitelist')
      .setDescription('Request to be added to the Minecraft server whitelist')
      .addStringOption(option =>
        option.setName('minecraft_username')
          .setDescription('Your Minecraft username')
          .setRequired(false)
      ),
    
    new SlashCommandBuilder()
      .setName('server')
      .setDescription('Get Minecraft server information (IP/domain)'),
    
    new SlashCommandBuilder()
      .setName('dashboard')
      .setDescription('Get a link to the whitelist dashboard'),
    
    new SlashCommandBuilder()
      .setName('whitelist')
      .setDescription('Manage Minecraft server whitelist (Admin only)')
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add a player to the whitelist')
          .addStringOption(option =>
            option.setName('username')
              .setDescription('Minecraft username to add')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove a player from the whitelist')
          .addStringOption(option =>
            option.setName('username')
              .setDescription('Minecraft username to remove')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List all whitelisted players')
          .addStringOption(option =>
            option.setName('username')
              .setDescription('Search for a specific username (optional)')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('reload')
          .setDescription('Reload the whitelist from file')
      ),
    
    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a player from the Minecraft server (Admin only)')
      .addStringOption(option =>
        option.setName('username')
          .setDescription('Minecraft username to ban')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for the ban (optional)')
          .setRequired(false)
      ),
    
    new SlashCommandBuilder()
      .setName('pardon')
      .setDescription('Unban a player from the Minecraft server (Admin only)')
      .addStringOption(option =>
        option.setName('username')
          .setDescription('Minecraft username to unban')
          .setRequired(true)
      ),
    
    new SlashCommandBuilder()
      .setName('command')
      .setDescription('Execute a Minecraft server command (Admin only)')
      .addStringOption(option =>
        option.setName('command')
          .setDescription('Minecraft command to execute (without /)')
          .setRequired(true)
      )
  ].map(command => command.toJSON());

  const config = await readConfig();
  if (!config || !config.botToken) {
    console.error('Bot token not configured');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.botToken || process.env.BOT_TOKEN || envConfig.botToken);
  const clientId = client.application?.id || client.user?.id || config.clientId || envConfig.discordClientId || process.env.DISCORD_CLIENT_ID;

  if (!clientId) {
    console.error('Client ID not found');
    return;
  }

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('Slash commands registered successfully');
  } catch (error) {
    console.error('Error registering commands:', error?.response?.data || error);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const content = message.content.toLowerCase().trim();
  const userId = message.author.id;
  const command = content.split(/\s+/)[0];
  
  try {
    if (command === '!ip' || command === '!server') {
      const cooldown = checkCooldown(userId, 'ip', 5000);
      if (cooldown > 0) {
        return;
      }
      
      const ip = await getServerIP();
      const embed = createInfoEmbed(
        'Minecraft Server Information',
        `**Server IP/Domain:** ${ip}`,
        [],
        0x00ff00
      );
      
      await message.reply({ embeds: [embed] });
      logAction('COMMAND_IP', userId, { channel: message.channel.id });
      
    } else if (command === '!dashboard') {
      const cooldown = checkCooldown(userId, 'dashboard', 5000);
      if (cooldown > 0) {
        return;
      }
      
      const dashboardUrl = envConfig.dashboard.url;
      const embed = createInfoEmbed(
        'Whitelist Dashboard',
        `Access the whitelist dashboard at:\n**${dashboardUrl}**`,
        [],
        0x3498db
      );
      
      await message.reply({ embeds: [embed] });
      logAction('COMMAND_DASHBOARD', userId, { channel: message.channel.id });
    }
  } catch (error) {
    console.error('[MESSAGE] Error handling message command:', error);
    logAction('COMMAND_ERROR', userId, { error: error.message, command });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  if (commandName === 'server' || commandName === 'ip') {
    await interaction.deferReply({ ephemeral: false });
    
    try {
      const cooldown = checkCooldown(interaction.user.id, 'server', 3000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before using this command again.` 
        });
      }
      
      const ip = await getServerIP();
      const embed = createInfoEmbed(
        'Minecraft Server Information',
        `**Server IP/Domain:** ${ip}`,
        [],
        0x00ff00
      );
      
      await interaction.editReply({ embeds: [embed] });
      logAction('COMMAND_SERVER', interaction.user.id, { guild: interaction.guild?.id });
    } catch (error) {
      console.error('[COMMAND] Server command error:', error);
      const errorEmbed = createErrorEmbed('Server Command Error', 'Failed to get server information', error);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
    return;
  }

  if (commandName === 'dashboard') {
    await interaction.deferReply({ ephemeral: false });
    
    try {
      const cooldown = checkCooldown(interaction.user.id, 'dashboard', 3000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before using this command again.` 
        });
      }
      
      const dashboardUrl = envConfig.dashboard.url;
      const embed = createInfoEmbed(
        'Whitelist Dashboard',
        `Access the whitelist dashboard at:\n**${dashboardUrl}**`,
        [],
        0x3498db
      );
      
      await interaction.editReply({ embeds: [embed] });
      logAction('COMMAND_DASHBOARD', interaction.user.id, { guild: interaction.guild?.id });
    } catch (error) {
      console.error('[COMMAND] Dashboard command error:', error);
      const errorEmbed = createErrorEmbed('Dashboard Command Error', 'Failed to get dashboard URL', error);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
    return;
  }

  if (commandName === 'whitelist') {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    
    try {
      const cooldown = checkCooldown(userId, 'whitelist', 2000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before using this command again.` 
        });
      }

      if (!(await isAdmin(userId))) {
        const errorEmbed = createErrorEmbed('Permission Denied', 'You do not have permission to use this command. Only administrators can manage the whitelist.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const subcommand = interaction.options.getSubcommand();
      const config = await readConfig();
      const minecraftServerDomain = config?.minecraftServerDomain || 'http://localhost:3003';
      const minecraftApiKey = config?.minecraftApiKey;

      if (!minecraftApiKey) {
        const errorEmbed = createErrorEmbed('Configuration Error', 'Minecraft API key not configured. Please configure it in the dashboard.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      if (subcommand === 'add') {
        const username = interaction.options.getString('username').trim();
        
        if (!validateMinecraftUsername(username)) {
          const errorEmbed = createErrorEmbed('Invalid Username', 'Minecraft username must be 3-16 alphanumeric characters and underscores only.');
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          const response = await axios.post(`${minecraftServerDomain}/api/whitelist/add`, {
            username: username
          }, {
            headers: {
              'X-API-Key': minecraftApiKey,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          if (response.data.success) {
            const embed = createSuccessEmbed(
              'Whitelist Add Success',
              `${username} has been added to the whitelist`,
              [
                { name: 'UUID', value: response.data.uuid || 'N/A', inline: true },
                { name: 'Mode', value: response.data.mode || 'N/A', inline: true },
                { name: 'Added by', value: `<@${userId}>`, inline: true }
              ]
            );
            
            await interaction.editReply({ embeds: [embed] });
            logAction('WHITELIST_ADD', userId, { username, uuid: response.data.uuid });

            if (envConfig.rcon.enabled) {
              try {
                await executeRCONCommand(`whitelist add ${username}`);
                logAction('RCON_COMMAND', userId, { command: `whitelist add ${username}`, success: true });
              } catch (error) {
                console.error('[RCON] Command failed:', error);
                logAction('RCON_COMMAND', userId, { command: `whitelist add ${username}`, success: false, error: error.message });
              }
            }
          }
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
          const errorEmbed = createErrorEmbed('Whitelist Add Failed', errorMessage, error);
          await interaction.editReply({ embeds: [errorEmbed] });
          logAction('WHITELIST_ADD_ERROR', userId, { username, error: errorMessage });
        }
        
      } else if (subcommand === 'remove') {
        const username = interaction.options.getString('username').trim();

        if (!validateMinecraftUsername(username)) {
          const errorEmbed = createErrorEmbed('Invalid Username', 'Minecraft username must be 3-16 alphanumeric characters and underscores only.');
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          const response = await axios.delete(`${minecraftServerDomain}/api/whitelist/remove`, {
            data: { username: username },
            headers: {
              'X-API-Key': minecraftApiKey,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          if (response.data.success) {
            const embed = createSuccessEmbed(
              'Whitelist Remove Success',
              `${username} has been removed from the whitelist`,
              [
                { name: 'Removed by', value: `<@${userId}>`, inline: true }
              ]
            );
            
            await interaction.editReply({ embeds: [embed] });
            logAction('WHITELIST_REMOVE', userId, { username });

            if (envConfig.rcon.enabled) {
              try {
                await executeRCONCommand(`whitelist remove ${username}`);
                logAction('RCON_COMMAND', userId, { command: `whitelist remove ${username}`, success: true });
              } catch (error) {
                console.error('[RCON] Command failed:', error);
                logAction('RCON_COMMAND', userId, { command: `whitelist remove ${username}`, success: false, error: error.message });
              }
            }
          }
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
          const errorEmbed = createErrorEmbed('Whitelist Remove Failed', errorMessage, error);
          await interaction.editReply({ embeds: [errorEmbed] });
          logAction('WHITELIST_REMOVE_ERROR', userId, { username, error: errorMessage });
        }
        
      } else if (subcommand === 'list') {
        const searchUsername = interaction.options.getString('username')?.trim();

        try {
          const response = await axios.get(`${minecraftServerDomain}/api/whitelist/status`, {
            headers: {
              'X-API-Key': minecraftApiKey
            },
            timeout: 10000
          });

          if (response.data.success) {
            let users = response.data.users || [];
            
            if (searchUsername) {
              users = users.filter(u => u.toLowerCase().includes(searchUsername.toLowerCase()));
            }

            const userList = users.length > 0 ? formatList(users, 1900) : 'No players found';
            const description = searchUsername 
              ? `**Search Results:** ${users.length} player(s) found matching "${searchUsername}"`
              : `**Total Players:** ${response.data.count}`;

            const embed = createInfoEmbed(
              '📋 Whitelist Status',
              description,
              [
                { name: 'Players', value: userList, inline: false }
              ],
              0x3498db
            );
            
            await interaction.editReply({ embeds: [embed] });
            logAction('WHITELIST_LIST', userId, { search: searchUsername || 'all', count: users.length });
          }
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
          const errorEmbed = createErrorEmbed('Whitelist List Failed', errorMessage, error);
          await interaction.editReply({ embeds: [errorEmbed] });
          logAction('WHITELIST_LIST_ERROR', userId, { error: errorMessage });
        }
        
      } else if (subcommand === 'reload') {
        if (!envConfig.rcon.enabled) {
          const errorEmbed = createErrorEmbed('RCON Not Enabled', 'RCON is not enabled. Cannot reload whitelist.');
          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          await executeRCONCommand('whitelist reload');
          const embed = createSuccessEmbed(
            'Whitelist Reloaded',
            'The whitelist has been reloaded from file',
            [
              { name: 'Reloaded by', value: `<@${userId}>`, inline: true }
            ]
          );
          
          await interaction.editReply({ embeds: [embed] });
          logAction('WHITELIST_RELOAD', userId, { success: true });
        } catch (error) {
          const errorEmbed = createErrorEmbed('Whitelist Reload Failed', error.message, error);
          await interaction.editReply({ embeds: [errorEmbed] });
          logAction('WHITELIST_RELOAD_ERROR', userId, { error: error.message });
        }
      }
    } catch (error) {
      console.error('[COMMAND] Whitelist command error:', error);
      const errorEmbed = createErrorEmbed('Command Error', 'An unexpected error occurred', error);
      await interaction.editReply({ embeds: [errorEmbed] });
      logAction('WHITELIST_COMMAND_ERROR', userId, { error: error.message });
    }
    return;
  }

  if (commandName === 'ban') {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    
    try {
      const cooldown = checkCooldown(userId, 'ban', 3000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before using this command again.` 
        });
      }

      if (!(await isAdmin(userId))) {
        const errorEmbed = createErrorEmbed('Permission Denied', 'You do not have permission to use this command. Only administrators can ban players.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      if (!envConfig.rcon.enabled) {
        const errorEmbed = createErrorEmbed('RCON Not Enabled', 'RCON is not enabled. Cannot execute ban command.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const username = interaction.options.getString('username').trim();
      const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

      if (!validateMinecraftUsername(username)) {
        const errorEmbed = createErrorEmbed('Invalid Username', 'Minecraft username must be 3-16 alphanumeric characters and underscores only.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const banCommand = reason && reason !== 'No reason provided' 
        ? `ban ${username} ${reason}`
        : `ban ${username}`;
      
      await executeRCONCommand(banCommand);
      
      const embed = createSuccessEmbed(
        'Player Banned',
        `${username} has been banned from the server`,
        [
          { name: 'Reason', value: truncateText(reason, 1024), inline: false },
          { name: 'Banned by', value: `<@${userId}>`, inline: true }
        ],
        0xff0000
      );
      
      await interaction.editReply({ embeds: [embed] });
      logAction('BAN_PLAYER', userId, { username, reason });
    } catch (error) {
      console.error('[COMMAND] Ban command error:', error);
      const errorEmbed = createErrorEmbed('Ban Failed', error.message || 'Failed to ban player', error);
      await interaction.editReply({ embeds: [errorEmbed] });
      logAction('BAN_ERROR', userId, { error: error.message });
    }
    return;
  }

  if (commandName === 'pardon') {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    
    try {
      const cooldown = checkCooldown(userId, 'pardon', 3000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before using this command again.` 
        });
      }

      if (!(await isAdmin(userId))) {
        const errorEmbed = createErrorEmbed('Permission Denied', 'You do not have permission to use this command. Only administrators can unban players.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      if (!envConfig.rcon.enabled) {
        const errorEmbed = createErrorEmbed('RCON Not Enabled', 'RCON is not enabled. Cannot execute pardon command.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const username = interaction.options.getString('username').trim();

      if (!validateMinecraftUsername(username)) {
        const errorEmbed = createErrorEmbed('Invalid Username', 'Minecraft username must be 3-16 alphanumeric characters and underscores only.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      await executeRCONCommand(`pardon ${username}`);
      
      const embed = createSuccessEmbed(
        'Player Unbanned',
        `${username} has been unbanned from the server`,
        [
          { name: 'Unbanned by', value: `<@${userId}>`, inline: true }
        ]
      );
      
      await interaction.editReply({ embeds: [embed] });
      logAction('PARDON_PLAYER', userId, { username });
    } catch (error) {
      console.error('[COMMAND] Pardon command error:', error);
      const errorEmbed = createErrorEmbed('Pardon Failed', error.message || 'Failed to unban player', error);
      await interaction.editReply({ embeds: [errorEmbed] });
      logAction('PARDON_ERROR', userId, { error: error.message });
    }
    return;
  }

  if (commandName === 'command') {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    
    try {
      const cooldown = checkCooldown(userId, 'command', 5000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before using this command again.` 
        });
      }

      if (!(await isAdmin(userId))) {
        const errorEmbed = createErrorEmbed('Permission Denied', 'You do not have permission to use this command. Only administrators can execute server commands.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      if (!envConfig.rcon.enabled) {
        const errorEmbed = createErrorEmbed('RCON Not Enabled', 'RCON is not enabled. Cannot execute commands.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const command = interaction.options.getString('command').trim();

      if (!command || command.length === 0) {
        const errorEmbed = createErrorEmbed('Invalid Command', 'Command cannot be empty.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const dangerousCommands = ['stop', 'shutdown', 'restart', 'kill', 'op', 'deop'];
      const lowerCommand = command.toLowerCase();
      
      if (dangerousCommands.some(cmd => lowerCommand.startsWith(cmd))) {
        const errorEmbed = createErrorEmbed('Dangerous Command', `Command "${command}" is not allowed for safety reasons.`);
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      try {
        const response = await executeRCONCommand(command);
        
        const { formatCodeBlock } = require('./utils');
        const responseText = response && response.trim().length > 0 
          ? truncateText(response.trim(), 1900) 
          : 'No response';
        
        const embed = createSuccessEmbed(
          'Command Executed',
          'Command executed successfully',
          [
            { name: 'Command', value: `\`${truncateText(command, 1000)}\``, inline: false },
            { name: 'Response', value: formatCodeBlock(responseText), inline: false },
            { name: 'Executed by', value: `<@${userId}>`, inline: true }
          ]
        );
        
        await interaction.editReply({ embeds: [embed] });
        logAction('RCON_COMMAND_EXECUTE', userId, { command, hasResponse: responseText !== 'No response' });
      } catch (error) {
        console.error('[COMMAND] Command execution error:', error);
        const errorEmbed = createErrorEmbed('Command Execution Failed', error.message || 'Failed to execute command', error);
        await interaction.editReply({ embeds: [errorEmbed] });
        logAction('RCON_COMMAND_ERROR', userId, { command, error: error.message });
      }
    } catch (error) {
      console.error('[COMMAND] Command handler error:', error);
      const errorEmbed = createErrorEmbed('Command Handler Error', 'An unexpected error occurred', error);
      await interaction.editReply({ embeds: [errorEmbed] });
      logAction('COMMAND_HANDLER_ERROR', userId, { error: error.message });
    }
    return;
  }

  if (commandName === 'requestwhitelist') {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    
    try {
      const cooldown = checkCooldown(userId, 'requestwhitelist', 10000);
      if (cooldown > 0) {
        return interaction.editReply({ 
          content: `⏳ Please wait ${cooldown} second(s) before submitting another request.` 
        });
      }

      const config = await readConfig();
      if (!config) {
        const errorEmbed = createErrorEmbed('Configuration Error', 'Bot configuration not found. Please contact an administrator.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const envClientIds = envConfig.access?.clientDiscordIds || [];
      const fileClientIds = config.clientDiscordIds || config.allowedDiscordIds || [];
      const clientIds = envClientIds.length > 0 ? envClientIds : fileClientIds;
      
      if (clientIds.length > 0 && !clientIds.includes(userId)) {
        const errorEmbed = createErrorEmbed('Authorization Error', 'You are not authorized to request whitelist access.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      const minecraftUsername = (interaction.options.getString('minecraft_username') || '').trim();
      
      if (minecraftUsername && !validateMinecraftUsername(minecraftUsername)) {
        const errorEmbed = createErrorEmbed('Invalid Username', 'Minecraft username must be 3-16 alphanumeric characters and underscores only.');
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      try {
        const response = await axios.post(`${API_URL}/api/requests`, {
          discordId: userId,
          discordUsername: interaction.user.username,
          minecraftUsername: minecraftUsername
        }, {
          timeout: 10000
        });

        if (config.notificationChannelId) {
          try {
            const channel = await client.channels.fetch(config.notificationChannelId);
            if (channel) {
              const embed = createInfoEmbed(
                'New Whitelist Request',
                'A new whitelist request has been submitted',
                [
                  { name: 'Discord User', value: `<@${userId}> (${interaction.user.username})`, inline: true },
                  { name: 'Minecraft Username', value: minecraftUsername || 'Not provided', inline: true },
                  { name: 'Request ID', value: response.data.id || 'N/A', inline: false },
                  { name: 'Status', value: 'Pending', inline: true }
                ],
                0x3498db
              );

              await channel.send({ embeds: [embed] });
            }
          } catch (error) {
            console.error('[NOTIFICATION] Failed to send to channel:', error);
          }
        }

        const successEmbed = createSuccessEmbed(
          'Whitelist Request Submitted',
          minecraftUsername 
            ? `Your whitelist request has been submitted successfully!\n**Minecraft Username:** ${minecraftUsername}`
            : `Your whitelist request has been submitted successfully!\nPlease provide your Minecraft username in the dashboard.`,
          [
            { name: 'Request ID', value: response.data.id || 'N/A', inline: false },
            { name: 'Status', value: 'Pending', inline: true }
          ]
        );

        await interaction.editReply({ embeds: [successEmbed] });
        logAction('WHITELIST_REQUEST', userId, { username: minecraftUsername || 'not provided', requestId: response.data.id });
      } catch (error) {
        console.error('[COMMAND] Request creation error:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
        const errorEmbed = createErrorEmbed('Request Submission Failed', errorMessage, error);
        await interaction.editReply({ embeds: [errorEmbed] });
        logAction('WHITELIST_REQUEST_ERROR', userId, { error: errorMessage });
      }
    } catch (error) {
      console.error('[COMMAND] Request handler error:', error);
      const errorEmbed = createErrorEmbed('Request Handler Error', 'An unexpected error occurred', error);
      await interaction.editReply({ embeds: [errorEmbed] });
      logAction('REQUEST_HANDLER_ERROR', userId, { error: error.message });
    }
  }
});

async function initializeConsoleMirroring() {
  if (!envConfig.console.mirrorEnabled) {
    console.log('[CONSOLE] Mirroring is disabled');
    return;
  }

  try {
    const config = await readConfig();
    if (!config?.notificationChannelId) {
      console.warn('[CONSOLE] Mirroring enabled but notification channel not configured');
      return;
    }

    consoleChannelId = config.notificationChannelId;

    let logFilePath = envConfig.console.logFilePath;
    
    if (!logFilePath && envConfig.console.serverPath) {
      logFilePath = await getLogFilePath(envConfig.console.serverPath);
    }

    if (!logFilePath) {
      console.warn('[CONSOLE] Mirroring enabled but log file path not found. Set MINECRAFT_LOG_FILE or MINECRAFT_SERVER_PATH environment variable.');
      return;
    }

    console.log(`[CONSOLE] Initializing mirroring from: ${logFilePath}`);

    let messageQueue = [];
    let lastSent = 0;
    const MESSAGE_DELAY = 1000;
    const MAX_QUEUE_SIZE = 10;

    async function sendQueuedMessages() {
      if (messageQueue.length === 0 || Date.now() - lastSent < MESSAGE_DELAY) {
        return;
      }

      const messages = messageQueue.splice(0, Math.min(MAX_QUEUE_SIZE, messageQueue.length));
      lastSent = Date.now();

      try {
        const channel = await client.channels.fetch(consoleChannelId);
        if (channel) {
          for (const message of messages) {
            if (message.length > 2000) {
              const chunks = message.match(/.{1,1990}/g) || [];
              for (const chunk of chunks) {
                await channel.send(formatCodeBlock(chunk));
              }
            } else {
              await channel.send(formatCodeBlock(message));
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error('[CONSOLE] Error sending console messages to Discord:', error);
      }
    }

    setInterval(sendQueuedMessages, MESSAGE_DELAY);

    consoleMirrorWatcher = await watchLogFile(logFilePath, async (formattedLine) => {
      try {
        if (consoleChannelId && formattedLine && formattedLine.content && formattedLine.content.trim().length > 0) {
          const timestamp = formattedLine.timestamp ? `[${formattedLine.timestamp}] ` : '';
          const message = `${timestamp}${formattedLine.content}`;
          
          if (messageQueue.length < 50) {
            messageQueue.push(message);
          }
        }
      } catch (error) {
        console.error('[CONSOLE] Error processing log line:', error);
      }
    }, (error) => {
      console.error('[CONSOLE] Mirroring error:', error);
    });

    console.log('[CONSOLE] Mirroring initialized successfully');
  } catch (error) {
    console.error('[CONSOLE] Failed to initialize mirroring:', error);
  }
}

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  const config = await readConfig();
    if (config && !config.clientId) {
      try {
        const encryptedConfig = await fs.readFile(path.join(DATA_DIR, 'config.json'), 'utf8');
        const configData = JSON.parse(encryptedConfig);
        configData.clientId = client.user.id;
        await fs.writeFile(path.join(DATA_DIR, 'config.json'), JSON.stringify(configData, null, 2));
      } catch (err) {
        console.warn('[CONFIG] Could not persist clientId to config.json:', err.message || err);
      }
    }
  await registerCommands();

  if (envConfig.rcon.enabled) {
    const rconInitialized = await initializeRCON(
      envConfig.rcon.host,
      envConfig.rcon.port,
      envConfig.rcon.password
    );
    if (rconInitialized) {
      console.log('RCON initialized successfully');
    } else {
      console.warn('RCON initialization failed. Admin commands that require RCON will not work.');
    }
  } else {
    console.log('RCON is disabled. Admin commands that require RCON will not work.');
  }

  await initializeConsoleMirroring();
});

async function startBot() {
  const config = await readConfig();
  if (!config || !config.botToken) {
    console.error('Bot token not found in config.json. Please configure it in the dashboard.');
    return;
  }

  try {
    await client.login(config.botToken);
  } catch (error) {
    console.error('Error logging in:', error);
  }
}

if (require.main === module) {
  startNotifyServer();
  startBot();
} else {
  module.exports = {
    notifyApp: app,
    startNotifyServer,
    startBot,
    sendNotification
  };
}
