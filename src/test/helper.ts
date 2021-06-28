
import * as path from "path";
import hideSensitive from "../lib/hide-sensitive";
import { IOptions } from "../interface";
import { inspect } from "util";
import { env, stderr, stdout } from "process";

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
