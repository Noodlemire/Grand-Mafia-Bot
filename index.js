const {Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField} = require("discord.js");
const {REST} = require("@discordjs/rest");
const {Routes} = require("discord-api-types/v9");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const PRE = "!";
const ELEVATED = PermissionsBitField.Flags.ManageGuild;
const EXE_LIMIT = 10000;

const FNAME = ".store.json";
const FNAME2 = ".backup.json";
const CUSTOMDIR = "custom";

const bot = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]});

const interactions = {};
const commands = {};
const guild_commands = {};
const guild_commands_json = [];
const scdata = [];
const conflicts = {};
const menus = {};
const locals = {};
const bodyinfo = {};
const ignorePostNo = {};

const UTILS = require("./utils.js")({bot, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, menus, interactions, fs, path});

const SERVER_DATA = {};
const LOCAL_DATA = {};

var overwriting = false;
function overwrite(src, cb)
{
	if(src && !src.deferred && !src.reply && !src.send)
		return;

	if(overwriting)
	{
		let txt = "Attempt to begin overwriting while already overwriting!";
		if(cb) cb(false, txt);
		console.log("-WARNING: " + txt);
		return;
	}

	overwriting = true;
	let json = JSON.stringify({LOCAL_DATA, SERVER_DATA});

	fs.writeFile(FNAME, json, (err) =>
	{
		if(cb) cb(!err, err);
		if(err) throw err;

		overwriting = false;
	});
}

let c = 1;
function add_cmd(name, cmd)
{
	if(typeof name !== "string")
	{
		let usedNames = {};

		for(let i in name)
		{
			if(usedNames[name[i]])
				console.log("Error: Command \"" + cmd.title + " (" + cmd.cat + (cmd.meta.subCat ? (" " + cmd.meta.subCat) : "") + ")\" tries to use the name \"" + PRE + name[i] + "\" more than once.");
			else
			{
				usedNames[name[i]] = true;
				add_cmd(name[i], cmd);
			}
		}

		return;
	}

	if(name !== name.toLowerCase())
	{
		console.log("WARNING: Command name '" + name + "' is not lowercase!");
		name = name.toLowerCase();
	}

	if(name.match(" "))
	{
		console.log("WARNING: Command name '" + name + "' contains a space!");
		name = name.replace(/ /g, "_");
	}

	if(!cmd.id || !cmd.cat || !cmd.title || !cmd.desc || !cmd.func)
		throw "Error: Malformed command: " + name + "\n" + UTILS.display(cmd);

	if(!cmd.param)
		cmd.param = "";

	if(!cmd.meta)
		cmd.meta = {};

	if(commands[name])
	{
		let n1 = name + "-" + 1;
		let n2 = name + "-" + 2;

		if(commands[n1])
		{
			let i = 2;
			let newname = "";

			do
			{
				i = i + 1;
				newname = name + "-" + i;
			}
			while(commands[newname]);

			commands[newname] = cmd;
			conflicts[name][i-1] = {com: newname, title: cmd.title, cat: cmd.cat, subCat: cmd.meta.subCat};
		}
		else
		{
			commands[n1] = commands[name];
			commands[n2] = cmd;
			conflicts[name] = [{com: n1, title: commands[name].title, cat: commands[name].cat, subCat: commands[name].meta.subCat}, {com: n2, title: cmd.title, cat: cmd.cat, subCat: cmd.meta.subCat}];
			delete commands[name];

			add_cmd(name, {
				id: "c" + c,
				cat: "Conflict",
				title: PRE + name + " Conflict",
				desc: "This command exists because of a conflict between two command names. Use it to learn how to specify which individual command you want to see.",

				func: (chn, src) =>
				{
					let txt = "Command '" + PRE + name + "' refers to multiple commands. Did you mean:\n";

					for(let c in conflicts[name])
					{
						let con = conflicts[name][c];
						txt = txt + "\n" + PRE + con.com + " - " + con.title + " (" + con.cat + (con.subCat && (" " + con.subCat) || "") + ")";
					}

					UTILS.msg(src, txt);
				}
			});

			c = c + 1;
		}
	}
	else
		commands[name] = cmd
}

