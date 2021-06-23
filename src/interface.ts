
export interface IChangelog
{
    fileNotes?: string;
    htmlNotes?: string;
    notes: string;
    entries?: IChangelogEntry[];
}

export interface IChangelogEntry
{
    subject: string;
    scope: string;
    message: string;
    tickets: string;
}


/*
Git commit output:
{
  commit: {
    long: 'acd531bdcbd5e5da5a2c2c03756a912c1997e900',
    short: 'acd531b'
  },
  tree: {
    long: 'e2e01a2bfc4e6e3e2aa65faacf7393c1378d4575',
    short: 'e2e01a2'
  },
  author: {
    name: 'Scott Meesseman',
    email: 'spmeesseman@gmail.com',
    date: 2021-06-23T15:16:33.000Z
  },
  committer: {
    name: 'Scott Meesseman',
    email: 'spmeesseman@gmail.com',
    date: 2021-06-23T15:16:33.000Z
  },
  subject: 'fix(mantis release): assets upload with incorrect file names [skip ci]',
  body: '',
  hash: 'acd531bdcbd5e5da5a2c2c03756a912c1997e900',
  message: 'fix(mantis release): assets upload with incorrect file names [skip ci]',
  gitTags: '(HEAD -> master, origin/master)',
  committerDate: 2021-06-23T15:16:33.000Z
}
*/

export interface ICommit
{
    author?: string;
    date?: string;
    gitTags?: string;
    message: string;
    revision?: string;
}

export interface IContext
{
    commits: ICommit[];
    cwd: string;
    env: any;
    lastRelease: ILastRelease;
    logger: any;
    nextRelease: INextRelease;
    options: any;
    stdout: any;
    stderr: any;
}

export interface IEdit
{
    path: string;
    type: string;
}


export interface IReturnStatus
{
    error?: string;
    success: boolean;
    id?: number | string;
}


export interface ILastRelease
{
    head: string;
    tag: string;
    version: string;
    versionInfo: IVersionInfo;
}

export interface INextRelease
{
    changelog: IChangelog;
    edits: IEdit[];
    head: string;
    level: string;
    tag: string;
    version: string;
    versionInfo: IVersionInfo;
}

export interface IVersionInfo
{
    version: string;
    versionInfo: string[];
    versionSystem: string;
}
