#!/usr/bin/env node

require("./index")()
.then((exitCode: number) =>
{
    process.exitCode = exitCode;
})
.catch(() =>
{
    process.exitCode = 1;
});
