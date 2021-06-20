const RELEASE_TYPE = ["prerelease", "prepatch", "patch", "preminor", "minor", "premajor", "major"];

const FIRST_RELEASE = "1.0.0";

const FIRST_RELEASE_INC = "100";

const APP_NAME = "app-publisher";

const COMMIT_NAME = APP_NAME + "-bot";

const COMMIT_EMAIL = APP_NAME + "-bot@gmail.com";

const RELEASE_NOTES_SEPARATOR = "\n\n";

const SECRET_REPLACEMENT = "[secure]";

const SECRET_MIN_SIZE = 5;

const constants = {
  APP_NAME,
  RELEASE_TYPE,
  FIRST_RELEASE,
  FIRST_RELEASE_INC,
  COMMIT_NAME,
  COMMIT_EMAIL,
  RELEASE_NOTES_SEPARATOR,
  SECRET_REPLACEMENT,
  SECRET_MIN_SIZE
};

export = constants;
