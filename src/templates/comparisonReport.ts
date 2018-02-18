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
            }
            .summary-table {
                border: 1px solid #ccc;
            }
            .summary-table .best-lib {
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
            }
            .lib-results .lib-name {
                cursor: pointer;
            }

            .lib-results .lib-suite {
                display: none;
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
            }
        </style>
        <script>
            function toggleContents(libName) {
                var suiteToToggle = document.getElementById(libName + '-lib-suite');
                if (suiteToToggle.style.display === 'none') {
                    suiteToToggle.style.display = 'initial';
                } else {
                    suiteToToggle.style.display = 'none';
                }
            }

            function collapseAllLibSuites() {
                var allSuites = document.getElementsByClassName('lib-suite');
                for (var i = 0; i < allSuites.length; i++) {
                    var suite = allSuites[i];
                    suite.style.display = hidden;
                }
            }
        </script>
    </head>
    <body>
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
                    <tr class="${ bestLibs.indexOf(entry) > -1 ? 'best-lib' : '' }">
                        <td>${ he.encode(entry.libName) }</td>
                        <td>${ entry.totalPassing }</td>
                        <td>${ entry.totalAttempted }</td>
                    </tr>
                `) }
            </tbody>
        </table>
        ${ mmap(entries, (entry) => outdent`
            <div class="lib-results">
                <h1 class="lib-name" onclick="toggleContents('${ entry.libName }')">${ he.encode(entry.libName) }: ${ entry.totalPassing } / ${ entry.totalAttempted }</h1>
                <div id="${ entry.libName }-lib-suite" class="lib-suite">
                ${ mmap(entry.suites, (suite) => outdent`
                    <div id="${ entry.libName }-type-suite" class="type-suite">
                        <h2>${ he.encode(suite.description) }</h2>
                        <table class="test-suite-results-table">
                            <tbody>
                                ${ mmap(suite.tests, (test) => outdent`
                                    <tr class="test-result">
                                        <td class="test-status">${ he.encode(test.pass ? '✓ Pass' : '✘ Fail') }</td>
                                        <td class="test-description">${ he.encode(test.description) }</td>
                                        <td class="test-error-message"><pre>${ !test.pass ? he.encode(test.message) : '' }</pre></td>
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