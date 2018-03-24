import outdent from "outdent";
import {mmap} from "./helpers";
import he = require("he");
import {DefaultMap} from "../core";

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
    suitesPassing : number;
}

interface FeatureGroup {
    name : string;
    features : string[];
}

interface FeatureLib {
    name : string;
    featuresSupported : boolean[];
    featureGroupsSupported : boolean[];
}

export interface FeatureComparison {
    featureGroups : FeatureGroup[];
    libs : FeatureLib[];
}

export interface TestEnvironment {
    runDate : Date;
    nodeVersion : string;
    osArchitecture : string;
    osRelease : string;
    osPlatform : NodeJS.Platform;
    osType : string;
}

function convertLibraryComparisonsToFeatureComparisons(entries : ComparisonEntry[]) : FeatureComparison {
    const groups = new DefaultMap<string, FeatureGroup>((key) => ({
        name: key,
        features: []
    }));

    const libs = [];
    const allFeatures : string[] = [];
    for (const entry of entries) {
        const libName = entry.libName;
        const featuresSupported : boolean[] = [];
        const featureGroupsSupported : boolean[] = [];
        for (const suite of entry.suites) {
            const group = groups.get(suite.description);
            let allTestsPass = true;
            for (const test of suite.tests) {
                const fullDescription = `${ suite.description } - ${ test.description }`;
                if (group.features.indexOf(test.description) === -1) {
                    group.features.push(test.description);
                    allFeatures.push(fullDescription);
                }
                featuresSupported[allFeatures.indexOf(fullDescription)] = test.pass;
                allTestsPass = (allTestsPass && test.pass);
            }
            if (suite.tests.length > 0) {
                featureGroupsSupported.push(allTestsPass);
            }
        }
        for (let i = 0; i < featuresSupported.length; i++) {
            if (featuresSupported[i] === undefined) {
                featuresSupported[i] = false;
            }
        }
        libs.push({
            name : libName,
            featuresSupported,
            featureGroupsSupported
        });
    }
    return {
        featureGroups: Array.from(groups.values()),
        libs
    };
}

