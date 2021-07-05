
import * as semver from "semver";
import { join } from "path";
import hideSensitive = require("../hide-sensitive");
import { isFunction } from "lodash";
import { pathExists } from "./fs";
import { addEdit } from "../repo";
import { IContext } from "../../interface";
import { EOL } from "os";
import { options } from "marked";
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


export async function editFile(context: IContext, editFile: string, isChangelog = false, seekToEnd = false)
{
    const { options, nextRelease, logger, cwd, env } = context;

    if (editFile && await pathExists(editFile))
    {
        let recordEdit = !options.taskMode;
        const fSkipEdits = !isChangelog ? options.skipVersionEdits === "Y" : options.skipChangelogEdits === "Y";
        let skipEdit = !!((fSkipEdits || options.taskVersionUpdate || options.taskChangelogFile) &&
                          !options.taskChangelogView && !options.taskChangelogHtmlView && !options.taskChangelogPrint);
        if (!options.taskMode && options.versionFilesEditAlways && options.versionFilesEditAlways.includes(editFile)) {
            skipEdit = false;
        }

        seekToEnd = seekToEnd || (options.versionFilesScrollDown ? options.versionFilesScrollDown.includes(editFile) : false);

        //
        // Task 'commit' is a special case task where the edits need to be recorded so
        // that the commit command can be submitted with only the files that were changed
        // by the publish run.  We could 'commit all', but since this is 50/50 local tool,
        // we'll leave anything thats modified, but not modified by the publish run, alone.
        //
        if ((options.taskCommit && options.taskCount === 1) || (options.taskTag && options.taskCount === 1) ||
            (options.taskCommit && options.taskTag && options.taskCount === 2))
        {
            skipEdit = true;
            recordEdit = options.taskCommit;
        }

        if (!skipEdit && !options.ciInfo.isCi)
        {
            logger.log("Open/edit " + editFile);
            //
            // Start Notepad process to edit specified file
            // If this is win32, and we're told to do do, then use the super cool but painfully slow
            // powershell script that will "attempt to" scroll the content in the editor to the end
            //
            if (process.platform === "win32" && seekToEnd && (!options.taskMode || options.taskChangelog))
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
        else if (!skipEdit && options.ciInfo.isCi) {
            logger.log("File edit skipped due to CI environment detected");
        }

        //
        // Track modified files during a publish run (non-task mode)
        //
        if (recordEdit) {
            await addEdit({options, logger, nextRelease, cwd, env} as IContext, editFile);
        }
    }
}


export function escapeRegExp(text: string)
{
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}


/**
 * Executes a script/program with execa and pipes the external program's stdout
 * this the current process stdout.
 *
 * @since 3.2.2
 * @param context Current run context
 * @param scriptPrg The script/program to execute
 * @param scriptPArgs Arguments to the script/program
 * @returns execa promise
 */
export function execaEx(context: IContext, scriptPrg: string, scriptPArgs: string[])
{
    const {options, cwd, env, stdout, stderr, logger} = context;

    if (!scriptPrg || !scriptPArgs) {
        logger.error("Arguments to execa are invalid, no script/program was executed");
        return new Promise((resolve) => { resolve(false); });
    }
    const procPromise = execa(scriptPrg, scriptPArgs, {cwd, env});
    if (options.verbose || (options.vcStdOut && (scriptPrg === "git" || scriptPrg === "svn")))
    {
        logger.log(`Executing command ${scriptPrg}`);
        logger.log(`${scriptPrg} ${scriptPArgs.join(" ")}`);
        //
        // Some commands just dont log, they could have hundreds of lines
        //
        if (!options.verbosex && scriptPArgs && (scriptPArgs[0] === "ls" || scriptPArgs[0] === "ls-files")) {
            return procPromise;
        }
        procPromise.stdout.pipe(stdout);
        procPromise.stderr.pipe(stderr);
    }
    return procPromise;
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
    // try {
    //     p = join("..", "..", "script", `${scriptFile}.ps1`);
    //     if (await pathExists(p)) { // tests
    //         return p;
    //     }
    //     p = join("..", "..", "..", "script", `${scriptFile}.ps1`);
    //     if (await pathExists(p)) { // tests
    //         return p;
    //     }
    // } catch (e) { /* */ }

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
    try {
        return ((value !== null) && (value !== undefined) &&
                (value !== "") && !isNaN(Number(value.toString())));
    }
    catch (e) {
        return false;
    }
}


export function isString(value: any): value is string
{
    return (value || value === "") && value instanceof String || typeof value === "string";
}


export function isObject(value: any): value is string
{
    return value && value instanceof Object || typeof value === "object";
}


export function logWarning(context: IContext, msg: string, err: string | Error)
{
    context.logger.warn(msg);
    if (err) {
        const errParts = err.toString().split("\n");
        context.logger.warn("The non-fatal error encountered was:");
        for (const errPart of errParts) {
            if (errPart) {
                context.logger.warn(errPart.trim());
            }
        }
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


export async function runScripts(context: IContext, scriptType: string, scripts: string | string[], forceRun = false, throwOnError = false)
{
    const {options, logger, cwd, env} = context;

    if (!forceRun && options.taskMode) {
        logger.log(`Running custom ${scriptType} script(s) skipped in task mode`);
        return;
    }

    if (!forceRun && options.versionForceCurrent) {
        logger.log(`Running custom ${scriptType} script(s) skipped in current version forced task mode`);
        return;
    }

    logger.log(`Running custom '${scriptType}' script(s)`);
    if (scripts) {
        if (isString(scripts)) {
            scripts = [ scripts ];
        }
        logger.log(`   # of scipts: ${scripts.length}`);
    }

    if (scripts && scripts.length > 0)
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
                    procPromise.stdout.pipe(context.stdout);
                    proc = await procPromise;
                }
                else if (scriptParts.length === 1)
                {
                    logger.log(`   Run script: ${scriptParts[0]}`);
                    procPromise = await execa(scriptParts[0], [], {cwd, env});
                    procPromise.stdout.pipe(context.stdout);
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
}


export function validateVersion(version: string, system?: "auto" | "manual" | "incremental" | "semver", lastVersion?: string, logger?: any)
{
    if (logger) {
        logger.log("Validate version : " + version);
    }
    if (!system || system === "auto" || system === "manual") {
        return semver.valid(version) && (!lastVersion || semver.gt(version, lastVersion)) ||
               (isNumeric(version) && (!lastVersion || !isNumeric(lastVersion) || parseInt(version, 10) > parseInt(lastVersion)));
    }
    else if (system !== "incremental") {
        return semver.valid(version) && (!lastVersion || semver.gt(version, lastVersion));
    }
    return isNumeric(version) && (!lastVersion || !isNumeric(lastVersion) || parseInt(version, 10) > parseInt(lastVersion));
}
