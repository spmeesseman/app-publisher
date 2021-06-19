
import { properCase, isString, editFile } from "./utils";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import * as path from "path";
const execa = require("execa");
import { EOL } from "os";
import getLogger from "./get-logger";


function containsValidSubject(options, line: string): boolean
{
    let valid = false;

    if (!line) {
        return valid;
    }

    valid = (line.includes("Build System") || line.includes("Chore") || line.includes("Documentation") ||
            line.includes("Feature") || line.includes("Bug Fix") || line.includes("Performance") ||
            line.includes("Ongoing Progress") || line.includes("Refactoring") || line.includes("Code Styling") ||
            line.includes("Tests") || line.includes("Project Structure") || line.includes("Project Layout") ||
            line.includes("Visual") || line.startsWith("Fix") || line.startsWith("General") ||
            line.startsWith("Continuous Integration"));

    if (!valid && options.commitMsgMap)
    {
        Object.entries(options.commitMsgMap).forEach((keys) =>
        {
            const property = keys[0],
                    value: any = keys[1];
            if (line.includes(value.formatText))
            {
                valid = true;
            }
        });
    }

    return valid;
}


/**
 * Gets version from changelog file by looking at the 'title' of the lastentry
 * @param param0 context
 */
export async function getVersion({ options, logger })
{
    const contents = options.historyFile ?
                        getHistory({ options, logger, lastRelease: {} }, 1) :
                        await getChangelog({ options, logger, lastRelease: {} }, 1);
    const index1 = contents.indexOf(`>${options.versionText}&nbsp;`, 0) + options.versionText.length + 7;
    const index2 = contents.indexOf("<br>", index1);
    const curversion = (contents as string).substring(index1, index2 - index1);
    logger.log(`   Found version ${curversion}`);
    return curversion;
}


/**
 * Creates a changelog entry for the history/changelog file using the commits list
 * @param param0 context
 */