export function comparisonReport(entries : ComparisonEntry[], testEnvironment : TestEnvironment) {
    if (entries.length === 0) {
        throw new Error(`Ehhh?! Nothing to report on!`);
    }
    const maxPassing = entries.reduce((prev, curr) => curr.suitesPassing > prev ? curr.suitesPassing : prev, 0);
    const bestLibs = entries.filter((value) => value.suitesPassing === maxPassing);
    const featureComparison = convertLibraryComparisonsToFeatureComparisons(entries);

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
            * {
                font-size: 10pt;
            }
            h1 {
                font-size: 1.2em;
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
            
            .feature-table thead {
                font-size: 0.8em;
            }
            
            .feature-table .test-status.test-status-pass, .type-table .test-status.test-status-pass {
                color: #1fcc1f;
            }
            
            .feature-table .test-status.test-status-fail, .type-table .test-status.test-status-fail {
                color: crimson;
            }

            .hidden {
                display: none;
            }
            
            #section-navigator-container {
                margin: 2em;
                text-align: center;
            }
            
            #section-navigator {
                margin-left: auto;
                margin-right: auto;
                padding: 0.5em;
                border: 3px solid #CCC;
                border-radius: 4px;
            }
            
        </style>
        <script>
            function hide(element) {
                if (element && !element.classList.contains('hidden')) {
                    element.classList.add('hidden');
                }
            }
            
            function show(element) {
                if (element && element.classList.contains('hidden')) {
                    element.classList.remove('hidden');
                }
            }
        
            function collapseAllLibResults() {
                var allSuites = document.getElementsByClassName('lib-results');
                for (var i = 0; i < allSuites.length; i++) {
                    var suite = allSuites[i];
                    hide(suite);
                }
            }

            function toggleContents(libName) {
                var suiteToShow = document.getElementById('lib-results-' + libName);
                var isHidden = suiteToShow.classList.contains('hidden');
                collapseAllLibResults();
                if (isHidden) {
                    show(suiteToShow);
                }
            }
            
            var sectionIds = ['section-type-table', 'section-feature-table', 'section-test-results'];
            function showSection(sectionIdToShow) {
                for (var i = 0; i < sectionIds.length; i++) {
                    var section = document.getElementById(sectionIds[i]);
                    if (section.id === sectionIdToShow) {
                        show(section);
                    } else {
                        hide(section);
                    }
                }
            }
            
            function showTestResults(libName) {
                toggleContents(libName);
                showSection('section-test-results');
            }

        </script>
    </head>
    <body>
        <div id="section-navigator-container">
            <span id="section-navigator">
                <a href="#section-feature-table" onclick="showSection('section-type-table')">Types Table</a>
                <span>|</span>
                <a href="#section-feature-table" onclick="showSection('section-feature-table')">Feature Table</a>
                <span>|</span>
                <a href="#section-test-results"  onclick="showSection('section-test-results')">Test Results</a>
            </span>
        </div>
    
        <div id="section-summary-table">
            <table class="table summary-table">
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Types Supported</th>
                        <th>Tests Passing</th>
                    </tr>
                </thead>
                <tbody>
                    ${ mmap(entries, (entry) => outdent`
                        <tr class="${ bestLibs.indexOf(entry) > -1 ? 'best-lib' : '' }" onclick="showTestResults('${ entry.libName }')">
                            <td>${ he.encode(entry.libName) }</td>
                            <td>${ entry.suitesPassing }</td>
                            <td>${ entry.totalPassing } / ${ entry.totalAttempted }</td>
                        </tr>
                    `) }
                </tbody>
            </table>
        </div>
        
        <div id="section-type-table">
            <div style="margin-top: 1em;">
                <table class="table type-table">
                    <thead>
                        <tr>
                            <th></th>
                            ${ mmap(featureComparison.featureGroups, (featureGroup) => featureGroup.features.length ? outdent`
                            <th style="text-align: left; border-left: 1px solid #DDD;">${ he.encode(featureGroup.name) }</th>
                            ` : '') }
                        </tr>
                    </thead>
                    <tbody>
                        ${ mmap(featureComparison.libs, (lib) => outdent`
                        <tr>
                            <td>${ he.encode(lib.name) }</td>
                            ${ mmap(lib.featureGroupsSupported, (pass) => outdent`
                                <td class="test-status ${ pass ? 'test-status-pass' : 'test-status-fail' }">${ he.encode(pass ? '✔' : '✘') }</td>
                            `) }
                        </tr>
                        `) }
                    </tbody>
                </table>
            </div>
        </div>
        
        <div id="section-feature-table" class="hidden">
            <div style="margin-top: 1em;">
                <table class="table feature-table">
                    <thead>
                        <tr>
                            <th style="background: #CCC; border-bottom: none;"></th>
                            ${ mmap(featureComparison.featureGroups, (featureGroup) => featureGroup.features.length ? outdent`
                            <th colspan="${ featureGroup.features.length }" style="text-align: left; border-left: 2px solid #DDD;">${ he.encode(featureGroup.name) }</th>
                            ` : '') }
                        </tr>
                        <tr>
                            <th style="background: #CCC;"></th>
                            ${ mmap(featureComparison.featureGroups, (featureGroup) =>
                                mmap(featureGroup.features, (feature, i) => outdent`
                                    <th style="background: #EEE; ${ i === 0 ? `border-left: 2px solid #DDD;` : '' }">${ he.encode(feature) }</th>
                                `)
                            ) }
                        </tr>
                    </thead>
                    <tbody>
                        ${ mmap(featureComparison.libs, (lib) => outdent`
                        <tr>
                            <td>${ he.encode(lib.name) }</td>
                            ${ mmap(lib.featuresSupported, (pass) => outdent`
                                <td class="test-status ${ pass ? 'test-status-pass' : 'test-status-fail' }">${ he.encode(pass ? '✔' : '✘') }</td>
                            `) }
                        </tr>
                        `) }
                    </tbody>
                </table>
            </div>
        </div>
        
        <div id="section-test-results" class="hidden">
            ${ mmap(entries, (entry, index) => outdent`
                <div id="lib-results-${ entry.libName }" class="lib-results ${ index === 0 ? '' : 'hidden' }">
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
        </div>
        
        <div id="test-environment">
            <p>Tested on: ${ `Node.js ${ testEnvironment.nodeVersion } / ${ testEnvironment.osType } ${ testEnvironment.osRelease } (${ testEnvironment.osArchitecture }, ${ testEnvironment.osPlatform })` }</p>
            <p>Tested at: ${ testEnvironment.runDate.toISOString() }</p>
        </div>
    </body>
</html>`;
}