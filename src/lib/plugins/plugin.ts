import { IPlugin } from "../../interface";

export abstract class Plugin implements IPlugin
{
    path: string;
    type: string;

    constructor(name: string) {
        this.path = name;
    }

    public fail()
    {
        throw new Error("Not implemented");
    }
}
