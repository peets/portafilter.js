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
	}
});
