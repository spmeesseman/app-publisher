
pipeline {
  agent any

  options {
    skipDefaultCheckout()
  }

  parameters {
    string(defaultValue: "smeesseman@pjats.com", // "$emailRecipients",
            description: 'List of email recipients',
            name: 'EMAIL_RECIPIENTS')
  }

  stages {
    
    stage("Checkout") {
      steps {
        checkout([
          $class: "SubversionSCM", 
          additionalCredentials: [], 
          browser: [
              $class: "WebSVN", 
              url: "https://app1.development.pjats.com/svn/web/listing.php/?repname=pja&path=/app-publisher/${env.BRANCH_NAME}/"
          ], 
          excludedCommitMessages: "skip-ci", 
          excludedRegions: "", 
          excludedRevprop: "", 
          excludedUsers: "", 
          filterChangelog: false, 
          ignoreDirPropChanges: false, 
          includedRegions: "", 
          locations: [
          [
              cancelProcessOnExternalsFail: true, 
              credentialsId: "7e4d2229-822b-401c-919b-2e492d6eae27", 
              depthOption: "infinity", 
              ignoreExternalsOption: true, 
              local: ".", 
              remote: "https://svn.development.pjats.com/pja/app-publisher/${env.BRANCH_NAME}"
          ]],
          quietOperation: true, 
          workspaceUpdater: [$class: "UpdateWithRevertUpdater"]
        ])
      }
    }

    stage("Build") {
      steps {
        nodejs("Node 13") {
          bat "call npm install"
          bat "call npm run build"
          //bat "app-publisher --dry-run --no-ci"
        }
      }
    }

    stage("Publish") {
      steps {
        echo "Store Jenkins Artifacts"
        archiveArtifacts allowEmptyArchive: true, 
                          artifacts: 'doc/history.txt',
                          followSymlinks: false,
                          onlyIfSuccessful: true
      }
    }
  
  }

  post { 
    //
    // Run regardless of the completion status of the pipeline
    //
    always {
      script {
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
    //
    // Only run the steps if the current Pipeline’s or stage’s run has a "success" status
    //
    //success {
    //  when {
    //    branch 'trunk'
    //  }
    //  steps {
    //    echo "Subversion Tasks."
    //    dir("src/ui") {
    //      bat "app-publisher --touch-versions-commit"
    //    }
    //  }
    //  
    //  when {
    //    branch 'trunk'
    //  }
    //  steps {
    //    dir("src/ui") {
    //      bat "app-publisher --email-only"
    //    }
    //  }
    //}
  }

  options {
    //
    // Keep only last 10 builds
    //
    buildDiscarder(logRotator(numToKeepStr: '10'))
    // Timeout job after 60 minutes
    timeout(time: 60, unit: 'MINUTES')
  }

}
