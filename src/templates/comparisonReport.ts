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
            .summary-table {
                margin-left: auto;
                margin-right: auto;
                border: 3px solid #ccc;
                /*border-collapse: collapse;*/
                border-spacing: 0;
                border-radius: 4px;
            }
            .summary-table thead {
                background: #888;
                color: #fff;
            }
            .summary-table thead th {
                border-bottom: 1px solid #ccc;
                padding: 0.5em;
            }
            .summary-table tr:nth-child(even) {
                background: #EEE;
            }
            .summary-table tbody tr {
                cursor: pointer;
            }
            .summary-table tbody tr:hover {
                text-decoration: underline;
            }
            .summary-table td {
                padding: 0.3em;
                -moz-user-select: none;
                user-select: none;
            }
            .summary-table th + th, .summary-table td + td {
                border-left: 1px solid #ccc;
            }
            .summary-table tr.best-lib {
                background-color: palegreen;
            }

            .lib-results, .type-suite, .test-result {
                margin: 1em;
                padding: 0.2em;
            }

            .type-suite, .test-result {
                border: 2px solid #ccc;
            }

            .lib-results {
                border: 2px solid #ccc;
                background-color: #eee;
                /*display: none;*/
            }
            .lib-results .lib-name {
                cursor: pointer;
            }

            .type-suite {
                background-color: #FFF;
            }

            .test-suite-results-table {
                width: 100%;
            }

            .test-suite-results-table td.test-status {
                width: 20%;
            }

            .test-suite-results-table td.test-description {
                width: 50%;
            }

            .test-suite-results-table td.test-error-message {
                width: 30%;
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
        <div class="summary-table-container">
            <table class="summary-table">
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
                ${ mmap(entry.suites, (suite) => outdent`
                    <div id="${ entry.libName }-type-suite" class="type-suite">
                        <h2>${ he.encode(suite.description) }</h2>
                        <table class="test-suite-results-table">
                            <tbody>
                                ${ mmap(suite.tests, (test) => outdent`
                                    <tr class="test-result">
                                        <td class="test-status">${ he.encode(test.pass ? '✓ Pass' : '✘ Fail') }</td>
                                        <td class="test-description">${ he.encode(test.description) }</td>
                                        <td class="test-error-message">${ !test.pass ? he.encode(test.message) : '' }</td>
                                    </tr>
                                `) }
                            </tbody>
                        </table>
                    </div>
                `) }
                </div>
            </div>
        `) }
    </body>
</html>`;
}