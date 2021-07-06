
export interface IArgument
{
    name: string;
    argument: string | string[];
    default: any;
    help?: string;
    helpPrivate?: boolean;
    isCmdLine?: boolean;
    type: string;
}


export interface IAuthor
{
    name: string;
    email?: string;
    date?: string;
}


export interface IChangelog
{
    file: string;
    fileNotes: string;
    htmlNotes: string;
    notes: string;
    entries: IChangelogEntry[];
    entriesLast: IChangelogEntry[];
    fileNotesLast: string;
    htmlNotesLast: string;
    notesLast: string;
    createSectionFromCommits(context: IContext): string;
    doEdit(context: IContext): Promise<void>;
    getHeader(context: IContext, version?: string): Promise<string>;
    getVersion(context: IContext): Promise<string>;
    populate(context: IContext, nextVersionChangelogWritten?: boolean): Promise<void>;
}


export interface IChangelogEntry
{
    subject: string;
    scope: string;
    message: string;
    tickets: string;
}


export interface ICommit
{
    author: IAuthor;
    committer: IAuthor;
    gitTags?: string;
    message: string;
    hash: string;
    scope: string;
    subject: string;
    committerDate?: string;
}


export interface ICommitMessageMap
{
    formatText: string;
    iconCls: string;
    include: boolean;
    type: string;
    versionBump: string;
}


export interface IContext
{
    changelog: IChangelog;
    commits: ICommit[];
    cwd: string;
    env: any;
    lastRelease: IRelease;
    logger: any;
    nextRelease: INextRelease;
    options: IOptions;
    plugins: IPlugin[];
    stdout: any;
    stderr: any;
}


export interface ICiEnvironmentInfo
{
    branch: string;
    build: string;
    buildUrl: string;
    commit: string;
    isCi: boolean;
    isPr: boolean;
    name: string;
    root: string;
}


export interface IEdit
{
    path: string;
    type: string;
}


export interface IPlugin
{
    path: string;
    type: string;
    fail: () => void;
}


export interface IReturnStatus
{
    error?: string;
    success: boolean;
    id?: number | string;
}


export interface IRelease
{
    head: string;
    tag: string;
    version: string;
    versionInfo: IVersionInfo;
}


export interface INextRelease extends IRelease
{
    edits: IEdit[];
    level: "major" | "premajor" | "minor" | "preminor" | "patch" | "prepatch" | "prerelease";
}


export interface IVersionFile
{
    path: string;
    /**
     * If empty, the following is used:
     *     semver       - [0-9a-zA-Z\\.\\-]{5,}
     *     incremental  - [0-9]+
     */
    regex?: string;
    /**
     * Should match the capturing part of 'regex' (w/o the capture group)
     */
    regexVersion: string;
    /**
     * Used to write the new version.  Should not contain any regex pattern.
     */
    regexWrite: string;
    /**
     * A 'version file' can be an indirect reference.  If 'setFiles' is set, then the
     * version is read from the file spcified by 'path', and written to the file(s) specified
     * by setFiles.
     */
    setFiles?: IVersionFile[];
    versionInfo?: IVersionInfo;
}


export interface IVersionInfo
{
    version: string;
    info: string[];
    system: "auto" | "semver" | "incremental";
}


export interface IOptions extends IArgs
{
    /**
     * @readonly
     */
    appPublisherVersion: string;
    /**
     * Continous Integration Info
     */
    ciInfo: ICiEnvironmentInfo;
    /**
     * Gets set by get-config
     *
     * @readonly
     */
    configFilePath: string;
    /**
     * A list of argument validation errors populated by arg-parser, if any.
     *
     * @readonly
     */
    errors: string[];
    /**
     * @readonly
     */
    isNodeJsEnv: boolean;
    /**
     * @readonly
     */
    tagFormat: string;
    /**
     * Represents how many tasks are enabled for the current run.  Tasks are enabled using the
     * --task-* command line options.
     *
     * @readonly
     * @since 3.2.5
     */
    taskCount: number;
    /**
     * @readonly
     */
    taskMode: boolean;
    /**
     * @readonly
     */
    taskModeStdOut: boolean;
}


