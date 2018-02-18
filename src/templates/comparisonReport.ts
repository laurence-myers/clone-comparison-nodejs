import outdent from "outdent";
import {mmap} from "./helpers";
import he = require("he");

export interface HasDescription {
    description : string;
}

export interface ComparisonTestPass {
    pass : true;
}

export interface ComparisonTestFail {
    pass : false;
    message : string;
}

export type ComparisonTest = HasDescription & (ComparisonTestPass | ComparisonTestFail);

export interface ComparisonSuite {
    description : string;
    allPassing : boolean;
    tests : ComparisonTest[];
}

export interface ComparisonEntry {
    libName : string;
    totalPassing : number;
    totalAttempted : number;
    suites : ComparisonSuite[];
}

export function comparisonReport(entries : ComparisonEntry[]) {
    if (entries.length === 0) {
        throw new Error(`Ehhh?! Nothing to report on!`);
    }
    const maxPassing = entries.reduce((prev, curr) => curr.totalPassing > prev ? curr.totalPassing : prev, 0);
    const bestLibs = entries.filter((value) => value.totalPassing === maxPassing);

    // language=HTML
    return outdent`
<html>
    <head>
        <style type="text/css">
            body {
                color: black;
                background: white;
                font-family: sans-serif;
            }
            .table {
                margin-left: auto;
                margin-right: auto;
                border: 3px solid #ccc;
                /*border-collapse: collapse;*/
                border-spacing: 0;
                border-radius: 4px;
                background: #fff;
            }
            .table th {
                background: #ccc;
            }
            .table th {
                border-bottom: 1px solid #ccc;
                padding: 0.5em;
            }
            .table tr:nth-child(even) {
                background: #EEE;
            }
            .summary-table tbody tr {
                cursor: pointer;
            }
            .summary-table tbody tr:hover {
                text-decoration: underline;
            }
            .table td {
                padding: 0.3em;
                -moz-user-select: none;
                user-select: none;
            }
            .table th + th, .table td + td {
                border-left: 1px solid #ccc;
            }
            .summary-table tr.best-lib {
                background-color: palegreen;
            }

            .lib-results, .type-suite, .test-result {
                margin: 1em;
                padding: 0.2em;
            }

            .lib-name {
                text-align: center;
            }

            .type-suite {
                background-color: #FFF;
            }

            .lib-suite-results-table {
                width: 100%;
            }

            .lib-suite-results-table tbody th {
                padding: 0.5em;
            }

            .lib-suite-results-table .test-suite-header.suite-result-pass .test-status {
                color: white;
                background-color: #08d908;
            }

            .lib-suite-results-table .test-suite-header.suite-result-pass .test-suite-name {
                background-color: #bae0b9;
            }

            .lib-suite-results-table .test-suite-header.suite-result-fail .test-status {
                color: white;
                background-color: #dc0000;
            }

            .lib-suite-results-table .test-suite-header.suite-result-fail .test-suite-name {
                background-color: #ddb1b1;
            }

            .lib-suite-results-table tr.test-result.test-result-pass {
                color: green;
            }

            .lib-suite-results-table tr.test-result.test-result-pass .test-status {
                color: #1fcc1f;
            }

            .lib-suite-results-table tr.test-result.test-result-fail {
                color: darkred;
            }

            .lib-suite-results-table tr.test-result.test-result-fail .test-status {
                color: crimson;
            }

            .lib-suite-results-table td.test-status {
                width: 10%;
                text-align: center;
            }

            .lib-suite-results-table td.test-description {
                width: 50%;
            }

            .lib-suite-results-table td.test-error-message {
                width: 40%;
                white-space: pre-line;
            }

            .hidden {
                display: none;
            }
        </style>
        <script>
            function collapseAllLibResults() {
                var allSuites = document.getElementsByClassName('lib-results');
                for (var i = 0; i < allSuites.length; i++) {
                    var suite = allSuites[i];
                    if (!suite.classList.contains('hidden')) {
                        suite.classList.add('hidden');
                    }
                }
            }

            function toggleContents(libName) {
                var suiteToShow = document.getElementById('lib-results-' + libName);
                var isHidden = suiteToShow.classList.contains('hidden');
                collapseAllLibResults();
                if (isHidden) {
                    suiteToShow.classList.remove('hidden');
                }
            }
        </script>
    </head>
    <body>
        <div>
            <table class="table summary-table">
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Passing</th>
                        <th>Attempted</th>
                    </tr>
                </thead>
                <tbody>
                    ${ mmap(entries, (entry) => outdent`
                        <tr class="${ bestLibs.indexOf(entry) > -1 ? 'best-lib' : '' }" onclick="toggleContents('${ entry.libName }')">
                            <td>${ he.encode(entry.libName) }</td>
                            <td>${ entry.totalPassing }</td>
                            <td>${ entry.totalAttempted }</td>
                        </tr>
                    `) }
                </tbody>
            </table>
        </div>
        ${ mmap(entries, (entry) => outdent`
            <div id="lib-results-${ entry.libName }" class="lib-results hidden">
                <h1 class="lib-name">${ he.encode(entry.libName) }: ${ entry.totalPassing } / ${ entry.totalAttempted }</h1>
                <div class="lib-suite">
                <table class="table lib-suite-results-table">
                    ${ mmap(entry.suites, (suite) => suite.tests.length > 0 ? outdent`
                        <tbody>
                            <tr class="test-suite-header ${ suite.allPassing ? 'suite-result-pass' : 'suite-result-fail' }">
                                <th class="test-status">${ he.encode(suite.allPassing ? '✔' : '✘') }</th>
                                <th colspan="2" class="test-suite-name">${ he.encode(suite.description) }</th>
                            </tr>
                            ${ mmap(suite.tests, (test) => outdent`
                                <tr class="test-result ${ test.pass ? 'test-result-pass' : 'test-result-fail' }">
                                    <td class="test-status">${ he.encode(test.pass ? '✔' : '✘') }</td>
                                    <td class="test-description">${ he.encode(test.description) }</td>
                                    <td class="test-error-message">${ !test.pass ? he.encode(test.message) : '' }</td>
                                </tr>
                            `) }
                        </tbody>
                    ` : '') }
                </table>
                </div>
            </div>
        `) }
    </body>
</html>`;
}