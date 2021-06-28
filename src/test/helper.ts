
import * as path from "path";
import hideSensitive from "../lib/hide-sensitive";
import { IContext, IOptions } from "../interface";
import { inspect } from "util";
import { env, stderr, stdout } from "process";
import getOptions from "../lib/get-options";
import validateOptions from "../lib/validate-options";
import getConfig from "../lib/get-config";
import getContext from "../lib/get-context";

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
        await require("../.")(options);
        return 0;
    }
    catch (error)
    {
        if (error.name !== "YError") {
            stderr.write(hideSensitive(env)(inspect(error, {colors: true})));
        }
    }
}

let context: IContext;

export async function getApOptions(cmdOpts?: string[])
{
    const procArgv = [ ...process.argv ];
    process.argv = cmdOpts ? [ "", "", ...cmdOpts ] : [ "", "" ];
    const argOptions = getOptions(false);
    context = context ?? await getContext({} as IOptions, process.cwd(), process.env, process.stdout, process.stderr);
    await validateOptions(context);
    const { options } = await getConfig(context, argOptions);
    await validateOptions(context);
    process.argv = procArgv;
    return options;
}
