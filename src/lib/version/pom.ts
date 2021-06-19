
import { pathExists, replaceInFile, readFile, editFile } from "../utils";


export async function getPomVersion({logger}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
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

    let version = "";
    const mavenVersionInfo = [];

    logger.log("Retrieving Maven plugin version from $AssemblyInfoLocation");

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

    return { version, versionSystem: "semver", versionInfo: mavenVersionInfo };
}


export async function setPomVersion({nextRelease, options})
{
    if (nextRelease.versionInfo.length === 2 && await pathExists("pom.xml"))
    {
        const mavenTag = nextRelease.versionInfo;
        await replaceInFile("pom.xml", `<${mavenTag}>[0-9a-z.\-]+</${mavenTag}>`, `<${mavenTag}>${nextRelease.version}</${mavenTag}`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        editFile({options}, "pom.xml", false, (options.skipVersionEdits === " Y" || options.taskTouchVersions));
    }
}
