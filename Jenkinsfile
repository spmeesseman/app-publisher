
pipeline {
  agent any

  options {
    skipDefaultCheckout()
    //
    // Keep only last 100 builds
    //
    buildDiscarder(logRotator(numToKeepStr: '100'))
    // Timeout job after 60 minutes
    timeout(time: 10, unit: 'MINUTES')
  }
 
  parameters {
    string(defaultValue: "smeesseman@pjats.com", // "$emailRecipients",
            description: 'List of email recipients',
            name: 'EMAIL_RECIPIENTS')
  }

  stages {
    
    stage("Checkout") {
      steps {
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
                // credentialsId: "7e4d2229-822b-401c-919b-2e492d6eae27", // Build Server
                credentialsId: "9168a4c0-47d2-423b-b676-3df3adc0d9df",    // Local Dev
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
        //
        script {
          env.PRODUCTIONRELEASE = "0"
          echo "Log changesets and commit messages:"
          def changeLogSets = currentBuild.changeSets
          for (int i = 0; i < changeLogSets.size(); i++) {
            def entries = changeLogSets[i].items
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
                  env.PRODUCTIONRELEASE = "1"
                }
            }
          }
          if (env.BRANCH_NAME != null) {
            echo "Current branch      : ${env.BRANCH_NAME}"
          }
          if (env.TAG_NAME != null) {
            echo "Current tag         : ${env.TAG_NAME}"
            env.PRODUCTIONRELEASE = "0"
          }
        }
        echo "Production release  : ${env.PRODUCTIONRELEASE}"
      }
    }

    //
    // PRE-BUILD
    //
    stage("Pre-Build") {
      steps {
        nodejs("Node 12") {
          //
          // NPM Install
          //
          bat "npm install"
          script {
            //
            // app-publisher is used so check for .publishrc file
            //
            def apRcExists = fileExists '.publishrc.json'
            if (apRcExists == false) {
              error(".publishrc.json not found, cannot run app-publisher")
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
                                       app-publisher --task-version-current
                                     """)
            if (env.TAG_NAME == null) {
              echo "No tag found, trunk/branch build set version"
              env.NEXTVERSION = bat(returnStdout: true,
                                    script: """
                                      @echo off
                                      app-publisher --task-version-next
                                    """)
              //
              // Update version files
              //
              echo "Update version files"
              bat "app-publisher --task-touch-versions"
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
      steps {
        echo "Run tests"
      }
    }

    //
    // Edit history file
    //
    stage("Edit History File") {
      //
      // Only when we have a [production-release] commit
      //
      when {
        expression { PRODUCTIONRELEASE == "1" }
        // expression { PRODUCTIONRELEASE == "0" }   // for testing
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
              bat "app-publisher --task-changelog --version-force-next ${env.NEXTVERSION}" 
              bat "app-publisher --task-changelog-file doc\\tmp_history.txt --version-force-next ${env.NEXTVERSION}" 
              historyEntry = bat(returnStdout: true,
                                 script: """
                                   @echo off
                                   powershell Get-Content -path .\\doc\\tmp_history.txt -Raw
                                 """)
              bat "del /F .\\doc\\tmp_history.txt"
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
                to: "smeesseman@pjats.com" // "${params.EMAIL_RECIPIENTS}"
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
          if (env.PRODUCTIONRELEASE == "1") {
            nodejs("Node 12") {
              echo "Publish for production release"
              //
              // MantisBT -> Releases Plugin
              //
              echo "Perform MantisBT Releases"
              bat "app-publisher --task-mantisbt-release"
              //
              // NPM Release
              //
              echo "Perform NPM Releases"
              // bat "app-publisher --task-npm-release"
              bat "npm publish"
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
                to: "smeesseman@pjats.com" // "${params.EMAIL_RECIPIENTS}"
      }
    }
    //
    // SUCCESS
    //
    success {
      script {
        //
        // Production release only post success tasks
        //
        if (env.PRODUCTIONRELEASE == "1") {
          echo "Successful build"
          echo "    1. Tag version in SVN."
          echo "    2. Send release email."
          bat "app-publisher --task-commit --task-email"
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
      echo "Failed build"
      echo "    1. Notify."
    }
  }

}
