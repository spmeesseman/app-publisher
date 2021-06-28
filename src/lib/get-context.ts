import { IContext, IOptions } from "../interface";
import getConfig from "./get-config";
import getLogger from "./get-logger";

export = getContext;


async function getContext(opts: IOptions, cwd: string, env: any, stdout: any, stderr: any): Promise<IContext>
{
    const context: IContext = {
        commits: undefined,
        changelog: undefined,
        cwd,
        env,
        logger: undefined,
        options: undefined,
        lastRelease: undefined,
        nextRelease: undefined,
        plugins: undefined,
        stdout: stdout || process.stdout,
        stderr: stderr || process.stderr
    };

    const { plugins, options } = await getConfig(context, opts);

    context.logger = getLogger(context);
    context.options = options;
    context.plugins = plugins;

    return context;
}
