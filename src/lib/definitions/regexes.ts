
//
// TODO - add all regexes in app here
//

const REGEX_CHANGELOG_MD_MSG_TICKET_TAGS = /\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]/gi;

const REGEX_CHANGELOG_TXT_VERSION_SECTION = (versionText: string) => {
    return new RegExp(`(?:^${versionText} ([0-9a-zA-Z\\-\\.]{3,})[\r\n]+.+[\r\n]+[\\-]{20,}[\r\n]+[\\*]{20,}[^]+?(?=[\\*]{20,})[\\*]{20,}[\r\n]+)([^]*?)(?=^${versionText}|###END###)`, "gm");
};

const REGEX_CHANGELOG_MD_VERSION_SECTION = (versionText: string) => {
  return new RegExp(`(?:^## ${versionText} \\[([0-9a-zA-Z\\-\\.]{3,})\\] {0,1}\\([a-zA-Z0-9 ,:\\/\\.]+\\)[\r\n]+)([^]*?)(?=^${versionText}|###END###)`, "gm");
};

const regexes = {
  REGEX_CHANGELOG_MD_MSG_TICKET_TAGS,
  REGEX_CHANGELOG_MD_VERSION_SECTION,
  REGEX_CHANGELOG_TXT_VERSION_SECTION
};

export = regexes;
