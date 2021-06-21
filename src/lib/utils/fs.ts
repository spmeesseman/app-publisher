
import * as fs from "fs";
import * as path from "path";
import { addEdit } from "../repo";
import { getPsScriptLocation, timeout } from "./utils";
const execa = require("execa");


export async function copyFile(src: string, dst: string)
{
    return new Promise<boolean>(async (resolve, reject) =>
    {   //
        // If dst is a directory, a new file with the same name will be created
        //
        if (await pathExists(dst)) {
            try {
                if (fs.lstatSync(dst).isDirectory()) {
                    dst = path.join(dst, path.basename(src));
                }
            }
            catch (e) {
                reject(e);
            }
        }
        try {
            fs.copyFile(path.resolve(src), path.resolve(dst), (err) => {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        }
        catch (e) {
            reject(e);
        }
    });
}


function copyFileSync(src: string, dst: string) {

    let targetFile = dst;
    //
    // If target is a directory, a new file with the same name will be created
    //
    if (fs.existsSync(dst)) {
        if (fs.lstatSync(dst).isDirectory()) {
            targetFile = path.join(dst, path.basename(src));
        }
    }
    fs.writeFileSync(targetFile, fs.readFileSync(src));
}

//
// TODO - make a pure async imp.
//
export async function copyDir(src: string, dst: string)
{
    return new Promise<boolean>(async (resolve, reject) =>
    {
        let files = [];
        //
        // Check if folder needs to be created or merged
        //
        const tgtDir = path.join(path.resolve(dst), path.basename(src));
        if (!fs.existsSync(tgtDir)) {
            try {
                await createDir(tgtDir);
            }
            catch (e) {
                reject(e);
            }
        }
        //
        // Copy
        //
        if (fs.lstatSync(src).isDirectory())
        {
            files = fs.readdirSync(src);
            for (const file of files)
            {
                const newSrc = path.join(src, file);
                if (fs.lstatSync(newSrc).isDirectory()) {
                    try {
                        await copyDir(newSrc, tgtDir);
                    }
                    catch (e) {
                        reject(e);
                    }
                }
                else {
                    try {
                        await copyFile(newSrc, tgtDir);
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            }
        }

        resolve(true);
    });
}


export async function createDir(dir: string)
{
    return new Promise<boolean>((resolve, reject) => {
        try {
            fs.mkdir(path.resolve(dir), { mode: 0o777 }, (err) => {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        }
        catch (e) {
            reject(e);
        }
    });
}


export async function pathExists(file: string, resolve = true): Promise<boolean>
{
    return new Promise<boolean>((resolve, reject) => {
        try {
            fs.access(resolve ? path.resolve(file) : file, (e) => {
                if (e) {
                    resolve(false);
                }
                resolve(true);
            });
        }
        catch (e) {
            resolve(false);
        }
    });
}


export async function readFile(file: string): Promise<string>
{
    return new Promise<string>((resolve, reject) => {
        try {
            fs.readFile(path.resolve(file), (e, data) => {
                if (e) {
                    reject(e);
                }
                resolve(data ? data.toString() : "");
            });
        }
        catch (e) {
            reject(e);
        }
    });
}


export async function deleteFile(file: string): Promise<void>
{
    return new Promise<void>(async (resolve, reject) =>
    {
        try {
            if (await pathExists(file))
            {
                fs.unlink(path.resolve(file), (e) => {
                    if (e) {
                        reject(e);
                    }
                    resolve();
                });
            }
            else {
                resolve();
            }
        }
        catch (e) {
            reject(e);
        }
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
        try {
            fs.writeFile(path.resolve(file), data, (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        }
        catch (e) {
            reject(e);
        }
    });
}


export async function appendFile(file: string, data: string): Promise<void>
{
    return new Promise<void>((resolve, reject) => {
        try {
            fs.appendFile(path.resolve(file), data, (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        }
        catch (e) {
            reject(e);
        }
    });
}


export function readFileSync(file: string)
{
    return fs.readFileSync(path.resolve(file)).toString();
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
    const content = await readFile(file),
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
