
pipeline {
  agent any

  options {
    skipDefaultCheckout()
    // skipStagesAfterUnstable()
    //
    // Keep only last 100 builds
    //
    buildDiscarder(logRotator(numToKeepStr: '100'))
    // Timeout job after 60 minutes
    timeout(time: 10, unit: 'MINUTES')
  }

  parameters {
    booleanParam(defaultValue: false,
                 description: 'Production Release',
                 name: 'RELEASE_PRODUCTION')
  }

  stages {
    //
    // CHECK OUT FROM SVN
    //
    stage("Prepare Environment") {
      steps {
        //
        // Subversion Checkout
        //
        echo "Subversion checkout..."
        checkout(
          poll: false,
          scm: [
            $class: "SubversionSCM",
            additionalCredentials: [],
            browser: [
                $class: "WebSVN", 
                url: "https://app1.development.pjats.com/svn/web/listing.php/?repname=pja&path=/app-publisher/${env.BRANCH_NAME}/"
            ],
            excludedCommitMessages: "\\[skip[ \\-]ci\\]",
            excludedRegions: "",
            excludedRevprop: "",
            excludedUsers: "",
            filterChangelog: false,
            ignoreDirPropChanges: false,
            includedRegions: "",
            locations: [
            [
                cancelProcessOnExternalsFail: true,
                credentialsId: "6ff47a32-994c-4ac2-9016-edb075a98e5b", // jenkins.tr.pjats.com
                // credentialsId: "9168a4c0-47d2-423b-b676-3df3adc0d9df",    // Local Dev
                depthOption: "infinity",
                ignoreExternalsOption: true,
                local: ".",
                remote: "https://svn.development.pjats.com/pja/app-publisher/${env.BRANCH_NAME}"
            ]],
            quietOperation: true,
            workspaceUpdater: [$class: "UpdateWithRevertUpdater"]
          ]
        )
        //
        // Log commit messages
        // Set variables to use throughout build process
        // Check for [skip ci] tag on last commit
        //
        script {
          env.SKIP_CI = false
          //
          // Set variables to use throughout build process by examining the commit messages.
          // Overrides build parameters.
          //
          def changeLogSets = currentBuild.changeSets
          for (int i = 0; i < changeLogSets.size(); i++) {
            def entries = changeLogSets[i].items
            //
            // If the [skip ci] tag is found in the last commit, then exit
            //
            if (i == 0 && entries.length > 0) {
              def entry = entries[0]
              if (entry.msg.indexOf("[skip-ci]") != -1 || entry.msg.indexOf("[skip ci]") != -1) {
                echo "THE 'skip ci' TAG WAS FOUND IN COMMIT"
                echo "Set build statis to NOT_BUILT"
                currentBuild.result = 'NOT_BUILT'
                env.SKIP_CI = true 
              }
            }
            //
            // Set environment control flags and log commit messages
            //
            echo "Log changesets and commit messages:"
            for (int j = 0; j < entries.length; j++) {
                def entry = entries[j]
                echo "${entry.commitId} by ${entry.author} on ${new Date(entry.timestamp)}: ${entry.msg}"
                def files = new ArrayList(entry.affectedFiles)
                for (int k = 0; k < files.size(); k++) {
                    def file = files[k]
                    echo "  ${file.editType.name} ${file.path}"
                }
                if (entry.msg.indexOf("[production-release]") != -1) {
                  echo "THIS IS A PRODUCTION RELEASE"
                  params.RELEASE_PRODUCTION = true
                }
            }
          }
          if (env.BRANCH_NAME != null) {
            echo "Current branch      : ${env.BRANCH_NAME}"
          }
          if (env.TAG_NAME != null) {
            echo "Current tag         : ${env.TAG_NAME}"
            params.RELEASE_PRODUCTION = false
          }
          //
          // If the [skip ci] tag is found in the last commit, then exit
          //
          if (env.SKIP_CI == true) {
            currentBuild.result = 'NOT_BUILT'
            echo "The 'skip ci' tag was found in commit. Aborting."
            bat "exit 0"
          }
        }
        echo "Build parameters:"
        echo "   Production release  : ${params.PRODUCTION_RELEASE}"
        echo "Build environment:"
        echo "   Skip CI             : ${env.SKIP_CI}" 
      } 
    }

    //
    // PRE-BUILD
    //
    stage("Pre-Build") {
      when {
        expression { SKIPCI == false }
      }
      steps {
        //
        // If the [skip ci] tag is found in the last commit, then exit
        //
        nodejs("Node 12") {
          //
          // NPM Install
          //
          bat "npm install"
          script {
            //
            // app-publisher is used so check for .publishrc file
            //
            def apRcExists = fileExists '.publishrc.pja.json'
            if (apRcExists == false) {
              error(".publishrc.pja.json not found, cannot run app-publisher")
            }
            //
            // Display AppPublisher version
            //
            bat "app-publisher --version"
            //
            // Get version info
            //
            //env.CURRENTVERSION = stdout.split("|")[0]
            //env.NEXTVERSION = stdout.split("|")[1]
            env.CURRENTVERSION = bat(returnStdout: true,
                                     script: """
                                       @echo off
                                       app-publisher --rc-file .publishrc.pja.json --task-version-current
                                     """)
            if (env.TAG_NAME == null) {
              echo "No tag found, trunk/branch build set version"
              env.NEXTVERSION = bat(returnStdout: true,
                                    script: """
                                      @echo off
                                      app-publisher --rc-file .publishrc.pja.json --task-version-next
                                    """)
              //
              // Update version files
              //
              echo "Update version files"
              bat "app-publisher --rc-file .publishrc.pja.json --task-version-update"
            }
            else {
              echo "Tag found: ${env.TAG_NAME}, set next version to current"
              env.NEXTVERSION = env.CURRENTVERSION
            }
            echo "Current version is ${env.CURRENTVERSION}"
            echo "Next proposed version is ${env.NEXTVERSION}"
          }
        }
      }
    }

    //
    // BUILD
    //
    stage("Build") {
      when {
        expression { SKIPCI == false }
      }
      steps {
        nodejs("Node 12") {
          bat "npm run build"
        }
      }
    }

    //
    // TESTS
    //
    stage("Tests") {
      when {
        expression { SKIPCI == false }
      }
      // environment {
      //   CODECOV_TOKEN = env.CODEDOV_TOKEN_AP
      // }
      steps {
        echo "Run tests"
        nodejs("Node 12") {
          bat "npm run test"
          // sh "tools/codecov.sh"
        }
      }
    }

    //
    // HISTORY FILE
    //
    stage("History File") {
      //
      // Only when we have a [production-release] commit
      //
      when {
        expression { PRODUCTIONRELEASE == true && SKIPCI == false }
        // expression { PRODUCTIONRELEASE == false }   // for testing
      }
      steps {
        script {
          historyEntry = ""
          echo "Approval needed for Version ${env.NEXTVERSION} History File Changelog"
          //
          // Populate and open history.txt in Notepad, then will wait for user intervention
          //
          dir("src/ui") {
            nodejs("Node 12") {
              //
              // If we don't use --version-force-next option then ap will bump the version again
              // since we ran the --task-version-update command already
              //
              bat "app-publisher --rc-file .publishrc.pja.json --task-changelog --version-force-next ${env.NEXTVERSION}" 
              historyEntry = bat(returnStdout: true,
                                 script: """
                                   @echo off
                                   app-publisher --rc-file .publishrc.pja.json --task-changelog-print --version-force-next ${env.NEXTVERSION}
                                 """)
            }
          }
          //
          // Notify of input required
          //
          echo "Notify approvers of pending approval wait"
          emailext body: 'App-Publisher Jenkins build requires user input',
                attachLog: false,
                mimeType: 'text/html',
                subject: "User Input Required for Build ${BUILD_NUMBER}: ${env.JOB_NAME} v${env.NEXTVERSION}",
                to: "smeesseman@pjats.com" // "${env.EMAIL_RECIPIENTS}"
                //body: '''${SCRIPT, template="groovy-html.template"}''', 
                //body: '${SCRIPT,template="managed:EmailTemplate"}',
                //attachLog: true,
                //compressLog: true,
          //
          // Wait for user intervention, approval of new version # and history entry
          //
          echo "Waiting for user approval..."
          def inputMessage = "Approve Version ${env.NEXTVERSION} History File Changelog"
          def userInput = input id: 'history_file_approval',
                                message: inputMessage,
                                ok: 'Approve', 
                                submitter: 'smeesseman,mnast',
                                submitterParameter: 'UserID',
                                parameters: [
                                  string(defaultValue: 'smeesseman', description: 'Network User ID of approver', name: 'UserID', trim: true),
                                  string(defaultValue: env.NEXTVERSION, description: 'Next version #', name: 'Version', trim: true),
                                  choice(choices: ['No', 'Yes'], description: 'Append changelog to history file (if not, manually edit and save)', name: 'Append'),
                                  text(defaultValue: historyEntry, description: 'History File Entry', name: 'Changelog')
                                ]
          //
          // Save user input to variables. Default to empty string if not found.
          //
          def inputUserID = userInput.UserID?:''
          def inputAppend = userInput.Append?:''
          def inputChangelog = userInput.Changelog?:''
          def inputVersion = userInput.Version?:''
          echo "Verified history.txt, proceeding"
          echo "   User    : ${inputUserID}"
          echo "   Append  : ${inputAppend}"
          echo "   Version : ${inputVersion}"
          env.NEXTVERSION = inputVersion
          if (inputAppend == "Yes") {
            bat "svn revert .\\doc\\history.txt"
            def status = powershell(returnStatus: true,
                                    script: 'out-file -filepath doc/history.txt -Append -inputobject historyEntry')
            if (status != 0) {
              error("Could not find history file entry")
            }
          }
        }
      }
    }

    //
    // PUBLISH
    //
    stage("Publish") {
      when {
        expression { PRODUCTIONRELEASE == true && SKIPCI == false }
      }
      steps {
        echo "Store Jenkins Artifacts"
        archiveArtifacts allowEmptyArchive: true, 
                          artifacts: 'doc/history.txt,install/dist/app-publisher.tgz',
                          followSymlinks: false,
                          onlyIfSuccessful: true
        script {
          //
          // Production or nightly release, or not
          //
          if (params.RELEASE_PRODUCTION == true) {
            nodejs("Node 12") {
              echo "Publish for production release"
              //
              // NPM and MantisBT Release
              //
              echo "Perform NPM and MantisBT Releases"
              bat "app-publisher --rc-file .publishrc.pja.json --task-mantisbt-release --task-npm-release --task-email --version-force-next ${env.NEXTVERSION}"
            }
          }
        }
      }
    }
  }

  post { 
    //
    // ALWAYS RUN
    //
    always { 
      script {
        if (env.SKIP_CI == false) {
          mantisIssueAdd keepTicketPrivate: false, threshold: 'failureOrUnstable'
          mantisIssueUpdate keepNotePrivate: false, recordChangelog: true, setStatusResolved: true, threshold: 'failureOrUnstable'
          //
          // send email
          // email template to be loaded from managed files
          //  
          emailext body: '${JELLY_SCRIPT,template="html"}', 
                  attachLog: true,
                  compressLog: true,
                  mimeType: 'text/html',
                  subject: "Build ${BUILD_NUMBER} : " + currentBuild.currentResult + " : " + env.JOB_NAME,
                  to: "smeesseman@pjats.com"
        }
      }
    }
    //
    // SUCCESS
    //
    success {
      script {
        if (env.SKIP_CI == false) {
          //
          // Production release only post success tasks
          //
          if (params.RELEASE_PRODUCTION == true) {
            echo "Successful build"
            echo "    1. Commit modified files to SVN."
            echo "    2. Tag version in SVN."
            echo "    3. Send release email."
            bat "app-publisher --rc-file .publishrc.pja.json --task-commit --task-tag --task-email --version-force-next ${env.NEXTVERSION}"
          }
        }
      }
    }
    //
    // FAILURE
    //
    failure {
      // when {
      //   allOf {
      //     branch 'trunk';
      //     // branch pattern: "release-\\d+", comparator: "REGEXP"
      //     changelog '.+ \\[production-release\\]$'
      //     // changelog '.*^\\[DEPENDENCY\\] .+$'
      //     // tag "release-*"
      //   }
      // }
      script {
        if (env.SKIP_CI == false) {
          echo "Failed build"
          echo "    1. Notify."
        }
      }
    }
  }

}
