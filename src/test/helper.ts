
import * as path from "path";
import hideSensitive from "../lib/hide-sensitive";
import { IContext, IOptions } from "../interface";
import { inspect } from "util";
import { env, stderr, stdout } from "process";
import getOptions from "../lib/get-options";
import validateOptions from "../lib/validate-options";
import getConfig from "../lib/get-config";
import getContext from "../lib/get-context";
const envCi = require("@spmeesseman/env-ci");


const cwd = path.join(process.cwd(), "src", "test", "fixture");
let context: IContext;
let ciInfo: any;


export async function sleep(ms: number)
{
    // eslint-disable-next-line @typescript-eslint/tslint/config
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function runApTest(options: IOptions): Promise<number>
{
    try {
        const rc = await require("../.")(options, { cwd });
        return rc ? 1 : 0;
    }
    catch (error)
    {
        if (error.name !== "YError") {
            stderr.write(hideSensitive(env)(inspect(error, {colors: true})));
        }
    }
    return 1;
}


export async function getApOptions(cmdOpts?: string[])
{
    const procArgv = [ ...process.argv ];
    if (!ciInfo) {
        ciInfo = envCi({ env: process.env, cwd });
    }
    process.argv = cmdOpts ? [ "", "", ...cmdOpts ] : [ "", "" ];
    if (!ciInfo.isCi) {
        process.argv.push("--no-ci");
    }
    process.argv.push("--tests");
    if (!context) {
        try {
            const argOptions = getOptions(false);
            context = await getContext(argOptions, cwd, process.env, process.stdout, process.stderr);
        }
        catch (e) {
            throw e;
        }
    }
    else {
        try {
            const argOptions = getOptions(false);
            const { options, plugins } = await getConfig(context, argOptions);
            context.options = options;
            context.plugins = plugins;
        }
        catch (e) {
            throw e;
        }
    }
    try {
        await validateOptions(context, true);
    }
    catch (e) { /** */ }
    process.argv = procArgv;
    return context.options;
}

export async function getApContext()
{
    return context;
}
