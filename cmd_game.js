function commaCheck(UTILS, t, s)
{
	if(t)
		return UTILS.containsString(UTILS.split(t, ','), s);
	else
		return false;
}

function firstname(p)
{
	let name;

	if(typeof p === "string")
		name = p;
	else
		name = p.dispname || p.nicknames[0] || "unknown (bug)";

	return name.substring(0, 1).toUpperCase() + name.substring(1);
}

module.exports = (g) =>
{
	const {PRE, CUSTOMDIR, UTILS, Player, add_scmd, overwrite, menus, ActionRowBuilder, SERVER_DATA, path, fs} = g;
	let i = 0;
	
	function register_scmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}
	
		add_scmd(name, {
			id: "g" + i,
			cat: "Game",
			title,
			desc,
			param,
			meta,
			func: (chn, source, e, args) =>
			{
				let id = source.guild.id;

				if(!SERVER_DATA[id])
					SERVER_DATA[id] = {players: [], relay: []};

				return func(chn, source, e, args);
			}
		});

		i = i + 1;
	}

	function player(source, pdata, defaults, args, a)
	{
		let func = (user) =>
		{
			for(let i = 0; i < pdata.length; i++)
			{
				if(pdata[i].id === (user ? user.id : args[a]))
				{
					UTILS.msg(source, "-Cannot register duplicate player.");
					return;
				}
			}

			let num = pdata.length;
			let nicknames = [];
			let player_channel = source.guild.channels.cache.get(args[1].substring(2, args[1].length-1));

			if(!player_channel)
			{
				UTILS.msg(source, "-Invalid player channel: " + args[1]);
			}

			for(let i = a+2; i < args.length; i++)
			{
				if(UTILS.getPlayerByName(pdata, args[i].toLowerCase().replace(/ /g, "_")))
				{
					UTILS.msg(source, "-Cannot register player with duplicate nickname: \"" + args[i] + "\"");
					return;
				}

				if(args[i] === "*")
				{
					UTILS.msg("-The name '*' cannot be used. Sorry.");
					return;
				}

				nicknames[i - 1 - a] = args[i].toLowerCase().replace(/ /g, "_");
			}

			if(nicknames.length === 0)
				nicknames[0] = (user ? user.displayName : args[a]).toLowerCase().replace(/ /g, "_");

			for(let i = pdata.length; i >= num; i--)
			{
				if(i === num)
				{
					pdata[i] = new Player((user ? user.id : args[a]), i+1, nicknames, (user ? user.displayName : args[a]).replace(/ /g, "").replace(/_/g, ""), player_channel, defaults.tags);
				}
				else
				{
					pdata[i] = pdata[i-1];
					pdata[i].num++;
				}
			}

			overwrite();
			UTILS.msg(source, "+Player " + (num+1) + " registered successfully!");
		};

		if(UTILS.isLong(args[a]))
			source.guild.members.fetch(args[a]).catch(console.error).then(func);
		else
			func();
	}

	register_scmd(["add_player", "addplayer"], "<Player ID or NPC Name> <#Player Channel> [Nickname(s)...]", "Add Player", "Add a player or NPC into the bot's local storage, enabling use with round procesing and other features.\n\nIf you don't provide at least one nickname, the player's current display name will be used instead.\n\nIf you supply a name in place of a User ID, an NPC will be added instead. This name will also be the default nickname, if no others are provided.",
	{
		adminOnly: true, minArgs: 2, shortDesc: "Register a player or NPC for use with round procesing and other features.", slashOpts:
		[
			{datatype: "String", oname: "player_id", func: (str) => str.setDescription("User ID for a player, or a name for an NPC.")},
			{datatype: "String", oname: "player_chn", func: (str) => str.setDescription("#Channel that is reserved for the player, used for whispers.")},
			{datatype: "String", oname: "nickname1", func: (str) => str.setDescription("First nickname, always displayed by default in text.")},
			{datatype: "String", oname: "nickname2", func: (str) => str.setDescription("Second nickname")},
			{datatype: "String", oname: "nickname3", func: (str) => str.setDescription("Third nickname")},
			{datatype: "String", oname: "nickname4", func: (str) => str.setDescription("Fourth nickname")},
			{datatype: "String", oname: "nickname5", func: (str) => str.setDescription("Fifth nickname")}
		]
	},
	(chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.guild.id].players;
		let defaults = SERVER_DATA[source.guild.id].defaults;

		player(source, pdata, {tags: defaults || {}}, args, 0);
	});

	register_scmd(["del_player", "delplayer"], "<Player Name or Number or *>", "Delete Player", "Remove a player from the bot's local storage.", {adminOnly: true, minArgs: 1, slashOpts: [{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player, or `*` to delete all players.")}]}, (chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.guild.id].players;
		let players = (args[0] === "*" ? Object.keys(pdata) : [args[0]]);
		let output = "";

		if(UTILS.isInt(args[0]))
			players[0] = parseInt(args[0])-1;

		if(players.length === 0)
		{
			UTILS.msg(source, "-ERROR: Player data is empty.");
			return;
		}

		for(let i = players.length-1; i >= 0; i--)
		{
			let player = UTILS.isInt(players[i])
				? pdata[players[i]]
				: UTILS.getPlayerByName(pdata, players[i]);

			if(!player)
			{
				output += "-ERROR: Player \"" + (args[0] === "*" ? players[i] : args[0]) + "\" is not valid.";
				continue;
			}

			let delnum = player.num;

			pdata.splice(delnum-1, 1);

			for(let n = delnum-1; n < pdata.length; n++)
				pdata[n].num = n+1;

			output += "-Deleted player " + delnum;

			if(i > 0)
				output += "\n";
		}

		UTILS.msg(source, output);
		overwrite();
	});

	register_scmd(["list_players", "listplayers", "players"], "", "List Players", "Display the current data of registered players, including tags if any exist.\n\n**Warning, this can reveal meta info if used in public channels.** But only if you're using the prefix command version. The slash command version sends a message which is visible only to the command user.", {adminOnly: true, ephemeral: true, shortDesc: "Display the current data of registered players, including tags if any exist."}, (chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.guild.id].players;
		let fields = [];

		if(pdata.length === 0)
		{
			UTILS.msg(source, "-There is no player data to display.");
			return;
		}

		e.setAuthor({name: "Player Data (" + source.guild.name + ")"});
		e.setColor("#0000FF");

		for(let i = 0; i < pdata.length; i++)
		{
			let plr = pdata[i];
			let nicks = "Nicks: ";
			let tags = "";

			if(!plr)
			{
				console.log("No player for number: " + i);
				continue;
			}

			for(let n = 0; n < plr.nicknames.length; n++)
			{
				nicks = nicks + plr.nicknames[n];

				if(n < plr.nicknames.length-1)
					nicks = nicks + ", ";
			}

			if(Object.keys(plr.tags).length > 0)
			{
				tags = "\nTags:";

				for(let tag in plr.tags)
					tags = tags + "\n\"" + tag + "\": \"" + plr.tags[tag] + "\"";
			}

			fields[fields.length] = {name: "Player " + (i+1), value: "Name: " + (plr.dispname || "") + " (<@" + (UTILS.isLong(plr.id) ? plr.id : "NPC") + ">)\n" + nicks + tags, inline: true};
		}

		e.addFields(fields);

		UTILS.embed(source, e);
	});

	register_scmd(["toggle_day", "toggleday"], "", "Toggle Day", "Toggle between Night and Day. Whispering is only allowed in the Day.", {adminOnly: true}, (chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id]
		data.day = !UTILS.bool(data.day, true);

		if(data.day)
		{
			for(let i = 0; i < data.players.length; i++)
			{
				let plr = data.players[i];

				if(plr.getBool("daily_reset", false))
					plr.setInt("whispers", 0);
			}

			UTILS.msg(source, "+It is now Day.");
		}
		else
			UTILS.msg(source, "-It is now Night.");

		overwrite();
	});

	register_scmd(["is_day", "isday"], "", "Is Day", "Check if it's current Day or not in the bot. Whispers can't be sent at Night.", (chn, source, e, args) =>
	{
		if(UTILS.bool(SERVER_DATA[source.guild.id].day, true))
			UTILS.msg(source, "+It is currently Day.");
		else
			UTILS.msg(source, "-It is currently Night.");
	});

	register_scmd(["toggle_alive", "togglealive", "toga"], "<Player Name or Number>", "Toggle Alive", "Toggle between a player's status as Alive or Dead, determining if whispers are allowed or not.", {adminOnly: true, minArgs: 1, slashOpts: [{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")}]}, (chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.guild.id].players;

		let player = UTILS.isInt(args[0])
			? pdata[parseInt(args[0])-1]
			: UTILS.getPlayerByName(pdata, args[0]);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		player.setBool("alive", !player.isAlive());

		if(player.isAlive())
			UTILS.msg(source, "+They live.");
		else
			UTILS.msg(source, "-They die.");

		overwrite();
	});

	register_scmd(["is_alive", "isalive", "alive"], "<Player Name or Number>", "Is Alive", "Check if a player is considered alive or not by the bot.", (chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.guild.id].players;

		let player = UTILS.isInt(args[0])
			? pdata[parseInt(args[0])-1]
			: UTILS.getPlayerByName(pdata, args[0]);

		if(!player)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		if(player.isAlive())
			UTILS.msg(source, "+They are alive.");
		else
			UTILS.msg(source, "-They are dead.");
	});

	register_scmd("whisper", "<Player Name or Number> <Message>", "Whisper", "Send a semi-private message to another player.\n\nOnly usable within your own player channel.", {minArgs: 2, slashOpts:
	[
		{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player")},
		{datatype: "String", oname: "message", func: (str) => str.setDescription("Text message to send to your target.")},
	]},
	(chn, source, e, args) =>
	{
		const SENT = "+Sent!";
		let pdata = SERVER_DATA[source.guild.id].players;
		let sender = UTILS.getPlayerByID(pdata, source.member.id);

		if(!sender)
		{
			UTILS.msg(source, "-ERROR: You are not a registered player!");
			return;
		}

		if(chn.id !== sender.channel)
		{
			UTILS.msg(source, "-ERROR: You may only send whispers from within your own Player Channel.");
			return;
		}

		if(!sender.isAlive())
		{
			UTILS.msg(source, "-ERROR: You cannot whisper while dead.");
			return;
		}

		if(!SERVER_DATA[source.guild.id].day || sender.getBool("mute", false))
		{
			UTILS.msg(source, "-ERROR: You cannot use whispers right now.");
			return;
		}

		let limit = sender.getInt("whispers");
		if(sender.has("limit") && limit >= sender.getInt("limit"))
		{
			UTILS.msg(source, "-ERROR: You are out of whispers.");
			return;
		}

		if(sender.getBool("silent", false))
		{
			UTILS.msg(source, SENT);
			return;
		}

		let recipient = UTILS.isInt(args[0])
			&& pdata[parseInt(args[0])-1]
			|| getPlayerByName(pdata, args[0]);

		let redirected = {};
		if(recipient)
			redirected[recipient.num] = true;

		while(recipient && recipient.has("redirect") && !redirected[recipient.getInt("redirect")])
		{
			recipient = pdata[recipient.getInt("redirect")-1];
			redirected[recipient.num] = true;
		}

		if(!recipient)
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is not valid.");
			return;
		}

		if(sender === recipient)
		{
			UTILS.msg(source, "-ERROR: You cannot whisper to yourself.");
			return;
		}

		if(!recipient.isAlive())
		{
			UTILS.msg(source, "-ERROR: Player \"" + args[0] + "\" is dead.");
			return;
		}

		if(recipient.getBool("cannot_receive", false) || commaCheck(UTILS, sender.tags.block, recipient.num))
		{
			UTILS.msg(source, "-ERROR: You cannot whisper to that person.");
			return;
		}

		let rchannel = source.guild.channels.cache.get(recipient.channel);

		if(!rchannel)
		{
			UTILS.msg(source, "-ERROR: Recipient's channel is invalid. This is probably a bug.");
			return;
		}

		let whisper = args[1];

		for(let i = 2; i < args.length; i++)
			whisper = whisper + ' ' + args[i];

		if(!recipient.getBool("deaf", false))
			UTILS.msg(rchannel, "Whisper from " + firstname(sender) + ": " + whisper, true);

		UTILS.msg(source, SENT);
		sender.setInt("whispers", sender.setInt("whispers")+1);

		if(!sender.getBool("no_overhear", false) && (sender.has("announce") || sender.has("relay")))
		{
			if(sender.tags.announce === sender.tags.relay)
			{
				let relay = source.guild.channels.cache.get(sender.tags.relay.substring(2, sender.tags.relay.length-1))

				if(relay)
					UTILS.msg(relay, firstname(sender) + " whispered to " + firstname(recipient) + ": " + whisper, true);
				else
					UTILS.msg(chn, "-ERROR: Invalid Relay Channel.");
			}
			else
			{
				if(sender.tags.announce)
				{
					let announce = source.guild.channels.cache.get(sender.tags.announce.substring(2, sender.tags.announce.length-1))

				if(announce)
					UTILS.msg(announce, firstname(sender) + " whispered to " + firstname(recipient) + ".", true);
				else
					UTILS.msg(chn, "-ERROR: Invalid Announce Channel.");
				}
				else
				{
					let relay = source.guild.channels.cache.get(sender.tags.relay.substring(2, sender.tags.relay.length-1))

					if(relay)
						UTILS.msg(relay, "Someone whispered to someone: " + whisper, true);
					else
						UTILS.msg(chn, "-ERROR: Invalid Announced Relay Channel.");
				}
			}
		}

		if(!sender.getBool("no_overhear", false))
		{
			for(let i = 0; i < pdata.length; i++)
			{
				let plr = pdata[i];

				if(plr !== sender && plr !== recipient && 
						(plr.getBool("overhear_all", false) || 
						commaCheck(UTILS, plr.tags.overhear_target, sender.num) || 
						commaCheck(UTILS, plr.tags.overhear_target, recipient.num)))
				{
					let pchannel = source.guild.channels.cache.get(plr.channel);

					UTILS.msg(pchannel, "Whisper from " + firstname(sender) + " to " + firstname(recipient) + ": " + whisper, true);
				}
			}
		}
	});

	register_scmd("tag", "<Player Name or Number or *> <Key> [Value]", "Tag", "Give a player a Tag, a type of variable related to gameplay.\n\nUse * to set a tag for every single player instead.\n\nTo check what a Tag currently is, use this command without providing a Value.\n\nTo remove a Tag, use this command with the Value set to \"-\" (without the quotes).\n\nTo list usable tags, use the =tags command.\n\nThe slash version of this command is ephemeral.",
	{
		adminOnly: true, ephemeral: true, minArgs: 2, shortDesc: "Give/View/Delete a player's Tag, a type of variable related to gameplay.", slashOpts:
		[
			{datatype: "String", oname: "player", func: (str) => str.setDescription("Name or Number of a player, or `*` to apply to all players.")},
			{datatype: "String", oname: "tag", func: (str) => str.setDescription("Name of the tag that will be checked or changed.")},
			{datatype: "String", oname: "value", func: (str) => str.setDescription("Omit to view tag's current value | Provide to set new value for tag | Use `-` to delete tag")}
		]
	},
	(chn, source, e, args) =>
	{
		let pdata = SERVER_DATA[source.guild.id].players;
		let players = (args[0] === "*" ? Object.keys(pdata) : [args[0]]);
		let output = "";

		if(UTILS.isInt(args[0]))
			players[0] = parseInt(args[0])-1;

		if(players.length === 0)
		{
			UTILS.msg(source, "-ERROR: Player data is empty.");
			return;
		}

		let key = args[1].toLowerCase();
		let value = args[2] || "";

		for(let n = 3; n < args.length; n++)
			value = value + " " + args[n];

		for(let i = 0; i < players.length; i++)
		{
			let player = UTILS.isInt(players[i])
				? pdata[players[i]]
				: UTILS.getPlayerByName(pdata, players[i]);

			if(!player)
			{
				output += "-ERROR: Player \"" + (args[0] === "*" ? players[i] : args[0]) + "\" is not valid.";
				continue;
			}

			if(value === "-")
			{
				delete player.tags[key];
				output += "-Player " + player.num + ": Tag \"" + key + "\" deleted.";
			}
			else if(value !== "")
			{
				player.tags[key] = value;
				output += "+Player " + player.num + ": Tag \"" + key + "\" set to \"" + value + "\".";
			}
			else
				output += "Player " + player.num + ": Tag \"" + key + "\" is currently set to \"" + (player.tags[key] || "") + "\".";

			if(i < players.length-1)
				output += '\n';
		}

		UTILS.msg(source, output);
		overwrite();
	});

	register_scmd(["tag_default", "tagdefault", "default"], "<Key> [Value]", "Tag Default", "Set a default tag value. This will be applied to future added players, but not to ones that already exist.\n\nTo check what a Tag's default currently is, use this command without providing a Value.\n\nTo check all Default Tags, use the =tag_defaults command.\n\nTo remove a Tag, use this command with the Value set to \"-\" (without the quotes).\n\nTo list usable tags, use the =tags command.",
	{
		adminOnly: true, ephemeral: true, minArgs: 1, shortDesc: "Get/Set/Delete a default tag. These will apply to future players, but not ones that already exist.", slashOpts:
		[
			{datatype: "String", oname: "tag", func: (str) => str.setDescription("Name of the default tag to get/set/delete.")},
			{datatype: "String", oname: "value", func: (str) => str.setDescription("Omit to view tag's current value | Provide to set new value for tag | Use `-` to delete tag")}
		]
	},
	(chn, source, e, args) =>
	{
		let defaults = SERVER_DATA[source.guild.id].defaults;
		let key = args[0].toLowerCase();
		let value = args[1] || "";

		if(!defaults)
		{
			SERVER_DATA[source.guild.id].defaults = {};
			defaults = SERVER_DATA[source.guild.id].defaults;
		}

		for(let n = 2; n < args.length; n++)
			value = value + " " + args[n];

		if(value === "-")
		{
			delete defaults[key];
			UTILS.msg(source, "+Tag Default \"" + key + "\" deleted.");
		}
		else if(value !== "")
		{
			defaults[key] = value;
			UTILS.msg(source, "+Tag Default \"" + key + "\" set to \"" + value + "\".");
		}
		else
			UTILS.msg(source, "+Tag Default \"" + key + "\" is currently set to \"" + (defaults[args[1]] || "null") + "\".");

		overwrite();
	});

	register_scmd(["tag_defaults", "tagdefaults", "defaults"], "", "Tag Defaults", "List all default tags which are applied to newly registered players.", {adminOnly: true, ephemeral: true}, (chn, source, e, args) =>
	{
		let defaults = SERVER_DATA[source.guild.id].defaults;

		if(!defaults || Object.keys(defaults).length === 0)
		{
			UTILS.msg(source, "-There are no default tags set.");
			return;
		}

		UTILS.msg(source, "Default Tags:\n" + UTILS.display(defaults), true);
	});

	register_scmd("tags", "", "Tags", "Provide a list of all known tags. Tag names are case-insentitive, but exact spelling is required.", (chn, source, e, args) =>
	{
		e.setAuthor({name: "List of Tags"});
		e.setDescription("Reminder: To remove a tag, or set it to False, use `=tag <player> <tag> -`");

		e.addFields([
			{name: "alive <Boolean:True>", value: "If dead, player cannot send or receive whispers. You may use the 'toggle_alive' and 'is_alive' commands to work with this."},
			{name: "announce <#Channel>", value: "Target's sent whispers will be announced to the provided channel, which only includes the sender and recipient, NOT the message itself."},
			{name: "block <PN1,PN2,PN3,etc...>", value: "Tagged player is blocked from sending whispers to the listed person or people, but may still recieve whispers from those players. Use only commas to separate Player Numbers if the target player is unable to whisper to multiple specific people, i.e. `5,8,12`."},
			{name: "cannot_receive <Boolean:False>", value: "Tagged player will be unable to receieve whispers. Any attempts to send to them will fail, and nobody will overhear it. Tagged player can still overhear others' whispers if given the ability to."},
			{name: "daily_reset <Boolean:False>", value: "If true, each time a day starts, the player's 'whispers' tag is reset to 0. Combined with the 'limit' tag, this allows the player to have a set number of whispers each day, instead of a limit for the entire game."},
			{name: "deaf <Boolean:False>", value: "Tagged player will be unable to receive whispers. Any attempts to whisper to them will still succeed, however, and other players will still be able to overhear it."},
			{name: "limit <Number>", value: "Tagged player may only send <Number> whispers. Once they run out, they may send no more. This cannot be replenished unless the 'daily_reset' tag is used."},
			{name: "mute <Boolean:False>", value: "Tagged player will be unable to send whispers. They will be notified if they try."},
			{name: "no_overhear <Boolean:False>", value: "Tagged player's whispers will not be overheard or announced."},
			{name: "overhear_all <Boolean:False>", value: "Tagged player will overhear whispers from all other players."},
			{name: "overhear_target <PN1,PN2,PN3,etc...>", value: "Tagged player overhears all whispers sent to and from the player(s) with each number. Use only commas to separate Player Numbers if the target player is unable to whisper to multiple specific people, i.e. `5,8,12`."},
			{name: "redirect <Number>", value: "Whispers sent to the tagged player will instead be sent to the player with that Number. Overhearing and announcements will reveal the true recipient of the whispers. To prevent loops, a whisper can never be redirected to someone that it was already redirected away from."},
			{name: "relay <#Channel>", value: "Target's sent whispers will be relayed to the provided channel, which ONLY includes the full message, NOT the sender or recipient."},
			{name: "relay_nick <Name>", value: "If present, the player with this tag will show up as that nickname when their messages and sent via relay channels. Their color and PFP will be removed as well. You can set per-channel nicknames using this format: `channelID:nickame,channelID:nickname`. Use commas to separate each nickname or channel-nickname pair, and colons to separate channel IDs from nicknames. You may have a nickname without a channelID specified, which will apply to all channels that don't have their own specific nickname."},
			{name: "silent <Boolean:False>", value: "Tagged player will be unable to send whispers. They will NOT know if they try; they will instead be sent a false confirmation message."},
			{name: "whispers <Number>", value: "Counts the amount of whispers that the player has sent so far. This is automatically tracked, you shouldn't have to touch it unless you want to reset it to 0."},
		]);

		UTILS.embed(source, e);
	});

	register_scmd(["add_relay", "addrelay", "relay"], "<#input> <#output> [twoWay?]", "Add Relay", "Create a relay from one channel to another.\n\nIf a third parameter is provided, a second relay will be created, to send messages in #output back to #input.\n\nDon't worry, relayed messages won't be relayed in an infinite loop.", {adminOnly: true, minArgs: 2, shortDesc: "Create a one- or two-way relay between two channels.", slashOpts:
		[
			{datatype: "String", oname: "input", func: (str) => str.setDescription("Messages in #input are relayed to #output.")},
			{datatype: "String", oname: "output", func: (str) => str.setDescription("#output receives message relays from #input.")},
			{datatype: "Boolean", oname: "two_way", func: (str) => str.setDescription("If true, a second relay going from #output into #input is also created.")},
		]
	},
	(chn, source, e, args) =>
	{
		let rdata = SERVER_DATA[source.guild.id].relay;
		let inp = args[0].substring(2, args[0].length-1);
		let out = args[1].substring(2, args[1].length-1);

		let input = source.guild.channels.cache.get(inp);
		let output = source.guild.channels.cache.get(out);

		if(!input || !output)
		{
			UTILS.msg(source, "-ERROR: One or both of the provided channels are invalid.");
			return;
		}

		rdata[rdata.length] = {inp, out};
		let txt = "+Relay created: " + inp + " to " + out;

		if(args[2])
		{
			rdata[rdata.length] = {inp: out, out: inp};
			txt += "\n+Relay created: " + out + " to " + inp;
		}

		UTILS.msg(source, txt);
		overwrite();
	});

	register_scmd(["list_relays", "listrelays", "list_relay", "listrelay", "relays"], "", "List Relays", "List all active relays. Be careful, using this in public might modconfirm a secret chat.", {adminOnly: true, ephemeral: true}, (chn, source, e, args) =>
	{
		let rdata = SERVER_DATA[source.guild.id].relay;

		if(rdata.length === 0)
		{
			UTILS.msg(source, "-There are no active relays.");
			return;
		}

		let output = "Relays:";

		for(let i = 0; i < rdata.length; i++)
			output = output + "\n" + i + ". <#" + rdata[i].inp + "> to <#" + rdata[i].out + ">";

		UTILS.msg(source, output);
	});

	register_scmd(["del_relay", "delrelay"], "<Number 1> [Number 2] [Number N]...", "Delete Relay", "Delete a given relay, or list of relays. Use the 'list_relays' command to check each relay's number.", {adminOnly: true, minArgs: 1, slashOpts:
		[
			{datatype: "Integer", oname: "relay1", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay2", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay3", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay4", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay5", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay6", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay7", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay8", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay9", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
			{datatype: "Integer", oname: "relay10", func: (str) => str.setDescription("ID of a Relay to delete.").setMinValue(0)},
		]
	},
	(chn, source, e, args) =>
	{
		let rdata = SERVER_DATA[source.guild.id].relay;
		let newrelay = [];
		let output = "";

		for(let i = 0; i < rdata.length; i++)
		{
			if(!UTILS.containsString(args, String(i)))
				newrelay[newrelay.length] = rdata[i];
			else
				output = output + (output.length === 0 ? " " : ", ") + i;
		}

		if(newrelay.length === rdata.length)
		{
			UTILS.msg(source, "-No relays could be deleted.");
			return;
		}

		rdata.splice(0, rdata.length);

		for(let i = 0; i < newrelay.length; i++)
			rdata[i] = newrelay[i];

		UTILS.msg(source, "Deleted:" + output);
		overwrite();
	});
};
