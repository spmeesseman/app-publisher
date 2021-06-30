/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { ICommitMessageMap, IContext, IOptions, IVersionFile } from "../interface";
import { expect } from "chai";
import getContext = require("../lib/get-context");
import getOptions = require("../lib/get-options");
import validateOptions = require("../lib/validate-options");
import { getApOptions, runApTest, sleep } from "./helper";


suite("Tasks tests", () =>
{

    test("stdout tasks", async () =>
    {
        let options = await getApOptions([ "--task-ci-env"]);
        expect(await runApTest(options)).to.equal(0, "task: ci env");
        sleep(500);

        options = await getApOptions([ "--task-dev-test"]);
        expect(await runApTest(options)).to.equal(0, "task: dev test");
        sleep(500);
    });


    test("version tasks", async () =>
    {
        const options = await getApOptions([ "--task-version-current"]);
        expect(await runApTest(options)).to.equal(0, "task: version-current");
        // expect(await stdout_runApTest(options)).to.be.a("string", "task: version-current").and.not.be.empty;
        sleep(500);
    });

});
