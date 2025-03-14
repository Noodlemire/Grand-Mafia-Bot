module.exports = (g) =>
{
	const {PRE, UTILS, ELEVATED, SERVER_DATA, CUSTOMDIR, path, fs, EmbedBuilder, StructObj, add_gcmd, ActionRowBuilder, ButtonBuilder, ButtonStyle, registerMenus, ignorePostNo} = g;

	function listDisp(t, s, c)
	{
		s = s || "";
		c = c || "";

		for(let k in t)
		{
			if(Array.isArray(t[k]))
			{
				if(c.length > 0)
					s += "\n" + c.substring(0, c.length-1) + ":";

				for(let i = 0; i < t[k].length; i++)
					s += "\n" + t[k][i];

				s += "\n";
			}
			else
				s = listDisp(t[k], s, c + UTILS.titleCase(k) + "/");
		}

		return s;
	}

	function supply_gcmd_args(gcmd, base_min_args, pre_param, post_param, req_param, parent, param1, param2, param3, param4, parent_desc, param_desc)
	{
		let b1 = (req_param ? "<" : "[");
		let b2 = (req_param ? ">" : "]");

		gcmd.param = (pre_param ? " " + pre_param : "")
				+ (parent ? " " + b1 + parent + b2 : "")
				+ (param1 ? " " + b1 + param1 + b2 : "")
				+ (param2 ? " " + b1 + param2 + b2 : "")
				+ (param3 ? " " + b1 + param3 + b2 : "")
				+ (param4 ? " " + b1 + param4 + b2 : "")
				+ (post_param ? " " + post_param : "");

		if(req_param)
			gcmd.meta.minArgs = base_min_args + UTILS.count(parent, param1, param2, param3, param4);
		else
			gcmd.meta.minArgs = base_min_args;

		if(param4) gcmd.meta.slashOpts.splice(base_min_args, 0, {datatype: "String", oname: param4, func: (str) => str.setDescription(param_desc).setMaxLength(256)});
		if(param3) gcmd.meta.slashOpts.splice(base_min_args, 0, {datatype: "String", oname: param3, func: (str) => str.setDescription(param_desc).setMaxLength(256)});
		if(param2) gcmd.meta.slashOpts.splice(base_min_args, 0, {datatype: "String", oname: param2, func: (str) => str.setDescription(param_desc).setMaxLength(256)});
		if(param1) gcmd.meta.slashOpts.splice(base_min_args, 0, {datatype: "String", oname: param1, func: (str) => str.setDescription(param_desc).setMaxLength(256)});
		if(parent) gcmd.meta.slashOpts.splice(base_min_args, 0, {datatype: "String", oname: parent, func: (str) => str.setDescription(parent_desc).setMaxLength(256)});
	}

	class Struct
	{
		#name;
		#prefix;
		#parent;
		#param1;
		#param2;
		#param3;
		#param4;
		#serverid;
		#aliasIDs = {};
		#nextID = 0;

		constructor(serverid, name, prefix, parent, param1, param2, param3, param4)
		{
			SERVER_DATA[serverid].structs = SERVER_DATA[serverid].structs || {};
			let sdata = SERVER_DATA[serverid].structs;
			let title = UTILS.titleCase(name.name || name);

			this.#serverid = serverid;

			let reg_gcmd = {
				title: "Register " + title,
				desc: "Register a new Object belonging to the '" + title + "' Structure.",
				meta:{
					ephemeral: true,
					slashOpts:
					[
						{datatype: "String", oname: "alias_list", func: (str) => str.setDescription("Space-separated, case-insensitive list of names for new commands to refer to this object.").setMaxLength(2000)},
						{datatype: "String", oname: "title", func: (str) => str.setDescription("Human-readable title of the command, shown in the Embed.").setMaxLength(256)},
						{datatype: "String", oname: "color", func: (str) => str.setDescription("Six-digit hex code defining the Embed's color, or the word random.").setMinLength(6).setMaxLength(6)},
						{datatype: "String", oname: "icon_url", func: (str) => str.setDescription("Tiny image that appears to the left of the Embed's title.")},
						{datatype: "String", oname: "image_url", func: (str) => str.setDescription("Large image displayed at the bottom of the Embed.")},
					]
				},
				func: this.#register,
				struct: name.name || name
			};

			let list_gcmd = {
				title: title + " List",
				desc: "Create a filterable list of Objects belonging to the '" + title + "' Structure.",
				meta: {slashOpts: [{datatype: "String", oname: "author_id", func: (str) => str.setDescription("Filter by User ID. You may choose multiple; use `|` to separate them.").setMaxLength(2000)}]},
				func: this.list,
				struct: name.name || name,
				
			};

			let roll_gcmd = {
				title: "Random " + title,
				desc: "Randomly generate a new " + title + ", adhering to any given filters.",
				meta: {slashOpts: [{datatype: "String", oname: "author_id", func: (str) => str.setDescription("Filter by User ID. You may choose multiple; use `|` to separate them.").setMaxLength(2000)}]},
				func: (chn, source, e, args) => 
				{
					let result = this.roll(chn, source, e, args);

					if(result)
						result.info.embed(source);
					else
						UTILS.msg(source, "Nothing could be generated under given filters.");
				},
				struct: name.name || name
			};

			if(typeof name === "object")
			{
				this.#name = name.name;
				this.#prefix = name.prefix;
				this.#parent = name.parent;
				this.#param1 = name.param1;
				this.#param2 = name.param2;
				this.#param3 = name.param3;
				this.#param4 = name.param4;
				this.#nextID = name.nextID;

				supply_gcmd_args(reg_gcmd, 2, "<Space-Separated Alias List> <Human-Readable Title>", "[Color Hex Code|Random] [Icon URL] [Image URL]", true, name.parent, name.param1, name.param2, name.param3, name.param4, "Name of a " + name.parent + ". This will inherit its Color and Icon URL unless set manually.", "Inline Field.");

				supply_gcmd_args(list_gcmd, 0, undefined, "[Author ID]", false, name.parent, name.param1, name.param2, name.param3, name.param4, "Filter by " + name.parent + ". You may choose multiple; use `|` to separate them.", "Filter by special value. You may choose multiple; use `|` to separate them.");

				supply_gcmd_args(roll_gcmd, 0, undefined, "[Author ID]", false, name.parent, name.param1, name.param2, name.param3, name.param4, "Filter by " + name.parent + ". You may choose multiple; use `|` to separate them.", "Filter by special value. You may choose multiple; use `|` to separate them.");

				roll_gcmd.meta.slashOpts.push({datatype: "Number", oname: "any_rate", func: (str) => str.setDescription("Chance of spawning only due to Meta, such as `spawn_as_any` or `spawn_if_parent`. Default: 0.1").setMinValue(0).setMaxValue(1)});

				add_gcmd(serverid, "register_" + name.name, reg_gcmd);
				add_gcmd(serverid, name.name + "_list", list_gcmd);
				add_gcmd(serverid, "rand_" + name.name, roll_gcmd);

				for(let id = 0; id < this.#nextID; id++)
				{
					let file = path.join(CUSTOMDIR, this.#serverid, this.#name, id + ".json");
					let file_locked = path.join(CUSTOMDIR, this.#serverid, this.#name, id + " (locked).json");

					if(fs.existsSync(file_locked))
					{
						let data = JSON.parse(fs.readFileSync(file_locked, "utf8"));
						let als = data.aliases;

						for(let a = 0; a < als.length; a++)
							this.addAliasForID(data.id, als[a]);
					}
					else if(fs.existsSync(file))
					{
						let data = JSON.parse(fs.readFileSync(file, "utf8"));
						let als = data.aliases;

						for(let a = 0; a < als.length; a++)
							this.addAliasForID(data.id, als[a]);

						if(serverid === "877320177035923466" && name.name !== "faction")
						{
							let postNo = "";
							let desc = UTILS.split(data.desc, '\n');
							let words = UTILS.split(desc[0], " ");

							for(let t = 0; t < words.length; t++)
							{
								if(!isNaN(parseInt(words[t], 10)))
								{
									postNo = words[t];
									break;
								}
							}

							let TARGET = " - ";

							/*if(data.title.includes(TARGET))
							{
								let amalgam = UTILS.split(data.title, TARGET);
								let fixTitle = amalgam[0];
								let alignment = amalgam[1].substring(0, amalgam[1].length-1);
								let fixPost = data.aliases[0];
								let fixUnique = "False";

								if(fixPost === "4") fixPost = data.aliases[1];

								if(alignment.substring(0, 6) === "Unique")
								{
									fixUnique = "True";
									alignment = alignment.substring(7);
								}

								let facsub = UTILS.split(alignment, " (");
								let fixFac = facsub[0];
								let fixSub = facsub[1];

								let fixAlisLib = {[fixPost]: true};

								const COMMON = ["a", "an", "the", "to", "of", "but", "or", "and", "with", "without", "can", "cannot", "can't", "no", "do", "does", "don't", "doesn't", "us", "our", "you", "i", "me", "this", "that", "there", "then", "in", "out", "not", "if", "it", "it's", "its"];
								let alias_base = UTILS.toArgName(fixTitle);
								let alias_ext = UTILS.toArgName(fixTitle, true);
								let hasSpace = alias_base.includes("_") || alias_base.includes("-");

								fixAlisLib[alias_base] = true;
								fixAlisLib[alias_ext] = true;

								if(alias_base.includes("_") || alias_base.includes("-"))
								{
									fixAlisLib[alias_base.replace(/[_-]/g, "")] = true;
									fixAlisLib[alias_ext.replace(/[_-]/g, "")] = true;
								
									let acronym = "";
									let acronym_short = "";
									let words_ext = UTILS.split(alias_ext, /[_-]/);

									for(let v = 0; v < words_ext.length; v++)
									{
										let ini = words_ext[v].substring(0, 1);
										acronym += ini;

										if(!UTILS.containsString(COMMON, words_ext[v]))
										{
											acronym_short += ini;
											fixAlisLib[words_ext[v]] = true;
										}
									}

									if(alias_base !== alias_ext)
									{
										let words = UTILS.split(alias_base, /[_-]/);

										for(let v = 0; v < words.length; v++)
											if(!UTILS.containsString(COMMON, words[v]))
												fixAlisLib[words[v]] = true;
									}

									if(acronym.length > 2)
										fixAlisLib[acronym] = true;

									if(acronym_short.length > 1)
								roll_gcmd		fixAlisLib[acronym_short] = true;
								}

								delete fixAlisLib[""];

								data.title = fixTitle;
								data.aliases = Object.keys(fixAlisLib);
								data.params.faction = fixFac;
								data.params.subalignment = fixSub;
								data.params.unique = fixUnique;

								console.log(data.title + " (" + data.params.faction + " " + data.params.subalignment + ")");

								//fs.writeFileSync(file, JSON.stringify(data));
							}//*/

							/*
							if((data.fields[0] || {value: ""}).value.includes("\n" + TARGET))
							{
								console.log(data.title + " - " + data.params.faction + " (" + data.params.subalignment + ")");
								//console.log(data.title + " - " + data.desc + "\n");

								let halves = UTILS.split(data.fields[0].value, "\n" + TARGET);

								if(halves[1] && (halves[1].substring(0, 2) === ": " || halves[1].substring(0, 2) === ":\n" || halves[1].substring(0, 2) === " -" || halves[1].substring(0, 2) === " —"))
								{
									data.fields[0].value = halves[0].trim();
									data.fields.splice(1, 0, {name: TARGET + ":", value: halves[1].substring(2).trim()})

									console.log(UTILS.display(data.fields) + '\n');
								}

								//for(let i = lines.length-1; i >= 0; i--)
								//	if(lines[i].toLowerCase() === "goal: " + data.params.faction.toLowerCase() + " goal")
								//		lines.splice(i, 1);

								//data.fields[0].value = lines[0];
								//for(let i = 1; i < lines.length; i++)
								//	data.fields[0].value += '\n' + lines[i];

								//console.log(data.fields[0].value + "\n");

								//fs.writeFileSync(file, JSON.stringify(data));
							}//*/
						}
					}
				}
			}
			else
			{
				if(sdata[name])
					throw "-ERROR: Duplicate struct!";
				if(prefix === PRE)
					throw "-ERROR: Cannot set struct prefix to: " + PRE;
				for(let n in sdata)
					if(sdata[n].getPre() === prefix)
						throw "-ERROR: Cannot create structure with duplicate prefix: " + prefix;
				if(parent && !sdata[parent])
					throw "-ERROR: Parent structure type '" + parent + "' does not exist.";

				this.#name = name;
				this.#prefix = prefix;
				this.#parent = (parent ? parent : undefined);

				let params = UTILS.fillArr(param1, param2, param3, param4);
				this.#param1 = params[0];
				this.#param2 = params[1];
				this.#param3 = params[2];
				this.#param4 = params[3];

				supply_gcmd_args(reg_gcmd, 2, "<Space-Separated Alias List> <Human-Readable Title>", "[Color Hex Code|Random] [Icon URL] [Image URL]", true, parent, param1, param2, param3, param4, "Name of a " + parent + ". This will inherit its Color and Icon URL unless set manually.", "Inline Field.");

				supply_gcmd_args(list_gcmd, 0, undefined, undefined, false, parent, param1, param2, param3, param4, "Filter by " + parent + ". You may choose multiple; use `|` to separate them.", "Filter by special value. You may choose multiple; use `|` to separate them.");

				supply_gcmd_args(roll_gcmd, 0, undefined, undefined, false, parent, param1, param2, param3, param4, "Filter by " + parent + ". You may choose multiple; use `|` to separate them.", "Filter by special value. You may choose multiple; use `|` to separate them.");

				roll_gcmd.meta.slashOpts.push({datatype: "Number", oname: "any_rate", func: (str) => str.setDescription("Chance of spawning only due to Meta, such as `spawn_as_any` or `spawn_if_parent`. Default: 0.1").setMinValue(0).setMaxValue(1)});

				add_gcmd(serverid, "register_" + name, reg_gcmd, true);
				add_gcmd(serverid, name + "_list", list_gcmd, true);
				add_gcmd(serverid, "rand_" + name, roll_gcmd, true);
			}

			UTILS.verifyDir(CUSTOMDIR, serverid, this.#name);
		}

		getName()
		{
			return this.#name;
		}

		getTitle()
		{
			return UTILS.titleCase(this.#name);
		}

		getPre()
		{
			return this.#prefix;
		}

		getPrefix()
		{
			return this.#prefix;
		}

		getParent()
		{
			return this.#parent;
		}

		getParentObj(p, lockVer)
		{
			if(!this.#parent)
				return;

			let pdata = SERVER_DATA[this.#serverid].structs[this.getParent()];

			if(!pdata)
				return;

			return pdata.getFirstObj(UTILS.toArgName(p), lockVer);
		}

		getParam(n)
		{
			switch(n)
			{
				case 0:
					return this.#parent;
				case 1:
					return this.#param1;
				case 2:
					return this.#param2;
				case 3:
					return this.#param3;
				case 4:
					return this.#param4;
			}
		}

		getParams(exParent)
		{
			if(exParent)
				return UTILS.fillArr(this.#param1, this.#param2, this.#param3, this.#param4);
			else
				return UTILS.fillArr(this.#parent, this.#param1, this.#param2, this.#param3, this.#param4);
		}

		getIDs(alias)
		{
			if(!this.#aliasIDs[alias])
				return [];

			return [...this.#aliasIDs[alias]];
		}

		addAliasForID(id, alias)
		{
			this.#aliasIDs[alias] = this.#aliasIDs[alias] || [];
			this.#aliasIDs[alias][this.#aliasIDs[alias].length] = id;
		}

		delAliasForID(id, alias)
		{
			this.#aliasIDs[alias] = this.#aliasIDs[alias] || [];

			for(let i = this.#aliasIDs[alias].length-1; i >= 0; i--)
				if(this.#aliasIDs[alias][i] === id)
					this.#aliasIDs[alias].splice(i, 1);
		}

		getNextID()
		{
			for(let id = 0; id < this.#nextID; id++)
			{
				let file = path.join(CUSTOMDIR, this.#serverid, this.#name, id + ".json");
				let file_locked = path.join(CUSTOMDIR, this.#serverid, this.#name, id + " (locked).json");

				if(!fs.existsSync(file) && !fs.existsSync(file_locked))
					return id;
			}

			return this.#nextID;
		}

		getMaxID()
		{
			return this.#nextID;
		}

		setNextID()
		{
			this.#nextID++;
		}

		count()
		{
			let sum = 0;

			for(let id = 0; id < this.#nextID; id++)
			{
				let file = path.join(CUSTOMDIR, this.#serverid, this.#name, id + ".json");
				let file_locked = path.join(CUSTOMDIR, this.#serverid, this.#name, id + " (locked).json");

				if(fs.existsSync(file) || fs.existsSync(file_locked))
					sum++;
			}

			return sum;
		}

		getObj(id, lockVer, asJSON, seed)
		{
			let file = path.join(CUSTOMDIR, this.#serverid, this.#name, id + (lockVer ? " (locked)" : "") + ".json");

			if(lockVer && !fs.existsSync(file))
				file = path.join(CUSTOMDIR, this.#serverid, this.#name, id + ".json");

			if(fs.existsSync(file))
			{
				let filedata = fs.readFileSync(file, "utf8");

				if(asJSON)
					return JSON.parse(filedata);
				else
					return new StructObj(this.#serverid, this.#name, filedata, seed);
			}
		}

		getFirstObj(alias, lockVer)
		{
			if(!this.#aliasIDs[alias])
				return;

			return this.getObj(this.#aliasIDs[alias][0], lockVer);
		}

		search(arg, lockVer, asJSON)
		{
			let [id, num] = UTILS.split(arg, " ");

			if(id.substring(0, 2) === "ID" && UTILS.isInt(id.substring(2)))
			{
				let obj = this.getObj(id.substring(2), lockVer, asJSON);
				if(obj) return obj;
			}

			id = UTILS.toArgName(id);
			num = parseInt(num, 10);
			let ids = this.getIDs(id);

			if(ids[num-1])
				return this.getObj(ids[num-1], lockVer, asJSON);
			else if(ids.length === 1)
				return this.getObj(ids[0], lockVer, asJSON);
		}

		hasLockedVer(id)
		{
			return fs.existsSync(path.join(CUSTOMDIR, this.#serverid, this.#name, id + " (locked).json"))
		}

		//Due to technical wizardry, 'this' refers to the Command object that stores this function.
		#register(chn, source, e, args)
		{
			if(SERVER_DATA[source.guild.id].inherit)
			{
				UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
				return;
			}

			if(!source.member.permissions.has(ELEVATED) && !SERVER_DATA[source.guild.id].user_submission)
			{
				UTILS.msg(source, "-You do not have permission to create new objects.");
				return;
			}

			if(registerMenus[source.member.id])
			{
				UTILS.msg(source, "-Please submit or cancel the menu you already have open, thanks.");
				return;
			}

			let struct = SERVER_DATA[source.guild.id].structs[this.struct];
			let aliases = UTILS.split(args[0], ' ');
			let aliasLib = {};
			let title = args[1];
			let params = {};
			let paramlist = struct.getParams();
			let pfields = [];
			let author = source.member.id;

			for(let i = 0; i < paramlist.length; i++)
			{
				params[paramlist[i]] = args[2+i];
				pfields[pfields.length] = {name: UTILS.titleCase(paramlist[i]), value: args[2+i], inline: true};
			}

			for(let i = 0; i < aliases.length; i++)
			{
				aliases[i] = UTILS.toArgName(aliases[i]);

				if(aliases[i].length === 0)
				{
					UTILS.msg(source, "-Error: Cannot submit an empty alias.");
					return;
				}

				aliasLib[aliases[i]] = true;
			}

			let parent = struct.getParentObj(args[2]);
			let color = (args[paramlist.length+2] || (parent ? parent.getColor() : "808080")).toLowerCase();
			let iconURL = args[paramlist.length+3] || (parent ? parent.getIconURL() : undefined);
			let imageURL = args[paramlist.length+4];

			if(iconURL && !UTILS.isURL(iconURL))
			{
				UTILS.msg(source, "-ERROR: Invalid Icon URL: " + iconURL);
				return;
			}

			if(imageURL && !UTILS.isURL(imageURL))
			{
				UTILS.msg(source, "-ERROR: Invalid Image URL: " + imageURL);
				return;
			}

			if(args[paramlist.length+2]) args[paramlist.length+2] = args[paramlist.length+2].toLowerCase();

			e.setAuthor({name: title, iconURL}).setColor(color === "random" ? UTILS.rHex(6) : color).setImage(imageURL).addFields(pfields.concat({name: "Created by:", value: "<@" + author + ">", inline: true})).setFooter({text: "Menu data is discarded after 1 hour of inactivity."});

			let components =
			[
				new ActionRowBuilder({components:
				[
					new ButtonBuilder({customId: "struct:addfield", style: ButtonStyle.Primary, label: "Add Field"}),
					new ButtonBuilder({customId: "struct:repfield", style: ButtonStyle.Secondary, label: "Replace Field"}),
					new ButtonBuilder({customId: "struct:setmeta", style: ButtonStyle.Primary, label: "Set Metadata"}),
					new ButtonBuilder({customId: "struct:setdesc", style: ButtonStyle.Primary, label: "Set Description"}),
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
				registerMenus[source.member.id] =
				{
					message: sent,
					embed: e,
					struct: this.struct,
					aliases: Object.keys(aliasLib),
					title,
					params,
					pfields,
					color: args[paramlist.length+2],
					iconURL: args[paramlist.length+3],
					imageURL,
					fields: [],
					meta: {},
					author,
					operator: author,
					time: new Date().getTime()
				};
			});
		}

		//Due to technical wizardry, 'this' may refer to the Command object that stores this function.
		list(chn, source, e, args, onlyIDs)
		{
			return UTILS.inherit(SERVER_DATA, source, (data) =>
			{
				let struct = this;
				let filters = [];
				let sorted = {};
				let current = sorted;
				let ids = [];

				if(struct.struct) struct = data.structs[struct.struct];

				for(let i = 0; i < args.length; i++)
				{
					filters[i] = UTILS.split(args[i], "|");

					for(let n = 0; n < filters[i].length; n++)
						filters[i][n] = UTILS.toArgName(filters[i][n]);
				}

				for(let id = 0; id < struct.getMaxID(); id++)
				{
					let info = struct.getObj(id, false);
					let infoLocked = struct.getObj(id, true);

					if(info)
					{
						let staticParamlist = info.getParamList();
						let paramlist = staticParamlist.concat(info.getAuthor());
						let allowed = true;

						if(!onlyIDs)
							current = sorted;

						let paramNames = info.getParamNames().concat("Author");
						let newParams = UTILS.libSplit(info.getMeta("spawn_as", "").toLowerCase(), ";", ":");
						let spawn_any = info.hasMeta("spawn_as_any") ? UTILS.split(info.getMeta("spawn_as_any").toLowerCase(), ",") : [];
						let never_spawn_as = UTILS.libSplit(info.getMeta("never_spawn_as", "").toLowerCase(), ";", ":");
						let spawn_if_parent = struct.getParent() && info.hasMeta("spawn_if_parent") ? UTILS.libSplit(info.getMeta("spawn_if_parent", "").toLowerCase(), ";", ":") : false;
						let exclist = [];

						for(let i = 0; i < paramNames.length; i++)
						{
							if(newParams[paramNames[i]])
								paramlist[i] = UTILS.split(newParams[paramNames[i]], ",");
							else
								paramlist[i] = [paramlist[i]];

							if(never_spawn_as[paramNames[i]])
								exclist[i] = UTILS.split(never_spawn_as[paramNames[i]], ",");
							else
								exclist[i] = [];

							for(let n = 0; n < paramlist[i].length; n++)
								paramlist[i][n] = UTILS.toArgName(paramlist[i][n]);
							for(let n = 0; n < exclist[i].length; n++)
								exclist[i][n] = UTILS.toArgName(exclist[i][n]);
						}

						for(let i = 0; i < filters.length; i++)
						{
							if(filters[i].length > 0)
							{
								let level = staticParamlist[i];

								if(i === paramlist.length-1)
									level = info.getAuthor();

								if(!UTILS.matchOne(exclist[i], filters[i]) && (UTILS.matchOne(paramlist[i], filters[i])
										|| UTILS.containsString(spawn_any, paramNames[i])))
								{
									if(!onlyIDs)
										current = current[level] || (current[level] = {});
								}
								else
								{
									allowed = false;
									break;
								}
							}
						}

						if(allowed && spawn_if_parent && filters[0] && filters[0].length > 0)
						{
							allowed = false;

							for(let i = 0; i < filters[0].length; i++)
							{
								let pinfo = struct.getParentObj(filters[0][i]);

								if(pinfo)
								{
									for(let param in spawn_if_parent)
									{
										if(pinfo.getParam(param) && UTILS.containsString (
												UTILS.toArgName(UTILS.split(spawn_if_parent[param], ',')),
												UTILS.toArgName(pinfo.getParam(param))))
										{
											allowed = true;
											break;
										}
									}

									if(allowed)
										break;
								}
							}
						}

						if(allowed)
						{
							if(onlyIDs)
								ids.push("ID" + id);
							else
							{
								let aliases = infoLocked.getAliases();
								let line = "";

								for(let a = 0; a < aliases.length; a++)
									line += " " + struct.getPre() + aliases[a];

								current.list = current.list || [];
								current.list[current.list.length] = line;
							}
						}
					}
				}

				if(onlyIDs)
					return ids;
				else
					UTILS.msg(source, struct.getTitle() + " List:\n" + listDisp(sorted));
			});
		}

		//Due to technical wizardry, 'this' may refer to the Command object that stores this function.
		roll(chn, source, e, args)
		{
			return UTILS.inherit(SERVER_DATA, source, (data) =>
			{
				let struct = this;
				let filters = [];
				let rollable = {};

				if(struct.struct) struct = data.structs[struct.struct];

				for(let i = 0; i < Math.min(args.length, 5); i++)
				{
					if(args[i])
					{
						filters[i] = UTILS.split(args[i], "|");

						for(let n = 0; n < filters[i].length; n++)
							if(filters[i][n] !== '*')
								filters[i][n] = UTILS.toArgName(filters[i][n]);
					}
				}

				let anyRate = UTILS.gate(0, (args[6] === undefined ? 0.1 : parseFloat(args[6])), 1);
				let allowAny = (anyRate > Math.random());

				for(let id = 0; id < struct.getMaxID(); id++)
				{
					let info = struct.getObj(id, false);

					if(info)
					{
						let paramlist = info.getParamList().concat(info.getAuthor());
						let allowed = true;
						let rate = info.getNum("spawn_rate", 1);

						if(info.getBool("cannot_spawn", false) || rate <= 0)
							allowed = false;
						else
						{
							let paramNames = info.getParamNames().concat("Author");
							let newParams = UTILS.libSplit(info.getMeta("spawn_as", "").toLowerCase(), ";", ":");
							let spawn_any = info.hasMeta("spawn_as_any") ? UTILS.split(info.getMeta("spawn_as_any").toLowerCase(), ",") : [];
							let never_spawn_as = UTILS.libSplit(info.getMeta("never_spawn_as", "").toLowerCase(), ";", ":");
							let spawn_if_parent = struct.getParent() && info.hasMeta("spawn_if_parent") ? UTILS.libSplit(info.getMeta("spawn_if_parent", "").toLowerCase(), ";", ":") : false;
							let exclist = [];

							for(let i = 0; i < paramNames.length; i++)
							{
								if(newParams[paramNames[i]])
									paramlist[i] = UTILS.split(newParams[paramNames[i]], ",");
								else
									paramlist[i] = [paramlist[i]];

								if(never_spawn_as[paramNames[i]])
									exclist[i] = UTILS.split(never_spawn_as[paramNames[i]], ",");
								else
									exclist[i] = [];

								for(let n = 0; n < paramlist[i].length; n++)
									paramlist[i][n] = UTILS.toArgName(paramlist[i][n]);
								for(let n = 0; n < exclist[i].length; n++)
									exclist[i][n] = UTILS.toArgName(exclist[i][n]);
							}

							for(let i = 0; i < filters.length; i++)
							{
								if(filters[i] === undefined || filters[i][0] === '*') continue;

								if(filters[i].length > 0
										&& ((!UTILS.matchOne(paramlist[i], filters[i])
										&& (!allowAny || !UTILS.containsString(spawn_any, paramNames[i])))
										|| UTILS.matchOne(exclist[i], filters[i])))
								{
									allowed = false;
									break;
								}
							}

							if(allowed && allowAny && spawn_if_parent && filters[0] && filters[0].length > 0)
							{
								allowed = false;

								for(let i = 0; i < filters[0].length; i++)
								{
									let pinfo = struct.getParentObj(filters[0][i]);

									if(pinfo)
									{
										for(let param in spawn_if_parent)
										{
											if(pinfo.getParam(param) && UTILS.containsString (
													UTILS.toArgName(UTILS.split(spawn_if_parent[param], ',')),
													UTILS.toArgName(pinfo.getParam(param))))
											{
												allowed = true;
												break;
											}
										}

										if(allowed)
											break;
									}
								}
							}
						}

						if(allowed)
							rollable[info.getID()] = {info, rate};
					}
				}

				return UTILS.randChances(rollable);
			});
		}

		execute(source, cmd, args, lockVer)
		{
			let ids = this.#aliasIDs[cmd];
			let id = null;
			let seed = args[0];

			if(!ids || ids.length === 0)
			{
				UTILS.msg(source, "-ERROR: Unknown " + this.getName() + ": " + this.getPre() + cmd);
				return;
			}
			else if(ids.length === 1)
				id = ids[0];
			else
			{
				if(UTILS.isInt(args[0]))
				{
					id = ids[Number(args[0])-1];
					seed = args[1];
				}
				else
				{
					let txt = "Command '" + this.#prefix + cmd + "' refers to multiple commands. Did you mean:\n";
					let validIDs = [];

					for(let i = 0; i < ids.length; i++)
					{
						let obj = this.getObj(ids[i], lockVer);

						if(obj)
						{
							validIDs[validIDs.length] = ids[i];
							txt += "\n" + this.#prefix + cmd + " " + (i+1) + " - " + obj.getTitle(true);

							let paramKeys = this.getParams();
							let paramVals = obj.getParamList();

							if(paramKeys.length > 0)
							{
								txt += " (" + paramKeys[0] + ": " + paramVals[0];

								for(let n = 1; n < paramKeys.length; n++)
									txt += ", " + paramKeys[n] + ": " + paramVals[n];

								txt += ")";
							}
						}
						else if(!lockVer && !this.hasLockedVer(ids[i]))
							txt += "\n-ERROR: Data for ID '" + ids[i] + "' is missing or corrupted!";
					}

					if(validIDs.length === 0)
						txt = "-ERROR: Unknown " + this.getName() + ": " + this.getPre() + cmd;

					if(validIDs.length === 1)
						id = validIDs[0];
					else
					{
						UTILS.msg(source, txt);
						return;
					}
				}
			}

			if(UTILS.isInt(id))
			{
				let obj = this.getObj(id, lockVer, false, seed);

				if(obj)
					obj.embed(source);
				else if(!lockVer && !this.hasLockedVer(id))
					UTILS.msg(source, "-ERROR: File `" + this.getName() + "/" + id + ".json` is missing or corrupted.");
				else
					UTILS.msg(source, "-ERROR: Unknown " + this.getName() + ": " + this.getPre() + cmd);
			}
			else
				UTILS.msg(source, "-ERROR: Unknown " + this.getName() + ": " + this.getPre() + cmd);
		}

		toJSON()
		{
			//Don't know why I can't just return the raw definition directly,
			//but okay. Have a free pointless variable, I guess.

			let json = {
				name: this.#name,
				prefix: this.#prefix,
				parent: this.#parent,
				param1: this.#param1,
				param2: this.#param2,
				param3: this.#param3,
				param4: this.#param4,
				nextID: this.#nextID
			};

			return json;
		}

		unlock()
		{
			for(let id = 0; id < this.#nextID; id++)
			{
				let file_locked = path.join(CUSTOMDIR, this.#serverid, this.#name, id + " (locked).json");

				if(fs.existsSync(file_locked))
				{
					new StructObj(this.#serverid, this.#name, fs.readFileSync(file_locked, "utf8")).save();
					fs.rmSync(file_locked, {recursive: true, force: true});
				}
			}
		}
	}

	return Struct;
};
