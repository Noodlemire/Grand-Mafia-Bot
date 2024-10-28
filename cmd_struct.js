const ARG_MAX = 32;
const PRE_MAX = 10;
const REG = "register_";
const COOL_IT = "Please cool it with all of these new server commands. I don't want to make Daddy Discord angry with me, so please calm down, take a breath, maybe touch some grass? I've heard that it can be pretty refreshing nowadays.";

module.exports = (g) =>
{
	const {bot, PRE, CUSTOMDIR, ELEVATED, SERVER_DATA, UTILS, add_cmd, add_scmd, overwrite, guild_commands, guild_commands_json, refreshCommands, Struct, path, fs, registerMenus, ActionRowBuilder, ButtonBuilder, ButtonStyle} = g;
	let i = 0;
	
	function register_(cmdfunc, name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}

		cmdfunc(name, {
			id: "s" + i,
			cat: "Structure",
			title,
			desc,
			param,
			meta,
			func: (chn, source, e, args) =>
			{
				if(!source.guild)
				{
					UTILS.msg(source, "-ERROR: You cannot use this command outside of a Server.");
					return;
				}

				let id = source.guild.id;

				if(!SERVER_DATA[id])
					SERVER_DATA[id] = {players: [], relay: []};

				return func(chn, source, e, args);
			}
		});

		i = i + 1;
	}

	function register_cmd(name, param, title, desc, meta, func)
	{
		return register_(add_cmd, name, param, title, desc, meta, func);
	}

	function register_scmd(name, param, title, desc, meta, func)
	{
		return register_(add_scmd, name, param, title, desc, meta, func);
	}

	register_scmd(["create_structure", "createstructure", "structure", "struct", "cs"], "<name> <prefix> [parent OR -] [param1] [param2] [param3] [param4]", "Create Structure", "Create a new Structure; A template for which objects can be created.\n\nUpon creation, this will create a new registration command specific to your server and Struct name.\n\nIn the `name`, `parent`, and all `param` parameters, only lowercase alphanumeric characters, as well as - and _, are allowed. In addition, the structure name can only be " + (ARG_MAX - REG.length) + " characters long, while the parent and params can only be " + ARG_MAX + " characters long.\n\nThe prefix is used to use commands for all objects created under this Structure. Say the prefix is `%` and you create an object with the `test` command alias; the `%test` command will bring up that object's infocard. For sanity's sake, the prefix cannot have uppercase letters or spaces, and it can only be up to " + PRE_MAX + " characters long. Also, the Prefix can't be the bot's main Prefix (`" + PRE + "`), and it cannot match the Prefix of any other pre-existing Struct on this server.\n\nEach Param is a mini-field to be listed prior to an Object's main info fields. Params should typically be things like stats, categories, or other smaller details that wouldn't need a paragraph or sentence to describe them. Any Params you name here becomes required parameters for anyone using this Struct's Registration command.\n\nThe Parent works similarly to other Params, but includes special functionality. The Struct's Parent must be the name of another existing Structure on this server. Thus, any object you create can define a specific object from its Parent Structure Type, to be considered its own Parent. An Object will inherit its specific Parent's Color and IconURL, unless the Object defines its own specific Color and/or IconURL.\n\nIf you do not want your Structure to have a Parent, but you want it to have regular Params, set its Parent to `-` (Not necessary if you're using the Slash version of this command)", {adminOnly: true, minArgs: 2, shortDesc: "Create a new Structure; A template for which objects can be created.", slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Unique name of the Structure/Object Type. Used for commands.").setMaxLength(ARG_MAX - REG.length)},
			{datatype: "String", oname: "prefix", func: (str) => str.setDescription("Unique custom prefix. This is needed to use object commands from this Structure.").setMaxLength(PRE_MAX)},
			{datatype: "String", oname: "parent", func: (str) => str.setDescription("param0, AKA Parent Structure Name: Object will inherit Color and IconURL from Parent.").setMinLength(1).setMaxLength(ARG_MAX)},
			{datatype: "String", oname: "param1", func: (str) => str.setDescription("Name of a property that this Structure's objects must define.").setMinLength(1).setMaxLength(ARG_MAX)},
			{datatype: "String", oname: "param2", func: (str) => str.setDescription("Name of a property that this Structure's objects must define.").setMinLength(1).setMaxLength(ARG_MAX)},
			{datatype: "String", oname: "param3", func: (str) => str.setDescription("Name of a property that this Structure's objects must define.").setMinLength(1).setMaxLength(ARG_MAX)},
			{datatype: "String", oname: "param4", func: (str) => str.setDescription("Name of a property that this Structure's objects must define.").setMinLength(1).setMaxLength(ARG_MAX)},
		]
	},
	(chn, source, e, args) =>
	{
		if(SERVER_DATA[source.guild.id].inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		if((SERVER_DATA[source.guild.id].gcmd_limit || 0) > 100)
		{
			UTILS.msg(source, COOL_IT);
			return;
		}

		if(Object.keys(SERVER_DATA[source.guild.id].structs || {}).length >= 30)
		{
			UTILS.msg(source, "-Unfortunately, due to Guild Command limits, I cannot allow you to create any more Structures.\n-Seriously though, 30 should be far, far more than enough for one server. What the fuck are you doing?");
			return;
		}

		SERVER_DATA[source.guild.id].structs = SERVER_DATA[source.guild.id].structs || {};

		try
		{
			let alreadyUsed = {};

			for(let i = 0; i < args.length; i++)
			{
				if(args[i])
					args[i] = UTILS.toArgName(args[i], i != 1);
				else
					continue;

				if(i === 0 && args[i].length > (ARG_MAX - REG.length))
					throw "-ERROR: Cannot accept a Structure name with a length greater than " + (ARG_MAX - REG.length) + " (Provided Length: " + args[i].length + ")";
				if(i === 1 && args[i].length > PRE_MAX)
					throw "-ERROR: Please, for the love of God, use a shorter prefix. (Max Length: " + PRE_MAX + ")";
				if(i >= 2 && args[i].length > ARG_MAX)
					throw "-ERROR: Cannot accept a parent/param name with a length greater than " + ARG_MAX + " (Provided Length: " + args[i].length + ")";
				if(i >= 2 && UTILS.isOneOf(args[i], "alias_list", "title", "color", "icon_url", "image_url"))
					throw "-ERROR: Parent/param name cannot be any of the following: alias_list, title, color, icon_url, iomage_url";
				if(args[i].length === 0)
					throw "-ERROR: Invalid argument: '" + args[i] + "'";
				if(i === 2 && args[i] === "-")
					args[i] = undefined;

				if(i >= 2 && args[i])
				{
					if(alreadyUsed[args[i]])
						throw "-ERROR: Cannot accept duplicate parent/param name: " + args[i];
					else
						alreadyUsed[args[i]] = true;
				}
			}

			SERVER_DATA[source.guild.id].structs[args[0]] = new Struct(source.guild.id, ...args);

			UTILS.msg(source, "+Successfully registered: " + args[0] + "\n\nNew commands have been created for you to use:\n/" + REG + args[0] + "\n/" + args[0] + "_list" + "\n/roll_" + args[0]);
			refreshCommands();
			overwrite(source);
		}
		catch(err)
		{
			UTILS.msg(source, err);
		}
	});

	register_scmd(["delete_structure", "deletestructure", "delstruct", "ds"], "<name>", "Delete Structure", "Delete a named structure, and all of its objects, permanently.", {adminOnly: true, minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the structure to delete.").setMaxLength(ARG_MAX - REG.length)},
		]
	},
	(chn, source, e, args) =>
	{
		if(SERVER_DATA[source.guild.id].inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		let sdata = SERVER_DATA[source.guild.id].structs || {};
		let sname = UTILS.toArgName(args[0], true);
		let reg_cname = "register_" + sname;
		let list_cname = sname + "_list";
		let roll_cname = "rand_" + sname;

		if(!sdata[sname])
		{
			UTILS.msg(source, "-There is no Structure with the name: " + sname);
			return;
		}

		if(sdata[sname].count() > 0)
		{
			UTILS.msg(source, "-You may not delete a Structure if there are any Object left within it.");
			return;
		}

		let file = path.join(CUSTOMDIR, source.guild.id, sdata[sname].getName());

		if(!fs.existsSync(file))
		{
			UTILS.msg(source, "-This is a known structure without a folder. This is probably a bug.");
			return;
		}

		let jsonID = guild_commands[source.guild.id][reg_cname].jsonID;
		guild_commands_json[source.guild.id].splice(jsonID, 1);
		for(let c in guild_commands[source.guild.id])
			if(guild_commands[source.guild.id][c].jsonID > jsonID)
				guild_commands[source.guild.id][c].jsonID--;

		jsonID = guild_commands[source.guild.id][list_cname].jsonID;
		guild_commands_json[source.guild.id].splice(jsonID, 1);
		for(let c in guild_commands[source.guild.id])
			if(guild_commands[source.guild.id][c].jsonID > jsonID)
				guild_commands[source.guild.id][c].jsonID--;

		jsonID = guild_commands[source.guild.id][roll_cname].jsonID;
		guild_commands_json[source.guild.id].splice(jsonID, 1);
		for(let c in guild_commands[source.guild.id])
			if(guild_commands[source.guild.id][c].jsonID > jsonID)
				guild_commands[source.guild.id][c].jsonID--;

		delete guild_commands[source.guild.id][reg_cname];
		delete guild_commands[source.guild.id][list_cname];
		delete sdata[sname];
		fs.rmSync(file, {recursive: true, force: true});

		UTILS.msg(source, "+Successfully deleted: " + sname + "\n\nRelated commands have been disabled and will be deleted shortly. Please wait a minute.");
		refreshCommands();
		overwrite(source);
	});

	register_scmd(["delete"], "<structure> <alias or id>", "Delete Object", "Delete a specified object permanently.\n\nIf you use an alias to specify the object, you may also provide a numeric specifier, in the event that its alias is not unique. For example: `tedd 1` vs `tedd 2`", {minArgs: 2, shortDesc: "Delete a specified object permanently.", slashOpts:
		[
			{datatype: "String", oname: "struct", func: (str) => str.setDescription("Structure that the object belongs to.")},
			{datatype: "String", oname: "identifier", func: (str) => str.setDescription("Alias or ID. May also provide a space-separated specifier, i.e. `thing 4`")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];

		if(data.inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		let sdata = data.structs || {};
		let sname = UTILS.toArgName(args[0], true);

		if(!sdata[sname])
		{
			UTILS.msg(source, "-There is no Structure with the name: " + sname);
			return;
		}

		let arg = args[1];
		if(args[2]) arg += " " + args[2];
		let obj = sdata[sname].search(arg, data.locked);

		if(!obj)
		{
			UTILS.msg(source, "-There is no " + args[0] + " that could be identified using '" + arg + "'. It might have a different alias/ID, or there may be other objects with the same alias.");
			return;
		}

		if(data.locked && !obj.isLocked())
		{
			UTILS.msg(source, "-You may not delete this object until the Edit Lock is disabled. Only queued objects may be deleted.");
			return;
		}

		if(!source.member.permissions.has(ELEVATED) && (!SERVER_DATA[source.guild.id].user_submission || obj.getAuthor() !== source.member.id))
		{
			UTILS.msg(source, "-You do not have permission to edit this object.");
			return;
		}

		let aliases = obj.getAliases();

		for(let i = 0; i < aliases.length; i++)
			sdata[sname].delAliasForID(obj.getID(), aliases[i]);

		if(data.locked)
		{
			let file = path.join(CUSTOMDIR, source.guild.id, sname, obj.getID() + ".json");

			if(fs.existsSync(file))
			{
				let oldObj = JSON.parse(fs.readFileSync(file, "utf8"));

				if(oldObj)
				{
					let oldAliases = oldObj.aliases;

					for(let i = 0; i < oldAliases.length; i++)
						sdata[sname].addAliasForID(oldObj.id, oldAliases[i]);
				}
			}
		}

		let file = path.join(CUSTOMDIR, source.guild.id, sname, obj.getID() + (data.locked ? " (locked)" : "") + ".json");

		if(!fs.existsSync(file))
		{
			UTILS.msg(source, "-This is a known object without a file. This is probably a bug.");
			return;
		}

		fs.rmSync(file, {recursive: true, force: true});
		UTILS.msg(source, "+Successfully deleted " + (data.locked ? "queued " : "") + sname + " '" + obj.getTitle(true) + "' with ID: " + obj.getID());
		overwrite(source);
	});

	register_scmd("edit", "<structure> <alias or id> [new aliases] [new title] [new color] [new icon URL] [new image URL]", "Edit Object", "Make an edit to an existing object.", {slashOnly: true, ephemeral: true, minArgs: 2, slashOpts:
		[
			{datatype: "String", oname: "struct", func: (str) => str.setDescription("Structure that the object belongs to.")},
			{datatype: "String", oname: "identifier", func: (str) => str.setDescription("Alias or ID. May also provide a space-separated specifier, i.e. `thing 4`")},
			{datatype: "String", oname: "replacement_alias_list", func: (str) => str.setDescription("Space-separated, case-insensitive list of names for new commands to refer to this object.").setMaxLength(2000)},
			{datatype: "String", oname: "new_title", func: (str) => str.setDescription("Human-readable title of the command, shown in the Embed.").setMaxLength(256)},
			{datatype: "String", oname: "new_color", func: (str) => str.setDescription("Six-digit hex code defining the Embed's color, or the word random.").setMinLength(6).setMaxLength(6)},
			{datatype: "String", oname: "new_icon_url", func: (str) => str.setDescription("Tiny image that appears to the left of the Embed's title.")},
			{datatype: "String", oname: "new_image_url", func: (str) => str.setDescription("Large image displayed at the bottom of the Embed.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];

		if(data.inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		let sdata = data.structs || {};
		let sname = UTILS.toArgName(args[0], true);

		if(!sdata[sname])
		{
			UTILS.msg(source, "-There is no Structure with the name: " + sname);
			return;
		}

		let arg = args[1];
		let obj = sdata[sname].search(arg, data.locked);

		if(!obj)
		{
			UTILS.msg(source, "-There is no " + args[0] + " that could be identified using '" + arg + "'. It might have a different alias/ID, or there may be other objects with the same alias.");
			return;
		}

		if(!source.member.permissions.has(ELEVATED) && (!SERVER_DATA[source.guild.id].user_submission || obj.getAuthor() !== source.member.id))
		{
			UTILS.msg(source, "-You do not have permission to edit this object.");
			return;
		}

		let menu =
		{
			obj,
			embed: e,
			struct: sname,
			title: args[3] || obj.getTitle(true),
			params: obj.getParams(),
			pfields: [],
			color: args[4] || obj.getColor(true),
			fields: obj.getFields(true),
			meta: obj.getMeta(),
			author: obj.getAuthor(),
			operator: source.member.id,
			desc: obj.getDesc(true),
			time: new Date().getTime()
		};

		if(menu.color) menu.color = menu.color.toLowerCase();

		if(args[2])
		{
			let aliases = UTILS.split(args[2], " ");
			let aliasLib = {};

			for(let i = 0; i < aliases.length; i++)
			{
				aliases[i] = UTILS.toArgName(aliases[i]);

				if(aliases[i].length === 0)
				{
					UTILS.msg(source, "-Error: One of the aliases is invalid. Must be alphanumeric and contain no special characters other than `-` and `_`");
					return;
				}

				aliasLib[aliases[i]] = true;
			}

			menu.aliases = Object.keys(aliasLib);
		}
		else
			menu.aliases = obj.getAliases();

		if(args[5])
		{
			if(!UTILS.isURL(args[5]))
			{
				UTILS.msg(source, "-Error: Invalid Icon URL: " + args[5]);
				return;
			}

			menu.iconURL = args[5];
		}
		else
			menu.iconURL = obj.getIconURL(true);

		if(args[6])
		{
			if(!UTILS.isURL(args[6]))
			{
				UTILS.msg(source, "-Error: Invalid Image URL: " + args[6]);
				return;
			}

			menu.imageURL = args[6];
		}
		else
			menu.imageURL = obj.getImageURL();

		let plist = obj.getParamNames();

		for(let i = 0; i < plist.length; i++)
			menu.pfields[i] = {name: UTILS.titleCase(plist[i]) + ":", value: obj.getParam(plist[i]), inline: true};

		let c = args[4] || obj.getColor() || "808080";
		if(c === "random") c = UTILS.rHex(6);

		e.setAuthor({name: menu.title, iconURL: args[5] || obj.getIconURL()}).setColor(c).setImage(menu.imageURL).setDescription(menu.desc).setFooter({text: "Menu data is discarded after 1 hour of inactivity."});

		let fields = menu.pfields.concat({name: "Created by:", value: "<@" + menu.author + ">", inline: true});
		let keys = Object.keys(menu.meta);

		if(menu.fields.length > 0)
		{
			let txt = "";

			for(let i = 0; i < menu.fields.length; i++)
			{
				if(i > 0) txt += "\n";
				txt += i + ": " + menu.fields[i].name;

				if(txt.length > 750 && i < menu.fields.length-1)
				{
					txt += "\n...And " + (menu.fields.length-i-1) + " more.";
					break;
				}
			}

			fields[fields.length] = {name: "Fields:", value: txt};
		}

		if(keys.length > 0)
		{
			let txt = UTILS.titleCase(keys[0]);

			for(let i = 1; i < keys.length; i++)
			{
				txt += "\n" + UTILS.titleCase(keys[i]);

				if(txt.length > 750 && i < keys.length-1)
				{
					txt += "\n...And " + (keys.length-i-1) + " more.";
					break;
				}
			}

			fields[fields.length] = {name: "Meta:", value: txt};
		}

		e.setFields(fields);

		let components =
		[
			new ActionRowBuilder({components:
			[
				new ButtonBuilder({customId: "struct:addfield", style: ButtonStyle.Primary, label: "Add Field"}),
				new ButtonBuilder({customId: "struct:repfield", style: ButtonStyle.Secondary, label: "Replace Field"}),
				new ButtonBuilder({customId: "struct:setmeta", style: ButtonStyle.Primary, label: "Set Metadata"}),
				new ButtonBuilder({customId: "struct:setdesc", style: ButtonStyle.Primary, label: "Set Description"}),
				new ButtonBuilder({customId: "struct:setparam", style: ButtonStyle.Secondary, label: "Set Param"}),
			]}),
			new ActionRowBuilder({components:
			[
				new ButtonBuilder({customId: "struct:delfield", style: ButtonStyle.Danger, label: "Delete Field"}),
				new ButtonBuilder({customId: "struct:delmeta", style: ButtonStyle.Danger, label: "Delete Metadata"}),
				new ButtonBuilder({customId: "struct:deldesc", style: ButtonStyle.Danger, label: "Delete Description"}),
			]}),
			new ActionRowBuilder({components:
			[
				new ButtonBuilder({customId: "struct:cancel", style: ButtonStyle.Danger, label: "Cancel"}),
				new ButtonBuilder({customId: "struct:submit", style: ButtonStyle.Success, label: "Submit"}),
			]})
		];

		source.editReply({embeds: [e], components, ephemeral: true, allowedMentions: {repliedUser: false}, fetchReply: true}).then((sent) =>
		{
			menu.message = sent;
			registerMenus[source.member.id] = menu;
		});
	});

	register_scmd("id", "<struct> <alias> [specifier]", "Check ID", "Check an object's ID by its command alias, and if needed, its numeric specifier.", {minArgs: 2, slashOpts:
		[
			{datatype: "String", oname: "struct", func: (str) => str.setDescription("Name the structure that the object belongs to.")},
			{datatype: "String", oname: "alias", func: (str) => str.setDescription("Alias of the object to check.")},
			{datatype: "Integer", oname: "specifier", func: (str) => str.setDescription("Numeric specifier, required when two or more objects share one alias.")},
		]
	},
	(chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};
			let sname = UTILS.toArgName(args[0], true);
			let alias = UTILS.toArgName(args[1]);
			let spec = parseInt(args[2]);

			if(!sdata[sname])
			{
				UTILS.msg(source, "-There is no Structure with the name: " + sname);
				return;
			}

			let ids = sdata[sname].getIDs(alias);

			if(ids.length === 0)
			{
				UTILS.msg(source, "-There is no " + sname + " with the alias: " + alias);
				return;
			}

			if(!UTILS.isInt(args[2], true))
			{
				UTILS.msg(source, "-The provided Specifier '" + args[2] + "' is not a whole number!");
				return;
			}

			if(!isNaN(spec) && ids[spec-1])
				UTILS.msg(source, "Found this ID: ID" + ids[spec-1]);
			else if(ids.length === 1)
				UTILS.msg(source, "Found this ID: ID" + ids[0]);
			else
			{
				let txt = "There are multiple objects with the given alias. Here are their IDs:";

				for(let i = 0; i < ids.length; i++)
					txt += "\n" + alias + " " + i+1 + ": ID" + ids[i];

				UTILS.msg(source, txt);
			}
		});
	});

	register_scmd(["inherit"], "[server id]", "Inherit Structures", "This command allows you to inherit all Structure and Object data from another server, rather than using your own.\n\nWhile inheritance is active, all Structure/Object editing commands are temporarily unusable, and all existing data is hidden.\n\nHidden data is not deleted. You may use it once more by disabling inheritance.\n\nOmit a Server ID to check what this server is set to inherit, if any.\n\nProvide `-` in place of a Server ID to disable inheritance.\n\nWarning: If inheritance is active, but the specified server becomes unavailable (Due to being deleted, this bot being kicked from it, etc.), attempting to use any Struct/Object viewing command will warn you incessantly.", {adminOnly: true, shortDesc: "Inherit object data from a server, check what you're inheriting from, or disable inheritance.", slashOpts:
		[
			{datatype: "String", oname: "server_id", func: (str) => str.setDescription("Provide to inherit Struct/Obj data from listed server. Omit to check inheritance. `-` to disable.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];
		let sID = args[0];

		if((data.gcmd_limit || 0) > 100)
		{
			UTILS.msg(source, COOL_IT);
			return;
		}

		if(!sID)
		{
			if(data.inherit)
			{
				bot.guilds.fetch(data.inherit).catch(console.error).then((guild) =>
				{
					if(guild && guild.id)
						UTILS.msg(source, "Currently inheriting all Structure and Object data from '" + guild.name + "' (ID: " + guild.id + ")");
					else
						UTILS.msg(source, "-Warning: Currently inheriting from unknown server: " + data.inherit);
				});

				return;
			}
			else
			{
				UTILS.msg(source, "inheritance is currently disabled. All Structure and Object data is your own.");
				return;
			}
		}
		else if(sID === "-")
		{
			delete data.inherit;
			UTILS.msg(source, "Inheritance has been disabled, and editing is now re-enabled.\n\nPleas wait a minute for server commands to update.");
			refreshCommands();
			data.gcmd_limit = (data.gcmd_limit || 0) + (guild_commands_json[source.guild.id] || []).length;
			overwrite(source);
			return;
		}

		bot.guilds.fetch(sID).catch(console.error).then((guild) =>
		{
			if(!guild || !guild.id)
			{
				UTILS.msg(source, "-Cannot find server with ID: " + sID);
				return;
			}

			data.inherit = sID;
			UTILS.msg(source, "+You are now inheriting from '" + guild.name + "' (ID: " + guild.id + ")\n\nPleas wait a minute for server commands to update.");
			refreshCommands();
			data.gcmd_limit = (data.gcmd_limit || 0) + (guild_commands_json[sID] || []).length;
			overwrite(source);
		});
	});

	register_scmd(["list_structures", "liststructures", "liststruct", "ls"], "", "List Structures", "List all Structures, as well as their Params and a count of how many Objects they contain.", (chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};

			if(Object.keys(sdata).length === 0)
			{
				UTILS.msg(source, "-There are no Structures on this server.");
				return;
			}

			let txt = "Registered Structures:";

			for(let sname in sdata)
			{
				txt += "\n\n" + sname;

				let params = sdata[sname].getParams();

				if(params.length > 0)
				{
					txt += " [" + params[0];

					for(let i = 1; i < params.length; i++)
						txt += "/" + params[i];

					txt += "]";
				}

				txt += " - " + sdata[sname].count() + " objects, Prefix: " + sdata[sname].getPre();
			}

			UTILS.msg(source, txt);
		});
	});

	register_scmd(["object_meta", "objectmeta", "objmeta", "ometa", "om"], "[structure] [alias or ID] [Locked Version]", "Check Object Meta", "Check an Object's Metadata, or list all possible Meta fields.", {slashOpts:
		[
			{datatype: "String", oname: "structure", func: (str) => str.setDescription("When checking an Object's Meta, you must specify the Structure that it belongs to.")},
			{datatype: "String", oname: "identifier", func: (str) => str.setDescription("Alias or ID. May also provide a space-separated specifier, i.e. `thing 4`")},
			{datatype: "Boolean", oname: "locked_version", func: (str) => str.setDescription("In Edit Lock mode, check for an updated version if it exists. Default: False")},
		]
	},
	(chn, source, e, args) =>
	{
		if(!args[0] && !args[1])
		{
			e.setAuthor({name: "Available Meta Fields"});
			e.setColor("808080");

			e.addFields([
				{name: "cannot_spawn", value: "- If true, the object cannot spawn, no matter what."},
				{name: "inherit_fields", value: "- Set this to an object that you're using as a Parent.\n- Its children will inherit listed fields in the format of `FieldName1:FieldBody1;FieldsName2:FieldBody2;FieldNameN:FieldBodyN...`.\n- Note that inherited fields may be overwritten if the child object defines its own Field with the same name."},
				{name: "spawn_as", value: "Format: `ParamName1:Value1,Value2,etc...;ParamName2:Value1,Value2,etc...;etc...`\n- Overrides a role's default spawning behavior when using `/rand_<Object>` and `/<Object>_list`.\n- Normally, when the user of either command specifies specific value(s) for a given param, this object can only appear if its specific value directly matches whatever the user typed.\n- However, with spawn_as, you may define other categories that this object may spawn as."},
				{name: "spawn_as_any", value: "Format: `ParamName1,ParamName2,etc...`\n- Overrides a role's default spawning behavior when using `/rand_<Object>` and `/<Object>_list`.\n- If a specific Param type is listed under spawn_as_any, this role will be allowed to spawn, regardless of what the user tries to specify for that specific cateogry."},
				{name: "never_spawn_as", value: "Format: `ParamName1:Value1,Value2,etc...;ParamName2:Value1,Value2,etc...;etc...`\n- The opposite of spawn_as, and only really applicable as an extension of spawn_as_any.\n- Listed values are exceptions to the spawn_as_any rule; if a user's filter matches any specific value for the given param type, this object will be unable to spawn."},
				{name: "spawn_if_parent", value: "Format: `ParamName1:Value1,Value2,etc...;ParamName2:Value1,Value2,etc...;etc...`\n- A variant of `spawn_as` that you can use in tandem with `spawn_as_any` to narrow possible results based on the params of the object's parent, rather than the object itself."},
				{name: "spawn_rate", value: "- A multiplier to the object's chance to randomly spawn. Default: 1"},
				{name: "rand_range", value: "Format: `min-max`\n- This is the basis of all other rand Meta fields, and is required for all other rand meta values.\n- RNG works by splitting any decimal number into a series of bits, indexed between 0 and [Highest Possible Bit - 1]\n- When set, this enables you to insert the exact phrase `SEED` into the object's description, revealing the exact number that resulted in all other rand meta values.\n- Negative values are not allowed."},
				{name: "rand_title", value: "Format: `Min-Max:Title1,Title2,Title3,TitleN...`\n- Enables an object to have multiple possible titles, based on rand_range's Seed.\n- Min and Max refer to specific bits generated by rand_range's seed. Bits within this range will be added together into a single decimal number.\n- Max is optional; if omitted, the bit at position Min will be used."},
				{name: "cycle_title", value: "Format: `Min1-Max1,Min2-Max2,Min3-Max3,MinN-MaxN...`\n- Each letter of the object's title will be 'cycled' a number of positions in the Alphabet, relative to the number generated by each Min and Max.\n- Min and Max refer to specific bits generated by rand_range's seed. Bits within this range will be added together into a single decimal number.\n- Each Max is optional; if omitted, the bit at position Min will be used.\n- Each Min-Max pair changes exacly one letter in your object's Title, in order."},
				{name: "rand_fields", value: "Format: `TARGET:Min-Max:Option 1/Option2/Option3/Option N...`\n- Enables you to replace specific phrases in your objects' Fields, picking from a set of random values.\n- Min and Max refer to specific bits generated by rand_range's seed. Bits within this range will be added together into a single decimal number.\n- Max is optional; if omitted, the bit at position Min will be used.\n- The number of Options should be the same as the highest possible decimal value that can be generated by Min and Max.\n- You may specify any number of Random Field Sets. Use ; to separate them."},
			]);

			UTILS.embed(source, e);
		}
		else if(args[0] && args[1])
		{
			UTILS.inherit(SERVER_DATA, source, (data) =>
			{
				let sdata = data.structs || {};
				let sname = UTILS.toArgName(args[0], true);

				if(!sdata[sname])
				{
					UTILS.msg(source, "-There is no Structure with the name: " + sname);
					return;
				}

				let arg = args[1];
				if(UTILS.isInt(args[2])) arg += " " + args[2];
				let lockVer = args[3] !== undefined ? UTILS.bool(args[3], false) : UTILS.bool(args[2], false);
				let obj = sdata[sname].search(arg, lockVer);

				if(!obj)
				{
					UTILS.msg(source, "-There is no " + args[0] + " that could be identified using '" + arg + "'. It might have a different alias/ID, or there may be other objects with the same alias.");
					return;
				}

				let meta = obj.getMeta();
				let keys = Object.keys(meta);

				if(keys.length === 0)
				{
					UTILS.msg(source, "Object '" + obj.getTitle(true) + "' has no meta.");
					return;
				}

				let output = "Meta for command '" + obj.getTitle(true) + "':\n{";

				for(let i = 0; i < keys.length; i++)
					output = output + "\n\t" + keys[i] + ": " + meta[keys[i]];

				UTILS.msg(source, output + "\n}");
			});
		}
		else
			UTILS.msg(source, "-ERROR: In order to check a specific Object's Meta, you must include both Structure and an Alias or ID.");
	});

	register_scmd("restart", "", "Restart Structure Menu", "Restart a Create/Edit Object Menu, with all data intact, in the event of an error.", {slashOnly: true, ephemeral: true}, (chn, source, e, args) =>
	{
		let menu = registerMenus[source.member.id];

		if(!menu)
		{
			UTILS.msg(source, "-Unable to find any menu that belongs to you.");
			return;
		}

		if(menu.message.guild.id !== source.guild.id)
		{
			UTILS.msg(source, "-ERROR: You must use /restart in the same Server that you started your menu in!");
			return;
		}

		source.editReply({embeds: [menu.embed], components: menu.message.components, ephemeral: true, allowedMentions: {repliedUser: false}, fetchReply: true}).then((sent) =>
		{
			menu.message = sent;
		});
	});

	register_scmd(["set_author", "setauthor", "author", "sa"], "<structure> <alias or ID> <user ID>", "Set Author", "Change the owner of a specific Object.", {minArgs: 3, slashOpts:
		[
			{datatype: "String", oname: "structure", func: (str) => str.setDescription("When checking an Object's Meta, you must specify the Structure that it belongs to.")},
			{datatype: "String", oname: "identifier", func: (str) => str.setDescription("Alias or ID. May also provide a space-separated specifier, i.e. `thing 4`")},
			{datatype: "String", oname: "user_id", func: (str) => str.setDescription("ID of the new owner of the object.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];

		if(data.inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		let sdata = SERVER_DATA[source.guild.id].structs || {};
		let sname = UTILS.toArgName(args[0], true);

		if(!sdata[sname])
		{
			UTILS.msg(source, "-There is no Structure with the name: " + sname);
			return;
		}

		let arg = args[1];
		if(args[2] && UTILS.isInt(args[2])) arg += " " + args[2];
		let obj = sdata[sname].search(arg, data.locked);

		if(!obj)
		{
			UTILS.msg(source, "-There is no " + args[0] + " that could be identified using '" + arg + "'. It might have a different alias/ID, or there may be other objects with the same alias.");
			return;
		}

		if(!source.member.permissions.has(ELEVATED) && (!SERVER_DATA[source.guild.id].user_submission || obj.getAuthor() !== source.member.id))
		{
			UTILS.msg(source, "-You do not have permission to edit this object.");
			return;
		}

		let uID = (/^\d+$/.test(args[3]) ? args[3] : args[2]);

		if(!/^\d+$/.test(uID))
		{
			UTILS.msg(source, "-Error: Malformatted User ID: " + uID);
			return;
		}

		source.guild.members.fetch(uID).catch(console.error).then((user) =>
		{
			//if(!user)
			//{
			//	UTILS.msg(source, "-No player found with the ID: " + uID);
			//	return;
			//}

			obj.setAuthor(uID);
			obj.save();
			UTILS.msg(source, "+Successfully set owner of '" + obj.getTitle(true) + "' to: " + (user ? user.displayName : uID));
		});
	});

	register_scmd(["user_submission", "usersubmission", "usub", "us"], "[Boolean]", "User Submission", "Enable/disable/check whether or not regular users may create, edit, and delete their own objects.", {adminOnly: true, slashOpts:
		[
			{datatype: "Boolean", oname: "allowed", func: (str) => str.setDescription("Set to enable/disable User Submission Mode. Omit to check if it is enabled or disabled.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];

		if(data.inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		if(args[0] === undefined)
			UTILS.msg(source, "User Submission Mode: " + (data.user_submission ? "Enabled" : "Disabled"));
		else
		{
			let usub = UTILS.bool(args[0], false);

			data.user_submission = usub;
			UTILS.msg(source, "User Submission Mode is now: " + (usub ? "Enabled" : "Disabled"));
			overwrite(source);
		}
	});

	register_scmd(["view_json", "viewjson", "json", "vj"], "<structure> <alias or ID> [Locked Version]", "View Object JSON", "Load and display all of an Object's raw JSON data.", {minArgs: 2, slashOpts:
		[
			{datatype: "String", oname: "structure", func: (str) => str.setDescription("When checking an Object's Meta, you must specify the Structure that it belongs to.")},
			{datatype: "String", oname: "identifier", func: (str) => str.setDescription("Alias or ID. May also provide a space-separated specifier, i.e. `thing 4`")},
			{datatype: "Boolean", oname: "locked_version", func: (str) => str.setDescription("In Edit Lock mode, check for an updated version if it exists. Default: False")},
		]
	},
	(chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};
			let sname = UTILS.toArgName(args[0], true);

			if(!sdata[sname])
				throw "-There is no Structure with the name: " + sname;

			let arg = args[1];
			if(UTILS.isInt(args[2])) arg += " " + args[2];
			let lockVer = args[3] !== undefined ? UTILS.bool(args[3], false) : UTILS.bool(args[2], false);
			let json = sdata[sname].search(arg, lockVer, true);

			if(!json)
				throw source, "-There is no " + args[0] + " that could be identified using '" + arg + "'. It might have a different alias/ID, or there may be other objects with the same alias.";

			UTILS.msg(source, UTILS.display(json));
		});
	});

	register_scmd("lock", "[Boolean]", "Edit Lock", "Enable/disable/check if editing has been Locked to prevent edits from applying to the current game.", {adminOnly: true, slashOpts:
		[
			{datatype: "Boolean", oname: "allowed", func: (str) => str.setDescription("Set to enable/disable the Edit Lock. Omit to check if it is enabled or disabled.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];

		if(data.inherit)
			throw "-You cannot edit Structures or Objects while inheritance is enabled.";

		if(args[0] === undefined)
			UTILS.msg(source, "Edit Lock: " + (data.locked ? "Enabled" : "Disabled"));
		else
		{
			let was = data.locked;
			let lock = UTILS.bool(args[0], false);

			data.locked = lock;

			if(was && !data.locked && data.structs)
				for(let s in data.structs)
					data.structs[s].unlock();

			UTILS.msg(source, "Edit Lock is now: " + (lock ? "Enabled" : "Disabled"));
			overwrite(source);
		}
	});

	register_scmd("preview", "<Command>", "Preview Locked Object", "Preview the Edit-Locked version of an Object", {minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "command", func: (str) => str.setDescription("The Object Command to preview in its soon-to-be-updated form, including prefix.")},
		]
	},
	(chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			if(!data.locked)
				throw "-Edit Lock mode is disabled. There are no pending updates to preview.";

			let sdata = data.structs;

			if(!sdata)
				throw "-There is no Structure data at all, much less anything to preview.";

			if(args.length === 1)
				args = UTILS.split(args, " ");

			for(let s in sdata)
			{
				let struct = sdata[s];

				if(struct.getPrefix() === args[0].substring(0, struct.getPrefix().length))
				{
					let cmd = (args[0] || "").toLowerCase().substring(struct.getPrefix().length);
					args = args.splice(1);

					try
					{
						struct.execute(source, cmd, args, true);
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

			let input = args[0];

			for(let i = 1; i < args.length; i++)
				input += " " + args[i];
			
			UTILS.msg(source, "-ERROR: No Structure could be matched to input:\n " + input);
		});
	});

	register_cmd(["random_id", "randomid", "rid"], "<structure> [param1] [param2] [param3] [param4] [param5] [author id]", "Random ID", "For scripting purposes.\n\nGet a random object ID, filterable by Param.\n\nThis is essentially a script-compatible version of the `/rand_` series of server commands, following all the same filtering rules.\n\nOutputs only the numeric ID of the random object, or -1 if nothing was found.", {minArgs: 1}, (chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};
			let sname = UTILS.toArgName(args[0], true);

			if(!sdata[sname])
				throw "-There is no Structure with the name: " + sname;

			args.splice(0, 1);

			let result = sdata[sname].roll(chn, source, e, args);

			if(result)
				UTILS.msg(source, "ID" + result.info.getID());
			else
				throw "-No results for query: " + UTILS.display(args);
		});
	});

	register_cmd(["list_ids", "listids", "lids", "lid"], "<structure> [param1] [param2] [param3] [param4] [param5] [author id]", "List IDs", "For scripting purposes.\n\nList all object IDs that belong to a given Structure, separated by lines for use with !foreach.\n\nThis is essentially a script-compatible version of the `/_list` series of server commands, following all the same filtering rules.", {minArgs: 1}, (chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};
			let sname = UTILS.toArgName(args[0], true);

			if(!sdata[sname])
				throw "-There is no Structure with the name: " + sname;

			args.splice(0, 1);

			let results = sdata[sname].list(chn, source, e, args, true);
			let output = results[0];

			for(let i = 1; i < results.length; i++)
				output += '\n' + results[i];

			if(results)
				UTILS.msg(source, output);
			else
				throw "-No results for query: " + UTILS.display(args);
		});
	});

	register_cmd("data", "<structure> <alias or ID> <key1> [key2] [key3] [keyN]...", "Read Object Data", "For scripting purposes.\n\nRead a specific piece of data from a given object.\n\nIf multiple keys are provided, it is assumed that you are reading from a table within a table within a table... for each added key.\n\nThrows an error if the result, itself, would be a table.\n\nFor example, to find the name of the first field of an Example-Structure object named 'Thing', you might use:\n\n" + PRE + "data example thing fields 0 name\n\nUse the " + PRE + "view_json command to know what keys are available for an object.", {minArgs: 3}, (chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};
			let sname = UTILS.toArgName(args[0], true);

			if(!sdata[sname])
				throw "-There is no Structure with the name: " + sname;

			let arg = args[1];
			if(UTILS.isInt(args[2])) arg += " " + args[2];
			let json = sdata[sname].search(arg, false, true);

			if(!json)
				throw "-There is no " + args[0] + " that could be identified using '" + arg + "'. It might have a different alias/ID, or there may be other objects with the same alias.";

			let start = 2;

			if(UTILS.isInt(args[2]))
			{
				if(args.length === 3)
					throw "-You must provide at least one Key to search for!";

				start = 3;
			}

			let cur = json;

			for(let i = start; i < args.length; i++)
			{
				let key = args[i];

				if(cur[key] === undefined)
					throw "-Key not found: " + key;

				cur = cur[key];
			}

			if(cur === null)
				cur = "null";

			if(UTILS.isOneOf(typeof cur, "boolean", "number", "string"))
				UTILS.msg(source, String(cur));
			else
				throw "Cannot output value of type: " + typeof cur;
		});
	});

	function censor(length)
	{
		let c = "";

		for(let i = 0; i < length; i++)
			c = c + "█";

		return c;
	}

	const lastGT = {};

	register_scmd(["guess_the", "guessthe", "guess"], "<structure>", "Guess The <Object>", "Load a random object of a given Structure with the name hidden. Try to guess what it is!", {minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "structure", func: (str) => str.setDescription("What type of object will you guess?")},
		]
	},
	(chn, source, e, args) =>
	{
		UTILS.inherit(SERVER_DATA, source, (data) =>
		{
			let sdata = data.structs || {};
			let sname = UTILS.toArgName(args[0], true);

			if(!sdata[sname])
				throw "There is no Structure with the name: " + sname;

			let obj = sdata[sname].roll(chn, source, e, []);

			if(!obj)
				throw "There was no " + args[0] + " that could be rolled!";

			lastGT[chn.id] = {
				author: {name: obj.info.getTitle(), iconURL: obj.info.getIconURL()},
				desc: obj.info.getDesc(),
				color: obj.info.getColor(),
				creator: obj.info.getAuthor()
			};

			obj.info.setAuthor("[REDACTED]");
			e = obj.info.embed();
			let truename = e.data.author.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			let censorname = censor(truename.length);

			e.setAuthor({name: "Guess The " + UTILS.titleCase(args[0])});
			e.setColor("808080");
			e.setImage();
			e.setDescription("Try to guess the name of this " + args[0] + " based on the info below! Use `!answer` to check if you were correct or not.");

			for(let i = 0; i < e.data.fields.length; i++)
			{
				e.data.fields[i].name = e.data.fields[i].name.replace(new RegExp(truename, 'ig'), censorname);
				e.data.fields[i].value = e.data.fields[i].value.replace(new RegExp(truename, 'ig'), censorname);
			}

			UTILS.embed(source, e);
		});
	});

	register_scmd(["answer"], "", "GTO Answer", "View the answer of the previous use of 'Guess the Object' from within this channel.", (chn, source, e, args) =>
	{
		let last = lastGT[chn.id];

		if(!last)
			throw "You must use the Guess the Object command before recieving an answer.";

		e.setAuthor(last.author);
		e.setDescription(last.desc);
		e.setColor(last.color);
		e.addFields([{name: "Created by:", value: "<@" + last.creator + ">"}]);

		UTILS.embed(source, e);
	});
};
