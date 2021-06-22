
export interface ICommit
{
    author?: string;
    message: string;
    revision?: string;
    date?: string;
    gitTags?: string;
}

export interface IContext
{
    commits: ICommit[];
    options: any;
    logger: any;
    cwd: string;
    env: any;
    stdout: any;
    stderr: any;
    lastRelease: ILastRelease;
    nextRelease: INextRelease;
}

export interface IEdit
{
    path: string;
    type: string;
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
    notes: string;
    edits: IEdit[];
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
