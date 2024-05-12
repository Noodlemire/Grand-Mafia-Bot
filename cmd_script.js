const SCRIPTDIR = "scripts";
const SCRIPTDATA = {};

function commaCheck(UTILS, t, s)
{
	if(t)
		return UTILS.containsString(UTILS.split(t, ','), s);
	else
		return false;
}

module.exports = (g) =>
{
	const {PRE, CUSTOMDIR, UTILS, commands, add_scmd, overwrite, process, subprocess, locals, bodyinfo, SERVER_DATA, path, fs, fetch, ELEVATED, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle} = g;
	let i = 0;

	function firstname(p)
	{
		let name;

		if(typeof p === "string")
			name = p;
		else
			name = p.dispname || p.nicknames[0] || "unknown (bug)";

		return UTILS.titleCase(name)
	}
	
	function register_scmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}
	
		add_scmd(name, {
			id: "scr" + i,
			cat: "Script",
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

	register_scmd(["variable", "var", "v"], "<Name> [Value]", "Var", "Set/check a temporary local variable.",
	{
		minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the variable that will be checked or changed.")},
			{datatype: "String", oname: "value", func: (str) => str.setDescription("Omit to view variable's current value | Provide to set new value | Use `-` to delete it")}
		]
	},
	(chn, source, e, args) =>
	{
		let pid = source.member.id;
		let key = args[0];
		let value = args[1] || "";
		let loc = source.locals || (locals[pid] = locals[pid] || {});

		if(UTILS.containsString(key, "{") || UTILS.containsString(key, "}") || UTILS.isNum(key) || key === '#')
			throw "-Invalid variable name: " + key;

		for(let n = 2; n < args.length; n++)
			value = value + " " + args[n];

		if(value === "-")
		{
			delete loc[key];
			UTILS.msg(source, "Variable \"" + key + "\" deleted.");
		}
		else if(value !== "")
		{
			loc[key] = value;

			if(source.deferred || source.reply || source.send)
				UTILS.msg(source, "Variable \"" + key + "\" set to \"" + value + "\".");
			else
				UTILS.msg(source, value);
		}
		else if(loc[key])
			UTILS.msg(source, loc[key]);
		else if(source.deferred || source.reply || source.send)
			UTILS.msg(source, "Local \"" + key + "\" does not exist.");
	});

	register_scmd(["global", "g"], "<Name> [Value]", "Global", "Set/check a global variable. Will become permanent after the next overwrite.",
	{
		minArgs: 1, adminOnly: true, slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the variable that will be checked or changed.")},
			{datatype: "String", oname: "value", func: (str) => str.setDescription("Omit to view variable's current value | Provide to set new value | Use `-` to delete it")}
		]
	},
	(chn, source, e, args) =>
	{
		SERVER_DATA[source.guild.id].globals = SERVER_DATA[source.guild.id].globals || {};
		let globals = SERVER_DATA[source.guild.id].globals;
		let key = args[0];
		let value = args[1] || "";

		if(UTILS.containsString(key, "{") || UTILS.containsString(key, "}") || UTILS.isNum(key) || key === '#')
			throw "-Invalid variable name: " + key;

		for(let n = 2; n < args.length; n++)
			value = value + " " + args[n];

		if(value === "-")
		{
			delete globals[key];
			UTILS.msg(source, "Global \"" + key + "\" deleted.");
			overwrite(source);
		}
		else if(value !== "")
		{
			globals[key] = value;

			if(source.deferred || source.reply || source.send)
				UTILS.msg(source, "Global \"" + key + "\" set to \"" + value + "\".");
			else
				UTILS.msg(source, value);

			overwrite(source);
		}
		else if(globals[key])
			UTILS.msg(source, globals[key]);
		else if(source.deferred || source.reply || source.send)
			UTILS.msg(source, "Global \"" + key + "\" does not exist.");

	});

	register_scmd("exists", "<Name>", "Exists", "Check if a variable name exists in local or (only visible to Elevated users) global form.",
	{
		minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the variable that will be checked.")},
		]
	},
	(chn, source, e, args) =>
	{
		SERVER_DATA[source.guild.id].globals = SERVER_DATA[source.guild.id].globals || {};
		let globals = SERVER_DATA[source.guild.id].globals;
		let pid = source.member.id;
		let key = args[0];
		let loc = source.locals || (locals[pid] = locals[pid] || {});

		if(UTILS.containsString(key, "{") || UTILS.containsString(key, "}"))
		{
			UTILS.msg(source, "-Invalid variable name: " + key);
			return;
		}

		if(loc[key] || (source.member.permissions.has(ELEVATED) && globals[key]))
			UTILS.msg(source, "True");
		else
			UTILS.msg(source, "False");
	});

	let maths = ["Addition", "Subtraction", "Multiplication", "Division"];
	for(let i in maths)
	{
		let m = maths[i];
		let aliases = [m.substring(0, 3).toLowerCase(), m.toLowerCase()];

		if(m === "Multiplication")
			aliases[0] = "mult";

		register_scmd(aliases, "<Value 1> <Value 2> [Value N...]", m, "Perform " + aliases[1] + " on two or more numbers.",
		{
			minArgs: 2, slashOpts:
			[
				{datatype: "Number", oname: "value1", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value2", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value3", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value4", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value5", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value6", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value7", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value8", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value9", func: (str) => str.setDescription("Number")},
				{datatype: "Number", oname: "value10", func: (str) => str.setDescription("Number")},
			]
		},
		(chn, source, e, args) =>
		{
			let num = 0;

			for(let i = 0; i < args.length; i++)
			{
				if(!args[i]) continue;

				if(!UTILS.isNum(args[i]))
					throw "-Value '" + args[i] + "' is not a number!";

				let n = parseFloat(args[i]);

				if(i === 0)
				{
					num = n;
					continue;
				}

				switch(m)
				{
					case "Addition":
						num += n;
						break;
					case "Subtraction":
						num -= n;
						break;
					case "Multiplication":
						num *= n;
						break;
					case "Division":
						if(n === 0)
							throw "Cannot divide by zero!";

						num /= n;
						break;
				}
			}

			UTILS.msg(source, String(num));
		});
	}

	let choices = ["=", "!=", "<", "<=", ">", ">="];
	let andor = ["and", "or"];

	let ifcond = [{datatype: "String", oname: "value1a", func: (str) => str.setDescription("Any kind of value to compare.")},
		{datatype: "String", oname: "operator1", func: (str) => str.setDescription("How shall values A and B be compared? (`=`/`!=`/`<`/`<=`/`>`/`>=`)")},
		{datatype: "String", oname: "value1b", func: (str) => str.setDescription("Any kind of value to compare.")},
		{datatype: "String", oname: "and_or", func: (str) => str.setDescription("With 2 conditions: Does both need to be true, or only one? (`and`/`or`)")},
		{datatype: "String", oname: "value2a", func: (str) => str.setDescription("Any kind of value to compare.")},
		{datatype: "String", oname: "operator2", func: (str) => str.setDescription("How shall values A and B be compared?")},
		{datatype: "String", oname: "value2b", func: (str) => str.setDescription("Any kind of value to compare.")}];

	let forcond = [{datatype: "String", oname: "var", func: (str) => str.setDescription("Name of the local variable to use as the iterator.")},
		{datatype: "Number", oname: "start", func: (str) => str.setDescription("What number should the var start at?")},
		{datatype: "Number", oname: "end", func: (str) => str.setDescription("What number should the var end at?")},
		{datatype: "Number", oname: "increment", func: (str) => str.setDescription("How much should be the var be increased/decreased by with each loop?")}];

	let foreachcond = [{datatype: "String", oname: "key", func: (str) => str.setDescription("Name of the local variable used to store the key of each array element.")},
		{datatype: "String", oname: "val", func: (str) => str.setDescription("Name of the local variable used to store each array element.")},
		{datatype: "String", oname: "array", func: (str) => str.setDescription("The array to iterate through, doing something to each individual element contained within.")}];

	let bodies = {
		if: ifcond,
		else: ifcond,
		while: ifcond,
		for: forcond,
		foreach: foreachcond
	};

	for(let b in bodies)
	{
		let params;

		switch(b)
		{
			case "else":
				params = "[Value 1A] [Operator] [Value 1B] [And/Or]...";
				break;

			case "for":
				params = "<Var> <Start> <End> [Increment]";
				break;

			case "foreach":
				params = "<Key> <Var> <Line-Separated Array...>";
				break;

			default:
				params = "<Value 1A> <Operator> <Value 1B> [And/Or]..."
				break;
		}

		register_scmd(b.toLowerCase(), params, UTILS.titleCase(b),
				"Start a" + (b === "if" || b === "else" ? "n " + b + " condition." : " " + b + " loop."),
		{
			minArgs: (b === "else" ? 0 : 3), runInBodyMode: true, rawArgs: true, slashOpts: bodies[b]
		},
		(chn, source, e, args) =>
		{
			let conds = [];
			let pid = source.member.id;
			let loc = source.locals || (locals[pid] = locals[pid] || {});
			let iter, inc, incStr, init, arr, arrStr, elem;

			if(b === "for" || b === "foreach")
			{
				for(let i = 0; i <= (b === "foreach" ? 1 : 0); i++)
				{
					if(UTILS.isNum(args[i]))
						throw "Var name '" + args[i] + "' should not be a number!";
					if(args[0].indexOf("{") >= 0 || args[0].indexOf("}") >= 0)
						throw "Var name '" + args[i] + "' should not contain any curly braces!";
				}

				inc = 1;

				if(b === "for")
				{
					for(let i = 1; i <= 2; i++)
						if(!UTILS.isVar(args[i]) && !UTILS.isNum(args[i]))
							throw "Value '" + args[i] + "' is not a number!";

					if(args[3])
					{
						inc = subprocess(source, args[3], 0, true);

						if(!UTILS.isNum(inc))
							throw "Value '" + inc + "' is not a number!";

						inc = parseFloat(inc);

						if(!UTILS.isNum(args[3]))
							incStr = args[3];
					}

					init = args[1];
				}
				else
				{
					arrStr = args[2];

					for(let i = 3; i < args.length; i++)
						arrStr += '\n' + args[i];

					arr = UTILS.split(subprocess(source, arrStr, 0, true), '\n');

					init = 1;
					elem = args[1];
					loc[elem] = arr[init-1];
				}

				iter = args[0];
				conds[0] = {a: "{" + iter + "}", o: (inc > 0 || typeof inc === "string" ? "<=" : ">="), b: (b === "foreach" ? arr.length : args[2])};
				loc[iter] = init;
			}
			else
			{
				for(let i = 0; i < args.length; i += 4)
				{
					if(args[i] === undefined || args[i+1] === undefined || args[i+2] === undefined || (i+4 < args.length && args[i+3] === undefined))
					{
						UTILS.msg(source, "-USAGE: " + params);
						return;
					}
					if(!UTILS.isVar(args[i+1]) && !UTILS.isOneOf(args[i+1], ...choices))
						throw "Operator '" + args[i+1] + "' must be one of: " + choices;
					if(!UTILS.isVar(args[i+3]) && args[i+3] && !UTILS.isOneOf(args[i+3].toLowerCase(), ...andor))
						throw "Parameter '" + args[i+3] + "' must be one of: " + andor;

					conds[conds.length] = {
						a: args[i],
						o: args[i+1],
						b: args[i+2],
					};

					if(args[i+3])
						conds[conds.length-1].z = args[i+3].toLowerCase();
				}
			}

			let body = {
				type: b,
				conds,
				commands: []
			};

			if(body.type === "for" || body.type === "foreach")
			{
				body.iter = iter;
				body.inc = inc;
				body.incStr = incStr;
				body.init = init;

				if(body.type === "foreach")
				{
					body.elem = elem;
					body.arr = arr;
					body.arrStr = arrStr;
				}
			}

			let activeBody = UTILS.getActiveBody(bodyinfo[pid]);

			if(activeBody)
			{
				if(b === "else")
				{
					if(activeBody.type !== "if" && activeBody.type !== "else")
						throw "You may only attach an Else Body to an If or Else If Body.";

					if(activeBody.type === "else" && activeBody.conds.length === 0)
						throw "You may not attach an Else Body to a conditionless Else Body. It would never activate.";

					activeBody.ended = true;

					let nextBody = UTILS.getActiveBody(bodyinfo[pid]);

					if(nextBody)
						nextBody.commands[nextBody.commands.length] = body;
					else
						bodyinfo[pid][bodyinfo[pid].length] = body;
				}
				else
					activeBody.commands[activeBody.commands.length] = body;
			}
			else
			{
				if(b === "else")
					throw "Cannot add an Else Body when there is no active If/Else Body to attach it to.";

				bodyinfo[pid] = [body];
			}

			UTILS.msg(source, "+You are now in Body Mode. Until you use " + PRE + "end, all " + PRE + " commands you type will be stored for future processing.");
		});
	}

	function endCheck(body, cb)
	{
		for(let c in body.commands)
		{
			if(typeof body.commands[c] === "object")
			{
				if(!endCheck(body.commands[c], cb))
					return false;
			}
		}

		if(body.ended)
			return true;
		else
		{
			if(cb) cb(body);
			return false;
		}
	}

	function condition(source, a, o, b)
	{
		a = subprocess(source, a);
		o = subprocess(source, o);
		b = subprocess(source, b);

		if(UTILS.isNum(a))
			a = parseFloat(a);
		if(UTILS.isNum(b))
			b = parseFloat(b);
		if(!UTILS.isOneOf(o, ...choices))
			throw "Operator '" + o + "' must be one of: " + choices;

		switch(o)
		{
			case "=":
				return a === b;
			case "!=":
				return a !== b;
			case ">":
				return a > b;
			case ">=":
				return a >= b;
			case "<":
				return a < b;
			case "<=":
				return a <= b;
		}
	}

	function bodyProcess(source, bodyinfo, bodyindex, limit)
	{
		bodyindex = bodyindex || 0;
		let body = bodyinfo[bodyindex];
		let conds = body.conds;
		let cond = true;
		limit = limit || 0;
		let loc = source.locals || locals[source.member.id];

		if(limit > 1000)
			return;

		for(let i = 0; i < conds.length; i++)
		{
			if(conds[i-1] && conds[i-1].z)
			{
				let z = subprocess(source, conds[i-1].z).toLowerCase();

				if(!UTILS.isOneOf(z, ...andor))
					throw "Cannot connect two conditions by anything other than `and`/`or`. Attempted to use: " + z;
				else if(z === "and" && cond)
					cond = cond && condition(source, conds[i].a, conds[i].o, conds[i].b);
				else if(z === "or")
					cond = cond || condition(source, conds[i].a, conds[i].o, conds[i].b);
			}
			else
				cond = condition(source, conds[i].a, conds[i].o, conds[i].b);
		}

		if(cond)
		{
			for(let i = 0; i < body.commands.length; i++)
			{
				let cmd = body.commands[i];

				if(typeof cmd === "object")
				{
					if(cmd.type === "else") continue;

					if(cmd.type === "for" || cmd.type === "foreach")
					{
						let init = subprocess(source, cmd.init);

						if(!UTILS.isNum(init))
							throw "Starting value of a For Loop must be a Number. Recieved: " + init;

						loc[cmd.iter] = init;

						if(cmd.type === "foreach")
						{
							cmd.arr = UTILS.split(subprocess(source, cmd.arrStr), '\n');
							loc[cmd.elem] = cmd.arr[init-1];
						}

						if(cmd.incStr)
						{
							cmd.inc = subprocess(source, cmd.incStr);

							if(!UTILS.isInt(cmd.inc))
								throw "For loop's variable increment is not a number!";

							cmd.inc = parseFloat(cmd.inc);
							cmd.conds[0] = cmd.inc > 0 ? "<=" : ">=";
						}
					}

					bodyProcess(source, body.commands, i, limit+1);
				}
				else
					process({
						content: cmd,
						member: source.member,
						guild: source.guild,
						channel: source.channel,
						locals: source.locals,
						print: source.print
					});
			}

			if(body.type === "while")
				bodyProcess(source, bodyinfo, bodyindex, limit+1);
			else if(body.type === "for" || body.type === "foreach")
			{
				if(typeof loc[body.iter] === "string")
					loc[body.iter] = parseFloat(loc[body.iter]);

				loc[body.iter] += body.inc;

				if(body.type === "foreach")
					loc[body.elem] = body.arr[loc[body.iter]-1];

				bodyProcess(source, bodyinfo, bodyindex, limit+1);
			}
		}
		else if(body.type === "if" || body.type === "else")
		{
			let nextBody = bodyinfo[bodyindex+1];

			if(typeof nextBody === "object" && nextBody.type === "else")
				bodyProcess(source, bodyinfo, bodyindex+1, limit+1)
		}
	}

	register_scmd("end", "", "End Current Body", "End the current body that you're typing commands for.", {runInBodyMode: true}, (chn, source, e, args) =>
	{
		let pid = source.member.id;
		if(!source.locals)
			locals[pid] = locals[pid] || {};

		if(!bodyinfo[pid])
		{
			UTILS.msg(source, "-There is nothing to end.");
			return;
		}

		let activeBody = UTILS.getActiveBody(bodyinfo[pid]);
		activeBody.ended = true;

		let nextBody = UTILS.getActiveBody(bodyinfo[pid]);

		if(nextBody)
			UTILS.msg(source, "+Ended nested " + activeBody.type + ".");
		else
		{
			let nonScript = source.deferred || source.reply || source.send;

			if(nonScript)
				UTILS.printReturn();

			bodyProcess(source, bodyinfo[pid]);

			if(nonScript)
			{
				let result = UTILS.printReturn();
				UTILS.msg(source, result === "" ? "+Complete." : result);
			}

			delete bodyinfo[pid];
		}
	});

	function set_script(source, title, userexec, script)
	{
		let serverid = source.guild.id;
		let lines = UTILS.split(script, '\n');

		if(lines.length === 0) throw "Empty script!";
		if(lines[0].trim().substring(0, PRE.length) !== PRE) throw "Invalid command: " + lines[0];

		for(let i = lines.length-1; i >= 1; i--)
		{
			lines[i] = lines[i].trim();

			if(lines[i].substring(0, PRE.length) !== PRE)
			{
				lines[i-1] += "\n" + lines[i];
				lines.splice(i, 1);
			}
		}

		for(let i = 0; i < lines.length; i++)
		{
			let args = UTILS.split(lines[i].substring(PRE.length), ' ');
			let cmd = (args[0] || "").toLowerCase();
			args = args.splice(1);

			UTILS.arrayByBraces(args);

			if(!commands[cmd]) throw "Unknown command: " + PRE + cmd;
			if(commands[cmd].meta.minArgs && args.length < commands[cmd].meta.minArgs)
				throw "USAGE: " + PRE + cmd + " " + commands[cmd].param;
		}

		let file = path.join(SCRIPTDIR, serverid, title + ".json");
		UTILS.verifyDir(SCRIPTDIR, serverid);
		fs.writeFileSync(file, JSON.stringify({userexec, lines}));

		UTILS.msg(source, "+No errors detected! Wrote to " + file);
	}

	register_scmd(["set_script", "setscript", "add_script", "addscript", "script"], "<name> <allow_user_execution?> [script]", "Set Script", "Create or replace a script, a list of commands that you can call upon with the " + PRE + "execute command.\n\nA Script may be provided as raw text, or using an attachment.\n\n/set_script also lets you submit text through a Modal, with a 4000 character limit, rather than the 2000 limit of a standard message.\n\nFor longer scripts, attaching a text file will be your only option. They don't have a strict character limit, but rather a 25MB size limit, which is much more generous.", {adminOnly: true, minArgs: 2, rawArgs: true, noDefer: true, shortDesc: "Create or replace a script, a list of commands that you can call upon with the /execute command.", slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the script to create/replace. (Only allows alphanumeric characters, `-`, and `_`)")},
			{datatype: "Boolean", oname: "allow_user_execution", func: (str) => str.setDescription("If true, allow regular users to execute this script.")},
			{datatype: "Attachment", oname: "script", func: (str) => str.setDescription("A text file containing the script to add.")}
		]
	},
	(chn, source, e, args) =>
	{
		let data = SERVER_DATA[source.guild.id];
		let title = UTILS.toArgName(args[0], true);

		if(data.inherit)
			throw "You cannot edit Structures or Objects while inheritance is enabled.";
		if(title.length === 0)
			throw "Invalid script name!";
		if(!source.deferred && !source.reply && !source.send)
			throw "You may not create or edit a script within a script or subcommand!";

		let splits = UTILS.split(args[1], '\n');
		let userexec = UTILS.bool(splits[0], false);

		let script = source.attachments && source.attachments.first() || args[2];
		let ext = "";

		if(typeof script !== "object" && splits.length > 1)
			for(let i = 1; i < splits.length; i++)
				ext += (i === 1 ? "" : '\n') + splits[i];

		if(ext.length > 0)
			script = ext + ' ' + script;

		if(typeof script === "object")
		{
			fetch(script.url).catch((e) => UTILS.error(source, e)).then((response) =>
			{
				if(response.ok)
					response.text().catch((e) => UTILS.error(source, e)).then((text) => set_script(source, title, userexec, text)).catch((e) => UTILS.error(source, e));
				else
					throw response.statusText;
			});
		}
		else if(args[2])
		{
			for(let i = 3; i < args.length; i++)
				script += " " + args[i];

			set_script(source, title, userexec, script);
		}
		else if(source.showModal)
		{
			let modal = new ModalBuilder().setCustomId("script:input").setTitle("Input Script").setComponents([
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "script:inputTI",
					label: "Input script here.",
					style: TextInputStyle.Paragraph
				})]})
			]);

			SCRIPTDATA[source.member.id] = {title, userexec};
			source.showModal(modal).catch((e) => UTILS.error(source, e));
		}
		else
			throw "No script provided.";
	});

	UTILS.registerInteraction("script:input", (interaction) =>
	{
		interaction.deferReply().then(() =>
		{
			let script = interaction.fields.getTextInputValue("script:inputTI");
			let {title, userexec} = SCRIPTDATA[interaction.member.id];

			delete SCRIPTDATA[interaction.member.id];

			set_script(interaction, title, userexec, script);
		}).catch(console.error);

		return true;
	});

	register_scmd(["execute", "exec", "e"], "<script> [args...]", "Execute Script", "Run a script.", {minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the script to create/replace. (Only allows alphanumeric characters, `-`, and `_`)")},
			{datatype: "String", oname: "parameter_1", func: (str) => str.setDescription("Set value of {1} if the script uses it.")},
			{datatype: "String", oname: "parameter_2", func: (str) => str.setDescription("Set value of {2} if the script uses it.")},
			{datatype: "String", oname: "parameter_3", func: (str) => str.setDescription("Set value of {3} if the script uses it.")},
			{datatype: "String", oname: "parameter_4", func: (str) => str.setDescription("Set value of {4} if the script uses it.")},
			{datatype: "String", oname: "parameter_5", func: (str) => str.setDescription("Set value of {5} if the script uses it.")},
			{datatype: "String", oname: "parameter_6", func: (str) => str.setDescription("Set value of {6} if the script uses it.")},
			{datatype: "String", oname: "parameter_7", func: (str) => str.setDescription("Set value of {7} if the script uses it.")},
			{datatype: "String", oname: "parameter_8", func: (str) => str.setDescription("Set value of {8} if the script uses it.")},
			{datatype: "String", oname: "parameter_9", func: (str) => str.setDescription("Set value of {9} if the script uses it.")}
		]
	},
	(chn, source, e, args) =>
	{
		let serverid = source.guild.id;
		let data = SERVER_DATA[serverid];
		let title = UTILS.toArgName(args[0], true);
		let pid = source.member.id;
		let scriptLocals = {};

		if(data.inherit)
			throw "For now, you cannot run scripts while inheritance is enabled.";
		if(title.length === 0)
			throw "Invalid script name!";

		let file = path.join(SCRIPTDIR, serverid, title + ".json");

		if(!fs.existsSync(file)) throw "Unknown script: " + title;

		let script = JSON.parse(fs.readFileSync(file, "utf8"));

		if(!script.userexec && !source.member.permissions.has(ELEVATED)) throw "You do not have permission to execute this script!";

		for(let i = 1; i < args.length; i++)
			scriptLocals[String(i)] = args[i];

		scriptLocals['#'] = args.length - 1;

		let subSource = {
			member: source.member,
			guild: source.guild,
			channel: source.channel,
			locals: scriptLocals,
			print: {txt: "", diff: false}
		};

		for(let i = 0; i < script.lines.length; i++)
		{
			subSource.content = script.lines[i];
			process(subSource);
		}

		if(subSource.print.diff)
			subSource.print.txt += "\n```";

		UTILS.msg(source, subSource.print.txt.length === 0 ? "+Complete." : subSource.print.txt, true);
	});

	register_scmd(["view_script", "viewscript", "vs"], "<script>", "View Script", "View the contents of a script.", {minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "name", func: (str) => str.setDescription("Name of the script to create/replace. (Only allows alphanumeric characters, `-`, and `_`)")}
		]
	},
	(chn, source, e, args) =>
	{
		let serverid = source.guild.id;
		let data = SERVER_DATA[serverid];
		let title = UTILS.toArgName(args[0], true);

		if(data.inherit) throw "For now, scripts are unavailable while inheritance is enabled.";
		if(title.length === 0) throw "Invalid script name!";

		let file = path.join(SCRIPTDIR, serverid, title + ".json");

		if(!fs.existsSync(file)) throw "Unknown script: " + title;

		let script = JSON.parse(fs.readFileSync(file, "utf8"));

		if(!script.userexec && !source.member.permissions.has(ELEVATED)) throw "You do not have permission to execute this script!";

		let output = "";
		let tablevel = 0;

		for(let i = 0; i < script.lines.length; i++)
		{
			let cmd = UTILS.split(script.lines[i], ' ')[0].substring(1);

			if(UTILS.isOneOf(cmd, "end", "else"))
				tablevel--;

			output += '\n' + UTILS.tabLevel(tablevel) + script.lines[i];

			if(UTILS.isOneOf(cmd, "if", "else", "while", "for", "foreach"))
				tablevel++;
		}

		UTILS.msg(source, "```" + output + "```", true);
	});
};
