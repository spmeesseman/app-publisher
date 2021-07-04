
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
        // Subversion Checkout.  Delay 5 seconds first since someone decided it was a good idea
        // to grab the SVN changes by timestamp even though the HEAD commit id is known.  If the
        // server clock is off by even one half of a second, the last change will not be grabbed
        //
        echo "Subversion checkout delay 5 seconds..."
        sleep(time:5, unit:"SECONDS")
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
                // credentialsId: "31b92f3c-80ee-4cfa-887f-61c9937d4fe2", // jenkins.tr.pjats.com system acct
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
          env.SKIP_CI = "false"
          //
          // Set variables to use throughout build process by examining the commit messages.
          // For SVN, its once commit per changeset (whereas Got could have multiple commits per changeset)
          // Overrides build parameters.
          //
          def changeLogSets = currentBuild.changeSets
          for (int i = 0; i < changeLogSets.size(); i++) {
            def entries = changeLogSets[i].items
            //
            // Set environment control flags and log commit messages
            //
            echo "Log changesets and commit messages:"
            for (int j = 0; j < entries.length; j++) {
                def entry = entries[j]
                echo "${entry.commitId} by ${entry.author} on ${new Date(entry.timestamp)}: ${entry.msg}"
                echo "   ${entry.msg}"
                //
                // If the [skip ci] tag is found in the last commit, then exit
                //
                if (i == 0 && j == 0) {
                  if (entry.msg.indexOf("[skip-ci]") != -1 || entry.msg.indexOf("[skip ci]") != -1 || entry.msg.indexOf("[skipci]") != -1) {
                    echo "The 'skip ci' tag was found in the last commit"
                    echo "Set build statis to NOT_BUILT"
                    currentBuild.result = 'NOT_BUILT'
                    env.SKIP_CI = "true"
                  }
                }
                //
                // List files in this commit
                //
                def files = new ArrayList(entry.affectedFiles)
                for (int k = 0; k < files.size(); k++) {
                    def file = files[k]
                    echo "  ${file.editType.name} ${file.path}"
                }
            }
          }
          //
          // Params override the environment.  Note that boolean params will be converted to
          // string when writing to the env object.
          //
          if (params.RELEASE_PRODUCTION == true) {
            env.RELEASE_PRODUCTION = params.RELEASE_PRODUCTION
          }
          if (env.TAG_NAME != null || env.BRANCH_NAME != "trunk") {
            env.RELEASE_PRODUCTION = "false"
          }
          echo "Release Parameters:"
          echo "   Production release  : ${env.RELEASE_PRODUCTION} (tbd)"
          echo "Build Environment:"
          echo "   Skip CI             : ${env.SKIP_CI}" 
          if (env.BRANCH_NAME != null) {
            echo "   Branch              : ${env.BRANCH_NAME}"
          }
          if (env.TAG_NAME != null ) {
            echo "   Tag                 : ${env.TAG_NAME}"
          }
        }
        //
        // NPM Install
        //
        nodejs("Node 12") {
          bat "npm install"
        }
      } 
    }

    //
    // TESTS
    //
    stage("Tests") {
      when {
        expression { env.SKIP_CI == "false" }
      }
      // environment {
      //   CODECOV_TOKEN = env.CODEDOV_TOKEN_AP
      // }
      steps {
        echo "Run tests"
        // nodejs("Node 12") {
        //   bat "npm run clean-build"
        //   bat "npm run build"
        //   bat "npm run test"
        //   echo "Publish test results"
        //   // sh "tools/codecov.sh"
        // }
      }
    }

    //
    // PRE-BUILD
    //
    stage("Pre-Build") {
      when {
        expression { env.SKIP_CI == "false" }
      }
      steps {
        //
        // If the [skip ci] tag is found in the last commit, then exit
        //
        nodejs("Node 12") {
          script {
            env.NEXTVERSION  = ""
            env.CURRENTVERSION  = ""
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
                                       app-publisher --config-name pja --task-version-current
                                     """)
            if (env.TAG_NAME == null) {
              echo "This is not /tags - update version files"
              env.NEXTVERSION = bat(returnStdout: true,
                                    script: """
                                      @echo off
                                      app-publisher --config-name pja --task-version-next
                                    """)
              if (env.CURRENTVERSION != env.NEXTVERSION) {
                echo "Version bumped, a release will be performed"
                env.RELEASE_PRODUCTION = "true"
              }
            }
            else {
              echo "This is /tags/${env.TAG_NAME}, set next version to current"
              env.NEXTVERSION = env.CURRENTVERSION
            }
            echo "Current version is ${env.CURRENTVERSION}"
            echo "Next proposed version is ${env.NEXTVERSION}"
            //
            // If the version didnt change, there'll be no release and we dont need to run --task-version-update
            //
            if (env.NEXTVERSION == "" || env.CURRENTVERSION == "") {
              echo "The current or next version could not be found, fail"
              env.RELEASE_PRODUCTION = "false"
              sh "exit 1" // fail!! does it work???
            }
            if (env.NEXTVERSION == env.CURRENTVERSION) {
              echo "The current version is equal to the next version, unset release flags"
              env.RELEASE_PRODUCTION = "false"
            }
            else { //
                  // Update version files
                //
                echo "Update version files"
                bat "app-publisher --config-name pja --task-version-update"
            }
          }
        }
      }
    }

    //
    // BUILD
    //
    stage("Build") {
      when {
        expression { env.SKIP_CI == "false" }
      }
      steps {
        nodejs("Node 12") {
          bat "npm run clean-build"
          bat "npm run build"
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
        expression { env.RELEASE_PRODUCTION == "true" && env.SKIP_CI == "false" }
        // expression { env.RELEASE_PRODUCTION }   // for testing
      }
      steps {
        script {
          def historyEntry = ""
          def historyHeader = ""
          echo "Approval needed for Version ${env.NEXTVERSION} History File Changelog"
          //
          // Populate and open history.txt in Notepad, then will wait for user intervention
          //
          nodejs("Node 12") {
            bat "app-publisher --config-name pja --task-changelog --version-force-next ${env.NEXTVERSION}" 
            historyEntry = bat(returnStdout: true,
                                script: """
                                  @echo off
                                  app-publisher --config-name pja --task-changelog-print --version-force-next ${env.NEXTVERSION}
                                """)
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
          def changelogLoc = "c:\\Users\\administrator.TR\\AppData\\Local\\Jenkins\\.jenkins\\workspace\\app-publisher_trunk\\doc\\history.txt"
          def inputMessage = "Approve Version ${env.NEXTVERSION} History File Changelog\n${changelogLoc}"
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
            nodejs("Node 12") {
              historyHeader = bat(returnStdout: true,
                                    script: """
                                    @echo off
                                    app-publisher --config-name pja --task-changelog-hdr-print-version ${env.NEXTVERSION}
                                  """)
            }
            // def status = powershell(returnStatus: true,
            //                         script: 'out-file -filepath doc/history.txt -Append -inputobject historyEntry')
            // if (status != 0) {
            //   error("Could not find history file entry")
            // }
            // bat "echo Version ${env.NEXTVERSION} >> .\\doc\\history.txt"
            bat "echo Version ${historyHeader} >> .\\doc\\history.txt"
            bat "echo Version ${historyEntry} >> .\\doc\\history.txt"
          }
        }
      }
    }

    //
    // PUBLISH
    //
    stage("Publish") {
      when {
        expression { env.SKIP_CI == "false" }
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
          if (env.RELEASE_PRODUCTION == "true") {
            nodejs("Node 12") {
              echo "Publish for production release"
              //
              // NPM and MantisBT Release
              //
              echo "Perform NPM and MantisBT Releases"
              bat "app-publisher --config-name pja --task-mantisbt-release --task-npm-release --version-force-next ${env.NEXTVERSION}"
            }
          }
        }
      }
    }

    //
    // COMMIT / TAG
    //
    stage("Commit") {
      when {
        expression { env.RELEASE_PRODUCTION == "true" && env.SKIP_CI == "false"  }
      }
      steps {
        echo "Perform production build post-build tasks"
        echo "    1. Commit modified files to SVN."
        echo "    2. Tag version ${env.NEXTVERSION} in SVN."
        nodejs("Node 12") {
          script {
            bat "app-publisher --config-name pja --task-commit --task-tag"
          }
        }
      }
    }

  //
  // END STAGES
  //
  }

  post { 
    //
    // ALWAYS RUN
    //
    always { 
      script {
        if (env.SKIP_CI == "false") {
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
        if (env.SKIP_CI == "false") {
          //
          // Production release only post success tasks
          //
          if (env.RELEASE_PRODUCTION == "true") {
            echo "Successful build"
            echo "    1. Send release email."
            nodejs("Node 12") {
              // bat "app-publisher --config-name pja --task-email"
              bat "app-publisher --config-name pja --task-email --version-force-current"
            }
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
        if (env.SKIP_CI == "false") {
          echo "Failed build"
          echo "    1. Notify."
        }
      }
    }
  }

}
