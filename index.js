const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const mapNames = require('./maps.json');

const API_URLS = {
    SERVERS: 'https://plutonium.pw/api/servers',
    GEOIP_LOOKUP: (ip) => `https://geoip.asimpleapi.com/lookup?ip=${ip}`,
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let cachedServers = [];
const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000;

const commands = [
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Fetch information about a Plutonium server.')
        .addStringOption((option) =>
            option
                .setName('servername')
                .setDescription('The name of the server to search for.')
                .setAutocomplete(true)
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get statistics about Plutonium servers.'),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);


(async () => {
    try {
        console.log('Refreshing slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands.map((command) => command.toJSON()) }
        );
        console.log('Slash commands registered.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
})();


async function fetchServers() {
    try {
        const { data } = await axios.get(API_URLS.SERVERS);
        cachedServers = data.map((server) => server.hostname);
        return data;
    } catch (error) {
        console.error('Error fetching servers:', error);
        return [];
    }
}

setInterval(async () => {
    console.log('Refreshing server cache...');
    await fetchServers();
}, CACHE_REFRESH_INTERVAL);

function createServerEmbed(server, mapNames) {
    const readableMapName =
        Object.entries(mapNames[server.game] || {}).find(([name, code]) => code === server.map)?.[0] || server.map;

    return new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle(`Server Information: ${server.hostname}`)
        .setDescription(server.description || 'No description provided')
        .addFields(
            { name: 'IP Address', value: server.ip, inline: true },
            { name: 'Port', value: `${server.port}`, inline: true },
            { name: 'Game', value: server.game, inline: true },
            { name: 'Map', value: `${readableMapName} (${server.map})`, inline: true },
            { name: 'Game Type', value: server.gametype, inline: true },
            { name: 'Players', value: `${server.players.length}/${server.maxplayers}`, inline: true },
            { name: 'Hardcore Mode', value: server.hardcore ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Password Protected', value: server.password ? 'Yes' : 'No', inline: true },
            { name: 'Bots', value: `${server.bots}`, inline: true },
            { name: 'Voice Chat', value: `${server.voice}`, inline: true }
        )
        .setFooter({ text: `Plutonium Revision: ${server.revision}` })
        .setTimestamp();
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused();

        if (!cachedServers.length) {
            await fetchServers();
        }

        const filtered = cachedServers
            .filter((serverName) =>
                serverName.toLowerCase().includes(focusedValue.toLowerCase())
            )
            .slice(0, 25);

        await interaction.respond(filtered.map((server) => ({ name: server, value: server })));
        return;
    }

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'stats') {
            try {
                await interaction.deferReply();

                const servers = await fetchServers();

                const gameModeCounts = {};
                const mapCounts = {};
                const gametypeCounts = {};

                servers.forEach((server) => {
                    gameModeCounts[server.game] = (gameModeCounts[server.game] || 0) + 1;
                    mapCounts[server.map] = (mapCounts[server.map] || 0) + 1;
                    gametypeCounts[server.gametype] =
                        (gametypeCounts[server.gametype] || 0) + 1;
                });

                const sortedGameModes = Object.entries(gameModeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
                const sortedMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
                const sortedGameTypes = Object.entries(gametypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

                const formatField = (entries) =>
                    entries.map(([key, count]) => `**${key}**: ${count}`).join('\n') || 'None';

                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('Plutonium Server Statistics')
                    .addFields(
                        { name: 'Games', value: formatField(sortedGameModes), inline: true },
                        { name: 'Maps', value: formatField(sortedMaps), inline: true },
                        { name: 'Game Types', value: formatField(sortedGameTypes), inline: true }
                    )
                    .setFooter({ text: 'Statistics provided by Plutonium API' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Error handling stats command:', error);
                await interaction.editReply('An error occurred while fetching the statistics.');
            }
        } else if (interaction.commandName === 'serverinfo') {
            const serverName = interaction.options.getString('servername');

            try {
                await interaction.deferReply();

                const servers = await fetchServers();
                const server = servers.find((srv) =>
                    srv.hostname.toLowerCase().includes(serverName.toLowerCase())
                );

                if (!server) {
                    await interaction.editReply(`No server found with the name "${serverName}".`);
                    return;
                }

                const embed = createServerEmbed(server, mapNames);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('geoip_lookup')
                        .setLabel('GeoIP Lookup')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🌍')
                );

                if (server.players.length > 0) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('list_players')
                            .setLabel('List Online Players')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('👥')
                    );
                }

                await interaction.editReply({ embeds: [embed], components: [row] });
            } catch (error) {
                console.error('Error handling serverinfo command:', error);
                await interaction.editReply('An error occurred while fetching the server information.');
            }
        }

        console.log(`[Command] ${interaction.commandName} - ${interaction.user.tag} (${interaction.user.id})`);
    }

    if (interaction.isButton()) {
        const serverName = interaction.message.embeds[0]?.title.replace('Server Information: ', '').trim();

        const servers = await fetchServers();
        const server = servers.find((srv) => srv.hostname === serverName);

        if (!server) {
            console.error('Server not found. Available hostnames:', servers.map((srv) => srv.hostname));

            await interaction.reply({ content: 'Server data not found.', ephemeral: true });
            return;
        }

        if (interaction.customId === 'list_players') {
            const playerList = server.players.map((player) => `**${player.username}** (Ping: ${player.ping}ms)`).join('\n') || 'No players online.';
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`Online Players on ${server.hostname}`)
                .setDescription(playerList)
                .setFooter({ text: 'Player data from Plutonium API' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (interaction.customId === 'geoip_lookup') {
            try {
                const ip = server.ip;
                const { data: geoipData } = await axios.get(API_URLS.GEOIP_LOOKUP(ip));
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('GeoIP Lookup Result')
                    .addFields(
                        { name: 'IP Address', value: geoipData.query || 'Unknown', inline: true },
                        { name: 'Country', value: geoipData.country || 'Unknown', inline: true },
                        { name: 'State', value: geoipData.state || 'Unknown', inline: true },
                        { name: 'City', value: geoipData.city || 'Unknown', inline: true },
                        { name: 'ISP', value: geoipData.isp || 'Unknown', inline: true },
                        { name: 'ASN', value: `${geoipData.asn}` || 'Unknown', inline: true }
                    )
                    .setFooter({ text: 'GeoIP data provided by asimpleapi.com' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error fetching GeoIP data:', error);
                await interaction.reply({ content: 'An error occurred during GeoIP lookup.', ephemeral: true });
            }
        }

        console.log(`[Button Click] Server: ${server.hostname}, Custom ID: ${interaction.customId} - ${interaction.user.tag} (${interaction.user.id})`);
    }
});

client.login(process.env.TOKEN);
