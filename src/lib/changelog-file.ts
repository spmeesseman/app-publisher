
import * as path from "path";
import { readFile, pathExists, writeFile, createDir, appendFile, deleteFile } from "./utils/fs";
import { editFile, properCase, isString } from "./utils/utils";
import { IChangelog, IChangelogEntry, ICommit, IContext } from "../interface";
const execa = require("execa");
const os = require("os"), EOL = os.EOL;


/**
 * Checks to see if a first line in a commit message contains a valid subject.
 *
 * @private
 * @since 3.0.0
 * @param options options
 * @param line commit message line containg subject
 * @returns 'true' if a valid subject is found, `false` otherwise
 */
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
            const value: any = keys[1];
            if (line.includes(value.formatText))
            {
                valid = true;
            }
        });
    }

    return valid;
}


/**
 * Creates an html changelog for use with a MantisBT or GitHub release.
 * This method extracts the notes in the hostory/changelog file for the specified
 * version to build the content.
 *
 * @param context context
 * @param version The version to extract the notes from in the history/changelog file.
 * @param useFaIcons Use font aweome icons
 * @param includeStyling include css styling
 */
async function createHtmlChangelog({ options, logger }, version: string, useFaIcons = false, includeStyling = false, inputFile?: string)
{
    let changeLog = "",
        changeLogParts: string | any[];

    logger.log("Converting changelog notes to html release notes");
    logger.log("   Version   : " + version);
    if (options.verbose) {
        logger.log("   Use icons : " + useFaIcons);
        logger.log("   Inlcude styling : " + useFaIcons);
    }

    if (options.historyFile)
    {
        if (!inputFile) {
            inputFile = options.historyFile;
        }
        changeLogParts = await getHistory({ options, logger }, version, 1, "parts", inputFile);
    }
    else if (options.changelogFile)
    {
        if (!inputFile) {
            inputFile = options.changelogFile;
        }
        changeLogParts = await getChangelog({ options, logger }, version, 1, "parts", inputFile);
    }

    if (!changeLogParts || changeLogParts.length === 0 || changeLogParts[0] === "error") {
        return changeLog;
    }

    if (includeStyling)
    {
        changeLog += "<span><style type=\"text/css\" scoped>";
        changeLog += ".changelog-table td { padding-top: 5px; padding-bottom: 5px; }";
        changeLog += ".changelog-table tr { display: tr; border-collapse: separate; border-style: solid; border-color: rgb(211, 208, 208); border-width: 0px; border-spacing: 2px; border-bottom-width: 1px !important; }";
        changeLog += "</style>";
    }

    changeLog += "<span class=\"changelog-table\">";
    changeLog += "<table width=\"100%\" style=\"display:inline\">";

    for (const commit of changeLogParts)
    {
        changeLog += "<tr>";
        if (useFaIcons)
        {
            changeLog += "<td nowrap valign=\"top\" style=\"font-weight:bold;color:#5090c1\"><b>";
            if (commit.subject.includes("Fix")) {
                changeLog += "<i class=\"fa fa-bug\"></i> ";
            }
            else if (commit.subject.includes("Feature")) {
                changeLog += "<i class=\"fa fa-plus\"></i> ";
            }
            else if (commit.subject.includes("Refactor")) {
                changeLog += "<i class=\"fa fa-recycle\"></i> ";
            }
            else if (commit.subject.includes("Visual")) {
                changeLog += "<i class=\"fa fa-eye\"></i> ";
            }
            else if (commit.subject.includes("Documentation")) {
                changeLog += "<i class=\"fa fa-book\"></i> ";
            }
            else if (commit.subject.includes("Progress")) {
                changeLog += "<i class=\"fa fa-tasks\"></i> ";
            }
            else if (commit.subject.includes("Build")) {
                changeLog += "<i class=\"fa fa-cog\"></i> ";
            }
            else {
                let iconSet = false;
                if (options.commitMsgMap)
                {
                    Object.entries(options.commitMsgMap).forEach((keys) =>
                    {
                        const property = keys[0],
                                value: any = keys[1];
                        if (!iconSet && commit.subject.includes(value.formatText) && value.iconCls)
                        {
                            changeLog += "<i class=\"fa ";
                            changeLog += value.iconCls;
                            changeLog += "\"></i> ";
                            iconSet = true;
                        }
                    });
                }
                if (!iconSet) {
                    changeLog += "<i class=\"fa fa-asterisk\"></i> ";
                }
            }
            changeLog += "</td><td nowrap valign=\"top\" style=\"font-weight:bold;padding-left:3px\">";
        }
        else {
            changeLog += "<td nowrap valign=\"top\" style=\"font-weight:bold\"><b>";
        }

        changeLog += commit.subject;
        if (commit.scope) {
            changeLog += "</b></td><td nowrap valign=\"top\" style=\"padding-left:10px\">";
            changeLog += commit.scope;
        }
        else {
            changeLog += "</td><td>";
        }
        changeLog += "</td><td width=\"100%\" style=\"padding-left:15px\">";
        changeLog += commit.message;
        if (commit.tickets) {
            changeLog += "</td><td nowrap align=\"right\" valign=\"top\" style=\"padding-left:15px;padding-right:10px\">";
            changeLog += commit.tickets;
        }
        else {
            changeLog += "</td><td>";
        }
        changeLog += "</td></tr>";
    }

    changeLog += "</table></span>";
    if (includeStyling === true)
    {
        changeLog += "</span>";
    }

    return changeLog;
}


