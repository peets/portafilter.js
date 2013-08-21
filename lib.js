var tree = require("./tree.js");
module.exports = {
	"+": new tree.Func("+", ["a", "b"], function(args) { return args[0] + args[1]; }),
	"-": new tree.Func("-", ["a", "b"], function(args) { return args[0] - args[1]; }),
	"*": new tree.Func("*", ["a", "b"], function(args) { return args[0] * args[1]; }),
	"/": new tree.Func("/", ["a", "b"], function(args) { return args[0] / args[1]; }),
	"%": new tree.Func("%", ["a", "b"], function(args) { return args[0] % args[1]; })
};
