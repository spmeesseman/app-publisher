#!/usr/bin/env node

import { env, stderr, cwd } from "process";
import { inspect } from "util";
import hideSensitive = require("./lib/hide-sensitive");
import getOptions = require("./lib/get-options");


export = async () =>
{
    try {
        await require(".")(getOptions(env, cwd()));
        return 0;
    }
    catch (error)
    {
        if (error.name !== "YError") {
            stderr.write(hideSensitive(env)(inspect(error, {colors: true})));
        }
    }
    return 1;
};
