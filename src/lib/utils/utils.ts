
import { join } from "path";
import hideSensitive = require("../hide-sensitive");
import { isFunction } from "lodash";
import { pathExists } from "./fs";
import { addEdit } from "../repo";
import { IContext } from "../../interface";
import { EOL } from "os";
const execa = require("execa");
// const find = require("find-process");


export function atob(str: string): string
{
    return Buffer.from(str, "base64").toString("binary");
}


export function btoa(str: string): string
{
    return Buffer.from(str, "binary").toString("base64");
}


export function extractErrors(err)
{
    return err && isFunction(err[Symbol.iterator]) ? [...err] : [err];
}


export function hideSensitiveValues(env, objs)
{
    const hideFunction = hideSensitive(env);
    return objs.map(obj => {
        Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop]) {
            obj[prop] = hideFunction(obj[prop]);
        }
        });
        return obj;
    });
}


export function camelCase(name: string, indexUpper: number)
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Za-z]|\b\w)/g, (letter, index) => {
            return index !== indexUpper ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s\-]+/g, "");
}


export function checkExitCode(code: number, logger: any, throwOnError = false)
{
    if (code === 0) {
        logger.success("Exit Code 0");
    }
    else {
        logger.error("Exit Code " + code);
        if (throwOnError) {
            throw new Error("Sub-process failed with exit code" + code);
        }
    }
}


export async function editFile({ options, nextRelease, logger, cwd, env }, editFile: string, seekToEnd = false)
{
    if (editFile && await pathExists(editFile))
    {
        const skipEdit = (options.skipVersionEdits === " Y" || options.taskTouchVersions || options.taskChangelogFile) &&
                         !options.taskChangelogView && !options.taskChangelogHtmlView && !options.taskChangelogPrint &&
                         ((options.versionFilesEditAlways && options.versionFilesEditAlways.includes(editFile)) || options.taskMode);

        seekToEnd = seekToEnd || (options.versionFilesScrollDown ? options.versionFilesScrollDown.includes(editFile) : false);

        if (!skipEdit)
        {
            logger.log("Open/edit " + editFile);
            //
            // Start Notepad process to edit specified file
            // If this is win32, and we're told to do do, then use the super cool but painfully slow
            // powershell script that will scroll the content in the editor to the end
            //
            if (process.platform === "win32" && seekToEnd && !options.taskMode)
            {
                const ps1Script = await getPsScriptLocation("edit-file", {cwd, env});
                if (ps1Script) {
                    await execa.sync("powershell.exe",
                        [ ps1Script, "-f", editFile, "-e", options.textEditor, "-s", seekToEnd, "-a", options.taskMode ],
                        { stdio: ["pipe", "pipe", "pipe"], env: process.env}
                    );
                }
                else {
                    await execa.sync(options.textEditor, [ editFile ]);
                }
            }
            else {
                if (options.taskMode) { // unref() so parent doesn't wait
                    await execa(options.textEditor, [ editFile ], { detached: true, stdio: "ignore" }).unref();
                }
                else {
                    await execa.sync(options.textEditor, [ editFile ]);
                }
            }
        }
        //
        // Track modified files during a publish run (non-task mode)
        //
        if (!options.taskMode) {
            await addEdit({options, logger, nextRelease, cwd, env} as IContext, editFile);
        }
    }
}


export function escapeRegExp(text: string)
{
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}


/**
 * Locates the powershel script specified by `scriptFile` and returns a path that the
 * PowerSHell executable can execute.
 *
 * @since 3.0.3
 * @param scriptFile The script filename
 */
