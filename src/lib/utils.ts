import { isFunction } from "lodash";
import hideSensitive = require("./hide-sensitive");
import chalk from "chalk";
import * as fs from "fs";
import minimatch from "minimatch";
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


export function getPsScriptLocation(scriptFile: string)
{
    let ps1Script;
    if (pathExists(`.\\node_modules\\@spmeesseman\\${scriptFile}.ps1`)) {
        ps1Script = `.\\node_modules\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`;
    }
    else if (pathExists(`.\\node_modules\\@perryjohnson\\${scriptFile}`)) {
        ps1Script = `.\\node_modules\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`;
    }
    else if (pathExists(`.\\script\\${scriptFile}.ps1`)) {
        ps1Script = `.\\script\\${scriptFile}.ps1`;
    }
    else
    {
        if (process.env.CODE_HOME)
        {
            // Check global node_modules
            //
            const gModuleDir = process.env.CODE_HOME + "\\nodejs\\node_modules";
            if (pathExists(gModuleDir + `\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`)) {
                ps1Script = gModuleDir + `\\@perryjohnson\\${scriptFile}\\script\\${scriptFile}.ps1`;
            }
            else if (pathExists(gModuleDir + `\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`)) {
                ps1Script = gModuleDir + `\\@spmeesseman\\${scriptFile}\\script\\${scriptFile}.ps1`;
            }
        }
        // Check windows install
        //
        else if (process.env.APP_PUBLISHER_HOME)
        {
            if (pathExists(process.env.APP_PUBLISHER_HOME + `\\${scriptFile}.ps1`)) {
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


export function pathExists(path: string)
{
    try {
        fs.accessSync(path);
    } catch (err) {
        return false;
    }
    return true;
}


export async function readFile(file: string): Promise<string>
{
    return new Promise<string>((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data.toString());
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
