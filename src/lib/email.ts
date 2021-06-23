import * as path from "path";
import * as nodemailer from "nodemailer";
import { IContext } from "../interface";
import { properCase } from "./utils/utils";
import { npmLocation } from "./releases/npm";
import { getReleaseChangelog } from "./changelog-file";


// async..await is not allowed in global scope, must use a wrapper
export async function sendNotificationEmail(context: IContext, version: string): Promise<boolean>
{
    const {options, nextRelease, logger} = context;
    //
    // Check to make sure all necessary parameters are set
    //
    if (!options.emailServer) {
        logger.error("   Notification could not be sent, invalid email server specified");
        return false;
    }
    if (!options.emailRecip) {
        logger.error("   Notification could not be sent, invalid recipient address specified");
        return false;
    }
    if (!options.emailSender) {
        logger.error("   Notification could not be sent, invalid sender address specified");
        return false;
    }

    let emailBody = getEmailHeader({options, logger}, version);

    emailBody += "<br>Most Recent History File Entry:<br><br>";
    if (!nextRelease || !nextRelease.changelog) {
        const changelog = await getReleaseChangelog(context, version);
        if (changelog) {
            emailBody += changelog.fileNotes;
        }
        else {
            logger.error("   Notification could not be sent, can't create release notes");
            return false;
        }
    }
    else {
        emailBody += nextRelease.changelog.fileNotes;
    }
    if (!emailBody) {
        logger.error("   Notification could not be sent, history file not specified");
        return false;
    }

    //
    // Attach app-publisher signature to body
    //
    emailBody += "<br><table><tr><td valign=\"middle\"><font style=\"font-size:12px;font-weight:bold\">";
    emailBody += "This automated email notification was generated and sent by </font></td><td>";
    emailBody += "<img src=\"https://app1.spmeesseman.com/res/img/app/app-publisher.png\" height=\"16\">";
    emailBody += "</td><td valign=\"middle\"><font style=\"color:#0000AA;font-size:12px;font-weight:bold\">";
    emailBody += "<i>app-publisher</i></font></td></tr><tr><td valign=\"middle\" colspan=\"3\">";
    emailBody += "<font style=\"font-size:10px;font-weight:bold\">Do not respond to this email message</font></td></tr></table>";

    logger.log("Sending release notification email");
    try
    {
        let to: string;
        let projectNameFmt = options.projectName.replace(/\-/, " ");
        //
        // If all lower case project name, then title case the project name
        //
        if (/^[a-z]*$/.test(projectNameFmt))
        {
            projectNameFmt = properCase(projectNameFmt);
        }
        let subject = `${projectNameFmt} ${options.versionText} ${version}`;
        if (!options.dryRun)
        {
            if (options.emailRecip.length > 0)
            {
                to = options.emailRecip;
            }
            else {
                if (options.testEmailRecip.length > 0)
                {
                    to = options.testEmailRecip;
                }
                else {
                    logger.error("Notification could not be sent, invalid email address specified");
                    return false;
                }
            }
        }
        else {
            emailBody = "<br><b>THIS IS A DRY RUN RELEASE, PLEASE IGNORE</b><br><br>" + emailBody;
            subject = "[DRY RUN] " + subject;
            if (options.testEmailRecip.length > 0)
            {
                to = options.testEmailRecip;
            }
            else {
                logger.error("Notification could not be sent, invalid email address specified");
                return false;
            }
        }

        if (!to)
        {
            logger.error("Notification could not be sent, invalid 'to' configuration");
            return false;
        }

        //
        // Create reusable transporter object using the default SMTP transport
        //
        const transportCfg = {
            host: options.emailServer,
            port: options.emailMode === "ssl" ? 465 : 25,  // 587
            secure: options.emailMode === "ssl", // true for 465, false for other ports
            auth: {
                user: "", // TODO
                pass: ""  // TODO
            }
        };
        const transporter = nodemailer.createTransport(transportCfg);

        logger.log("Sending email");
        logger.log("   Port      : " + transportCfg.port);
        logger.log("   Server    : " + transportCfg.host);
        logger.log("   Is secure : " + transportCfg.secure);
        logger.log("   To        : " + to);
        logger.log("   Sender    : " + options.emailSender);

        //
        // Send mail with defined transport object
        //
        const info = await transporter.sendMail({
            from: options.emailSender,
            to,
            subject,
            html: emailBody
        });

        logger.success("Message sent: %s", info.messageId);
    }
    catch (e) {
        logger.error("Delivery failure: " + e.toString());
        return false;
    }
}


