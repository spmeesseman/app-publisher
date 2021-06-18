
import * as path from "path";
import { existsSync, readFileSync } from "fs";

export = getAppPublisherVersion;


function getAppPublisherVersion({cwd, logger}): { version: string, versionSystem: string, versionInfo: any }
{
    let version = "";
    logger.log("Retrieving MantisBT plugin version from $MANTISBTPLUGIN");

    const fileContent = readFileSync(path.join(cwd, ".publishrc.json")).toString(),
            regexp = new RegExp("version\"[ ]*:[ ]*\"[0-9]+[.]{0,1}[0-9]+[.]{0,1}[0-9]+[.]{0,1}[0-9]{0,}", "g"),
            found = fileContent.match(regexp);
    if (found)
    {
            version = found[0].replace("version", "");
            version = version.replace(":", "");
            version = version.replace(" ", "");
            version = version.replace("\"", "");
    }

    return { version, versionSystem: "semver", versionInfo: undefined };
}