function add_scmd(name, cmd)
{
	let m = cmd.meta || {};

	let scmd = new SlashCommandBuilder()
		.setName(typeof name === "string" ? name : name[0])
		.setDescription(m.shortDesc || cmd.desc);

	if(m.adminOnly)
		scmd.setDefaultMemberPermissions(ELEVATED);

	if(m.slashOpts)
	{
		let min = m.minArgs || 0;

		for(let i = 0; i < m.slashOpts.length; i++)
		{
			let dt = m.slashOpts[i].datatype;
			if(dt === "Member") dt = "User"; //Why, discord.js?

			scmd["add" + dt + "Option"]((o) => m.slashOpts[i].func(o.setName(m.slashOpts[i].oname).setRequired(i < min)));
		}
	}

	scdata[scdata.length] = scmd.toJSON();

	add_cmd(name, cmd);
}

function add_gcmd(serverid, name, cmd, isNew)
{
	let m = cmd.meta || {};

	let scmd = new SlashCommandBuilder()
		.setName(name)
		.setDescription(m.shortDesc || cmd.desc);

	if(m.adminOnly)
		scmd.setDefaultMemberPermissions(ELEVATED);

	if(m.slashOpts)
	{
		let min = m.minArgs || 0;

		for(let i = 0; i < m.slashOpts.length; i++)
		{
			let dt = m.slashOpts[i].datatype;
			if(dt === "Member") dt = "User"; //Why, discord.js?

			scmd["add" + dt + "Option"]((o) => m.slashOpts[i].func(o.setName(m.slashOpts[i].oname).setRequired(i < min)));
		}
	}

	guild_commands[serverid] = guild_commands[serverid] || {};
	guild_commands_json[serverid] = guild_commands_json[serverid] || [];

	cmd.jsonID = guild_commands_json[serverid].length;
	guild_commands[serverid][name] = cmd;
	guild_commands_json[serverid][cmd.jsonID] = scmd.toJSON();

	if(isNew)
		SERVER_DATA[serverid].gcmd_limit = (SERVER_DATA[serverid].gcmd_limit || 0) + 1;
}

async function refreshCommands(init)
{
	try
	{
		console.log("Updating Slash Commands");

		if(LOCAL_DATA.DEVMODE)
		{
			await rest.put(Routes.applicationGuildCommands(LOCAL_DATA.appID, LOCAL_DATA.DEVMODE),
					{body: scdata.concat(guild_commands_json[SERVER_DATA[LOCAL_DATA.DEVMODE].inherit || LOCAL_DATA.DEVMODE] || [])});

			if(init) await rest.put(Routes.applicationCommands(LOCAL_DATA.appID), {body: []});
		}
		else
			if(init) await rest.put(Routes.applicationCommands(LOCAL_DATA.appID), {body: scdata});

		bot.guilds.cache.forEach(async (guild) =>
		{
			if(SERVER_DATA[guild.id] && guild.id !== LOCAL_DATA.DEVMODE)
				await rest.put(Routes.applicationGuildCommands(LOCAL_DATA.appID, guild.id), {body: guild_commands_json[SERVER_DATA[guild.id].inherit || guild.id] || []});
		});
	}
	catch (err)
	{
		console.error(err);
	}
}

function getMentions(text)
{
	let matched;
	let matchlist = [];
	let mentions = [];
	let regex = /<@/g;

	while(matched = regex.exec(text))
		matchlist[matchlist.length] = matched.index;

	for(let i = 0; i < matchlist.length; i++)
	{
		let end;
		let n;

		for(n = matchlist[i]+2; n < text.length; n++)
		{
			let c = text.charAt(n);

			if(c === '>')
			{
				end = n;
				mentions[mentions.length] = text.substring(matchlist[i], end+1);
				break;
			}
			else if(!UTILS.isInt(c) && !(n === matchlist[i]+2 && c === "&"))
				break;
		}

		if(!end && n == text.length)
			break;
	}

	return mentions;
}