export interface IArgs
{
    /**
     * The branch to use.
     *
     * For SVN, this should include the path to the branches directory, e.g.:
     *
     *     branches/branch-name
     *
     * SVN branch support can only work if there is a 'per project' branching folder / structure.
     *  It is assumed that the 'tags' folders is named by convention, i.e. '/tags'
     */
    branch: string;
    /**
     * A script or list of scripts to run for the build stage.
     */
    buildCommand: string | string[];
    /**
     * Overrides the 'bugs' property of package.json when an NPM release is made, which is extracted
     * for display on the project page of the NPM repository.
     */
    bugs: string;
    /**
     * The location of this changelog file (markdown or text format), should be a path relative to
     * the project's root.
     */
    changelogFile: string;
    /**
     * The location of this history header file, should be a path relative to the project's root.
     */
    changelogHdrFile: string;
    /**
     * The maximum line lenth to use when parsing commits to populate the changelog file.
     */
    changelogLineLen: number;
    /**
     * A map of additional subject tags used in commits that will be used to increment the version
     * and be included in the changelog, for example:
     *
     *     "commitMsgMap": {
     *         "internal": {
     *             "versionBump": "patch
     *             "formatText": "Internal Change
     *             "include": false,
     *             "iconCls": "fa-building
     *         }
     *     }
     */
    commitMsgMap: ICommitMessageMap[];
    /**
     * Displays the configuration object and exits, for debugging.  Note that the default publishrc
     * file is '.publishrc.*'.  A config file can be one of four different formats:
     *
     *     .publishrc.json
     *     .publishrc.js
     *     .publishrc.yaml
     *     .publishrc.yml
     *     package.json { publish: { ... } }
     */
    config: boolean;
    /**
     * Use config name.  Note that the default publishrc file is '.publishrc.*'.  A config name can
     * dyanimically modify the file used.  For example, a config name of 'cst' will yield a search
     * for the following config files:
     *
     *     .publishrc.cst.json
     *     .publishrc.cst.js
     *     .publishrc.cst.yaml
     *     .publishrc.cst.yml
     *     package.json { publish.cst: { ... } }
     */
    configName: string;
    /**
     * The RC file name in a C Make project.
     */
    cProjectRcFile: string;
    /**
     * A script or list of scripts to run for the deploy stage.
     */
    deployCommand: string | string[];
    /**
     * Add the contents of the directory specified by the 'dist' property to version control, if
     * not already.
     *
     * Ignored if `distRelease` = "N".
     */
    distAddAllToVC: "Y" | "N";
    /**
     * The network path to use as the destination directory for a standard `dist` release's documentation
     * directory.  All PDF files found within the doc directory specified by the 'distDocPathSrc'
     * property will be uploaded/copied to this directory.
     *
     * Ignored if `distRelease` = "N" or `distDocPathSrc` is empty.
     */
    distDocPath: string;
    /**
     * The local path to use as the source directory for a standard 'dist' release's documentation
     * directory.  All PDF files found within this directory are uploaded/copied to the directory
     * specified by the 'distDocPath' property.
     *
     * Ignored if `distRelease` = "N" or `distDocPath` is empty.
     */
    distDocPathSrc: string;
    /**
     * Build a standard release to be uploaded to a network share.
     */
    distRelease: "Y" | "N";
    /**
     * The network path to use as the destination directory for a standard `dist` directory release.
     *  Will be renamed to 'distDestPath' in a future release.
     *
     * The final directory created for the release will be:
     *
     *    distReleasePath/projectName/nextVersion"
     *
     * Ignored if `distRelease` = "N".
     */
    distReleasePath: string;
    /**
     * The local path to use as the source directory for a standard 'dist' release.  Will be renamed
     * to 'distSrcPath' in a future release.
     *
     * Ignored if `distRelease` = "N".
     */
    distReleasePathSrc: string;
    /**
     * A script or list of scripts to run for the build stage, after building a standard `dist` release.
     *
     * Ignored if `distRelease` = "N".
     */
    distReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the build stage, before building a standard `dist`
     * release.
     *
     * Ignored if `distRelease` = "N".
     */
    distReleasePreCommand: string | string[];
    /**
     * Run in dry/test mode, all changes are reverted.
     *
     * In dry-run mode, the following holds:
     *
     * 1) Installer is not released/published
     * 2) Email notification will be sent only to $TESTEMAILRECIPIENT
     * 3) Commit package/build file changes (svn) are not made
     * 4) Version tag (svn) is not made
     *
     * Some local files may be changed in test mode (i.e. updated version numbers in build and package
     * files).  These changes should be reverted to original state via SCM.
     */
    dryRun: boolean;
    /**
     * Same as 'dryRun', but minus stdout logging in the release emulations.
     */
    dryRunQuiet: boolean;
    /**
     * A link or list of links to insert into an email notification in the form 'link|name'.
     */
    emailHrefs: string | string[];
    /**
     * The delivery method to use when sending an email notification, possible values are:
     *
     *     ssl (Secure)
     *     std (Standard / Non-Secure)
     */
    emailMode: "std" | "ssl";
    /**
     * The smtp server port to use when sending an email notification.
     */
    emailPort: number;
    /**
     * Send a release email notification.
     */
    emailNotification: "Y" | "N";
    /**
     * The email address to use as the 'To' address when sending an email notification.
     */
    emailRecip: string | string[];
    /**
     * The email address to use as the 'From' address when sending an email notification.
     */
    emailSender: string;
    /**
     * The SMTP server to use when sending an email notification.
     */
    emailServer: string;
    /**
     * A path to a file resource or list of file resource paths to upload as assets of the Github
     * release.
     *
     * Ignored if `githubRelease` = "N".
     */
    githubAssets: string | string[];
    /**
     * Edit the manipulated changelog before creating the Github release.
     *
     * Ignored if `githubRelease` = "N".
     */
    githubChglogEdit: "Y" | "N";
    /**
     * Perform a Github releas.
     */
    githubRelease: "Y" | "N";
    /**
     * A script or list of scripts to run for the release stage, after creating a Github release.
     *
     * Ignored if `githubRelease` = "N".
     */
    githubReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the release stage, before creating a Github release.
     *
     * Ignored if `githubRelease` = "N".
     */
    githubReleasePreCommand: string | string[];
    /**
     * The Github username that owns the project the Github release will be made under.  Used to
     * construct the Github project path i.e. github.com/username.
     *
     * Ignored if `githubRelease` = "N".
     */
    githubUser: string;
    /**
     * Display console help.
     */
    help: boolean;
    /**
     * Overrides the `homePage` property of package.json when an NPM release is made, which is extracted
     * for display on the project page of the NPM repository.
     */
    homePage: string;
    /**
     * The MantisBT token or list of tokens to make a MantisBT release with.  Represents the user
     * that the release is made under on the 'Releases' page - Releases Plugin (https://github.com/mantisbt-plugins/Releases)
     * required.
     */
    mantisbtApiToken: string;
    /**
     * A path to a file resource or list of file resource paths to upload as assets of the MantisBT
     * release.
     *
     * Ignored if `mantisbtRelease` = "N".
     */
    mantisbtAssets: string | string[];
    /**
     * Edit the manipulated changelog before creating the MantisBT release.
     *
     * Ignored if `mantisbtRelease` = "N".
     */
    mantisbtChglogEdit: "Y" | "N";
    /**
     * Specifies the main project file for a MantisBT plugin project.  The file extension must be
     * '.php'"
     */
    mantisbtPlugin: string;
    /**
     * The MantisBT project name, if different than the main project name specified by `projectName`.
     */
    mantisbtProject: string;
    /**
     * Perform a MantisBT release.
     */
    mantisbtRelease: "Y" | "N";
    /**
     * A script or list of scripts to run for the release stage, after creating a MantisBT release.
     *
     * Ignored if `mantisbtRelease` = "N".
     */
    mantisbtReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the release stage, before creating a MantisBT release.
     *
     * Ignored if `mantisbtRelease` = "N".
     */
    mantisbtReleasePreCommand: string | string[];
    /**
     * The URL to use for creating a MantisBT release.
     *
     * Ignored if `mantisbtRelease` = "N".
     */
    mantisbtUrl: string;
    /**
     * Run in a local, non-CI environment.
     */
    noCi: boolean;
    /**
     * Copy the NPM package to the directory specified by `distReleasePathSrc`.
     *
     * File is renamed from what is output by NPM, it is named as:
     *
     *     projectname.tgz
     *
     * If the --config-name option is used, the file is named as:
     *
     *     projectname-configname.tgz
     *
     * Ignored if `npmRelease` = "N".
     */
    npmPackDist: "Y" | "N";
    /**
     * The URL of the NPM registry to use for making an NPM release.  This needs to be set if this
     * is a privately hosted repository.  Should be in the form:
     *
     *     https://npm.mydomain.com
     *
     * Ignored if `npmRelease` = "N".
     */
    npmRegistry: string;
    /**
     * Build and make an NPM release.
     */
    npmRelease: "Y" | "N";
    /**
     * A script or list of scripts to run for the release stage, after creating an NPM release.
     *
     * Ignored if `npmRelease` = "N".
     */
    npmReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the release stage, before creating an NPM release.
     *
     * Ignored if `npmRelease` = "N".
     */
    npmReleasePreCommand: string | string[];
    /**
     * The package scope to use for making an NPM release.
     * Overrides the scope set in package.json.
     * Ignored if `npmRelease` = "N".
     */
    npmScope: string;
    /**
     * Build and make a Nuget release.  Not supported as of v3.
     */
    nugetRelease: "Y" | "N";
    /**
     * A script or list of scripts to run for the build stage, after the build process is started.
     */
    postBuildCommand: string | string[];
    /**
     * A script or list of scripts to run for the build stage, before the build process is started.
     */
    preBuildCommand: string | string[];
    /**
     * A script or list of scripts to run for the commit stage, after the commit process is started.
     */
    postCommitCommand: string | string[];
    /**
     * A script or list of scripts to run for the commit stage, before the commit process is started.
     */
    preCommitCommand: string | string[];
    /**
     * A script or list of scripts to run for the final release stage, before the final release process
     * is started.
     */
    postReleaseCommand: string | string[];
    /**
     * Prompt for version.  The recommended version will be displayed at the prompt.
     */
    promptVersion: "Y" | "N";
    /**
     * Relative path to the .NET project version file (AssemblyInfo.cs).  Any .NET assemblyinfo.cs
     * files are attempted to be loaded and matched to a project, but in the case where it cannot,
     * this property can be set."
     */
    projectFileDotNet: string;
    /**
     * Relative path to the ExtJs project version file (app.json).
     * Any ExtJs app.json files are attempted to be loaded and matched to a
     * project, but in the case where it cannot, this property can be set."
     */
    projectFileExtJs: string;
    /**
     * Relative path to the NPM project version file (package.json).  Any NPM package.json files
     * are attempted to be loaded and matched to a project, but in the case where it cannot, this
     * property can be set.
     */
    projectFileNpm: string;
    /**
     * Name of the project.  This must match throughout the build files and the VCS project name.
     */
    projectName: string;
    /**
     * Utility field for tracking version if no other mechanism is available.
     */
    projectVersion: string;
    /**
     * The repository URL.  In the form:
     *
     *     https://svn.mydomain.com/path/to/repo/projectname/trunk
     *     https://github.com/username/projectname
     */
    repo: string;
    /**
     * The repository type. It should be one of the following:
     *
     *  1. git
     *  2. svn
     */
    repoType: "git" | "svn";
    /**
     * Re-publish the current/latest release.  Can be used for multi-publish configurations to bypass
     * local version file validation.
     */
    republish: boolean;
    /**
     * Skip manual editing of the changelog file(s).  Note the changelog used for a release will
     * be that of which is output by the internal commit parser.
     */
    skipChangelogEdits: "Y" | "N";
    /**
     * Skip committing changes to version control when the final release stage is finished (commit
     * stage).
     */
    skipCommit: "Y" | "N";
    /**
     * Skip tagging version in version control when the final release stage is finished (commit stage).
     */
    skipTag: string;
    /**
     * Skip all version edits in version files.
     */
    skipVersionEdits: "Y" | "N";
    /**
     * Runs all scripts defined by the publishrc property buildCommand`.
     */
    taskBuild: boolean;
    /**
     * Export the next release's current changelog and view using the editor specified in the .publishrc
     * file.  Note that this opens the actual versioned changelog/history file.
     */
    taskChangelog: boolean;
    /**
     * Export the next release's current changelog to the specified file, can be a relative or an
     * absolute path.  Ignored if the option '--task-changelog-view' is used.
     *
     * Usage:
     *
     *     app-publisher -tcf install/dist/history.txt
     *     app-publisher -tcf build/doc/changelog/changelog.md
     *     app-publisher -tcf c:\\projects\\changelogs\\projectname\\cl.md
     *     app-publisher --task-changelog-file build/tmp/version_notes.txt
     */
    taskChangelogFile: string;
    /**
     * Export the next release's current changelog in HTML release format to the specified file,
     * can be a relative or an absolute path.  Ignored if the option '--task-changelog-view' is used.
     *
     * Usage:
     *
     *     app-publisher --task-changelog-html-file install/tmp/version_notes.html
     */
    taskChangelogHtmlFile: string;
    /**
     * Export the next release's current changelog in HTML release format and view using the editor
     * specified in the .publishrc file. The created file is a copy stored in a temporary directory
     * specified by the OS.
     */
    taskChangelogHtmlView: boolean;
    /**
     * Export the next release's pending changelog and output to stdout.
     */
    taskChangelogPrint: boolean;
    /**
     * Read the changelog's header from disk and output to stdout.
     */
    taskChangelogHdrPrint: boolean;
    /**
     * Export the specified release's current changelog and output to stdout.
     *
     * Usage:
     *
     *     app-publisher --no-ci -tcpv 1.2.4
     *     app-publisher --task-changelog-print-version 3.0.1
     */
    taskChangelogPrintVersion: string;
    /**
     * Read the changelog's header from disk and output to stdout, using the specified version number.
     */
    taskChangelogHdrPrintVersion: string;
    /**
     * Export the next release's current changelog and view using the editor specified in the .publishrc
     * file. The created file is a copy stored in a temporary directory specified by the OS.
     */
    taskChangelogView: boolean;
    /**
     * Export the specified release's current changelog and view using the editor specified in the
     * .publishrc file. The created file is a copy stored in a temporary directory specified by the
     * OS.
     */
    taskChangelogViewVersion: string;
    /**
     * Output the CI environment name to stdout.
     */
    taskCiEnv: boolean;
    /**
     * Finds CI related build information, and outputs the info to stdout using a concatenated string
     * in the form 'current|next|changelogpath'.
     */
    taskCiEnvInfo: boolean;
    /**
     * Finds CI related build information, and outputs the info to the file 'ap.env' in the root
     * workspace directory.
     */
    taskCiEnvSet: boolean;
    /**
     * Commits the changes made when using the --touch-versions option, using the 'chore: vX.X.X'
     * format for the commit message.
     */
    taskCommit: boolean;
    /**
     * Runs the deployment scripts defined in the .publishrc configuration.
     */
    taskDeploy: boolean;
    /**
     * Run temporary tests in the local dev environment.  Note that this does nothing when ran in
     * a production build.
     */
    taskDevTest: boolean;
    /**
     * Perform a `dist` release.
     */
    taskDistRelease: boolean;
    /**
     * Re-send the latest notification email.
     */
    taskEmail: boolean;
    /**
     * Generate help markdown from help output.  Internal tool.
     */
    taskGenerateHelp: boolean;
    /**
     * Perform a 'Github' release.  The changelog produced for the Github release will be created
     * from the most recent entry of the changelog/history file.
     */
    taskGithubRelease: boolean;
    /**
     * Perform a 'Mantis' release.  The changelog produced for the Mantis release will be created
     * from the most recent entry of the changelog/history file.
     */
    taskMantisbtRelease: boolean;
    /**
     * Restores changes made to the package.json file as a result of using the --task-npm-json-update
     * task.  Properties include:
     *
     *     bugs, homepage, repo, repoType
     *
     * Note that this task should in most cases always be ran following the use of the --task-npm-json-update
     * task.
     */
    taskNpmJsonRestore: boolean;
    /**
     * Updates package.json with .publishrc defined properties.  Properties include:
     *
     *     bugs, homepage, repo, repoType
     *
     * Can be used for publishing to multiple npm repositories.  Note that this task should in most
     * cases always be followed up with a --task-npm-json-restore task.
     */
    taskNpmJsonUpdate: boolean;
    /**
     * Perform an 'NPM' release (publish).
     */
    taskNpmRelease: boolean;
    /**
     * Perform a 'Nuget' release (not implemented yet).
     */
    taskNugetRelease: boolean;
    /**
     * Gets the release level for the next release and outputs it to stdout.  Release level will
     * be one of 'none', 'patch', 'minor', or 'major'.
     */
    taskReleaseLevel: boolean;
    /**
     * Reverts all local changes made by the publish run.
     */
    taskRevert: boolean;
    /**
     * Creates a tag using the 'vX.X.X' format for the tag name.  The 'taskVersionUpdate' and 'taskVersionUpdateCommit'
     * tasks should always precede this task.
     */
    taskTag: boolean;
    /**
     * Creates a tag using the specified positional parameter as the tag name.  The 'taskVersionUpdate'
     * and 'taskVersionUpdateCommit' tasks should always precede this task.
     *
     * Usage:
     *
     *     app-publisher --task-tag-version 2.0.0
     */
    taskTagVersion: string;
    /**
     * Finds the current/latest version released and outputs that version string to stdout.
     *
     * Ignored if the `--task-version-info` switch is used.
     */
    taskVersionCurrent: boolean;
    /**
     * Finds the current/latest and next version released, and outputs the info to stdout using a
     * concatenated string in the form:
     *
     *     current_version|next_version|release_level
     *
     * Note that this switch overrides both the `--task-version-current` and the `--task-version-current`
     * switches.
     */
    taskVersionInfo: boolean;
    /**
     * Calculates the next version to be released based on versioned files and commit messages. and
     * outputs that version string to stdout.
     *
     * Ignored if the `--task-version-info` switch is used.
     */
    taskVersionNext: boolean;
    /**
     * Gets the identifier denoting a pre-release from a version string.  For example, the version
     * string 2.20.11-alpha.3 has a pre-release identifier of 'alpha'.
     *
     * Usage:
     *
     *     app-publisher --task-version-pre-release-id 2.0.1-alpha.1
     *     app-publisher --task-version-pre-release-id 2.0.1-beta.3
     */
    taskVersionPreReleaseId: string;
    /**
     * Update version numbers either semantically or incrementally.  Versioned files are by default
     * AssemblyInfo.cs, package.json, and app.json. Additional versioned files are specified in the
     * .publishrc file using the 'versionFiles' and cProjectRcFile' properties.
     */
    taskVersionUpdate: boolean;
    /**
     * The email address to use as the 'To' address when sending an email notification while running
     * in dry run mode."
     */
    testEmailRecip: string | string[];
    /**
     * Runs tests (development use).
     */
    tests: boolean;
    /**
     * The editor program to use when opening version files for manual editing."
     */
    textEditor: string;
    /**
     * A list of files that should be checked into version control in the commit phase.  These would
     * include files generated/moved/modified by any of the hook scripts that are to be included
     * in the version commit/tag"
     */
    vcFiles: string[];
    /**
     * Reverts all file modifications made if a publish failes, or, after a dry run is completed.
     *  Uses version control.
     */
    vcRevert: "Y" | "N";
    /**
     * Additional files to be reverted if a publish run fails, or, after a dry run completes.  Uses
     * version control.
     *
     * Ignored if `vcRevert` = "N".
     */
    vcRevertFiles: string[];
    /**
     * true,
     * boolean
     * false,
     * Outputs stdout from the vc process (git or svn) and pipes it to the current
     * runs stdout.  Use for debugging version control issues."
     */
    vcStdOut: boolean;
    /**
     * Tag prefix for the version tag.  Labels the created tag in the form prefix-vX.X.X."
     */
    vcTagPrefix: string;
    /**
     * Web path to the version control repository e.g. the project's home page on GitHub, or for
     * a Subversion project the project root in a web viewer such as WebSVN.  Primarily used for
     * dynamically creating links in the changelogs and/or email notifications.
     */
    vcWebPath: string;
    /**
     * Enables additional log output.
     */
    verbose: boolean;
    /**
     * Enables additional log output, including stringified objects.  Pronounced 'ver-bose ecks'
     * ;)
     */
    verbosex: boolean;
    /**
     * Display the current app-publisher version.
     */
    version: boolean;
    /**
     * A file path or list of file paths to perform version string replacement in.  A source/target
     * pair can lso be specified using the 'setFiles' property.
     *
     * Example:
     *
     *      "versionFiles": [{
     *          "path": "..\\..\\install\\GEMS2_64bit.nsi",
     *          "regex": "!define +BUILD_LEVEL +VERSION",
     *          "regexVersion": "[0-9a-zA-Z\\.\\-]{5,}",
     *          "regexWrite": "!define BUILD_LEVEL      "VERSION"
     *      },
     *      {
     *          "path": "node_modules\\@pja\\extjs-pkg-server\\package.json",
     *          "setFiles": [{
     *              "path": "app.json",
     *              "regex": "svrVersion" \*: \*"VERSION",
     *              "regexVersion": "[0-9a-zA-Z\\.\\-]{5,}",
     *              "regexWrite": "svrVersion": "VERSION"
     *          },
     *          {
     *              "path": "..\\svr\\assemblyinfo.cs",
     *              "regex": "AssemblyVersion *\\(VERSION",
     *              "regexVersion": "[0-9]+\\.[0-9]+\\.[0-9]+",
     *              "regexWrite": "AssemblyVersion\\(VERSION"
     *          }]
     *      }]
     *
     * The regex must contain the text 'VERSION' which translates to the capturing group used to
     * obtain the actual version number, and it must be the first group if more than one capturing
     * groups exist in the regex.   The 'regexVersion' property is the regex that will match the
     * version, and defaults to the regex `[0-9a-zA-Z\\.\\-]{5,}` if not specified.  This property
     * is optional and defualts to system:semver.
     */
    versionFiles: IVersionFile[];
    /**
     * Force current version, for use with post release tasks such as re-sending an email notification
     * or performing a GitHub release if for whever reason it failed on the publish run.
     *
     * Usage:
     *
     *     app-publisher --task-email --version-force-current
     */
    versionForceCurrent: boolean;
    /**
     * A version number to use as the 'next version'.  Version calculation will not be performed
     * other than for reading in the current version, skipping an SCM step.
     *
     * Usage:
     *
     *     app-publisher --version-force-next 300
     *     app-publisher --version-force-next 2.0.0
     */
    versionForceNext: string;
    /**
     * A file path or list of file paths to always perform version string replacement in, regardless
     * of whether the `skipVersionEdits` flag is set.
     */
    versionFilesEditAlways: string | string[];
    /**
     * A file path or list of file paths where sroll-down is perfoemed when opened for editing.
     */
    versionFilesScrollDown: string | string[];
    /**
     * An identifier denoting a pre-release can to be appenended to the next version number to produce
     * the final version string, e.g. 'alpha' produces the final version string of x.y.z-alpha.
     *
     * Usage:
     *
     *     app-publisher --version-pre-release-id alpha
     *     app-publisher --version-pre-release-id pre1
     */
    versionPreReleaseId: string;
    /**
     * Specify the versioning system to be used if it cannot be determined automatically:
     *
     *  1. semver       Ex. 1.0.0, 1.0.1, 1.0.2
     *  2. incremental  Ex. 100, 101, 102"
     */
    versionSystem: "auto" | "semver" | "incremental";
    /**
     * The text tag to use in the history file for preceding the version number.  It should be one
     * of the following:
     *
     *  1. Version
     *  2. Build
     *  3. Release
     */
    versionText: string;
    /**
     * In addition to stdout, writes a log to LOCALAPPDATA/app-publisher/log
     */
    writeLog: "Y" | "N";
}
