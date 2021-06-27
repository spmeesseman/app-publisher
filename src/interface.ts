
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
    fileNotesLast: string;
    htmlNotesLast: string;
    notesLast: string;
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
    definition: ICommitMessageMapEntry;
}


export interface ICommitMessageMapEntry
{
    versionBump: string;
    formatText: string;
    include: boolean;
    iconCls: string;
}


export interface IContext
{
    changelog: IChangelog;
    commits: ICommit[];
    cwd: string;
    env: any;
    lastRelease: ILastRelease;
    logger: any;
    nextRelease: INextRelease;
    options: IOptions;
    stdout: any;
    stderr: any;
}

export interface IEdit
{
    path: string;
    type: string;
}


export interface IReturnStatus
{
    error?: string;
    success: boolean;
    id?: number | string;
}


export interface ILastRelease
{
    head: string;
    tag: string;
    version: string;
    versionInfo: IVersionInfo;
}


export interface INextRelease
{
    edits: IEdit[];
    head: string;
    level: "major" | "premajor" | "minor" | "preminor" | "patch" | "prepatch" | "prerelease";
    tag: string;
    version: string;
    versionInfo: IVersionInfo;
}


export interface IVersionInfo
{
    version: string;
    versionInfo: string[];
    versionSystem: string;
}


