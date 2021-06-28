/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { ICommitMessageMap, IContext, IOptions, IVersionFile } from "../interface";
import { expect } from "chai";
import getOptions = require("../lib/get-options");
import { runApTest } from "./helper";


describe("Options tests", () =>
{
    it("checking default options", async () =>
    {
        const options = getOptions(false);

        

        // console.log(options.taskBuild);

        expect(options.taskBuild).to.equal(false, "taskBuild");
        expect(options.historyFile).to.equal(80);
        expect(options.skipVersionEdits).to.equal("Y");
        expect(options.skipChangelogEdits).to.equal("N");
        // expect(options.interactivity.modes.emitters).to.be.empty;
        expect(options.versionFiles).to.be.an("array").to.have.property("path"); //.to.equal("#fff");

        options.taskCiEnv = true;
        runApTest(options);
    });
});