/**
 * Creates a changelog entry for the history/changelog file using the commits list
 *
 * @since 2.8.0
 *
 * @param context context
 */
function createHistorySectionFromCommits({ options, commits, logger }: IContext)
{
    let comments = "";
    let commentNum = 1;

    if (!commits || commits.length === 0) {
        return comments;
    }

    logger.log(`Building history section from ${commits.length} commits`);

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
                const value: any = keys[1];
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
            msg = msg.replace(/[ ]*\[skip[\- ]+ci\]/, "");
            //
            // Replace commitz tags with full text (non-scoped)
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
            msg = msg.replace("featmaj: ", `Feature${EOL}${EOL}`); // needs to come baefore base feat:
            msg = msg.replace("featmin: ", `Feature${EOL}${EOL}`); // needs to come baefore base feat:
            msg = msg.replace("majfeat: ", `Feature${EOL}${EOL}`); // needs to come baefore base feat:
            msg = msg.replace("minfeat: ", `Feature${EOL}${EOL}`); // needs to come baefore base feat:
            msg = msg.replace("feat: ", `Feature${EOL}${EOL}`);
            msg = msg.replace("fix: ", `Bug Fix${EOL}${EOL}`);
            msg = msg.replace("perfmin: ", `Performance${EOL}${EOL}`); // needs to come baefore base perf:
            msg = msg.replace("minperf: ", `Performance${EOL}${EOL}`); // needs to come baefore base perf:
            msg = msg.replace("perf: ", `Performance${EOL}${EOL}`);
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
            msg = msg.replace("featmaj(", "Feature("); // needs to come baefore base feat(
            msg = msg.replace("featmin(", "Feature("); // needs to come baefore base feat(
            msg = msg.replace("majfeat(", "Feature("); // needs to come baefore base feat(
            msg = msg.replace("minfeat(", "Feature("); // needs to come baefore base feat(
            msg = msg.replace("feat(", "Feature(");
            msg = msg.replace("fix(", "Bug Fix(");
            msg = msg.replace("perfmin(", "Performance("); // needs to come baefore base perf(
            msg = msg.replace("minperf(", "Performance("); // needs to come baefore base perf(
            msg = msg.replace("perf(", "Performance(");
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
                    const value: any = keys[1];
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
            let regex = new RegExp(/(?<=[^ ])[\(][a-z0-9\- ]*[\)]\s*[:][ ]{0,}/gm);
            while ((match = regex.exec(msg)) !== null) // subject - all lower case, or numbers
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

            regex = new RegExp(/[^ ][(][a-z\- _.A-Z]*[)]\s*[:][ ]{0,}/gm);
            while ((match = regex.exec(msg)) !== null) // scope - all thats left (all caps or user formatted)
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
            regex = new RegExp(/[ ]{0,1}\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/gmi);
            while ((match = regex.exec(msg)) !== null)
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
            while ((match = /[\r\n]{2}\s*[a-z]/gm.exec(msg)) !== null) {
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
                const l = options.historyLineLen - 4;
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

    logger.log("Successfully created changelog section");
    return comments;
}


function createChangelogSectionFromCommits({ options, commits, logger }: IContext)
{
    let tmpCommits = "",
        lastSection = "";
    const sectionless: string[] = [];

    if (!commits || commits.length === 0) {
        return tmpCommits;
    }

    logger.log(`Building changelog section from ${commits.length} commits`);

    function formatCommitPart(section: string, scope: string, commitMsg: string): string
    {
        let fmtCommitMsg = "- ";

        if (!section) {
            return fmtCommitMsg + commitMsg;
        }

        section = section.toLowerCase().trim();
        scope = scope ? properCase(scope.toLowerCase().trim()) : undefined;

        //
        // Ignore chores, progress, and custom specified psubjects to ignore
        //
        if (section.toLowerCase() === "chore" || section.toLowerCase() === "progress" ||
            section.toLowerCase() === "project" || section.toLowerCase() === "style") {
            return "";
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
            return "";
        }

        //
        // Start the comment list item, add scope in bold if necessary
        //
        if (scope) {
            fmtCommitMsg += `**${scope}:** `;
        }

        //
        // Add the message that followed the subject and scope
        //
        fmtCommitMsg += commitMsg;

        //
        // For multi-line comments, do some special processing
        //
        if (fmtCommitMsg.includes(EOL))
        {
            const tmpCommitParts = fmtCommitMsg.split(EOL);
            fmtCommitMsg += tmpCommitParts[0];
            for (let i = 1; i < tmpCommitParts.length; i++)
            {
                if (tmpCommitParts[i] === "") {
                    continue;
                }
                fmtCommitMsg += `${EOL}${EOL}\t${tmpCommitParts[i]}${EOL}`;
            }
            fmtCommitMsg += EOL;
        }
        else {
            fmtCommitMsg += EOL;
        }
        //
        // Record last subject, we only print the subject when it differes from previous
        //

        //
        // Print out the subject as a title if it is different than the previous sections
        // title.  Comments are alphabetized.
        //
        if (section !== lastSection) {
            const tmpSection = getFormattedSubject({options}, section);
            fmtCommitMsg = `${EOL}### ${tmpSection}${EOL}${EOL}${fmtCommitMsg}`;
        }
        lastSection = section;
        return fmtCommitMsg;
    }

    //
    // Loop through the commits and build the markdown for appending to the changelog
    //
    for (const commit of commits)
    {
        if (!commit || !commit.message) {
            continue;
        }

        const tmpCommit = commit.message.trim().replace(/\r\n/gm, "\n").replace(/\n/gm, EOL);
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
        let matched = false,
            match: RegExpExecArray;
        let regex = new RegExp(/^([a-z]+)\(([a-z0-9\- ]*)\)\s*: */gm);
        while ((match = regex.exec(tmpCommit)) !== null) // subject - all lower case, or numbers
        {
            matched = true;
            if (options.verbose) {
                logger.log("Format commit message");
                logger.log("   Section : " + match[1]);
                logger.log("   Scope   : " + match[2]);
            }
            tmpCommits += formatCommitPart(match[1], match[2], tmpCommit.replace(match[0], ""));
        }

        regex = new RegExp(/^([a-z]+)\s*: */gm);
        while ((match = regex.exec(tmpCommit)) !== null) // subject - all lower case, or numbers
        {
            matched = true;
            if (options.verbose) {
                logger.log("Format commit message");
                logger.log("   Section : " + match[1]);
            }
            tmpCommits += formatCommitPart(match[1], undefined, tmpCommit.replace(match[0], ""));
        }

        if (!matched) {
            if (options.verbose) {
                logger.log("Unformatted commit message, no section or subject");
            }
            sectionless.push(tmpCommit);
        }
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
    // TODO
    //
    // Perform spell checking (currently the projectoxford has been taken down after the
    // Microsoft deal with the facial rec api)
    //
    // tmpCommits = CheckSpelling tmpCommits false
    //
    // Write the formatted commits text to the top of options.changelogFile, but underneath the
    // changelog title
    //

    return tmpCommits.trim();
}


export function createSectionFromCommits(context: IContext)
{
    if (context.options.historyFile) {
        context.logger.log("Get txt type history file / changelog");
        return createHistorySectionFromCommits(context);
    }
    context.logger.log("Get md type changelog");
    return createChangelogSectionFromCommits(context);
}


async function doChangelogFileEdit(context: IContext)
{
    const { options, logger, lastRelease, nextRelease, env, cwd } = context,
          originalFile = options.changelogFile;

    logger.log("Preparing changelog file");

    if (options.taskChangelogFile || options.taskChangelogHtmlFile)
    {
        options.changelogFile = options.taskChangelogFile || options.taskChangelogHtmlFile;
        if (await pathExists(options.changelogFile))
        {
            await deleteFile(options.changelogFile);
        }
    }
    else if (options.taskMode && !options.taskChangelog)
    {
        options.changelogFile = path.join(os.tmpdir(), `changelog.${nextRelease.version}.md`);
        if (await pathExists(options.changelogFile))
        {
            await deleteFile(options.changelogFile);
        }
    }

    //
    // If changelog markdown file doesnt exist, create one with the project name as a title
    //
    let newChangelog = false;
    const changeLogPath = path.dirname(options.changelogFile);

    if (changeLogPath !== "" && !(await pathExists(changeLogPath)))
    {
        logger.log("Creating changeLog file directory");
        await createDir(changeLogPath);
    }

    if (!(await pathExists(options.changelogFile)))
    {
        if (options.taskChangelog || !options.taskMode)
        {
            logger.log("Create changelog file directory");
            await writeFile(options.changelogFile, options.projectName + EOL + EOL);
        }
        else
        {
            await writeFile(options.changelogFile, "");
        }
        newChangelog = true;
    }

    if ((lastRelease.version !== nextRelease.version || newChangelog || options.taskMode))
    {
        const changelogTitle = `# ${options.projectName} Change Log`.toUpperCase(),
              fmtDate = getFormattedDate();

        let tmpCommits,
            changeLogFinal = "";

        if (!options.taskChangelogHtmlView && !options.taskChangelogHtmlFile) {
            tmpCommits = context.changelog.notes || createChangelogSectionFromCommits(context);
        }
        else {
            tmpCommits = context.changelog.htmlNotesLast || await createHtmlChangelog(context, lastRelease.version);
        }

        if (options.taskChangelog || !options.taskMode)
        {
            if (!newChangelog && !tmpCommits.endsWith(EOL)) {
                tmpCommits += EOL;
            }

            tmpCommits = `## ${options.versionText} ${nextRelease.version} (${fmtDate})${EOL}${EOL}${tmpCommits}`.trimRight();

            let changeLogContents = await readFile(options.changelogFile);
            changeLogContents = changeLogContents.replace(new RegExp(changelogTitle, "i"), "").trim();

            changeLogFinal = `${changelogTitle}${EOL}${EOL}`;
            if (tmpCommits) {
                changeLogFinal = `${changeLogFinal}${tmpCommits}${EOL}${EOL}`;
            }
            if (changeLogContents) {
                changeLogFinal = `${changeLogFinal}${changeLogContents}${EOL}`;
            }
        }
        else {
            if (!options.taskChangelogFile && !options.taskChangelogHtmlFile && !options.taskChangelogHtmlView) {
                changeLogFinal += `${EOL}Pending ${options.versionText} ${nextRelease.version} Changelog:${EOL}${EOL}${EOL}`;
            }
            changeLogFinal += tmpCommits;
        }
        changeLogFinal = changeLogFinal.trim() + EOL;
        //
        // Write content to file
        //
        await writeFile(options.changelogFile, changeLogFinal);
    }
    else {
        logger.warn("Version match, not touching changelog file");
    }

    //
    // Allow manual modifications to history file
    //
    await editFile({nextRelease, options, logger, cwd, env}, options.changelogFile);

    //
    // Reset
    //
    options.changelogFile = originalFile;
}


export function doEdit(context: IContext)
{
    if (context.options.historyFile) {
        return doHistoryFileEdit(context);
    }
    return doChangelogFileEdit(context);
}


async function doHistoryFileEdit(context: IContext)
{
    const fmtDate = getFormattedDate(),
          { options, logger, lastRelease, nextRelease, env, cwd} = context,
          originalFile = options.historyFile;
    logger.log("Preparing history file");

    if (options.taskChangelogFile || options.taskChangelogHtmlFile)
    {
        options.historyFile = options.taskChangelogFile || options.taskChangelogHtmlFile;
        if (await pathExists(options.historyFile))
        {
            await deleteFile(options.historyFile);
        }
    }
    else if (options.taskMode && !options.taskChangelog)
    {
        options.historyFile = path.join(os.tmpdir(), `history.${nextRelease.version}.txt`);
        if (await pathExists(options.historyFile))
        {
            await deleteFile(options.historyFile);
        }
    }

    //
    // If history file doesnt exist, create one with the project name as a title
    //
    let isNewHistoryFile = false,
        isNewHistoryFileHasContent = false;
    const historyPath = path.dirname(options.historyFile);

    if (historyPath && !(await pathExists(historyPath)))
    {
        logger.log("Creating history file directory");
        await createDir(historyPath);
    }

    if (!(await pathExists(options.historyFile)))
    {
        logger.log("Creating new history file");
        if (options.taskChangelog || !options.taskMode)
        {
            await writeFile(options.historyFile, options.projectName + EOL + EOL);
        }
        else
        {
            await writeFile(options.historyFile, "");
        }
        isNewHistoryFile = true;
    }
    else
    {   //
        // If the history file already existed, but had no entries, we need to still set the 'new' flag
        //
        const contents = await readFile(options.historyFile);
        if (contents.indexOf(options.versionText) === -1)
        {
            isNewHistoryFile = true;
            isNewHistoryFileHasContent = true;
        }
    }

    if (!(await pathExists(options.historyFile)))
    {
        logger.error("Could not create history file, exiting");
        throw new Error("140");
    }

    //
    // Add the 'Version X' line, date, and commit content
    //
    if (lastRelease.version !== nextRelease.version || isNewHistoryFile || options.taskMode)
    {
        let tmpCommits: string;
        if (!options.taskChangelogHtmlView && !options.taskChangelogHtmlFile) {
            tmpCommits = context.changelog.notes || createHistorySectionFromCommits(context);
        }
        else {
            tmpCommits = context.changelog.htmlNotes || await createHtmlChangelog(context, nextRelease.version, true, false, originalFile);
        }

        //
        // New file
        //
        if (isNewHistoryFile && !isNewHistoryFileHasContent && (options.taskChangelog || !options.taskMode)) {
            const historyFileTitle = options.projectName + " History";
            await appendFile(options.historyFile, historyFileTitle + EOL + EOL);
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
        if ((options.taskChangelog || !options.taskMode) && await pathExists(options.historyHdrFile))
        {
            const historyHeader = await readFile(options.historyHdrFile);
            await appendFile(options.historyFile, `${EOL}${options.versionText} ${nextRelease.version}${EOL}${fmtDate}${EOL}${historyHeader}${EOL}${tmpCommits}`);
        }
        else {
            if (options.taskChangelog || !options.taskMode) {
                logger.warn("History header template not found");
                await appendFile(options.historyFile, `${EOL}${options.versionText} ${nextRelease.version}${EOL}${fmtDate}${EOL}${EOL}${EOL}${tmpCommits}`);
            }
            else if (!options.taskChangelogFile && !options.taskChangelogHtmlFile && !options.taskChangelogHtmlView) {
                await appendFile(options.historyFile, `${EOL}Pending ${options.versionText} ${nextRelease.version} Changelog:${EOL}${EOL}${EOL}${tmpCommits}`);
            }
            else {
                await appendFile(options.historyFile, tmpCommits.trim());
            }
        }
    }
    else {
        logger.warn("Version match, not touching history file");
    }

    //
    // Allow manual modifications to history file
    //
    await editFile({nextRelease, options, logger, cwd, env}, options.historyFile, true);

    //
    // Reset
    //
    options.historyFile = originalFile;
}


/**
 * Gets changelog file section using the hostory/changelog file by parsing the sepcified versions section
 *
 * @param context context
 * @param version The version to extract the notes from in the history/changelog file.
 * @param numsections # of section to extract
 * @param listOnly retrieve an array of strings only, not a formatted string
 */
async function getChangelog({ options, logger }, version: string, numsections: number, listOnly: boolean | string = false, inputFile?: string): Promise<IChangelogEntry[] | string>
{
    if (!inputFile) {
        inputFile = options.changelogFile;
    }
    //
    // Make sure user entered correct cmd line params
    //
    if (!inputFile) {
        logger.error("Error: No changelog file specified");
        throw new Error("160");
    }

    if (!(await pathExists(inputFile))) {
        logger.warn("No changelog file exists");
        return "";
    }

    if (!options.versionText) {
        options.versionText = "Version";
    }

    logger.log("Extract section from changelog file");
    logger.log(`   Version            : '${version}'`);
    logger.log(`   Num Sections       : '${numsections}'`);
    logger.log(`   List only          : '${listOnly}'`);
    logger.log(`   Input File         : '${inputFile}'`);
    logger.log(`   Version string     : '${options.versionText}'`);

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
    let contents = await readFile(inputFile);

    //
    // Initialize parsing variables
    //
    let index1 = 0, index2 = 0;

    index1 = contents.indexOf(`## ${options.versionText} ${version}`);
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

    //
    // TODO
    // Add changelinks to changelog entries
    // Ex: https://github.com/spmeesseman/vscode-taskexplorer/compare/v2.2.0...v2.3.0
    //

    //
    // TODO
    // Add issue links
    // Ex: ([ce9c8f0](https://github.com/spmeesseman/vscode-taskexplorer/commit/ce9c8f0))
    //

    if (isString(listOnly) && listOnly === "parts")
    {
        const typeParts = [],
              msgParts = [],
              contents2: IChangelogEntry[] = [];

        logger.log("Determining changelog parts");

        //
        // Replace line feeds with html line breaks
        //
        contents = contents.replace(/\r\n/gm, "<br>");
        contents = contents.replace(/\n/gm, "<br>");
        contents = contents.replace(/\t/gm, "&nbsp;&nbsp;&nbsp;&nbsp;");

        //
        // The getChangelogTypes() method returns a list of types for each note in the section.
        //
        // For example:
        //
        //     ### Features
        //
        //     - feature 1
        //     - feature 2
        //
        //     ### Bug Fixes
        //
        //     - bug fix 1
        //
        // Will return a list like:
        //
        //    [ "Features", "Features", "Bug Fixes" ]
        //
        typeParts.push(...getChangelogTypes(contents));
        if (typeParts.length === 0) {
            throw new Error("166");
        }

        //
        // Get the 'msgParts', this will be the matching commit messages to the types list
        // extracted above.
        //
        let match: RegExpExecArray,
            regex = new RegExp(/\w*(?<=^|>)(- ){1}.+?(?=(<br>-|<br>##|$))/g);
        while ((match = regex.exec(contents)) !== null)
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

        if (msgParts.length !== typeParts.length) {
            logger.error("Error parsing changelog for commit parts");
            logger.error("Message parts array length $(msgParts.length) is less than types array length $(typeParts.length)");
            throw new Error("167");
        }

        for (let i = 0; i < typeParts.length; i++)
        {
            let scope = "",
                tickets = "",
                message = msgParts[i];
            const subject = typeParts[i];
            //
            // Extract scope
            //
            if (/^(\*\*.+\:\*\* )/.test(msgParts[i])) {
                scope = msgParts[i].substring(0, msgParts[i].indexOf(":**")).replace("**", "").trim();
            }
            //
            // Extract message and ticket tags
            //
            regex = new RegExp(/\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/gi);
            while ((match = regex.exec(msgParts[i])) !== null)
            {
                tickets = match[0].replace(/\[/, "").replace("]", "");
                tickets = properCase(tickets.replace(/&nbsp;/g, " ")).trim();
                message = message.replace(new RegExp("/<br><br>" + match[0], "g"), "")
                                 .replace(new RegExp("<br>" + match[0], "g"), "")
                                 .replace(new RegExp("&nbsp;&nbsp;&nbsp;&nbsp;" + match[0], "g"), "")
                                 .replace(new RegExp("&nbsp;&nbsp;&nbsp;" + match[0], "g"), "")
                                 .replace(new RegExp("&nbsp;&nbsp;" + match[0], "g"), "")
                                 .replace(new RegExp("&nbsp;" + match[0], "g"), "")
                                 .replace(new RegExp(" " + match[0], "g"), "")
                                 .replace(new RegExp(match[0], "g"), "").trim();
            }
            contents2.push({ subject, scope, message, tickets });
        }

        return contents2;
    }

    //
    // Convert to html
    //
    const clFile = path.join(os.tmpdir(), "CHANGELOG.md");
    contents = contents.replace(EOL, "\n");
    await writeFile(clFile, contents);
    contents = await execa.stdout("marked", ["--breaks", "--gfm", "--file", clFile]);
    await deleteFile(clFile);

    logger.success("Successful");

    return contents;
}


function getChangelogTypes(changeLog: string)
{
    const changelogTypes = [],
          regex = new RegExp(/\w*(?<=### ).+?(?=(<br>-))/gm);
    let match: RegExpExecArray;
    while ((match = regex.exec(changeLog)) !== null)
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
        const regex = new RegExp(`\\w*(?<=${section}).+?(?=(<br>###|$))`, "gm");
        while ((match2 = regex.exec(changeLog)) !== null)
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


async function getFileNotes(context: IContext, version: string)
{
    const {options, nextRelease, logger} = context;
    let fileNotes: string;
    if (options.historyFile) {
        logger.log("Get txt type file notes");
        fileNotes = await getHistory(context, version || nextRelease.version, 1) as string;
    }
    else if (options.changelogFile) {
        logger.log("Get md type file notes");
        fileNotes = await getChangelog(context, version || nextRelease.version, 1) as string;
    }
    return fileNotes;
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
    let day = date.getDate().toString();

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


/**
 * Gets history file section using the hostory/changelog file by parsing the sepcified versions section
 *
 * @param context context
 * @param version The version to extract the notes from in the history/changelog file.
 * @param numsections # of section to extract
 * @param listOnly retrieve an array of strings only, not a formatted string
 */
async function getHistory({ options, logger }, version: string, numsections: number, listOnly: boolean | string = false, inputFile?: string): Promise<IChangelogEntry[] | string>
{
    const iNumberOfDashesInVersionLine = 20;
    let finalContents = "";

    if (!inputFile) {
        inputFile = options.historyFile;
    }
    //
    // Make sure user entered correct cmd line params
    //
    if (!inputFile) {
        logger.error("Error: No history file specified");
        throw new Error("160");
    }

    if (!(await pathExists(inputFile))) {
        logger.warn("History file does not exist");
        return finalContents;
    }

    logger.log("Extract from history.txt file");
    logger.log(`   Input File         : '${inputFile}'`);
    logger.log(`   Num Sections       : '${numsections}'`);
    logger.log(`   Version string     : '${options.versionText}'`);
    logger.log(`   List only          : '${listOnly}'`);

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

    let contents = "";
    //
    // Read in contents of file
    //
    contents = await readFile(inputFile);
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
    {   //
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
    contents = contents.replace(/&/gm, "&amp;");
    // Replace '<' and '>' with 'lt;' and 'gt;'
    contents = contents.replace(/</gm, "&lt;");
    contents = contents.replace(/>/gm, "&gt;");
    // Replace spaces with &nbsp;
    contents = contents.replace(/ /gm, "&nbsp;");
    contents = contents.replace(/\r\n/gm, "<br>");
    contents = contents.replace(/\n/gm, "<br>");
    //
    // Style the contents to monospace font
    //
    contents = "<font face=\"Courier New\">" + contents + "</font>";

    //
    // If version is empty, then this is a request for the latest version #.  Return version and exit
    //
    if (!version)
    {
        const idx1 = contents.indexOf(`>${options.versionText}&nbsp;`, 0) + options.versionText.Length + 7,
              idx2 = idx1 !== -1 ? contents.indexOf("<br>", idx1) : -1,
              curVersion = idx1 !== -1 && idx2 !== -1 ? contents.substring(idx1, idx2 - idx1) : "";
        logger.log(`Found version ${curVersion}`);
        return curVersion;
    }

    // index1 is our start index
    if (version)
    {
        logger.log("   Write header text to message");
        logger.log(`   Write ${numsections} history section(s) to message`);

        if (listOnly === false) {
            finalContents += contents;
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

            let tContents = contents,
                match: RegExpExecArray,
                regex = new RegExp(/[a-zA-z0-9_\/|\"'][,.:]*(&nbsp;){0,1}<br>(&nbsp;){4}[a-zA-z0-9_\/|\"']/g);
            while ((match = regex.exec(contents)) !== null)
            {
                tContents = tContents.replace(match[0], match[0].replace("<br>&nbsp;&nbsp;&nbsp;", "")); // leave a space
            }
            contents = tContents;

            // break up &nbsp;s
            tContents = contents;
            regex = new RegExp(/(&nbsp;)(\w|'|\")/g);
            while ((match = regex.exec(contents)) !== null)
            {
                tContents = tContents.replace(match[0], match[0].replace("&nbsp;", " "));
            }
            contents = tContents;

            // Bold all numbered lines with a subject
            tContents = contents;
            regex = new RegExp(/\w*(?<=^|>)[1-9][0-9]{0,1}(&nbsp;| ){0,1}\.(&nbsp;| ).+?(?=<br>)/g);
            while ((match = regex.exec(contents)) !== null) {
                const value = match[0];
                if (containsValidSubject(options, value)) {
                    tContents = tContents.replace(value, `<b>${value}</b>`);
                }
            }

            contents = tContents;

            if (listOnly !== "parts") {
                return contents ;
            }
            else {
                const typeParts = [];
                const msgParts = [];

                logger.log("   Extracting parts");

                //
                // Process entries with a subject (sorrounded by <b></b>)
                //
                regex = new RegExp(/<b>\w*(?<=^|>)[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>|<\/font>)/g);
                while ((match = regex.exec(contents)) !== null)
                {
                    let value = match[0].replace("&nbsp;", "").replace(".", "").replace("<b>", "").replace("</b>", "");
                    for (let i = 0; i < 10; i++) {
                        value = value.replace(i.toString(), "").trim();
                    }
                    typeParts.push(value);
                }

                contents = contents.replace(/<br>&nbsp;&nbsp;&nbsp;&nbsp;<br>/g, "<br><br>");
                contents = contents.replace(/<br>&nbsp;&nbsp;&nbsp;<br>/g, "<br><br>");

                regex = new RegExp(/(<\/b>){1}(<br>){0,1}(<br>){1}(&nbsp;){2,}[ ]{1}.+?(?=<br>(&nbsp;| ){0,}<br>(<b>|[1-9][0-9]{0,1}\.(&nbsp;| ))|$)/g);
                while ((match = regex.exec(contents)) !== null)
                {
                    let value = match[0].replace(/<\/b>/, "");
                    value = value.replace(/<br>&nbsp;&nbsp;&nbsp;&nbsp;\[/, "<br>["); // ticket tags
                    value = value.replace(/<br>&nbsp;&nbsp;&nbsp; /, "<br>");

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
                regex = new RegExp(/\w*(?<!<b>)(\b[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>[1-9]|$|<br><b>))/g);
                while ((match = regex.exec(contents)) !== null) {
                    typeParts.push("");
                }

                regex = new RegExp(/\w*(?<!<b>)(\b[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>[1-9]|$|<br><b>))/g);
                while ((match = regex.exec(contents)) !== null)
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

                const contents2: IChangelogEntry[] = [];
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

                    regex = new RegExp(/\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/gi);
                    while ((match = regex.exec(msgParts[i])) !== null) {
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
                    contents2.push({ subject, scope, message, tickets });
                }
                return contents2;
            }
        }

        //
        // Reverse versions, display newest at top if more than 1 section
        //
        if (numsections > 1)
        {
            logger.log("   Re-ordering " + numsections + " sections newest to oldest");

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
            finalContents = "<font face=\"Courier New\" style=\"font-size:12px\">" + contents + "</font>";
        }
    }

    logger.success("   Successful");

    return finalContents;
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
        case "featmaj" : formattedSubject = "Features"; break;
        case "feature" : formattedSubject = "Features"; break;
        case "featmin" : formattedSubject = "Features"; break;
        case "fix"     : formattedSubject = "Bug Fixes"; break;
        case "layout"  : formattedSubject = "Project Layout"; break;
        case "majfeat" : formattedSubject = "Features"; break;
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


export async function populateChangelogs(context: IContext)
{
    const {options, lastRelease, nextRelease, logger} = context,
          getFileNotesLast = options.taskEmail,
          getHtmlLog = !options.taskMode && (options.githubRelease === "Y" || options.mantisbtRelease === "Y"),
          getHtmlLogLast = context.options.taskGithubRelease || context.options.taskMantisbtRelease,
          getFileLog = context.options.taskEmail || (!options.taskMode && options.emailNotification === "Y");

    logger.log("Get release changelogs");

    context.changelog = { ...context.changelog, ... { // await getReleaseChangelogs(context);
        entries: undefined,
        notesLast: undefined,
        fileNotes: getFileLog ? await getFileNotes(context, nextRelease.version) : undefined,
        htmlNotes: getHtmlLog ? await createHtmlChangelog(context, nextRelease.version) : undefined,
        fileNotesLast: getFileNotesLast ? await getFileNotes(context, lastRelease.version) : undefined,
        htmlNotesLast: getHtmlLogLast ? await createHtmlChangelog(context, lastRelease.version) : undefined
    }};

    if (!context.changelog.notes) {
        context.changelog.notes = createSectionFromCommits(context);
    }
}


export function getProjectChangelogFile(context: IContext)
{
    const { options } = context;
    return options.historyFile ? options.historyFile : options.changelogFile;
}


/**
 * Gets version from changelog file by looking at the 'title' of the lastentry
 *
 * @since 3.0.0
 * @param context context
 */
export async function getVersion({ options, logger })
{
    const contents = options.historyFile ?
                        await getHistory({ options, logger }, undefined, 1) as string :
                        await getChangelog({ options, logger }, undefined, 1) as string;
    const index1 = contents.indexOf(`>${options.versionText}&nbsp;`, 0) + options.versionText.length + 7;
    const index2 = contents.indexOf("<br>", index1);
    const curversion = contents.substring(index1, index2 - index1);
    logger.log(`   Found version ${curversion}`);
    return curversion;
}