export function createSectionFromCommits({ options, commits, logger })
{
    let comments = "";
    let commentNum = 1;

    if (!commits || commits.length === 0) {
        return comments;
    }

    //
    // Parse the commit messages
    //
    for (const commit of commits)
    {
        if (!commit || !commit.message) {
            continue;
        }

        let msg = commit.message.trim();
        const msgLwr = msg.toLowerCase();

        let customIgnoreFound = false;

        if (options.commitMsgMap)
        {
            Object.entries(options.commitMsgMap).forEach((keys) =>
            {
                const property = keys[0],
                        value: any = keys[1];
                if (msgLwr.startsWith(value.name) && !value.include) {
                    customIgnoreFound = true;
                }
            });
        }

        if (customIgnoreFound) {
            continue;
        }

        if (msgLwr && !msgLwr.startsWith("chore") && !msgLwr.startsWith("progress") && !msgLwr.startsWith("style") && !msgLwr.startsWith("project"))
        {   //
            // Remove CI related tags
            //
            msg = msg.replace("[skip-ci] ", "");
            msg = msg.replace(" [skip-ci]", "");
            msg = msg.replace("[skip-ci]", "");
            msg = msg.replace("[skip ci]", "");
            msg = msg.replace(" [skip ci]", "");
            msg = msg.replace("[skip ci]", "");
            //
            // Replace commit tags with full text (non-scoped)
            //
            // Commit tags should be at the start of the commit message.
            //
            // Examples of commit tags:
            //
            //     feat: add internet explorer support
            //
            msg = msg.replace("build: ", `Build System${EOL}${EOL}`);
            msg = msg.replace("chore: ", `Chore${EOL}${EOL}`);
            msg = msg.replace("ci: ", `Continuous Integration${EOL}${EOL}`);
            msg = msg.replace("docs: ", `Documentation${EOL}${EOL}`);
            msg = msg.replace("doc: ", `Documentation${EOL}${EOL}`);
            msg = msg.replace("minfeat: ", `Feature${EOL}${EOL}`);
            msg = msg.replace("featmin: ", `Feature${EOL}${EOL}`);
            msg = msg.replace("feat: ", `Feature${EOL}${EOL}`);
            msg = msg.replace("fix: ", `Bug Fix${EOL}${EOL}`);
            msg = msg.replace("perf: ", `Performance${EOL}${EOL}`);
            msg = msg.replace("perfmin: ", `Performance${EOL}${EOL}`);
            msg = msg.replace("minperf: ", `Performance${EOL}${EOL}`);
            msg = msg.replace("progress: ", `Ongoing Progress${EOL}${EOL}`);
            msg = msg.replace("refactor: ", `Refactoring${EOL}${EOL}`);
            msg = msg.replace("style: ", `Code Styling${EOL}${EOL}`);
            msg = msg.replace("test: ", `Tests${EOL}${EOL}`);
            msg = msg.replace("tweak: ", `Refactoring${EOL}${EOL}`);
            msg = msg.replace("project: ", `Project Structure${EOL}${EOL}`);
            msg = msg.replace("layout: ", `Project Layout${EOL}${EOL}`);
            msg = msg.replace("visual: ", `Visual${EOL}${EOL}`);
            msg = msg.replace("misc: ", `Miscellaneous${EOL}${EOL}`);
            //
            // Replace commit tags with full text (scoped)
            //
            // A tag can be scoped, for example:
            //
            //     fix(footpedal): pressing multiple buttons at same time breaks audio player
            //
            msg = msg.replace("build(", "Build System(");
            msg = msg.replace("chore(", "Chore(");
            msg = msg.replace("ci(", "Continuous Integration(");
            msg = msg.replace("docs(", "Documentation(");
            msg = msg.replace("doc(", "Documentation(");
            msg = msg.replace("featmin(", "Feature(");
            msg = msg.replace("minfeat(", "Feature(");
            msg = msg.replace("feat(", "Feature(");
            msg = msg.replace("fix(", "Bug Fix(");
            msg = msg.replace("perf(", "Performance(");
            msg = msg.replace("perfmin(", "Performance(");
            msg = msg.replace("minperf(", "Performance(");
            msg = msg.replace("refactor(", "Refactoring(");
            msg = msg.replace("project(", "Project Structure(");
            msg = msg.replace("test(", "Tests(");
            msg = msg.replace("tweak(", "Refactoring(");
            msg = msg.replace("style(", "Code Styling(");
            msg = msg.replace("layout(", "Project Layout(");
            msg = msg.replace("visual(", "Visual(");
            msg = msg.replace("progress(", "Ongoing Progress(");
            msg = msg.replace("misc(", "Miscellaneous(");

            if (options.commitMsgMap)
            {
                Object.entries(options.commitMsgMap).forEach((keys) =>
                {
                    const property = keys[0],
                            value: any = keys[1];
                    msg = msg.replace(value.name + ": ", value.formatText + EOL + EOL);
                    msg = msg.replace(value.name + "(", value.formatText + "(");
                });
            }

            //
            // Take any parenthesized scopes, remove the parenthesis and line break the message
            // that follows
            //
            let newText,
                match: RegExpExecArray;
            while ((match = /[^ ][(][a-z0-9\- ]*[)]\s*[:][ ]{0,}/m.exec(msg)) !== null) // subject - all lower case, or numbers
            {
                newText = match[0].replace("(", "");
                newText = newText.replace(")", "");
                newText = newText.replace(":", "").trim();
                if (newText.toLowerCase() === "ap") {
                    newText = "App-Publisher";
                }
                newText = properCase(newText); // title case
                msg = msg.replace(match[0], `:  ${newText}${EOL}${EOL}`);
            }

            while ((match = /[^ ][(][a-z\- _.A-Z]*[)]\s*[:][ ]{0,}/m.exec(msg)) !== null) // scope - all thats left (all caps or user formatted)
            {
                newText = match[0].replace("(", "");
                newText = newText.replace(")", "");
                newText = newText.replace(":", "").trim();
                if (newText.toLowerCase() === "ap") {
                    newText = "App-Publisher";
                }
                msg = msg.replace(match[0], `:  ${newText}${EOL}${EOL}`);
            }
            //
            // Take ticket// tags and put them on separate line at bottom of message, skip tags already on
            // their own line
            //
            while ((match = /[ ]{0,1}\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/i.exec(msg)) !== null)
            {
                newText = match[0].toLowerCase();
                if (newText.includes("fixed ")) {
                    newText = newText.replace("fixed ", "fixes ");
                }
                else if (newText.includes("fix ")) {
                    newText = newText.replace("fix ", "fixes ");
                }
                else if (newText.includes("closed ")) {
                    newText = newText.replace("closed ", "closes ");
                }
                else if (newText.includes("close ")) {
                    newText = newText.replace("close ", "closes ");
                }
                else if (newText.includes("resolved ")) {
                    newText = newText.replace("resolved ", "resolves ");
                }
                else if (newText.includes("resolve ")) {
                    newText = newText.replace("resolve ", "resolves ");
                }
                else if (newText.includes("reference ")) {
                    newText = newText.replace("reference ", "references ");
                }
                else if (newText.includes("refs ")) {
                    newText = newText.replace("refs ", "references ");
                }
                else if (newText.includes("ref ")) {
                    newText = newText.replace("ref ", "reference ");
                }
                else if (newText.includes("bugs ")) {
                    newText = "bug ";
                }
                else if (newText.includes("issues ")) {
                    newText = "issue ";
                }
                newText = properCase(newText).trim();
                msg = msg.replace(match[0], `${EOL}${EOL}${newText}`);
                msg = msg.replace(EOL + EOL + EOL, EOL + EOL);
                msg = msg.replace("\n\r\n\r\n", "\r\n\r\n");
            }
            //
            // Typically when writing the commit messages all lowercase is used.  Capitalize the first
            // letter following the commit message tag
            //
            while ((match = /[\r\n]{2}\s*[a-z]/m.exec(msg)) !== null) {
                if (match[0].includes(`${EOL}${EOL}`)) { // ps regex is buggy on [\r\n]{2}
                    msg = msg.replace(match[0], match[0].toUpperCase());
                }
            }

            //
            // Capitalize first word
            //
            let idx;
            const msg1 = msg.substring(0, 1).toUpperCase(),
                  msg2 = msg.substring(1);
            msg = msg1 + msg2;

            //
            // Initialize new line broken entry
            //
            let line = "";

            //
            // Order the entries in an ordered list, 1., 2., 3., etc...
            //
            if (commentNum < 10) {
                line = `${commentNum}.  `;
            }
            else {
                line = `${commentNum}. `;
            }

            //
            // Format the messages to the maximum line length for each line, breaking up lines longer
            // than $LineLen
            //
            const msgLines = msg.split("\n");
            for (let i = 0; i < msgLines.length; i++)
            {
                let indented: string | boolean = "";

                if (i > 0) {
                    line += EOL;
                }

                let msgPart = msgLines[i];

                //
                // If this message line is longer than $LineLen - 4, break it up
                // (allow 4 spaces or numbered item 1.  , 2.  , etc)
                //
                const l = options.lineLen - 4;
                if (msgPart.length > l)
                {
                    idx = msgPart.lastIndexOf(" ", l);
                    let partLine = msgPart.substring(0, idx);
                    while (partLine.length > l)
                    {
                        idx = msgPart.lastIndexOf(" ", partLine.length - 1);
                        partLine = msgPart.substring(0, idx).trim();
                    }

                    //
                    // Check indentation, don't trim the leading spaces of a purposely indented line
                    //
                    if (partLine.startsWith("   "))
                    {   //
                        // Record the number of spaces in the indentation to apply to any broken lines
                        //
                        for (let j = 0; j < partLine.length; j++)
                        {
                            if (partLine[j] === " ") {
                                indented += " ";
                            }
                            else {    // unordered list?
                                if (partLine[j] === "*") {
                                    indented +=  "  ";
                                }
                                else { // numbered list?
                                    if (/[1-9](\.|\))/.exec(partLine.substring(j, 2))) {
                                        indented +=  "   ";
                                    }
                                }
                                break;
                            }
                        }
                        line += partLine.trimRight();
                    }
                    else {
                        line += partLine.trim();
                    }

                    //
                    // Keep going until we've broken the whole message line down...
                    //
                    while (msgPart.length > l)
                    {
                        msgPart = msgPart.substring(idx + 1); // use 'idx+1' since char at idx is always a space char
                        line += EOL;
                        if (msgPart.length > l && msgPart.lastIndexOf(" ") !== -1)
                        {
                            idx = msgPart.lastIndexOf(" ", l - indented.length);
                            partLine = msgPart.substring(0, idx);
                            while (partLine.length > l)
                            {
                                idx = msgPart.lastIndexOf(" ", partLine.length - 1);
                                partLine = msgPart.substring(0, idx);
                            }
                            //
                            // Don't trim the leading spaces of a purposely indented line
                            //
                            if (indented !== "")
                            {
                                line += (indented + partLine.trim());
                            }
                            else {
                                line += partLine.trim();
                            }
                        }
                        else {
                            //
                            // Don't trim the leading spaces of a purposely indented line
                            //
                            line += (indented + msgPart.trim());
                            indented = "";
                        }
                    }
                }
                else {
                    indented = "";
                    //
                    // Don't trim the leading spaces of a purposely indented line
                    //
                    if (msgPart.startsWith("   ")) {
                        indented = true;
                        line += msgPart.trimRight();
                    }
                    else {
                        line += msgPart.trim();
                    }
                }
            }

            //
            // Space all lines lined up with first to the right of the bullet number, ie:
            //
            //     1.  This is line 1
            //
            //         Line2 needs to be moved right 4 spaces from line beginnign to line it up with line1
            //
            //     2.  .......
            //
            idx = line.indexOf("\n");
            if (idx === -1)
            {   //
                // Auto append '.' to single lines if there isn't one already, and the line isn't ended
                // with a boxed tag, e.g. [skip ci] , [fixes //333] , etc
                //
                line = line.trimRight();
                if (!line.endsWith(".") && !line.endsWith("]")) {
                    line = `${line}.`;
                }
            }
            else {
                let lCt = 0;
                while (idx !== -1)
                {
                    ++lCt;
                    line = line.substring(0, idx + 1) + "    " + line.substring(idx + 1);
                    idx = line.indexOf("\n", idx + 1);
                }
                if (lCt === 2)
                {
                    if (/^[1-9]{1,2}\. /.exec(line))
                    {   //
                        // Auto append '.' to single lines if there isn't one already, and the line isn't ended
                        // with a boxed tag, e.g. [skip ci] , [fixes //333] , etc
                        //
                        line = line.trimRight();
                        if (!line.endsWith(".") && !line.endsWith("]")) {
                            line = `${line}.`;
                        }
                    }
                }
            }

            comments = comments + line + EOL + EOL;
            commentNum++;
        }
    }

    //
    // Format the commit messages before adding to the hostory file
    //
    comments = comments.replace("\n\n", EOL + EOL);

    //
    // Use two new lines after new section
    //
    if (!comments.endsWith(EOL + EOL)) {
        comments = comments + EOL;
    }

    //
    // Perform spell checking (currently the projectoxford has been taken down after the
    // Microsoft deal with the facial rec api)
    //
    // comments = CheckSpelling comments false

    return comments;
}


