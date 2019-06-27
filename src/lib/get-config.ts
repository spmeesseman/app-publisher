import { castArray, pickBy, isNil, isString, isPlainObject } from "lodash";
const readPkgUp = require("read-pkg-up");
const cosmiconfig = require("cosmiconfig");
const resolveFrom = require("resolve-from");
const debug = require("debug")("app-publisher:config");
const { repoUrl } = require("./repo");
const PLUGINS_DEFINITIONS = require("./definitions/plugins");
const plugins = require("./plugins");
const { validatePlugin, parseConfig } = require("./plugins/utils");

const CONFIG_NAME = "publishrc";
const CONFIG_FILES = [
    "package.json",
    `.${CONFIG_NAME}`,
    `.${CONFIG_NAME}.json`,
    `.${CONFIG_NAME}.yaml`,
    `.${CONFIG_NAME}.yml`,
    `.${CONFIG_NAME}.js`
];

export = getConfig;

async function getConfig(context: any, opts: any)
{
    const { cwd, env } = context;
    const { config, filepath } = (await cosmiconfig(CONFIG_NAME, { searchPlaces: CONFIG_FILES }).search(cwd)) || { config: {}, filepath: "" };

    debug("load config from: %s", filepath);

    // Merge config file options and CLI/API options
    let options = { ...config, ...opts };
    if (options.ci === false)
    {
        options.noCi = true;
    }

    const pluginsPath = { path: undefined };
    let extendPaths;
    ({ extends: extendPaths, ...options } = options);
    if (extendPaths)
    {
        // If `extends` is defined, load and merge each shareable config with `options`
        options = {
            ...castArray(extendPaths).reduce((result, extendPath) =>
            {
                const extendsOpts = require(resolveFrom.silent(__dirname, extendPath) || resolveFrom(cwd, extendPath));

                // For each plugin defined in a shareable config, save in `pluginsPath` the extendable config path,
                // so those plugin will be loaded relatively to the config file
                Object.entries(extendsOpts)
                    .filter(([, value]) => Boolean(value))
                    .reduce((pluginsPath, [option, value]) =>
                    {
                        castArray(value).forEach(plugin =>
                        {
                            if (option === "plugins" && validatePlugin(plugin))
                            {
                                pluginsPath[parseConfig(plugin)[0]] = extendPath;
                            } else if (
                                PLUGINS_DEFINITIONS[option] &&
                                (isString(plugin) || (isPlainObject(plugin) && isString(plugin["path"])))
                            )
                            {
                                pluginsPath[isString(plugin) ? plugin : plugin["path"]] = extendPath;
                            }
                        });
                        return pluginsPath;
                    }, pluginsPath);

                return { ...result, ...extendsOpts };
            }, {}),
            ...options,
        };
    }

    // Set default options values if not defined yet
    options = {
        branch: (await defBranch({ normalize: false, cwd })),
        repo: (await pkgRepoUrl({ normalize: false, cwd })) || (await repoUrl({ cwd, env })),
        repoType: (await pkgRepoType({ normalize: false, cwd })),
        tagFormat: `v\${version}`,
        plugins: [
            // "@app-publisher/commit-analyzer",
            // "@app-publisher/release-notes-generator",
            // "@app-publisher/npm",
            // "@app-publisher/github"
        ],
        // Remove `null` and `undefined` options so they can be replaced with default ones
        ...pickBy(options, option => !isNil(option)),
    };

    //
    // Replace environment variables
    //
    // Environment variables in .publishconfig should be in the form:
    //
    //     ${VARIABLE_NAME}
    //
    let optStr = JSON.stringify(options);
    for (const key in process.env)
    {
        const envVar = "[$][{]\\b" + key + "\\b[}]";
        optStr = optStr.replace(new RegExp(envVar, "mgi"), process.env[key].replace(/\\/, "\\\\"));
    }"
    options = JSON.parse(optStr);

    debug("options values: %O", options);

    return { options, plugins: await plugins({ ...context, options }, pluginsPath) };
}

async function pkgRepoUrl(opts)
{
    const pkg = await readPkgUp(opts);
    if (!pkg) {
        return "";
    }
    return pkg.package && (isPlainObject(pkg.package.repository) ? pkg.package.repository.url : pkg.package.repository);
}

async function pkgRepoType(opts)
{
    const pkg = await readPkgUp(opts);
    if (!pkg) {
        return "";
    }
    return pkg.package && (isPlainObject(pkg.package.repository) ? pkg.package.repository.type : "git");
}

async function defBranch(opts)
{
    const pkg = await readPkgUp(opts);
    if (!pkg) {
        return "";
    }
    return pkg.package && (isPlainObject(pkg.package.repository) ? (pkg.package.repository.type === "git" ? "master" : "trunk") : "trunk");
}
