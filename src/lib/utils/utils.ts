
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
                         !options.taskChangelogView && (!options.versionFilesEditAlways.includes(editFile) || options.taskMode);

        seekToEnd = seekToEnd || options.versionFilesScrollDown.includes(editFile);

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
                const ps1Script = await getPsScriptLocation("edit-file");
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


export async function getPsScriptLocation(scriptFile: string)
{
    let ps1Script: string;

    if (process.platform !== "win32") {
        return ps1Script;
    }

    if (await pathExists(`.\\node_modules\\@spmeesseman\\${scriptFile}.ps1`)) {
        ps1Script = `.\\node_modules\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`;
    }
    else if (await pathExists(`.\\node_modules\\@perryjohnson\\${scriptFile}`)) {
        ps1Script = `.\\node_modules\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`;
    }
    else if (await pathExists(`.\\script\\${scriptFile}.ps1`)) {
        ps1Script = `.\\script\\${scriptFile}.ps1`;
    }
    else if (await pathExists(`..\\script\\${scriptFile}.ps1`)) { // dev
        ps1Script = `..\\script\\${scriptFile}.ps1`;
    }
    else
    {
        if (process.env.CODE_HOME)
        {
            // Check global node_modules
            //
            const gModuleDir = process.env.CODE_HOME + "\\nodejs\\node_modules";
            if (await pathExists(gModuleDir + `\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`)) {
                ps1Script = gModuleDir + `\\@spmeesseman\\app-publisher\\script\\${scriptFile}.ps1`;
            }
            else if (await pathExists(gModuleDir + `\\@perryjohnson\\script\\${scriptFile}.ps1`)) {
                ps1Script = gModuleDir + `\\@perryjohnson\\app-publisher\\script\\${scriptFile}.ps1`;
            }
        }
        // Check windows install
        //
        else if (process.env.APP_PUBLISHER_HOME)
        {
            if (await pathExists(process.env.APP_PUBLISHER_HOME + `\\script\\${scriptFile}.ps1`)) {
                ps1Script = process.env.APP_PUBLISHER_HOME + `\\script\\${scriptFile}.ps1`;
            }
        }
    }

    return ps1Script;
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
        context.logger.warn("!!! The non-fatal error encountered was:");
        err = err.toString().replace(/\r\n/g, `${EOL}!!! `).replace(/\n/g, `${EOL}!!! `);
        context.stdout.write(`!!! ${err}${EOL}`);

    }
    context.logger.warn("!!!");
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

    if (scripts && scripts.length > 0) // && !$script:BuildCmdsRun.Contains($ScriptType))
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