export interface IOptions
{
    /**
     * @readonly
     */
    appPublisherVersion: string;
    /**
     * The branch to use
     */
    branch: string;
    /**
     * A script or list of scripts to run for the build stage.
     */
    buildCommand: string | string[];
    /**
     * Overrides the 'bugs' property of package.json when an NPM release is made, which is
     * extracted for display on the project page of the NPM repository.
     */
    bugs: string;
    /**
     * The location of this changelog file (markdown format), can be a relative or full path.
     */
    changelogFile: string;
    /**
     * A map of additional subject tags used in commits that will be used to, increment the
     * version and be included in the changelog, for example:,
     *
     *     commitMsgMap: {,
     *         internal: {,
     *             versionBump: "patch",
     *             formatText: "Internal Change",
     *             include: false,,
     *             iconCls: "fa-building",
     *         },
     *     }
     */
    commitMsgMap: any;
    /**
     * Displays config and exits.
     * Note that the default publishrc file is '.publishrc.*'.  A config file can be one of three
     * different formats:
     *
     *     json, js, yaml
     */
    config: boolean;
    /**
     * Gets set by get-config
     *
     * @readonly
     */
    configFilePath: string;
    /**
     * The RC file name in a C Make project.
     */
    cProjectRcFile: string;
    /**
     * A script or list of scripts to run for the deploy stage
     */
    deployCommand: string | string[];
    /**
     * Add the contents of the directory specified by the 'dist' property to
     * version control, if not already.  Ignored if distRelease = N.
     */
    distAddAllToVC: string; // flag
    /**
     * The network path to use as the destination directory for a standard,
     * 'dist' release's documentation directory.  All PDF files found within,
     * the doc directory specified by the 'distDocPathSrc' property will be,
     * uploaded/copied to this directory.,
     * Ignored if distRelease = N or distDocPathSrc is empty.
     */
    distDocPath: string;
    /**
     * The local path to use as the source directory for a standard 'dist',
     * 'release's documentation directory.  All PDF files found within this,
     * directory are uploaded/copied to the directory specified by the 'distDocPath',
     * property.,
     * Ignored if distRelease = N or distDocPath is empty.
     */
    distDocPathSrc: string;
    /**
     * Build a standard release to be uploaded to a network share.
     */
    distRelease: string; // flag
    /**
     * The network path to use as the destination directory for a standard 'dist', directory release.
     * Will be renamed to 'distDestPath' in a future release.
     * Ignored if distRelease = N.
     * The final directory created for the release will be:
     *    distReleasePath/projectName/nextVersion
     */
    distReleasePath: string;
    /**
     * A script or list of scripts to run for the build stage, after building a standard 'dist' release.
     * Ignored if distRelease = N.
     */
    distReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the build stage, before building a standard 'dist' release.
     * Ignored if distRelease = N.
     */
    distReleasePreCommand: string | string[];
    /**
     * Run in dry/test mode, all changes are reverted.
     * In dry-run mode, the following holds:
     *     1) Installer is not released/published
     *     2) Email notification will be sent only to $TESTEMAILRECIPIENT
     *     3) Commit package/build file changes (svn) are not made
     *     4) Version tag (svn) is not made
     * Some local files may be changed in test mode (i.e. updated version
     * numbers in build and package files).  These changes should be
     * reverted to original state via SCM
     */
    dryRun: boolean;
    /**
     * Reverts all file modification made during a 'dry run' using version control.
     */
    dryRunVcRevert: string; // flag
    /**
     * A link or list of links to insert into an email notification in the form 'link|name'.
     */
    emailHrefs: string | string[];
    /**
     * enum(std|ssl),
     * std (Standard / Non-Secure),
     * The delivery method to use when sending an email notification.
     */
    emailMode: string;  // enum(std|ssl)
    /**
     * The smtp server port to use when sending an email notification.
     */
    emailPort: number;
    /**
     * Send a release email notification.
     */
    emailNotification: string;  // flag
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
     * A path to a file resource or list of file resource paths to upload as assets of the Github release.
     * Ignored if githubRelease = N.
     */
    githubAssets: string | string[];
    /**
     * Edit the manipulated changelog before creating the Github release.,
     * Ignored if githubRelease = N.
     */
    githubChglogEdit: string;  // flag
    /**
     * Perform a Github release.
     */
    githubRelease: string;  // flag
    /**
     * A script or list of scripts to run for the release stage, after creating a Github release.,
     * Ignored if githubRelease = N.
     */
    githubReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the release stage, before creating,
     * a Github release.,
     * Ignored if githubRelease = N.
     */
    githubReleasePreCommand: string | string[];
    /**
     * The Github username that owns the project the Github release will be made,
     * under.  Used to construct the Github project path i.e. github.com/username,
     * Ignored if githubRelease = N.
     */
    githubUser: string;
    /**
     * The location of this history file, can be a relative or full path.
     */
    historyFile: string;
    /**
     * The location of this history header file, can be a relative or full path.
     */
    historyHdrFile: string;
    /**
     * The maximum line lenth to use when parsing commits to populate the history.txt file
     * Defaults to 80
     */
    historyLineLen: number;
    /**
     * A link to the history file to insert into an email notification in raw html link form
     * i.e. <a href=\...\>...</a>.
     */
    historyHref: string | string[];
    /**
     * Overrides the 'homePage' property of package.json when an NPM release is, made, which
     * is extracted for display on the project page of the NPM repository.
     */
    homePage: string;
    /**
     * @readonly
     */
    isNodeJsEnv: boolean;
    /**
     * The MantisBT token or list of tokens to make a MantisBT release with.
     * Represents the user that the release is made under on the 'Releases' page.
     */
    mantisbtApiToken: string | string[];
    /**
     * A path to a file resource or list of file resource paths to upload as assets of the MantisBT release.
     * Ignored if mantisbtRelease = N.
     */
    mantisbtAssets: string | string[];
    /**
     * Edit the manipulated changelog before creating the MantisBT release.,
     * Ignored if mantisbtRelease = N.
     */
    mantisbtChglogEdit: string;  // flag
    /**
     * Specifies this project is a MantisBT plugin.
     */
    mantisbtPlugin: string;  // flag
    /**
     * The MantisBT project name, if different than the main project name specified by 'projectName'.
     */
    mantisbtProject: string;
    /**
     * Perform a MantisBT release.
     */
    mantisbtRelease: string;  // flag
    /**
     * A script or list of scripts to run for the release stage, after creating a MantisBT release.
     * Ignored if mantisbtRelease = N.
     */
    mantisbtReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the release stage, before creating
     * a MantisBT release.
     * Ignored if mantisbtRelease = N.
     */
    mantisbtReleasePreCommand: string | string[];
    /**
     * A URL or a list of URL's to use for creating a MantisBT release.
     * Ignored if mantisbtRelease = N.
     */
    mantisbtUrl: string | string[];
    /**
     * Run in a local, non-CI environment.
     */
    noCi: boolean;
    /**
     * Copy the NPM package to the directory specified by 'pathToDist'.,
     * Ignored if npmRelease = N.
     */
    npmPackDist: string;  // flag
    /**
     * The URL of the NPM registry to use for making an NPM release.
     * Ignored if npmRelease = N.
     * Defaults to https://registry.npmjs.org
     */
    npmRegistry: string;
    /**
     * Perform an NPM release.
     */
    npmRelease: string;  // flag
    /**
     * A script or list of scripts to run for the release stage, after creating an NPM release.
     * Ignored if npmRelease = N.
     */
    npmReleasePostCommand: string | string[];
    /**
     * A script or list of scripts to run for the release stage, before creating an NPM release.
     * Ignored if npmRelease = N.
     */
    npmReleasePreCommand: string | string[];
    /**
     * The package scope to use for making an NPM release. Overrides the scope set in package.json.
     * Ignored if npmRelease = N.
     */
    npmScope: string;
    /**
     * Perform a Nuget release.  Not supported as of this version.
     */
    nugetRelease: string;  // flag
    /**
     * The local path to use as the source directory for a standard 'dist' release.
     * Will be renamed to 'distSrcPath' in a future release.,
     * Path to DIST should be relative to PATHTOROOT,
     * Ignored if distRelease = N.
     * Defaults to "install\dist"
     */
    pathToDist: string;
    /**
     * A script or list of scripts to run for the build stage, after the build process is started.
     */
    postBuildCommand: string | string[];
    /**
     * A script or list of scripts to run for the build stage, before the build process is started.
     */
    preBuildCommand: string | string[];

