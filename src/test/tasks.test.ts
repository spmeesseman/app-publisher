/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { fstat } from "fs";
import { deleteFile } from "../lib/utils/fs";
import { getApOptions, runApTest, sleep } from "./helper";


suite("Tasks Tests", () =>
{

    test("stdout info tasks", async () =>
    {
        let options = await getApOptions([ "--version"]);
        expect(await runApTest(options, "task: stdout: version")).to.equal(0, "task: stdout: version");
        sleep(500);

        options = await getApOptions([ "--help"]);
        expect(await runApTest(options, "task: stdout: help")).to.equal(0, "task: stdout: help");
        sleep(500);

        options = await getApOptions([ "--config"]);
        expect(await runApTest(options, "task: stdout: config")).to.equal(0, "task: stdout: config");
        sleep(500);


        options = await getApOptions([ "--task-dev-test"]);
        expect(await runApTest(options, "task: stdout: dev test")).to.equal(0, "task: stdout: dev test");
        sleep(500);
    });


    test("ci tasks", async () =>
    {
        let options = await getApOptions([ "--task-ci-env"]);
        expect(await runApTest(options, "task: ci env")).to.equal(0, "task: ci env");
        sleep(500);

        options = await getApOptions([ "--task-ci-env-info"]);
        expect(await runApTest(options, "task: ci env info")).to.equal(0, "task: ci env info");
        sleep(500);

        options = await getApOptions([ "--task-ci-env-set"]);
        expect(await runApTest(options, "task: ci env set file")).to.equal(0, "task: ci env set file");
        await deleteFile("ap.env");
        sleep(500);
    });


    test("version stdout tasks", async () =>
    {
        let options = await getApOptions([ "--task-version-current"]);
        expect(await runApTest(options, "task: version-current")).to.equal(0, "task: version-current");
        // expect(await stdout_runApTest(options)).to.be.a("string", "task: version-current").and.not.be.empty;
        sleep(500);

        options = await getApOptions([ "--task-version-next"]);
        expect(await runApTest(options, "task: version-next")).to.equal(0, "task: version-next");
        sleep(500);

        options = await getApOptions([ "--task-version-info"]);
        expect(await runApTest(options, "task: version-next")).to.equal(0, "task: version-next");
        sleep(500);
    });


    test("changelog tasks", async () =>
    {
        let options = await getApOptions([ "--task-changelog-print"]);
        expect(await runApTest(options, "task: changelog print")).to.equal(0, "task: changelog print");
        sleep(500);

        options = await getApOptions([ "--task-changelog-print-version", "3.0.0" ]);
        expect(await runApTest(options, "task: changelog print version")).to.equal(0, "task: changelog print version");
        sleep(500);

        options = await getApOptions([ "--task-changelog-print-version"]); // fail (no positional parameter)
        expect(await runApTest(options, "task: changelog print version (fail)")).to.equal(1, "task: changelog print version (fail)");
        sleep(500);
    });


    test("release tasks", async () =>
    {
        let options = await getApOptions([ "--task-dist-release", "--version-force-current", "--dry-run", "--config-name", "svn" ]);
        expect(await runApTest(options, "task: dist release")).to.equal(0, "task: dist release");
        sleep(500);

        options = await getApOptions([ "--task-github-release", "--version-force-current", "--dry-run" ]);
        expect(await runApTest(options, "task: github release")).to.equal(0, "task: github release");
        sleep(500);

        options = await getApOptions([ "--task-mantisbt-release", "--version-force-current", "--dry-run", "--config-name", "svn" ]);
        expect(await runApTest(options, "task: mantisbt release")).to.equal(0, "task: mantisbt release");
        sleep(500);
    });


    test("file update tasks", async () =>
    {
        let options = await getApOptions([ "--task-version-update"]);
        expect(await runApTest(options, "task: file update: version-update")).to.equal(0, "task: file update: version-update");
        // expect(await stdout_runApTest(options)).to.be.a("string", "task: version-current").and.not.be.empty;
        sleep(500);

        options = await getApOptions([ "--task-commit", "--dry-run" ]);
        expect(await runApTest(options, "task: file update: commit")).to.equal(0, "task: file update: commit");
        sleep(500);

        options = await getApOptions([ "--task-version-update"]);
        expect(await runApTest(options, "task: file update: version-update")).to.equal(0, "task: file update: version-update");
        // expect(await stdout_runApTest(options)).to.be.a("string", "task: version-current").and.not.be.empty;
        sleep(500);

        options = await getApOptions([ "--task-commit", "--task-tag", "--dry-run" ]);
        expect(await runApTest(options, "task: file update: commit")).to.equal(0, "task: file update: commit");
        sleep(500);

        options = await getApOptions([ "--task-changelog" ]);
        expect(await runApTest(options, "task: file update: changelog")).to.equal(0, "task: file update: changelog");
        sleep(500);

        options = await getApOptions([ "--task-revert" ]);
        expect(await runApTest(options, "task: file update: revert")).to.equal(0, "task: file update: revert");
        sleep(500);
    }).timeout(60000);


    test("email tasks", async () =>
    {

        let options = await getApOptions([ "--task-email", "--version-force-current", "--config-name", "svn" ]);
        expect(await runApTest(options, "task: email (std)")).to.equal(0, "task: email (std)");
        sleep(500);

        // options = await getApOptions([ "--task-email", "--version-force-current" ]);
        // expect(await runApTest(options)).to.equal(0, "task: email (ssl)");
        // sleep(500);

        options = await getApOptions([ "--task-email", "--version-force-current", "--dry-run", "--config-name", "svn" ]);
        expect(await runApTest(options, "task: email (std dry run)")).to.equal(0, "task: email (std dry run)");
        sleep(500);

        // options = await getApOptions([ "--task-email", "--version-force-current", "--dry-run" ]);
        // expect(await runApTest(options)).to.equal(0, "task: email (ssl dry run)");
        // sleep(500);
    });

});
