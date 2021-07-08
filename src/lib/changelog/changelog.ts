
import { EOL } from "os";
import * as path from "path";
import * as semver from "semver";
import regexes from "../definitions/regexes";
import { IChangelog, IChangelogEntry, IContext } from "../../interface";
import { pathExists, readFile, writeFile } from "../utils/fs";
import { properCase } from "../utils/utils";

export abstract class Changelog implements IChangelog
{
    abstract doEdit(context: IContext): Promise<void>;
    abstract getSections(context: IContext, version?: string, numSections?: number, htmlFormat?: boolean, inputFile?: string): Promise<string>;
    abstract getSectionEntries(context: IContext, version?: string): Promise<IChangelogEntry[] | undefined>;
    abstract getHeader(context: IContext, version?: string): Promise<string>;
    abstract getVersion(context: IContext): Promise<string>;
    abstract createSectionFromCommits(context: IContext): string;

    file: string;
    fileNotes: string;
    htmlNotes: string;
    notes: string;
    entries: IChangelogEntry[];
    entriesLast: IChangelogEntry[];
    fileNotesLast: string;
    htmlNotesLast: string;
    notesLast: string;
    context: IContext;

    constructor(context: IContext)
    {
        this.file = context.options.changelogFile;
        this.context = context;
    }

    /**
     * Populates the changelog object of the run context
     *
     * @since 3.0.3
     * @param context The run context object.  The `context.changelog` object will be populated.
     */
    public async populate(context: IContext, nextVersionChangelogWritten = true)
    {
        const {options, lastRelease, nextRelease, logger} = context;

        if (options.taskVersionUpdate) {
            return;
        }

        logger.log("Get release changelogs");

        const nextVersion = !options.tests || !options.taskMode ? nextRelease.version : "3.1.1",
              lastVersion = !options.tests || !options.taskMode ? lastRelease.version : "3.1.0",
              releaseTaskReqHtmlNotes =  (!options.versionForceCurrent && (options.taskMantisbtRelease || options.taskGithubRelease)),
              releaseTaskReqFileNotes =  !options.versionForceCurrent && options.taskEmail,
              getEntries = nextVersionChangelogWritten || releaseTaskReqHtmlNotes,
              getFileNotesLast = options.taskEmail && !nextVersionChangelogWritten,
              getHtmlLog = (!options.taskMode || releaseTaskReqHtmlNotes) && (options.githubRelease === "Y" || options.mantisbtRelease === "Y"),
              getHtmlLogLast = (options.taskGithubRelease || options.taskMantisbtRelease) && !nextVersionChangelogWritten,
              getFileLog = options.taskEmail || releaseTaskReqFileNotes || (!options.taskMode && options.emailNotification === "Y");

        this.entries = getEntries ? await this.getSectionEntries(context, nextVersion) : undefined;
        this.entriesLast = getHtmlLogLast ? await this.getSectionEntries(context, lastVersion) : undefined;

        if (this.entries) {
            this.htmlNotes = getHtmlLog ? await this.createHtmlChangelog(context, this.entries, options.mantisbtRelease === "Y") : undefined;
        }
        if (this.entriesLast) {
            this.htmlNotesLast = getHtmlLogLast ? await this.createHtmlChangelog(context, this.entriesLast, options.mantisbtRelease === "Y") : undefined;
        }

        this.fileNotes = getFileLog ? await this.getSections(context, nextVersion) : undefined;
        this.fileNotesLast = getFileNotesLast ? await this.getSections(context, lastVersion) : undefined;

        this.notes = this.notes || this.createSectionFromCommits(context);
        this.notesLast = undefined; //  await this.getSections(context, nextVersion)
    }