    /**
     * A script or list of scripts to run for the commit stage, after the commit,
     * process is started.
     */
    postCommitCommand: string | string[];
    /**
     * A script or list of scripts to run for the commit stage, before the commit process is started.
     */
    preCommitCommand: string | string[];
    /**
     * A script or list of scripts to run for the final release stage, before the final release
     * process is started.
     */
    postReleaseCommand: string | string[];
    /**
     * Prompt for version.  The recommended version will be displayed at the prompt.
     */
    promptVersion: string;  // flag
    /**
     * Name of the project.  This must match throughout the build files and the SVN project name.
     */
    projectName: string;
    /**
     * The publishrc file to read the initial configuration from.
     * Use the specified config name.  The config name determines the publishrc file to use.
     * For example, consider the following command line:
     *
     *     app-publisher --config-name spm
     *
     * Specifying this will cause the publishrc file named '.publishrc.spm.json' to be used.
     * Note that the default publishrc file is '.publishrc.*'.  Examples:
     *
     *     .publishrc.json
     *     .publishrc.custom.json
     *     .publishrc.js
     *     .publishrc.yaml
     *     .publishrc.yml
     */
    rcFile: string;
    /**
     * Display the contents of the configuration file.
     */
    readConfig: boolean;
    /**
     * The repository URL.  In the form:
     *     https://svn.mydomain.com/path/to/repo/projectname/trunk
     *     https://github.com/username/projectname
     */
    repo: string;
    /**
     * The repository type. It should be one of the following:
     *     1. git,
     *     2. svn
     * Defaults to 'git'.
     */
    repoType: string; // enum(git|svn)
    /**
     * Re-publish the current/latest release.
     */
    republish: boolean;
    /**
     * Skip manual editing of the changelog file(s).,
     * Note the changelog used for a release will be that of which is output by the,
     * internal commit parser.
     * Defaults to N
     */
    skipChangelogEdits: string;  // flag,
    /**
     * Skip committing changes to version control when the final release stage is finished.
     * Defaults to N
     */
    skipCommit: string;  // flag,
    /**
     * Skip all version edits in version files.
     * Defaults to N
     */
    skipVersionEdits: string;  // flag
    /**
     * @readonly
     */
    tagFormat: string;
    /**
     * Runs all scripts defined by the publishrc property 'buildCommand'
     */
    taskBuild: boolean;
    /**
     * Export the next release's current changelog and view using the editor specified in
     * the .publishrc file.
     * Note that this opens the actual versioned changelog/history file.
     */
    taskChangelog: boolean;
    /**
     * Export the next release's current changelog to the specified file can be a relative
     * or an absolute path.
     * Ignored if the option '--task-changelog-view' is used.
     * Examples:
     *     app-publisher -tcf install/dist/history.txt,
     *     app-publisher -tcf build/doc/changelog/changelog.md,
     *     app-publisher -tcf c:\\projects\\changelogs\\projectname\\cl.md,
     *     app-publisher --task-changelog-file build/tmp/version_notes.txt
     */
    taskChangelogFile: string;
    /**
     * Export the next release's current changelog in HTML release format to the specified file
     * can be a relative or an absolute path.
     * Ignored if the option '--task-changelog-view' is used.
     * Example usage:
     *     app-publisher --task-changelog-html-file install/tmp/version_notes.html
     */
    taskChangelogHtmlFile: string;
    /**
     * Export the next release's current changelog in HTML release format and view using the
     * editor specified in the .publishrc file. The created file is a copy stored in a temporary
     * directory specified by the OS.
     */
    taskChangelogHtmlView: boolean;
    /**
     * Export the next release's current changelog and output to stdout.
     */
    taskChangelogPrint: boolean;
    /**
     * Export the specified release's current changelog and output to stdout.
     */
    taskChangelogPrintVersion: string;
    /**
     * Export the next release's current changelog and view using the editor specified in the
     * .publishrc file. The created file is a copy stored in a temporary directory specified by
     * the OS.
     */
    taskChangelogView: boolean;
    /**
     * Export the specified release's current changelog and view using the editor specified in the
     * .publishrc file. The created file is a copy stored in a temporary directory specified by the OS.
     */
    taskChangelogViewVersion: string;
    /**
     * Output the CI environment name to stdout.
     */
    taskCiEnv: boolean;

