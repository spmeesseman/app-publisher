import chalk from 'chalk';
import { accessSync } from 'fs';
import * as fs from 'fs';
import * as minimatch from 'minimatch';

const logValueWhiteSpace = 40;


export function camelCase(name: string, indexUpper: number) 
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Za-z]|\b\w)/g, (letter, index) => {
            return index !== indexUpper ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s\-]+/g, '');
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
        .replace(/[\s\-]+/g, '');
}


export function isExcluded(uriPath: string, exclude: string) 
{
    function testForExclusionPattern(path: string, pattern: string): boolean 
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    this.log('', 2);
    this.log('Check exclusion', 2);
    this.logValue('   path', uriPath, 2);

    if (exclude) 
    {
        if (Array.isArray(exclude)) 
        {
            for (let pattern of exclude) {
                this.logValue('   checking pattern', pattern, 3);
                if (testForExclusionPattern(uriPath, pattern)) {
                    this.log('   Excluded!', 2);
                    return true;
                }
            }
        } 
        else {
            this.logValue('   checking pattern', exclude, 3);
            if (testForExclusionPattern(uriPath, exclude)) {
              this.log('   Excluded!', 2);
              return true;
            }
        }
    }

    this.log('   Not excluded', 2);
    return false;
}


export function timeout(ms: number) 
{
    return new Promise(resolve => setTimeout(resolve, ms));
}


export function pathExists(path: string) 
{
    try {
        accessSync(path);
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
    let idx: number = -1;
	let idx2: number = -1;

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
    console.log('ap ' + msg);
}


export async function logError(msg: string) 
{
    console.log('ap ' + chalk.red("[ERROR] ") + msg);
}


export async function logWarning(msg: string) 
{
    console.log('ap ' + chalk.yellow("[WARNING] ") + msg);
}


export async function logSuccess(msg: string) 
{
    console.log('ap ' + chalk.green("[SUCCESS] ") + msg);
}


export async function logValue(msg: string, value: any, level?: number) 
{
    var logMsg = msg;

    for (var i = msg.length; i < logValueWhiteSpace; i++) {
        logMsg += ' ';
    }

    if (value || value === 0 || value === '') {
        logMsg += ': ';
        logMsg += value.toString();
    } 
    else if (value === undefined) {
        logMsg += ': undefined';
    } 
    else if (value === null) {
        logMsg += ': null';
    }

    console.log('ap ' + logMsg);
}