    getFormattedDate()
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
     * Gets a cleaned section entry, replacing tags such as [skip ci], etc.
     *
     * @since 3.0.3
     * @param msg The changelog / history section entry to clean
     * @returns Cleaned section entry
     */
    cleanMessage(msg: string)
    {
        let fmtMsg = msg.replace(/[ ]*\[(?:skip[ \-]*ci|[a-z]+[ \-]*release)\]/gmi, (m): string =>
        {
            return "";
        })
        .replace(regexes.ISSUES, (m): string =>
        {
            m = m.replace(regexes.ISSUE_TAG, (m2): string =>
            {
                let fm2 = m2;
                if (/(?:ss|sh|x|z)$/.test(m2)) { fm2 += "es"; }
                if (fm2 === "fix") { fm2 += "es"; }
                else if (fm2 === "close" || fm2 === "resolve") { fm2 += "s"; }
                else if (fm2 === "fixed" || fm2 === "closed" || fm2 === "resolved") { fm2 = fm2.replace("d", "s"); }
                return fm2;
            });
            // if (/(?:s|ss|sh|x|z)$/.test(m)) { fm += "e"; }
            // fm += "s";
            return "[" + properCase(m.replace(/[\[\]]/g, "").trim()) + "]";
        });

        if (this.isTextChangelog())
        {
            fmtMsg = fmtMsg.replace(/[ ]+api[ \r\n]+/gmi, (s) => { return s.replace(/api/i, "API"); })
                           .replace(/[ ]+crud[ \r\n]+/gmi, (s) => { return s.replace(/crud/i, "CRUD"); })
                           .replace(/[ ]+npm[ \r\n]+/gmi, (s) => { return s.replace(/npm/i, "NPM"); })
                           .replace(/[ ]+sso[ \r\n]+/gmi, (s) => { return s.replace(/sso/i, "SSO"); })
                           .replace(/[ ]+svn[ \r\n]+/gmi, (s) => { return s.replace(/SVN/i, "SVN"); })
                           .replace(/[ ]+html[ \r\n]+/gmi, (s) => { return s.replace(/html/i, "HTML"); })
                           .replace(/[ ]+mantisbt[ \r\n]+/gmi, (s) => { return s.replace(/mantisbt/i, "MantisBT"); })
                           .replace(/[ ]+github[ \r\n]+/gmi, (s) => { return s.replace(/github/i, "GitHub"); })
                           .replace(/[ ]+app\-publisher[ \r\n]+/gmi, (s) => { return s.replace(/app\-publisher/i, "App-Publisher"); });
        }

        //
        // TODO - Run spell check.  Any API's for Node?
        //

        return fmtMsg;
    }


