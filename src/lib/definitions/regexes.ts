
//
// TODO - add all regexes in app here
//

//
// Note that [\s\S]*? isnt working in JS, had to use [^]*? for a non-greedy grab, which isnt
// supported in anything other than a JS regex.  Also, /Z doesnt work for 'end of string' in
// a multi-line regex in JS, so we use the ###END### temp tag to mark it
//

const REGEX_CHANGELOG_MD_MSG_TICKET_TAGS = /\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/gi;

const REGEX_CHANGELOG_TXT_VERSION_SECTION = (versionText: string) => {
    return new RegExp(`(?:^${versionText} ([0-9a-zA-Z\\-\\.]{3,})[\r\n]+.+[\r\n]+[\\-]{20,}[\r\n]+[\\*]{20,}[^]+?(?=[\\*]{20,})[\\*]{20,}[\r\n]+)([^]*?)(?=^${versionText}|###END###)`, "gm");
};

const REGEX_CHANGELOG_MD_VERSION_SECTION = (versionText: string) => {
  return new RegExp(`(?:^## ${versionText} \\[([0-9a-zA-Z\\-\\.]{3,})\\] {0,1}\\([a-zA-Z0-9 ,:\\/\\.]+\\)[\r\n]+)([^]*?)(?=^${versionText}|###END###)`, "gm");
};

const REGEX_HELP_EXTRACT_FROM_README = /(?:^## Command Line and Options[\r\n]+)([^]*?)(?=^## Development Notes|###END###)/gm;
const REGEX_HELP_EXTRACT_OPTION = /(?:^### ([\w]+[\r\n]+))([^]*?)(?=^### [\w]+|^## [\w]+|###END###)/gm;
const REGEX_HELP_EXTRACT_FROM_INTERFACE = /(?:^export interface IArgs[\r\n]+\{[\r\n]+)([^]*?)(?=^\}[\r\n]*###END###)/gm;

const REGEX_HELP_SECTION = /^[\w\-\*\. ]+[^]*/mi;
const REGEX_HELP_NAME = /### (\w+)/m;
const REGEX_HELP_TYPE = /\*\*Value Type\*\* *\|(?:\*__)([\\\w| \[\]\(\)]+)(?:__\*)/m;
const REGEX_HELP_DEFAULT_VALUE = /\*\*Value Default\*\* *\|(?:([\w,\[\]]*))*/m;
const REGEX_HELP_ARG = /\*\*Command Line Arg\*\* *\|(?:\*__)([\\\w\-| \/]+)(?:__\*)/m;

const regexes = {
  REGEX_CHANGELOG_MD_MSG_TICKET_TAGS,
  REGEX_CHANGELOG_MD_VERSION_SECTION,
  REGEX_CHANGELOG_TXT_VERSION_SECTION,
  REGEX_HELP_EXTRACT_FROM_INTERFACE,
  REGEX_HELP_EXTRACT_FROM_README,
  REGEX_HELP_EXTRACT_OPTION,
  REGEX_HELP_ARG,
  REGEX_HELP_NAME,
  REGEX_HELP_SECTION,
  REGEX_HELP_TYPE,
  REGEX_HELP_DEFAULT_VALUE
};

export = regexes;
