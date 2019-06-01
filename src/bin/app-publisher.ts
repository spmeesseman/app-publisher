#!/usr/bin/env node

// Node 8+ from this point on
require("../cli")()
    .then(exitCode =>
    {
        process.exitCode = exitCode;
    })
    .catch(() =>
    {
        process.exitCode = 1;
    });