    /**
     * Checks to see if a first line in a commit message contains a valid subject.
     *
     * @private
     * @since 3.0.0
     * @param options options
     * @param line commit message line containg subject
     * @returns 'true' if a valid subject is found, `false` otherwise
     */
    containsValidSubject(options, line: string): boolean
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
            for (const map of options.commitMsgMap)
            {
                if (line.includes(map.formatText))
                {
                    valid = true;
                }
            }
        }

        return valid;
    }


    /**
     * Creates an html changelog for use with a MantisBT or GitHub release.
     * This method extracts the notes in the hostory/changelog file for the specified
     * version to build the content.
     *
     * @param context The run context object.
     * @param version The version to extract the notes from in the history/changelog file.
     * @param useFaIcons Use font aweome icons
     * @param includeStyling include css styling
     */
    async createHtmlChangelog({ options, logger }: IContext, changeLogParts: IChangelogEntry[], useFaIcons = false, includeStyling = false)
    {
        let changeLog = "";

        logger.log("Converting changelog notes to html release notes");
        if (options.verbose) {
            logger.log("   Use icons : " + useFaIcons);
            logger.log("   Inlcude styling : " + useFaIcons);
        }

        if (!changeLogParts || changeLogParts.length === 0 || changeLogParts[0].message === "error") {
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
                        for (const map of options.commitMsgMap)
                        {
                            if (!iconSet && commit.subject.includes(map.formatText) && map.iconCls)
                            {
                                changeLog += "<i class=\"fa ";
                                changeLog += map.iconCls;
                                changeLog += "\"></i> ";
                                iconSet = true;
                            }
                        }
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
            changeLog += "</b></td><td nowrap valign=\"top\" style=\"padding-left:10px\">";
            changeLog += (commit.scope || "General");
            changeLog += "</td><td width=\"100%\" style=\"padding-left:15px\">";

            changeLog += this.getHtmlFormattedMessage(commit.message);

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


    getHtmlFormattedMessage(message: string, isHtmlMsg = false)
    {
        let tContents = message,
            match: RegExpExecArray;
        const sc = !isHtmlMsg ? " " : "&nbsp;",
            ls = !isHtmlMsg ? "^" : "<br>",
            regex = !isHtmlMsg ? /[a-zA-z0-9_\/|\"'][,.:]* {0,1}[\r\n]+ {4}[a-zA-z0-9_\/|\"']/g :
                                /[a-zA-z0-9_\/|\"'][,.:]*(?:&nbsp;){0,1}[<br>]+(?:&nbsp;){4}[a-zA-z0-9_\/|\"']/g;
        while ((match = regex.exec(message)) !== null)
        {
            tContents = tContents.replace(match[0], match[0].replace(!isHtmlMsg ? "\r\n   " : `<br>${sc}${sc}${sc}`, "")); // leave a space
        }
        message = tContents;

        if (!isHtmlMsg) {
            message = message.replace(/^[ ]{10,}[\w]+/gm, (m) => { return "        " + m.trimLeft(); })
                            .replace(/^[ ]{5,9}[\w]+/gm, (m) => { return "    " + m.trimLeft(); })
                            .replace(/^[ ]{3,4}[\w]+/gm, (m) => { return m.trimLeft(); }).trim()
                            .replace(/\r\n +\r\n/gm, "\r\n\r\n").replace(/\n +\n/gm, "\n\n")
                            .replace(/\r\n/gm, "<br>").replace(/\n/gm, "<br>")
                            .replace(/ /gm, "&nbsp;")
                            .replace(/[a-z]{1}&nbsp;[a-z]{1}/gmi, (s) => { return s.replace("&nbsp;", " "); });
        }
        else {
            message = message.replace(new RegExp(`<br>(?:${sc}){10,}[\\w]+`, "gm"), (m) => { return `<br>${sc}${sc}${sc}${sc}${sc}${sc}${sc}${sc}` + m.substring(4).replace(/&nbsp;/g, ""); })
                            .replace(new RegExp(`<br>(?:${sc}){5,9}[\\w]+`, "gm"), (m) => { return `<br>${sc}${sc}${sc}${sc}` + m.substring(4).replace(/&nbsp;/g, ""); })
                            .replace(new RegExp(`<br>(?:${sc}){3,4}[\\w]+`, "gm"), (m) => { return m.replace(/&nbsp;/g, ""); })
                            .replace(/<br>(?:&nbsp;)+<br>/gm, "<br><br>")
                            .replace(/[a-z]{1}&nbsp;[a-z]{1}/gmi, (s) => { return s.replace("&nbsp;", " "); });
        }
        return message;
    }


    isTextChangelog()
    {
        return path.extname(this.file) === ".txt";
    }

    /**
     * Gets whether or not a commit message should be included in a changelog file section.
     *
     * @since 3.0.3
     * @param context The run context object.
     * @returns `true` if the commit message should be skipped, `false` otherwise
     */
    isSkippedCommitMessage(msg: string)
    {
        return regexes.CHANGELOG_SKIPPED_COMMIT.test(msg);
    }


    /**
     * Remove pre-release sections for a production release
     *
     * @since 3.4.0
     * @param context The run context object.
     * @param version The version to match pre-releases to, and remove the sections
     */
    async removePreReleaseSections(context: IContext, version: string, regex: RegExp)
    {
        const { options, logger } = context;
        let bFound = 0;
        logger.log("Check for pre-release -> production-release change");

        if (context.lastRelease.versionInfo.system === "semver" &&
            semver.prerelease(version) === null && semver.prerelease("3.3.3-pre.2") !== null)
        {
            const fileContents = await readFile(this.file),
                  major = semver.major(version),
                  minor = semver.minor(version),
                  patch = semver.patch(version);
            let match: RegExpExecArray,
                contents = fileContents;

            logger.log("This is a production release with prior pre-releases");
            logger.log("   Remove pre-release sections from changelog");

            //
            // Note that [\s\S]*? isnt working here, had to use [^]*? for a non-greedy grab, which isnt
            // supported in anything other than a JS regex.  Also, /Z doesnt work for 'end of string' in
            // a multi-line regex in JS, so we use the ###END### temp tag to mark it
            //
            while ((match = regex.exec(fileContents + "###END###")) !== null)
            {
                if (match[1].startsWith(version) && match[1] !== version && semver.prerelease(match[1]) !== null)
                {
                    if (options.verbose) {
                        logger.log(`   Pre-release removal - removing ${options.versionText} ${match[1]}`);
                    }
                    contents = contents.replace(match[0], "");
                    ++bFound;
                }
                //
                // If patch level is 0, the pre-reelase version can have a minor version of one less
                //
                if (patch === 0 && minor > 0)
                {
                    const matchVersion = `${major}.${minor - 1}.${semver.patch(context.lastRelease.version) + 1}`;
                    if (match[1].startsWith(matchVersion) && semver.prerelease(match[1]) !== null) {
                        if (options.verbose) {
                            logger.log(`   Pre-release removal - removing ${options.versionText} ${match[1]}`);
                        }
                        contents = contents.replace(match[0], "");
                        ++bFound;
                    }
                }
                //
                // If minor level is 0, the pre-reelase version can have a major version of one less
                //
                if (minor === 0 && patch === 0)
                {
                    const matchVersion = `${major - 1}.${semver.minor(context.lastRelease.version)}.${semver.patch(context.lastRelease.version) + 1}`;
                    if (match[1].startsWith(matchVersion) && semver.prerelease(match[1]) !== null) {
                        if (options.verbose) {
                            logger.log(`   Pre-release removal - removing ${options.versionText} ${match[1]}`);
                        }
                        contents = contents.replace(match[0], "");
                        ++bFound;
                    }
                }
            }

            if (bFound > 0) {
                contents = contents.trim();
                if (this.isTextChangelog()) {
                    contents += EOL;
                }
                await writeFile(this.file, contents + EOL);
            }

            logger.log(`   Removed ${bFound} sections`);
        }
        else if (options.verbose) {
            logger.log("   No prior pre-releases found");
        }

        return bFound;
    }

}
