
import { existsSync, readFileSync } from "fs";

export = getPomVersion;


function getPomVersion({logger}): { version: string, versionSystem: string, versionInfo: any }
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

    const fileContent = readFileSync("pom.xml").toString(),
            regexp = new RegExp("\\$\\{(.+?)\\}(?=\<\\/version|\\$\\{\\w+\\})", "g");

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
        const regexp3 = new RegExp("<version>([0-9]+[.]{1}[0-9]+[.]{1}[0-9]+)<\/version>");
        if ((match = regexp3.exec(fileContent)) !== null)
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
