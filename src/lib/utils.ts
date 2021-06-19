
import * as fs from "fs";
import * as path from "path";
import hideSensitive = require("./hide-sensitive");
import chalk from "chalk";
import minimatch from "minimatch";
import { isFunction } from "lodash";
import { setOptions } from "marked";
const execa = require("execa");
const find = require("find-process");


const logValueWhiteSpace = 40;


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
    if (code !== 0) {
        logger.success("Exit Code 0");
    }
    else {
        logger.error("Exit Code " + code);
        if (throwOnError) {
            throw new Error("Sub-process failed with exit code" + code);
        }
    }
}


export function editFile({ options }, editFile: string, seekToEnd = false, skipEdit = false, async = false)
{
    if (editFile && fs.existsSync(editFile))
    {
        if (skipEdit && options.versionFilesEditAlways.includes(editFile))
        {
            skipEdit = false;
        }

        //
        // publishrc can specify a file should be scrolled to bottom
        //
        if (options.versionFilesScrollDown.includes(editFile))
        {
            seekToEnd = true;
        }

        if (!skipEdit && options.textEditor)
        {   //
            // Start Notepad process ro edit specified file
            //
            if (process.platform === "win32") {
                const ps1Script = getPsScriptLocation("edit-file");
                execa.sync("powershell.exe",
                            [`${ps1Script} '${editFile}' '${options.textEditor}' ${seekToEnd} ${async}`],
                            { stdio: ["pipe", "pipe", "pipe"], env: process.env}
                           );
            }
            else {
                execa.sync(options.textEditor, [ editFile ]);
            }
        }
    }
}


