export const publishRcOpts =
{

    branch: [
        true,
        "string",
        "",
        [ "-b", "--branch" ],
        {
            help: "The branch to use.\n" +
                  "\n" +
                  "For SVN, this should include the path to the branches directory, e.g.:\n" +
                  "\n" +
                  "    branches/branch-name\n" +
                  "\n" +
                  "SVN branch support can only work if there is a 'per project' branching\n" +
                  "folder / structure.  It is assumed that the 'tags' folders is named by\n" +
                  "convention, i.e. '/tags'",
            helpPrivate: false
        }
    ],

    buildCommand: [
        true,
        "string | string[]",
        "",
        [ "-bc", "--build-command" ],
        {
            help: "A script or list of scripts to run for the build stage.",
            helpPrivate: false
        }
    ],

    bugs: [
        true,
        "string",
        "",
        [ "--bugs" ],
        {
            help: "Overrides the 'bugs' property of package.json when an NPM release is made,\n" +
                  "which is extracted for display on the project page of the NPM repository.",
            helpPrivate: false
        }
    ],

    changelogFile: [
        true,
        "string",
        "CHANGELOG",
        [ "-cf", "--changelog-file" ],
        {
            help: "The location of this changelog file (markdown or text format), should\n" +
                  "be a path relative to the project's root.",
            helpPrivate: false
        }
    ],

    changelogHdrFile: [
        true,
        "string",
        "",
        [ "-chf", "--changelog-hdr-file" ],
        {
            help: "The location of this history header file, should be a path relative to\n" +
                  "the project's root.",
            helpPrivate: false
        }
    ],

    changelogLineLen: [
        true,
        "number",
        80,
        [ "-cll", "--changelog-line-len" ],
        {
            help: "The maximum line lenth to use when parsing commits to populate the changelog\n" +
                  "file.",
            helpPrivate: false
        }
    ],

    commitMsgMap: [
        true,
        "ICommitMessageMap[]",
        "",
        [],
        {
            help: "A map of additional subject tags used in commits that will be used to\n" +
                  "increment the version and be included in the changelog, for example:\n" +
                  "\n" +
                  "    \"commitMsgMap\": {\n" +
                  "        \"internal\": {\n" +
                  "            \"versionBump\": \"patch\n" +
                  "            \"formatText\": \"Internal Change\n" +
                  "            \"include\": false,\n" +
                  "            \"iconCls\": \"fa-building\n" +
                  "        }\n" +
                  "    }",
            helpPrivate: false
        }
    ],

    config: [
        true,
        "boolean",
        false,
        [ "-c", "--config" ],
        {
            help: "Displays the configuration object and exits, for debugging.  Note that\n" +
                  "the default publishrc file is '.publishrc.*'.  A config file can be one\n" +
                  "of four different formats:\n" +
                  "\n" +
                  "    .publishrc.json\n" +
                  "    .publishrc.js\n" +
                  "    .publishrc.yaml\n" +
                  "    .publishrc.yml\n" +
                  "    package.json { publish: { ... } }",
            helpPrivate: false
        }
    ],

    configName: [
        true,
        "string",
        "",
        [ "-cn", "--config-name" ],
        {
            help: "Use config name.  Note that the default publishrc file is '.publishrc.*'.\n" +
                  " A config name can dyanimically modify the file used.  For example, a\n" +
                  "config name of 'cst' will yield a search for the following config files:\n" +
                  "\n" +
                  "    .publishrc.cst.json\n" +
                  "    .publishrc.cst.js\n" +
                  "    .publishrc.cst.yaml\n" +
                  "    .publishrc.cst.yml\n" +
                  "    package.json { publish.cst: { ... } }",
            helpPrivate: false
        }
    ],

    cProjectRcFile: [
        true,
        "string",
        "",
        [ "-cprf", "--c-project-rc-file" ],
        {
            help: "The RC file name in a C Make project.",
            helpPrivate: false
        }
    ],

    deployCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the deploy stage.",
            helpPrivate: false
        }
    ],

    distAddAllToVC: [
        true,
        "flag",
        "N",
        [ "-davc", "--dist-add-all-to-vc" ],
        {
            help: "Add the contents of the directory specified by the 'dist' property to\n" +
                  "version control, if not already.\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    distDocPath: [
        true,
        "string",
        "",
        [],
        {
            help: "The network path to use as the destination directory for a standard `dist`\n" +
                  "release's documentation directory.  All PDF files found within the doc\n" +
                  "directory specified by the 'distDocPathSrc' property will be uploaded/copied\n" +
                  "to this directory.\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\" or `distDocPathSrc` is empty.",
            helpPrivate: false
        }
    ],

    distDocPathSrc: [
        true,
        "string",
        "",
        [ "-ddps", "--dist-doc-path-src" ],
        {
            help: "The local path to use as the source directory for a standard 'dist' release's\n" +
                  "documentation directory.  All PDF files found within this directory are\n" +
                  "uploaded/copied to the directory specified by the 'distDocPath' property.\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\" or `distDocPath` is empty.",
            helpPrivate: false
        }
    ],

    distRelease: [
        true,
        "flag",
        "N",
        [ "-dr", "--dist-release" ],
        {
            help: "Build a standard release to be uploaded to a network share.",
            helpPrivate: false
        }
    ],

    distReleasePath: [
        true,
        "string",
        "",
        [ "-drp", "--dist-release-path" ],
        {
            help: "The network path to use as the destination directory for a standard `dist`\n" +
                  "directory release.  Will be renamed to 'distDestPath' in a future release.\n" +
                  "\n" +
                  "The final directory created for the release will be:\n" +
                  "\n" +
                  "   distReleasePath/projectName/nextVersion\"\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    distReleasePathSrc: [
        true,
        "string",
        "install",
        [ "-drps", "--dist-release-path-src" ],
        {
            help: "The local path to use as the source directory for a standard 'dist' release.\n" +
                  " Will be renamed to 'distSrcPath' in a future release.\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    distReleasePostCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the build stage, after building\n" +
                  "a standard `dist` release.\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    distReleasePreCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the build stage, before building\n" +
                  "a standard `dist` release.\n" +
                  "\n" +
                  "Ignored if `distRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    dryRun: [
        true,
        "boolean",
        false,
        [ "-dr", "--dry-run" ],
        {
            help: "Run in dry/test mode, all changes are reverted.\n" +
                  "\n" +
                  "In dry-run mode, the following holds:\n" +
                  "\n" +
                  "1) Installer is not released/published\n" +
                  "2) Email notification will be sent only to $TESTEMAILRECIPIENT\n" +
                  "3) Commit package/build file changes (svn) are not made\n" +
                  "4) Version tag (svn) is not made\n" +
                  "\n" +
                  "Some local files may be changed in test mode (i.e. updated version numbers\n" +
                  "in build and package files).  These changes should be reverted to original\n" +
                  "state via SCM.",
            helpPrivate: false
        }
    ],

    dryRunQuiet: [
        true,
        "boolean",
        false,
        [ "-drq", "--dry-run-quiet" ],
        {
            help: "Same as 'dryRun', but minus stdout logging in the release emulations.",
            helpPrivate: false
        }
    ],

    emailHrefs: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A link or list of links to insert into an email notification in the form\n" +
                  "'link|name'.",
            helpPrivate: false
        }
    ],

    emailMode: [
        true,
        "enum(std|ssl)",
        "std",
        [],
        {
            help: "The delivery method to use when sending an email notification, possible\n" +
                  "values are:\n" +
                  "\n" +
                  "    ssl (Secure)\n" +
                  "    std (Standard / Non-Secure)",
            helpPrivate: false
        }
    ],

    emailPort: [
        true,
        "number",
        25,
        [],
        {
            help: "The smtp server port to use when sending an email notification.",
            helpPrivate: false
        }
    ],

    emailNotification: [
        true,
        "flag",
        "N",
        [ "-en", "--email-notification" ],
        {
            help: "Send a release email notification.",
            helpPrivate: false
        }
    ],

    emailRecip: [
        true,
        "string | string[]",
        "",
        [ "-er", "--email-recip" ],
        {
            help: "The email address to use as the 'To' address when sending an email notification.",
            helpPrivate: false
        }
    ],

    emailSender: [
        true,
        "string",
        "",
        [ "-ef", "--email-sender" ],
        {
            help: "The email address to use as the 'From' address when sending an email notification.",
            helpPrivate: false
        }
    ],

    emailServer: [
        true,
        "string",
        "",
        [ "-es", "--email-server" ],
        {
            help: "The SMTP server to use when sending an email notification.",
            helpPrivate: false
        }
    ],

    githubAssets: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A path to a file resource or list of file resource paths to upload as\n" +
                  "assets of the Github release.\n" +
                  "\n" +
                  "Ignored if `githubRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    githubChglogEdit: [
        true,
        "flag",
        "N",
        [ "-gce", "--github-chglog-edit" ],
        {
            help: "Edit the manipulated changelog before creating the Github release.\n" +
                  "\n" +
                  "Ignored if `githubRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    githubRelease: [
        true,
        "flag",
        "N",
        [ "-gr", "--github-release" ],
        {
            help: "Perform a Github releas.",
            helpPrivate: false
        }
    ],

    githubReleasePostCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the release stage, after creating\n" +
                  "a Github release.\n" +
                  "\n" +
                  "Ignored if `githubRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    githubReleasePreCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the release stage, before creating\n" +
                  "a Github release.\n" +
                  "\n" +
                  "Ignored if `githubRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    githubUser: [
        true,
        "string",
        "",
        [ "-gu", "--github-user" ],
        {
            help: "The Github username that owns the project the Github release will be made\n" +
                  "under.  Used to construct the Github project path i.e. github.com/username.\n" +
                  "\n" +
                  "Ignored if `githubRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    help: [
        true,
        "boolean",
        false,
        [ "-h", "--help" ],
        {
            help: "Display console help.",
            helpPrivate: false
        }
    ],

    homePage: [
        true,
        "string",
        "",
        [ "--home-page" ],
        {
            help: "Overrides the `homePage` property of package.json when an NPM release\n" +
                  "is made, which is extracted for display on the project page of the NPM\n" +
                  "repository.",
            helpPrivate: false
        }
    ],

    mantisbtApiToken: [
        true,
        "string",
        "",
        [],
        {
            help: "The MantisBT token or list of tokens to make a MantisBT release with.\n" +
                  " Represents the user that the release is made under on the 'Releases'\n" +
                  "page.",
            helpPrivate: false
        }
    ],

    mantisbtAssets: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A path to a file resource or list of file resource paths to upload as\n" +
                  "assets of the MantisBT release.\n" +
                  "\n" +
                  "Ignored if `mantisbtRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    mantisbtChglogEdit: [
        true,
        "flag",
        "N",
        [ "-mce", "--mantisbt-chglog-edit" ],
        {
            help: "Edit the manipulated changelog before creating the MantisBT release.\n" +
                  "\n" +
                  "Ignored if `mantisbtRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    mantisbtPlugin: [
        true,
        "string",
        "",
        [ "-mp", "--mantisbt-plugin" ],
        {
            help: "Specifies the main project file for a MantisBT plugin project.  The file\n" +
                  "extension must be '.php'\"",
            helpPrivate: false
        }
    ],

    mantisbtProject: [
        true,
        "string",
        "",
        [ "-mpn", "--mantisbt-project" ],
        {
            help: "The MantisBT project name, if different than the main project name specified\n" +
                  "by `projectName`.",
            helpPrivate: false
        }
    ],

    mantisbtRelease: [
        true,
        "flag",
        "N",
        [ "-mr", "--mantisbt-release" ],
        {
            help: "Perform a MantisBT release.",
            helpPrivate: false
        }
    ],

    mantisbtReleasePostCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the release stage, after creating\n" +
                  "a MantisBT release.\n" +
                  "\n" +
                  "Ignored if `mantisbtRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    mantisbtReleasePreCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the release stage, before creating\n" +
                  "a MantisBT release.\n" +
                  "\n" +
                  "Ignored if `mantisbtRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    mantisbtUrl: [
        true,
        "string",
        "",
        [ "--amntisbt-url" ],
        {
            help: "The URL to use for creating a MantisBT release.\n" +
                  "\n" +
                  "Ignored if `mantisbtRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    noCi: [
        true,
        "boolean",
        false,
        [ "-nc", "--no-ci" ],
        {
            help: "Run in a local, non-CI environment.",
            helpPrivate: false
        }
    ],

    npmPackDist: [
        true,
        "flag",
        "N",
        [ "-npd", "--npm-pack-dist" ],
        {
            help: "Copy the NPM package to the directory specified by `distReleasePathSrc`.\n" +
                  "\n" +
                  "File is renamed from what is output by NPM, it is named as:\n" +
                  "\n" +
                  "    projectname.tgz\n" +
                  "\n" +
                  "If the --config-name option is used, the file is named as:\n" +
                  "\n" +
                  "    projectname-configname.tgz\n" +
                  "\n" +
                  "Ignored if `npmRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    npmRegistry: [
        true,
        "string",
        "",
        [ "-nrg", "--npm-registry" ],
        {
            help: "The URL of the NPM registry to use for making an NPM release.  This needs\n" +
                  "to be set if this is a privately hosted repository.  Should be in the\n" +
                  "form:\n" +
                  "\n" +
                  "    https://npm.mydomain.com\n" +
                  "\n" +
                  "Ignored if `npmRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    npmRelease: [
        true,
        "flag",
        "N",
        [ "-nr", "--npm-release" ],
        {
            help: "Build and make an NPM release.",
            helpPrivate: false
        }
    ],

    npmReleasePostCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the release stage, after creating\n" +
                  "an NPM release.\n" +
                  "\n" +
                  "Ignored if `npmRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    npmReleasePreCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the release stage, before creating\n" +
                  "an NPM release.\n" +
                  "\n" +
                  "Ignored if `npmRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    npmScope: [
        true,
        "string",
        "",
        [ "-ns", "--npm-scope" ],
        {
            help: "The package scope to use for making an NPM release.\n" +
                  "Overrides the scope set in package.json.\n" +
                  "Ignored if `npmRelease` = \"N\".",
            helpPrivate: false
        }
    ],

    nugetRelease: [
        true,
        "flag",
        "N",
        [ "-ngr", "--nuget-release" ],
        {
            help: "Build and make a Nuget release.  Not supported as of v3.",
            helpPrivate: false
        }
    ],

    postBuildCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the build stage, after the build\n" +
                  "process is started.",
            helpPrivate: false
        }
    ],

    preBuildCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the build stage, before the build\n" +
                  "process is started.",
            helpPrivate: false
        }
    ],

    postCommitCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the commit stage, after the commit\n" +
                  "process is started.",
            helpPrivate: false
        }
    ],

    preCommitCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the commit stage, before the commit\n" +
                  "process is started.",
            helpPrivate: false
        }
    ],

    postReleaseCommand: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A script or list of scripts to run for the final release stage, before\n" +
                  "the final release process is started.",
            helpPrivate: false
        }
    ],

    promptVersion: [
        true,
        "flag",
        "N",
        [ "-pv", "--prompt-version" ],
        {
            help: "Prompt for version.  The recommended version will be displayed at the\n" +
                  "prompt.",
            helpPrivate: false
        }
    ],

    projectFileDotNet: [
        true,
        "string",
        "",
        [ "-pfdn", "--project-file-dot-net" ],
        {
            help: "Relative path to the .NET project version file (AssemblyInfo.cs).  Any\n" +
                  ".NET assemblyinfo.cs files are attempted to be loaded and matched to a\n" +
                  "project, but in the case where it cannot, this property can be set.\"",
            helpPrivate: false
        }
    ],

    projectFileExtJs: [
        true,
        "string",
        "",
        [ "-pfej", "--project-file-ext-js" ],
        {
            help: "Relative path to the ExtJs project version file (app.json).\n" +
                  "Any ExtJs app.json files are attempted to be loaded and matched to a\n" +
                  "project, but in the case where it cannot, this property can be set.\"",
            helpPrivate: false
        }
    ],

    projectFileNpm: [
        true,
        "string",
        "",
        [ "-pfn", "--project-file-npm" ],
        {
            help: "Relative path to the NPM project version file (package.json).  Any NPM\n" +
                  "package.json files are attempted to be loaded and matched to a project,\n" +
                  "but in the case where it cannot, this property can be set.",
            helpPrivate: false
        }
    ],

    projectName: [
        true,
        "string",
        "",
        [ "-pn", "--project-name" ],
        {
            help: "Name of the project.  This must match throughout the build files and the\n" +
                  "VCS project name.",
            helpPrivate: false
        }
    ],

    projectVersion: [
        true,
        "string",
        "",
        [],
        {
            help: "Utility field for tracking version if no other mechanism is available.",
            helpPrivate: false
        }
    ],

    repo: [
        true,
        "string",
        "",
        [ "-rp", "--repo" ],
        {
            help: "The repository URL.  In the form:\n" +
                  "\n" +
                  "    https://svn.mydomain.com/path/to/repo/projectname/trunk\n" +
                  "    https://github.com/username/projectname",
            helpPrivate: false
        }
    ],

    repoType: [
        true,
        "enum(git|svn)",
        "git",
        [ "-rpt", "--repo-type" ],
        {
            help: "The repository type. It should be one of the following:\n" +
                  "\n" +
                  " 1. git\n" +
                  " 2. svn",
            helpPrivate: false
        }
    ],

    republish: [
        true,
        "boolean",
        false,
        [ "-r", "--republish" ],
        {
            help: "Re-publish the current/latest release.  Can be used for multi-publish\n" +
                  "configurations to bypass local version file validation.",
            helpPrivate: false
        }
    ],

    skipChangelogEdits: [
        true,
        "flag",
        "N",
        [ "-sce", "--skip-changelog-edits" ],
        {
            help: "Skip manual editing of the changelog file(s).  Note the changelog used\n" +
                  "for a release will be that of which is output by the internal commit parser.",
            helpPrivate: false
        }
    ],

    skipCommit: [
        true,
        "flag",
        "N",
        [ "-sc", "--skip-commit" ],
        {
            help: "Skip committing changes to version control when the final release stage\n" +
                  "is finished (commit stage).",
            helpPrivate: false
        }
    ],

    skipTag: [
        true,
        "string",
        "N",
        [ "-st", "--skip-tag" ],
        {
            help: "Skip tagging version in version control when the final release stage is\n" +
                  "finished (commit stage).",
            helpPrivate: false
        }
    ],

    skipVersionEdits: [
        true,
        "flag",
        "N",
        [ "-sve", "--skip-version-edits" ],
        {
            help: "Skip all version edits in version files.",
            helpPrivate: false
        }
    ],

    taskBuild: [
        true,
        "boolean",
        false,
        [ "-tb", "--task-build" ],
        {
            help: "Runs all scripts defined by the publishrc property buildCommand`.",
            helpPrivate: false
        }
    ],

    taskChangelog: [
        true,
        "boolean",
        false,
        [ "-tc", "--task-changelog" ],
        {
            help: "Export the next release's current changelog and view using the editor\n" +
                  "specified in the .publishrc file.  Note that this opens the actual versioned\n" +
                  "changelog/history file.",
            helpPrivate: false
        }
    ],

    taskChangelogFile: [
        true,
        "string",
        "",
        [ "-tcf", "--task-changelog-file" ],
        {
            help: "Export the next release's current changelog to the specified file, can\n" +
                  "be a relative or an absolute path.  Ignored if the option '--task-changelog-view'\n" +
                  "is used.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher -tcf install/dist/history.txt\n" +
                  "    app-publisher -tcf build/doc/changelog/changelog.md\n" +
                  "    app-publisher -tcf c:\\projects\\changelogs\\projectname\\cl.md\n" +
                  "    app-publisher --task-changelog-file build/tmp/version_notes.txt",
            helpPrivate: false
        }
    ],

    taskChangelogHtmlFile: [
        true,
        "string",
        "",
        [ "-tchf", "--task-changelog-html-file" ],
        {
            help: "Export the next release's current changelog in HTML release format to\n" +
                  "the specified file, can be a relative or an absolute path.  Ignored if\n" +
                  "the option '--task-changelog-view' is used.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --task-changelog-html-file install/tmp/version_notes.html",
            helpPrivate: false
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
                  "is a copy stored in a temporary directory specified by the OS.",
            helpPrivate: false
        }
    ],

    taskChangelogPrint: [
        true,
        "boolean",
        false,
        [ "-tcp", "--task-changelog-print" ],
        {
            help: "Export the next release's pending changelog and output to stdout.",
            helpPrivate: false
        }
    ],

    taskChangelogHdrPrint: [
        true,
        "boolean",
        false,
        [ "-tchp", "--task-changelog-hdr-print" ],
        {
            help: "Read the changelog's header from disk and output to stdout.",
            helpPrivate: false
        }
    ],

    taskChangelogPrintVersion: [
        true,
        "string",
        "",
        [ "-tcpv", "--task-changelog-print-version" ],
        {
            help: "Export the specified release's current changelog and output to stdout.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --no-ci -tcpv 1.2.4\n" +
                  "    app-publisher --task-changelog-print-version 3.0.1",
            helpPrivate: false
        }
    ],

    taskChangelogHdrPrintVersion: [
        true,
        "string",
        "",
        [ "-tchpv", "--task-changelog-hdr-print-version" ],
        {
            help: "Read the changelog's header from disk and output to stdout, using the\n" +
                  "specified version number.",
            helpPrivate: false
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
                  "a temporary directory specified by the OS.",
            helpPrivate: false
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
                  "a temporary directory specified by the OS.",
            helpPrivate: false
        }
    ],

    taskCiEnv: [
        true,
        "boolean",
        false,
        [ "-tce", "--task-ci-env" ],
        {
            help: "Output the CI environment name to stdout.",
            helpPrivate: false
        }
    ],

    taskCiEnvInfo: [
        true,
        "boolean",
        false,
        [ "-tcei", "--task-ci-env-info" ],
        {
            help: "Finds CI related build information, and outputs the info to stdout using\n" +
                  "a concatenated string in the form 'current|next|changelogpath'.",
            helpPrivate: false
        }
    ],

    taskCiEnvSet: [
        true,
        "boolean",
        false,
        [ "-tces", "--task-ci-env-set" ],
        {
            help: "Finds CI related build information, and outputs the info to the file 'ap.env'\n" +
                  "in the root workspace directory.",
            helpPrivate: false
        }
    ],

    taskCommit: [
        true,
        "boolean",
        false,
        [ "-tcm", "--task-commit" ],
        {
            help: "Commits the changes made when using the --touch-versions option, using\n" +
                  "the 'chore: vX.X.X' format for the commit message.",
            helpPrivate: false
        }
    ],

    taskDeploy: [
        true,
        "boolean",
        false,
        [ "-td", "--task-deploy" ],
        {
            help: "Runs the deployment scripts defined in the .publishrc configuration.",
            helpPrivate: false
        }
    ],

    taskDevTest: [
        true,
        "boolean",
        false,
        [ "-tdt", "--task-dev-test" ],
        {
            help: "Run temporary tests in the local dev environment.  Note that this does\n" +
                  "nothing when ran in a production build.",
            helpPrivate: true
        }
    ],

    taskDistRelease: [
        true,
        "boolean",
        false,
        [ "-tdr", "--task-dist-release" ],
        {
            help: "Perform a `dist` release.",
            helpPrivate: false
        }
    ],

    taskEmail: [
        true,
        "boolean",
        false,
        [ "-te", "--task-email" ],
        {
            help: "Re-send the latest notification email.",
            helpPrivate: false
        }
    ],

    taskGenerateHelp: [
        true,
        "boolean",
        false,
        [ "-tgh", "--task-generate-help" ],
        {
            help: "Generate help markdown from help output.  Internal tool.",
            helpPrivate: true
        }
    ],

    taskGithubRelease: [
        true,
        "boolean",
        false,
        [ "-tgr", "--task-github-release" ],
        {
            help: "Perform a 'Github' release.  The changelog produced for the Github release\n" +
                  "will be created from the most recent entry of the changelog/history file.",
            helpPrivate: false
        }
    ],

    taskMantisbtRelease: [
        true,
        "boolean",
        false,
        [ "-tmr", "--task-mantisbt-release" ],
        {
            help: "Perform a 'Mantis' release.  The changelog produced for the Mantis release\n" +
                  "will be created from the most recent entry of the changelog/history file.",
            helpPrivate: false
        }
    ],

    taskNpmJsonRestore: [
        true,
        "boolean",
        false,
        [ "-tnjr", "--task-npm-json-restore" ],
        {
            help: "Restores changes made to the package.json file as a result of using the\n" +
                  "--task-npm-json-update task.  Properties include:\n" +
                  "\n" +
                  "    bugs, homepage, repo, repoType\n" +
                  "\n" +
                  "Note that this task should in most cases always be ran following the use\n" +
                  "of the --task-npm-json-update task.",
            helpPrivate: false
        }
    ],

    taskNpmJsonUpdate: [
        true,
        "boolean",
        false,
        [ "-tnju", "--task-npm-json-update" ],
        {
            help: "Updates package.json with .publishrc defined properties.  Properties include:\n" +
                  "\n" +
                  "    bugs, homepage, repo, repoType\n" +
                  "\n" +
                  "Can be used for publishing to multiple npm repositories.  Note that this\n" +
                  "task should in most cases always be followed up with a --task-npm-json-restore\n" +
                  "task.",
            helpPrivate: false
        }
    ],

    taskNpmRelease: [
        true,
        "boolean",
        false,
        [ "-tnr", "--task-npm-release" ],
        {
            help: "Perform an 'NPM' release (publish).",
            helpPrivate: false
        }
    ],

    taskNugetRelease: [
        true,
        "boolean",
        false,
        [ "-tngr", "--task-nuget-release" ],
        {
            help: "Perform a 'Nuget' release (not implemented yet).",
            helpPrivate: false
        }
    ],

    taskReleaseLevel: [
        true,
        "boolean",
        false,
        [ "-trl", "--task-release-level" ],
        {
            help: "Gets the release level for the next release and outputs it to stdout.\n" +
                  " Release level will be one of 'none', 'patch', 'minor', or 'major'.",
            helpPrivate: false
        }
    ],

    taskRevert: [
        true,
        "boolean",
        false,
        [ "-tr", "--task-revert" ],
        {
            help: "Reverts all local changes made by the publish run.",
            helpPrivate: false
        }
    ],

    taskTag: [
        true,
        "boolean",
        false,
        [ "-tt", "--task-tag" ],
        {
            help: "Creates a tag using the 'vX.X.X' format for the tag name.  The 'taskVersionUpdate'\n" +
                  "and 'taskVersionUpdateCommit' tasks should always precede this task.",
            helpPrivate: false
        }
    ],

    taskTagVersion: [
        true,
        "string",
        "",
        [ "-ttv", "--task-tag-version" ],
        {
            help: "Creates a tag using the specified positional parameter as the tag name.\n" +
                  " The 'taskVersionUpdate' and 'taskVersionUpdateCommit' tasks should always\n" +
                  "precede this task.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --task-tag-version 2.0.0",
            helpPrivate: false
        }
    ],

    taskVersionCurrent: [
        true,
        "boolean",
        false,
        [ "-tvc", "--task-version-current" ],
        {
            help: "Finds the current/latest version released and outputs that version string\n" +
                  "to stdout.\n" +
                  "\n" +
                  "Ignored if the `--task-version-info` switch is used.",
            helpPrivate: false
        }
    ],

    taskVersionInfo: [
        true,
        "boolean",
        false,
        [ "-tvi", "--task-version-info" ],
        {
            help: "Finds the current/latest and next version released, and outputs the info\n" +
                  "to stdout using a concatenated string in the form:\n" +
                  "\n" +
                  "    current_version|next_version|release_level\n" +
                  "\n" +
                  "Note that this switch overrides both the `--task-version-current` and\n" +
                  "the `--task-version-current` switches.",
            helpPrivate: false
        }
    ],

    taskVersionNext: [
        true,
        "boolean",
        false,
        [ "-tvn", "--task-version-next" ],
        {
            help: "Calculates the next version to be released based on versioned files and\n" +
                  "commit messages. and outputs that version string to stdout.\n" +
                  "\n" +
                  "Ignored if the `--task-version-info` switch is used.",
            helpPrivate: false
        }
    ],

    taskVersionPreReleaseId: [
        true,
        "string",
        "",
        [ "-tvprid", "--task-version-pre-release-id" ],
        {
            help: "Gets the identifier denoting a pre-release from a version string.  For\n" +
                  "example, the version string 2.20.11-alpha.3 has a pre-release identifier\n" +
                  "of 'alpha'.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --task-version-pre-release-id 2.0.1-alpha.1\n" +
                  "    app-publisher --task-version-pre-release-id 2.0.1-beta.3",
            helpPrivate: false
        }
    ],

    taskVersionUpdate: [
        true,
        "boolean",
        false,
        [ "-tvu", "--task-version-update" ],
        {
            help: "Update version numbers either semantically or incrementally.  Versioned\n" +
                  "files are by default AssemblyInfo.cs, package.json, and app.json. Additional\n" +
                  "versioned files are specified in the .publishrc file using the 'versionFiles'\n" +
                  "and cProjectRcFile' properties.",
            helpPrivate: false
        }
    ],

    testEmailRecip: [
        true,
        "string | string[]",
        "",
        [ "-ter", "--task-email-recip" ],
        {
            help: "The email address to use as the 'To' address when sending an email notification\n" +
                  "while running in dry run mode.\"",
            helpPrivate: false
        }
    ],

    tests: [
        true,
        "boolean",
        false,
        [ "-t", "--tests" ],
        {
            help: "Runs tests (development use).",
            helpPrivate: false
        }
    ],

    textEditor: [
        true,
        "string",
        "notepad",
        [ "-tedr", "--text-editor" ],
        {
            help: "The editor program to use when opening version files for manual editing.\"",
            helpPrivate: false
        }
    ],

    vcFiles: [
        true,
        "string[]",
        "",
        [],
        {
            help: "A list of files that should be checked into version control in the commit\n" +
                  "phase.  These would include files generated/moved/modified by any of the\n" +
                  "hook scripts that are to be included in the version commit/tag\"",
            helpPrivate: false
        }
    ],

    vcRevert: [
        true,
        "flag",
        "Y",
        [ "-vr", "--vc-revert" ],
        {
            help: "Reverts all file modifications made if a publish failes, or, after a dry\n" +
                  "run is completed.  Uses version control.",
            helpPrivate: false
        }
    ],

    vcRevertFiles: [
        true,
        "string[]",
        "",
        [],
        {
            help: "Additional files to be reverted if a publish run fails, or, after a dry\n" +
                  "run completes.  Uses version control.\n" +
                  "\n" +
                  "Ignored if `vcRevert` = \"N\".",
            helpPrivate: false
        }
    ],

    vcStdOut: [
        true,
        "boolean",
        false,
        [ "-vso", "--vc-std-out" ],
        {
            help: "true,\n" +
                  "boolean\n" +
                  "false,\n" +
                  "Outputs stdout from the vc process (git or svn) and pipes it to the current\n" +
                  "runs stdout.  Use for debugging version control issues.\"",
            helpPrivate: false
        }
    ],

    vcTagPrefix: [
        true,
        "string",
        "",
        [ "-vtp", "--vc-tag-prefix" ],
        {
            help: "Tag prefix for the version tag.  Labels the created tag in the form prefix-vX.X.X.\"",
            helpPrivate: false
        }
    ],

    vcWebPath: [
        true,
        "string",
        "",
        [ "-vwp", "--vc-web-path" ],
        {
            help: "Web path to the version control repository e.g. the project's home page\n" +
                  "on GitHub, or for a Subversion project the project root in a web viewer\n" +
                  "such as WebSVN.  Primarily used for dynamically creating links in the\n" +
                  "changelogs and/or email notifications.",
            helpPrivate: false
        }
    ],

    verbose: [
        true,
        "boolean",
        false,
        [ "-vbs", "--verbose" ],
        {
            help: "Enables additional log output.",
            helpPrivate: false
        }
    ],

    verbosex: [
        true,
        "boolean",
        false,
        [ "-vbsx", "--verbosex" ],
        {
            help: "Enables additional log output, including stringified objects.  Pronounced\n" +
                  "'ver-bose ecks' ;)",
            helpPrivate: false
        }
    ],

    version: [
        true,
        "boolean",
        false,
        [ "-v", "--version" ],
        {
            help: "Display the current app-publisher version.",
            helpPrivate: false
        }
    ],

    versionFiles: [
        true,
        "IVersionFile[]",
        "",
        [],
        {
            help: "A file path or list of file paths to perform version string replacement\n" +
                  "in.  A source/target pair can lso be specified using the 'setFiles' property.\n" +
                  "\n" +
                  "Example:\n" +
                  "\n" +
                  "     \"versionFiles\": [{\n" +
                  "         \"path\": \"..\\..\\install\\GEMS2_64bit.nsi\",\n" +
                  "         \"regex\": \"!define +BUILD_LEVEL +VERSION\",\n" +
                  "         \"regexVersion\": \"[0-9a-zA-Z\\.\\-]{5,}\",\n" +
                  "         \"regexWrite\": \"!define BUILD_LEVEL      \"VERSION\"\n" +
                  "     },\n" +
                  "     {\n" +
                  "         \"path\": \"node_modules\\@pja\\extjs-pkg-server\\package.json\",\n" +
                  "         \"setFiles\": [{\n" +
                  "             \"path\": \"app.json\",\n" +
                  "             \"regex\": \"svrVersion\" \*: \*\"VERSION\",\n" +
                  "             \"regexVersion\": \"[0-9a-zA-Z\\.\\-]{5,}\",\n" +
                  "             \"regexWrite\": \"svrVersion\": \"VERSION\"\n" +
                  "         },\n" +
                  "         {\n" +
                  "             \"path\": \"..\\svr\\assemblyinfo.cs\",\n" +
                  "             \"regex\": \"AssemblyVersion *\\(VERSION\",\n" +
                  "             \"regexVersion\": \"[0-9]+\\.[0-9]+\\.[0-9]+\",\n" +
                  "             \"regexWrite\": \"AssemblyVersion\\(VERSION\"\n" +
                  "         }]\n" +
                  "     }]\n" +
                  "\n" +
                  "The regex must contain the text 'VERSION' which translates to the capturing\n" +
                  "group used to obtain the actual version number, and it must be the first\n" +
                  "group if more than one capturing groups exist in the regex.   The 'regexVersion'\n" +
                  "property is the regex that will match the version, and defaults to the\n" +
                  "regex `[0-9a-zA-Z\\.\\-]{5,}` if not specified.  This property is optional\n" +
                  "and defualts to system:semver.",
            helpPrivate: false
        }
    ],

    versionForceCurrent: [
        true,
        "boolean",
        false,
        [ "-vfc", "--version-force-current" ],
        {
            help: "Force current version, for use with post release tasks such as re-sending\n" +
                  "an email notification or performing a GitHub release if for whever reason\n" +
                  "it failed on the publish run.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --task-email --version-force-current",
            helpPrivate: false
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
                  "an SCM step.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --version-force-next 300\n" +
                  "    app-publisher --version-force-next 2.0.0",
            helpPrivate: false
        }
    ],

    versionFilesEditAlways: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A file path or list of file paths to always perform version string replacement\n" +
                  "in, regardless of whether the `skipVersionEdits` flag is set.",
            helpPrivate: false
        }
    ],

    versionFilesScrollDown: [
        true,
        "string | string[]",
        "",
        [],
        {
            help: "A file path or list of file paths where sroll-down is perfoemed when opened\n" +
                  "for editing.",
            helpPrivate: false
        }
    ],

    versionPreReleaseId: [
        true,
        "string",
        "",
        [ "-vpri", "--version-pre-release-id" ],
        {
            help: "An identifier denoting a pre-release can to be appenended to the next\n" +
                  "version number to produce the final version string, e.g. 'alpha' produces\n" +
                  "the final version string of x.y.z-alpha.\n" +
                  "\n" +
                  "Usage:\n" +
                  "\n" +
                  "    app-publisher --version-pre-release-id alpha\n" +
                  "    app-publisher --version-pre-release-id pre1",
            helpPrivate: false
        }
    ],

    versionSystem: [
        true,
        "enum(auto|semver|incremental)",
        "auto",
        [ "-vs", "--version-system" ],
        {
            help: "Specify the versioning system to be used if it cannot be determined automatically:\n" +
                  "\n" +
                  " 1. semver       Ex. 1.0.0, 1.0.1, 1.0.2\n" +
                  " 2. incremental  Ex. 100, 101, 102\"",
            helpPrivate: false
        }
    ],

    versionText: [
        true,
        "string",
        "Version",
        [ "-vt", "--version-text" ],
        {
            help: "The text tag to use in the history file for preceding the version number.\n" +
                  " It should be one of the following:\n" +
                  "\n" +
                  " 1. Version\n" +
                  " 2. Build\n" +
                  " 3. Release",
            helpPrivate: false
        }
    ],

    writeLog: [
        true,
        "flag",
        "N",
        [ "-wr", "--write-log" ],
        {
            help: "In addition to stdout, writes a log to LOCALAPPDATA/app-publisher/log",
            helpPrivate: false
        }
    ]

};
