import * as path from "path";
import { IChangelogEntry, IContext } from "../../interface";
import { appendFile, createDir, deleteFile, pathExists, readFile, writeFile } from "../utils/fs";
import { editFile, properCase } from "../utils/utils";
import { Changelog } from "./changelog";
const os = require("os"), EOL = os.EOL;


export class ChangelogTxt extends Changelog
{

    /**
     * Creates a changelog entry for the history/changelog file using the commits list
     *
     * @since 2.8.0
     *
     * @param context The run context object.
     */
    createSectionFromCommits(context: IContext)
    {
        let comments = "";
        let commentNum = 1;
        const { options, commits, logger } = context;

        if (!commits || commits.length === 0) {
            logger.warn("Cannot build history file section, there are no commits");
            return comments;
        }

        logger.log(`Build history file section from ${commits.length} commits`);

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
                for (const map of options.commitMsgMap)
                {
                    if (msgLwr.startsWith(map.type) && !map.include) {
                        customIgnoreFound = true;
                    }
                }
            }

            if (customIgnoreFound) {
                continue;
            }

            if (msg && !this.isSkippedCommitMessage(msgLwr))
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
                msg = msg.replace("tests: ", `Tests${EOL}${EOL}`);
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
                msg = msg.replace("tests(", "Tests(");
                msg = msg.replace("tweak(", "Refactoring(");
                msg = msg.replace("style(", "Code Styling(");
                msg = msg.replace("layout(", "Project Layout(");
                msg = msg.replace("visual(", "Visual(");
                msg = msg.replace("progress(", "Ongoing Progress(");
                msg = msg.replace("misc(", "Miscellaneous(");

