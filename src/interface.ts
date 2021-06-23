
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