function process(source, limit, runInBodyMode)
{
	let channel = source.channel;
	let embed = new EmbedBuilder();
	let txt = source.content;
	let auth = source.member;
	let args = UTILS.split(source.content.substring(PRE.length), " ");
	let cmd = (args[0] || "").toLowerCase();
	args = args.splice(1);
	limit = limit || 0;

	if(limit > EXE_LIMIT) throw "-ERROR: Overflow";

	let body = UTILS.getActiveBody(bodyinfo[auth.id]);
	if(body && commands[cmd] && !commands[cmd].meta.runInBodyMode && !runInBodyMode)
	{
		body.commands[body.commands.length] = txt;
		UTILS.msg(source, "+Added: " + txt);
		return;
	}

	UTILS.arrayByBraces(args);

	if(commands[cmd])
	{
		let meta = commands[cmd].meta;

		if(meta.slashOnly)
			UTILS.msg(source, "-This command is only usable in Slash Command form.");
		else if(meta.adminOnly && !source.member.permissions.has(ELEVATED))
			UTILS.msg(source, "-You do not have elevated permissions for this bot.");
		else
		{
			if(!meta.rawArgs)
				for(let i = 0; i < args.length; i++)
					args[i] = subprocess(source, args[i], limit, runInBodyMode);

			for(let i = args.length; i >= 0; i--)
				if(args[i] === "")
					args.splice(i, 1);

			if(meta.minArgs && args.length < meta.minArgs)
			{
				UTILS.msg(source, "-USAGE: " + PRE + cmd + " " + commands[cmd].param);
				return;
			}

			commands[cmd].func(channel, source, embed, args);

			if(source.returned)
				return source.returned;
		}
	}
	else
		UTILS.msg(source, "-ERROR: Unknown command: " + PRE + cmd);
}

function subprocess(source, arg, limit, runInBodyMode)
{
	let auth = source.member;
	let loc = source.locals || locals[auth.id];
	let sdata = SERVER_DATA[source.guild.id];
	limit = limit || 0;

	if(typeof arg === "string")
	{
		let op = UTILS.findFirstChar(arg, "{");
		let cl = UTILS.findClosingCharFor(arg, "{", "}", op);

		while(typeof arg === "string" && cl !== undefined && op !== undefined && cl > op)
		{
			let subcmd = subprocess(source, arg.substring(op+1, cl).trim(), limit+1, runInBodyMode);

			if(subcmd.substring(0, PRE.length) === PRE)
			{
				//let subargs = UTILS.split(subcmd, ' ');
				//UTILS.arrayByBraces(subargs);

				//for(let i = 0; i < subargs.length; i++)
				//	if(i > 0 || 

				arg = arg.substring(0, op) + String(process({
					content: subcmd,
					member: auth,
					guild: source.guild,
					channel: source.channel,
					locals: source.locals,
					print: source.print
				}, limit+1, runInBodyMode) || "").trim() + arg.substring(cl+1);
			}
			else if(loc && loc[subcmd] !== undefined)
				arg = arg.substring(0, op) + loc[subcmd] + arg.substring(cl+1);
			else if(sdata && sdata.globals && sdata.globals[subcmd] !== undefined && source.member.permissions.has(ELEVATED))
				arg = arg.substring(0, op) + sdata.globals[subcmd] + arg.substring(cl+1);
			else
				arg = arg.substring(0, op) + subcmd + arg.substring(cl+1);

			cl = UTILS.findFirstChar(arg, "}");
			op = UTILS.findLastCharAfter(arg, "{", cl);
			limit++;

			if(limit > EXE_LIMIT) throw "-ERROR: Overflow";
		}
	}

	return arg;
}

const Player = require("./player.js")({UTILS});
const StructObj = require("./structobj.js")({UTILS, SERVER_DATA, CUSTOMDIR, path, fs, EmbedBuilder});
const registerMenus = require("./struct_menu.js")({UTILS, SERVER_DATA, CUSTOMDIR, path, fs, EmbedBuilder, StructObj, add_gcmd, overwrite, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle});
const Struct = require("./struct.js")({PRE, UTILS, ELEVATED, SERVER_DATA, CUSTOMDIR, path, fs, EmbedBuilder, StructObj, add_gcmd, ActionRowBuilder, ButtonBuilder, ButtonStyle, registerMenus, ignorePostNo});

if(!fs.existsSync(CUSTOMDIR))
	fs.mkdirSync(CUSTOMDIR);

fs.readFile(FNAME, (err1, data) =>
{
	if(err1) throw err1;

	let store = JSON.parse(data);

	if(store.LOCAL_DATA)
		for(let id in store.LOCAL_DATA)
			LOCAL_DATA[id] = store.LOCAL_DATA[id];

	if(!LOCAL_DATA.TOKEN)
		throw "Error: No TOKEN provided.";

	if(!LOCAL_DATA.appID)
		throw "Error: No Application ID (appID) provided.";

	if(store.SERVER_DATA)
	{
		for(let id in store.SERVER_DATA)
		{
			SERVER_DATA[id] = store.SERVER_DATA[id];

			if(SERVER_DATA[id].players)
				for(let i = 0; i < SERVER_DATA[id].players.length; i++)
					SERVER_DATA[id].players[i] = new Player(SERVER_DATA[id].players[i]);

			if(SERVER_DATA[id].structs)
				for(let s in SERVER_DATA[id].structs)
					SERVER_DATA[id].structs[s] = new Struct(id, SERVER_DATA[id].structs[s]);

			fs.writeFileSync("numbers.json", JSON.stringify(ignorePostNo));
		}
	}

	fs.writeFile(FNAME2, data, (err) =>
	{
		if(err) throw err;
	});

	rest = new REST({version: "10"}).setToken(LOCAL_DATA.TOKEN);

	login();
});

