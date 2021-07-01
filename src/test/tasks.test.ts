/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { getApOptions, runApTest, sleep } from "./helper";


suite("Tasks Tests", () =>
{

    test("info tasks", async () =>
    {
        // let options = await getApOptions([ "--version"]);
        // expect(await runApTest(options)).to.equal(0, "stdout: version");
        // sleep(500);

        // options = await getApOptions([ "--help"]);
        // expect(await runApTest(options)).to.equal(0, "task: help");
        // sleep(500);

        const options = await getApOptions([ "--task-dev-test"]);
        expect(await runApTest(options)).to.equal(0, "task: dev test");
        sleep(500);
    });


    test("ci tasks", async () =>
    {
        const options = await getApOptions([ "--task-ci-env"]);
        expect(await runApTest(options)).to.equal(0, "task: ci env");
        sleep(500);
    });


    test("version stdout tasks", async () =>
    {
        let options = await getApOptions([ "--task-version-current"]);
        expect(await runApTest(options)).to.equal(0, "task: version-current");
        // expect(await stdout_runApTest(options)).to.be.a("string", "task: version-current").and.not.be.empty;
        sleep(500);

        options = await getApOptions([ "--task-version-next"]);
        expect(await runApTest(options)).to.equal(0, "task: version-next");
        sleep(500);

        options = await getApOptions([ "--task-version-info"]);
        expect(await runApTest(options)).to.equal(0, "task: version-next");
        sleep(500);
    });


    test("changelog tasks", async () =>
    {
        let options = await getApOptions([ "--task-changelog-print"]);
        expect(await runApTest(options)).to.equal(0, "task: changelog print");
        sleep(500);

        options = await getApOptions([ "--task-changelog-print-version", "2.0.0" ]);
        expect(await runApTest(options)).to.equal(0, "task: changelog print version");
        sleep(500);

        options = await getApOptions([ "--task-changelog-print-version"]); // fail (no positional parameter)
        expect(await runApTest(options)).to.equal(1, "task: changelog print version (fail)");
        sleep(500);
    });

});
