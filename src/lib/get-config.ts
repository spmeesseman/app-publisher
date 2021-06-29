import { castArray, pickBy, isNil, isString, isPlainObject } from "lodash";
import { IOptions } from "../interface";
const PLUGINS_DEFINITIONS = require("./definitions/plugins");
const { validatePlugin, parseConfig } = require("./plugins/utils");
const readPkgUp = require("read-pkg-up");
const cosmiconfig = require("cosmiconfig");
const resolveFrom = require("resolve-from");
const envCi = require("@spmeesseman/env-ci");
const plugins = require("./plugins");

export = getConfig;


async function getConfig(context: any, opts: IOptions)
{
    let configName = "publishrc";
    if (opts.configName)
    {
        configName = "publishrc." + opts.configName;
    }

    let configFiles: string[];

    if (opts.rcFile)
    {
        configFiles = [
            "package.json",
            opts.rcFile
        ];
    }
    else
    {
        configFiles = [
            "package.json",
            `.${configName}`,
            `.${configName}.json`,
            `.${configName}.yaml`,
            `.${configName}.yml`,
            `.${configName}.js`
        ];
    }

    const { cwd, env } = context;
    const { config, filepath } = (await cosmiconfig(configName, { searchPlaces: configFiles }).search(cwd)) || { config: {}, filepath: "" };

    // Merge config file options and CLI/API options
    let options = { ...config, ...opts };
    if (options.ci === false)
    {
        options.noCi = true;
    }

    options.configFilePath = filepath;

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
        repo: (await pkgRepoUrl({ normalize: false, cwd })), // || (await repoUrl(context)),
        repoType: (await pkgRepoType({ normalize: false, cwd })),
        // tagFormat: `${options.vcTagPrefix}\${version}`,
        tagFormat: `v\${version}`,
        plugins: [],
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
        optStr = optStr.replace(new RegExp(envVar, "gmi"), process.env[key].replace(/\\/, "\\\\"));
    }
    options = JSON.parse(optStr);

    options.ciInfo = envCi({ env, cwd, repoType: options.repoType });

    //
    // TODO - plugins maybe?
    //
    return { options, plugins: [] };
    // return { options, plugins: await plugins({ ...context, options }, pluginsPath) };
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
