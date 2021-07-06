import { IArgument, IContext } from "../interface";
import { pathExists, readFile, writeFile } from "../lib/utils/fs";
import { EOL } from "os";
import regexes from "../lib/definitions/regexes";

export = generateHelp;


function buildHelp(readmeHelp: string, maxHelpLineLen: number, space: string, escapeQuotes: boolean, lineStart = "", lineEnd = "", sectionEnd = "")
{
    let helpLines: string | string[] = readmeHelp;
    if (escapeQuotes) {
        helpLines = helpLines.replace(/"/gm, "\\\"");
    }
    helpLines = helpLines.split(EOL);

    let helpSection = "";

    for (const line of helpLines)
    {
        if (line)
        {
            let cutLine = "";
            const help = line.trimRight().split(" ");
            for (const word of help)
            {
                if (cutLine.length + word.length < maxHelpLineLen)
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
            if (helpSection.endsWith(" \n")) {
                helpSection = helpSection.trimRight() + "\n";
            }
        }
    }

    return helpSection.substring(0, helpSection.length - lineEnd.length - 1).trimLeft() + sectionEnd;
}


async function generateHelp(context: IContext): Promise<string | boolean>
{
    const {logger} = context;

    logger.log("Start update interface.ts and args.ts files with readme help");

    const argsFile = "src/args.ts",
          interfaceFile = "src/interface.ts",
          readmeFile = "README.md",
          readme2File = ".github/README.md",
          args: IArgument[] = [],
          helpSections: string[] = [],
          readmeContent = await readFile(readmeFile),
          readme2Content = await readFile(readme2File),
          S1 = "    ", S2 = S1 + S1, S3 = S2 + S1, S4 = S3 + S1, SHELP = S4 + "  ";
    let readmeHelp = "";

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
    if ((match = new RegExp(regexes.HELP_EXTRACT_FROM_README).exec(readmeContent + "###END###")) !== null)
    {
        readmeHelp = match[0];
        //
        // Replace MD style links with a broken representation, i.e. [Link](https://www.domain.com)
        // should be converted to Link (https://www.domain.com).
        //
        while ((match = regexes.HELP_EXTRACT_OPTION.exec(readmeHelp + "###END###")) !== null)
        {
            let helpSection = match[0];
            while ((match = regexes.HELP_LINK.exec(match[0])) !== null)
            {
                helpSection = helpSection.replace(match[0], `${match[1]} (${match[2]})`);
            }
            helpSections.push(helpSection);
        }
    }

    if (helpSections.length === 0) {
        return `Found ${helpSections.length} option help sections`;
    }

    for (const h of helpSections)
    {
        logger.log(`Extracting properties for option # ${++ct}`);
        const name = h.match(regexes.HELP_NAME)[1],
              type = h.match(regexes.HELP_TYPE)[1].replace("\\|", "|"),
              dft = h.match(regexes.HELP_DEFAULT_VALUE)[1] ?? "",
              argument = "\"" + h.match(regexes.HELP_ARG)[1].replace(" \\| ", "\", \"") + "\"",
              help = h.match(regexes.HELP_SECTION)[0].trim();
        args.push({  name, type, default: dft, argument, help });
    }

    ct = 0;
    let argsContent = "export const publishRcOpts =\n{\n",
        interfaceContent = "export interface IArgs\n{\n";

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
        argsContent += buildHelp(a.help, 70, SHELP, true, "\"", "\\n\" +", "\",");
        argsContent += `
            helpPrivate: ${a.name === "taskGenerateHelp" || a.name === "taskDevTest" || a.name.includes("Private.") ? "true" : "false"}
        }
    ],
`;
        if (type === "flag") {
            type = "\"Y\" | \"N\"";
        }
        else if (type.startsWith("enum")) {
            type = "\"" + type.replace("enum(", "").replace(")", "").replace(/\|/g, "\" | \"") + "\"";
        }
        interfaceContent += `${S1}/**\n${S1} `;
        interfaceContent += buildHelp(a.help, 90, S1, false, " * ");
        interfaceContent += `\n${S1} */\n${S1}${a.name}: ${type};\n`;
    }

    argsContent = argsContent.trim();
    argsContent = argsContent.substr(0, argsContent.length - 1);
    argsContent += "\n\n};\n";
    argsContent = argsContent.replace(/\n/gm, EOL);

    interfaceContent = interfaceContent.trim();
    interfaceContent += "\n";
    interfaceContent = interfaceContent.replace(/\n/gm, EOL);

    //
    // GitHub README
    //
    if ((match = new RegExp(regexes.HELP_EXTRACT_FROM_README).exec(readme2Content + "###END###")) !== null) {
        writeFile(readme2File, readme2Content.replace(match[0], readmeHelp));
    }

    //
    // src/args.ts
    //
    if (pathExists(argsFile)) {
        await writeFile(argsFile, argsContent);
    }
    else {
        return "Args file not found";
    }

    //
    // src/interface.ts
    //
    if (pathExists(interfaceFile)) {
        const interfaceFileContent = await readFile(interfaceFile);
        if ((match = new RegExp(regexes.HELP_EXTRACT_FROM_INTERFACE).exec(interfaceFileContent + "###END###")) !== null) {
            writeFile(interfaceFile, interfaceFileContent.replace(match[0], interfaceContent));
        }
    }
    else {
        return "Interface file not found";
    }

    return true;
}
