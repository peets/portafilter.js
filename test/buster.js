var config = module.exports;

config["My tests"] = {
    rootPath: "../",
    environment: "node", // or "browser"
    tests: [
        "test/*-test.js"
    ]
};

// Add more configuration groups as needed
