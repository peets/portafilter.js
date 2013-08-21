var buster = require("buster");
var tree = require("../tree.js");
var tokenizer = require("../tokenizer.js");
var parser = require("../parser.js");
var lib = require("../lib.js");

buster.testCase("eval tire kick", {
	"smoke": function() {
		var t = tokenizer.New("1 + 2");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 3);
	},
	"vars": function() {
		var t = tokenizer.New("let(a = 42) a");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 42);
		var t = tokenizer.New("let(a = 40 + 2) 1");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 1);
		var t = tokenizer.New("let(a = 40 + 2) a");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 42);
		var t = tokenizer.New("let(a = 40 + 2, b = 13) let(c = a + b) c + 5");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 60);
		var t = tokenizer.New('let(foo = {"bar": "baz"}) foo.bar + "ooka"');
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, "bazooka");
		var t = tokenizer.New('let(foo = {"bar": {"baz": "ooka"}}) "baz" + foo.bar.baz');
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, "bazooka");
	},
	"functions": function() {
		var t = tokenizer.New("f(a, b) { a + b }(1, 2)");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 3);
		var t = tokenizer.New("let (c = f(a, b) { a + b }) c(1, 2)");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 3);
		var t = tokenizer.New('let (c = {"d": f(a, b) { a + b }}) c.d(1, 2)');
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 3);
		var t = tokenizer.New('let (c = {"d": f(a, b) { a + b }}) c.d(1, 2) + 3');
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 6);
	},
});
