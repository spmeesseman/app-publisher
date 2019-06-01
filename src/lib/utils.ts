import { isFunction } from "lodash";
import hideSensitive = require("./hide-sensitive");

export function extractErrors(err) {
    return err && isFunction(err[Symbol.iterator]) ? [...err] : [err];
}

export function hideSensitiveValues(env, objs)
{
    const hideFunction = hideSensitive(env);
    return objs.map(obj => {
        Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop]) {
            obj[prop] = hideFunction(obj[prop]);
        }
        });
        return obj;
    });
}
