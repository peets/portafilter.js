var util = require("util");
var tree = require("./tree.js");

var t_eq = function(args) {
	// we're assuming both operands have the same type
	if(args[0] instanceof Array) {
		if(args[0].length != args[1].length) {
			return false;
		}
		for(var i = 0; i < args[0].length; i++) {
			if(typeStr(args[0][i]) !== typeStr(args[1][i])) {
				return false;
			}
			if(!t_eq([args[0][i], args[1][i]])) {
				return false;
			}
		}
	} else if(args[0] === null || typeof args[0] === "string" || typeof args[0] === "number" || typeof args[0] === "boolean") {
		return args[0] === args[1];
	} else if(args[0] instanceof tree.Func) {
		if(!args[0].body.eq(args[1].body)) {
			return false;
		}
		if(args[0].args.length != args[1].args.length) {
			return false;
		}
		for(var i = 0; i < args[0].args.length; i++) {
			if(args[0].args[i] !== args[1].args[i]) {
				return false;
			}
		}
	} else if(typeof args[0] === "object") {
		for(var k in args[0]) {
			if(args[0].hasOwnProperty(k)) {
				if(args[1].hasOwnProperty(k)) {
					if(typeStr(args[0][k]) !== typeStr(args[1][k])) {
						return false;
					}
					if(!t_eq([args[0][k], args[1][k]])) {
						return false;
					}
				} else {
					return false;
				}
			}
		}
		for(k in args[1]) {
			if(args[1].hasOwnProperty(k)) {
				if(!args[0].hasOwnProperty(k)) {
					return false;
				}
			}
		}
	} else {
		throw new Error(util.format("E036 BUG: passed un-typeable object %j to t_eq()", args[0]));
	}
	return true;
};

var typeStr = function(v) {
	if(v instanceof Array) {
		return "array";
	}
	if(v === null) {
		return "null";
	}
	return typeof v;
};

var sameType = function(a, b) {
	return (a instanceof Array && b instanceof Array) || (a instanceof tree.Func && b instanceof tree.Func) || (a === null && b === null) || typeof a === typeof b;
};

var typeErrorFormat = "%s can't apply operator %s to operands of type %s and %s.";
module.exports = {
	"+": new tree.Func("+",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || (t !== "number" && t !== "string" && t !== "array")) {
			throw new Error(util.format(typeErrorFormat, "E037", "+", t, typeStr(args[1])));
		}
		return args[0] + args[1];
	}),
	"-": new tree.Func("-",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || t !== "number") {
			throw new Error(util.format(typeErrorFormat, "E038", "-", t, typeStr(args[1])));
		}
		return args[0] - args[1];
	}),
	"*": new tree.Func("*",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || t !== "number") {
			throw new Error(util.format(typeErrorFormat, "E039", "*", t, typeStr(args[1])));
		}
		return args[0] * args[1];
	}),
	"/": new tree.Func("/",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || t !== "number") {
			throw new Error(util.format(typeErrorFormat, "E040", "/", t, typeStr(args[1])));
		}
		return args[0] / args[1];
	}),
	"%": new tree.Func("%",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || t !== "number") {
			throw new Error(util.format(typeErrorFormat, "E041", "%", t, typeStr(args[1])));
		}
		return args[0] % args[1];
	}),


	"==": new tree.Func("==", ["a", "b"], function(args) {
		if(!sameType(args[0], args[1])) {
			throw new Error(util.format(typeErrorFormat, "E042", "==", typeStr(args[0]), typeStr(args[1])));
		}
		return t_eq(args);
	}),
	"!=": new tree.Func("!=", ["a", "b"], function(args) {
		if(!sameType(args[0], args[1])) {
			throw new Error(util.format(typeErrorFormat, "E043", "!=", typeStr(args[0]), typeStr(args[1])));
		}
		return !t_eq(args);
	}),
	">": new tree.Func(">",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || (t !== "number" && t !== "string")) {
			throw new Error(util.format(typeErrorFormat, "E044", ">", typeStr(args[0]), typeStr(args[1])));
		}
		return args[0] > args[1];
	}),
	">=": new tree.Func(">=",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || (t !== "number" && t !== "string")) {
			throw new Error(util.format(typeErrorFormat, "E045", ">=", typeStr(args[0]), typeStr(args[1])));
		}
		return args[0] >= args[1];
	}),
	"<": new tree.Func("<",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || (t !== "number" && t !== "string")) {
			throw new Error(util.format(typeErrorFormat, "E046", "<", typeStr(args[0]), typeStr(args[1])));
		}
		return args[0] < args[1];
	}),
	"<=": new tree.Func("<=",  ["a", "b"], function(args) {
		var t = typeStr(args[0]);
		if(t !== typeStr(args[1]) || (t !== "number" && t !== "string")) {
			throw new Error(util.format(typeErrorFormat, "E047", "<=", typeStr(args[0]), typeStr(args[1])));
		}
		return args[0] <= args[1];
	}),


	"!": new tree.Func("!", ["a"], function(args) {
		if(typeof args[0] !== "boolean") {
			throw new Error("E048 can't apply operator ! to operand of type " + typeStr(args[0]) + ". It can only be applied to booleans.");
		}
		return !args[0];
	}),
	"||": new tree.Func("||", ["a", "b"], function(args) {
		if(typeof args[0] !== "boolean" || typeof args[1] !== "boolean") {
			throw new Error(util.format(typeErrorFormat, "E049", "||", typeStr(args[0]), typeStr(args[1])) + ". It can only be applied to booleans.");
		}
		return args[0] || args[1];
	}),
	"&&": new tree.Func("&&", ["a", "b"], function(args) {
		if(typeof args[0] !== "boolean" || typeof args[1] !== "boolean") {
			throw new Error(util.format(typeErrorFormat, "E050", "&&", typeStr(args[0]), typeStr(args[1])) + ". It can only be applied to booleans.");
		}
		return args[0] && args[1];
	}),


	"?": new tree.Func("?", ["a", "b", "c"], function(args) {
		if(typeof args[0] !== "boolean") {
			throw new Error("E051 can't apply operator ? to operand of type " + typeStr(args[0]) + ". The condition must be a boolean.");
		}
		return args[0] ? args[1] : args[2];
	})
};
