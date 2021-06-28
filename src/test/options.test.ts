/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { ICommitMessageMap, IContext, IOptions, IVersionFile } from "../interface";
import { expect } from "chai";
import getContext = require("../lib/get-context");
import getOptions = require("../lib/get-options");
import validateOptions = require("../lib/validate-options");
import { AsyncResource } from "async_hooks";
import getConfig = require("../lib/get-config");


suite("Options tests", () =>
{
    let procArgv: any,
        cmdOpts: any,
        context: IContext,
        options: IOptions;

    suiteSetup(async () =>
    {
		procArgv = [ ...process.argv ];
        process.argv = [ "", "" ];
	});


	suiteTeardown(async () =>
    {
		process.argv = procArgv;
	});


    test("check default options", async () =>
    {
        cmdOpts = getOptions(false),
        context = await getContext(cmdOpts, process.cwd(), process.env, process.stdout, process.stderr),
        options = context.options;
        await validateOptions(context);

        console.log(JSON.stringify(options, undefined, 2));

        expect(options.taskBuild).to.equal(undefined, "taskBuild");
        expect(options.historyLineLen).to.equal(80, "historyLineLen");
        expect(options.skipVersionEdits).to.equal("Y", "skipVersionEdits");
        expect(options.skipChangelogEdits).to.equal("Y", "skipChangelogEdits");

        // options.noCi = true;
        process.argv = [ "", "", "--no-ci" ];
        cmdOpts = getOptions(false),
        { options } = await getConfig(context, cmdOpts);
        await validateOptions(context);

        expect(options.skipVersionEdits).to.equal("Y", "skipVersionEdits (--no-ci)");
        expect(options.skipChangelogEdits).to.equal("N", "skipChangelogEdits (--no-ci)");

        // expect(options.interactivity.modes.emitters).to.be.empty;
        // expect(options.versionFiles).to.be.an("array").to.be.empty; // .to.have.property("path"); //.to.equal("#fff");

        options.taskCiEnv = true;
    });

});
