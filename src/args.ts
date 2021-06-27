
export const publishRcOpts =
{
    branch: [
        true,                     // Can specify on command line
        "string",                 // Value type
        "trunk",                  // Default value
        "The branch to use."      // Help description (multi-line)
    ],

    buildCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage."
    ],

    bugs: [
        true,
        "string",
        "",
        "Overrides the 'bugs' property of package.json when an NPM release is",
        "made, which is extracted for display on the project page of the NPM",
        "repository."
    ],

    changelogFile: [
        true,
        "string",
        "",
        "The location of this changelog file (markdown format), can be a",
        "relative or full path."
    ],

    commitMsgMap: [
        false,
        "object",
        "{ }",
        "A map of additional subject tags used in commits that will be used to",
        "increment the version and be included in the changelog, for example:",
        "",
        "    \"commitMsgMap\": {",
        "        \"internal\": {",
        "            \"versionBump\": \"patch\",",
        "            \"formatText\": \"Internal Change\",",
        "            \"include\": false,",
        "            \"iconCls\": \"fa-building\"",
        "        }",
        "    }"
    ],

    config: [
        true,
        "boolean",
        false,
        [ "-c", "--config" ],
        "Display config.",
        "Note that the default publishrc file is '.publishrc.*'.  A config file can",
        "be one of four different formats:",
        "",
        "    .publishrc.json",
        "    .publishrc.js",
        "    .publishrc.yaml",
        "    .publishrc.yml"
    ],

    cProjectRcFile: [
        true,
        "string",
        "",
        "The RC file name in a C Make project."
    ],

    deployCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the deploy stage."
    ],

    distAddAllToVC: [
        true,
        "flag",
        "N",
        "Add the contents of the directory specified by the 'dist' property to",
        "version control, if not already.",
        "Ignored if distRelease = N."
    ],

    distDocPath: [
        true,
        "string",
        "",
        "The network path to use as the destination directory for a standard",
        "'dist' release's documentation directory.  All PDF files found within",
        "the doc directory specified by the 'distDocPathSrc' property will be",
        "uploaded/copied to this directory.",
        "Ignored if distRelease = N or distDocPathSrc is empty."
    ],

    distDocPathSrc: [
        true,
        "string",
        "",
        "The local path to use as the source directory for a standard 'dist'",
        "'release's documentation directory.  All PDF files found within this",
        "directory are uploaded/copied to the directory specified by the 'distDocPath'",
        "property.",
        "Ignored if distRelease = N or distDocPath is empty."
    ],

    distRelease: [
        true,
        "flag",
        "N",
        "Build a standard release to be uploaded to a network share."
    ],

    distReleasePath: [
        true,
        "string",
        "",
        "The network path to use as the destination directory for a standard 'dist'",
        "directory release.",
        "Will be renamed to 'distDestPath' in a future release.",
        "Ignored if distRelease = N.",
        "The final directory created for the release will be:",
        "   distReleasePath/projectName/nextVersion"
    ],

    distReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, after building",
        "a standard 'dist' release.",
        "Ignored if distRelease = N."
    ],

    distReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, before building",
        "a standard 'dist' release.",
        "Ignored if distRelease = N."
    ],

    dryRun: [
        true,
        "boolean",
        false,
        [ "-d", "--dry-run" ],
        {
            help: "Run in dry/test mode, all changes are reverted.\n" +
                  "In dry-run mode, the following holds:\n" +
                  "    1) Installer is not released/published\n" +
                  "    2) Email notification will be sent only to $TESTEMAILRECIPIENT\n" +
                  "    3) Commit package/build file changes (svn) are not made\n" +
                  "    4) Version tag (svn) is not made\n" +
                  "Some local files may be changed in test mode (i.e. updated version\n" +
                  "numbers in build and package files).  These changes should be\n" +
                  "reverted to original state via SCM"
        }
    ],

    dryRunVcRevert: [
        true,
        "flag",
        "Y",
        "Reverts all file modification made during a 'dry run' using version control."
    ],

    emailHrefs: [
        false,
        "string|string[]",
        "",
        "A link or list of links to insert into an email notification in the form",
        "'link|name'."
    ],

    emailMode: [
        true,
        "enum(std|ssl)",
        "std (Standard / Non-Secure)",
        "The delivery method to use when sending an email notification."
    ],

    emailPort: [
        true,
        "number",
        25,
        "The smtp server port to use when sending an email notification."
    ],

    emailNotification: [
        true,
        "flag",
        "N",
        "Send a release email notification."
    ],

    emailRecip: [
        true,
        "string",
        "",
        "The email address to use as the 'To' address when sending an email",
        "notification."
    ],

    emailSender: [
        true,
        "string",
        "",
        "The email address to use as the 'From' address when sending an email",
        "notification."
    ],

    emailServer: [
        true,
        "string",
        "",
        "The SMTP server to use when sending an email notification."
    ],

    githubAssets: [
        false,
        "string|string[]",
        "",
        "A path to a file resource or list of file resource paths to upload as assets",
        "of the Github release.",
        "Ignored if githubRelease = N."
    ],

    githubChglogEdit: [
        true,
        "flag",
        "N",
        "Edit the manipulated changelog before creating the Github release.",
        "Ignored if githubRelease = N."
    ],

    githubRelease: [
        true,
        "flag",
        "N",
        "Perform a Github releas."
    ],

    githubReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, after creating",
        "a Github release.",
        "Ignored if githubRelease = N."
    ],

    githubReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, before creating",
        "a Github release.",
        "Ignored if githubRelease = N."
    ],

    githubUser: [
        true,
        "string",
        "",
        "The Github username that owns the project the Github release will be made",
        "under.  Used to construct the Github project path i.e. github.com/username",
        "Ignored if githubRelease = N."
    ],

    historyFile: [
        true,
        "string",
        "",
        "The location of this history file, can be a relative or full path."
    ],

    historyHdrFile: [
        true,
        "string",
        "",
        "The location of this history header file, can be a relative or full path."
    ],

    historyLineLen: [
        true,
        "number",
        80,
        "The maximum line lenth to use when parsing commits to populate the",
        "history.txt file"
    ],

    historyHref: [
        false,
        "string|string[]",
        "",
        "A link to the history file to insert into an email notification in raw",
        "html link form i.e. <a href=\"...\">...</a>."
    ],

    homePage: [
        true,
        "string",
        "",
        "Overrides the 'homePage' property of package.json when an NPM release is",
        "made, which is extracted for display on the project page of the NPM",
        "repository."
    ],

    mantisbtApiToken: [
        true,
        "string|string[]",
        "",
        "The MantisBT token or list of tokens to make a MantisBT release with.",
        "Represents the user that the release is made under on the 'Releases' page."
    ],

    mantisbtAssets: [
        false,
        "string|string[]",
        "",
        "A path to a file resource or list of file resource paths to upload as assets",
        "of the MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtChglogEdit: [
        true,
        "flag",
        "N",
        "Edit the manipulated changelog before creating the MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtPlugin: [
        true,
        "flag",
        "N",
        "Specifies this project is a MantisBT plugin."
    ],

    mantisbtProject: [
        true,
        "string",
        "",
        "The MantisBT project name, if different than the main project name specified",
        "by 'projectName'."
    ],

    mantisbtRelease: [
        true,
        "flag",
        "N",
        "Perform a MantisBT release."
    ],

    mantisbtReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, after creating",
        "a MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, before creating",
        "a MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtUrl: [
        false,
        "string|string[]",
        "",
        "A URL or a list of URL's to use for creating a MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    noCi: [
        true,
        "boolean",
        false,
        [ "-nci", "--no-ci" ],
        {
            help: "Run in a local, non-CI environment."
        }
    ],

    npmPackDist: [
        true,
        "flag",
        "Y",
        "Copy the NPM package to the directory specified by 'pathToDist'.",
        "Ignored if npmRelease = N."
    ],

    npmRegistry: [
        true,
        "string",
        "https://registry.npmjs.org",
        "The URL of the NPM registry to use for making an NPM release.",
        "Ignored if npmRelease = N."
    ],

    npmRelease: [
        true,
        "flag",
        "N",
        "Build the NPM release."
    ],

    npmReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, after creating",
        "an NPM release.",
        "Ignored if npmRelease = N."
    ],

    npmReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, before creating",
        "am NPM release.",
        "Ignored if npmRelease = N."
    ],

    npmScope: [
        true,
        "string",
        "",
        "The package scope to use for making an NPM release.",
        "Overrides the scope set in package.json.",
        "Ignored if npmRelease = N."
    ],

    nugetRelease: [
        true,
        "flag",
        "N",
        "Build the nuget release.",
        "Not supported as of this version."
    ],

    pathToDist: [
        true,
        "string",
        "install\\dist",
        "The local path to use as the source directory for a standard 'dist' release.",
        "Will be renamed to 'distSrcPath' in a future release.",
        "Path to DIST should be relative to PATHTOROOT",
        "Ignored if distRelease = N."
    ],

    postBuildCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, after the build ",
        "process is started."
    ],

    preBuildCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, before the build",
        "process is started."
    ],

    postCommitCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the commit stage, after the commit",
        "process is started."
    ],

    preCommitCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the commit stage, before the commit",
        "process is started."
    ],

    postReleaseCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the final release stage, before the",
        "final release process is started."
    ],

    promptVersion: [
        true,
        "flag",
        "N",
        "Prompt for version.  The recommended version will be displayed at the prompt.",
    ],

    projectFileDotNet: [
        true,
        "string",
        "",
        "Relative path to the .NET project version file (AssemblyInfo.cs).",
        "Any .NET assemblyinfo.cs files are attempted to be loaded and matched to a",
        "project, but in the case where it cannot, this property can be set"
    ],

    projectFileExtJs: [
        true,
        "string",
        "",
        "Relative path to the ExtJs project version file (app.json).",
        "Any ExtJs app.json files are attempted to be loaded and matched to a",
        "project, but in the case where it cannot, this property can be set"
    ],

    projectFileNpm: [
        true,
        "string",
        "",
        "Relative path to the NPM project version file (package.json).",
        "Any NPM package.json files are attempted to be loaded and matched to a",
        "project, but in the case where it cannot, this property can be set"
    ],


    projectName: [
        true,
        "string",
        "",
        "Name of the project.  This must match throughout the build",
        "files and the SVN project name."
    ],

    rcFile: [
        true,
        "string",
        ".publishrc.[json/yml/yaml/js]",
        [ "-rc", "--rcfile", "--rc-file" ],
        {
            help: "Use the specified config name.  The config name determines the publishrc\n" +
                  "file to use.  For example, consider the following command line:\n" +
                  "\n" +
                  "    app-publisher --config-name spm\n" +
                  "\n" +
                  "Specifying this will cause the publishrc file named '.publishrc.spm.json\n" +
                  "to be used.\n" +
                  "Note that the default publishrc file is '.publishrc.*'.  Examples:\n" +
                  "\n" +
                  "    .publishrc.json\n" +
                  "    .publishrc.custom.json\n" +
                  "    .publishrc.js\n" +
                  "    .publishrc.yaml\n" +
                  "    .publishrc.yml",
            usage: [
                "app-publisher --rc-file .publishrc.custom.json"
            ]
        }
    ],


    readConfig: [
        true,
        "boolean",
        false,
        [ "-rcfg", "--read-config" ],
        {
            help: "Display the contents of the configuration file."
        }
    ],

    repo: [
        false,
        "string",
        "",
        "The repository URL.  In the form:",
        "",
        "    https://svn.mydomain.com/path/to/repo/projectname/trunk",
        "    https://github.com/username/projectname"
    ],

    repoType: [
        false,
        "enum(git|svn)",
        "git",
        "The repository type. It should be one of the following:",
        "",
        "    1. git",
        "    2. svn"
    ],

    republish: [
        true,
        "boolean",
        false,
        [ "-r", "--republish" ],
        {
            help: "Re-publish the current/latest release."
        }
    ],

    skipChangelogEdits: [
        true,
        "flag",
        "N",
        "Skip manual editing of the changelog file(s).",
        "Note the changelog used for a release will be that of which is output by the",
        "internal commit parser."
    ],

    skipCommit: [
        true,
        "flag",
        "N",
        "Skip committing changes to version control when the final release stage is",
        "finished."
    ],

    skipVersionEdits: [
        true,
        "flag",
        "N",
        "Skip all version edits in version files."
    ],

    taskBuild: [
        true,
        "boolean",
        false,
        [ "-tb", "--task-build" ],
        {
            help: "Runs all scripts defined by the publishrc property 'buildCommand'"
        }
    ],

    taskChangelog: [
        true,
        "boolean",
        false,
        [ "-tc", "--task-changelog" ],
        {
            help: "Export the next release's current changelog and view using the editor\n" +
                  "specified in the .publishrc file.\n" +
                  "Note that this opens the actual versioned changelog/history file."
        }
    ],

    taskChangelogFile: [
        true,
        "string",
        "",
        [ "-tcf", "--task-changelog-file" ],
        {
            help: "Export the next release's current changelog to the specified file,\n" +
                  "can be a relative or an absolute path.\n" +
                  "Ignored if the option '--task-changelog-view' is used.",
            usage: [
                "app-publisher -tcf install/dist/history.txt",
                "app-publisher -tcf build/doc/changelog/changelog.md",
                "app-publisher -tcf c:\\projects\\changelogs\\projectname\\cl.md",
                "app-publisher --task-changelog-file build/tmp/version_notes.txt"
            ]
        }
    ],

    taskChangelogHtmlFile: [
        true,
        "string",
        "",
        [ "-tchf", "--task-changelog-html-file" ],
        {
            help: "Export the next release's current changelog in HTML release format to\n" +
                  "the specified file, can be a relative or an absolute path.\n" +
                  "Ignored if the option '--task-changelog-view' is used.",
            usage: [
                "app-publisher --task-changelog-html-file install/tmp/version_notes.html"
            ]
        }
    ],

    taskChangelogHtmlView: [
        true,
        "boolean",
        false,
        [ "-tchv", "--task-changelog-html-view" ],
        {
            help: "Export the next release's current changelog in HTML release format and\n" +
                  "view using the editor specified in the .publishrc file. The created file\n" +
                  "is a copy stored in a temporary directory specified by the OS."
        }
    ],

    taskChangelogPrint: [
        true,
        "boolean",
        false,
        [ "-tcp", "--task-changelog-print" ],
        {
            help: "Export the next release's current changelog and output to stdout."
        }
    ],

    taskChangelogPrintVersion: [
        true,
        "string",
        "",
        [ "-tcpv", "--task-changelog-print-version" ],
        {
            help: "Export the specified release's current changelog and output to stdout.",
            usage: [
                "app-publisher --no-ci -tcpv 1.2.4",
                "app-publisher --task-changelog-print-version 3.0.1"
            ]
        }
    ],

    taskChangelogView: [
        true,
        "boolean",
        false,
        [ "-tcv", "--task-changelog-view" ],
        {
            help: "Export the next release's current changelog and view using the editor\n" +
                  "specified in the .publishrc file. The created file is a copy stored in\n" +
                  "a temporary directory specified by the OS."
        }
    ],

    taskChangelogViewVersion: [
        true,
        "string",
        "",
        [ "-tcvv", "--task-changelog-view-version" ],
        {
            help: "Export the specified release's current changelog and view using the editor\n" +
                  "specified in the .publishrc file. The created file is a copy stored in\n" +
                  "a temporary directory specified by the OS."
        }
    ],

    taskCiEnv: [
        true,
        "boolean",
        false,
        [ "-tce", "--task-ci-env" ],
        {
            help: "Output the CI environment name to stdout."
        }
    ],

    taskCiEnvInfo: [
        true,
        "boolean",
        false,
        [ "-tcei", "--task-ci-env-info" ],
        {
            help: "Finds CI related build information, and outputs the info to stdout\n" +
                  "using a concatenated string in the form 'current|next|changelogpath'."
        }
    ],

    taskCiEnvSet: [
        true,
        "boolean",
        false,
        [ "-tces", "--task-ci-env-set" ],
        {
            help: "Finds CI related build information, and outputs the info to the file\n" +
                  "'ap.env' in the root workspace directory."
        }
    ],

    taskCommit: [
        true,
        "boolean",
        false,
        [ "-tcm", "--task-commit" ],
        {
            help: "Commits the changes made when using the --touch-versions option,\n" +
                  "using the 'chore: vX.X.X' format for the commit message."
        }
    ],

    taskDeploy: [
        true,
        "boolean",
        false,
        [ "-td", "--task-deploy" ],
        {
            help: "Runs the deployment scripts defined in the .publishrc configuration."
        }
    ],

    taskDevTest: [
        true,
        "boolean",
        false,
        [ "-tdt", "--task-dev-test" ],
        {
            help: "Run temporary tests in the local dev environment.  Note that this\n" +
                  "does nothing when ran in a production build"
        }
    ],

    taskDistRelease: [
        true,
        "boolean",
        false,
        [ "-tdr", "--task-dist-release" ],
        {
            help: "Perform a 'Dist' release."
        }
    ],

    taskEmail: [
        true,
        "boolean",
        false,
        [ "-te", "--task-email" ],
        {
            help: "Re-send the latest notification email."
        }
    ],

    taskGithubRelease: [
        true,
        "boolean",
        false,
        [ "-tgr", "--task-github-release" ],
        {
            help: "Perform a 'Github' release.\n" +
                  "The changelog produced for the Github release will be created from the\n" +
                  "most recent entry of the changelog/history file."
        }
    ],

    taskMantisbtRelease: [
        true,
        "boolean",
        false,
        [ "-tmr", "--task-mantisbt-release" ],
        {
            help: "Perform a 'Mantis' release.\n" +
                  "The changelog produced for the Mantis release will be created from the\n" +
                  "most recent entry of the changelog/history file."
        }
    ],

    taskNpmJsonRestore: [
        true,
        "boolean",
        false,
        [ "-tnjr", "--task-npm-json-restore" ],
        {
            help: "Restores changes made to the package.json file as a result of using the\n" +
                  "--task-npm-json-update task." +
                  "Properties include:\n" +
                  "    bugs, homepage, repo, repoType" +
                  "Note that this task should in most cases always be ran following the use\n" +
                  "of the --task-npm-json-update task."
        }
    ],

    taskNpmJsonUpdate: [
        true,
        "boolean",
        false,
        [ "-tnju", "--task-npm-json-update" ],
        {
            help: "Updates package.json with .publishrc defined properties.\n" +
                  "Properties include:\n" +
                  "    bugs, homepage, repo, repoType\n" +
                  "Can be used for publishing to multiple npm repositories.\n" +
                  "Note that this task should in most cases always be followed up with a\n" +
                  " --task-npm-json-restore task."
        }
    ],

    taskNpmRelease: [
        true,
        "boolean",
        false,
        [ "-tnr", "--task-npm-release" ],
        {
            help: "Perform an 'NPM' release (publish)."
        }
    ],

    taskNugetRelease: [
        true,
        "boolean",
        false,
        [ "-tngr", "--task-nuget-release" ],
        {
            help: "Perform a 'Nuget' release (not implemented yet)."
        }
    ],

    taskRevert: [
        true,
        "boolean",
        false,
        [ "-tr", "--task-revert" ],
        {
            help: "Reverts all local changes."
        }
    ],

    taskTag: [
        true,
        "string",
        "auto",
        [ "-tt", "--task-tag" ],
        {
            help: "Creates a tag using the 'vX.X.X' format for the tag name.\n" +
                  "The 'taskVersionUpdate' and 'taskVersionUpdateCommit' tasks should\n" +
                  "always precede this task.\n" +
                  "If 'auto' is specified as the positional argument, the version # used\n" +
                  "will be the current version as calculated using the current state of\n" +
                  "the workspace 'version' files (as defined in .publishrc).\n" +
                  "Defaults to 'auto'",
            usage: [
                "app-publisher --task-tag auto",
                "app-publisher --task-tag v2.0.1"
            ]
        }
    ],

    taskVersionCurrent: [
        true,
        "boolean",
        false,
        [ "-tvc", "--task-version-current" ],
        {
            help: "Finds the current/latest version released and outputs that version\n" +
                  "string to stdout.\n" +
                  "Ignored if the --task-version-info switch is used."
        }
    ],

    taskVersionInfo: [
        true,
        "boolean",
        false,
        [ "-tvi", "--task-version-info" ],
        {
            help: "Finds the current/latest and next version released, and outputs the\n" +
                  "info to stdout using a concatenated string in the form 'current|next'.\n" +
                  "Note that this switch overrides both the --task-version-current and the\n" +
                  "--task-version-current switches."
        }
    ],

    taskVersionNext: [
        true,
        "boolean",
        false,
        [ "-tvn", "--task-version-next" ],
        {
            help: "Calculates the next version to be released based on versioned files\n" +
                  "and commit messages. and outputs that version string to stdout.\n" +
                  "Ignored if the --task-version-info switch is used."
        }
    ],

    taskVersionPreReleaseId: [
        true,
        "string",
        "",
        [ "-tvprid", "--task-version-pre-release-id" ],
        {
            help: "Gets the identifier denoting a pre-release from a version string.\n" +
                  "For example, the version string 2.20.11-alpha.3 has a pre-release\n" +
                  "identifier of 'alpha'.",
            usage: [
                "app-publisher --task-version-pre-release-id 2.0.1-alpha.1",
                "app-publisher --task-version-pre-release-id 2.0.1-beta.3"
            ]
        }
    ],

    taskVersionUpdate: [
        true,
        "boolean",
        false,
        [ "-tvu", "--task-version-update" ],
        {
            help: "Update version numbers either semantically or incrementally.\n" +
                  "Versioned files are by default AssemblyInfo.cs, package.json, and\n" +
                  "app.json.\n" +
                  "Additional versioned files are specified in the .publishrc file\n" +
                  "using the 'versionFiles' and cProjectRcFile' properties."
        }
    ],

    testEmailRecip: [
        true,
        "string",
        "",
        "The email address to use as the 'To' address when sending an email",
        "notification while running in dry run mode."
    ],

    textEditor: [
        true,
        "string",
        "notepad.exe",
        "The editor program to use when opening version files for manual editing."
    ],

    vcTagPrefix: [
        true,
        "string",
        "v",
        "Tag prefix for the version tag.  Labels the created tag in the form prefix-vX.X.X."
    ],

    vcWebPath: [
        true,
        "string",
        "",
        "Web path to version control repository, if WebSVN is available"
    ],

    versionFiles: [
        false,
        "object[]",
        [],
        "A file path or list of file paths to perform version string replacement in.",
        "Example:",
        "",
        "     \"versionFiles\": [{",
        "         \"path\": \"..\\..\\install\\GEMS2_64bit.nsi\",",
        "         \"regex\": \"!define +BUILD_LEVEL +VERSION\"",
        "         \"regexVersion\": \"[0-9a-zA-Z\\.\\-]{5,}\",",
        "         \"regexWrite\": \"!define BUILD_LEVEL      \"VERSION\"",
        "     },",
        "     {",
        "         \"path\": \"..\\..\\install\\GEMS2_64bit.nsi\",",
        "         \"regex\": \"!define +\"BUILD_LEVEL +VERSION\",",
        "         \"regexVersion\": \"[0-9a-zA-Z\\.\\-]{5,}\",",
        "         \"regexWrite\": \"!define BUILD_LEVEL      \"VERSION\"",
        "     },",
        "     {",
        "         \"path\": \"..\\svr\\assemblyinfo.cs\",",
        "         \"regex\": \"AssemblyVersion *\\(VERSION,",
        "         \"regexVersion\": \" *\"([0-9]+\\.[0-9]+\\.[0-9]+",
        "         \"regexWrite\": \"AssemblyVersion\\(VERSION)\",",
        "         \"versionInfo\": {",
        "             \"system\": \"semver\"",
        "         },",
        "         \"setFiles\": [{",
        "             \"path\": \"app.json\",",
        "             \"regex\": \"svrVersion\" *: *\"VERSION\"",
        "             \"regexVersion\": \"[0-9a-zA-Z\\.\\-]{5,}\",",
        "             \"regexWrite\": \"svrVersion\": \"VERSION\"",
        "             \"versionInfo\": {",
        "                 \"system\": \"semver\"",
        "             }",
        "         }]",
        "     }]",
        "",
        "The regex must contain a 'capturing group' to obtain the version, and it must",
        "be the first group if it contains more than one."
    ],

    versionForceCurrent: [
        true,
        "boolean",
        "",
        [ "-vfc", "--version-force-current" ],
        {
            help: "Force current version, for use with post release tasks such as re-sending\n" +
                  "an email notification or performing a GitHub release if for whever reason\n" +
                  "it failed on the publish run.",
            usage: [
                "app-publisher --task-email --version-force-current"
            ]
        }
    ],

    versionForceNext: [
        true,
        "string",
        "",
        [ "-vfn", "--version-force-next" ],
        {
            help: "A version number to use as the 'next version'.  Version calculation will\n" +
                  "not be performed other than for reading in the current version, skipping\n" +
                  "an SCM step.",
            usage: [
                "app-publisher --version-force-next 300", "app-publisher --version-force-next 2.0.0"
            ]
        }
    ],

    versionFilesEditAlways: [
        false,
        "string|string[]",
        "",
        "A file path or list of file paths to always perform version string replacement",
        "in, regardless of whether the 'skipVersionEdits' flag is set."
    ],

    versionFilesScrollDown: [
        false,
        "string|string[]",
        "",
        "A file path or list of file paths where sroll-down is perfoemed when opened",
        "for editing."
    ],

    versionProperty: [
        true,
        "string",
        "",
        "A version property to be used or a project that does not use a package.json",
        "file.  Versions specified by this property should be in the same format as",
        "that of a package.json file and can be semantically parsed.",
    ],

    versionReplaceTags: [
        false,
        "string|string[]",
        "",
        "A tag or list of tags to use for performing version string replacement in files",
        "specified by 'versionFiles', and default versioned files (e.g. package.json)."
    ],

    versionPreReleaseId: [
        true,
        "string",
        "",
        [ "--version-pre-release-id" ],
        {
            help: "An identifier denoting a pre-release can to be appenended to the next\n" +
                  "version number to produce the final version string, e.g. 'alpha'\n" +
                  "produces the final version string of x.y.z-alpha.",
            usage: [
                "app-publisher --version-pre-release-id alpha", "app-publisher --version-pre-release-id pre1"
            ]
        }
    ],

    versionText: [
        true,
        "string",
        "Version",
        "The text tag to use in the history file for preceding the version number.  It",
        "should be one of the following:",
        "",
        "    1. Version",
        "    2. Build",
        "    3. Release"
    ],

    writeLog: [
        true,
        "flag",
        "N",
        "In addition to stdout, writes a log to LOCALAPPDATA\\app-publisher\\log"
    ]
};
