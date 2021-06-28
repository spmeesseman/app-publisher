/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { ICommitMessageMap, IContext, IOptions, IVersionFile } from "../interface";
import { expect } from "chai";
import getContext = require("../lib/get-context");
import getOptions = require("../lib/get-options");
import validateOptions = require("../lib/validate-options");


suite("Options tests", () =>
{
    suiteSetup(async () =>
    {
		
	});


	suiteTeardown(async () =>
    {
		
	});


    test("checking default options", async () =>
    {
        const procArgv = [ ...process.argv ];
        process.argv = [ "", "" ];

        const cmdOpts = getOptions(false),
              context = await getContext(cmdOpts, process.cwd(), process.env, process.stdout, process.stderr),
              options = context.options;

        await validateOptions(context);

        console.log(JSON.stringify(options, undefined, 2));
        console.log(process.cwd());
        expect(options.taskBuild).to.equal(undefined, "taskBuild");
        expect(options.historyLineLen).to.equal(80);
        expect(options.skipVersionEdits).to.equal("Y");
        expect(options.skipChangelogEdits).to.equal("N");
        // expect(options.interactivity.modes.emitters).to.be.empty;
        expect(options.versionFiles).to.be.an("array").to.be.empty; // .to.have.property("path"); //.to.equal("#fff");

        options.taskCiEnv = true;

        process.argv = procArgv;
    });
});
