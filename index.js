const { Client, GatewayIntentBits, Events } = require('discord.js');

// ================= CONFIGURATION =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const YOUR_USER_ID = process.env.YOUR_USER_ID;  // Your 18-digit Discord ID
// =================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Track ping statistics
let pingCount = 0;
let lastPingTime = null;

client.once(Events.ClientReady, (c) => {
    console.log(`✅ ${c.user.tag} is online and acting as your PA!`);
    console.log(`📡 Monitoring pings for user ID: ${YOUR_USER_ID}`);
    console.log(`🤖 Active in ${client.guilds.cache.size} servers`);
    console.log(`📋 Servers:`);
    
    // List all servers the bot is in
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    console.log(`\n🎯 Bot is ready! Set your status to offline/invisible to activate auto-replies.`);
});

client.on(Events.MessageCreate, async (message) => {
    // Ignore bots
    if (message.author.bot) return;
    
    // Only work in servers (not DMs)
    if (!message.guild) return;
    
    // Check if message mentions YOU
    const isMentioned = message.mentions.users.has(YOUR_USER_ID);
    if (!isMentioned) return;
    
    // Get your member object in this server
    const yourMember = message.guild.members.cache.get(YOUR_USER_ID);
    if (!yourMember) {
        console.log(`⚠️ Could not find you in server: ${message.guild.name}`);
        return;
    }
    
    // Check if you're offline or invisible
    const status = yourMember.presence?.status;
    const isOffline = status === 'offline' || status === 'invisible';
    
    // Get the sender's display name (nickname or username)
    const senderMember = message.guild.members.cache.get(message.author.id);
    const senderDisplayName = senderMember?.nickname || message.author.globalName || message.author.username;
    
    // Get YOUR display name in this server (for the reply text, no ping)
    const yourDisplayName = yourMember?.nickname || client.user.globalName || client.user.username;
    
    // Log the ping
    pingCount++;
    lastPingTime = new Date();
    console.log(`\n📨 Ping #${pingCount}`);
    console.log(`   From: ${message.author.tag} (${senderDisplayName})`);
    console.log(`   Server: ${message.guild.name}`);
    console.log(`   Channel: #${message.channel.name}`);
    console.log(`   Your status: ${status || 'unknown'}`);
    console.log(`   Will reply: ${isOffline ? 'YES ✅' : 'NO (you are online)'}`);
    
    // Only reply if offline/invisible
    if (!isOffline) return;
    
    try {
        // Custom reply message:
        // - @sender (pings them)
        // - your name as plain text (no @)
        const replyMessage = `Hello @${senderDisplayName}, I am assistant of ${yourDisplayName}. If your message is important please DM to ${yourDisplayName}!`;
        
        // Send reply - only ping the sender, NOT yourself
        await message.reply({
            content: replyMessage,
            allowedMentions: { 
                users: [message.author.id]  // Only ping the sender
            }
        });
        console.log(`   ✅ Replied to ${senderDisplayName} (${message.author.tag})`);
        console.log(`   📝 Reply: ${replyMessage}`);
    } catch (error) {
        console.error(`   ❌ Failed to reply: ${error.message}`);
    }
});

// Handle errors gracefully
client.on(Events.Error, (error) => {
    console.error('❌ Bot error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Login
client.login(BOT_TOKEN);
