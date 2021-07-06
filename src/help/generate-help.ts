import { IArgument, IContext } from "../interface";
import { pathExists, readFile, writeFile } from "../lib/utils/fs";
import { REGEX_HELP_ARG, REGEX_HELP_DEFAULT_VALUE, REGEX_HELP_EXTRACT_FROM_README, REGEX_HELP_EXTRACT_OPTION, REGEX_HELP_NAME, REGEX_HELP_SECTION, REGEX_HELP_TYPE } from "../lib/definitions/regexes";
import { EOL } from "os";

export = generateHelp;


function buildHelp(readmeHelp: string, maxHelpLineLen: number, space: string, lineStart = "", lineEnd = "")
{
    const helpLines = readmeHelp.replace(/"/gm, "\\\"").split(EOL);
    let helpSection = "";

    for (const line of helpLines)
    {
        if (line)
        {
            let cutLine = "";
            const help = line.trimRight().split(" ");
            for (const word of help)
            {
                if (cutLine.length < maxHelpLineLen)
                {
                    cutLine += (word + " ");
                }
                else {
                    helpSection += `${space}${lineStart}${cutLine.trimRight()}${lineEnd}\n`;
                    cutLine = (word + " ");
                }
            }
            if (cutLine) {
                helpSection += `${space}${lineStart}${cutLine.trimRight()}${lineEnd}\n`;
            }
        }
        else {
            helpSection += `${space}${lineStart}${lineEnd}\n`;
        }
    }

    return helpSection.substring(0, helpSection.length - lineEnd.length - 1).trimLeft() + "\",";
}


async function generateHelp(context: IContext): Promise<string | boolean>
{
    const {logger} = context;

    logger.log("Start update interface.ts and args.ts files with readme help");

    const argsFile = "src/args.ts",
          interfaceFile = "src/interface.ts",
          readme2File = ".github/README.md",
          args: IArgument[] = [],
          helpSections: string[] = [],
          readmeContent = await readFile("README.md"),
          S1 = "    ", S2 = S1 + S1, S3 = S2 + S1, S4 = S3 + S1, SHELP = S4 + "  ";
    let readme2Content = await readFile(readme2File);

    if (!readmeContent || !readme2Content) {
        return "Readme file not found";
    }

    //
    // Pull out the requested sections
    //
    let match: RegExpExecArray, ct = 0;
    //
    // Note that [\s\S]*? isnt working here, had to use [^]*? for a non-greedy grab, which isnt
    // supported in anything other than a JS regex.  Also, /Z doesnt work for 'end of string' in
    // a multi-line regex in JS, so we use the ###END### temp tag to mark it
    //
    if ((match = REGEX_HELP_EXTRACT_FROM_README.exec(readmeContent)) !== null)
    {
        const readmeHelp = match[0];
        while ((match = REGEX_HELP_EXTRACT_OPTION.exec(readmeHelp + "###END###")) !== null)
        {
            helpSections.push(match[0]);
        }
    }

    logger.log(`Found ${helpSections.length} option help sections`);

    for (const h of helpSections)
    {
        logger.log(`Extracting properties for option # ${++ct}`);
        const name = h.match(REGEX_HELP_NAME)[1],
              type = h.match(REGEX_HELP_TYPE)[1].replace("\\|", "|"),
              dft = h.match(REGEX_HELP_DEFAULT_VALUE)[1] ?? "",
              argument = "\"" + h.match(REGEX_HELP_ARG)[1].replace(" \\| ", "\", \"") + "\"",
              help = h.match(REGEX_HELP_SECTION)[0].trim();
        args.push({  name, type, default: dft, argument, help });
    }

    ct = 0;
    let argsContent = "export const publishRcOpts =\n{\n",
        interfaceContent = "export interface IOptions\n{\n";

    for (const a of args)
    {
        logger.log(`Processing option # ${++ct}: '${a.name}'`);
        logger.log(`   Type     : ${a.type}`);
        logger.log(`   Default  : ${a.default}`);
        logger.log(`   Cmd Line : ${a.isCmdLine}`);
        logger.log(`   Private  : ${a.helpPrivate}`);
        logger.log(`   Argument : ${a.argument.toString()}`);

        let def = a.default,
            type = a.type;
        if (a.type !== "number" && a.type !== "boolean") {
            def = `"${a.default}"`;
        }
        else if (def) {
            def = a.default.toString().toLowerCase();
        }

        argsContent += `
    ${a.name}: [
        ${a.argument !== "n/a" ? "true" : "false"},
        "${a.type}",
        ${def},
        [${a.argument !== "\"n/a\"" ? ` ${a.argument} ` : ""}],
        {
`;
        argsContent += `${S3}help: `;
        argsContent += buildHelp(a.help, 75, SHELP, "\"", "\\n\" +");
        argsContent += `
            helpPrivate: ${a.name === "taskGenerateHelp" || a.name === "taskDevTest" || a.name.includes("Private.") ? "true" : "false"}
        }
    ],
`;
        if (type.startsWith("enum")) {
            type = "\"" + type.replace("enum(", "").replace(")", "").replace("|", "\" | \"") + "\"";
        }
        interfaceContent += `${S1}/**\n${S1} `;
        interfaceContent += buildHelp(a.help, 100, S1, " * ");
        interfaceContent += `\n${S1} */\n${S1}${a.name}: ${type};\n`;
    }

    argsContent = argsContent.trim();
    argsContent = argsContent.substr(0, argsContent.length - 1);
    argsContent += "\n\n};\n";
    argsContent = argsContent.replace(/\n/gm, EOL);

    interfaceContent = interfaceContent.trim();
    // interfaceContent = interfaceContent.substr(0, argsContent.length - 1);
    interfaceContent += "\n}\n";
    interfaceContent = argsContent.replace(/\n/gm, EOL);

    if ((match = REGEX_HELP_EXTRACT_FROM_README.exec(readme2Content)) !== null)
    {
        readme2Content = readme2Content.replace(match[0], readme2Content);
        writeFile(readme2File, readme2Content);
    }

    if (pathExists(argsFile)) {
        await writeFile(argsFile, argsContent);
    }
    else {
        return "Args file not found";
    }

    if (pathExists(argsFile)) {
        const interfaceFileContent = await readFile(interfaceFile);
        // await writeFile(interfaceFile, interfaceContent);
    }
    else {
        return "Interface file not found";
    }

    return true;
}