                if (options.commitMsgMap)
                {
                    for (const map of options.commitMsgMap)
                    {
                        msg = msg.replace(map.type + ": ", map.formatText + EOL + EOL);
                        msg = msg.replace(map.type + "(", map.formatText + "(");
                    }
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
                // Typically when writing the commit messages all lowercase is used.  Capitalize the first
                // letter following the commit message subject
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
                    const l = options.changelogLineLen - 4;
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

                comments = comments + this.cleanMessage(line) + EOL + EOL;
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


    private getPartsFromSection({options, logger}, contents: string)
    {
        let match: RegExpExecArray;
        const entries: IChangelogEntry[] = [];

        logger.log("   Extracting parts from history file section");
        //
        // Process entries with a subject (sorrounded by <b></b>)
        //
        const regex = /(?:^[0-9]{1,2}\. +([\w+ ]+)+(?::  ([\w+ ]+))*([^]*?))(?=^[0-9]{1,2}\.|###END###)/gmi;
        while ((match = regex.exec(contents + "###END###")) !== null)
        {
            let subject = match[1]?.trim(),
                scope = match[2]?.trim(),
                message = match[3]?.trim(),
                tickets = "";
            let match2: RegExpExecArray;
            const regex2 = /( *(?:bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1} #[0-9]+(?: *, *#[0-9]+)* *$)+/gmi;
            if ((match2 = regex2.exec(message)) !== null)
            {
                tickets = match2[1]?.trim();
                message = message.replace(tickets, "");
            }
            if (!scope && !this.containsValidSubject(options, subject)) {
                message = subject + EOL + message;
                subject = "General";
                scope = "";
            }
            entries.push({ subject, scope, message, tickets });
            if (options.verbose) {
                logger.log("   Push parsed entry to changelog list");
                logger.log(`      Subject : '${subject}'`);
                logger.log(`      Scope : '${scope ?? "n/a"}'`);
                if (tickets) {
                    logger.log(`      Tickets : ${tickets}`);
                }
            }
        }

        logger.log("Successfully retrieved history file parts");
        return entries;
    }


    async doEdit(context: IContext)
    {
        let isNewHistoryFile = false,
            isNewHistoryFileHasContent = false;
        const fmtDate = this.getFormattedDate(),
            { options, logger, lastRelease, nextRelease} = context,
            originalFile = options.changelogFile,
            taskSpecVersion = options.taskChangelogPrintVersion || options.taskChangelogViewVersion,
            version = !taskSpecVersion ? nextRelease.version : taskSpecVersion;

        logger.log("Start history file edit");

        if (!options.taskChangelogPrint && !options.taskChangelogPrintVersion)
        {
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
                options.changelogFile = path.join(os.tmpdir(), `history.${version}.txt`);
                if (await pathExists(options.changelogFile))
                {
                    await deleteFile(options.changelogFile);
                }
            }

            //
            // If history file doesnt exist, create one with the project name as a title
            //
            const historyPath = path.dirname(options.changelogFile);

            if (historyPath && !(await pathExists(historyPath)))
            {
                logger.log("Create history file directory");
                await createDir(historyPath);
            }

            if (!(await pathExists(options.changelogFile)))
            {
                logger.log("Create new history file");
                if (options.taskChangelog || !options.taskMode)
                {
                    await writeFile(options.changelogFile, options.projectName + EOL + EOL);
                }
                else
                {
                    await writeFile(options.changelogFile, "");
                }
                isNewHistoryFile = true;
            }
            else
            {   //
                // If the history file already existed, but had no entries, we need to still set the 'new' flag
                //
                const contents = await readFile(options.changelogFile);
                if (contents.indexOf(options.versionText) === -1)
                {
                    isNewHistoryFile = true;
                    isNewHistoryFileHasContent = true;
                }
            }

            if (!(await pathExists(options.changelogFile)))
            {
                logger.error("Could not create history file, exiting");
                throw new Error("140");
            }
        }

        //
        // Add the 'Version X' line, date, and commit content
        //
        if (lastRelease.version !== version || isNewHistoryFile || options.taskMode)
        {
            let tmpCommits: string;

            if (taskSpecVersion) {
                tmpCommits = await this.getSections(context, version, 1, false, originalFile);
            }
            else if (!options.taskChangelogHtmlView && !options.taskChangelogHtmlFile) {
                tmpCommits = context.changelog.notes || this.createSectionFromCommits(context);
            }
            else {
                if (context.changelog.htmlNotes) {
                    tmpCommits = context.changelog.htmlNotes;
                }
                else {
                    const entries = await this.getSectionEntries(context, version);
                    tmpCommits = await this.createHtmlChangelog(context, entries, true, false);
                }
            }

            //
            // New file
            //
            if (isNewHistoryFile && !isNewHistoryFileHasContent && (options.taskChangelog || !options.taskMode)) {
                const changelogFileTitle = options.projectName + " History";
                await appendFile(options.changelogFile, changelogFileTitle + EOL + EOL);
            }

            //
            // Touch history file with the latest version info, either update existing, or create
            // a new one if it doesnt exist
            //
            // Add lines 'version', 'date', then the header content
            //
            // Write the formatted commits text to options.changelogFile
            // Formatted commits are also contained in the temp text file $Env:TEMP\history.txt
            // Replace all newline pairs with cr/nl pairs as SVN will have sent commit comments back
            // with newlines only
            //
            if (options.taskChangelog || !options.taskMode)
            {
                let header: string;
                if (await pathExists(options.changelogHdrFile)) {
                    header = await readFile(options.changelogHdrFile);
                }
                else {
                    for (let i = 0; i < options.changelogLineLen; i++) {
                        header += "-";
                    }
                }
                await appendFile(options.changelogFile, `${EOL}${options.versionText} ${version}${EOL}${fmtDate}${EOL}${header}${EOL}${tmpCommits}`);
            }
            else if (options.taskChangelogPrint || options.taskChangelogPrintVersion) {
                context.stdout.write(tmpCommits.trim());
                return;
            }
            else if (!options.taskChangelogFile && !options.taskChangelogHtmlFile && !options.taskChangelogHtmlView) {
                await appendFile(options.changelogFile, `${EOL}${!taskSpecVersion ? "Pending " : ""}${options.versionText} ${version} Changelog:${EOL}${EOL}${EOL}${tmpCommits}`);
            }
            else {
                await appendFile(options.changelogFile, tmpCommits.trim());
            }
        }
        else {
            logger.warn("Version match, not touching history file");
        }

        //
        // Allow manual modifications to history file
        //
        await editFile(context, options.changelogFile, true);

        //
        // Reset
        //
        options.changelogFile = originalFile;
    }


    /**
     * Gets history file section using the hostory/changelog file by parsing the sepcified
     * versions section.
     *
     * @param context The run context object.
     * @param version The version to extract the notes from in the history/changelog file.
     * @param numsections # of section to extract
     * @param listOnly retrieve an array of strings only, not a formatted string
     * @returns HTML version of the requested cahngelog section(s)
     */
    async getSections(context: IContext, version?: string, numSections = 1, htmlFormat = true, inputFile?: string): Promise<string>
    {
        const { options, logger } = context;

        if (!inputFile) {
            inputFile = options.changelogFile;
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
            return "";
        }

        logger.log("Extract from history.txt file");
        logger.log(`   Num sections       : '${numSections}'`);
        logger.log(`   Version start      : '${version ?? "n/a"}'`);
        logger.log(`   Version string     : '${options.versionText}'`);
        logger.log(`   Format             : '${htmlFormat}'`);
        logger.log(`   Input file         : '${inputFile}'`);

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

        //
        // Read in contents of file, and break it down to at least the first version requested
        //
        let contents = "",
            fileContents = await readFile(inputFile);

        //
        // If 'version' is empty, then this is a request for the latest version #.  Return version and exit
        //
        if (!version)
        {
            let idx1 = fileContents.lastIndexOf(`\n${options.versionText} `),
                curVersion: string;
            if (idx1 !== -1) {
                idx1 += (options.versionText.length + 2);
                const idx2 = fileContents.indexOf("\n", idx1);
                if (idx2 !== -1) {
                    curVersion = fileContents.substring(idx1, idx2).trim();
                }
            }
            if (curVersion) {
                logger.log(`   Version request - found latest version ${curVersion}`);
            }
            else {
                logger.log("   Version request - not found");
            }
            return curVersion;
        }

        //
        // Break content down to at least the first version requested
        //
        const idx = fileContents.indexOf(`${options.versionText} ${version}`);
        if (idx === -1) {
            logger.error("   History section could not be found, exit");
            throw new Error("161");
        }
        fileContents = fileContents.substring(idx);

        //
        // Pull out the requested sections
        //
        let match: RegExpExecArray,
            bFound = 0;
        //
        // Note that [\s\S]*? isnt working here, had to use [^]*? for a non-greedy grab, which isnt
        // supported in anything other than a JS regex
        //
        const regex = new RegExp(`(?:^${options.versionText} ([0-9a-zA-Z\-\.]{3,})[\r\n]+.+[\r\n]+[\-]{20,}[\r\n]+[\*]{20,}[^]+?(?=[\*]{20,})[\*]{20,}[\r\n]+)([^]*?)(?=^${options.versionText}|###END###)`, "gm");
        while ((match = regex.exec(fileContents + "###END###")) !== null)
        {
            if (options.verbose) {
                logger.log(`   Parsing file - found ${options.versionText} ${match[1]}`);
            }
            if (match[1] === version)
            {
                if (htmlFormat) {
                    contents += match[0];       // add the whole match
                }
                else {
                    contents += match[2];       // add just the changelog content 1....n
                }
                contents = contents.trim() + EOL + EOL;
                // if (++bFound >= numSections) {  // check # of sections requested and if we found them all yet
                //     break;
                // }
                ++bFound;
                break;
            }
        }

        //
        // Make sure we found our starting point / first section
        //
        if (!bFound)
        {
            logger.error("History file section could not be found");
            throw new Error("162");
        }
        logger.log("   Found history file section(s)");

        //
        // If request is for just the raw content, we're done.  Proceeding past here converts to HTML
        //
        if (!htmlFormat) {
            logger.log("Successfully retrieved raw history file content");
            return contents;
        }

        //
        // CONVERT TO HTML
        //

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

        // if (format !== "parts") {
            return contents;
        // }
    /*
        //
        // Reverse versions, display newest at top if more than 1 section
        //
        if (numSections > 1)
        {
            logger.log("   Re-ordering " + numSections + " sections newest to oldest");

            const sections = [];

            index2 = contents.indexOf(`>${options.versionText}&nbsp;`, 0) + 1;
            for (let i = 0; i < numSections; i++)
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
            for (let i = numSections - 1; i >= 0; i--)
            {
                contents += sections[i];
                if (contents.substring(contents.length - 12) !== "<br><br><br>")
                {
                    contents += "<br>";
                }
            }
            contents = "<font face=\"Courier New\" style=\"font-size:12px\">" + contents + "</font>";
        }

        logger.log("Successfully retrieved history file content");
        return contents;
        */
    }


    async getSectionEntries(context: IContext, version?: string): Promise<IChangelogEntry[]>
    {
        const contents = await this.getSections(context, version, 1, false);
        return this.getPartsFromSection(context, contents);
    }

    /**
     * Gets version number from the last entered section of the changelog / history file.
     *
     * @since 3.0.0
     * @param context The run context object.
     * @returns The version number of the last section found in the history / changelog file.
     */
    async getVersion(context: IContext)
    {
        context.logger.log("Retrieve last version number from history file");
        return this.getSections(context);
    }

}