
import * as fs from "fs";
import * as path from "path";
import { getPsScriptLocation, timeout } from "./utils";
const execa = require("execa");


export async function copyFile(src: string, dst: string)
{
    return new Promise<boolean>(async (resolve, reject) => {
        //
        // If dst is a directory, a new file with the same name will be created
        //
        if (await pathExists(dst)) {
            if (fs.lstatSync(dst).isDirectory()) {
                dst = path.join(dst, path.basename(src));
            }
        }
        fs.copyFile(path.resolve(src), path.resolve(dst), (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
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
        // Check if folder needs to be created or integrated
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

        // Copy
        if (fs.lstatSync(src).isDirectory())
        {
            files = fs.readdirSync(src);
            files.forEach(async (file) =>
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
            });
        }

        resolve(true);
    });
}


export async function createDir(dir: string)
{
    return new Promise<boolean>((resolve, reject) => {
        fs.mkdir(path.resolve(dir), { mode: 0o777 }, (err) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        });
    });
}


export async function editFile({ options }, editFile: string, seekToEnd = false, skipEdit = false, async = false)
{
    if (editFile && await pathExists(editFile))
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
                const ps1Script = await getPsScriptLocation("edit-file");
                await execa.sync("powershell.exe",
                                    [`${ps1Script} '${editFile}' '${options.textEditor}' ${seekToEnd} ${async}`],
                                    { stdio: ["pipe", "pipe", "pipe"], env: process.env}
                                );
            }
            else {
                await execa.sync(options.textEditor, [ editFile ]);
            }
        }
    }
}


export async function pathExists(file: string): Promise<boolean>
{
    return new Promise<boolean>((resolve, reject) => {
        fs.access(path.resolve(file), (err) => {
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


export async function deleteFile(file: string): Promise<void>
{
    return new Promise<void>((resolve, reject) => {
        fs.unlink(path.resolve(file), (err) => {
            if (err) {
                reject(err);
            }
            resolve();
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
        fs.writeFile(path.resolve(file), data, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}


export async function appendFile(file: string, data: string): Promise<void>
{
    return new Promise<void>((resolve, reject) => {
        fs.appendFile(path.resolve(file), data, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
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
