#!/usr/bin/env node

import { CommitAnalyzer } from './lib/commit-analyzer';

const argc = process.argv.splice(2);

if (argc.length != 1) {
    console.error(`Invalid number of arguments ${argc}`);
    process.exit(1);
}

const PROJECTNAME = argc[0];
const PATHTOROOT = argc[1];

if (!PROJECTNAME) {
    console.error(`Invalid input PROJECTNAME=${PROJECTNAME}`);
    process.exit(1);
}

const commitAnalyzer = new CommitAnalyzer({});
console.log(`Release level is ${commitAnalyzer.getReleaseLevel()}`);
