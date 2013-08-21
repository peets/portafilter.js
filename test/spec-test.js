/* jshint evil: true */
var buster = require("buster");
var fs = require("fs");
var util = require("util");

var tree = require("../tree.js");
var tokenizer = require("../tokenizer.js");
var parser = require("../parser.js");
var lib = require("../lib.js");

buster.assertions.add("nodesEq", {
	assert: function(a, b) {
		return a instanceof tree.Node && b instanceof tree.Node && a.eq(b);
	},
	assertMessage: "Expected\n\n${0}\n\nto be the equivalent node of\n\n${1}\n",
	refuteMessage: "Didn't expect\n\n${0}\n\nto be the equivalent node of\n\n${1}\n",
	expectation: "toBeEq"
});

var testfile = fs.readFileSync("./test/spec.json", {encoding: "utf8"});
var testObj = JSON.parse(testfile);
var tests;
for(var caseName in testObj) {
	if(testObj.hasOwnProperty(caseName)) {
		tests = {};
		testObj[caseName].forEach(function(v, i, arr) {
			var name = v.name || v.scripty;
			tests[name] = function() {
				try {
					var parseTree;
					if(typeof v.scripty !== "undefined") {
						var st = tokenizer.New(v.scripty);
						var sParse = parser.parse(st, 0);
						parseTree = sParse;
					}
					if(typeof v.serialized !== "undefined") {
						var zParse = tree.unserialize(v.serialized, "X");
						parseTree = zParse;
					}
					if(sParse && zParse) {
						assert.equals(v.serialized, sParse.serialize("X"));
						assert.nodesEq(zParse, sParse);
					}
					var e = parseTree.eval(lib, []);
					if(typeof v.evald !== "undefined") {
						assert.equals(v.evald, e);
					} else {
						buster.assertions.fail(util.format("expected error, but got result %j", e));
					}
				} catch (e) {
					if(e.message.substr(0, 8) == "bad test") {
						throw e;
					}
					if(v.err) {
						assert.same(v.err, e.message.substr(0, 4));
					} else {
						buster.assertions.fail(util.format("unexpected error %s", e.message));
					}
				}
			};
		});
		buster.testCase(caseName, tests);
	}
}
