
import * as fs from "fs";
import { filter } from "lodash";
import * as path from "path";
import { addEdit } from "../repo";
import { getPsScriptLocation, isString, timeout } from "./utils";
const execa = require("execa");


let cwd = process.cwd();


export function setCwd(dir: string)
{
    cwd = dir;
}


export function copyFile(src: string, dst: string)
{
    return new Promise<boolean>(async (resolve, reject) =>
    {   //
        // If dst is a directory, a new file with the same name will be created
        //
        if (await pathExists(path.resolve(cwd, dst))) {
            try {
                if (fs.lstatSync(dst).isDirectory()) {
                    dst = path.join(path.resolve(cwd, dst), path.basename(src));
                }
            }
            catch (e) {
                reject(e);
            }
        }
        try {
            fs.copyFile(path.resolve(cwd, src), path.resolve(cwd, dst), (err) => {
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


//
// TODO - make a pure async imp.
//
export function copyDir(src: string, dst: string, filter?: RegExp, copyWithBaseFolder = false)
{
    return new Promise<boolean>(async (resolve, reject) =>
    {
        if (!fs.lstatSync(src).isDirectory()) {
            resolve(false);
        }
        //
        // Check if folder needs to be created or merged
        //
        let tgtDir;
        if (!copyWithBaseFolder) {
            tgtDir = path.resolve(cwd, dst);
        }
        else {
            tgtDir = path.join(path.resolve(cwd, dst), path.basename(src));
        }
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
        const srcDir = path.resolve(cwd, src);
        const files = fs.readdirSync(srcDir);
        for (const file of files)
        {
            const newSrc = path.join(srcDir, file);
            if (fs.lstatSync(newSrc).isDirectory()) {
                try {
                    await copyDir(newSrc, tgtDir, filter, copyWithBaseFolder);
                }
                catch (e) {
                    reject(e);
                }
            }
            else {
                try {
                    if (filter) {
                        if (filter.test(newSrc)) {
                            await copyFile(newSrc, tgtDir);
                        }
                    }
                    else {
                        await copyFile(newSrc, tgtDir);
                    }
                }
                catch (e) {
                    reject(e);
                }
            }
        }

        resolve(true);
    });
}


export function createDir(dir: string)
{
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            const baseDir = path.dirname(dir);
            if (!(await pathExists(baseDir))) {
                await createDir(baseDir);
            }
            fs.mkdir(path.resolve(cwd, dir), { mode: 0o777 }, (err) => {
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


export function pathExists(file: string): Promise<boolean>
{
    return new Promise<boolean>((resolve, reject) => {
        try {
            if (!file) {
                resolve(false);
                return;
            }
            fs.access(path.resolve(cwd, file), (e) => {
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


export function readFile(file: string): Promise<string>
{
    return new Promise<string>(async (resolve, reject) => {
        try {
            const buf = await readFileBuf(file);
            if (buf) {
                resolve(buf.toString());
            }
            resolve("");
        }
        catch (e) {
            reject(e);
        }
    });
}


export function readFileBuf(file: string): Promise<Buffer>
{
    return new Promise<Buffer>((resolve, reject) => {
        try {
            fs.readFile(path.resolve(cwd, file), (e, data) => {
                if (e) {
                    reject(e);
                }
                resolve(data);
            });
        }
        catch (e) {
            reject(e);
        }
    });
}


export function deleteFile(file: string): Promise<void>
{
    return new Promise<void>(async (resolve, reject) =>
    {
        try {
            if (await pathExists(file))
            {
                fs.unlink(path.resolve(cwd, file), (e) => {
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
export function writeFile(file: string, data: string): Promise<void>
{
    return new Promise<void>((resolve, reject) => {
        try {
            fs.writeFile(path.resolve(cwd, file), data, (err) => {
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


export function appendFile(file: string, data: string): Promise<void>
{
    return new Promise<void>((resolve, reject) => {
        try {
            fs.appendFile(path.resolve(cwd, file), data, (err) => {
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


/**
 * Replace text in a file, for use with version # replacement
 *
 * @param file The file
 * @param old Text or regex pattern to replace
 * @param nu Text to insert in place of 'old'
 * @param caseSensitive `true` to make the replacement case sensitive
 */
export async function replaceInFile(file: string, old: string, nu: string | ((m: RegExpExecArray) => string), caseSensitive = true)
{
    const content = await readFile(file),
          regex = new RegExp(old, caseSensitive ? undefined : "gmi");
    let contentNew = "";
    if (isString(nu)) {
        if (!caseSensitive) {
            contentNew = content.replace(regex, nu);
        }
        else {
            contentNew = content.replace(regex, nu);
        }
    }
    else {
        let match: RegExpExecArray;
        while ((match = regex.exec(content)) !== null) {
            contentNew = content.replace(regex, nu(match));
        }
    }
    if (contentNew && content !== contentNew)
    {
        await writeFile(file, contentNew);
        timeout(500);
    }
    return content !== contentNew;
}
