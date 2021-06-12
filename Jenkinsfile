
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

  environment { 
    CURRENT_VERSION = ''
    NEXT_VERSION = ''
    CHANGELOG_FILE = ''
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
      }
    }

    stage("Pre-Build") {
      steps {
        nodejs("Node 10") {
          bat "npm install"
        }
        script {
          //powershell "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned"
          //stdout = bat(returnStdout: true,
          //        script: """
          //          @echo off
          //          app-publisher --task-version-info
          //        """)
          //env.CURRENTVERSION = stdout.split("|")[0]
          //env.NEXTVERSION = stdout.split("|")[1]
          env.CURRENTVERSION = bat(returnStdout: true,
                  script: """
                    @echo off
                    app-publisher --task-version-current
                  """)
          env.NEXTVERSION = bat(returnStdout: true,
                  script: """
                    @echo off
                    app-publisher --task-version-next
                  """)
          if (env.BRANCH_NAME == "trunk") {
            echo "Update version"
            //bat "app-publisher --touch-versions"
          }
          else {
            echo "No pre-build stage found for branch ${env.BRANCH_NAME}"
          }
        }
      }
    }

    stage("Build") {
      steps {
        nodejs("Node 10") {
          echo "Current version is ${env.CURRENTVERSION}"
          echo "Next proposed version is ${env.NEXTVERSION}"
          bat "app-publisher --task-touch-versions"
          bat "npm run build"
        }
      }
    }

    stage("Publish") {
      steps {
        echo "Store Jenkins Artifacts"
        archiveArtifacts allowEmptyArchive: true, 
                          artifacts: 'install/dist/history.txt,install/dist/app-publisher.tgz',
                          followSymlinks: false,
                          onlyIfSuccessful: true
        //when {
        //  not {
        //    changelog '^.*\\[skip release\\].+$'
        //  }
        //}
        script {
          if (env.BRANCH_NAME == "trunk") {
            echo "Successful build"
            echo "    1. Tag version in SVN."
            echo "    2. Send release email."
            // bat "app-publisher --task-touch-versions-commit --task-email"
          }
        }
      }
    }
  
  }

  post { 
    //
    // Run regardless of the completion status of the pipeline
    //
    always { 
      script {
        mantisIssueRegister keepTicketPrivate: false, threshold: 'failureOrUnstable'
        mantisIssueUpdater keepNotePrivate: false, recordChangelog: true, setStatusResolved: true, threshold: 'failureOrUnstable'
        //
        // send email
        // email template to be loaded from managed files
        //
        //env.ForEmailPlugin = env.WORKSPACE      
        emailext body: '${JELLY_SCRIPT,template="html"}', 
                //body: '''${SCRIPT, template="groovy-html.template"}''', 
                attachLog: true,
                compressLog: true,
                //attachmentsPattern: "$reportZipFile",
                mimeType: 'text/html',
                subject: "Build ${BUILD_NUMBER} : " + currentBuild.currentResult + " : " + env.JOB_NAME,
                to: "smeesseman@pjats.com" // "${params.EMAIL_RECIPIENTS}"
        //
        // clean up workspace
        //
        //deleteDir()
      }
    }
  }

}