    /**
     * Finds CI related build information, and outputs the info to stdout using a concatenated
     * string in the form 'current|next|changelogpath'.
     */
    taskCiEnvInfo: boolean;
    /**
     * Finds CI related build information, and outputs the info to the file 'ap.env' in the
     * root workspace directory.
     */
    taskCiEnvSet: boolean;
    /**
     * Commits the changes made when using the --touch-versions option using the 'chore: vX.X.X'
     * format for the commit message.
     */
    taskCommit: boolean;
    /**
     * Runs the deployment scripts defined in the .publishrc configuration
     */
    taskDeploy: boolean;
    /**
     * Run temporary tests in the local dev environment.  Note that this does nothing when ran
     * in a production build
     */
    taskDevTest: boolean;
    /**
     * Perform a 'Dist' release.
     */
    taskDistRelease: boolean;
    /**
     * Re-send the latest notification email.
     */
    taskEmail: boolean;
    /**
     * Perform a 'Github' release.
     * The changelog produced for the Github release will be created from the most recent entry
     * of the changelog/history file.
     */
    taskGithubRelease: boolean;
    /**
     * Perform a 'Mantis' release.
     * The changelog produced for the Mantis release will be created from the most recent entry
     * of the changelog/history file.
     */
    taskMantisbtRelease: boolean;
    /**
     * @readonly
     */
    taskMode: boolean;
    /**
     * @readonly
     */
    taskModeStdOut: boolean;
    /**
     * Perform an 'NPM' release (publish).
     */
    taskNpmRelease: boolean;
    /**
     * Restores changes made to the package.json file as a result of using the --task-npm-json-update
     * task.
     * Properties include:
     *     bugs, homepage, repo, repoType
     * Note that this task should in most cases always be ran following the use of the
     * --task-npm-json-update task.
     */
    taskNpmJsonRestore: boolean;
    /**
     * Updates package.json with .publishrc defined properties.
     * Properties include:
     *     bugs, homepage, repo, repoType
     * Can be used for publishing to multiple npm repositories.
     * Note that this task should in most cases always be followed up with a --task-npm-json-restore task.
     */
    taskNpmJsonUpdate: boolean;
    /**
     * Perform a 'Nuget' release (not implemented yet).
     */
    taskNugetRelease: boolean;
    /**
     * Reverts all local changes.
     */
    taskRevert: boolean;
    /**
     * Creates a tag using the 'vX.X.X' format for the tag name.
     * The 'taskVersionUpdate' and 'taskVersionUpdateCommit' tasks should always precede this task.
     * If 'auto' is specified as the positional argument, the version # used will be the current
     * version as calculated using the current state of  the workspace 'version' files (as defined
     * in .publishrc).
     * Defaults to 'auto',
     */
    taskTag: boolean;
    /**
     * Update version numbers either semantically or incrementally.
     * Versioned files are by default AssemblyInfo.cs, package.json, and app.json.
     * Additional versioned files are specified in the .publishrc file using the 'versionFiles'
     * and cProjectRcFile' properties.
     */
    taskVersionUpdate: boolean;
    /**
     * Finds the current/latest version released and outputs that version string to stdout.
     * Ignored if the --task-version-info switch is used.
     */
    taskVersionCurrent: boolean;
    /**
     * Finds the current/latest and next version released, and outputs the info to stdout using
     * a concatenated string in the form 'current|next'.
     * Note that this switch overrides both the --task-version-current and the
     * --task-version-current switches.
     */
    taskVersionInfo: boolean;
    /**
     * Calculates the next version to be released based on versioned files and commit messages
     * and outputs that version string to stdout.
     * Ignored if the --task-version-info switch is used.
     */
    taskVersionNext: boolean;
    /**
     * Gets the identifier denoting a pre-release from a version string.
     * For example, the version string 2.20.11-alpha.3 has a pre-release identifier of 'alpha'.
     * Example usage:
     *     app-publisher --task-version-pre-release-id 2.0.1-alpha.1,
     *     app-publisher --task-version-pre-release-id 2.0.1-beta.3
     */
    taskVersionPreReleaseId: boolean;
    /**
     * The email address to use as the 'To' address when sending an email notification while
     * running in dry run mode.
     */
    testEmailRecip: string | string[];
    /**
     * The editor program to use when opening version files for manual editing.
     * Defaults to notepad.
     */
    textEditor: string;
    /**
     * Tag prefix for the version tag.  Labels the created tag in the form prefix-vX.X.X.
     * Can be used for sub-projects within a single project.
     */
    vcTagPrefix: string;
    /**
     * Web path to version control repository
     */
    vcWebPath: string;
    /**
     * @readonly
     */
    verbose: boolean;
    /**
     * @readonly
     */
    version: string;
    /**
     * A file path or list of file paths to perform version string replacement in.
     */
    versionFiles: string | string[];
    /**
     * Force current version, for use with post release tasks such as re-sending an email notification
     * or performing a GitHub release if for whever reason it failed on the publish run
     * Example usage:
     *     app-publisher --task-github-release --version-force-current
     */
    versionForceCurrent: boolean;
    /**
     * A version number to use as the 'next version'.  Version calculation will not be performed
     * other than for reading in the current version, skipping an SCM step.
     * Example usage:
     *     app-publisher --version-force-next 300, * app-publisher --version-force-next 2.0.0
     */
    versionForceNext: string;
    /**
     * A file path or list of file paths to always perform version string replacement, in, regardless
     * of whether the 'skipVersionEdits' flag is set.
     */
    versionFilesEditAlways: string | string[];
    /**
     * A file path or list of file paths where sroll-down is perfoemed when opened for editing.
     */
    versionFilesScrollDown: string | string[];
    /**
     * A version property to be used or a project that does not use a package.json file.  Versions
     * specified by this property should be in the same format as that of a package.json file and
     * can be semantically parsed.
     */
    versionProperty: string;
    /**
     * A tag or list of tags to use for performing version string replacement in files specified by
     * 'versionFiles', and default versioned files (e.g. package.json).
     */
    versionReplaceTags: string | string[];
    /**
     * An identifier denoting a pre-release can to be appenended to the next version number to
     * produce the final version string, e.g. 'alpha' produces the final version string of x.y.z-alpha.
     * Example usage:
     *     app-publisher --version-pre-release-id alpha, * app-publisher --version-pre-release-id pre1
     */
    versionPreReleaseId: string;
    /**
     * The text tag to use in the history file for preceding the version number.  It should be one of
     * the following:,
     *
     *     1. Version,
     *     2. Build,
     *     3. Release
     *
     * Defaults to 'Version'.
     */
    versionText: string;
    /**
     * In addition to stdout, writes a log to LOCALAPPDATA\\app-publisher\\log
     */
    writeLog: string; // flag
}
