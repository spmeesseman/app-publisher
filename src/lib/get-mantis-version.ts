
import { existsSync, readFileSync } from "fs";

export = getMantisVersion;


function getMantisVersion({logger, options}): { version: string, versionSystem: string, versionInfo: any }
{
    let version = "";
    logger.log("Retrieving MantisBT plugin version from $MANTISBTPLUGIN");

    const fileContent = readFileSync(options.mantisBtPlugin).toString(),
            regexp = new RegExp("this->version[ ]*=[ ]*(\"|')[0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "g"),
            found = fileContent.match(regexp);
    if (found)
    {
            version = found[0].replace("this->version", "");
            version = version.replace(" ", "");
            version = version.replace("=", "");
            version = version.replace("\"", "");
            version = version.replace("'", "");
    }

    return { version, versionSystem: "semver", versionInfo: undefined };
}
