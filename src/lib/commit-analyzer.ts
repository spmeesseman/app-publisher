export class CommitAnalyzer 
{
    private options: any;


    constructor(opts: any) 
    {
        this.options = opts;
    }


    getReleaseLevel(): string 
    {
        return this.getLevel("svn");
    }


    private getLevel(repoType: string) : string 
    {
        return "patch";
    }
    
}
