import AppPublisherError from "./plugins/error";
import ERROR_DEFINITIONS from "./definitions/errors";

export = getError;

function getError(code, ctx = {})
{
  const {message, details} = ERROR_DEFINITIONS[code](ctx);
  return new AppPublisherError(message, code, details);
}