function getEmailHeader(options: any, version: string)
{
    let szHrefs = "";

    if (options.distRelease || options.npmRelease || options.nugetRelease || options.historyHref || (options.mantisbtRelease === "Y" && options.mantisbtUrl))
    {
        szHrefs = "<table>";

        szHrefs += "<tr><td colspan=\"2\"><b>$project $options.versionText version has been released.</b><br><br></td></tr>";

        if (options.mantisbtRelease === "Y" && options.mantisbtUrl) {
            szHrefs += `<tr><td>Release Page</td><td style="padding-left:10px"><a href="${options.mantisbtUrl}/set_project.php?project=${options.projectName}&make_default=no&ref=plugin.php%3Fpage=Releases%2Freleases\">Releases - Projects Board</a></td></tr>`;
        }

        if (options.distRelease)
        {
            const targetLoc = path.join(options.distReleasePath, options.projectName, version);
            szHrefs += `<tr><td>Network Location</td><td style="padding-left:10px"><a href="${targetLoc}">Network Drive Location</a></td></tr>`;
        }

        if (options.npmRelease)
        {
            let npmLocation;
            if (options.npmScope) {
                npmLocation = `${options.npmRegistry}/-/web/detail/$NPMSCOPE/${options.projectName}`;
            }
            else {
                npmLocation = `${options.npmRegistry}/-/web/detail/${options.projectName}`;
            }
            szHrefs += `<tr><td>NPM Location</td><td style="padding-left:10px"><a href="${npmLocation}">NPM Registry</a></td></tr>`;
        }

        if (options.nugetRelease)
        {
            szHrefs += `<tr><td>Nuget Location</td><td style="padding-left:10px"><a href="${options.nugetRelease}">Nuget Registry</a></td></tr>`;
        }

        //
        // history file
        //
        if (options.historyHref) {
            szHrefs += `<tr><td>Complete History</td><td style="padding-left:10px">${options.historyHref}</td></tr>`;
        }
        else if (options.distReleasePath && !options.distReleasePath.includes("http://") && !options.distReleasePath.includes("https://")) {
            szHrefs += `<tr><td>Complete History</td><td style="padding-left:10px"><a href="${options.distReleasePath}/history.txt">History File - Filesystem Storage</a></td></tr>`;
        }
        else if (options.mantisbtRelease === "Y" && options.mantisbtUrl && options.vcWebPath) {
            szHrefs += `<tr><td>Complete History</td><td style="padding-left:10px"><a href="${options.mantisbtUrl}/plugin.php?page=IFramed/main?title=History&url=${options.vcWebPath}%2F${options.projectName}%2Ftrunk%2Fdoc%2Fhistory.txt">History File - Projects Board</a></td></tr>`;
        }

        for (const emailHref of options.emailHrefs)
        {
            let eLink = emailHref;
            let eLinkName = emailHref;
            let eLinkDescrip = "";
            if (emailHref.includes("|"))
            {
                const emailHrefParts = emailHref.split("|");
                eLink = emailHrefParts[0];
                eLinkDescrip = emailHrefParts[1];
                if (emailHrefParts.length > 2) {
                    eLinkName = emailHrefParts[2];
                }
                szHrefs += `<tr><td>${eLinkDescrip}</td><td style="padding-left:10px"><a href="${eLink}"${eLinkName}</a></td></tr>`;
            }
        }

        szHrefs += "</table>";
    }

    return szHrefs;
}


