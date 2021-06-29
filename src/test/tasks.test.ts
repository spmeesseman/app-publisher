/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { ICommitMessageMap, IContext, IOptions, IVersionFile } from "../interface";
import { expect } from "chai";
import getContext = require("../lib/get-context");
import getOptions = require("../lib/get-options");
import validateOptions = require("../lib/validate-options");
import { getApOptions, runApTest, sleep } from "./helper";


suite("Options tests", () =>
{

    test("stdout tasks", async () =>
    {
        // const options = await getApOptions([ "--no-ci" ]);
        const options = await getApOptions();

        options.noCi = !options.ciInfo.isCi;

        options.taskCiEnv = true;
        await runApTest(options);

        sleep(500);

        options.taskCiEnv = false;
        options.taskDevTest = true;
        await runApTest(options);

        sleep(500);

        options.taskDevTest = false;
        options.taskVersionCurrent = true;
        await runApTest(options);
    });


    test("version tasks", async () =>
    {
        // const options = await getApOptions([ "--no-ci" ]);
        const options = await getApOptions();

        options.noCi = !options.ciInfo.isCi;

        options.taskVersionCurrent = true;
        await runApTest(options);
    });

});