const GLOBAL = {
	PRE,
	CUSTOMDIR,
	UTILS,
	ELEVATED,
	EXE_LIMIT,

	Player,
	Struct,
	StructObj,
	
	bot,
	commands,
	guild_commands,
	guild_commands_json,
	add_cmd,
	add_scmd,
	add_gcmd,
	refreshCommands,
	overwrite,
	process,
	subprocess,
	menus,
	registerMenus,
	locals,
	bodyinfo,

	SERVER_DATA,

	EmbedBuilder,
	ActionRowBuilder,
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	path,
	fs,
	fetch,

	ignorePostNo
};

const autoFunc = require("./cmd_auto.js")(GLOBAL);
require("./cmd_basics.js")(GLOBAL);
require("./cmd_game.js")(GLOBAL);
require("./cmd_rng.js")(GLOBAL);
require("./cmd_script.js")(GLOBAL);
require("./cmd_struct.js")(GLOBAL);



bot.on("ready", () =>
{
	console.log("Logged in as " + bot.user.tag + "!");

	/*console.log("Guilds:");
	bot.guilds.cache.forEach(g =>
	{
		g.members.fetch(bot.user.id).then(b =>
		{
			g.members.fetch(g.ownerId).then(o =>
			{
				console.log(g.id + " - " + g.name + " - " + g.memberCount + " - " + o.user.tag + " - " + b.permissions.has("CREATE_INSTANT_INVITE") + " - " + b.permissions.has("ADMINISTRATOR"));
			});
		});
	});*/

	refreshCommands(true);
});

bot.on("messageCreate", (message) =>
{
	let data = SERVER_DATA[message.guild.id];

	if(data && data.relay)
	{
		for(let i = 0; i < data.relay.length; i++)
		{
			let ch1 = message.guild.channels.cache.get(data.relay[i].inp);

			if(ch1 && ch1.id === message.channel.id)
			{
				let ch2 = message.guild.channels.cache.get(data.relay[i].out);

				if(ch2 && (message.author.id !== bot.user.id || message.embeds.length === 0 || !message.embeds[0].timestamp))
				{
					let addedText = "";
					let output = new EmbedBuilder();
					let sender = UTILS.getPlayerByID(SERVER_DATA[message.guild.id].players, message.author.id);

					if(sender && sender.tags.relay_nick)
					{
						let nicklib = UTILS.libSplit(sender.tags.relay_nick, ",", ":");

						if(typeof nicklib === "string")
							output.setAuthor({name: sender.tags.relay_nick});
						else if(nicklib[message.channel.id])
							output.setAuthor({name: nicklib[message.channel.id]});

						if(!output.author)
							for(let nick in nicklib)
								if(!nicklib[nick])
									output.setAuthor({name: nick});
					}

					if(!output.author)
					{
						output.setAuthor({name: message.member.displayName, iconURL: message.author.avatarURL()});
						output.setColor(message.member.displayHexColor);
					}

					output.setTimestamp();
					output.setDescription(message.content);

					if(output.description)
					{
						let mentions = getMentions(output.description);

						for(let n = 0; n < mentions.length; n++)
							addedText = addedText + " " + mentions[n];
					}

					for(const [k, s] of message.stickers)
					{
						if(!output.image)
							output.setImage(s.url);
						else
							output.addFields([{name: s.name, value: s.url}]);
					}

					for(const [k, a] of message.attachments)
					{
						let title = a.contentType;
						if(!title) title = "Attachment";

						if(!output.image && title.substring(0, 5) === "image")
							output.setImage(a.url);
						else
							output.addFields([{name: "Attached: " + title, value: a.url}]);
					}

					let embeds = [output];

					for(let n = 0; n < message.embeds.length; n++)
						embeds[embeds.length] = message.embeds[n];

					ch2.send({content: (addedText.length > 0 ? addedText : null), embeds});
				}
			}
		}
	}

	if(message.author.id !== bot.user.id && data && data.auto && data.structs
			&& data.auto[message.channel.id] && data.structs[data.auto[message.channel.id].struct])
	{
		let output = message.guild.channels.cache.get(data.auto[message.channel.id].output);

		if(output)
			autoFunc(data.structs[data.auto[message.channel.id].struct], data.auto[message.channel.id], message, output, data.locked);
		else
			UTILS.msg(message, "-ERROR: Could not find Output Channel with ID: " + data.auto[message.channel.id].output);

		return;
	}

	if(message.content.substring(0, PRE.length) === PRE)
	{
		try
		{
			process(message);
		}
		catch(err)
		{
			console.log(err);
			console.trace();
			UTILS.msg(message, "-ERROR: " + err);
		}
	}
	else if(SERVER_DATA[message.guild.id])
	{
		UTILS.inherit(SERVER_DATA, message, (data) =>
		{
			let sdata = data.structs;

			if(sdata)
			{
				for(let s in sdata)
				{
					let struct = sdata[s];

					if(struct.getPrefix() === message.content.substring(0, struct.getPrefix().length))
					{
						let args = UTILS.split(message.content.substring(struct.getPrefix().length), " ");
						let cmd = (args[0] || "").toLowerCase();
						args = args.splice(1);

						try
						{
							struct.execute(message, cmd, args, false);
						}
						catch(err)
						{
							console.log(err);
							console.trace();
							UTILS.msg(message, "-ERROR: " + err);
						}

						return;
					}
				}
			}
		});
	}
});

