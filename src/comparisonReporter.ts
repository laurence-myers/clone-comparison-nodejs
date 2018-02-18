import mocha = require('mocha');
import EventEmitter = NodeJS.EventEmitter;
import ITest = Mocha.ITest;
import ISuite = Mocha.ISuite;
import {ComparisonEntry, comparisonReport} from "./templates/comparisonReport";
import {last} from "./core";
import {mkdirsSync} from "fs-extra";
import {writeFileSync} from "fs";
import * as path from "path";

type TestRunner = Mocha.IRunner & EventEmitter;

class ComparisonReporter extends mocha.reporters.Base {

    protected suiteLevel = 0;
    protected passes = 0;
    protected failures = 0;

    protected comparisonEntries : ComparisonEntry[] = [];
    protected currentComparisonEntry : ComparisonEntry = {
        libName: '',
        suites: [],
        totalAttempted: 0,
        totalPassing: 0
    };

    constructor(runner : TestRunner) {
        super(runner);
        this.registerListeners(runner);
    }

    protected registerListeners(runner : TestRunner) {
        runner.on('suite', this.onSuiteStart.bind(this));
        runner.on('suite end', this.onSuiteEnd.bind(this));
        runner.on('pass', this.onTestPass.bind(this));
        runner.on('fail', this.onTestFail.bind(this));
        runner.on('end', this.onEnd.bind(this));
    }

    onSuiteStart(suite : ISuite) {
        this.suiteLevel++;
        if (this.suiteLevel === 2) {
            // console.log(suite.fullTitle());
            this.passes = 0;
            this.failures = 0;
            this.currentComparisonEntry = {
                libName: suite.title,
                suites: [],
                totalAttempted: 0,
                totalPassing: 0
            };
        } else if (this.suiteLevel > 2) {
            this.currentComparisonEntry.suites.push({
                description: suite.title,
                tests: []
            });
        }
    }

    onSuiteEnd(suite : ISuite) {
        this.suiteLevel--;
        if (this.suiteLevel === 1) {
            console.log(`${ suite.fullTitle() } results: ${ this.passes }/${ this.passes + this.failures }`);
            this.currentComparisonEntry.totalPassing = this.passes;
            this.currentComparisonEntry.totalAttempted = this.passes + this.failures;
            this.passes = 0;
            this.failures = 0;
            this.comparisonEntries.push(this.currentComparisonEntry);
        }
    }

    onTestPass(test : ITest) {
        this.passes++;
        // console.log('pass: %s', test.fullTitle());
        const suite = last(this.currentComparisonEntry.suites);
        if (suite) {
            suite.tests.push({
                description: test.title,
                pass: true
            });
        }
    }

    onTestFail(test : ITest, err : Error) {
        this.failures++;
        // console.log('fail: %s -- error: %s', test.fullTitle(), err.message);
        const suite = last(this.currentComparisonEntry.suites);
        if (suite) {
            suite.tests.push({
                description: test.title,
                pass: false,
                message: err.message
            });
        }
    }

    onEnd() {
        const outDir = 'docs';
        const outFile = 'report.html';
        const html = this.generateHtml();
        mkdirsSync(outDir);
        writeFileSync(path.join(outDir, outFile), html, 'utf-8');
        // console.log('end');
        process.exitCode = this.failures;
    }

    protected generateHtml() : string {
        return comparisonReport(this.comparisonEntries);
    }
}

export = ComparisonReporter;