function getChangelogTypes(changeLog: string)
{
    const changelogTypes = [];

    let match: RegExpExecArray;
    while ((match = /\w*(?<=### ).+?(?=(<br>-))/m.exec(changeLog)) !== null)
    {
        let section = match[0];
        //
        // Trim plurality
        //
        if (section.endsWith("es<br>") && section !== "Features<br>") {
            section = section.substring(0, section.length - 6);
        }
        else if (section.endsWith("s<br>") && section !== "Miscellaneous<br>") {
            section = section.substring(0, section.length - 5);
        }
        //
        // count the messages for each section and add the subjects to the types array
        //
        let match2: RegExpExecArray;
        while ((match2 = /\w*(?<=section).+?(?=(<br>###|$))/m.exec(changeLog)) !== null)
        {
            let i1 = match2[0].indexOf("<br>- ");
            while (i1 !== -1) {
                changelogTypes.push(section.replace("<br>", "").trim());
                i1 = match2[0].indexOf("<br>- ", i1 + 1);
            }
        }
    }

    return changelogTypes;
}


export async function getChangelog({ options, logger, lastRelease }, numsections: number, listOnly: boolean | string = false, includeEmailHdr = false)
{
    //
    // Make sure user entered correct cmd line params
    //
    if (!options.changelogFile || !existsSync(options.changelogFile)) {
        logger.error("Error: No changelog file specified");
        throw new Error("160");
    }

    if (!options.versionText) {
        options.versionText = "Version";
    }

    logger.log("Extract from changelog markdown file");
    logger.log(`   Input File         : '${options.changelogFile}'`);
    logger.log(`   Num Sections       : '${numsections}'`);
    logger.log(`   Version string     : '${options.versionText}'`);
    logger.log(`   List only          : '${listOnly}'`);
    logger.log(`   Target Location    : '${options.distReleasePath}'`);
    logger.log(`   NPM                : '${options.npmRelease}'`);
    logger.log(`   Nuget              : '${options.nugetRelease}'`);
    logger.log(`   MantisBT release   : '${options.mantisbtRelease}'`);
    logger.log(`   MantisBT url       : '${options.mantisbtUrl}'`);
    logger.log(`   History file href  : '${options.historyHref}'`);
    logger.log(`   Email hrefs        : '${options.emailHrefs}'`);
    logger.log(`   Vc web path        : '${options.vcWebPath}'`);
    logger.log(`   Include email hdr  : '${includeEmailHdr}'`);

    //
    // Code operation:
    //
    // Open the file
    //
    // Find the following string structure for the last entry:
    //
    //    //// Version 1.5.14 (June 27th, 2019)
    //
    //    ### Subject line....
    //
    //    - commit message 1
    //    - commit message 2
    //
    //    ### Subject 2 line...
    //
    //    - commit message 3
    //

    //
    // Extract the specified version entry, which in changelog convention should be at top of file
    //

    //
    // Read in contents of file
    //
    let contents: string | any[] = readFileSync(options.changelogFile).toString();

    //
    // Initialize parsing variables
    //
    let index1 = 0, index2 = 0;

    index1 = contents.indexOf(`## ${options.versionText} ${lastRelease.version}`);
    if (index1 === -1) {
        logger.log("Section could not be found, exit");
        throw new Error("165");
    }
    index2 = contents.indexOf(`## ${options.versionText} `, index1 + 1);
    if (index2 === -1) {
        index2 = contents.length;
    }
    logger.log("Found version section(s)");
    contents = contents.substring(index1, index2 - index1);

    if (isString(listOnly) && listOnly === "parts")
    {
        logger.log("Determining changelog parts");

        const typeParts = [];
        const msgParts = [];

        contents = contents.replace(EOL, "<br>");
        contents = contents.replace("\n", "<br>");
        contents = contents.replace("\t", "&nbsp;&nbsp;&nbsp;&nbsp;");

        typeParts.push(...getChangelogTypes(contents));
        if (typeParts.length === 0) {
            throw new Error("166");
        }

        let match: RegExpExecArray;
        while ((match = /\w*(?<=^|>)(- ){1}.+?(?=(<br>-|<br>##|$))/m.exec(contents)) !== null)
        {
            let value = match[0].substring(2);
            value = value.replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;[", "<br>["); // ticket tags
            if (value.startsWith("<br>")) {
                value = value.substring(4);
            }
            if (value.endsWith("<br>")) {
                value = value.substring(0, value.length - 4);
            }
            msgParts.push(value.trim());
        }

        contents = [];

        if (msgParts.length !== typeParts.length) {
            logger.error("Error parsing changelog for commit parts");
            logger.error("Message parts array length $(msgParts.length) is less than types array length $(typeParts.length)");
            throw new Error("167");
        }

        for (let i = 0; i < typeParts.length; i++)
        {
            let scope = "";
            let tickets = "";
            const subject = typeParts[i];
            let message = msgParts[i];
            if (msgParts[i].includes(":")) {
                scope = msgParts[i].substring(0, msgParts[i].indexOf(":")).replace("**", "").trim();
                message = msgParts[i].substring(msgParts[i].indexOf(":") + 1).replace("**", "").trim();
            }
            while ((match = /\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/mi.exec(msgParts[i])) !== null)
            {
                tickets = match[0];
                tickets = match[0].replace("[", "").replace("]", "").trim();
                tickets = properCase(tickets.replace("&nbsp;", " "));
                message = message.replace("<br><br>" + match[0], "");
                message = message.replace("<br>" + match[0], "").trim();
                message = message.replace("&nbsp;&nbsp;&nbsp;&nbsp;" + match[0], "").trim();
                message = message.replace("&nbsp;&nbsp;&nbsp;" + match[0], "").trim();
                message = message.replace("&nbsp;&nbsp;" + match[0], "").trim();
                message = message.replace("&nbsp;" + match[0], "").trim();
                message = message.replace(" " + match[0], "").trim();
                message = message.replace(match[0], "").trim();
            }
            contents.push({ subject, scope, message, tickets });
        }

        return contents;
    }

    //
    // Convert to html
    //
    const clFile = `${process.env.Temp}/changelog.md`;
    contents = contents.replace(EOL, "\n");
    writeFileSync(clFile, contents);
    contents = await execa.stdout("marked", ["--breaks", "--gfm", "--file", clFile]);
    unlinkSync(clFile);

    if (includeEmailHdr === true)
    {
        const szHrefs = getEmailHeader(options, lastRelease.version);
        contents = szHrefs + contents;
    }

    logger.success("Successful");

    return contents;
}


export function getHistory({ options, logger, lastRelease }, numsections: number, listOnly: boolean | string = false, includeEmailHdr = false)
{
    const szInputFile = options.historyFile;
    const iNumberOfDashesInVersionLine = 20;
    let szFinalContents = "";
    //
    // Make sure user entered correct cmd line params
    //
    if (!szInputFile || !existsSync(szInputFile)) {
        logger.error("History file does not exist");
        return szFinalContents;
    }

    logger.log("Extract from history.txt file");
    logger.log(`   Input File         : '${szInputFile}'`);
    logger.log(`   Num Sections       : '${numsections}'`);
    logger.log(`   Version string     : '${options.versionText}'`);
    logger.log(`   List only          : '${listOnly}'`);
    logger.log(`   Target Location    : '${options.distReleasePath}'`);
    logger.log(`   NPM                : '${options.npmRelease}'`);
    logger.log(`   Nuget              : '${options.nugetRelease}'`);
    logger.log(`   MantisBT release   : '${options.mantisbtRelease}'`);
    logger.log(`   MantisBT url       : '${options.mantisbtUrl}'`);
    logger.log(`   History file href  : '${options.historyHref}'`);
    logger.log(`   Email hrefs        : '${options.emailHrefs}'`);
    logger.log(`   Vc web path        : '${options.vcWebPath}'`);

    //
    // Code operation:
    //
    // Open the file
    //
    // Find the following string structure for the last entry:
    //
    //    Build 101
    //    April 3rd, 2015
    //    ---------------------------------------------------------------------------
    //
    // Extract the latest entry
    //

    let contents: string | any[] = "";
    //
    // Read in contents of file
    //
    contents = readFileSync(szInputFile).toString();
    //
    // Initialize parsing variables
    //
    let index1 = contents.length;
    let index2 = 0;
    let bFoundStart = 0;
    let iSectionsFound = 0;
    //
    // Loop to find our search text
    //
    while (index1 >= 0)
    {
        // Get index of field name
        //
        index1 = contents.lastIndexOf(`${options.versionText} `, index1);
        //
        // make sure the field name was found
        //
        if (index1 === -1)
        {
            logger.error("   Last section could not be found (0), exit");
            throw new Error("170");
        }

        if (contents[index1 - 1] !== "\n")
        {
            index1--;
            continue;
        }
        //
        // Check to make sure this is the beginning line, if it is then 2 lines underneath
        // will be a dashed line consisting of $NumberOfDashesInVersionLine dash characters
        //
        index2 = contents.indexOf("\n", index1);
        // make sure the newline was found
        if (index2 === -1)
        {
            logger.error("   Last section could not be found (1), exit");
            throw new Error("171");
        }

        index2 = contents.indexOf("\n", index2 + 1);
        //
        // Make sure the newline was found
        //
        if (index2 === -1)
        {
            logger.error("   Last section could not be found (2), exit");
            throw new Error("172");
        }

        //
        // Increment index2 past new line and on to 1st ch in next line
        //
        index2++;
        // Now index2 should be the index to the start of a dashed line

        let numdashes = 0;
        for (numdashes = 0; numdashes < iNumberOfDashesInVersionLine; numdashes++) {
            if (contents[index2 + numdashes] !== "-") {
                break;
            }
        }
        //
        // Make sure we found our dashed line
        //
        if (numdashes === iNumberOfDashesInVersionLine) {
            bFoundStart = 1;
            iSectionsFound++;
            if (iSectionsFound >= numsections) {
                break;
            }
        }
        //
        // Decrement index1, which is the index to the start of the string "Build ", but
        // this could have occurred in the body of the text, keep searching
        //
        index1--;
    }
    //
    // Make sure we found our starting point
    //
    if (bFoundStart === 0)
    {
        logger.error("   Last section could not be found, exit");
        throw new Error("173");
    }

    logger.log("   Found version section");
    contents = contents.substring(index1);

    //
    // Replace special chars
    //
    contents = contents.replace("&", "&amp;");
    // Replace '<' and '>' with 'lt;' and 'gt;'
    contents = contents.replace("<", "&lt;");
    contents = contents.replace(">", "&gt;");
    // Replace spaces with &nbsp;
    contents = contents.replace(" ", "&nbsp;");
    contents = contents.replace(EOL, "<br>");
    //
    // Style the contents to monospace font
    //
    contents = "<font face=\"Courier New\">" + contents + "</font>";

    // index1 is our start index
    if (lastRelease.version)
    {
        logger.log("   Write header text to message");

        szFinalContents += "szHrefs<br>Most Recent History File Entry:<br><br>";
        logger.log("   Write numsections history section(s) to message");

        if (listOnly === false) {
            szFinalContents += contents;
        }
        else
        {
            let hDelimiter = "**********";
            index1 = contents.indexOf("**********");
            if (index1 === -1)
            {
                hDelimiter = "----------";
            }
            index1 = contents.indexOf(hDelimiter);
            while (index1 !== -1)
            {
                index2 = contents.indexOf("<br>", index1);
                index1 = contents.indexOf(hDelimiter, index2);
            }
            contents = contents.substring(index2 + 4);
            while (contents.startsWith("<br>")) {
                contents = contents.substring(4);
            }
            if (contents.endsWith("</font>")) {
                contents = contents.substring(0, contents.length - 7);
            }
            while (contents.endsWith("<br>")) {
                contents = contents.substring(0, contents.length - 4);
            }

            let match: RegExpExecArray;
            while ((match = /[a-zA-z0-9_\/|\"'][,.:]*(&nbsp;){0,1}<br>(&nbsp;){4}[a-zA-z0-9_\/|\"']/m.exec(contents)) !== null)
            {
                contents = contents.replace(match[0], match[0].replace("<br>&nbsp;&nbsp;&nbsp;", "")); // leave a space
            }

            // break up &nbsp;s
            while ((match = /(&nbsp;)(\w|'|\")/m.exec(contents)) !== null)
            {
                contents = contents.replace(match[0], match[0].replace("&nbsp;", " "));
            }

            // Bold all numbered lines with a subject
            while ((match = /\w*(?<=^|>)[1-9][0-9]{0,1}(&nbsp;| ){0,1}\.(&nbsp;| ).+?(?=<br>)/m.exec(contents)) !== null) {
                const value = match[0];
                if (containsValidSubject(options, value)) {
                    contents = contents.replace(value, "<b>value</b>");
                }
            }

            if (listOnly === "parts")
            {
                logger.log("   Extracting parts");

                const typeParts = [];
                const msgParts = [];

                //
                // Process entries with a subject (sorrounded by <b></b>)
                //
                while ((match = /<b>\w*(?<=^|>)[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>|<\/font>)/m.exec(contents)) !== null)
                {
                    let value = match[0].replace("&nbsp;", "").replace(".", "").replace("<b>", "").replace("</b>", "");
                    for (let i = 0; i < 10; i++) {
                        value = value.replace(i.toString(), "").trim();
                    }
                    typeParts.push(value);
                }

                contents = contents.replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;<br>", "<br><br>");
                contents = contents.replace("<br>&nbsp;&nbsp;&nbsp;<br>", "<br><br>");

                while ((match = /(<\/b>){1}(<br>){0,1}(<br>){1}(&nbsp;){2,}[ ]{1}.+?(?=<br>(&nbsp;| ){0,}<br>(<b>|[1-9][0-9]{0,1}\.(&nbsp;| ))|$)/m.exec(contents)) !== null)
                {
                    let value = match[0].replace("</b>", "");
                    value = value.replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;[", "<br>["); // ticket tags
                    value = value.replace("<br>&nbsp;&nbsp;&nbsp; ", "<br>");

                    if (containsValidSubject(options, value))
                    {
                        while (value.startsWith("<br>")) {
                            value = value.substring(4);
                        }
                        while (value.endsWith("<br>")) {
                            value = value.substring(0, value.length - 4);
                        }
                    }
                    msgParts.push(value.trim());
                }

                //
                // Non-subject entries (no <b></b> wrap)
                //
                while ((match = /\w*(?<!<b>)(\b[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>[1-9]|$|<br><b>))/m.exec(contents)) !== null) {
                    typeParts.push("");
                }

                while ((match = /\w*(?<!<b>)(\b[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>[1-9]|$|<br><b>))/m.exec(contents)) !== null)
                {
                    let value = match[0].replace("&nbsp;", "").replace(".", "").replace("<b>", "").replace("</b>", "");
                    for (let i = 0; i < 10; i++) {
                        value = value.replace(i.toString(), "").trim();
                    }
                    while (value.startsWith("<br>")) {
                        value = value.substring(4);
                    }
                    while (value.endsWith("<br>")) {
                        value = value.substring(0, value.length - 4);
                    }
                    msgParts.push(value.trim());
                }

                contents = [];
                for (let i = 0; i < typeParts.length; i++)
                {
                    let scope = "", message = "", tickets = "", subject = typeParts[i];

                    message = msgParts[i];
                    if (containsValidSubject(options, subject)) {
                        if (typeParts[i].includes(":")) {
                            subject = typeParts[i].substring(0, typeParts[i].indexOf(":")).trim();
                            scope = typeParts[i].substring(typeParts[i].indexOf(":") + 1).trim();
                        }
                    }
                    else {
                        subject = "Miscellaneous";
                        if (typeParts[i].includes(":")) {
                            scope = typeParts[i].substring(0, typeParts[i].indexOf(":")).trim();
                            message = typeParts[i].substring(typeParts[i].indexOf(":") + 1) + msgParts[i];
                        }
                        else if (!typeParts[i]) {
                            message = msgParts[i];
                        }
                        else {
                            message = typeParts[i] + msgParts[i];
                        }
                    }

                    while ((match = /\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/mi.exec(msgParts[i])) !== null) {
                        tickets = match[0];
                        tickets = match[0].replace("[", "").replace("]", "").trim();
                        tickets = properCase(tickets.replace("&nbsp;", " "));
                        message = message.replace("<br><br>" + match[0], "");
                        message = message.replace("<br>" + match[0], "").trim();
                        message = message.replace("&nbsp;&nbsp;" + match[0], "").trim();
                        message = message.replace("&nbsp;" + match[0], "").trim();
                        message = message.replace(" " + match[0], "").trim();
                        message = message.replace(match[0], "").trim();
                    }
                    contents.push({ subject, scope, message, tickets });
                }
            }

            return contents;
        }

        //
        // Reverse versions, display newest at top if more than 1 section
        //
        if (numsections > 1)
        {
            logger.log("   Re||dering " + numsections + " sections newest to oldest");

            const sections = [];

            index2 = contents.indexOf(`>${options.versionText}&nbsp;`, 0) + 1;
            for (let i = 0; i < numsections; i++)
            {
                index1 = index2;
                index2 = contents.indexOf(`>${options.versionText}&nbsp;`, index1 + 1) + 1;
                if (index2 === 0)
                {
                    index2  = contents.indexOf("</font>");
                }
                sections.push(contents.substring(index1, index2 - index1));
            }
            contents = "";
            for (let i = numsections - 1; i >= 0; i--)
            {
                contents += sections[i];
                if (contents.substring(contents.length - 12) !== "<br><br><br>")
                {
                    contents += "<br>";
                }
            }
            szFinalContents = "<font face=\"Courier New\" style=\"font-size:12px\">" + contents + "</font>";
        }
    }

    if (includeEmailHdr === true)
    {
        const szHrefs = getEmailHeader(options, lastRelease.version);
        contents = szHrefs + contents;
    }

    logger.success("   Successful");

    return [ szFinalContents ];
}


function getFormattedDate()
{
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let fmtDate = "";
    const date = new Date(),
          month = monthNames[date.getMonth()],
          year = date.getFullYear();
    let day = date.getDay().toString();

    if (day === "11" || day === "12" || day === "13")
    {
        day = `${day}th`;
    }
    else
    {
        switch (day[day.length - 1])
        {
            case "1": day = `${day}st`; break;
            case "2": day = `${day}nd`; break;
            case "3": day = `${day}rd`; break;
            default: day = `${day}th`; break;
        }
    }
    fmtDate = `${month} ${day}, ${year}`;
    return fmtDate;
}


function getFormattedSubject({options}, subject: string)
{
    let formattedSubject = subject.toLowerCase();

    switch (formattedSubject)
    {
        case "build"   : formattedSubject = "Build System"; break;
        case "chore"   : formattedSubject = "Chores"; break;
        case "ci"      : formattedSubject = "Continuous Integration"; break;
        case "docs"    : formattedSubject = "Documentation"; break;
        case "doc"     : formattedSubject = "Documentation"; break;
        case "feat"    : formattedSubject = "Features"; break;
        case "feature" : formattedSubject = "Features"; break;
        case "featmin" : formattedSubject = "Features"; break;
        case "fix"     : formattedSubject = "Bug Fixes"; break;
        case "layout"  : formattedSubject = "Project Layout"; break;
        case "minfeat" : formattedSubject = "Features"; break;
        case "perf"    : formattedSubject = "Performance Enhancements"; break;
        case "perfmin" : formattedSubject = "Performance Enhancements"; break;
        case "minperf" : formattedSubject = "Performance Enhancements"; break;
        case "progress": formattedSubject = "Ongoing Progress"; break;
        case "project" : formattedSubject = "Project Structure"; break;
        case "refactor": formattedSubject = "Refactoring"; break;
        case "style"   : formattedSubject = "Code Styling"; break;
        case "test"    : formattedSubject = "Tests"; break;
        case "tweak"   : formattedSubject = "Refactoring"; break;
        case "visual"  : formattedSubject = "Visuals"; break;
        default   : formattedSubject = subject; break;
    }

    if (options.commitMsgMap)
    {
        Object.entries(options.commitMsgMap).forEach((keys) =>
        {
            if (subject === keys[0])
            {
                formattedSubject = (keys[1] as any).formatText;
            }
        });
    }

    return formattedSubject;
}


export function doChangelogFileEdit({ options, commits, logger, lastRelease, nextRelease, env })
{
    const fmtDate = getFormattedDate(),
          doChangelog = options.taskChangelog || options.taskChangelogView || options.taskChangelogFile || !options.taskMode;

    if (options.changelogFile && doChangelog)
    {
        if (options.taskChangelogFile)
        {
            options.changelogFile = options.taskChangelogFile;
            if (existsSync(options.changelogFile))
            {
                unlinkSync(options.changelogFile);
            }
        }
        else if (options.taskMode && !options.taskChangelog)
        {
            options.changelogFile = path.join(env.Temp, `history.${nextRelease.version}.txt`);
            if (existsSync(options.changelogFile))
            {
                unlinkSync(options.changelogFile);
            }
        }

        //
        // If changelog markdown file doesnt exist, create one with the project name as a title
        //
        let newChangelog = false;
        const changeLogPath = path.dirname(options.changelogFile);

        if (changeLogPath !== "" && !existsSync(changeLogPath))
        {
            logger.log("Creating changeLog file directory");
            mkdirSync(changeLogPath, { mode: 0o777 });
        }

        if (!existsSync(options.changelogFile))
        {
            logger.log("Creating changelog file directory and adding to version control");
            if (!options.taskChangelog)
            {
                writeFileSync(options.changelogFile, options.projectName + EOL + EOL);
            }
            else
            {
                writeFileSync(options.changelogFile, "");
            }
            newChangelog = true;
        }

        if ((lastRelease.version !== nextRelease.version || newChangelog || options.taskMode))
        {
            let tmpCommits = "",
                lastSection = "",
                sectionless = [];
            const changelogTitle = `# ${options.projectName} Change Log`.toUpperCase();

            logger.log("Preparing changelog file");
            //
            // Touch changelog file with the latest commits
            //
            // Add lines 'version', 'date', then the header content
            //
            if (!newChangelog) {
                tmpCommits = "\r\n";
            }
            tmpCommits += `## $VERSIONTEXT $VERSION (${fmtDate})\r\n`;
            //
            // Loop through the commits and build the markdown for appending to the changelog
            //
            for (const commit of commits)
            {
                let scope = "",
                    section: string;
                let tmpCommit = commit.trim();
                tmpCommit = tmpCommit.replace("\n", "\r\n");
                const idx1 = tmpCommit.indexOf("("),
                      idx2 = tmpCommit.indexOf(":");
                //
                // If there is no subject, then store the message in an array to process after
                // all of the commits with subject headers are processed.
                //
                // If the subject contains a scope, for example:
                //
                //     docs(readme)
                //
                // Then extract "readme" as the scope, and "docs" as the subject
                //
                if (idx2 === -1) {
                    sectionless += commit;
                    continue;
                }
                else if (idx1 !== -1 && idx1 < idx2) {
                    section = tmpCommit.SubString(0, idx1).TrimEnd();
                    scope = properCase(tmpCommit.SubString(idx1 + 1, tmpCommit.indexOf(")") - idx1 - 1).toLowerCase().trim());
                }
                else {
                    section = properCase(tmpCommit.SubString(0, idx2).toLowerCase().TrimEnd());
                }
                //
                // Ignore chores, progress, and custom specified psubjects to ignore
                //
                if (section.toLowerCase() === "chore" || section.toLowerCase() === "progress" ||
                    section.toLowerCase() === "project" || section.toLowerCase() === "style") {
                    continue;
                }
                let doContinue = false;
                if (options.commitMsgMap)
                {
                    Object.entries(options.commitMsgMap).forEach((keys) =>
                    {
                        if (section.toLowerCase() === keys[0] && !(keys[1] as any).include) {
                            doContinue = true;
                        }
                    });
                }
                if (doContinue) {
                    continue;
                }
                tmpCommit = tmpCommit.SubString(idx2 + 1).trim();
                //
                // Print out the subject as a title if it is different than the previous sections
                // title.  Comments are alphabetized.
                //
                if (section !== lastSection) {
                    const tmpSection = getFormattedSubject({options}, section);
                    tmpCommits += `${EOL}### ${tmpSection}${EOL}${EOL}`;
                }
                //
                // Start the comment list item, add scope in bold if necessary
                //
                tmpCommits += "- ";
                if (scope !== "") {
                    tmpCommits += "**scope`:** ";
                }
                //
                // FOr multi-line comments, do some special processing
                //
                if (tmpCommit.Contains(EOL))
                {
                    const tmpCommitParts = tmpCommit.Split(EOL);
                    tmpCommits += tmpCommitParts[0];
                    for (let i = 1; i < tmpCommitParts.Length; i++)
                    {
                        if (tmpCommitParts[i] === "") {
                            continue;
                        }
                        tmpCommits += `${EOL}${EOL}\t${tmpCommitParts[i]}${EOL}`;
                    }
                    tmpCommits += EOL;
                }
                else {
                    tmpCommits += `${tmpCommit}${EOL}`;
                }
                //
                // Record last subject, we only print the subject when it differes from previous
                //
                lastSection = section;
            }
            //
            // Add any commits that did not contain a conventional commit subject
            //
            if (sectionless.length > 0)
            {
                tmpCommits += `${EOL}### Other Notes${EOL}${EOL}`;
                for (const commit of sectionless)
                {
                    tmpCommits += `- ${commit}\r\n`;
                }
            }
            //
            // Perform spell checking (currently the projectoxford has been taken down after the
            // Microsoft deal with the facial rec api)
            //
            // tmpCommits = CheckSpelling tmpCommits $false
            //
            // Write the formatted commits text to the top of options.changelogFile, but underneath the
            // changelog title
            //
            tmpCommits = tmpCommits.trim();
            let changeLogContents = readFileSync(options.changelogFile).toString();
            changeLogContents = changeLogContents.replace(changelogTitle, "").trim();
            let changeLogFinal = `${changelogTitle}${EOL}${EOL}`;
            if (tmpCommits) {
                changeLogFinal = `${changeLogFinal}${tmpCommits}${EOL}${EOL}`;
            }
            if (changeLogContents) {
                changeLogFinal = `${changeLogFinal}${changeLogContents}${EOL}`;
            }
            writeFileSync(options.changelogFile, changeLogFinal);
        }
        else {
            logger.warn("Version match, not touching changelog file");
        }

        //
        // Allow manual modifications to history file
        //
        if (!options.taskChangelog && !options.taskCommit)
        {
            editFile({options}, options.historyFile, true, options.skipChangelogEdits === "Y");
        }
        else if (options.taskCommit) {
            editFile({options}, options.historyFile, false, true);
        }
        else {
            //
            // TODO - Cut just the version from the content, remove all the *** garb
            //
            const fileSpec = !!options.taskChangelogFile;
            editFile({options}, options.historyFile, false, fileSpec, true);
        }
    }
}

export function doHistoryFileEdit({ options, commits, logger, lastRelease, nextRelease, env })
{
    const fmtDate = getFormattedDate(),
          doChangelog = options.taskChangelog || options.taskChangelogView || options.taskChangelogFile || !options.taskMode;

    logger.log("Do cl / history file : " + doChangelog);

    //
    // Process options.historyFile
    //
    if (options.historyFile && doChangelog)
    {
        if (options.taskChangelogFile)
        {
            options.historyFile = options.taskChangelogFile;
            if (existsSync(options.historyFile))
            {
                unlinkSync(options.historyFile);
            }
        }
        else if (options.taskMode && !options.taskChangelog)
        {
            options.historyFile = path.join(env.Temp, `history.${nextRelease.version}.txt`);
            if (existsSync(options.historyFile))
            {
                unlinkSync(options.historyFile);
            }
        }

        //
        // If history file doesnt exist, create one with the project name as a title
        //
        let isNewHistoryFile = false,
            isNewHistoryFileHasContent = false;
        const historyPath = path.dirname(options.historyFile);

        if (historyPath !== "" && !existsSync(historyPath))
        {
            logger.log("Creating history file directory and adding to version control");
            mkdirSync(historyPath, { mode: 0o777 });
        }

        if (!existsSync(options.historyFile))
        {
            logger.log("Creating new history file and adding to version control");
            if (!options.taskChangelog)
            {
                writeFileSync(options.historyFile, options.projectName + EOL + EOL);
            }
            else
            {
                writeFileSync(options.historyFile, "");
            }
            isNewHistoryFile = true;
        }
        else
        {   //
            // If the history file already existed, but had no entries, we need to still set the 'new' flag
            //
            const contents = readFileSync(options.historyFile).toString();
            if (contents.indexOf(options.versionText) === -1)
            {
                isNewHistoryFile = true;
                isNewHistoryFileHasContent = true;
            }
        }
        if (!existsSync(options.historyFile))
        {
            logger.error("Could not create history file, exiting");
            throw new Error("140");
        }
        if ((lastRelease.version === "1.0.0" || lastRelease.version === "0.0.1") && isNewHistoryFile)
        {
            logger.log("It appears this is the first release, resetting version");
            logger.log("   Reset to Version    : " + options.lastRelease.version);
        }
        //
        // Add the 'Version X' line, date, and commit content
        //
        if ((lastRelease.version !== nextRelease.version || isNewHistoryFile || options.taskMode))
        {
            const tmpCommits = createSectionFromCommits({ options, commits, logger});

            logger.log("Preparing history file");

            //
            // New file
            //
            if (isNewHistoryFile && !isNewHistoryFileHasContent && !options.taskChangelog) {
                const historyFileTitle = options.projectName + " History";
                appendFileSync(options.historyFile, historyFileTitle + EOL + EOL);
            }

            //
            // Touch history file with the latest version info, either update existing, or create
            // a new one if it doesnt exist
            //
            // Add lines 'version', 'date', then the header content
            //
            // Write the formatted commits text to options.historyFile
            // Formatted commits are also contained in the temp text file $Env:TEMP\history.txt
            // Replace all newline pairs with cr/nl pairs as SVN will have sent commit comments back
            // with newlines only
            //
            if (existsSync(options.historyHdrFile))
            {
                const historyHeader = readFileSync(options.historyHdrFile).toString();
                appendFileSync(options.historyFile, `${EOL}${options.versionText} ${nextRelease.version}${EOL}${fmtDate}${EOL}${historyHeader}${EOL}${tmpCommits}`);
            }
            else {
                logger.warn("History header template not found");
                appendFileSync(options.historyFile, `${EOL}${options.versionText} ${nextRelease.version}${EOL}${fmtDate}${EOL}${EOL}${EOL}${tmpCommits}`);
            }
        }
        else {
            logger.warn("Version match, not touching history file");
        }

        //
        // Allow manual modifications to history file
        //
        if (!options.taskChangelog && !options.taskCommit)
        {
            editFile({options}, options.historyFile, true, options.skipChangelogEdits === "Y");
        }
        else if (options.taskCommit) {
            editFile({options}, options.historyFile, false, true);
        }
        else {
            //
            // TODO - Cut just the version from the content, remove all the *** garb
            //
            const fileSpec = !!options.taskChangelogFile;
            editFile({options}, options.historyFile, false, fileSpec, true);
        }
    }
}