
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


export const getDocPath = (p: string) =>
{
    return path.resolve(__dirname, "../../../../client/testFixture", p);
};


export async function sleep(ms: number)
{
    // eslint-disable-next-line @typescript-eslint/tslint/config
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function runApTest(options: IOptions)
{
    try {
        const rc = await require("../.")(options);
        return rc;
    }
    catch (error)
    {
        if (error.name !== "YError") {
            stderr.write(hideSensitive(env)(inspect(error, {colors: true})));
        }
    }
}

let context: IContext;
let ciInfo: any;

export async function getApOptions(cmdOpts?: string[])
{
    const procArgv = [ ...process.argv ];
    if (!ciInfo) {
        ciInfo = envCi({ env: process.env, cwd: process.cwd() });
    }
    if (!ciInfo.isCi) {
        cmdOpts.push("--no-ci");
    }
    if (ciInfo.isCi && ciInfo.buildUrl && ciInfo.buildUrl.indexOf("pjats.com") !== -1) {
        process.argv = cmdOpts ? [ "", "", "--config-name", "pja", ...cmdOpts ] : [ "", "", "--config-name", "pja" ];
    }
    else {
        process.argv = cmdOpts ? [ "", "", ...cmdOpts ] : [ "", "" ];
    }
    if (!context) {
        const argOptions = getOptions(false);
        context = await getContext(argOptions, process.cwd(), process.env, process.stdout, process.stderr);
    }
    else {
        const argOptions = getOptions(false);
        const { options, plugins } = await getConfig(context, argOptions);
        context.options = options;
        context.plugins = plugins;
    }
    await validateOptions(context);
    process.argv = procArgv;
    return context.options;
}

export async function getApContext()
{
    return context;
}
