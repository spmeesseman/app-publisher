/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { ICommitMessageMap, IContext, IOptions, IVersionFile } from "../interface";
import { expect } from "chai";
import getContext = require("../lib/get-context");
import getOptions = require("../lib/get-options");
import validateOptions = require("../lib/validate-options");
import { runApTest } from "./helper";


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

        options.taskCiEnv = true;
        runApTest(options);

        process.argv = procArgv;
    });

});
