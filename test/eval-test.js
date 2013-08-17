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
	},
	"functions": function() {
		var t = tokenizer.New("f(a, b) { a + b }(1, 2)");
		var n = parser.parse(t, 0);
		var v = n.eval(lib, []);
		assert.same(v, 3);
	},
});
