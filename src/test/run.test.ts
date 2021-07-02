/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { getApOptions, runApTest, sleep } from "./helper";


suite("Full Run Tests", () =>
{

    test("dry run full", async () =>
    {
        let options = await getApOptions([ "--dry-run" ]);
        expect(await runApTest(options)).to.equal(0, "task: full dry run default config");
        sleep(500);

        options = await getApOptions([ "--dry-run", "--config-name", "svn" ]);
        expect(await runApTest(options)).to.equal(0, "task: full dry run svn config");
        sleep(500);

    }).timeout(120000);

});
