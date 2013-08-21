var buster = require("buster");
var tree = require("../tree.js");
var tokenizer = require("../tokenizer.js");
var parser = require("../parser.js");

tree.Node.prototype.eq = function(that) {
	if(this.evald !== that.evald) {
		return false;
	}
	if(typeof this.value !== "undefined") {
		if(this.value instanceof Array) {
			if(this.value.length != that.value.length) {
				return false;
			}
			for(var i = 0; i < this.value.length; i++) {
				if(!this.value[i].eq(that.value[i])) {
					return false;
				}
			}
		} else if(this.value instanceof tree.Op) {
			if(this.value.op != that.value.op) {
				return false;
			}
			if(this.value.args.length != that.value.args.length) {
				return false;
			}
			for(var i = 0; i < this.value.args.length; i++) {
				if(!this.value.args[i].eq(that.value.args[i])) {
					return false;
				}
			}
		} else if(this.value instanceof tree.Func) {
			if(!this.value.body.eq(that.value.body)) {
				return false;
			}
			if(this.value.args.length != that.value.args.length) {
				return false;
			}
			for(var i = 0; i < this.value.args.length; i++) {
				if(!this.value.args[i].eq(that.value.args[i])) {
					return false;
				}
			}
		} else if(this.value && typeof this.value === "object") {
			for(var k in this.value) {
				if(this.value.hasOwnProperty(k)) {
					if(that.value.hasOwnProperty(k)) {
						if(!this.value[k].eq(that.value[k])) {
							return false;
						}
					} else {
						return false;
					}
				}
			}
			for(k in that.value) {
				if(that.value.hasOwnProperty(k)) {
					if(!this.value.hasOwnProperty(k)) {
						return false;
					}
				}
			}
		} else {
			throw new Error("not a valid node");
		}
	}
	return true;
};

buster.testCase("unserializer tire kick", {
	"scalars": function() {
		var t = tokenizer.New("\"abc\"");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize("abc", "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("123.456");
		np = parser.parse(t, 0);
		ns = tree.unserialize(123.456, "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("null");
		np = parser.parse(t, 0);
		ns = tree.unserialize(null, "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("true");
		np = parser.parse(t, 0);
		ns = tree.unserialize(true, "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("false");
		np = parser.parse(t, 0);
		ns = tree.unserialize(false, "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"prefix": function() {
		var t = tokenizer.New("!false");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "`", ["X", "~", "!"], [false]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"negative": function() {
		var t = tokenizer.New("-0.12");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(-0.12, "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"name": function() {
		var t = tokenizer.New("foo");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "~", "foo"], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"array": function() {
		var t = tokenizer.New("[1, 2, [true, false]]");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize([1, 2, [true, false]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"object": function() {
		var t = tokenizer.New('{"a": 1, "b": null, "c":{"d":[3e8, 6.023E-88]}}');
		var np = parser.parse(t, 0);
		var ns = tree.unserialize({"a": 1, "b": null, "c":{"d":[3E8, 6.023e-88]}}, "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"let": function() {
		var t = tokenizer.New("let(a=b) true");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "given", {"a": ["X", "~", "b"]}, true], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New('let(a=b, c = "d" % 2) 1 / 0');
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "given", {"a": ["X", "~", "b"], "c": ["X", "`", ["X", "~", "%"], ["d", 2]]}, ["X", "`", ["X", "~", "/"], [1, 0]]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New('let ( a = 13 ) a');
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "given", {"a": 13}, ["X", "~", "a"]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New('let(a = 40 + 2) a');
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "given", {"a": ["X", "`", ["X", "~", "+"], [40, 2]]}, ["X", "~", "a"]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("let (c = f(a, b) { a + b }) c(1, 2)");
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "given", {"c": ["X", "f", ["a", "b"], ["X", "`", ["X", "~", "+"], [["X", "~", "a"], ["X", "~", "b"]]]]}, ["X", "`", ["X", "~", "c"], [1, 2]]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"f": function() {
		var t = tokenizer.New("f(a, b) { false }");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "f", ["a", "b"], false], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("f() { true && !false }");
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "f", [], ["X", "`", ["X", "~", "&&"], [true, ["X", "`", ["X", "~", "!"], [false]]]]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("f(a, b) { a + b }(1, 2)");
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "`", ["X", "f", ["a", "b"], ["X", "`", ["X", "~", "+"], [["X", "~", "a"], ["X", "~", "b"]]]], [1, 2]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"paren": function() {
		var t = tokenizer.New("1 * (2 + 3)");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "`", ["X", "~", "*"], [1, ["X", "`", ["X", "~", "+"], [2, 3]]]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"infix": function() {
		var t = tokenizer.New("1 + 2");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "`", ["X", "~", "+"], [1, 2]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	},
	"cond": function() {
		assert(true); // WEMUST
	},
	"call": function() {
		var t = tokenizer.New("foo(1)");
		var np = parser.parse(t, 0);
		var ns = tree.unserialize(["X", "`", ["X", "~", "foo"], [1]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("foo()");
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "`", ["X", "~", "foo"], []], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
		t = tokenizer.New("foo(true || false, 1)");
		np = parser.parse(t, 0);
		ns = tree.unserialize(["X", "`", ["X", "~", "foo"], [["X", "`", ["X", "~", "||"], [true, false]], 1]], "X");
		assert(np.eq(ns));
		assert.equals(np.serialize("X"), ns.serialize("X"));
	}
});
