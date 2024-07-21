const HELP = ["", " (cont.)", " (moar.)", " (help.)", " (stop.)", " (please.)", " (god.)", " (why.)"];
const COMMON = ["a", "an", "the", "to", "of", "but", "or", "and", "with", "without", "can", "cannot", "can't", "no", "do", "does", "don't", "doesn't", "us", "our", "you", "i", "me", "this", "that", "there", "then", "in", "out", "not", "if", "it", "it's", "its"];

module.exports = (g) =>
{
	const {ELEVATED, SERVER_DATA, UTILS, StructObj, add_scmd, overwrite, Struct, path, fs, ignorePostNo} = g;
	let i = 0;
	
	function register_scmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}

		add_scmd(name, {
			id: "a" + i,
			cat: "Auto",
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

	register_scmd(["automate", "auto"], "<struct> <#input> <#output> [enable_post_numbering] [default_param0] [default_param1] [default_param2] [default_param3] [default_param4]", "Set Up Automation",
`> Set an Automated Channel. Given proper formatting, posts in the channel will be made into Commands.
> 
> The format is as such:

Post ####
**Title In Bold** (ParamValue ParamName ParamValue)
Some kind of description
Or other fact
ParamName: ParamValue
ParamName:ParamValue
ParamName

Color: ABC123
Icon URL: https://...
Image URL: https://...

Field Name 1:
- Info for the Field Body
- More info
- Etc.

Field Name 2:
- Stuff
- Goes
- Here

Extra line (Will still be part of Field Name 2's Body)

Single Line Field Name: Single Line Info Here

> In general, the format aims to be fairly flexible.
> 
> The most important part is the Title. The Title must be the first instance of Bolded Text, and the Bold formatting \`\\*\\*\` must be at the absolute beginning of the line.
> 
> The Params sections may look confusing, but that is because there are two possible ways to format them, and they may be mixed and matched to your liking.
> 
> One format is to list ParamValues or ParamNames in () following the Title. This section must not be Bolded. ParamValues will automatically be assigned to the object's ParamNames in order; if a ParamName is listed, it will instead be set to True, and can appear in any order.
> 
> Another format is to name a Param at the beginning of a line, and provide a value after \`:\`. This is more reliable, and allows for ParamValues with spaces. A ParamName without any value set will instead default to True.
> 
> If the parameter \`enable_post_numbering\` is set to True, the first number will be assumed to be the Post Number, and will automatically be added at the start of the Description, and as an alias.
> 
> Post numbers may also have letters attached, such as 989a and 989b. The bot will register aliases both for versions of the numbers with letters included, and without.
> 
> Most sections are optional. Only the Title, Post Number (if enable_post_numbering is True), and Params without Defaults set are required.`, {adminOnly: true, minArgs: 3, shortDesc: "Set an Automated Channel. Given proper formatting, posts in the channel will be made into Commands", slashOpts:
		[
			{datatype: "String", oname: "struct", func: (str) => str.setDescription("Type of object that posts will be converted to.")},
			{datatype: "String", oname: "input", func: (str) => str.setDescription("Channel where input messages go to be processed.")},
			{datatype: "String", oname: "output", func: (str) => str.setDescription("Channel where bot provides confirmation/error info.")},
			{datatype: "Boolean", oname: "enable_post_numbering", func: (str) => str.setDescription("If true, the Automation will expect and handle Post Numbers for Grand Idea Games.")},
			{datatype: "String", oname: "default_param0", func: (str) => str.setDescription("Default value, used if the input post fails to provide it.")},
			{datatype: "String", oname: "default_param1", func: (str) => str.setDescription("Default value, used if the input post fails to provide it.")},
			{datatype: "String", oname: "default_param2", func: (str) => str.setDescription("Default value, used if the input post fails to provide it.")},
			{datatype: "String", oname: "default_param3", func: (str) => str.setDescription("Default value, used if the input post fails to provide it.")},
			{datatype: "String", oname: "default_param4", func: (str) => str.setDescription("Default value, used if the input post fails to provide it.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];
		let sname = UTILS.toArgName(args[0], true);
		let struct = (data.structs || {})[sname];

		if(data.inherit)
		{
			UTILS.msg(source, "-You cannot edit Structures or Objects while inheritance is enabled.");
			return;
		}

		if(!struct)
		{
			UTILS.msg(source, "-ERROR: Could not find Struct: " + sname);
			return;
		}

		let inp = args[1].substring(2, args[1].length-1);
		let out = args[2].substring(2, args[2].length-1);

		let input = source.guild.channels.cache.get(inp);
		let output = source.guild.channels.cache.get(out);

		if(!input || !output)
		{
			UTILS.msg(source, "-ERROR: One or both of the provided channels are invalid.");
			return;
		}

		if(data.auto && data.auto[inp])
		{
			UTILS.msg(source, "-ERROR: An Automation already exists for the channel with ID: " + inp);
			return;
		}

		let epn = UTILS.bool(args[3], false);
		let defaultParams = [args[4], args[5], args[6], args[7], args[8]];
		data.auto = data.auto || {};

		for(let i = 4; i >= 0; i--)
			if(struct.getParam(i) === undefined)
				defaultParams.splice(i, 1);

		data.auto[inp] = {
			struct: sname,
			output: out,
			epn,
			defaultParams
		};

		UTILS.msg(source, "Now Automating every " + sname + " post in " + args[1], true);
		UTILS.msg(output, "Now logging Automated Commands from " + args[1], true);
		overwrite(source);
	});

	register_scmd(["stop_automattion", "stopautomattion", "stopauto"], "<#input>", "Stop Automation", "Disable an Automation Input Channel.", {adminOnly: true, minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "input", func: (str) => str.setDescription("Channel where input messages go to be processed.")},
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];
		let inp = args[0].substring(2, args[0].length-1);
		let input = source.guild.channels.cache.get(inp);

		if(!data.auto || !data.auto[inp])
		{
			UTILS.msg(source, "-ERROR: Could not find Automation Channel with ID: " + inp);
			return;
		}

		delete data.auto[inp];

		if(input)
			UTILS.msg(input, "-Automation Stopped.");

		UTILS.msg(source, "+Successfully stopped Automation Channel with ID: " + inp);

		overwrite(source);
	});

	register_scmd(["list_automattions", "listautomattions", "listauto"], "", "List Automations", "List all Automation Input Channel IDs.", (chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];

		if(!data.auto || Object.keys(data.auto).length === 0)
		{
			UTILS.msg(source, "-There are no Automations to list.");
			return;
		}

		let output = "Automations:";

		for(let id in data.auto)
			output += "\n<#" + id + "> (" + data.auto[id].struct + ")";

		UTILS.msg(source, output, true);
	});

	return (struct, auto, message, output, locked) =>
	{
		if(!message.member.permissions.has(ELEVATED) && !SERVER_DATA[message.guild.id].user_submission)
		{
			UTILS.msg(message, "-You do not have permission to create new objects.");
			return;
		}

		let sets = message.content.split(/\n\s*\n/);
		
		let postNo = "";
		let title = "";
		let desc = "";
		let aliasLib = {};
		let params = [];
		let fields = [];
		let color = null;
		let iconURL = null;
		let imageURL = null;
		let meta = {};
		let auth = message.author.id;
		
		let field = null;
		let cont = 0;

		let paramNames = struct.getParams();
		let paramKeys = {};

		for(let i = 0; i < paramNames.length; i++)
			paramKeys[paramNames[i]] = i;

		for(let i = 0; i < sets.length; i++)
		{
		    let lines = UTILS.split(sets[i].trim(), "\n");
		    
		    for(let n = 0; n < lines.length; n++)
			{
				let hasSpace = UTILS.isOneOf(lines[n].substring(0, 2), " -", " *");
				let line = lines[n].trim();
				if(hasSpace) line = ' ' + line;

				if(line.substring(0, 2) === "**" && title === "")
				{
					line = line.replace(/\*\*\*/g, "**");
					let [t, data] = UTILS.split(line.substring(2), "**");

					title = t.substring(0, 256).trim();

					let alias_base = UTILS.toArgName(title);
					let alias_ext = UTILS.toArgName(title, true);
					let hasSpace = alias_base.includes("_") || alias_base.includes("-");

					aliasLib[alias_base] = true;
					aliasLib[alias_ext] = true;

					if(alias_base.includes("_") || alias_base.includes("-"))
					{
						aliasLib[alias_base.replace(/[_-]/g, "")] = true;
						aliasLib[alias_ext.replace(/[_-]/g, "")] = true;
					
						let acronym = "";
						let acronym_short = "";
						let words_ext = UTILS.split(alias_ext, /[_-]/);

						for(let t = 0; t < words_ext.length; t++)
						{
							let ini = words_ext[t].substring(0, 1);
							acronym += ini;

							if(!UTILS.containsString(COMMON, words_ext[t]))
							{
								acronym_short += ini;
								aliasLib[words_ext[t]] = true;
							}
						}

						if(alias_base !== alias_ext)
						{
							let words = UTILS.split(alias_base, /[_-]/);

							for(let t = 0; t < words.length; t++)
								if(!UTILS.containsString(COMMON, words[t]))
									aliasLib[words[t]] = true;
						}

						if(acronym.length > 2)
							aliasLib[acronym] = true;

						if(acronym_short.length > 1)
							aliasLib[acronym_short] = true;
					}

					if(data)
					{
						data = data.trim();
						let words = UTILS.split(data.substring(1, data.length-1), " ");

						for(let t = 0; t < words.length; t++)
						{
							let param = words[t];

							if(paramKeys[UTILS.toArgName(param)] !== undefined)
								params[paramKeys[UTILS.toArgName(param)]] = "True";
							else
								params[UTILS.firstEmpty(params)] = param;
						}
					}
				}
				else if(auto.epn && postNo === "" && /\d/.test(line))
				{
					let words = UTILS.split(line, " ");

					for(let t = 0; t < words.length; t++)
					{
						if(!isNaN(parseInt(words[t], 10)))
						{
							postNo = words[t];
							break;
						}
					}

					if(postNo !== "")
					{
						aliasLib[postNo] = true;

						if(!UTILS.isInt(postNo))
							aliasLib[String(parseInt(postNo, 10))] = true;
					}
				}
				else
				{
					if(paramKeys[line.toLowerCase()] !== undefined || line.includes(":") || line.substring(0, 2) === "**") // && (!field || n === 0)
					{
						let info = UTILS.split(line, ":");
						let key = info[0].trim().substring(0, 256).replace(/[\*_~\`]/g, "");
						let akey = UTILS.toArgName(key);
						let value = info[1];

						for(let t = 2; t < info.length; t++)
							value += ":" + info[t];

						if(value)
							value = UTILS.trimFormatting(value);

						if(value === "")
							value = undefined;

						if(paramKeys[akey] !== undefined)
						{
							if(value)
								params[paramKeys[akey]] = value;
							else
								params[paramKeys[akey]] = "True";

							continue;
						}
						else if(UTILS.isOneOf(akey, "color_hex", "colorhex", "color", "hex"))
						{
							color = (value || "undefined").toLowerCase();

							if(color[0] === "#") color = color.substring(1);

							continue;
						}
						else if(UTILS.isOneOf(akey, "icon_url", "iconurl", "icon"))
						{
							iconURL = value || "undefined";
							continue;
						}
						else if(UTILS.isOneOf(akey, "image_url", "imageurl", "image"))
						{
							imageURL = value || "undefined";
							continue;
						}
						else if(UTILS.isOneOf(akey, "alias", "aliases"))
						{
							let words = UTILS.split(value, " ");

							for(let t = 0; t < words.length; t++)										
								aliasLib[words[t]] = true;

							continue;
						}
						else if(UTILS.isOneOf(akey, "author_id", "authorid", "author"))
						{
							auth = value;
							continue;
						}
						else if(UTILS.isOneOf(akey, "metadata", "meta"))
						{
							let data = UTILS.split((value || ""), "|");

							for(let t = 0; t < data.length; t++)
							{
								let md = UTILS.split(data[t], ":");
								let md_key = UTILS.toArgName(md[0].trim(), true);
								let md_val = (md[1] || "").trim();

								for(let j = 2; j < md.length; j++)
									md_val += ':' + md[j].trim();

								meta[md_key] = md_val;
							}

							continue;
						}
						else if(n === 0)
						{
							if(field)
							{
								field.name += HELP[cont] + ":";
								fields[fields.length] = field;
							}
							
							let f = {name: key, value: ""};
							cont = 0;

							if(value)
								f.value = value;

							while(f.value.length > 1024)
							{
								fields[fields.length] = {name: key + HELP[cont] + ":", value: f.value.substring(0, 1024)};
								cont = Math.min(cont+1, HELP.length-1);
								f.value = f.value.substring(1024);
							}

							field = f;

							continue;
						}
					}
					
					if(field)
					{
						if(field.value.length + line.length > 1024)
						{
							let key = field.name;
							field.name += HELP[cont] + ":";

							if(field.value.length > 0)
							{
								cont = Math.min(cont+1, HELP.length-1);
								fields[fields.length] = field;
							}

							while(line.length > 1024)
							{
								fields[fields.length] = {name: key + HELP[cont] + ":", value: line.substring(0, 1024)};
								cont = Math.min(cont+1, HELP.length-1);
								line = line.substring(1024);
							}

							let f = {name: key, value: line};

							while(f.value.length > 1024)
							{
								fields[fields.length] = {name: key + HELP[cont] + ":", value: f.value.substring(0, 1024)};
								cont = Math.min(cont+1, HELP.length-1);
								f.value = f.value.substring(1024);
							}

							field = f;
						}
						else
						{
							if(n === 0)
								field.value += "\n";
							
							if(field.value.length > 0)
								field.value += "\n";

							field.value += line;
						}
					}
					else
					{
						if(n === 0 && desc.length > 0)
							desc += "\n";

						desc += line + "\n";
					}
				}
			}
		}

		if(field)
		{
			field.name += HELP[cont] + ":";
		    fields[fields.length] = field;
		}

		let deferr = "<@" + message.author + ">";
		let error = deferr;
						    
		if(postNo !== "")
		{
			desc = "Post " + postNo + (desc.length > 0 ? "\n" + desc.substring(0, desc.length-1) : "");

			if(parseInt(postNo, 10) <= 0 && !meta.cannot_spawn)
				meta.cannot_spawn = "true";

			//if(message.guild.id === "877320177035923466" && ignorePostNo[postNo]) return;
		}
		else if(auto.epn)
			error += "\n- Missing post number";

		if(title === "")
			error += "\n- Missing or malformatted Title";

		if(color && (color === "undefined" || color.length !== 6))
			error += "\n- Malformed Color Hex: " + color;

		if(iconURL && (iconURL === "undefined" || !UTILS.isURL(iconURL)))
			error += "\n- Malformed Icon URL: " + iconURL;

		if(imageURL && (imageURL === "undefined" || !UTILS.isURL(imageURL)))
			error += "\n- Malformed Image URL: " + imageURL;

		for(let key in meta)
			if(meta[key].length === 0)
				error += "\n- Missing Value for Meta: " + key;

		let paramLib = {};
		for(let i = 0; i < paramNames.length; i++)
		{
			paramLib[paramNames[i]] = params[i] || auto.defaultParams[i];

			if(!paramLib[paramNames[i]])
				error += "\n- Missing Param: " + paramNames[i];
		}

		for(let i = 0; i < fields.length; i++)
		{
			if(fields[i].name.length > 252)
				fields[i].name = fields[i].name.substring(0, 252) + "...:";
			if(fields[i].name.length === 0)
				error += "\n- Missing Name of Field " + i;
			if(fields[i].value.length === 0)
				error += "\n- Missing Value of Field " + i;
		}

		if(error !== deferr)
		{
			UTILS.msg(output, error + "\n\nRegistration failed. Please resubmit your post with the above error(s) resolved, or /register it manually.", true);
			return;
		}

		if(desc.length === 0)
			desc = null;

		delete aliasLib[""];

		let obj = new StructObj(message.guild.id, auto.struct, Object.keys(aliasLib), auth, title, color, iconURL, imageURL, paramLib, fields, meta, desc);
		let outputText = "+Successfully " + (locked ? "queued" : "created") + " " + obj.getStructType() + " \"" + obj.getTitle() + "\" with ID" + (postNo === "" ? "" : " (Not Necessarily Post Number)") + ": ID" + obj.getID() + "\n\nRegistered commands:";
		let aliases = obj.getAliases();

		for(let i = 0; i < aliases.length; i++)
			outputText += "\n " + struct.getPre() + aliases[i];

		UTILS.msg(output, outputText);
		obj.embed(output);
		overwrite();
	};
};