export function getEmailHeader({options, logger}, version: string)
{
    let szHrefs = "";
    const incHeader = options.historyHref || (options.distRelease === "Y" || options.distRelease === true) ||
                      (options.npmRelease === "Y" || options.npmRelease === true) ||
                      (options.nugetRelease === "Y" || options.nugetRelease === true) ||
                      ((options.mantisbtRelease === "Y" || options.mantisbtRelease === true) && options.mantisbtUrl);

    logger.log("Get email body header");
    logger.log(`   Target Location    : '${options.distReleasePath}'`);
    logger.log(`   NPM                : '${options.npmRelease}'`);
    logger.log(`   Nuget              : '${options.nugetRelease}'`);
    logger.log(`   MantisBT release   : '${options.mantisbtRelease}'`);
    logger.log(`   MantisBT url       : '${options.mantisbtUrl}'`);
    logger.log(`   History file href  : '${options.historyHref}'`);
    logger.log(`   Email hrefs        : '${options.emailHrefs}'`);
    logger.log(`   Vc web path        : '${options.vcWebPath}'`);

    if (incHeader)
    {
        szHrefs = "<table>";

        szHrefs += `<tr><td colspan=\"2\"><b>${options.projectName} ${options.versionText} ${version} has been released.</b><br><br></td></tr>`;

        if ((options.mantisbtRelease === "Y" || options.mantisbtRelease === true) && options.mantisbtUrl) {
            szHrefs += `<tr><td>Release Page</td><td style="padding-left:10px"><a href="${options.mantisbtUrl}/set_project.php?project=${options.projectName}&make_default=no&ref=plugin.php%3Fpage=Releases%2Freleases\">Releases - Projects Board</a></td></tr>`;
        }

        if (options.distRelease === "Y" || options.distRelease === true)
        {
            const targetLoc = path.join(options.distReleasePath, options.projectName, version);
            szHrefs += `<tr><td>Network Location</td><td style="padding-left:10px"><a href="${targetLoc}">Network Drive Location</a></td></tr>`;
        }

        if (npmLocation && (options.npmRelease === "Y" || options.npmRelease === true))
        {
            szHrefs += `<tr><td>NPM Location</td><td style="padding-left:10px"><a href="${npmLocation}">NPM Registry</a></td></tr>`;
        }

        // if (options.nugetRelease === "Y" || options.nugetRelease === true)
        // {
        //     szHrefs += `<tr><td>Nuget Location</td><td style="padding-left:10px"><a href="${options.nugetRelease}">Nuget Registry</a></td></tr>`;
        // }

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
            let eLink = emailHref,
                eLinkName = emailHref,
                eLinkDescrip = "";
            if (emailHref.includes("|"))
            {
                const emailHrefParts = emailHref.split("|");
                eLink = emailHrefParts[0];
                eLinkDescrip = emailHrefParts[1];
                if (emailHrefParts.length > 2) {
                    eLinkName = emailHrefParts[2];
                }
                szHrefs += `<tr><td>${eLinkDescrip}</td><td style="padding-left:10px"><a href="${eLink}">${eLinkName}</a></td></tr>`;
            }
        }

        szHrefs += "</table>";
    }

    return szHrefs;
}
