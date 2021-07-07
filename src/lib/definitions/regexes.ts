
//
// TODO - add all regexes in app here
//

//
// Note that [\s\S]*? isnt working in JS, had to use [^]*? for a non-greedy grab, which isnt
// supported in anything other than a JS regex.  Also, /Z doesnt work for 'end of string' in
// a multi-line regex in JS, so we use the ###END### temp tag to mark it
//

const ISSUES = /\[{0,1}(?:&nbsp;| )*((?:bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(?:&nbsp;| )*#[0-9]+(?:(&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,})(&nbsp;| )*\]{0,1}/gmi;
const ISSUE_TAG = /(?:bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?)/gmi;

const CHANGELOG_TXT_VERSION_SECTION = (versionText: string) => {
    return new RegExp(`(?:^${versionText} ([0-9a-zA-Z\\-\\.]{3,})[\r\n]+.+[\r\n]+[\\-]{20,}[\r\n]+[\\*]{20,}[^]+?(?=[\\*]{20,})[\\*]{20,}[\r\n]+)([^]*?)(?=^${versionText}|###END###)`, "gm");
};

const CHANGELOG_MD_VERSION_SECTION = (versionText: string) => {
  return new RegExp(`(?:^## ${versionText} \\[([0-9a-zA-Z\\-\\.]{3,})\\] {0,1}\\([a-zA-Z0-9 ,:\\/\\.]+\\)[\r\n]+)([^]*?)(?=^${versionText}|###END###)`, "gm");
};

const HELP_EXTRACT_FROM_README = /(?:^## Command Line and Options[\r\n]+)([^]*?)(?=^## Development Notes|###END###)/gm;
const HELP_EXTRACT_OPTION = /(?:^### ([\w]+[\r\n]+))([^]*?)(?=^### [\w]+|^## [\w]+|###END###)/gm;
const HELP_EXTRACT_FROM_INTERFACE = /(?:^export interface IArgs[\r\n]+\{[\r\n]+)([^]*?)(?=^\}[\r\n]*###END###)/gm;

const HELP_SECTION = /^[\w\-\*\. ]+[^]*/mi;
const HELP_NAME = /### (\w+)/m;
const HELP_TYPE = /\*\*Value Type\*\* *\|(?:\*__)([\\\w| \[\]\(\)]+)(?:__\*)/m;
const HELP_DEFAULT_VALUE = /\*\*Value Default\*\* *\|(?:([\w,\[\]]*))*/m;
const HELP_ARG = /\*\*Command Line Arg\*\* *\|(?:\*__)([\\\w\-| \/]+)(?:__\*)/m;
//
// Group 1 - Text
// Group 2 - URL / hash
//
const HELP_LINK = /\[([\w _-]+)\]\(((?:#|http)[\w\:\.\/\-\_]+)\)/gmi;

const regexes = {
  CHANGELOG_MD_VERSION_SECTION,
  CHANGELOG_TXT_VERSION_SECTION,
  HELP_EXTRACT_FROM_INTERFACE,
  HELP_EXTRACT_FROM_README,
  HELP_EXTRACT_OPTION,
  HELP_ARG,
  HELP_LINK,
  HELP_NAME,
  HELP_SECTION,
  HELP_TYPE,
  HELP_DEFAULT_VALUE,
  ISSUE_TAG,
  ISSUES
};

export = regexes;
