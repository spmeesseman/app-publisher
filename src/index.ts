#!/usr/bin/env node

import { CommitAnalyzer } from './lib/commit-analyzer';
import { exec } from 'shelljs';

const argc = process.argv.splice(2);
let args: string = "";

if (argc.length === 0) {
    console.error(`Invalid number of arguments ${argc}`);
    process.exit(1);
}

argc.forEach(arg =>
{
    args += `${arg} `;
});
args = args.trimRight();

// argc.forEach(arg =>
// {
//     switch (arg)
//     {
//         case "PROJECTNAME":
// 
//             break;
//         default:
//             break;
//     }
// });

//const commitAnalyzer = new CommitAnalyzer({});
//console.log(`Release level is ${commitAnalyzer.getReleaseLevel()}`);

//exec('powershell ./script/app-installer.ps1', {silent:true}).stdout;
exec(`powershell ./script/app-installer.ps1 ${args}`)
