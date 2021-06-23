
import * as path from "path";

export const getDocPath = (p: string) =>
{
    return path.resolve(__dirname, "../../../../client/testFixture", p);
};


export async function sleep(ms: number)
{
    // eslint-disable-next-line @typescript-eslint/tslint/config
    return new Promise(resolve => setTimeout(resolve, ms));
}