bot.on("interactionCreate", async (i) =>
{
	try
	{
		if(i.commandName)
		{
			let gcmds = guild_commands[(i.guild || {}).id];

			if(SERVER_DATA[(i.guild || {}).id] && SERVER_DATA[(i.guild || {}).id].inherit)
				gcmds = guild_commands[SERVER_DATA[(i.guild || {}).id].inherit];

			let cmd = (gcmds || {})[i.commandName] || commands[i.commandName];

			if(cmd)
			{
				let meta = cmd.meta;

				if(!meta.noDefer)
					await i.deferReply({ephemeral: cmd.meta.ephemeral});

				let embed = new EmbedBuilder();
				let args = [];

				if(meta.slashOpts)
				{
					let min = meta.minArgs || 0;

					for(let a = 0; a < meta.slashOpts.length; a++)
					{
						let dt = meta.slashOpts[a].datatype;
						if(dt === "User") dt = "Member"; //Why, discord.js?

						let arg = i.options["get" + dt](meta.slashOpts[a].oname, a < min);

						if(arg !== null && arg !== undefined)
							args[a] = arg;
					}
				}

				try
				{
					cmd.func(i.channel, i, embed, args);
				}
				catch(err)
				{
					UTILS.msg(i, "-ERROR: " + err);
					console.error(err);
				}
			}
		}
		else if(i.customId && interactions[i.customId])
			if(!interactions[i.customId](i))
				i.update({});
	}
	catch(err)
	{
		console.error(err);
	}
});

bot.on("debug", (e) => console.log(e));
bot.on("error", (error) => console.log("ERROR: " + error.name + " - " + error.message + "\n\n" + error.trace));
bot.on("shardError", (error) => console.log("SHARD ERROR: " + error.name + " - " + error.message + "\n\n" + error.trace));

function login()
{
	bot.login(LOCAL_DATA.TOKEN);
}

function intervalMenu(menus, callback)
{
	let now = new Date().getTime();

	for(let mid in menus)
	{
		let menu = menus[mid];
		menu.time = menu.time || new Date().getTime();

		if(now - menu.time >= 3600000)
			callback(menu, menu.message, mid);
	}
}

setInterval(() =>
{
	intervalMenu(menus, (menu, message, mid) =>
	{
		if(menu.type === "text")
			message.edit({components: [], content: menu.list[menu.page-1]});
		else if(message.embeds[0])
			message.edit({components: [], embeds: [message.embeds[0]]});

		delete menus[mid];
	});

	intervalMenu(registerMenus, (menu, message, mid) =>
	{
		delete registerMenus[menu.operator];
	});
}, 1000);

setInterval(() =>
{
	let doOverwrite = false;

	for(let s in SERVER_DATA)
	{
		let server = SERVER_DATA[s];

		if(server.gcmd_limit)
		{
			server.gcmd_limit--;

			if(server.gcmd_limit <= 0)
				delete server.gcmd_limit;

			doOverwrite = true;
		}
	}

	if(doOverwrite) overwrite();
}, 3600000);
