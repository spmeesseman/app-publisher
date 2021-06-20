import * as nodemailer from "nodemailer";
import { getHistory, getChangelog } from "./changelog-file";
import { properCase } from "./utils";

// async..await is not allowed in global scope, must use a wrapper
export async function sendNotificationEmail({options, logger, lastRelease}): Promise<boolean>
{
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

    // encoding="plain" (from ant)   ps cmd: -Encoding ASCII
    let emailBody = "";
    if (options.historyFile)
    {
        logger.log("   Converting history text to html");
        emailBody = await getHistory({options, logger, lastRelease}, 1) as string;
    }
    else if (options.changelogFile)
    {
        logger.log("   Converting changelog markdown to html");
        emailBody = await getChangelog({options, logger, lastRelease}, 1) as string;
    }
    else {
        logger.error("   Notification could not be sent, history file not specified");
        return false;
    }

    if (!emailBody || emailBody.length === 0 || emailBody[0] === "error") {
        emailBody = "There was an error extracting the changelog, notify development";
    }
    else {
        emailBody = emailBody[0];
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
        let subject = `${projectNameFmt} ${options.versionText} ${lastRelease.version}`;
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
