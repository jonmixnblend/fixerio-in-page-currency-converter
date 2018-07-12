const chai = require('chai');
const nock = require('nock');
const FixerIoInPageCurrencyConversion = require('../src/index');
const jsdom = require("jsdom");
const {JSDOM} = jsdom;
const should = chai.should();
const expect = chai.expect;

const myConverter = new FixerIoInPageCurrencyConversion.Converter();
const dom = new JSDOM(`
<body>Hello world</body>
`);

const successfulFixerResponse = require('./fixer-io-successful-response');
const invalidFixerAccessKeyResponse = require('./fixer-io-invalid-access-key');
const invalidFixerBaseCurrencyResponse = require('./fixer-io-invalid-base-currency');

describe('Converter', function () {
    beforeEach(() => {
        nock('https://data.fixer.io')
            .get('/api/latest?access_key=my-test-access-key&base=ZAR')
            .reply(200, successfulFixerResponse);

        nock('https://data.fixer.io')
            .get('/api/latest?access_key=my-test-access-key&base=blah')
            .reply(200, invalidFixerBaseCurrencyResponse);

        nock('https://data.fixer.io')
            .get('/api/latest?access_key=&base=ZAR')
            .reply(200, invalidFixerAccessKeyResponse);
    });
    it('should have a cacheSeconds property', () => {
        myConverter.should.have.property('cacheSeconds');
    });
    it('should set cacheSeconds property via setCacheSeconds', () => {
        myConverter.setCacheSeconds(600);
        myConverter.cacheSeconds.should.equal(600);
    });
    it('should have a masterCurrencyCode property', () => {
        myConverter.should.have.property('masterCurrencyCode');
    });
    it('should set the masterCurrencyCode property (used in the api call to fixer.io) via setMasterCurrencyCode', () => {
        myConverter.setMasterCurrencyCode("GBP");
        myConverter.masterCurrencyCode.should.equal("GBP");
    });
    it('should have an accessKey property', () => {
        myConverter.should.have.property('accessKey');
    });
    it('should set the accessKey property (used in the api call to fixer.io) via setAccessKey', () => {
        myConverter.setAccessKey("test-key-code");
        myConverter.accessKey.should.equal("test-key-code");
    });
    it('should diagnose if the localStorage cache of exchange rates has expired via cacheExpired', () => {
        myConverter.setCacheSeconds(1);
        const timeStamp = new Date().getTime() - (30 * 1000);
        myConverter.cacheExpired(timeStamp).should.equal(true);
        myConverter.setCacheSeconds(300);
        myConverter.cacheExpired(timeStamp).should.equal(false);
    });
    it('should return a currencyRates object from localStorage if it exists via getCurrencyRatesLocalStorage', () => {
        localStorage.setItem(
            "fixerCurrencyRates",
            JSON.stringify({})
        );
        return myConverter.getCurrencyRatesLocalStorage().then((result) => {
            result.should.be.an('object');
        });
    });
    it('should return false if no localCurrencyRates object exists via getCurrencyRatesLocalStorage', () => {
        localStorage.removeItem("fixerCurrencyRates");
        return myConverter.getCurrencyRatesLocalStorage().then((result) => {
            expect(result).to.equal(false);
        });
    });
    it('should return a currencyRates object from fixer.io via getRemoteCurrencyRates', () => {
        myConverter.setAccessKey('my-test-access-key');
        myConverter.setMasterCurrencyCode('ZAR');
        return myConverter.getRemoteCurrencyRates().then(response => {
            expect(typeof response).to.equal('object');
            expect(typeof response.rates).to.equal('object');
            expect(typeof response.timestamp).to.equal('number');
        });
    });
    it('should return false if no api key is supplied or set.', () => {
        myConverter.setAccessKey('');
        myConverter.setMasterCurrencyCode('ZAR');
        return myConverter.getRemoteCurrencyRates().then(response => {
            expect(typeof response).to.equal('boolean');
            expect(response).to.equal(false);
        });
    });
    it('should return false if an invalid currency base is set.', () => {
        myConverter.setAccessKey('my-test-access-key');
        myConverter.setMasterCurrencyCode('blah');
        return myConverter.getRemoteCurrencyRates().then(response => {
            expect(typeof response).to.equal('boolean');
            expect(response).to.equal(false);
        });
    });
    it('should return a currencyRates object via getCurrencyRates if the item is in localStorage and not expired', () => {
        localStorage.setItem(
            "fixerCurrencyRates",
            JSON.stringify({})
        );
        return myConverter.getCurrencyRatesLocalStorage().then(response => {
            response.should.be.an('object');
        });

    });
    it('should return a currencyRates object via getCurrencyRates if the item is not localStorage or is expired', () => {
        myConverter.setAccessKey('my-test-access-key');
        myConverter.setMasterCurrencyCode('ZAR');
        return myConverter.getRemoteCurrencyRates().then(response => {
            expect(typeof response).to.equal('object');
            expect(typeof response.rates).to.equal('object');
            expect(typeof response.timestamp).to.equal('number');
        });
    });
    it("should replace all instances of strings formatted as currency in a specified dom node and its children, \n with the target currency string, formatted as a currency", () => {
        localStorage.removeItem("fixerCurrencyRates");
        myConverter.setAccessKey('my-test-access-key');
        myConverter.setMasterCurrencyCode('ZAR');
        return myConverter.replaceCurrencyInstancesInNode(
            dom.window.document.body,
            "ZAR",
            "GBP"
        ).then(response => {
            expect(response).to.equal(true);
        });
    });
    it("should replace all instances of strings formatted as currency in specified data \n with the target currency string, formatted as a currency", () => {
        myConverter.setAccessKey('my-test-access-key');
        myConverter.setMasterCurrencyCode('ZAR');
        const result = myConverter.replaceCurrencyInData(
            "ZAR",
            "USD",
            `<div class="col-sm-5">
                            <span class="glyphicon glyphicon-tag"></span>
                            Price :
                            From R 8,000 per night
                        </div>`,
        );

        expect(result).to.contain("$");
    });
    it("should not replace text that is not formatted as a currency in specified data \n with the target currency string, formatted as a currency", () => {
        const data = `WE HAVE A SELECTION OF OVER 2000 PROPERTIES`;
        myConverter.setAccessKey('my-test-access-key');
        myConverter.setMasterCurrencyCode('ZAR');
        const result = myConverter.replaceCurrencyInData(
            "ZAR",
            "USD",
            data,
        );

        expect(result).to.equal(data);
    });
});