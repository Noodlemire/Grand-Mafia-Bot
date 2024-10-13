module.exports = (g) =>
{
	const {PRE, UTILS, add_scmd, aliases} = g;
	let i = 0;
	
	function register_scmd(name, param, title, desc, meta, func)
	{
		if(!func)
		{
			func = meta;
			meta = {};
		}

		add_scmd(name, {
			id: "r" + i,
			cat: "RNG",
			title,
			desc,
			param,
			meta,
			func
		});

		i = i + 1;
	}

	register_scmd(["random_number", "randomnumber", "rnum", "r"], "<number> | <min> <max>", "Random", "Generate a random number between [1, <number] or between [<min>, <max>].", {minArgs: 1, slashOpts:
		[
			{datatype: "Integer", oname: "min", func: (str) => str.setDescription("Minimum possible number, if max is included. If max is excluded, this is the max instead.")},
			{datatype: "Integer", oname: "max", func: (str) => str.setDescription("Maximum possible number")},
		]
	},
	(chn, source, e, args) =>
	{
		if(!UTILS.isInt(args[0]) || (args[1] && !UTILS.isInt(args[1])))
			throw "This function cannot accept non-integer values.";

		let min = Number(args[0]);
		let max = Number(args[1]);

		if(!args[1])
		{
			max = min;
			min = 1;
		}

		UTILS.msg(source, UTILS.randInt(min, max));
	});

	register_scmd(["random_list", "randomlist", "rlist", "rl"], "<number>", "Random List", "Generate a randomly ordered list of numbers between 1 and <number>.", {minArgs: 1, slashOpts:
		[
			{datatype: "Integer", oname: "number", func: (str) => str.setDescription("Number of slots in the randomly generated list.").setMinValue(1).setMaxValue(100)},
		]
	},
	(chn, source, e, args) =>
	{
		if(!UTILS.isInt(args[0])) throw "This function cannot accept non-integer values.";

		let n = Number(args[0]);

		if(n <= 0) throw "'<number>' in '" + PRE + "rlist' must be greater than 0";
		if(n > 100) throw "'<number>' in '" + PRE + "rlist' cannot exceed 100";

		let list = [1];

		for(let i = 1; i < n; i++)
		{
			let ind = Math.floor(Math.random() * (i + 1));
			list.splice(ind, 0, i + 1);
		}

		let out = "";

		for(let i = 0; i < n; i++)
			out += list[i] + "\n";

		if(out === "")
			throw "'<number>' in '" + PRE + "rlist' must be a number.";
		else
			UTILS.msg(source, out);
	});
	
	register_scmd(["random_choice", "randomchoice", "rchoice", "choice", "rc"], "<option 1> [option 2] [option N]...", "Random Choice", "Randomly choose an option. The Slash Command is limited to 10 options, but prefix form is unlimited.", {minArgs: 1, slashOpts:
		[
			{datatype: "String", oname: "option1", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option2", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option3", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option4", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option5", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option6", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option7", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option8", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option9", func: (str) => str.setDescription("An option.")},
			{datatype: "String", oname: "option10", func: (str) => str.setDescription("An option.")},
		]
	},
	(chn, source, e, args) =>
	{
		UTILS.msg(source, args[UTILS.randInt(args.length)]);
	});
	
	register_scmd(["random_hex", "randomhex", "rhex", "hex", "rh"], "", "Random Hex", "Generate and view a random color made of 6 hexadecimal characters.", (chn, source, e, args) =>
	{
		let color = UTILS.rHex(6);
		e.setAuthor({name: "#" + color});
		e.setColor(color);

		UTILS.embed(source, e);
	});
	
	register_scmd(["random_coin", "randomcoin", "rcoin", "coin", "flip", "coinflip"], "", "Random Coin", "Generate Heads or Tails", (chn, source, e, args) =>
	{
		UTILS.msg(source, UTILS.randInt(2) === 0 ? "Heads" : "Tails");
	});
};
