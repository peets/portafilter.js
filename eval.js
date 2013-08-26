/* jshint evil: true */ // because we have a method named eval, and linter doesn't understand it's not the same as global eval.
var util = require("util");
var tree = require("./tree.js");

var Context = function(func, args, parent) {
	this.evaling = {};
	this.evald = {};
	this.func = func;
	this.args = args;
	this.parent = parent;
}

Context.prototype.getArg = function(name) {
	for(var i = 0; i < this.func.args.length; i++) {
		if(this.func.args[i] == name) {
			if(!this.parent) {
				throw new Error("E053 BUG: ran out of context !?!");
			}
			var args = this.args.value;
			var arrayLit = true;
			if(!(args instanceof Array)) {
				args = this.parent.eval(this.args);
				arrayLit = false;
			}
			if(i < args.length) {
				return arrayLit ? this.parent.eval(args[i]) : args[i];
			} else {
				throw new Error("E025", util.format("argument %s was not provided when function was called", name));
				// to avoid this error, supply all arguments or provide default argument values like so:
				//
				//     f(a, b, c) {
				//         let(c = exists("c") ? c : 0)
				//         a * b + c
				//     }
				//
				// The let-binding will resolve before the arguments are checked, therefore this error won't be triggered.
			}
		}
	}
	return;
};

// node can be omitted by host functions, in which case only the args and globals are searched for matching name
Context.prototype.resolve = function(name, node) {
	var ctx = this;
	if(!node) {
		// we are in a hard function, it would be dumb to tell the user about the argument name. If argument isn't found, it's a bug.
		var v = this.getArg(name);
		if(typeof v !== "undefined") {
			return v;
		}
		throw new Error("E054 BUG failed to resolve arg '" + name + "' in hard function " + this.func.toString());
	}
	for(var cur = node; cur && cur.parent; cur = cur.parent) {
		if(cur.parent.value instanceof Array) {
			var ok = false;
			if(typeof key === "string" && key.match(/^\d+$/)) {
				key = parseInt(key, 10);
				ok = true;
			} else if(typeof key === "number" && key % 1 === 0) {
				ok = true;
			}
			if(ok && key >= 0 && key < cur.parent.value.length) {
				return ctx.eval(cur.parent.value[key]);
			}
		} else if(cur.parent.value instanceof tree.Op) {
			if(cur.parent.value.op == "given") {
				// WEMUST: write this note in the documentation or something. Here's what's going on:
				// when evaluating values to be bound, we can't look up in their namespace when resolving names:
				// that namespace is currently under evaluation. This is what `bindingsNode !== cur` guards against below.
				// But if the namespace is an object literal, no evaluation needs to occur, and we can lookup names in it,
				// i.e. name bindings can reference their siblings: `let (a = b, b = 1) a` => 1.
				// This is the special case that's checked for first.
				var v;
				var bindingsNode = cur.parent.value.args[0];
				if(bindingsNode && typeof bindingsNode.value === "object" && !(bindingsNode.value instanceof Array)) {
					var maybe = bindingsNode.value[name];
					if(typeof maybe !== "undefined") {
						v = ctx.eval(maybe)
					}
				} else if(bindingsNode !== cur) {
					var bindings = ctx.eval(bindingsNode);
					v = bindings[name];
				}
				if(typeof v !== "undefined") {
					return v;
				}
			}
		} else if(typeof cur.parent === "object") {
			var v = cur.parent.value[name];
			if(typeof v !== "undefined") {
				return ctx.eval(v);
			}
		}
		if(cur.parent === ctx.func.body) {
			var v = ctx.getArg(name);
			if(typeof v !== "undefined") {
				return v;
			}
			if(ctx.parent) {
				ctx = ctx.parent;
			}
		}
	}
	throw new Error(util.format("E024 name resolution error: nothing named '%s' exists in scope.", name));
};

Context.prototype.eval = function(node) {
	debugger;
	if(this.evaling[node.id]) {
		throw new Error("E019 dependency loop at " + node.path);
	}
	if(typeof this.evald[node.id] === "undefined") {
		this.evaling[node.id] = true;
		if(typeof node.value !== "object" || node.value === null) {
			this.evald[node.id] = node.value;
		} else if(node.value instanceof Array) {
			var ret = [];
			for(var i = 0; i < node.value.length; i++) {
				ret[i] = this.eval(node.value[i]);
			}
			this.evald[node.id] = ret;
		} else if(node.value instanceof tree.Op) {
			switch(node.value.op) {
				case "given":
					this.evald[node.id] = this.eval(node.value.args[1]); // we didn't forget about the bindings; resolve will examine args[0] if/when the time comes.
					break;
				case "~":
					var name = this.eval(node.value.args[0]);
					if(typeof name !== "string") {
						throw new Error(util.format("E020 name resolution error at %s: name expression must result in a string, have %j", node.value.args[0].path, name));
					}
					this.evald[node.id] = this.resolve(name, node);
					break;
				case ".":
					var collection = this.eval(node.value.args[0]);
					var key = this.eval(node.value.args[1]);
					if(typeof key !== "string") {
						throw new Error(util.format("E021 member selection error at %s: name expression must result in a string", node.value.args[1].path));
					}
					if(collection instanceof Array) {
						var ok = false;
						if(typeof key === "string" && key.match(/^\d$/)) {
							key = parseInt(key, 10);
							ok = true;
						} else if(typeof key === "number" && key % 1 === 0) {
							ok = true;
						}
						if(ok && key >= 0 && key < collection.length) {
							this.evald[node.id] = collection[key];
							break;
						}
						throw new Error(util.format("E026 member selection error at %s: array %j has no element at index %s", node.path, collection, key));
					}
					var r = collection[key];
					if(typeof r !== "undefined") {
						this.evald[node.id] = r;
						break;
					}
					throw new Error(util.format("E027 member selection error at %s: object %j has no property named %s", node.path, collection, key));
				case "f":
					var func = function() {
						return this.eval(arguments.callee.body);
					};
					func.args = this.eval(node.value.args[0]);
					if(!(func.args instanceof Array)) {
						throw new Error(util.format("E011 syntax error at %s: argument names must be an array", node.path));
					}
					var taken = {};
					for(var i = 0; i < func.args; i++) {
						if(typeof func.args[i] !== "string") {
							throw new Error(util.format("E052 syntax error at %s: argument name must be a string literal", node.path));
						}
						if(taken[func.args[i]]) {
							throw new Error(util.format("E001 error at %s: cannot use same argument name \"%s\" twice (positions %d and %d)", node.path, func.args[i], taken[func.args[i]], i));
						}
						taken[func.args[i]] = i;
					}
					func.body = node.value.args[1];
					this.evald[node.id] = func;
					break;
				case "`":
					var func = this.eval(node.value.args[0]);
					if(typeof func !== "function") {
						throw new Error(util.format("E022 function call error at %s: that's not a function! (It's %j)", node.value.args[0].path, func));
					}
					this.evald[node.id] = func.call(new Context(func, node.value.args[1], this));
			}
		} else if(node.value instanceof Object) {
			var ret = {};
			for(var k in node.value) {
				ret[k] = this.eval(node.value[k]);
			}
			this.evald[node.id] = ret;
		} else {
			throw new Error("E023 BUG: " + node + "'s value isn't a scalar, function, Array, Op, or Object. What can it be?");
		}
		delete this.evaling[node.id];
	}
	return this.evald[node.id];
};

module.exports.Context = Context;
