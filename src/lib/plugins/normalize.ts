import { isPlainObject, isFunction, noop, cloneDeep, omit } from "lodash";
import getError from "../get-error";
const { extractErrors } = require("../utils");
import PLUGINS_DEFINITIONS from "../definitions/plugins";
import { loadPlugin, parseConfig } from "./utils";
import { EOL } from "os";

export = (context: any, type: any, pluginOpt: any, pluginsPath: string) =>
{
    const { stdout, stderr, options, logger } = context;
    if (!pluginOpt)
    {
        return noop;
    }

    const [name, config] = parseConfig(pluginOpt);
    const pluginName = name.pluginName ? name.pluginName : isFunction(name) ? `[Function: ${name.name}]` : name;
    const plugin = loadPlugin(context, name, pluginsPath);

    if (options.verbose) {
        context.stdout.write(`Options for ${pluginName}/${type}${EOL}` + JSON.stringify(config, undefined, 2));
    }

    let func;
    if (isFunction(plugin))
    {
        func = plugin.bind(null, cloneDeep({ ...options, ...config }));
    }
    else if (isPlainObject(plugin) && plugin[type] && isFunction(plugin[type]))
    {
        func = plugin[type].bind(null, cloneDeep({ ...options, ...config }));
    }
    else
    {
        throw getError("EPLUGIN", { type, pluginName });
    }

    const validator = async input =>
    {
        const { dryRun = undefined, outputValidator = undefined } = PLUGINS_DEFINITIONS[type] || {};
        try
        {
            if (!input.options.dryRun || dryRun)
            {
                logger.log(`Start step "${type}" of plugin "${pluginName}"`);
                const result = await func({
                    ...cloneDeep(omit(input, ["stdout", "stderr", "logger"])),
                    stdout,
                    stderr,
                    logger: logger.scope(logger.scopeName, pluginName),
                });
                if (outputValidator && !outputValidator(result))
                {
                    throw getError(`E${type.toUpperCase()}OUTPUT`, { result, pluginName });
                }

                logger.success(`Completed step "${type}" of plugin "${pluginName}"`);
                return result;
            }

            logger.warn(`Skip step "${type}" of plugin "${pluginName}" in dry-run mode`);
        } catch (error)
        {
            logger.error(`Failed step "${type}" of plugin "${pluginName}"`);
            extractErrors(error).forEach(err => Object.assign(err, { pluginName }));
            throw error;
        }
    };

    Reflect.defineProperty(validator, "pluginName", { value: pluginName, writable: false, enumerable: true });

    if (!isFunction(pluginOpt))
    {
        if (pluginsPath[name])
        {
            logger.success(`Loaded plugin "${type}" from "${pluginName}" in shareable config "${pluginsPath[name]}"`);
        } else
        {
            logger.success(`Loaded plugin "${type}" from "${pluginName}"`);
        }
    }

    return validator;
};
