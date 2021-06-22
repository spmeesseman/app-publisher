
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


export interface ILastRelease
{
    head: string;
    tag: string;
    version: string;
    versionInfo: IVersionInfo;
}

export interface INextRelease
{
    edits: IEdit[];
    level: string;
    notes: string;
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
