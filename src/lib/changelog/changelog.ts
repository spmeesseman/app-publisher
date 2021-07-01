import { IChangelog, IChangelogEntry, IContext } from "../../interface";
import { properCase } from "../utils/utils";

export abstract class Changelog implements IChangelog
{
    abstract doEdit(context: IContext): Promise<void>;
    abstract getSections(context: IContext, version?: string, numSections?: number, format?: "raw" | "parts", inputFile?: string): Promise<IChangelogEntry[] | string>;
    abstract getVersion(context: IContext): Promise<string>;
    abstract createSectionFromCommits(context: IContext): string;

    file: string;
    fileNotes: string;
    htmlNotes: string;
    notes: string;
    entries: IChangelogEntry[];
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
    public async populate(context: IContext)
    {
        const {options, lastRelease, nextRelease, logger} = context,
            getFileNotesLast = options.taskEmail,
            getHtmlLog = !options.taskMode && (options.githubRelease === "Y" || options.mantisbtRelease === "Y"),
            getHtmlLogLast = context.options.taskGithubRelease || context.options.taskMantisbtRelease,
            getFileLog = context.options.taskEmail || (!options.taskMode && options.emailNotification === "Y");

        logger.log("Get release changelogs");

        this.entries = await this.getSections(context, nextRelease.version, 1, "parts", this.file) as IChangelogEntry[];
        this.notesLast = undefined;
        this.fileNotes = getFileLog ? await this.getSections(context, nextRelease.version) as string : undefined;
        this.htmlNotes = getHtmlLog ? await createHtmlChangelog(context, this.entries) : undefined;
        this.fileNotesLast = getFileNotesLast ? await this.getSections(context, lastRelease.version) as string : undefined;
        this. htmlNotesLast = getHtmlLogLast ? await createHtmlChangelog(context, this.entries) : undefined;

        if (!context.changelog.notes) {
            context.changelog.notes = this.createSectionFromCommits(context);
        }
    }

}


export function getFormattedDate()
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
export function cleanMessage(msg: string)
{
    return msg.replace(/(?<!\w)(?:Api|Npm|Sso|Svn|Html?|Crud|Readme)(?= |$|\.)/gm, (m): string =>
    {
        return m.toUpperCase();
    })
    .replace(/[ ]*\[(?:skip[ \-]{1}ci|[a-z]+[ \-]{1}release)\]/gmi, (m): string =>
    {
        return "";
    })
    .replace(/\[{0,1}(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]{0,1}/gmi, (m): string =>
    {
        m = m.replace(/(?:bug|issue|close|fix|resolve|ref|reference)/gmi, (m2): string =>
        {
            let fm2 = m2;
            if (/(?:s|ss|sh|x|z)$/.test(m2)) { fm2 += "e"; }
            fm2 += "s";
            return fm2;
        });
        // if (/(?:s|ss|sh|x|z)$/.test(m)) { fm += "e"; }
        // fm += "s";
        return "[" + properCase(m.replace(/[\[\]]/g, "").trim()) + "]";
    })
    .replace("Mantisbt", "MantisBT").replace("Github", "GitHub");
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
export function containsValidSubject(options, line: string): boolean
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
export async function createHtmlChangelog({ options, logger }: IContext, changeLogParts: IChangelogEntry[], useFaIcons = false, includeStyling = false)
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

        changeLog += getHtmlFormattedMessage(commit.message);

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


export function getHtmlFormattedMessage(message: string, isHtmlMsg = false)
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
                        .replace(/ /gm, "&nbsp;");
    }
    else {
        message = message.replace(new RegExp(`<br>(?:${sc}){10,}[\\w]+`, "gm"), (m) => { return `<br>${sc}${sc}${sc}${sc}${sc}${sc}${sc}${sc}` + m.substring(4).replace(/&nbsp;/g, ""); })
                        .replace(new RegExp(`<br>(?:${sc}){5,9}[\\w]+`, "gm"), (m) => { return `<br>${sc}${sc}${sc}${sc}` + m.substring(4).replace(/&nbsp;/g, ""); })
                        .replace(new RegExp(`<br>(?:${sc}){3,4}[\\w]+`, "gm"), (m) => { return m.replace(/&nbsp;/g, ""); })
                        .replace(/<br>(?:&nbsp;)+<br>/gm, "<br><br>");
    }
    return message;
}


/**
 * Gets whether or not a commit message should be included in a changelog file section.
 *
 * @since 3.0.3
 * @param context The run context object.
 * @returns `true` if the commit message should be skipped, `false` otherwise
 */
export function isSkippedCommitMessage(msg: string)
{
   const m = msg.trimLeft().toLowerCase();
   return m.startsWith("chore") || m.startsWith("progress") || m.startsWith("style") || m.startsWith("project");
}
