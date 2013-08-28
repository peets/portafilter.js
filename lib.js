// jshint evil: true
var util = require("util");
var tree = require("./tree.js");
var e = require("./eval.js");

var t_eq = function(a, b) {
	// we're assuming both operands have the same type
	if(a instanceof Array) {
		if(a.length != b.length) {
			return false;
		}
		for(var i = 0; i < a.length; i++) {
			if(typeStr(a[i]) !== typeStr(b[i])) {
				return false;
			}
			if(!t_eq(a[i], b[i])) {
				return false;
			}
		}
	} else if(a === null || typeof a !== "object") {
		return a === b;
	} else if(typeof a === "object") {
		for(var k in a) {
			if(a.hasOwnProperty(k)) {
				if(b.hasOwnProperty(k)) {
					if(typeStr(a[k]) !== typeStr(b[k])) {
						return false;
					}
					if(!t_eq(a[k], b[k])) {
						return false;
					}
				} else {
					return false;
				}
			}
		}
		for(k in b) {
			if(b.hasOwnProperty(k)) {
				if(!a.hasOwnProperty(k)) {
					return false;
				}
			}
		}
	} else {
		throw new Error(util.format("E036 BUG: passed un-typeable object %j to t_eq()", a));
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
	return (a instanceof Array && b instanceof Array) || (a === null && b === null) || typeof a === typeof b;
};

var typeErrorFormat = "%s can't apply operator %s to operands of type %s and %s.";

module.exports = {
	"value": {},
	"eval": function(node) {
	var f = function() {
		return this.eval(arguments.callee.body);
	};
	f.args = [];
	f.body = node;
	f.body.parent = this;
	return f.call(new e.Context(f, []));
	}
};

var f = function(name, args, func) {
	func.args = args;
	module.exports.value[name] = new tree.Node(name, func);
};

f("+", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || (t !== "number" && t !== "string" && t !== "array")) {
		throw new Error(util.format(typeErrorFormat, "E037", "+", t, typeStr(b)));
	}
	return a + b;
});
f("-", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || t !== "number") {
		throw new Error(util.format(typeErrorFormat, "E038", "-", t, typeStr(b)));
	}
	return a - b;
});
f("*", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || t !== "number") {
		throw new Error(util.format(typeErrorFormat, "E039", "*", t, typeStr(b)));
	}
	return a * b;
});
f("/", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || t !== "number") {
		throw new Error(util.format(typeErrorFormat, "E040", "/", t, typeStr(b)));
	}
	return a / b;
});
f("%", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || t !== "number") {
		throw new Error(util.format(typeErrorFormat, "E041", "%", t, typeStr(b)));
	}
	return a % b;
});


f("==", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	if(!sameType(a, b)) {
		throw new Error(util.format(typeErrorFormat, "E042", "==", typeStr(a), typeStr(b)));
	}
	return t_eq(a, b);
});
f("!=", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	if(!sameType(a, b)) {
		throw new Error(util.format(typeErrorFormat, "E043", "!=", typeStr(a), typeStr(b)));
	}
	return !t_eq(a, b);
});
f(">", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || (t !== "number" && t !== "string")) {
		throw new Error(util.format(typeErrorFormat, "E044", ">", typeStr(a), typeStr(b)));
	}
	return a > b;
});
f(">=", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || (t !== "number" && t !== "string")) {
		throw new Error(util.format(typeErrorFormat, "E045", ">=", typeStr(a), typeStr(b)));
	}
	return a >= b;
});
f("<", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || (t !== "number" && t !== "string")) {
		throw new Error(util.format(typeErrorFormat, "E046", "<", typeStr(a), typeStr(b)));
	}
	return a < b;
});
f("<=", ["a", "b"], function() {
	var a = this.resolve("a");
	var b = this.resolve("b");
	var t = typeStr(a);
	if(t !== typeStr(b) || (t !== "number" && t !== "string")) {
		throw new Error(util.format(typeErrorFormat, "E047", "<=", typeStr(a), typeStr(b)));
	}
	return a <= b;
});


f("!", ["a"], function() {
	var a = this.resolve("a");
	if(typeof a !== "boolean") {
		throw new Error("E048 can't apply operator ! to operand of type " + typeStr(a) + ". It can only be applied to booleans.");
	}
	return !a;
});
f("||", ["a", "b"], function() {
	var a = this.resolve("a");
	if(typeof a === "boolean") {
		if(a) {
			return true;
		}
		var b = this.resolve("b");
		if(typeof b === "boolean") {
			return b;
		}
	}
	throw new Error(util.format(typeErrorFormat, "E049", "||", typeStr(a), typeStr(this.resolve("b"))) + ". It can only be applied to booleans.");
});
f("&&", ["a", "b"], function() {
	var a = this.resolve("a");
	if(typeof a === "boolean") {
		if(!a) {
			return false;
		}
		var b = this.resolve("b");
		if(typeof b === "boolean") {
			return b;
		}
	}
	throw new Error(util.format(typeErrorFormat, "E050", "&&", typeStr(a), typeStr(this.resolve("b"))) + ". It can only be applied to booleans.");
});

f("?", ["a", "b", "c"], function() {
	var a = this.resolve("a");
	if(typeof a !== "boolean") {
		throw new Error("E051 can't apply operator ? to operand of type " + typeStr(a) + ". The condition must be a boolean.");
	}
	if(a) {
		return this.resolve("b");
	}
	return this.resolve("c");
});
