require("d3");
require("./wordtree");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("d3.wordtree");

suite.addBatch({

    "wordtree": {
        topic: function() {
            return d3.wordtree();
        },
        "returns an instanceof d3.wordtree": function(wordtree) {
            assert.instanceOf(wordtree(), d3.wordtree);
        }
    }
});

suite.export(module);