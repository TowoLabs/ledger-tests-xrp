# XRP Wallet App Test Suite

Test utility for testing functionality of [ledger-app-xrp](https://github.com/LedgerHQ/ledger-app-xrp) targeting Ledger Nano S and Ledger Nano X.

**Important notice:** Most of the test transactions are too large to be transferred to the device using the
old transport protocol in [ledger-app-xrp](https://github.com/LedgerHQ/ledger-app-xrp) version 1.0.9
and below. The updated transport protocol in version 2.0.0, is not yet available in
Ledger's [hw-app-xrp](https://www.npmjs.com/package/@ledgerhq/hw-app-xrp), which will cause
most of the tests to fail. In the mean time, developers may use [Towo Labs' fork](https://github.com/TowoLabs/ledgerjs/tree/master/packages/hw-app-xrp) of the module which fully supports the updated protocol.

## Usage
### Installation
Install the package dependencies by running:
```sh
npm install
```

### Run all tests
In order to run the entire test suite, simply plug in your Ledger Nano S or Ledger Nano X and run:
```sh
npm start
```

Every tested transaction will be presented on your screen in JSON form and on the device in deserialized
form. For every transaction shown, take the appropriate action in order to complete the testing:

- Sign the transaction if all fields match what you see on the device
- Reject the transaction if any field differs from what is expected

Tests that for some reason are not deserializable on the the device will automatically fail.

### Run a subset of the test suite
The available tests can be filtered based on the arguments you pass when starting the test suite.

You can choose to supply a list of filters by running the test suite as follows:
```sh
npm start filter1 filter2 ... filterN
```

It is possible to filter tests based on which group they belong to or by a specific group/name combination:

#### Filtering based on groups
Groups are filtered based on their name without the number prefix. To run all tests under `tests/01-payment`,
simply run:
```sh
npm start payment
```

If you want to test multiple groups you can supply them in sequence:
```sh
npm start payment account-set
```

#### Filtering based on single tests
Single tests are filtered based on their test ID. This ID consists of the test group and name, separated by a forward slash.
For example, the test located at `tests/01-payment/01-basic` has the ID `payment/basic`.

A single test is executed as follows:
```sh
npm start payment/basic
```

If you want to test multiple single tests you enter them in sequence:
```sh
npm start payment/basic payment/both-tags
```

#### Combining filters
You can combine group and single test filters however you want:
```sh
npm start payment/basic account-set
```

Note that the test execution order is dependent on the order of the tests in the filesystem, and not on the order
that you supply them on the command line.

### Verify test cases
To verify that all tests can be properly serialized into transaction blobs simply supply the verify flag. 
This will cause the test utility to go through all the test cases and verify them all. 
This can be very useful when writing new tests.

```sh
npm start -- --verify
```