export async function getPsScriptLocation(scriptFile: string)
{
    let ps1Script;
    if (await pathExists(`.\\node_modules\\@spmeesseman\\${scriptFile}.ps1`)) {
        ps1Script = `.\\node_modules\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`;
    }
    else if (await pathExists(`.\\node_modules\\@perryjohnson\\${scriptFile}`)) {
        ps1Script = `.\\node_modules\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`;
    }
    else if (await pathExists(`.\\script\\${scriptFile}.ps1`)) {
        ps1Script = `.\\script\\${scriptFile}.ps1`;
    }
    else
    {
        if (process.env.CODE_HOME)
        {
            // Check global node_modules
            //
            const gModuleDir = process.env.CODE_HOME + "\\nodejs\\node_modules";
            if (await pathExists(gModuleDir + `\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`)) {
                ps1Script = gModuleDir + `\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`;
            }
            else if (await pathExists(gModuleDir + `\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`)) {
                ps1Script = gModuleDir + `\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`;
            }
        }
        // Check windows install
        //
        else if (process.env.APP_PUBLISHER_HOME)
        {
            if (await pathExists(process.env.APP_PUBLISHER_HOME + `\\${scriptFile}.ps1`)) {
                ps1Script = `.\\${scriptFile}.ps1`;
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


export function properCase(name: string)
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
            return index !== 0 ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s\-]+/g, "");
}


export function isExcluded(uriPath: string, exclude: string)
{
    function testForExclusionPattern(path: string, pattern: string): boolean
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    this.log("", 2);
    this.log("Check exclusion", 2);
    this.logValue("   path", uriPath, 2);

    if (exclude)
    {
        if (Array.isArray(exclude))
        {
            for (const pattern of exclude) {
                this.logValue("   checking pattern", pattern, 3);
                if (testForExclusionPattern(uriPath, pattern)) {
                    this.log("   Excluded!", 2);
                    return true;
                }
            }
        }
        else {
            this.logValue("   checking pattern", exclude, 3);
            if (testForExclusionPattern(uriPath, exclude)) {
              this.log("   Excluded!", 2);
              return true;
            }
        }
    }

    this.log("   Not excluded", 2);
    return false;
}


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function copyFile(src: string, dst: string)
{
    if (!src.includes(path.delimiter)) {
        src = path.join(process.cwd(), src);
    }
    return new Promise<boolean>((resolve, reject) => {
        fs.copyFile(src, dst, (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
}


export async function copyDir(src: string, dst: string)
{
    if (!src.includes(path.delimiter)) {
        src = path.join(process.cwd(), src);
    }
    return new Promise<boolean>((resolve, reject) => {
        fs.mkdir(dst, { mode: 0o777 }, (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
}


export async function createDir(dir: string)
{
    if (!dir.includes(path.delimiter)) {
        dir = path.join(process.cwd(), dir);
    }
    return new Promise<boolean>((resolve, reject) => {
        fs.mkdir(dir, { mode: 0o777 }, (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
}


export async function pathExists(file: string): Promise<boolean>
{
    if (!file.includes(path.delimiter)) {
        file = path.join(process.cwd(), file);
    }
    return new Promise<boolean>((resolve, reject) => {
        fs.access(file, (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
}


export async function readFile(file: string): Promise<string>
{
    if (!file.includes(path.delimiter)) {
        file = path.join(process.cwd(), file);
    }
    return new Promise<string>((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data.toString());
        });
    });
}


/**
 * Overwrites file if it exists
 *
 * @param file The file path to write to
 * @param data The data to write
 */
export async function writeFile(file: string, data: string): Promise<void>
{
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(file, data, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}


export function readFileSync(file: string)
{
    return fs.readFileSync(file).toString();
}


export function removeFromArray(arr: any[], item: any)
{
    let idx = -1;
    let idx2 = -1;

    arr.forEach(each => {
        idx++;
        if (item === each) {
            idx2 = idx;
            return false;
        }
    });

    if (idx2 !== -1 && idx2 < arr.length) {
        arr.splice(idx2, 1);
    }
}


/**
 * Replace text in a file, for use with version # replacement
 *
 * @param file The file
 * @param old Text or regex pattern to replace
 * @param nu Text to insert in place of 'old'
 * @param caseSensitive `true` to make the replacement case sensitive
 */
export async function replaceInFile(file: string, old: string, nu: string, caseSensitive = false)
{
    const content = (await readFile(file)).toString(),
          regex = new RegExp(old, caseSensitive ? undefined : "i");
    let contentNew = "";
    if (!caseSensitive) {
        contentNew = content.replace(regex, nu);
    }
    else {
        contentNew = content.replace(regex, nu);
    }
    if (content !== contentNew)
    {
        await writeFile(file, contentNew);
        timeout(500);
    }
    return content !== contentNew;
}


export function existsInArray(arr: any[], item: any)
{
    let exists = false;
    if (arr) {
        arr.forEach(each => {
            if (item === each) {
                exists = true;
                return false;
            }
        });
    }

    return exists;
}


export async function runScripts({options, logger}, scriptType: string, scripts: string[], throwOnError = false, runInTestMode = false)
{
    if (scripts && scripts.length > 0) // && !$script:BuildCmdsRun.Contains($ScriptType))
    {   //
        // Run custom script
        //
        logger.log("Running custom $ScriptType script(s)");

        if (!options.dryRun || runInTestMode)
        {
            for (const script of scripts)
            {
                const proc = await execa.shell(script);
                checkExitCode(proc.code, logger, throwOnError);
            }
        }
        else {
            logger.log("   Dry run, skipping script run");
        }

        // $script:BuildCmdsRun += $ScriptType
    }
}


export async function log(msg: string, level?: number)
{
    if (level && level) {
        return;
    }
    console.log("ap " + msg);
}


export async function logError(msg: string)
{
    console.log("ap " + chalk.red("[ERROR] ") + msg);
}


export async function logWarning(msg: string)
{
    console.log("ap " + chalk.yellow("[WARNING] ") + msg);
}


export async function logSuccess(msg: string)
{
    console.log("ap " + chalk.green("[SUCCESS] ") + msg);
}


export async function logValue(msg: string, value: any, level?: number)
{
    let logMsg = msg;

    for (let i = msg.length; i < logValueWhiteSpace; i++) {
        logMsg += " ";
    }

    if (value || value === 0 || value === "") {
        logMsg += ": ";
        logMsg += value.toString();
    }
    else if (value === undefined) {
        logMsg += ": undefined";
    }
    else if (value === null) {
        logMsg += ": null";
    }

    console.log("ap " + logMsg);
}
