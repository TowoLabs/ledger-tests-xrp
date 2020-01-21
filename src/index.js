/*******************************************************************************
 *   XRP Wallet App Test Suite
 *   (c) 2020 Towo Labs
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/

import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import glob from "glob";
import { encode } from 'ripple-binary-codec';
import fs from "fs";
import util from "util";
import Xrp from "@ledgerhq/hw-app-xrp";
import consoleControl from "console-control-strings";

const argv = require('minimist')(process.argv.slice(2));

const FILENAME_REGEX = /tests\/\d+-(.*?)\/\d+-(.*?).json/;

const BLUE = consoleControl.color('blue');
const MAGENTA = consoleControl.color('magenta');
const RESET = consoleControl.color('reset');

let transport = null;
let xrp = null;
let deviceData = null;
let numPassed = 0;
let numFailed = 0;

async function establishConnection() {
    console.log('Connecting to device...');

    try {
        transport = await TransportNodeHid.open();
        xrp = new Xrp(transport);

        console.log('Connection established!')
    } catch (e) {
        console.error(`Failed to establish connection to device! (${e.message || 'Unknown reason'})`);

        throw 'No transport found';
    }
}

async function fetchAddress() {
    console.log('Fetching account address...');

    try {
        deviceData = await xrp.getAddress("44'/144'/0'/0/0");

        console.log(`Got address: ${deviceData.address}`);
    } catch (e) {
        console.error(`Failed to fetch account address! (${e.message || 'Unknown reason'})`);

        throw 'No address found';
    }
}

function pass() {
    numPassed++;
    console.log('\n✅ Passed!\n');
}

function fail(reason) {
    numFailed++;
    console.log(`\n❌ Failed: ${reason}\n`);
}

function parseFilename(file) {
    const matches = FILENAME_REGEX.exec(file);

    return {
        group: matches[1],
        name: matches[2]
    }
}

async function testTransaction(file, index, all) {
    const info = parseFilename(file);

    console.log(`${MAGENTA}(${index + 1}/${all.length}) ${BLUE}${info.group}: ${RESET}${info.name}\n`);

    let fileContent = fs.readFileSync(file, { encoding: 'utf-8' })
                        .replace(/OWN_ADDR/g, deviceData.address)
                        .replace(/OWN_PUBKEY/g, deviceData.publicKey.toUpperCase());

    let transactionJSON = JSON.parse(fileContent);

    // Output pretty-printed test data
    console.log(
        util.inspect(
            transactionJSON,
            {
                colors: true,
                compact: false,
                depth: Infinity
            }
        )
    );

    const transactionBlob = encode(transactionJSON);

    try {
        await xrp.signTransaction("44'/144'/0'/0/0", transactionBlob);
        pass();
    } catch (e) {
        switch (e.statusText) {
            case 'UNKNOWN_ERROR':
                fail(`Unsupported transaction (${e.statusCode.toString(16)})`);
                break;
            case 'CONDITIONS_OF_USE_NOT_SATISFIED':
                fail('Incorrect representation');
                break;
            case 'INCORRECT_LENGTH':
                fail(`Too large transaction (size: ${transactionBlob.length / 2})`);
                break;
            default:
                fail(e.statusText || `Unknown error (${e})`);
        }
    }
}

function runMatchingTests(filter) {
    console.log('Running tests...\n');
    console.log('INSTRUCTIONS');
    console.log('Approve all transactions that matches what you see on the screen.\n');

    return new Promise((resolve, reject) => {
        glob('tests/**/*.json', async function (er, files) {
            if (filter) {
                files = files.filter(filter);
            }

            for (let i = 0; i < files.length; i++) {
                await testTransaction(files[i], i, files);
            }

            if (numFailed === 0) {
                console.log('✅ All tests passed!')
            } else {
                console.log('Test completed!');
                console.log(`${numPassed} passed, ${numFailed} failures`);
            }

            resolve();
        });
    });
}

function buildTestFilter(args) {
    const allowedGroups = args.filter(arg => !arg.includes('/'));
    const allowedTests = args.filter(arg => arg.includes('/'));

    return file => {
        const info = parseFilename(file);

        const group = info.group;
        const testID = `${info.group}/${info.name}`;

        return allowedGroups.includes(group) || allowedTests.includes(testID);
    }
}

function getFilter() {
    if (argv._.length > 0) {
        return buildTestFilter(argv._);
    } else {
        return null;
    }
}

async function runTests() {
    const filter = getFilter();

    await runMatchingTests(filter);
}

function verifyTransaction(file) {
    try {
        let fileContent = fs.readFileSync(file, { encoding: 'utf-8' })
            .replace(/OWN_ADDR/g, 'rTooLkitCksh5mQa67eaa2JaWHDBnHkpy')
            .replace(/OWN_PUBKEY/g, '02B79DA34F4551CA976B66AA78A55C43707EC2BB2BEC39F95BD53F24E2E45A9E67');

        let transactionJSON = JSON.parse(fileContent);

        encode(transactionJSON);

        console.log(`✅ ${file}: Pass`);
    } catch (e) {
        console.log(`❌ ${file}: Fail`);
        console.log(e);
    }
}

function verifyTransactions() {
    return new Promise((resolve, reject) => {
        glob('tests/**/*.json', async function (er, files) {
            for (let i = 0; i < files.length; i++) {
                verifyTransaction(files[i]);
            }

            resolve();
        });
    });
}

async function main() {
    if (argv.verify) {
        await verifyTransactions();
        return;
    }

    try {
        await establishConnection();
        await fetchAddress();
        await runTests();
    } catch (e) {
        console.error(`${e}. Exiting!`);
    }
}

(async () => { await main() })();
