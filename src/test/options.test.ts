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
import { getApOptions } from "./helper";


suite("Options tests", () =>
{
    // suiteSetup(async () =>
    // {
	//
	// });


    // // eslint-disable-next-line @typescript-eslint/no-empty-function
	// suiteTeardown(async () =>
    // {
	//
	// });


    test("check default options", async () =>
    {
        const options = await getApOptions();

        expect(options.taskBuild).to.equal(undefined, "taskBuild");
        expect(options.taskChangelog).to.equal(undefined, "taskChangelog");
        expect(options.taskChangelogFile).to.equal(undefined, "taskChangelogFile");
        expect(options.taskChangelogHtmlFile).to.equal(undefined, "taskChangelogHtmlFile");
        expect(options.taskChangelogPrint).to.equal(undefined, "taskChangelogPrint");
        expect(options.taskChangelogPrintVersion).to.equal(undefined, "taskChangelogPrintVersion");
        expect(options.taskChangelogView).to.equal(undefined, "taskChangelogView");
        expect(options.taskChangelogViewVersion).to.equal(undefined, "taskChangelogViewVersion");
        expect(options.taskCiEnv).to.equal(undefined, "taskCiEnv");
        expect(options.taskCiEnvInfo).to.equal(undefined, "taskCiEnvInfo");
        expect(options.taskCiEnvSet).to.equal(undefined, "taskCiEnvSet");
        expect(options.taskCommit).to.equal(undefined, "taskCommit");
        expect(options.taskDeploy).to.equal(undefined, "taskDeploy");
        expect(options.taskDevTest).to.equal(undefined, "taskDevTest");
        expect(options.taskDistRelease).to.equal(undefined, "taskDistRelease");
        expect(options.taskEmail).to.equal(undefined, "taskEmail");
        expect(options.taskGithubRelease).to.equal(undefined, "taskGithubRelease");
        expect(options.taskMantisbtRelease).to.equal(undefined, "taskMantisbtRelease");
        expect(options.taskNpmJsonRestore).to.equal(undefined, "taskNpmJsonRestore");
        expect(options.taskNpmJsonUpdate).to.equal(undefined, "taskNpmJsonUpdate");
        expect(options.taskNpmRelease).to.equal(undefined, "taskNpmRelease");
        expect(options.taskNugetRelease).to.equal(undefined, "taskNugetRelease");
        expect(options.taskRevert).to.equal(undefined, "taskRevert");
        expect(options.taskTag).to.equal(undefined, "taskTag");
        expect(options.taskVersionCurrent).to.equal(undefined, "taskVersionCurrent");
        expect(options.taskVersionInfo).to.equal(undefined, "taskVersionInfo");
        expect(options.taskVersionNext).to.equal(undefined, "taskVersionNext");
        expect(options.taskVersionPreReleaseId).to.equal(undefined, "taskVersionPreReleaseId");
        expect(options.taskVersionUpdate).to.equal(undefined, "taskVersionUpdate");

        expect(options.taskMode).to.equal(undefined, "taskMode");
        expect(options.taskModeStdOut).to.equal(false, "taskModeStdOut");

        expect(options.historyLineLen).to.equal(80, "historyLineLen");
        expect(options.buildCommand).to.be.an("array").that.is.empty;
        expect(options.appPublisherVersion).to.be.a("string").that.is.not.empty;
        //
        // ci env should always clear these flags to default/empty
        //
        expect(options.skipVersionEdits).to.equal("Y", "skipVersionEdits");
        expect(options.skipChangelogEdits).to.equal("Y", "skipChangelogEdits");
        expect(options.skipChangelogEdits).to.equal("N", "promptVersion (no ci)");
        expect(options.versionFilesEditAlways).to.be.an("array").and.is.empty;
    });


    test("check default options (no ci)", async () =>
    {
        const options = await getApOptions([ "--no-ci" ]);
        expect(options.skipVersionEdits).to.equal("Y", "skipVersionEdits (no ci)");
        expect(options.skipChangelogEdits).to.equal("N", "skipChangelogEdits (no ci)");
    });


    test("check default options (task mode)", async () =>
    {
        let options = await getApOptions([ "--task-version-update" ]);
        expect(options.taskVersionUpdate).to.equal(true, "taskVersionUpdate");
        expect(options.taskMode).to.equal(true, "taskMode");
        expect(options.taskModeStdOut).to.equal(false, "taskModeStdOut");
        expect(options.skipVersionEdits).to.equal("Y", "skipVersionEdits (task mode)");
        expect(options.skipChangelogEdits).to.equal("Y", "skipChangelogEdits (task mode)");

        options = await getApOptions([ "--task-version-next" ]);
        expect(options.taskMode).to.equal(true, "taskMode");
        expect(options.taskModeStdOut).to.equal(true, "taskModeStdOut");
    });

});
