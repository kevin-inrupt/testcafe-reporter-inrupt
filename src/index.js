const report = require("./report");
//import report from "./report";

const envs = require("envs");

module.exports = function () {

    const reporterCreatedTime = Date.now();

    return {

        noColors: true,

        // Executed prior to the start of the test run
        reportTaskStart (startTime, userAgents, testCount) {

            // Configuration Flags
            this.toConsole = ("true" == envs("TESTCAFE_REPORT_TOCONSOLE", "true"));
            this.mergeReport = ("true" == envs("TESTCAFE_REPORT_DISPLAYMODE", "false"));
            this.showErrors = ("true" == envs("TESTCAFE_REPORT_SHOWERRORS", "false"));
            this.includeHeader = ("true" == envs("TESTCAFE_REPORT_INCLUDEHEADER", "true"));
            this.includeFooter = ("true" == envs("TESTCAFE_REPORT_INCLUDEFOOTER", "true"));

            // Slack
            this.toSlack = ("true" == envs("TESTCAFE_REPORT_TOSLACK", "false"));

            // Create the new Report
            this.report = new report(this.mergeReport, this.toConsole, this.toSlack);

            this.startTime = startTime;
            this.testCount = testCount;

            // Output header
            if (this.includeHeader) {

                // Configuration information
                console.log("");
                console.log("TestCafe_Report_Inrupt");
                console.log("  Output to Console? " + this.toConsole.toString());
                console.log("  Output to Slack? " + this.toSlack.toString());
                console.log("  Merged Report? " + this.mergeReport.toString());
                console.log("");

                // Output the Report header
                this.report.addMessage(`Date/Time: ${startTime}`, true);
                this.report.addMessage(`Environment: ${userAgents}`, true);
                this.report.addMessage(`Against: ${envs('ENV', 'No env specified')}`, true);
                this.report.addMessage(``, true);
                this.report.addMessage(`CI Job: ${envs('CI_JOB_URL', '')}`, true);
                this.report.addMessage(`Merge Request: ${envs('CI_MERGE_REQUEST_PROJECT_URL', '')}`, true);
                this.report.addMessage(`User: @${envs('GITHUB_USER_LOGIN', 'No One')}`, true);
                this.report.addMessage(``, true);
                this.report.addMessage(`Startup time (${this.fmtTime(startTime - reporterCreatedTime)})`, true);
            }
        },


        // Executed prior to a Fixture starting
        reportFixtureStart (name, path, meta) {
            this.fixtureStartTime =  Date.now();
            this.report.addMessage("", true);
            this.currentFixtureName = name;
            this.report.addMessage(this.currentFixtureName, true);
        },


        // Executed when an individual Test has ended
        reportTestDone (name, testRunInfo, meta) {

            // Test Duration
            const durationStr = this.fmtTime(testRunInfo.durationMs);

            // Errors? Warnings?
            let resultIcon = "";
            if (testRunInfo.errs.length > 0)
                resultIcon = ":red_circle:";
            else if ((testRunInfo.warnings !== null) && 
                     (testRunInfo.warnings !== undefined) && 
                     (testRunInfo.warnings.length > 0))
                resultIcon = ":large_yellow_circle:";
            else
                resultIcon = ":large_green_circle:";

            // Test Result
            let message = resultIcon + " " + name + " (" + durationStr + ")";

            // Unstable?
            if (testRunInfo.unstable)
                message += " (Unstable)";

            // Append to Report
            this.report.addMessage(message);

            // Include Error details?
            if (this.showErrors && (testRunInfo.errs.length > 0)) {
                let errorStr = "";
                let separator = "";
                testRunInfo. errs.forEach((err, idx) => {
                    errorStr += separator + this.formatError(err, `${idx + 1}) `);
                    separator = "\n";
                });
                this.report.addMessage(errorStr);
            }
        },


        // Executed when all of the tests have been executed
        reportTaskDone (endTime, passed, warnings, result) {

            if (this.includeFooter) {
                const durationMs  = endTime - this.startTime;
                const durationStr = this.fmtTime(durationMs);
                let footer = result.failedCount ?
                    `${result.failedCount}/${this.testCount} failed` :
                    `${result.passedCount} passed`;

                footer += ` (Duration: ${durationStr})`;
                footer += ` (Skipped: ${result.skippedCount})`;
                footer += ` (Warnings: ${warnings.length})`;
    
                this.report.addMessage("", true);
                this.report.addMessage(footer, true);
                this.report.sendTaskReport(this.testCount - passed);
            }
        },


        // Format Duration
        fmtTime(duration) {
            if (duration < 10 * 1000) {
              const seconds = duration / 1000
              return seconds.toFixed(2) + 's'
            }
      
            return this.moment.duration(duration).format('h[h] mm[m] ss[s]')
          }
    }
}
