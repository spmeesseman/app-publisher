
import hideSensitive = require("../hide-sensitive");
import { isFunction } from "lodash";
import { pathExists } from "./fs";
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


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}


const scriptTypesProcessed = [];


export async function runScripts({options, logger, cwd, env}, scriptType: string, scripts: string[], throwOnError = false, runInTestMode = false)
{
    if (options.taskMode) {
        logger.log(`Running custom ${scriptType} script(s) skipped in task mode`);
        return;
    }

    if (scripts && scripts.length > 0) // && !$script:BuildCmdsRun.Contains($ScriptType))
    {   //
        // Run custom script
        //
        logger.log(`Running custom ${scriptType} script(s)`);

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
                    let proc: any;
                    const scriptParts = script.split(" ").filter(a => a !== "");
                    if (scriptParts.length > 1) {
                        proc = await execa(scriptParts[0], scriptParts.splice(0, 1), {cwd, env});
                    }
                    else if (scriptParts.length === 1) {
                        proc = await execa(scriptParts[0], [], {cwd, env});
                    }
                    else {
                        logger.warn("Invalid script not processed");
                    }
                    checkExitCode(proc.code, logger, throwOnError);
                }
                else {
                    logger.warn("Invalid script not processed");
                }
            }
        }
        else {
            logger.log("   Dry run, skipping script run");
        }
    }
}
