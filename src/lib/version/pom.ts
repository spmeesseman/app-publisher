
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { pathExists, replaceInFile, readFile } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getPomVersion({logger}): Promise<IVersionInfo>
{
    let version = "";
    const mavenVersionInfo: string[] = [];
    //
    // POM can be a preporty replacement version within the file itself:
    //
    // <version>${revision}${changelist}</version>
    // <name>MantisBT Plugin</name>
    // <properties>
    //     <revision>0.2.0</revision>
    //     <changelist>-PRE</changelist>
    //     ...
    // </properties>
    //
    if (await pathExists("pom.xml"))
    {
        logger.log("Retrieving version from pom.xml");

        const fileContent = await readFile("pom.xml"),
            regexp = new RegExp("\\$\\{(.+?)\\}(?=\<\\/version|\\$\\{\\w+\\})", "gm");

        let match: RegExpExecArray;
        while ((match = regexp.exec(fileContent)) !== null)
        {
            const prop = match[1],
                    regexp2 = new RegExp(`<${prop}>(.+)<\/${prop}>`, "g");
            if (mavenVersionInfo.length === 0) {
                mavenVersionInfo.push(prop);
            }
            if ((match = regexp2.exec(fileContent)) !== null)
            {
                if (version === "0.0.0") {
                    version = "";
                }
                version += match[1];
            }
        }

        if (version === "")
        {
            if ((match = /<version>([0-9]+[.]{1}[0-9]+[.]{1}[0-9]+)<\/version>/m.exec(fileContent)) !== null)
            {
                mavenVersionInfo.push("version");
                mavenVersionInfo.push(match[1]);
            }
        }
        else {
            mavenVersionInfo.push(version);
        }

        if (version) { logger.log("   Found version      : " + version); }
        else { logger.warn("   Not found"); }
    }

    return { version, system: "semver", info: mavenVersionInfo };
}


export async function setPomVersion(context: IContext, recordEditOnly: boolean)
{
    const {options, logger, nextRelease, cwd, env} = context;

    if (await pathExists("pom.xml"))
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (recordEditOnly) {
            await addEdit(context, "pom.xml");
            return;
        }
        if (nextRelease.versionInfo.info && nextRelease.versionInfo.info.length === 2)
        {   //
            // TODO - Maven tag in pom.xml
            // Pom file could have dynamic version construction using props (mavenTag)
            //
            const mavenTag = nextRelease.versionInfo.info;
            await replaceInFile("pom.xml", `<${mavenTag}>[0-9a-z.\-]+</${mavenTag}>`, `<${mavenTag}>${nextRelease.version}</${mavenTag}`);
        }
        else {
            await replaceInFile("pom.xml", "<version>[0-9a-z.\-]+</version>", `<version>${nextRelease.version}</version`);
        }
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile(context, "pom.xml");
    }
}
