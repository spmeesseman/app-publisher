
import { template } from "lodash";
import AggregateError from "aggregate-error";
import { isGitRepo, isSvnRepo, verifyTagName } from "./repo";
import getError from "./get-error";
import { IContext } from "../interface";

export = verify;

async function verify(context: IContext)
{
    const errors = [];
    const { cwd, options: { repo, repoType, tagFormat } } = context;

    if (repoType === "git")
    {
        if (!(await isGitRepo(context)))
        {
            errors.push(getError("ENOGITREPO", { cwd }));
        }
    }
    else
    {
        if (!(await isSvnRepo(context)))
        {
            errors.push(getError("ENOGITREPO", { cwd }));
        }
    }

    if (!repo)
    {
        errors.push(getError("ENOREPOURL"));
    }
    else if (!repoType)
    {
        errors.push(getError("ENOREPOTYPE"));
    }

    // Verify that compiling the `tagFormat` produce a valid vcs tag
    if (!(await verifyTagName(context, template(tagFormat)({ version: "0.0.0" }))))
    {
        errors.push(getError("EINVALIDTAGFORMAT", { tagFormat }));
    }

    // Verify the `tagFormat` contains the variable `version` by compiling the `tagFormat` template
    // with a space as the `version` value and verify the result contains the space.
    // The space is used as it's an invalid tag character, so it's guaranteed to no be present in the `tagFormat`.
    if ((template(tagFormat)({ version: " " }).match(/ /g) || []).length !== 1)
    {
        errors.push(getError("ETAGNOVERSION", { tagFormat }));
    }

    if (errors.length > 0)
    {
        throw new AggregateError(errors);
    }
}