export async function getPsScriptLocation(scriptFile: string, execaOpts: any): Promise<string | undefined>
{
    if (process.platform !== "win32") {
        return;
    }

    let p = join(".", "node_modules", "@spmeesseman", "app-publisher", "script", `${scriptFile}.ps1`);
    if (await pathExists(p)) {
        return p;
    }
    p = join(".", "node_modules", "@perryjohnson", "app-publisher", "script", `${scriptFile}.ps1`);
    if (await pathExists(p)) {
        return p;
    }
    p = join(".", "script", `${scriptFile}.ps1`);
    if (await pathExists(p)) {
        return p;
    }
    p = join("..", "script", `${scriptFile}.ps1`);
    if (await pathExists(p)) { // dev
        return p;
    }

    //
    // Global NPM path
    //
    try {
        const globalPath = await execa.stdout("npm", [ "root", "-g" ], execaOpts);
        if (globalPath)
        {
            p = join(globalPath, "@spmeesseman", "app-publisher", "script", `${scriptFile}.ps1`);
            if (await pathExists(p)) {
                return p;
            }
            p = join(globalPath, "@perryjohnson", "app-publisher", "script", `${scriptFile}.ps1`);
            if (await pathExists(p)) {
                return p;
            }
        }
    }
    catch (e) { /* */ }

    if (process.env.CODE_HOME)
    {   //
        // Check CODE_HOME node_modules
        //
        const gModuleDir = process.env.CODE_HOME + "\\nodejs\\node_modules";
        p = join(gModuleDir, "@spmeesseman", "app-publisher", "script", `${scriptFile}.ps1`);
        if (await pathExists(p)) {
            return p;
        }
        p = join(gModuleDir, "@perryjohnson", "app-publisher", "script", `${scriptFile}.ps1`);
        if (await pathExists(p)) {
            return p;
        }
    }
    //
    // Check windows install
    //
    if (process.env.APP_PUBLISHER_HOME)
    {
        p = join(process.env.APP_PUBLISHER_HOME, "script", `${scriptFile}.ps1`);
        if (await pathExists(p)) {
            return p;
        }
    }
}


export function isNumeric(value: string | number): boolean
{
   return ((value !== null) && (value !== undefined) &&
           (value !== "") &&
           !isNaN(Number(value.toString())));
}


export function isString(value: any): value is string
{
    return (value || value === "") && value instanceof String || typeof value === "string";
}


export function logWarning(context: IContext, msg: string, err: string | Error)
{
    context.logger.warn("!!!");
    context.logger.warn(`!!! ${msg}`);
    if (err) {
        let multiLineSPacer = "";
        for (let i = 0; i < 34; i++) {
            multiLineSPacer += " ";
        }
        context.logger.warn("!!! The non-fatal error encountered was:");
        err = err.toString().replace(/\r\n/g, `${EOL}${multiLineSPacer}!!! `).replace(/\n/g, `${EOL}${multiLineSPacer}!!! `);
        context.stdout.write(`!!! ${err}${EOL}`);
    }
    else {
        context.logger.warn("!!!");
    }
}


export function properCase(name: string)
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
            return index !== 0 && (index >= name.length - 1 || name[index - 1] !== " ") ? letter.toLowerCase() : letter.toUpperCase();
        });
        // .replace(/[\s\-]+/g, "");
}


export function timeout(ms: number)
{
    // eslint-disable-next-line @typescript-eslint/tslint/config
    return new Promise(resolve => setTimeout(resolve, ms));
}


const scriptTypesProcessed = [];


export async function runScripts({options, logger, cwd, env}, scriptType: string, scripts: string | string[], throwOnError = false, runInTestMode = false)
{
    if (options.taskMode) {
        logger.log(`Running custom ${scriptType} script(s) skipped in task mode`);
        return;
    }

    if (isString(scripts)) {
        scripts = [ scripts ];
    }

    logger.log(`Running custom '${scriptType}' script(s)`);
    if (scripts) {
        logger.log(`   # of scipts: ${scripts.length}`);
    }

    if (scripts && scripts.length > 0) // && !$script:BuildCmdsRun.includes($ScriptType))
    {
        if (scriptTypesProcessed.includes(scriptType)) {
            logger.warn(`The script type ${scriptType} has already been ran during this run, skipping`);
            return;
        }

        scriptTypesProcessed.push(scriptType);

        if (!options.dryRun || runInTestMode)
        {
            for (let script of scripts)
            {
                script = script.trim();
                if (script)
                {
                    let proc: any,
                        procPromise: any;
                    const scriptParts = script.split(" ").filter(a => a !== "");
                    if (scriptParts.length > 1)
                    {
                        const scriptPrg = scriptParts[0];
                        scriptParts.splice(0, 1);
                        logger.log(`   Run script: ${scriptParts.join(" ")}`);
                        procPromise = execa(scriptPrg, scriptParts, {cwd, env});
                        procPromise.stdout.pipe(process.stdout);
                        proc = await procPromise;
                    }
                    else if (scriptParts.length === 1)
                    {
                        logger.log(`   Run script: ${scriptParts[0]}`);
                        procPromise = await execa(scriptParts[0], [], {cwd, env});
                        procPromise.stdout.pipe(process.stdout);
                        proc = await procPromise;
                    }
                    else {
                        logger.warn("Invalid script not processed");
                    }
                    checkExitCode(proc.code, logger, throwOnError);
                }
                else {
                    logger.warn("Empty scripts arg not processed");
                }
            }
        }
        else {
            logger.log("   Dry run, skipping script run");
        }
    }
}
