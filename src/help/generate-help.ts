import { escapeRegExp, max, template } from "lodash";
import semver from "semver";
import pLocate from "p-locate";
import { getTags, isRefInHistory, getTagHead } from "../lib/repo";
import { IArgument, IContext, IRelease, IVersionInfo } from "../interface";
import { EOL } from "os";
import { readFile, writeFile } from "../lib/utils/fs";
import { REGEX_HELP_EXTRACT_FROM_README, REGEX_HELP_EXTRACT_OPTION } from "../lib/definitions/regexes";

export = generateHelp;


async function generateHelp(context: IContext): Promise<string | boolean>
{
    const {logger} = context,
          maxHelpLineLen = 80;

    logger.log("Start update interface.ts and args.ts files with readme help");

    const argsFile = "../args.ts",
          interfaceFile = "../interface.ts",
          args: IArgument[] = [],
          helpSections: string[] = [],
          readmeContent = await readFile("README.md"),
          S1 = "    ", S2 = S1 + S1, S3 = S2 + S1, S4 = S3 + S1, SHELP = S4 + "  ";

    if (!readmeContent) {
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
        logger.log(`Extracting properties option # ${++ct}`);
        const name = h.match(/### (\w+)/m)[1],
              type = h.match(/\*\*Value Type\*\* *\|(?:\*__)([\\\w| \[\]]+)(?:__\*)/m)[1].replace("\\|", "|"),
              dft = h.match(/\*\*Value Default\*\* *\|(?:(?:\*__)([\w,\[\]]*)(?:__\*))*/m)[1] ?? "",
              argument = h.match(/\*\*Command Line Arg\*\* *\|(?:\*__)([\\\w\-| ]+)(?:__\*)/m)[1].replace(" \\|", ","),
              help = h.match(/^[\w\-\* ]+[^]*/mi)[0].trim();
        args.push({  name, type, default: dft, argument, help });
    }

    let argsContent = "export const publishRcOpts =\r\n{\r\n    ",
        interfaceContent = "export interface IOptions\r\n{\r\n";

    for (const a of args)
    {
        logger.log(`Processing option '${a.name}'`);
        logger.log(`   Type     : ${a.type}`);
        logger.log(`   Default  : ${a.default}`);
        logger.log(`   Cmd Line : ${a.isCmdLine}`);
        logger.log(`   Private  : ${a.helpPrivate}`);
        logger.log(`   Argument : ${a.argument.toString()}`);

        argsContent += `
    ${a.name}: [
        true,
        "${a.type}",
        ${a.type === "string" ? `"${a.default}"` : a.default ?? "\"\""},
        [ ${a.argument} ],
        {
`;
        let helpLine = "", helpLines = "";
        let help = a.help.split(" ");
        argsContent += helpLine;
        for (const word of help)
        {
            if (word.includes("\r\n"))
            {
                const splitWord = word.split("\r\n");
                for (const sword of splitWord)
                {
                    if (sword) {
                        if (helpLines.endsWith("\r\n")) {
                            helpLines += SHELP;
                            helpLine = "";
                        }
                        else if (helpLine.trim() === "") {
                            helpLines = helpLines.trimRight() + "\r\n";
                            helpLines += `${SHELP}"${helpLine}`;
                        }
                        if (helpLines.endsWith(`\r\n${SHELP}`)) {
                            helpLines += "\"";
                            helpLine = "";
                        }
                        if (helpLine.length + sword.length + 1 < maxHelpLineLen) {
                            helpLine += (sword + " ");
                            helpLines += (sword + " ");
                        }
                        else {
                            helpLines = `${helpLines.trimRight()}\\n" +\r\n${SHELP}`;
                            helpLine = `"${sword} `;
                            helpLines += `"${sword} `;
                        }
                    }
                    else {
                        if (helpLine) {
                            helpLines = `${helpLines.trimRight()}\\n" +\r\n${SHELP}"\\n" +\r\n`;
                        }
                        else {
                            if (helpLines.trimRight().endsWith("\"\\n\" +")) {
                                helpLines = `${helpLines.trimRight()}\r\n`;
                            }
                            else {
                                helpLines = `${helpLines.trimRight()}\r\n${SHELP}"\\n" +\r\n`;
                            }
                        }
                        helpLine = "";
                    }
                }
            }
            else if (helpLine.length + word.length + 1 < maxHelpLineLen) {
                helpLine += (word + " ");
                helpLines += (word + " ");
            }
            else {
                helpLines = `${helpLines.trimRight()}\\n" +\r\n${SHELP}`;
                helpLine = `"${word} `;
                helpLines += `"${word} `;
            }
        }

        argsContent += `${S3}help: "${helpLines.trim()}",`;
        argsContent += `
            helpPrivate: ${a.name === "taskGenerateHelp"}
        }
    ],

`;

        interfaceContent += `${S1}/**\r\n${S1} * `;

        helpLine = "";
        helpLines = "";
        help = a.help.split(" ");
        argsContent += helpLine;
        for (const word of help)
        {
            if (word.includes("\r\n"))
            {
                const splitWord = word.split("\r\n");
                for (const sword of splitWord)
                {
                    if (sword) {
                        if (helpLines.endsWith("\r\n")) {
                            helpLines += `${S1} * `;
                            helpLine = "";
                        }
                        else if (helpLine.trim() === "") {
                            helpLines = helpLines.trimRight() + "\r\n";
                            helpLines += `${S1} * ${helpLine}`;
                        }
                        if (helpLines.endsWith(`\r\n${S1} * `)) {
                            helpLine = "";
                        }
                        if (helpLine.length + sword.length + 1 < maxHelpLineLen) {
                            helpLine += (sword + " ");
                            helpLines += (sword + " ");
                        }
                        else {
                            helpLines = `${helpLines.trimRight()}\r\n${S1} * `;
                            helpLine = `${sword} `;
                            helpLines += `${sword} `;
                        }
                    }
                    else {
                        if (helpLine) {
                            helpLines = `${helpLines.trimRight()}\r\n${S1} *\r\n`;
                        }
                        else {
                            if (helpLines.endsWith(`${S1} *\r\n`)) {
                                helpLines = `${helpLines.trimRight()}\r\n`;
                            }
                            else {
                                helpLines = `${helpLines.trimRight()}\r\n${S1} *\r\n`;
                            }
                        }
                        helpLine = "";
                    }
                }
            }
            else if (helpLine.length + word.length + 1 < maxHelpLineLen) {
                helpLine += (word + " ");
                helpLines += (word + " ");
            }
            else {
                helpLines = `${helpLines.trimRight()}\r\n${S1} * `;
                helpLine = `${word} `;
                helpLines += `${word} `;
            }
        }

        interfaceContent += `${helpLines}\r\n${S1} */\r\n${S1}${a.name}: ${a.type};\r\n`;
    }

    argsContent = argsContent.trim();
    argsContent = argsContent.substr(0, argsContent.length - 1);
    argsContent += "\r\n\r\n};\r\n";

    interfaceContent = interfaceContent.trim();
    interfaceContent = interfaceContent.substr(0, argsContent.length - 1);
    interfaceContent += "\r\n}\r\n";

    console.log("-------------------------------------");
    console.log(argsContent);
    console.log("-------------------------------------");
    console.log(interfaceContent);
    console.log("-------------------------------------");

    return true;
}
