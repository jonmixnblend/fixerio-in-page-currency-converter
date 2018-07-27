const axios = require('axios');
const accounting = require('accounting');

class Converter {
    constructor({
        accessKey = false,
        masterCurrencyCode = 'ZAR',
        cacheSeconds = 300,
        decimalPoints = 0,
    } = {}) {
        this.accessKey = accessKey;
        this.masterCurrencyCode = masterCurrencyCode;
        this.currentCurrencyCode = masterCurrencyCode;
        this.cacheSeconds = cacheSeconds;
        this.decimalPoints = decimalPoints;
        this.currencies = require('./currencies.json');
    }

    setCacheSeconds(cacheSeconds) {
        this.cacheSeconds = cacheSeconds;
    }

    setMasterCurrencyCode(masterCurrencyCode) {
        this.masterCurrencyCode = masterCurrencyCode;
    }

    setAccessKey(accessKey) {
        this.accessKey = accessKey;
    }

    cacheExpired(timestamp) {
        return (new Date().getTime() - timestamp) / 1000 >= this.cacheSeconds ? true : false;
    }

    setCurrencyRates(currencyRates) {
        this.currencyRates = currencyRates;
    }

    async getCurrencyRates() {

        let currencyRates = await this.getCurrencyRatesLocalStorage();

        if (currencyRates &&
            !this.cacheExpired(parseInt(currencyRates.timestamp))
        ) {
            return currencyRates;
        } else {
            currencyRates = await this.getRemoteCurrencyRates();
            if (currencyRates) {
                this.setCurrencyRatesLocalStorage(currencyRates);
            }
            return currencyRates;
        }
    }

    async getCurrencyRatesLocalStorage() {
        const fixerCurrencyRates = JSON.parse(
            localStorage.getItem('fixerCurrencyRates')
        );

        if (!fixerCurrencyRates) {
            return false;
        } else {
            return fixerCurrencyRates;
        }
    }

    setCurrencyRatesLocalStorage(currencyRates) {
        return localStorage.setItem(
            "fixerCurrencyRates",
            JSON.stringify(currencyRates)
        );
    }

    async getRemoteCurrencyRates() {
        try {
            const response = await axios.get(
                `https://data.fixer.io/api/latest?access_key=${this.accessKey}&base=${this.masterCurrencyCode}`
            );

            if (response.data.success) {
                const currencyRates = (({
                    base,
                    date,
                    rates
                }) => ({
                    base,
                    date,
                    rates
                }))(response.data);
                currencyRates.timestamp = new Date().getTime();
                return currencyRates;
            } else {
                console.log(response.data.error.info);
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async replaceCurrencyInstancesInNode(
        node,
        sourceCurrencyCode,
        targetCurrencyCode
    ) {
        if (!this.currencyRates) {
            this.currencyRates = await this.getCurrencyRates();
        }

        if (this.sourceCurrencyMatchesTarget(
            sourceCurrencyCode,
            targetCurrencyCode
        )) {
            console.log('Source currency matches target, nothing to do here.');
            return false;
        }

        if (!this.validDateCurrencyConversionArguments(
                sourceCurrencyCode,
                targetCurrencyCode
            )) {
            return false;
        }

        if (this.isTextNode(node)) {
            node.data = this.replaceCurrencyInData(
                sourceCurrencyCode,
                targetCurrencyCode,
                node.data
            );
        }

        if (this.isElementNodeExludingScripts(node)) {
            for (var i = 0; i < node.childNodes.length; i++) {
                await this.replaceCurrencyInstancesInNode(node.childNodes[i], sourceCurrencyCode, targetCurrencyCode);
            }
        }

        return true;
    }

    sourceCurrencyMatchesTarget(
        sourceCurrencyCode,
        targetCurrencyCode
    ) {
        return sourceCurrencyCode === targetCurrencyCode;
    }

    isTextNode(node) {
        return node.nodeType === 3;
    }

    isElementNodeExludingScripts(node) {
        return node.nodeType === 1 && node.nodeName != "SCRIPT";
    }

    replaceCurrencyInData(
        sourceCurrencyCode,
        targetCurrencyCode,
        data
    ) {

        if (!this.currencyRates) {
            console.log("currencyRates not retrieved or set.");
            return false;
        }

        let sourceCurrencySymbol = this.currencies[sourceCurrencyCode].symbol_native;
        if (sourceCurrencySymbol === "$"){
            sourceCurrencySymbol = "\\$";
        }

        const targetCurrencySymbol = this.currencies[targetCurrencyCode].symbol_native;
        const pattern = new RegExp(`(^|\\s|\\()${sourceCurrencySymbol}\\s*[\\s0-9\,\.-]*[0-9]{1}`, "gm");
        return data.replace(pattern, (match) => {

            const spaceAndBracketMatches = (match.match(/^(\s|\()+/));
            const currencyValue = accounting.unformat(match);
            const exchangeRate = (this.currencyRates.rates[targetCurrencyCode] / this.currencyRates.rates[sourceCurrencyCode]);
            let returnValue =  '';
            if (spaceAndBracketMatches) {
                returnValue += spaceAndBracketMatches[0];
            }
            returnValue += `${accounting.formatMoney(currencyValue * exchangeRate, targetCurrencySymbol +  " ", this.decimalPoints)}`;
            return returnValue;
        });
    }

    validDateCurrencyConversionArguments(
        sourceCurrencyCode,
        targetCurrencyCode
    ) {
        if (!this.currencyRates) {
            console.log(`No valid currency rates data`);
            return false;
        }

        if (!this.currencyRates.rates[sourceCurrencyCode]) {
            console.log(`No rates available for source currency code ${sourceCurrencyCode}`);
            return false;
        }

        if (!this.currencyRates.rates[targetCurrencyCode]) {
            console.log(`No rates available for target currency code ${targetCurrencyCode}`);
            return false;
        }

        if (!this.currencies[sourceCurrencyCode]) {
            console.log(`The source currency ${sourceCurrencyCode} is not supported by this library`);
            return false;
        }

        if (!this.currencies[targetCurrencyCode]) {
            console.log(`The target currency ${targetCurrencyCode} is not supported by this library`);
            return false;
        }

        return true;
    }
}

module.exports = {
    Converter
};