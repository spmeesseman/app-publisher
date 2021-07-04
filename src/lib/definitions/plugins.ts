const { isString, isPlainObject } = require("lodash");
const { getHead } = require("../repo");
const hideSensitive = require("../hide-sensitive");
const { hideSensitiveValues } = require("../utils/utils");
const { RELEASE_TYPE, RELEASE_NOTES_SEPARATOR } = require("./constants");

export = {

    verifyConditions:
    {
        required: false,
        dryRun: true,
        pipelineConfig: () => ({ settleAll: true }),
    },

    verifyRelease:
    {
        required: false,
        dryRun: true,
        pipelineConfig: () => ({ settleAll: true }),
    },

    generateNotes:
    {
        required: false,
        dryRun: true,
        outputValidator: output => !output || isString(output),
        pipelineConfig: () => ({
            getNextInput: ({ nextRelease, ...context }, notes) => ({
                ...context,
                nextRelease: {
                    ...nextRelease,
                    notes: `${context.changelog.notes ? `${context.changelog.notes}${RELEASE_NOTES_SEPARATOR}` : ""}${notes}`,
                },
            }),
        }),
        postprocess: (results, { env }) => hideSensitive(env)(results.filter(Boolean).join(RELEASE_NOTES_SEPARATOR)),
    },

    prepare:
    {
        required: false,
        dryRun: false,
        pipelineConfig: ({ generateNotes }) => ({
            getNextInput: async context =>
            {
                const newGitHead = await getHead(context);
                // If previous prepare plugin has created a commit (head changed)
                if (context.nextRelease.head !== newGitHead)
                {
                    context.nextRelease.head = newGitHead;
                    // Regenerate the release notes
                    context.changelog.notes = await generateNotes(context);
                }

                // Call the next prepare plugin with the updated `nextRelease`
                return context;
            },
        }),
    },

    publish:
    {
        required: false,
        dryRun: false,
        outputValidator: output => !output || isPlainObject(output),
        pipelineConfig: () => ({
            // Add `nextRelease` and plugin properties to published release
            transform: (release, step, { nextRelease }) => ({
                ...(release === false ? {} : nextRelease),
                ...release,
                ...step,
            }),
        }),
    },

    success:
    {
        required: false,
        dryRun: false,
        pipelineConfig: () => ({ settleAll: true }),
        preprocess: ({ releases, env, ...inputs }) => ({ ...inputs, env, releases: hideSensitiveValues(env, releases) }),
    },

    fail:
    {
        required: false,
        dryRun: false,
        pipelineConfig: () => ({ settleAll: true }),
        preprocess: ({ errors, env, ...inputs }) => ({ ...inputs, env, errors: hideSensitiveValues(env, errors) }),
    },
};
